import math
from flask import Blueprint, jsonify, request
from db import get_db_connection

rating_patterns_bp = Blueprint('rating_patterns', __name__)


@rating_patterns_bp.route('/api/rating-patterns/scatter', methods=['GET'])
def scatter_data():
    movie_id = request.args.get('movie_id', type=int)
    genre = request.args.get('genre')

    if not movie_id or not genre:
        return jsonify({"error": "movie_id and genre are required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get movie title
        cur.execute("SELECT title FROM movie WHERE movie_id = %s", (movie_id,))
        movie = cur.fetchone()
        if not movie:
            return jsonify({"error": "Movie not found"}), 404

        # For each user who rated the selected movie, get their rating for that movie
        # and their average rating across all other movies in the selected genre.
        cur.execute("""
            SELECT
                r1.ml_user_id,
                r1.rating AS movie_rating,
                AVG(r2.rating) AS genre_avg_rating
            FROM rating r1
            JOIN rating r2 ON r1.ml_user_id = r2.ml_user_id
            JOIN movie_genre mg ON r2.movie_id = mg.movie_id
            JOIN genre g ON mg.genre_id = g.genre_id
            WHERE r1.movie_id = %s
              AND g.name = %s
              AND r2.movie_id != r1.movie_id
            GROUP BY r1.ml_user_id, r1.rating
        """, (movie_id, genre))

        rows = cur.fetchall()

        points = []
        xs = []
        ys = []
        for row in rows:
            x = float(row['movie_rating'])
            y = round(float(row['genre_avg_rating']), 2)
            points.append({"movieRating": x, "genreAvgRating": y})
            xs.append(x)
            ys.append(y)

        # Compute Pearson correlation
        correlation = None
        n = len(xs)
        if n >= 2:
            mean_x = sum(xs) / n
            mean_y = sum(ys) / n
            cov = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(xs, ys))
            std_x = math.sqrt(sum((xi - mean_x) ** 2 for xi in xs))
            std_y = math.sqrt(sum((yi - mean_y) ** 2 for yi in ys))
            if std_x > 0 and std_y > 0:
                correlation = round(cov / (std_x * std_y), 4)

        return jsonify({
            "movieTitle": movie['title'],
            "genre": genre,
            "points": points,
            "count": n,
            "correlation": correlation,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@rating_patterns_bp.route('/api/rating-patterns/movie-search', methods=['GET'])
def movie_search():
    q = request.args.get('q', '')
    limit = request.args.get('limit', 10, type=int)

    if len(q) < 1:
        return jsonify([])

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT movie_id, title, release_year
            FROM movie
            WHERE LOWER(title) LIKE LOWER(%s)
            ORDER BY title
            LIMIT %s
        """, (f"%{q}%", limit))

        results = [
            {"movieId": row['movie_id'], "title": row['title'], "year": row['release_year']}
            for row in cur.fetchall()
        ]

        return jsonify(results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
