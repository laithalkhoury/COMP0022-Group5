from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database connection parameters
DB_CONFIG = {
    "host": os.getenv('DB_HOST'),
    "port": os.getenv('DB_PORT'),
    "database": os.getenv('DB_NAME'),
    "user": os.getenv('DB_USER'),
    "password": os.getenv('DB_PASSWORD')
}

def get_db_connection():
    # RealDictCursor allows us to get results as Python dictionaries
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

@app.route('/api/movies/<int:movie_id>', methods=['GET'])
def get_movie_details(movie_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get Core Movie Details
        movie_query = "SELECT movie_id, title, release_year, runtime FROM Movie WHERE movie_id = %s"
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

        # Format the final JSON response
        movie_info = {
            "movie_id": movie['movie_id'],
            "title": movie['title'],
            "release_year": movie['release_year'],
            "runtime": movie['runtime'],
            "genres": genres,
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




@app.route('/api/movies', methods=['GET'])
def search_movies():
    # Get query parameters from the URL
    title = request.args.get('title')
    genre = request.args.get('genre')
    year_start = request.args.get('year_start', 1900)
    year_end = request.args.get('year_end', 2026)
    limit = int(request.args.get('limit', 20))
    offset = int(request.args.get('offset', 0))

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Base Query
        # We use DISTINCT because a movie joined with multiple genres/crew creates duplicate rows
        query = """
            SELECT DISTINCT m.movie_id, m.title, m.release_year, m.runtime
            FROM Movie m
            LEFT JOIN Movie_Genre mg ON m.movie_id = mg.movie_id
            LEFT JOIN Genre g ON mg.genre_id = g.genre_id
            LEFT JOIN Movie_Crew mc ON m.movie_id = mc.movie_id
            LEFT JOIN Crew c ON mc.crew_id = c.crew_id
            WHERE m.release_year BETWEEN %s AND %s
        """
        params = [year_start, year_end]

        # Add Filters Dynamically
        if title:
            query += " AND m.title ILIKE %s"
            params.append(f"%{title}%")
        
        if genre:
            query += " AND g.name = %s"
            params.append(genre)

        # Pagination
        query += " ORDER BY m.release_year DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur.execute(query, tuple(params))
        movies = cur.fetchall()

        return jsonify({
            "count": len(movies),
            "results": movies
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()



if __name__ == '__main__':
    app.run(debug=True, port=5000)