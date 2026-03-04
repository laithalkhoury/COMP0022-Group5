from flask import Blueprint, jsonify
from db import get_db_connection

filters_bp = Blueprint('filters', __name__)


@filters_bp.route('/api/filters/options', methods=['GET'])
def get_filter_options():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT name FROM Genre ORDER BY name")
        genres = [row['name'] for row in cur.fetchall()]

        cur.execute("SELECT DISTINCT tag_text FROM Tag ORDER BY tag_text LIMIT 300")
        tags = [row['tag_text'] for row in cur.fetchall()]

        return jsonify({"genres": genres, "tags": tags, "awards": []})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
