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

# MovieDB Backend

Backend service for the MovieDB analytics platform.  
This API provides movie catalogue search, analytics reports, personality-based recommendations, predictive ratings, and user-curated collections.

The backend is implemented using **Flask** and **PostgreSQL**, and exposes a REST API consumed by the frontend application.

---

# 🚀 Tech Stack
- **Framework:** Flask
- **Database:** PostgreSQL
- **Database Driver:** psycopg2-binary
- **Authentication:** JWT (PyJWT) + Werkzeug password hashing
- **Containerization:** Docker

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|------|----------|-------------|
| POST | `/api/register` | Create a new user |
| POST | `/api/login` | Authenticate user and return JWT token |

**Register request body**

```json
{
  "username": "string",
  "password": "string"
}
```

**Login response**

```json
{
  "token": "JWT_TOKEN",
  "username": "string"
}
```

---

### Movie Catalogue

| Method | Endpoint | Description |
|------|----------|-------------|
| GET | `/api/movies` | Search movies with filters and pagination |
| GET | `/api/movies/<movie_id>` | Retrieve detailed information for a movie |

**Search parameters**

`title`, `genre`, `tag`, `crew`, `year_start`, `year_end`,  
`min_rating`, `max_rating`, `limit`, `offset`, `sort_by`, `sort_dir`

---

### Filters

| Method | Endpoint | Description |
|------|----------|-------------|
| GET | `/api/filters/options` | Retrieve available filter values |

Returns available genres, tags, and other filter categories.

---

### Personality Insights

| Method | Endpoint | Description |
|------|----------|-------------|
| GET | `/api/personality/genre-traits` | Get Big Five personality traits by genre |
| POST | `/api/personality/recommendations` | Get movie recommendations based on personality |

**Example request**

```json
{
  "openness": 0.7,
  "agreeableness": 0.6,
  "extraversion": 0.5,
  "conscientiousness": 0.8,
  "emotional_stability": 0.4
}
```

---

### Predictive Ratings

| Method | Endpoint | Description |
|------|----------|-------------|
| POST | `/api/predictions/predict` | Predict expected audience rating for a movie |

**Example request**

```json
{
  "title": "Upcoming Movie",
  "genres": ["Action"],
  "tags": ["space"],
  "release_year": 2026
}
```

---

### Rating Pattern Analysis

| Method | Endpoint | Description |
|------|----------|-------------|
| GET | `/api/rating-patterns/scatter` | Compare movie ratings vs genre preferences |
| GET | `/api/rating-patterns/scatter-genre` | Compare ratings between two genres |
| GET | `/api/rating-patterns/movie-search` | Search movies for analysis tools |
| GET | `/api/rating-patterns/preference-analysis` | Analyze genre preference patterns |

---

### Collections (Authenticated)

All collection endpoints require:

```
Authorization: Bearer <JWT_TOKEN>
```

| Method | Endpoint | Description |
|------|----------|-------------|
| GET | `/api/collections` | Get user collections |
| POST | `/api/collections` | Create a collection |
| PUT | `/api/collections/<collection_id>` | Update collection |
| DELETE | `/api/collections/<collection_id>` | Delete collection |
| PUT | `/api/collections/reorder` | Reorder collections |

---

### Movies in Collections

| Method | Endpoint | Description |
|------|----------|-------------|
| GET | `/api/collections/<collection_id>/movies` | List movies in a collection |
| POST | `/api/collections/<collection_id>/movies` | Add movie to collection |
| DELETE | `/api/collections/<collection_id>/movies/<movie_id>` | Remove movie from collection |
| PUT | `/api/collections/<collection_id>/movies/reorder` | Reorder movies |