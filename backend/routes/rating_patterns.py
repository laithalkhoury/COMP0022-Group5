import math
from flask import Blueprint, jsonify, request
from db import get_db_connection

rating_patterns_bp = Blueprint('rating_patterns', __name__)


@rating_patterns_bp.route('/api/rating-patterns/scatter', methods=['GET'])
def scatter_data():
    movie_id = request.args.get('movie_id', type=int)
    genres = request.args.getlist('genre')
    min_ratings = request.args.get('min_ratings', 1, type=int)

    if not movie_id or not genres:
        return jsonify({"error": "movie_id and at least one genre are required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get movie title
        cur.execute("SELECT title FROM movie WHERE movie_id = %s", (movie_id,))
        movie = cur.fetchone()
        if not movie:
            return jsonify({"error": "Movie not found"}), 404

        # Total number of ratings for this movie
        cur.execute("SELECT COUNT(*) AS cnt FROM rating WHERE movie_id = %s", (movie_id,))
        total_ratings = cur.fetchone()['cnt']

        # For each user who rated the selected movie, get their rating for that movie
        # and their average rating across movies that belong to ALL selected genres (AND).
        # The HAVING clause ensures we only consider movies matching every selected genre.
        genre_placeholders = ','.join(['%s'] * len(genres))
        cur.execute(f"""
            SELECT
                r1.ml_user_id,
                r1.rating AS movie_rating,
                AVG(r2.rating) AS genre_avg_rating
            FROM rating r1
            JOIN rating r2 ON r1.ml_user_id = r2.ml_user_id
            JOIN (
                SELECT mg.movie_id
                FROM movie_genre mg
                JOIN genre g ON mg.genre_id = g.genre_id
                WHERE g.name IN ({genre_placeholders})
                GROUP BY mg.movie_id
                HAVING COUNT(DISTINCT g.name) = %s
            ) matched_movies ON r2.movie_id = matched_movies.movie_id
            WHERE r1.movie_id = %s
              AND r2.movie_id != r1.movie_id
            GROUP BY r1.ml_user_id, r1.rating
            HAVING COUNT(r2.rating) >= %s
        """, (*genres, len(genres), movie_id, min_ratings))

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
            "genres": genres,
            "points": points,
            "count": n,
            "correlation": correlation,
            "totalRatings": total_ratings,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@rating_patterns_bp.route('/api/rating-patterns/scatter-genre', methods=['GET'])
def scatter_genre_data():
    genres_x = request.args.getlist('genre_x')
    genres_y = request.args.getlist('genre_y')
    min_ratings = request.args.get('min_ratings', 1, type=int)

    if not genres_x or not genres_y:
        return jsonify({"error": "genre_x and genre_y are required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Total ratings across all X-genre movies
        x_placeholders = ','.join(['%s'] * len(genres_x))
        y_placeholders = ','.join(['%s'] * len(genres_y))

        cur.execute(f"""
            SELECT COUNT(*) AS cnt
            FROM rating r
            JOIN (
                SELECT mg.movie_id
                FROM movie_genre mg
                JOIN genre g ON mg.genre_id = g.genre_id
                WHERE g.name IN ({x_placeholders})
                GROUP BY mg.movie_id
                HAVING COUNT(DISTINCT g.name) = %s
            ) x_movies ON r.movie_id = x_movies.movie_id
        """, (*genres_x, len(genres_x)))
        total_ratings = cur.fetchone()['cnt']

        # Find users who rated at least min_ratings movies in each genre group,
        # and compute their average rating per group.
        cur.execute(f"""
            SELECT x_data.ml_user_id, x_data.x_avg_rating, y_data.y_avg_rating
            FROM (
                SELECT r.ml_user_id, AVG(r.rating) AS x_avg_rating
                FROM rating r
                JOIN (
                    SELECT mg.movie_id
                    FROM movie_genre mg
                    JOIN genre g ON mg.genre_id = g.genre_id
                    WHERE g.name IN ({x_placeholders})
                    GROUP BY mg.movie_id
                    HAVING COUNT(DISTINCT g.name) = %s
                ) x_movies ON r.movie_id = x_movies.movie_id
                GROUP BY r.ml_user_id
                HAVING COUNT(r.rating) >= %s
            ) x_data
            JOIN (
                SELECT r.ml_user_id, AVG(r.rating) AS y_avg_rating
                FROM rating r
                JOIN (
                    SELECT mg.movie_id
                    FROM movie_genre mg
                    JOIN genre g ON mg.genre_id = g.genre_id
                    WHERE g.name IN ({y_placeholders})
                    GROUP BY mg.movie_id
                    HAVING COUNT(DISTINCT g.name) = %s
                ) y_movies ON r.movie_id = y_movies.movie_id
                GROUP BY r.ml_user_id
                HAVING COUNT(r.rating) >= %s
            ) y_data ON x_data.ml_user_id = y_data.ml_user_id
        """, (*genres_x, len(genres_x), min_ratings,
              *genres_y, len(genres_y), min_ratings))

        rows = cur.fetchall()

        points = []
        xs = []
        ys = []
        for row in rows:
            x = round(float(row['x_avg_rating']), 2)
            y = round(float(row['y_avg_rating']), 2)
            points.append({"xAvgRating": x, "yAvgRating": y})
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
            "genresX": genres_x,
            "genresY": genres_y,
            "points": points,
            "count": n,
            "correlation": correlation,
            "minRatings": min_ratings,
            "totalRatings": total_ratings,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@rating_patterns_bp.route('/api/rating-patterns/total-ratings', methods=['GET'])
def total_ratings():
    mode = request.args.get('mode')
    movie_id = request.args.get('movie_id', type=int)
    genres_x = request.args.getlist('genre_x')

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if mode == 'movie-vs-genre' and movie_id:
            cur.execute("SELECT COUNT(*) AS cnt, COUNT(DISTINCT ml_user_id) AS users FROM rating WHERE movie_id = %s", (movie_id,))
        elif mode == 'genre-vs-genre' and genres_x:
            x_placeholders = ','.join(['%s'] * len(genres_x))
            cur.execute(f"""
                SELECT COUNT(*) AS cnt, COUNT(DISTINCT r.ml_user_id) AS users
                FROM rating r
                JOIN (
                    SELECT mg.movie_id
                    FROM movie_genre mg
                    JOIN genre g ON mg.genre_id = g.genre_id
                    WHERE g.name IN ({x_placeholders})
                    GROUP BY mg.movie_id
                    HAVING COUNT(DISTINCT g.name) = %s
                ) x_movies ON r.movie_id = x_movies.movie_id
            """, (*genres_x, len(genres_x)))
        else:
            return jsonify({"error": "Invalid parameters"}), 400

        row = cur.fetchone()
        return jsonify({"totalRatings": row['cnt'], "totalUsers": row['users']})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@rating_patterns_bp.route('/api/rating-patterns/threshold-counts', methods=['GET'])
def threshold_counts():
    """
    Returns user counts for a given threshold.
    - totalUsers: users whose X-axis rating meets the threshold (no Y-axis filter)
    - scatterUsers: users who also rated >= min_ratings Y-axis genre movies (matches scatter plot)
    """
    mode = request.args.get('mode')
    threshold_value = request.args.get('threshold_value', type=float)
    threshold_type = request.args.get('threshold_type')  # 'low' or 'high'
    movie_id = request.args.get('movie_id', type=int)
    genres_x = request.args.getlist('genre_x')
    genres_y = request.args.getlist('genre_y')
    min_ratings = request.args.get('min_ratings', 1, type=int)

    if threshold_value is None or threshold_type not in ('low', 'high'):
        return jsonify({"error": "threshold_value and threshold_type required"}), 400

    comparison = '<=' if threshold_type == 'low' else '>='

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if mode == 'movie-vs-genre' and movie_id:
            # totalUsers: users who rated this movie with rating meeting threshold
            cur.execute(f"""
                SELECT COUNT(DISTINCT ml_user_id) AS cnt
                FROM rating
                WHERE movie_id = %s AND rating {comparison} %s
            """, (movie_id, threshold_value))
            total_users = cur.fetchone()['cnt']

            # scatterUsers: additionally must have rated >= min_ratings Y-axis genre movies
            scatter_users = None
            if genres_y:
                y_placeholders = ','.join(['%s'] * len(genres_y))
                cur.execute(f"""
                    SELECT COUNT(*) AS cnt FROM (
                        SELECT r1.ml_user_id
                        FROM rating r1
                        JOIN rating r2 ON r1.ml_user_id = r2.ml_user_id
                        JOIN (
                            SELECT mg.movie_id
                            FROM movie_genre mg
                            JOIN genre g ON mg.genre_id = g.genre_id
                            WHERE g.name IN ({y_placeholders})
                            GROUP BY mg.movie_id
                            HAVING COUNT(DISTINCT g.name) = %s
                        ) matched ON r2.movie_id = matched.movie_id
                        WHERE r1.movie_id = %s AND r1.rating {comparison} %s
                          AND r2.movie_id != r1.movie_id
                        GROUP BY r1.ml_user_id, r1.rating
                        HAVING COUNT(r2.rating) >= %s
                    ) sub
                """, (*genres_y, len(genres_y), movie_id, threshold_value, min_ratings))
                scatter_users = cur.fetchone()['cnt']

        elif mode == 'genre-vs-genre' and genres_x:
            x_placeholders = ','.join(['%s'] * len(genres_x))
            # totalUsers: users whose avg rating across X-genre movies meets threshold
            cur.execute(f"""
                SELECT COUNT(*) AS cnt FROM (
                    SELECT r.ml_user_id
                    FROM rating r
                    JOIN (
                        SELECT mg.movie_id
                        FROM movie_genre mg
                        JOIN genre g ON mg.genre_id = g.genre_id
                        WHERE g.name IN ({x_placeholders})
                        GROUP BY mg.movie_id
                        HAVING COUNT(DISTINCT g.name) = %s
                    ) x_movies ON r.movie_id = x_movies.movie_id
                    GROUP BY r.ml_user_id
                    HAVING COUNT(r.rating) >= %s
                       AND AVG(r.rating) {comparison} %s
                ) sub
            """, (*genres_x, len(genres_x), min_ratings, threshold_value))
            total_users = cur.fetchone()['cnt']

            # scatterUsers: additionally must have rated >= min_ratings Y-axis genre movies
            scatter_users = None
            if genres_y:
                y_placeholders = ','.join(['%s'] * len(genres_y))
                cur.execute(f"""
                    SELECT COUNT(*) AS cnt FROM (
                        SELECT x_data.ml_user_id
                        FROM (
                            SELECT r.ml_user_id
                            FROM rating r
                            JOIN (
                                SELECT mg.movie_id
                                FROM movie_genre mg
                                JOIN genre g ON mg.genre_id = g.genre_id
                                WHERE g.name IN ({x_placeholders})
                                GROUP BY mg.movie_id
                                HAVING COUNT(DISTINCT g.name) = %s
                            ) x_movies ON r.movie_id = x_movies.movie_id
                            GROUP BY r.ml_user_id
                            HAVING COUNT(r.rating) >= %s
                               AND AVG(r.rating) {comparison} %s
                        ) x_data
                        JOIN (
                            SELECT r.ml_user_id
                            FROM rating r
                            JOIN (
                                SELECT mg.movie_id
                                FROM movie_genre mg
                                JOIN genre g ON mg.genre_id = g.genre_id
                                WHERE g.name IN ({y_placeholders})
                                GROUP BY mg.movie_id
                                HAVING COUNT(DISTINCT g.name) = %s
                            ) y_movies ON r.movie_id = y_movies.movie_id
                            GROUP BY r.ml_user_id
                            HAVING COUNT(r.rating) >= %s
                        ) y_data ON x_data.ml_user_id = y_data.ml_user_id
                    ) sub
                """, (*genres_x, len(genres_x), min_ratings, threshold_value,
                      *genres_y, len(genres_y), min_ratings))
                scatter_users = cur.fetchone()['cnt']
        else:
            return jsonify({"error": "Invalid parameters"}), 400

        return jsonify({
            "totalUsers": total_users,
            "scatterUsers": scatter_users,
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
            SELECT m.movie_id, m.title, m.release_year,
                   COALESCE(
                       ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL),
                       ARRAY[]::text[]
                   ) AS genres
            FROM movie m
            LEFT JOIN movie_genre mg ON m.movie_id = mg.movie_id
            LEFT JOIN genre g ON mg.genre_id = g.genre_id
            WHERE LOWER(m.title) LIKE LOWER(%s)
            GROUP BY m.movie_id, m.title, m.release_year
            ORDER BY m.title
            LIMIT %s
        """, (f"%{q}%", limit))

        results = [
            {
                "movieId": row['movie_id'],
                "title": row['title'],
                "year": row['release_year'],
                "genres": row['genres'],
            }
            for row in cur.fetchall()
        ]

        return jsonify(results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@rating_patterns_bp.route('/api/rating-patterns/preference-analysis', methods=['GET'])
def preference_analysis():
    mode = request.args.get('mode')  # 'movie-vs-genre' or 'genre-vs-genre'
    threshold_value = request.args.get('threshold_value', type=float)
    threshold_type = request.args.get('threshold_type')  # 'low' or 'high'
    combination_type = request.args.get('combination_type', 'single')  # 'single' or 'pair'
    min_ratings = request.args.get('min_ratings', 1, type=int)
    sort_by = request.args.get('sort_by', 'avg_rating')  # 'genre' | 'avg_rating' | 'num_users'
    sort_dir = request.args.get('sort_dir', 'desc')  # 'asc' | 'desc'

    if not mode or threshold_value is None or threshold_type not in ('low', 'high'):
        return jsonify({"error": "mode, threshold_value, and threshold_type (low/high) are required"}), 400
    if combination_type not in ('single', 'pair'):
        return jsonify({"error": "combination_type must be 'single' or 'pair'"}), 400
    if sort_by not in ('genre', 'avg_rating', 'num_users'):
        sort_by = 'avg_rating'
    if sort_dir not in ('asc', 'desc'):
        sort_dir = 'desc'

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        comparison = '<=' if threshold_type == 'low' else '>='

        # Phase 1: Get filtered user IDs based on mode and threshold
        if mode == 'movie-vs-genre':
            movie_id = request.args.get('movie_id', type=int)
            if not movie_id:
                return jsonify({"error": "movie_id is required for movie-vs-genre mode"}), 400

            cur.execute(f"""
                CREATE TEMP TABLE filtered_users AS
                SELECT DISTINCT ml_user_id
                FROM rating
                WHERE movie_id = %s AND rating {comparison} %s
            """, (movie_id, threshold_value))

        elif mode == 'genre-vs-genre':
            genres_x = request.args.getlist('genre_x')
            if not genres_x:
                return jsonify({"error": "genre_x is required for genre-vs-genre mode"}), 400

            x_placeholders = ','.join(['%s'] * len(genres_x))
            cur.execute(f"""
                CREATE TEMP TABLE filtered_users AS
                SELECT r.ml_user_id
                FROM rating r
                JOIN (
                    SELECT mg.movie_id
                    FROM movie_genre mg
                    JOIN genre g ON mg.genre_id = g.genre_id
                    WHERE g.name IN ({x_placeholders})
                    GROUP BY mg.movie_id
                    HAVING COUNT(DISTINCT g.name) = %s
                ) x_movies ON r.movie_id = x_movies.movie_id
                GROUP BY r.ml_user_id
                HAVING COUNT(r.rating) >= %s
                   AND AVG(r.rating) {comparison} %s
            """, (*genres_x, len(genres_x), min_ratings, threshold_value))
        else:
            return jsonify({"error": "Invalid mode"}), 400

        # Phase 2: Compute genre preferences for filtered users
        direction = 'ASC' if sort_dir == 'asc' else 'DESC'

        if combination_type == 'single':
            if sort_by == 'genre':
                order_clause = f'genre_combination {direction}'
            elif sort_by == 'num_users':
                order_clause = f'num_users {direction}'
            else:
                order_clause = f'avg_rating {direction}'

            cur.execute(f"""
                SELECT genre_combination,
                       ROUND(AVG(avg_rating)::numeric, 4) AS avg_rating,
                       COUNT(*) AS num_users
                FROM (
                    SELECT g.name AS genre_combination,
                           r.ml_user_id,
                           AVG(r.rating) AS avg_rating
                    FROM rating r
                    JOIN movie_genre mg ON r.movie_id = mg.movie_id
                    JOIN genre g ON mg.genre_id = g.genre_id
                    WHERE r.ml_user_id IN (SELECT ml_user_id FROM filtered_users)
                    GROUP BY g.name, r.ml_user_id
                    HAVING COUNT(r.rating) >= %s
                ) sub
                GROUP BY genre_combination
                ORDER BY {order_clause}
            """, (min_ratings,))
        else:
            # pair: movies must have BOTH genres (AND logic)
            if sort_by == 'genre':
                order_clause = f'genre_combination {direction}'
            elif sort_by == 'num_users':
                order_clause = f'num_users {direction}'
            else:
                order_clause = f'avg_rating {direction}'

            cur.execute(f"""
                WITH pair_movies AS (
                    SELECT mg1.movie_id, g1.name AS genre1, g2.name AS genre2
                    FROM movie_genre mg1
                    JOIN genre g1 ON mg1.genre_id = g1.genre_id
                    JOIN movie_genre mg2 ON mg1.movie_id = mg2.movie_id
                    JOIN genre g2 ON mg2.genre_id = g2.genre_id
                    WHERE g1.name < g2.name
                )
                SELECT genre_combination,
                       ROUND(AVG(avg_rating)::numeric, 4) AS avg_rating,
                       COUNT(*) AS num_users
                FROM (
                    SELECT pm.genre1 || ' + ' || pm.genre2 AS genre_combination,
                           r.ml_user_id,
                           AVG(r.rating) AS avg_rating
                    FROM rating r
                    JOIN pair_movies pm ON r.movie_id = pm.movie_id
                    WHERE r.ml_user_id IN (SELECT ml_user_id FROM filtered_users)
                    GROUP BY pm.genre1, pm.genre2, r.ml_user_id
                    HAVING COUNT(r.rating) >= %s
                ) sub
                GROUP BY genre_combination
                ORDER BY {order_clause}
            """, (min_ratings,))

        rows = cur.fetchall()
        entries = [
            {
                "genreCombination": row['genre_combination'],
                "avgRating": float(row['avg_rating']),
                "numUsers": int(row['num_users']),
            }
            for row in rows
        ]

        # Clean up temp table
        cur.execute("DROP TABLE IF EXISTS filtered_users")

        return jsonify({
            "thresholdType": threshold_type,
            "thresholdValue": threshold_value,
            "combinationType": combination_type,
            "entries": entries,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
