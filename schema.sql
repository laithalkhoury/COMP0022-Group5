CREATE TABLE Movie (
    movie_id INT PRIMARY KEY,
    title TEXT NOT NULL
);

CREATE TABLE Crew (
    crew_id INT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE Movie_Crew (
    movie_crew_id SERIAL PRIMARY KEY,
    movie_id INT REFERENCES Movie(movie_id) ON DELETE CASCADE,
    crew_id INT REFERENCES Crew(crew_id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    UNIQUE (movie_id, crew_id, role_name)
);

CREATE TABLE Movie_Character (
    character_id SERIAL PRIMARY KEY,
    movie_crew_id INT REFERENCES Movie_Crew(movie_crew_id) ON DELETE CASCADE,
    character_name TEXT NOT NULL,
    UNIQUE (movie_crew_id, character_name)
);

CREATE TABLE App_User (
    app_user_id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE ML_User (
    ml_user_id BIGSERIAL PRIMARY KEY
);

SELECT 
    m.movie_id, 
    m.title, 
    c.name, 
    mch.character_name, 
    mc.role_name
FROM Movie m
JOIN Movie_Crew mc ON m.movie_id = mc.movie_id
JOIN Crew c ON mc.crew_id = c.crew_id
LEFT JOIN Movie_Character mch ON mc.movie_crew_id = mch.movie_crew_id;

SELECT 
    m.movie_id, 
    m.title, 
    c.name, 
    mch.character_name, 
    mc.role_name
FROM Movie m
JOIN Movie_Crew mc ON m.movie_id = mc.movie_id
JOIN Crew c ON mc.crew_id = c.crew_id
LEFT JOIN Movie_Character mch ON mc.movie_crew_id = mch.movie_crew_id
WHERE mch.character_name LIKE '%,%';





-- CREATE TABLE Movie (
--     movie_id INT PRIMARY KEY,
--     title TEXT NOT NULL,
--     release_year SMALLINT NOT NULL,
--     runtime INT CHECK (runtime > 0)
-- );

-- =========================
-- Planner tables (Requirement 6)
-- =========================


CREATE TABLE collection_list (
  collection_id    BIGSERIAL PRIMARY KEY,
  app_user_id      BIGINT NOT NULL,
  collection_name  TEXT NOT NULL,
  created_at       TIMESTAMP NOT NULL,
  updated_at       TIMESTAMP NOT NULL,
  CONSTRAINT fk_collection_list_app_user
    FOREIGN KEY (app_user_id)
    REFERENCES App_User(app_user_id)
    ON DELETE CASCADE
);

CREATE TABLE list_item (
  collection_id  BIGINT NOT NULL,
  movie_id       INT NOT NULL,
  added_at       TIMESTAMP NOT NULL,
  note           TEXT,
  PRIMARY KEY (collection_id, movie_id),
  CONSTRAINT fk_list_item_collection
    FOREIGN KEY (collection_id)
    REFERENCES collection_list(collection_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_list_item_movie
    FOREIGN KEY (movie_id)
    REFERENCES movie(movie_id)
    ON DELETE CASCADE
);


-- =========================
-- Personality tables (Requirement 5)
-- =========================
CREATE TABLE person_user (
  person_user_id       TEXT PRIMARY KEY,
  assigned_metric      TEXT NOT NULL,
  assigned_condition   TEXT NOT NULL,
  openness             NUMERIC(3,2) NOT NULL,
  agreeableness        NUMERIC(3,2) NOT NULL,
  extraversion         NUMERIC(3,2) NOT NULL,
  conscientiousness    NUMERIC(3,2) NOT NULL,
  emotional_stability  NUMERIC(3,2) NOT NULL
);

CREATE TABLE person_user_recommendation (
  person_user_id   TEXT NOT NULL,
  rank_position    SMALLINT NOT NULL CHECK (rank_position BETWEEN 1 AND 12),
  movie_id         INT NOT NULL,
  predicted_rating NUMERIC(3,2) NOT NULL,
  PRIMARY KEY (person_user_id, rank_position),
  CONSTRAINT fk_pur_person_user
    FOREIGN KEY (person_user_id)
    REFERENCES person_user(person_user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pur_movie
    FOREIGN KEY (movie_id)
    REFERENCES movie(movie_id)
    ON DELETE CASCADE
);
