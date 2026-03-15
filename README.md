# COMP0022 Group 5 Coursework

# React JS Frontend

A React TypeScript frontend built with Vite, Tailwind CSS, and React Router.

## Setup

```
npm install
npm run dev
```

# Environment Variables `.env`

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Backend REST API base URL |

# MovieDB Backend

## 🚀 Tech Stack
*   **Language:** Python 3.11+
*   **Framework:** Flask
*   **Database Driver:** Psycopg2-binary
*   **Data Processing:** Pandas / NumPy
*   **Containerization:** Docker

## 🛣 API Endpoints

### 1. Movie Catalogue (Requirement 1)
*   `GET /api/movies` — Get paginated list of movies with filters.
*   `GET /api/movies/<id>` — Get detailed information about a specific movie, including its title, release_year, runtime, poster_url, genres, average_rating, rating_count, tags, crew. Also returns box office and awards data if applicable.

### 2. Market Reports (Requirement 2)
*   `GET /api/genres/popularity-report` — Returns genre engagement and popaulriyt metrics.
*   `GET /api/genres/polarization` — Returns volatility (standard deviation) metrics.
*   `GET /api/genres/genre-financials` — ROI analysis and average revenue per genre.
*   `GET /api/genres/award-stats` — Returns number of awards and nominations received for the genre.

### 3. Audience Insights (Requirement 5)
*   `GET /api/genres/personality-insights` — Psychological profiles (Big Five traits) of genre fans.

### 4. Curated Collections (Requirement 6)
*   `POST /api/collections` — Create a new strategy shortlist.
*   `GET /api/collections/<user_id>` — Retrieve saved collections.

## 🛡 Security Features
*   **Parameterized Queries:** All database interactions use `psycopg2` placeholders to prevent **SQL Injection**.
*   **Password Hashing:** User credentials in the `App_User` table are secured using `scrypt` hashing via `Werkzeug`.
*   **Isolation:** The database is not exposed to the public; it only communicates with the backend via a private Docker network.

## 📂 Structure
*   **/routes**: Contains the Flask Blueprints for different modules (Reports, Movies, Collections).
*   **main.py**: Entry point for the Flask application.
*   **requirements.txt**: Python dependency manifest.