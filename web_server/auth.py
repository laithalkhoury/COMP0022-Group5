from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
import psycopg2
from psycopg2.extras import RealDictCursor

auth_bp = Blueprint('auth', __name__)

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        cursor_factory=RealDictCursor
    )

SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    print("CRITICAL ERROR: SECRET_KEY is not set in .env")

@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Missing credentials"}), 400

    hashed_password = generate_password_hash(password)

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO App_User (username, password_hash) VALUES (%s, %s) RETURNING app_user_id",
            (username, hashed_password)
        )
        user_id = cur.fetchone()['app_user_id']
        conn.commit()
        return jsonify({"message": "User created", "user_id": user_id}), 201
    except Exception as e:
        return jsonify({"error": "Username already exists or database error"}), 400
    finally:
        if conn: conn.close()

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM App_User WHERE username = %s", (username,))
        user = cur.fetchone()

        if user and check_password_hash(user['password_hash'], password):
            # Generate JWT Token
            token = jwt.encode({
                'user_id': user['app_user_id'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, SECRET_KEY, algorithm="HS256")

            return jsonify({"token": token, "username": user['username']}), 200
        
        return jsonify({"error": "Invalid credentials"}), 401
    finally:
        if conn: conn.close()