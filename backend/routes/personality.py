from flask import Blueprint, jsonify, request
from db import get_db_connection
import math

personality_bp = Blueprint('personality', __name__)

# Requirement 5: Personality Traits and Viewing Preferences

TRAITS = ['openness', 'agreeableness', 'extraversion', 'conscientiousness', 'emotional_stability']


@personality_bp.route('/api/personality/genre-traits', methods=['GET'])
def genre_traits():
    """
    For each genre, return the average Big Five trait scores of users
    who have that genre in their top recommendations.
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Compute global mean and stddev for each trait across all Person_User rows
        cur.execute("""
            SELECT
                AVG(openness)            AS m_openness,   STDDEV(openness)            AS s_openness,
                AVG(agreeableness)       AS m_agreeableness, STDDEV(agreeableness)    AS s_agreeableness,
                AVG(extraversion)        AS m_extraversion,  STDDEV(extraversion)     AS s_extraversion,
                AVG(conscientiousness)   AS m_conscientiousness, STDDEV(conscientiousness) AS s_conscientiousness,
                AVG(emotional_stability) AS m_emotional_stability, STDDEV(emotional_stability) AS s_emotional_stability
            FROM Person_User
        """)
        g = cur.fetchone()

        cur.execute("""
            SELECT
                g.name AS genre,
                AVG(pu.openness)            AS openness,
                AVG(pu.agreeableness)       AS agreeableness,
                AVG(pu.extraversion)        AS extraversion,
                AVG(pu.conscientiousness)   AS conscientiousness,
                AVG(pu.emotional_stability) AS emotional_stability,
                COUNT(DISTINCT pu.person_user_id) AS user_count
            FROM Person_User pu
            JOIN Person_User_Recommendation pur ON pu.person_user_id = pur.person_user_id
            JOIN Movie_Genre mg ON pur.movie_id = mg.movie_id
            JOIN Genre g ON mg.genre_id = g.genre_id
            GROUP BY g.name
            HAVING COUNT(DISTINCT pu.person_user_id) >= 10
            ORDER BY g.name
        """)

        rows = cur.fetchall()

        def zscore(val, mean, std):
            if not std or std == 0:
                return 0.0
            return round((float(val) - float(mean)) / float(std), 4)

        result = []
        for row in rows:
            result.append({
                'genre': row['genre'],
                'openness':            zscore(row['openness'],            g['m_openness'],            g['s_openness']),
                'agreeableness':       zscore(row['agreeableness'],       g['m_agreeableness'],       g['s_agreeableness']),
                'extraversion':        zscore(row['extraversion'],        g['m_extraversion'],        g['s_extraversion']),
                'conscientiousness':   zscore(row['conscientiousness'],   g['m_conscientiousness'],   g['s_conscientiousness']),
                'emotional_stability': zscore(row['emotional_stability'], g['m_emotional_stability'], g['s_emotional_stability']),
                'user_count': row['user_count'],
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@personality_bp.route('/api/personality/recommendations', methods=['POST'])
def personality_recommendations():
    """
    Given Big Five trait scores, find the 5 nearest Person_User profiles
    (Euclidean distance) and return their top recommended movies.
    """
    data = request.get_json()

    try:
        user_traits = {trait: float(data[trait]) for trait in TRAITS}
    except (KeyError, TypeError, ValueError):
        return jsonify({'error': 'Provide scores for all 5 traits (0.0–1.0)'}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Compute Euclidean distance in SQL and find nearest 5 users
        cur.execute("""
            SELECT
                person_user_id,
                SQRT(
                    POWER(openness - %(openness)s, 2) +
                    POWER(agreeableness - %(agreeableness)s, 2) +
                    POWER(extraversion - %(extraversion)s, 2) +
                    POWER(conscientiousness - %(conscientiousness)s, 2) +
                    POWER(emotional_stability - %(emotional_stability)s, 2)
                ) AS distance
            FROM Person_User
            ORDER BY distance ASC
            LIMIT 5
        """, user_traits)

        nearest = cur.fetchall()
        if not nearest:
            return jsonify({'movies': [], 'matched_profiles': []})

        nearest_ids = [row['person_user_id'] for row in nearest]
        matched_profiles = [
            {'person_user_id': row['person_user_id'], 'distance': round(float(row['distance']), 4)}
            for row in nearest
        ]

        # Get their top recommended movies (deduplicated, ranked by avg predicted rating)
        cur.execute("""
            SELECT
                m.movie_id,
                m.title,
                m.release_year,
                m.poster_url,
                ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) AS genres,
                ROUND(AVG(pur.predicted_rating)::numeric, 2) AS avg_predicted_rating
            FROM Person_User_Recommendation pur
            JOIN Movie m ON pur.movie_id = m.movie_id
            LEFT JOIN Movie_Genre mg ON m.movie_id = mg.movie_id
            LEFT JOIN Genre g ON mg.genre_id = g.genre_id
            WHERE pur.person_user_id = ANY(%s)
            GROUP BY m.movie_id, m.title, m.release_year, m.poster_url
            ORDER BY avg_predicted_rating DESC
            LIMIT 12
        """, (nearest_ids,))

        movies = cur.fetchall()
        result = []
        for row in movies:
            result.append({
                'movie_id': row['movie_id'],
                'title': row['title'],
                'release_year': row['release_year'],
                'poster_url': row['poster_url'],
                'genres': row['genres'] or [],
                'avg_predicted_rating': float(row['avg_predicted_rating']),
            })

        return jsonify({'movies': result, 'matched_profiles': matched_profiles})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()
