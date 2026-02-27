import os
from dotenv import load_dotenv
import pandas as pd
import psycopg2
import ast
import re

# Load environment variables
load_dotenv()

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

def extract_year(title):
    """Extracts year from 'Title (YYYY)' string."""
    match = re.search(r'\((\d{4})\)', title)
    if match:
        return int(match.group(1))
    return None

def clean_title(title):
    """Removes the (YYYY) from the title."""
    return re.sub(r'\s*\(\d{4}\)\s*$', '', title).strip()


def run_etl():
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

# --- PRE-STEP: Load Runtimes from IMDb basics ---
    print("Loading runtimes from title.basics.tsv...")
    # Use keep_default_na=False and na_values to handle the \N strings properly
    basics_iter = pd.read_csv('title.basics.tsv', sep='\t', 
                              usecols=['tconst', 'runtimeMinutes'], 
                              chunksize=100000, 
                              low_memory=False)
    
    runtime_map = {}
    for chunk in basics_iter:
        # 1. Convert tconst to our integer ID format
        chunk['tid'] = chunk['tconst'].apply(clean_id)
        
        # 2. Force runtimeMinutes to numeric. 
        # Anything that isn't a number (like 'Reality-TV' or '\N') becomes NaN
        chunk['runtimeMinutes'] = pd.to_numeric(chunk['runtimeMinutes'], errors='coerce')
        
        # 3. Drop rows where we couldn't get a valid ID or a valid runtime
        valid_chunk = chunk.dropna(subset=['tid', 'runtimeMinutes'])
        
        # 4. Update the dictionary
        for _, row in valid_chunk.iterrows():
            runtime_map[int(row['tid'])] = int(row['runtimeMinutes'])

    print(f"Runtimes loaded for {len(runtime_map)} titles.")

# --- STEP 1: Populate Movie, Genre, and Movie_Genre ---
    print("Processing movies and genres...")
    links = pd.read_csv('links.csv').dropna(subset=['imdbId'])
    
    # ADD THIS LINE: This fixes the NameError
    valid_movie_ids = set(links['imdbId'].astype(int))
    
    movies_df = pd.read_csv('movies.csv')
    movies_merged = movies_df.merge(links, on='movieId')

    for _, row in movies_merged.iterrows():
        imdb_id = int(row['imdbId'])
        raw_title = row['title']
        
        year = extract_year(raw_title)
        title = clean_title(raw_title)
        # Check if runtime exists in our map, otherwise default to 0 or 90
        runtime = runtime_map.get(imdb_id, 90) 
        
        # 1. Insert Movie
        cur.execute(
            """INSERT INTO Movie (movie_id, title, release_year, runtime) 
               VALUES (%s, %s, %s, %s) ON CONFLICT (movie_id) DO NOTHING""",
            (imdb_id, title, year if year else 0, runtime)
        )

        # 2. Handle Genres
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

                # 3. Insert Movie_Genre link
                cur.execute(
                    """INSERT INTO Movie_Genre (movie_id, genre_id) 
                       VALUES (%s, %s) ON CONFLICT DO NOTHING""",
                    (imdb_id, genre_id)
                )

    conn.commit()

    # STEP 2: Scan roles to find required Crew
    print("Scanning roles.tsv to identify required crew...")
    valid_roles = {'actor', 'actress', 'director', 'self'}
    referenced_crew_ids = set()
    filtered_roles_storage = [] # To avoid reading the file again

    roles_iter = pd.read_csv('title.principals.tsv', sep='\t', chunksize=100000)
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
    names_iter = pd.read_csv('name.basics.tsv', sep='\t', chunksize=100000)
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

if __name__ == "__main__":
    run_etl()