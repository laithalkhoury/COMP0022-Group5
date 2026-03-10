from flask import Blueprint, jsonify
from db import get_db_connection

reports_bp = Blueprint('reports', __name__)

# Requirement 2: Genre Popularity & Polarisation Reports

@reports_bp.route('/popularity-report', methods=['GET'])
def get_genre_popularity_report():
    """
    Generates a report on genre popularity using ratings as volume 
    and Collection List inclusions as a proxy for commercial interest.
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
        WITH GenreStats AS (
            SELECT 
                g.genre_id,
                g.name,
                COUNT(DISTINCT mg.movie_id) as movie_count
            FROM Genre g
            LEFT JOIN Movie_Genre mg ON g.genre_id = mg.genre_id
            GROUP BY g.genre_id, g.name
        ),
        RatingStats AS (
            SELECT 
                mg.genre_id,
                COUNT(r.rating) as total_ratings,
                ROUND(AVG(r.rating), 2) as avg_rating
            FROM Movie_Genre mg
            JOIN Rating r ON mg.movie_id = r.movie_id
            GROUP BY mg.genre_id
        ),
        CommercialProxy AS (
            SELECT 
                mg.genre_id,
                COUNT(li.movie_id) as collection_saves
            FROM Movie_Genre mg
            JOIN List_Item li ON mg.movie_id = li.movie_id
            GROUP BY mg.genre_id
        )
        SELECT 
            gs.name,
            gs.movie_count,
            COALESCE(rs.total_ratings, 0) as total_ratings,
            COALESCE(rs.avg_rating, 0) as avg_rating,
            COALESCE(cp.collection_saves, 0) as commercial_indicator_score
        FROM GenreStats gs
        LEFT JOIN RatingStats rs ON gs.genre_id = rs.genre_id
        LEFT JOIN CommercialProxy cp ON gs.genre_id = cp.genre_id
        ORDER BY total_ratings DESC;
        """
        
        cur.execute(query)
        results = cur.fetchall()

        report = []
        for row in results:
            report.append({
                "genre": row['name'],
                "movie_count": row['movie_count'],
                "engagement_volume": row['total_ratings'],
                "average_rating": float(row['avg_rating']),
                "commercial_indicator": row['commercial_indicator_score']
            })

        return jsonify(report), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@reports_bp.route('/polarization', methods=['GET'])
def get_polarizing_genres():
    """
    Identifies genres with the highest standard deviation in ratings 
    and high percentages of extreme scores (Love/Hate).
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
        SELECT 
            g.name,
            COUNT(r.rating) as sample_size,
            ROUND(STDDEV_SAMP(r.rating), 3) as rating_volatility,
            ROUND(
                (COUNT(CASE WHEN r.rating >= 4.5 OR r.rating <= 1.5 THEN 1 END) * 100.0) / 
                NULLIF(COUNT(r.rating), 0), 2
            ) as extreme_sentiment_pct
        FROM Genre g
        JOIN Movie_Genre mg ON g.genre_id = mg.genre_id
        JOIN Rating r ON mg.movie_id = r.movie_id
        GROUP BY g.name
        HAVING COUNT(r.rating) > 50  -- Ensure statistical significance
        ORDER BY rating_volatility DESC;
        """

        cur.execute(query)
        results = cur.fetchall()

        polarization_data = []
        for row in results:
            polarization_data.append({
                "genre": row['name'],
                "sample_size": row['sample_size'],
                "standard_deviation": float(row['rating_volatility']) if row['rating_volatility'] else 0,
                "love_hate_ratio": float(row['extreme_sentiment_pct']),
                "status": "Highly Polarizing" if row['rating_volatility'] > 1.1 else "Consensus"
            })

        return jsonify(polarization_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@reports_bp.route('/personality-insights', methods=['GET'])
def get_personality_niche_insights():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
        SELECT 
            g.name as genre,
            ROUND(AVG(p.openness), 2) as avg_openness,
            ROUND(AVG(p.agreeableness), 2) as avg_agreeableness,
            ROUND(AVG(p.extraversion), 2) as avg_extraversion,
            ROUND(AVG(p.conscientiousness), 2) as avg_conscientiousness,
            ROUND(AVG(p.emotional_stability), 2) as avg_stability,
            COUNT(pur.movie_id) as recommendation_count
        FROM Genre g
        JOIN Movie_Genre mg ON g.genre_id = mg.genre_id
        JOIN Person_User_Recommendation pur ON mg.movie_id = pur.movie_id
        JOIN Person_User p ON pur.person_user_id = p.person_user_id
        WHERE pur.predicted_rating >= 4.0
        GROUP BY g.name
        ORDER BY avg_openness DESC;
        """

        cur.execute(query)
        results = cur.fetchall()

        niche_insights = []
        for row in results:
            niche_insights.append({
                "genre": row['genre'],
                "target_persona_traits": {
                    "openness": float(row['avg_openness']),
                    "agreeableness": float(row['avg_agreeableness']), # New
                    "extraversion": float(row['avg_extraversion']),
                    "conscientiousness": float(row['avg_conscientiousness']), # New
                    "emotional_stability": float(row['avg_stability'])
                },
                "niche_strength": row['recommendation_count']
            })

        return jsonify(niche_insights), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# Requirement 3: Analysis of Viewer Rating Patterns