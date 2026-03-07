# Requirement 4: Predictive Ratings for Newly Acquired or Upcoming Titles
from flask import Blueprint, request, jsonify
from db import get_db_connection

predictions_bp = Blueprint('predictions', __name__)

@predictions_bp.route('/api/predictions/predict', methods=['POST'])
def predict_movie_performance():
    data = request.get_json()
    
    # Extract form inputs
    title = data.get('title', 'Upcoming Title')
    genres = data.get('genres', [])    
    tags = data.get('tags', [])        
    year = data.get('release_year')    

    if not genres or not year:
        return jsonify({"error": "Genres and Release Year are required for prediction"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
        WITH TargetGenres AS (
            SELECT genre_id, name FROM Genre WHERE name = ANY(%s)
        ),
        AllPotentialPeers AS (
            SELECT 
                m.movie_id, 
                m.title, 
                m.poster_url,
                (
                    (SELECT COUNT(*) FROM Movie_Genre mg2 
                     WHERE mg2.movie_id = m.movie_id 
                     AND mg2.genre_id IN (SELECT genre_id FROM TargetGenres)) +
                    
                    (SELECT COUNT(DISTINCT umt.tag_id) FROM User_Movie_Tag umt
                     JOIN Tag t ON umt.tag_id = t.tag_id
                     WHERE umt.movie_id = m.movie_id 
                     AND t.tag_text = ANY(%s)) +
                    
                    CASE WHEN m.release_year BETWEEN %s -20 AND %s + 20 THEN 1 ELSE 0 END
                ) as similarity_score
            FROM Movie m
            WHERE EXISTS (
                SELECT 1 FROM Movie_Genre mg 
                WHERE mg.movie_id = m.movie_id 
                AND mg.genre_id IN (SELECT genre_id FROM TargetGenres)
            )
            GROUP BY m.movie_id, m.title, m.poster_url, m.release_year
        ),
        PeerMovies AS (
            SELECT movie_id, title, poster_url, similarity_score
            FROM AllPotentialPeers
            ORDER BY similarity_score DESC, movie_id ASC
            LIMIT 20
        ),
        GenreExperts AS (
            SELECT r.ml_user_id
            FROM Rating r
            JOIN Movie_Genre mg ON r.movie_id = mg.movie_id
            WHERE mg.genre_id IN (SELECT genre_id FROM TargetGenres)
            GROUP BY r.ml_user_id
            ORDER BY COUNT(*) DESC
            LIMIT 50
        ),
        ExpertRatings AS (
            SELECT r.rating
            FROM Rating r
            JOIN GenreExperts ge ON r.ml_user_id = ge.ml_user_id
            JOIN PeerMovies pm ON r.movie_id = pm.movie_id
        ),
        Top5Peers AS (
            SELECT title, poster_url
            FROM PeerMovies 
            LIMIT 5
        )
        SELECT 
            ROUND(AVG(rating), 2) as predicted_mean,
            ROUND(STDDEV_SAMP(rating), 2) as uncertainty,
            COUNT(rating) as sample_size,
            (SELECT json_agg(t) FROM Top5Peers t) as top_peers
        FROM ExpertRatings;
        """

        cur.execute(query, (genres, tags, year, year))
        result = cur.fetchone()

        if not result or result['sample_size'] == 0:
            return jsonify({
                "title": title,
                "prediction": None,
                "message": "Insufficient data from experts for the top 20 similar movies."
            }), 200

        return jsonify({
            "title": title,
            "mean": float(result['predicted_mean']),
            "uncertainty": float(result['uncertainty']) if result['uncertainty'] else 0.0,
            "sample_size": result['sample_size'],
            "confidence": "High" if result['sample_size'] > 50 else "Moderate",
            "top_peers": result['top_peers'] if result['top_peers'] else []
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
