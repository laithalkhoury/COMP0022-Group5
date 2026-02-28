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

        # The raw SQL query joining your schema tables
        query = """
            SELECT 
                m.title, 
                c.name AS crew_name, 
                mc.role_name, 
                mchar.character_name
            FROM Movie m
            JOIN Movie_Crew mc ON m.movie_id = mc.movie_id
            JOIN Crew c ON mc.crew_id = c.crew_id
            LEFT JOIN Movie_Character mchar ON mc.movie_crew_id = mchar.movie_crew_id
            WHERE m.movie_id = %s;
        """

        # Using parameterised queries to prevent SQL Injection
        cur.execute(query, (movie_id,))
        results = cur.fetchall()

        if not results:
            return jsonify({"error": "Movie not found"}), 404

        # Formatting the response
        movie_info = {
            "movie_id": movie_id,
            "title": results[0]['title'],
            "crew": [
                {
                    "name": row['crew_name'],
                    "role": row['role_name'],
                    "character": row['character_name'] # Will be None if it doesn't exist
                } for row in results
            ]
        }

        cur.close()
        return jsonify(movie_info)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)