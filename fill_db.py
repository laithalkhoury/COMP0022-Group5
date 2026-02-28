import os
from pathlib import Path
from dotenv import load_dotenv
import pandas as pd
import psycopg2
import ast
import re
from psycopg2.extras import execute_values

# Load environment variables
def load_environment():
    """Load env vars from .env or the legacy `dotenv` file.

    We avoid the default load_dotenv() call because python-dotenv 1.1.0 raises
    an AssertionError in some contexts (e.g., Python 3.13 REPL). Instead we
    explicitly point to candidate files:
      1) .env in the current working directory
      2) .env alongside this script
      3) the legacy `dotenv` filename in this repo
    """

    loaded = False

    candidates = [
        Path.cwd() / ".env", # .env from the directory you run in
        Path(__file__).with_name(".env"), # .env next to the script
        Path(__file__).with_name("dotenv"), # legacy filename
    ]

    for path in candidates:
        if path.exists():
            loaded = load_dotenv(dotenv_path=path, override=True) or loaded

    if not loaded:
        raise RuntimeError(
            "No environment file found. Add DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, FOLDER_PATH to .env or dotenv."
        )


load_environment()

# Database connection parameters
DB_PARAMS = {
    "host": os.getenv('DB_HOST'),
    "port": os.getenv('DB_PORT'),
    "database": os.getenv('DB_NAME'),
    "user": os.getenv('DB_USER'),
    "password": os.getenv('DB_PASSWORD')
}

FOLDER_PATH = os.getenv('FOLDER_PATH')

def clean_id(id_val):
    if pd.isna(id_val) or id_val == r'\N':
        return None
    
    id_str = str(id_val)
    if len(id_str) > 2:
        return int(id_str[2:])
    return None

def clean_character(char_str):
    # Handle Nulls
    if not char_str or char_str == r'\N' or str(char_str).lower() == 'nan':
        return []
    
    char_str = str(char_str).strip()
    
    try:
        # Convert string representation of list to an actual Python list
        characters = ast.literal_eval(char_str)
        
        if isinstance(characters, list):
            # Clean each string in the list
            return [str(c).strip() for c in characters if c]
        return [str(characters)] # Handle cases where it is a single string, not a list
        
    except (ValueError, SyntaxError):
        # Fallback if the string is not formatted properly, and try basic cleaning
        print("AST Failed")
        cleaned = char_str.replace('[', '').replace(']', '').replace('"', '')
        return [c.strip() for c in cleaned.split(',') if c.strip()]

def extract_year(title):
    """Extracts year from 'Title (YYYY)' string."""
    match = re.search(r'\((\d{4})\)', title)
    if match:
        return int(match.group(1))
    return None

def clean_title(title):
    """Removes the (YYYY) from the title."""
    return re.sub(r'\s*\(\d{4}\)\s*$', '', title).strip()


def run_movie_etl():
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    # Load Runtimes from IMDb basics
    print("Loading runtimes from title.basics.tsv...")
    # Use keep_default_na=False and na_values to handle the \N strings properly
    basics_iter = pd.read_csv(FOLDER_PATH+'title.basics.tsv', sep='\t', usecols=['tconst', 'runtimeMinutes'], chunksize=100000, low_memory=False)
    
    runtime_map = {}
    for chunk in basics_iter:
        # Convert tconst to our integer ID format
        chunk['tid'] = chunk['tconst'].apply(clean_id)
        
        # Force runtimeMinutes to numeric. 
        # Anything that isn't a number (like 'Reality-TV' or '\N') becomes NaN
        chunk['runtimeMinutes'] = pd.to_numeric(chunk['runtimeMinutes'], errors='coerce')
        
        # Drop rows where we couldn't get a valid ID or a valid runtime
        valid_chunk = chunk.dropna(subset=['tid', 'runtimeMinutes'])
        
        # Update the dictionary
        for _, row in valid_chunk.iterrows():
            runtime_map[int(row['tid'])] = int(row['runtimeMinutes'])

    print(f"Runtimes loaded for {len(runtime_map)} titles.")

    # Populate Movie, Genre, and Movie_Genre
    print("Processing movies and genres...")
    links = pd.read_csv(FOLDER_PATH+'links.csv').dropna(subset=['imdbId'])
    valid_movie_ids = set(links['imdbId'].astype(int))
    
    movies_df = pd.read_csv(FOLDER_PATH+'movies.csv')
    movies_merged = movies_df.merge(links, on='movieId')

    for _, row in movies_merged.iterrows():
        imdb_id = int(row['imdbId'])
        raw_title = row['title']
        
        year = extract_year(raw_title)
        title = clean_title(raw_title)
        # Check if runtime exists in our map, otherwise default to 0 or 90
        runtime = runtime_map.get(imdb_id, 90) 
        
        # Insert Movie
        cur.execute(
            """INSERT INTO Movie (movie_id, title, release_year, runtime) 
               VALUES (%s, %s, %s, %s) ON CONFLICT (movie_id) DO NOTHING""",
            (imdb_id, title, year if year else 0, runtime)
        )

        # Handle Genres
        if pd.notna(row['genres']):
            genre_list = row['genres'].split('|')
            for g_name in genre_list:
                if g_name == '(no genres listed)':
                    continue
                    
                # Insert Genre and get the ID
                cur.execute(
                    """INSERT INTO Genre (name) VALUES (%s) 
                       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                       RETURNING genre_id""",
                    (g_name,)
                )
                genre_id = cur.fetchone()[0]

                # Insert Movie_Genre link
                cur.execute(
                    """INSERT INTO Movie_Genre (movie_id, genre_id) 
                       VALUES (%s, %s) ON CONFLICT DO NOTHING""",
                    (imdb_id, genre_id)
                )

    conn.commit()

    # Scan roles to find required Crew
    print("Scanning roles.tsv to identify required crew...")
    valid_roles = {'actor', 'actress', 'director', 'self'}
    referenced_crew_ids = set()
    filtered_roles_storage = [] # To avoid reading the file again

    roles_iter = pd.read_csv(FOLDER_PATH+'title.principals.tsv', sep='\t', chunksize=100000)
    for chunk in roles_iter:
        chunk['t_int'] = chunk['tconst'].apply(clean_id)
        chunk['n_int'] = chunk['nconst'].apply(clean_id)
        
        # Filter rows
        mask = (chunk['t_int'].isin(valid_movie_ids)) & (chunk['category'].isin(valid_roles))
        relevant_rows = chunk[mask]
        
        for _, row in relevant_rows.iterrows():
            referenced_crew_ids.add(row['n_int'])
            filtered_roles_storage.append({
                'm_id': row['t_int'],
                'c_id': row['n_int'],
                'chars': clean_character(row['characters']) if row['category'] != 'director' else [],
                'role': row['category']
            })


    # Populate Crew
    print(f"Populating Crew table with {len(referenced_crew_ids)} unique people...")
    names_iter = pd.read_csv(FOLDER_PATH+'name.basics.tsv', sep='\t', chunksize=100000)
    for chunk in names_iter:
        chunk['n_int'] = chunk['nconst'].apply(clean_id)
        needed_names = chunk[chunk['n_int'].isin(referenced_crew_ids)]
        
        for _, row in needed_names.iterrows():
            cur.execute(
                "INSERT INTO Crew (crew_id, name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (row['n_int'], row['primaryName'])
            )

    # Populate Movie_Crew and Movie_Character
    print("Populating Movie_Crew and Movie_Character tables...")
    for entry in filtered_roles_storage:
        # DO UPDATE will update the role_name and always return a movie_crew_id value
        cur.execute(
            """INSERT INTO Movie_Crew (movie_id, crew_id, role_name) 
               VALUES (%s, %s, %s) 
               ON CONFLICT (movie_id, crew_id, role_name) 
               DO UPDATE SET role_name = EXCLUDED.role_name
               RETURNING movie_crew_id""",
            (entry['m_id'], entry['c_id'], entry['role'])
        )
        movie_crew_id = cur.fetchone()[0]

        # Insert any character names into the Movie_Character table
        for character_name in entry['chars']:
            cur.execute(
                """INSERT INTO Movie_Character (movie_crew_id, character_name) 
                   VALUES (%s, %s)
                   ON CONFLICT (movie_crew_id, character_name) DO NOTHING""",
                (movie_crew_id, character_name)
            )

    conn.commit()
    cur.close()
    conn.close()
    print("Movie ETL complete!")

def run_ml_user_etl():
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    print("Populating ML_User table...")
    ratings = pd.read_csv(FOLDER_PATH+'ratings.csv')
    unique_users = ratings['userId'].unique()

    for user_id in unique_users:
        cur.execute(
            "INSERT INTO ML_User (ml_user_id) VALUES (%s) ON CONFLICT DO NOTHING",
            (int(user_id),)
        )

    conn.commit()
    cur.close()
    conn.close()
    print(f"ML_User ETL complete! {len(unique_users)} users inserted.")


def run_personality_etl():
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    print("Populating person_user and person_user_recommendation tables...")
    df = pd.read_csv(FOLDER_PATH+'personality-isf2018/personality-data.csv')
    df.columns = df.columns.str.strip()

    # Pre-load valid movie IDs to avoid FK violations
    cur.execute("SELECT movie_id FROM Movie")
    valid_movie_ids = {row[0] for row in cur.fetchall()}

    for _, row in df.iterrows():
        cur.execute(
            """INSERT INTO Person_User
               (person_user_id, assigned_metric, assigned_condition, openness, agreeableness, extraversion, conscientiousness, emotional_stability)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING""",
            (row['userid'].strip(), row['assigned metric'].strip(), row['assigned condition'].strip(),
             row['openness'], row['agreeableness'], row['extraversion'],
             row['conscientiousness'], row['emotional_stability'])
        )

        for rank in range(1, 13):
            movie_id = row[f'movie_{rank}']
            predicted_rating = row[f'predicted_rating_{rank}']
            if pd.notna(movie_id) and pd.notna(predicted_rating) and int(movie_id) in valid_movie_ids:
                cur.execute(
                    """INSERT INTO Person_User_Recommendation (person_user_id, rank_position, movie_id, predicted_rating)
                       VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING""",
                    (row['userid'].strip(), rank, int(movie_id), float(predicted_rating))
                )

    conn.commit()
    cur.close()
    conn.close()
    print("Personality ETL complete!")

def load_movielens_to_imdb_map() -> dict[int, int]:
    """
    Map MovieLens movieId -> imdbId (int).
    Because your Movie.movie_id is currently inserted using links.imdbId.
    """
    links = pd.read_csv(
        FOLDER_PATH + "links.csv",
        usecols=["movieId", "imdbId"],
        dtype={"movieId": "int64", "imdbId": "string"},
        low_memory=False
    ).dropna(subset=["imdbId"])

    # imdbId in links.csv is numeric string (no 'tt'), convert to int
    links["imdbId"] = links["imdbId"].astype(int)

    return dict(zip(links["movieId"].tolist(), links["imdbId"].tolist()))


def run_tag_etl():
    """
    Fill Tag(tag_text) from MovieLens tags.csv
    """
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    print("Populating Tag table from tags.csv...")

    tags_iter = pd.read_csv(
        FOLDER_PATH + "tags.csv",
        usecols=["tag"],
        chunksize=200_000,
        low_memory=False
    )

    total_attempts = 0

    for chunk in tags_iter:
        s = chunk["tag"].dropna().astype(str).str.strip()
        s = s[(s != "")].drop_duplicates()

        rows = [(t,) for t in s.tolist()]
        if not rows:
            continue

        total_attempts += len(rows)
        execute_values(
            cur,
            """
            INSERT INTO Tag (tag_text)
            VALUES %s
            ON CONFLICT (tag_text) DO NOTHING
            """,
            rows,
            page_size=10_000
        )

    conn.commit()
    cur.close()
    conn.close()

    print(f"Tag ETL complete! Attempted inserts: {total_attempts}.")


def run_rating_etl():
    """
    Fill Rating from ratings.csv.
    NOTE: ratings.csv.movieId must be mapped to imdbId (Movie.movie_id) via links.csv
    """
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    print("Populating Rating table from ratings.csv...")
    ml_to_imdb = load_movielens_to_imdb_map()

    ratings_iter = pd.read_csv(
        FOLDER_PATH + "ratings.csv",
        usecols=["userId", "movieId", "rating", "timestamp"],
        chunksize=200_000,
        low_memory=False
    )

    total_upserts = 0

    for chunk in ratings_iter:
        chunk["imdb_id"] = chunk["movieId"].map(ml_to_imdb)
        chunk = chunk.dropna(subset=["userId", "imdb_id", "rating", "timestamp"])

        # epoch seconds -> naive datetime (UTC)
        rated_at = pd.to_datetime(chunk["timestamp"], unit="s", utc=True).dt.tz_convert(None)

        rows = list(
            zip(
                chunk["userId"].astype(int),
                chunk["imdb_id"].astype(int),
                chunk["rating"].astype(float),
                rated_at
            )
        )

        if not rows:
            continue

        total_upserts += len(rows)
        execute_values(
            cur,
            """
            INSERT INTO Rating (ml_user_id, movie_id, rating, rated_at)
            VALUES %s
            ON CONFLICT (ml_user_id, movie_id)
            DO UPDATE SET
              rating = EXCLUDED.rating,
              rated_at = EXCLUDED.rated_at
            """,
            rows,
            page_size=10_000
        )

    conn.commit()
    cur.close()
    conn.close()

    print(f"Rating ETL complete! Upserted rows: {total_upserts}.")


def run_user_movie_tag_etl():
    """
    Fill User_Movie_Tag from tags.csv.
    Requires:
      - ML_User already populated (run_ml_user_etl)
      - Movie already populated (run_movie_etl)
      - Tag already populated (run_tag_etl)
    """
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    print("Populating User_Movie_Tag table from tags.csv...")
    ml_to_imdb = load_movielens_to_imdb_map()

    # Build tag_text -> tag_id map (Tag table must already be filled)
    cur.execute("SELECT tag_id, tag_text FROM Tag")
    tag_map = {tag_text: tag_id for (tag_id, tag_text) in cur.fetchall()}

    tags_iter = pd.read_csv(
        FOLDER_PATH + "tags.csv",
        usecols=["userId", "movieId", "tag", "timestamp"],
        chunksize=200_000,
        low_memory=False
    )

    total_inserts = 0

    for chunk in tags_iter:
        chunk["imdb_id"] = chunk["movieId"].map(ml_to_imdb)
        chunk["tag_clean"] = chunk["tag"].dropna().astype(str).str.strip()

        chunk = chunk.dropna(subset=["userId", "imdb_id", "tag_clean", "timestamp"])
        chunk = chunk[chunk["tag_clean"] != ""]

        tagged_at = pd.to_datetime(chunk["timestamp"], unit="s", utc=True).dt.tz_convert(None)

        rows = []
        for user_id, imdb_id, tag_text, dt in zip(
            chunk["userId"].astype(int),
            chunk["imdb_id"].astype(int),
            chunk["tag_clean"],
            tagged_at
        ):
            tag_id = tag_map.get(tag_text)
            if tag_id is None:
                # Should not happen if run_tag_etl() ran, but safe-guard
                continue
            rows.append((user_id, imdb_id, tag_id, dt))

        if not rows:
            continue

        total_inserts += len(rows)
        execute_values(
            cur,
            """
            INSERT INTO User_Movie_Tag (ml_user_id, movie_id, tag_id, tagged_at)
            VALUES %s
            ON CONFLICT DO NOTHING
            """,
            rows,
            page_size=10_000
        )

    conn.commit()
    cur.close()
    conn.close()

    print(f"User_Movie_Tag ETL complete! Attempted inserts: {total_inserts}.")



if __name__ == "__main__":
    run_movie_etl()
    run_ml_user_etl()
    run_personality_etl()
    run_tag_etl()
    run_rating_etl()
    run_user_movie_tag_etl()
    print("Full ETL complete! Integrity maintained.")