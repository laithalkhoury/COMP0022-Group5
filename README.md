# COMP0022 Group 5 Coursework

# Running with Docker

### Prerequisites
- [Docker Desktop](https://www.docker.com/) installed and running

### Steps

1. **Set up environment variables**

   Edit the `.env` file in the root directory and set:
   - `DB_PASSWORD` — any password (e.g. `postgres`)
   - `SECRET_KEY` — any random string, or generate one with:
     ```bash
     python -c "import secrets; print(secrets.token_hex(32))"
     ```

2. **Start all services**
   ```bash
   docker compose up --build
   ```
   This starts the database (with data pre-loaded), backend, and frontend.

3. **Open the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

### Stopping
```bash
docker compose down
```

To also reset the database (full wipe):
```bash
docker compose down -v
```

---

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

## Database

The project uses **PostgreSQL 17** to store movie metadata, ratings, tags, personality data, user accounts, and saved collections.

When you run docker:

```bash
docker compose up --build
```

the db service starts PostgreSQL and initializes the database from`db/dump.sql`. This preloaded dump is the database source used during normal Docker startup. The backend connects to PostgreSQL through the Docker service name db, and the database is also exposed locally at:

- PostgreSQL: localhost:5432

If you want to fully reset the database and recreate it from the checked-in dump:

```
docker compose down -v
docker compose up --build
```

### Environment Variables .env

| Variable    | Description                                                  |
| :---------- | :----------------------------------------------------------- |
| DB_NAME     | PostgreSQL database name                                     |
| DB_USER     | PostgreSQL username                                          |
| DB_PASSWORD | PostgreSQL password                                          |
| DB_HOST     | Database host used by the backend                            |
| DB_PORT     | Database port                                                |
| FOLDER_PATH | Only needed when running the ETL script locally to rebuild the database |

## Schema Overview

The schema is defined in `db/schema.sql`

Main tables include:

- Movie, Genre, Movie_Genre
- Crew, Movie_Crew, Movie_Character
- ML_User, Rating
- Tag, User_Movie_Tag
- Person_User, Person_User_Recommendation
- App_User
- Collection_List, List_Item
- Box_Office, Award

**NOTE:** Movie.movie_id stores the **IMDb ID** used by the ETL pipeline, not the original MovieLens `movieId`.

### Rebuilding the Database

For normal development, you do **not** need to rebuild the database manually. Docker loads the prebuilt dump from db/dump.sql.

If you need to regenerate the database manually, the project includes:

- `db/schema.sql` for schema creation
- `db/fill_db.py for ETL` and data loading

The ETL script requires:

- database environment variables
- FOLDER_PATH pointing to the dataset directory

It also expects additional data sources such as poster, box office, and awards files, so the ETL workflow is separate from normal Docker startup.

### Data Provenance

The database content is based on an ETL pipeline implemented in `db/fill_db.py`, which combines data from multiple sources:

- the original MovieLens `ml-latest-small` dataset (https://files.grouplens.org/datasets/movielens/ml-latest-small.zip) including:
  - `movies.csv`
  - `links.csv`
  - `ratings.csv`
  - `tags.csv`
- the GroupLens personality dataset (https://files.grouplens.org/datasets/personality-isf2018/personality-isf2018.zip):
  - `personality-data.csv`
- IMDb data exports used for cast and crew enrichment:
  - `title.principals.tsv` (https://datasets.imdbws.com/title.principals.tsv.gz)
  - `name.basics.tsv` (https://datasets.imdbws.com/name.basics.tsv.gz)
- additional enrichment data for posters, box office, and awards, derived from TMDb and Wikidata through the project notebook `db/get_dataset.ipynb`

These sources were used to build the preloaded SQL dump included in this repository.

## MovieDB Backend

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