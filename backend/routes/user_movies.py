import os
import functools
import datetime
import jwt
from flask import Blueprint, request, jsonify
from db import get_db_connection

user_movies_bp = Blueprint('user_movies', __name__)
SECRET_KEY = os.getenv('SECRET_KEY')


def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({"error": "Missing token"}), 401
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


def verify_ownership(cur, collection_id, user_id):
    cur.execute(
        "SELECT collection_id FROM Collection_List WHERE collection_id = %s AND app_user_id = %s",
        (collection_id, user_id)
    )
    return cur.fetchone() is not None


# ---- Collection CRUD ----

@user_movies_bp.route('/api/collections', methods=['GET'])
@require_auth
def get_collections():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT c.collection_id, c.collection_name, c.notes, c.sort_order,
                   c.created_at, c.updated_at,
                   COUNT(li.movie_id) AS movie_count
            FROM Collection_List c
            LEFT JOIN List_Item li ON c.collection_id = li.collection_id
            WHERE c.app_user_id = %s
            GROUP BY c.collection_id
            ORDER BY c.sort_order, c.collection_id
        """, (request.user_id,))
        rows = cur.fetchall()
        return jsonify([{
            "collection_id": r["collection_id"],
            "collection_name": r["collection_name"],
            "notes": r["notes"],
            "sort_order": r["sort_order"],
            "movie_count": r["movie_count"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
        } for r in rows])
    finally:
        if conn:
            conn.close()


@user_movies_bp.route('/api/collections', methods=['POST'])
@require_auth
def create_collection():
    data = request.get_json()
    name = data.get('name', '').strip()
    notes = data.get('notes', '').strip() or None
    if not name:
        return jsonify({"error": "Collection name is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM Collection_List WHERE app_user_id = %s",
            (request.user_id,)
        )
        next_order = cur.fetchone()["next_order"]
        now = datetime.datetime.utcnow()
        cur.execute("""
            INSERT INTO Collection_List (app_user_id, collection_name, notes, sort_order, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING collection_id, collection_name, notes, sort_order, created_at, updated_at
        """, (request.user_id, name, notes, next_order, now, now))
        r = cur.fetchone()
        conn.commit()
        return jsonify({
            "collection_id": r["collection_id"],
            "collection_name": r["collection_name"],
            "notes": r["notes"],
            "sort_order": r["sort_order"],
            "movie_count": 0,
            "created_at": r["created_at"].isoformat(),
            "updated_at": r["updated_at"].isoformat(),
        }), 201
    finally:
        if conn:
            conn.close()


# Reorder must be registered before /<int:collection_id> routes
@user_movies_bp.route('/api/collections/reorder', methods=['PUT'])
@require_auth
def reorder_collections():
    data = request.get_json()
    order = data.get('order', [])
    if not order:
        return jsonify({"error": "Order list is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        for item in order:
            cid = item.get('collectionId')
            so = item.get('sortOrder')
            if cid is None or so is None:
                return jsonify({"error": "Each item needs collectionId and sortOrder"}), 400
            if not verify_ownership(cur, cid, request.user_id):
                return jsonify({"error": f"Collection {cid} not found"}), 404
            cur.execute(
                "UPDATE Collection_List SET sort_order = %s WHERE collection_id = %s",
                (so, cid)
            )
        conn.commit()
        return '', 204
    finally:
        if conn:
            conn.close()


@user_movies_bp.route('/api/collections/<int:collection_id>', methods=['PUT'])
@require_auth
def update_collection(collection_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if not verify_ownership(cur, collection_id, request.user_id):
            return jsonify({"error": "Collection not found"}), 404

        data = request.get_json()
        name = data.get('name')
        notes = data.get('notes')

        sets = []
        params = []
        if name is not None:
            sets.append("collection_name = %s")
            params.append(name.strip())
        if notes is not None:
            sets.append("notes = %s")
            params.append(notes.strip() or None)
        if not sets:
            return jsonify({"error": "Nothing to update"}), 400

        sets.append("updated_at = %s")
        params.append(datetime.datetime.utcnow())
        params.append(collection_id)

        cur.execute(
            f"UPDATE Collection_List SET {', '.join(sets)} WHERE collection_id = %s "
            "RETURNING collection_id, collection_name, notes, sort_order, created_at, updated_at",
            params
        )
        r = cur.fetchone()
        conn.commit()

        # Get movie count
        cur.execute("SELECT COUNT(*) AS cnt FROM List_Item WHERE collection_id = %s", (collection_id,))
        cnt = cur.fetchone()["cnt"]

        return jsonify({
            "collection_id": r["collection_id"],
            "collection_name": r["collection_name"],
            "notes": r["notes"],
            "sort_order": r["sort_order"],
            "movie_count": cnt,
            "created_at": r["created_at"].isoformat(),
            "updated_at": r["updated_at"].isoformat(),
        })
    finally:
        if conn:
            conn.close()


@user_movies_bp.route('/api/collections/<int:collection_id>', methods=['DELETE'])
@require_auth
def delete_collection(collection_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if not verify_ownership(cur, collection_id, request.user_id):
            return jsonify({"error": "Collection not found"}), 404
        cur.execute("DELETE FROM Collection_List WHERE collection_id = %s", (collection_id,))
        conn.commit()
        return '', 204
    finally:
        if conn:
            conn.close()


# ---- Movies in a collection ----

@user_movies_bp.route('/api/collections/<int:collection_id>/movies', methods=['GET'])
@require_auth
def get_collection_movies(collection_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if not verify_ownership(cur, collection_id, request.user_id):
            return jsonify({"error": "Collection not found"}), 404

        cur.execute("""
            SELECT m.movie_id, m.title, m.release_year, m.runtime, m.poster_url,
                   li.added_at, li.sort_order,
                   COALESCE(rs.avg_rating, NULL) AS avg_rating,
                   COALESCE(rs.rating_count, 0) AS rating_count,
                   COALESCE(string_agg(DISTINCT g.name, ',' ORDER BY g.name), '') AS genres
            FROM List_Item li
            JOIN Movie m ON li.movie_id = m.movie_id
            LEFT JOIN (
                SELECT movie_id, ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS rating_count
                FROM Rating GROUP BY movie_id
            ) rs ON m.movie_id = rs.movie_id
            LEFT JOIN Movie_Genre mg ON m.movie_id = mg.movie_id
            LEFT JOIN Genre g ON mg.genre_id = g.genre_id
            WHERE li.collection_id = %s
            GROUP BY m.movie_id, m.title, m.release_year, m.runtime, m.poster_url,
                     li.added_at, li.sort_order, rs.avg_rating, rs.rating_count
            ORDER BY li.sort_order, li.added_at
        """, (collection_id,))
        rows = cur.fetchall()

        return jsonify([{
            "id": r["movie_id"],
            "title": r["title"],
            "year": r["release_year"],
            "runtime": r["runtime"],
            "posterUrl": r["poster_url"],
            "avgRating": float(r["avg_rating"]) if r["avg_rating"] is not None else None,
            "ratingCount": r["rating_count"],
            "genres": [g for g in r["genres"].split(',') if g],
            "addedAt": r["added_at"].isoformat() if r["added_at"] else None,
            "sortOrder": r["sort_order"],
        } for r in rows])
    finally:
        if conn:
            conn.close()


@user_movies_bp.route('/api/collections/<int:collection_id>/movies', methods=['POST'])
@require_auth
def add_movie_to_collection(collection_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if not verify_ownership(cur, collection_id, request.user_id):
            return jsonify({"error": "Collection not found"}), 404

        data = request.get_json()
        movie_id = data.get('movieId')
        if not movie_id:
            return jsonify({"error": "movieId is required"}), 400

        # Check movie exists
        cur.execute("SELECT movie_id FROM Movie WHERE movie_id = %s", (movie_id,))
        if not cur.fetchone():
            return jsonify({"error": "Movie not found"}), 404

        # Check not already in collection
        cur.execute(
            "SELECT 1 FROM List_Item WHERE collection_id = %s AND movie_id = %s",
            (collection_id, movie_id)
        )
        if cur.fetchone():
            return jsonify({"error": "Movie already in collection"}), 409

        cur.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM List_Item WHERE collection_id = %s",
            (collection_id,)
        )
        next_order = cur.fetchone()["next_order"]

        now = datetime.datetime.utcnow()
        cur.execute(
            "INSERT INTO List_Item (collection_id, movie_id, added_at, sort_order) VALUES (%s, %s, %s, %s)",
            (collection_id, movie_id, now, next_order)
        )
        cur.execute(
            "UPDATE Collection_List SET updated_at = %s WHERE collection_id = %s",
            (now, collection_id)
        )
        conn.commit()
        return jsonify({"message": "Movie added"}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@user_movies_bp.route('/api/collections/<int:collection_id>/movies/reorder', methods=['PUT'])
@require_auth
def reorder_collection_movies(collection_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if not verify_ownership(cur, collection_id, request.user_id):
            return jsonify({"error": "Collection not found"}), 404

        data = request.get_json()
        order = data.get('order', [])
        if not order:
            return jsonify({"error": "Order list is required"}), 400

        for item in order:
            mid = item.get('movieId')
            so = item.get('sortOrder')
            if mid is None or so is None:
                return jsonify({"error": "Each item needs movieId and sortOrder"}), 400
            cur.execute(
                "UPDATE List_Item SET sort_order = %s WHERE collection_id = %s AND movie_id = %s",
                (so, collection_id, mid)
            )
        conn.commit()
        return '', 204
    finally:
        if conn:
            conn.close()


@user_movies_bp.route('/api/collections/<int:collection_id>/movies/<int:movie_id>', methods=['DELETE'])
@require_auth
def remove_movie_from_collection(collection_id, movie_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if not verify_ownership(cur, collection_id, request.user_id):
            return jsonify({"error": "Collection not found"}), 404

        cur.execute(
            "DELETE FROM List_Item WHERE collection_id = %s AND movie_id = %s",
            (collection_id, movie_id)
        )
        if cur.rowcount == 0:
            return jsonify({"error": "Movie not in collection"}), 404
        cur.execute(
            "UPDATE Collection_List SET updated_at = %s WHERE collection_id = %s",
            (datetime.datetime.utcnow(), collection_id)
        )
        conn.commit()
        return '', 204
    finally:
        if conn:
            conn.close()
