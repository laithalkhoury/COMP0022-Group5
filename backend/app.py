import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from routes.movies import movies_bp
from routes.reports import reports_bp
from routes.predictions import predictions_bp
from routes.personality import personality_bp
from routes.planner import planner_bp
from routes.auth import auth_bp

load_dotenv()

app = Flask(__name__)
CORS(app)

app.register_blueprint(movies_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(predictions_bp)
app.register_blueprint(personality_bp)
app.register_blueprint(planner_bp)
app.register_blueprint(auth_bp)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=True)