from flask import Blueprint, jsonify, request
from db import get_db_connection

movies_bp = Blueprint('movies', __name__)

from flask import Flask, jsonify, request, Blueprint
from flask_cors import CORS
from .auth import auth_bp

app = Flask(__name__)
CORS(app)
app.register_blueprint(auth_bp) 

movies_bp = Blueprint('movies', __name__)

@movies_bp.route('/api/movies/<int:movie_id>', methods=['GET'])
def get_movie_details(movie_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get Core Movie Details
        movie_query = "SELECT movie_id, title, release_year, runtime, tmdb_id, poster_url FROM Movie WHERE movie_id = %s"
        cur.execute(movie_query, (movie_id,))
        movie = cur.fetchone()

        if not movie:
            return jsonify({"error": "Movie not found"}), 404

        # Get Genres
        genre_query = """
            SELECT g.name
            FROM Genre g
            JOIN Movie_Genre mg ON g.genre_id = mg.genre_id
            WHERE mg.movie_id = %s
        """
        cur.execute(genre_query, (movie_id,))
        genres = [row['name'] for row in cur.fetchall()]

        # Get Crew and Characters
        crew_query = """
            SELECT c.name, mc.role_name, mchar.character_name
            FROM Movie_Crew mc
            JOIN Crew c ON mc.crew_id = c.crew_id
            LEFT JOIN Movie_Character mchar ON mc.movie_crew_id = mchar.movie_crew_id
            WHERE mc.movie_id = %s
        """
        cur.execute(crew_query, (movie_id,))
        crew_results = cur.fetchall()

        # Get Average Rating and Rating Count
        rating_query = """
            SELECT
                ROUND(AVG(rating), 2) as avg_rating,
                COUNT(rating) as num_ratings
            FROM Rating
            WHERE movie_id = %s
        """
        cur.execute(rating_query, (movie_id,))
        rating_stats = cur.fetchone()

        # Get All Unique Tags
        tag_query = """
            SELECT DISTINCT t.tag_text
            FROM Tag t
            JOIN User_Movie_Tag umt ON t.tag_id = umt.tag_id
            WHERE umt.movie_id = %s
        """
        cur.execute(tag_query, (movie_id,))
        tags = [row['tag_text'] for row in cur.fetchall()]

        movie_info = {
            "movie_id": movie['movie_id'],
            "title": movie['title'],
            "release_year": movie['release_year'],
            "runtime": movie['runtime'],
            "tmdb_id": movie['tmdb_id'],
            "poster_url": movie['poster_url'],
            "genres": genres,
            "average_rating": float(rating_stats['avg_rating']) if rating_stats['avg_rating'] else 0.0,
            "rating_count": rating_stats['num_ratings'],
            "tags": tags,
            "crew": [
                {
                    "name": row['name'],
                    "role": row['role_name'],
                    "character": row['character_name']
                } for row in crew_results
            ]
        }

        return jsonify(movie_info)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@movies_bp.route('/api/movies', methods=['GET'])
def search_movies():
    title = request.args.get('title')
    genre = request.args.get('genre')
    year_start = request.args.get('year_start', 1900)
    year_end = request.args.get('year_end', 2026)
    limit = request.args.get('limit')
    if limit is not None:
        limit = int(limit)
    offset = int(request.args.get('offset', 0))
    tag = request.args.get('tag')
    min_rating = request.args.get('min_rating')
    max_rating = request.args.get('max_rating')
    crew_name = request.args.get('crew')

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Build WHERE conditions
        where_clauses = ["m.release_year BETWEEN %s AND %s"]
        params = [year_start, year_end]

        if title:
            where_clauses.append("m.title ILIKE %s")
            params.append(f"%{title}%")

        if genre:
            where_clauses.append("EXISTS (SELECT 1 FROM Movie_Genre mg2 JOIN Genre g2 ON mg2.genre_id = g2.genre_id WHERE mg2.movie_id = m.movie_id AND g2.name = %s)")
            params.append(genre)

        if tag:
            where_clauses.append("""EXISTS (
                SELECT 1 FROM User_Movie_Tag umt
                JOIN Tag t ON umt.tag_id = t.tag_id
                WHERE umt.movie_id = m.movie_id AND t.tag_text ILIKE %s
            )""")
            params.append(f"%{tag}%")

        if crew_name:
            where_clauses.append("EXISTS (SELECT 1 FROM Movie_Crew mc2 JOIN Crew c2 ON mc2.crew_id = c2.crew_id WHERE mc2.movie_id = m.movie_id AND c2.name ILIKE %s)")
            params.append(f"%{crew_name}%")

        if min_rating:
            where_clauses.append("r_stats.avg_rating >= %s")
            params.append(float(min_rating))

        if max_rating:
            where_clauses.append("r_stats.avg_rating <= %s")
            params.append(float(max_rating))

        where_sql = " AND ".join(where_clauses)

        joins = """
            FROM Movie m
            LEFT JOIN (
                SELECT movie_id, AVG(rating) as avg_rating
                FROM Rating
                GROUP BY movie_id
            ) r_stats ON m.movie_id = r_stats.movie_id
            LEFT JOIN Movie_Genre mg ON m.movie_id = mg.movie_id
            LEFT JOIN Genre g ON mg.genre_id = g.genre_id
        """

        # Get total count (distinct movies)
        cur.execute(f"SELECT COUNT(DISTINCT m.movie_id) as total {joins} WHERE {where_sql}", tuple(params))
        total = cur.fetchone()['total']

        # Get paginated results with genres aggregated
        data_query = f"""
            SELECT m.movie_id, m.title, m.release_year, m.runtime, m.tmdb_id, m.poster_url,
                   r_stats.avg_rating,
                   COALESCE(
                       ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL),
                       ARRAY[]::text[]
                   ) as genres
            {joins}
            WHERE {where_sql}
            GROUP BY m.movie_id, m.title, m.release_year, m.runtime, m.tmdb_id, m.poster_url, r_stats.avg_rating
            ORDER BY m.release_year DESC
        """

        data_params = list(params)
        if limit is not None:
            data_query += " LIMIT %s"
            data_params.append(limit)
        data_query += " OFFSET %s"
        data_params.append(offset)

        cur.execute(data_query, tuple(data_params))
        movies = cur.fetchall()

        return jsonify({
            "count": total,
            "results": [dict(m) for m in movies]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
