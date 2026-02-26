import os
from pathlib import Path
from dotenv import load_dotenv
import pandas as pd
import psycopg2
import ast

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
        Path.cwd() / ".env",                # .env from the directory you run in
        Path(__file__).with_name(".env"),    # .env next to the script
        Path(__file__).with_name("dotenv"),  # legacy filename
    ]

    for path in candidates:
        if path.exists():
            loaded = load_dotenv(dotenv_path=path, override=True) or loaded

    if not loaded:
        raise RuntimeError(
            "No environment file found. Add DB_HOST, DB_PORT, DB_NAME, "
            "DB_USER, DB_PASSWORD to .env or dotenv."
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

print(DB_PARAMS)

def clean_id(id_val):
    if pd.isna(id_val) or id_val == r'\N':
        return None
    
    id_str = str(id_val)
    if len(id_str) > 2:
        return int(id_str[2:])
    return None

def clean_character(char_str):
    # 1. Handle Nulls
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

def run_etl():
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    # STEP 1: Populate Movie
    print("Mapping Links and populating Movie table...")
    links = pd.read_csv('/Users/laithkhoury/Desktop/UCL/Coursework/Databases/Coursework/ml-latest-small/links.csv').dropna(subset=['imdbId'])
    valid_movie_ids = set(links['imdbId'].astype(int))
    
    movies_df = pd.read_csv('/Users/laithkhoury/Desktop/UCL/Coursework/Databases/Coursework/ml-latest-small/movies.csv')
    movies_merged = movies_df.merge(links, on='movieId')
    
    for _, row in movies_merged.iterrows():
        cur.execute(
            "INSERT INTO Movie (movie_id, title) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (int(row['imdbId']), row['title'])
        )

    # STEP 2: Scan roles to find required Crew
    print("Scanning roles.tsv to identify required crew...")
    valid_roles = {'actor', 'actress', 'director', 'self'}
    referenced_crew_ids = set()
    filtered_roles_storage = [] # To avoid reading the file again

    roles_iter = pd.read_csv('/Users/laithkhoury/Desktop/UCL/Coursework/Databases/Coursework/title.principals.tsv', sep='\t', chunksize=100000)
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

    # STEP 3: Populate Crew
    print(f"Populating Crew table with {len(referenced_crew_ids)} unique people...")
    names_iter = pd.read_csv('/Users/laithkhoury/Desktop/UCL/Coursework/Databases/Coursework/name.basics.tsv', sep='\t', chunksize=100000)
    for chunk in names_iter:
        chunk['n_int'] = chunk['nconst'].apply(clean_id)
        needed_names = chunk[chunk['n_int'].isin(referenced_crew_ids)]
        
        for _, row in needed_names.iterrows():
            cur.execute(
                "INSERT INTO Crew (crew_id, name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (row['n_int'], row['primaryName'])
            )
    
    # Commit here so the foreign keys definitely exist for the next step
    # conn.commit()

    # STEP 4: Populate Movie_Crew and Movie_Character
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
    print("ETL complete! Integrity maintained.")

def run_ml_user_etl():
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    print("Populating ML_User table...")
    ratings = pd.read_csv('/Users/laithkhoury/Desktop/UCL/Coursework/Databases/Coursework/ml-latest-small/ratings.csv')
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
    df = pd.read_csv('/Users/laithkhoury/Desktop/UCL/Coursework/Databases/Coursework/personality-isf2018/personality-data.csv')
    df.columns = df.columns.str.strip()

    # Pre-load valid movie IDs to avoid FK violations
    cur.execute("SELECT movie_id FROM Movie")
    valid_movie_ids = {row[0] for row in cur.fetchall()}

    for _, row in df.iterrows():
        cur.execute(
            """INSERT INTO person_user
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
                    """INSERT INTO person_user_recommendation (person_user_id, rank_position, movie_id, predicted_rating)
                       VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING""",
                    (row['userid'].strip(), rank, int(movie_id), float(predicted_rating))
                )

    conn.commit()
    cur.close()
    conn.close()
    print("Personality ETL complete!")


if __name__ == "__main__":
    run_etl()
    run_ml_user_etl()
    run_personality_etl()
