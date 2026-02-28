-- =========================
-- Movie, Crew and Genre tables (Requirement 1)
-- =========================

CREATE TABLE Movie (
    movie_id INT PRIMARY KEY,
    title TEXT NOT NULL,
    release_year SMALLINT NOT NULL,
    runtime INT CHECK (runtime > 0)
);

CREATE TABLE Genre (
    genre_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Movie_Genre (
    movie_id INT NOT NULL,
    genre_id INT NOT NULL,
    
    PRIMARY KEY (movie_id, genre_id),
    
    CONSTRAINT fk_movie
        FOREIGN KEY (movie_id)
        REFERENCES Movie(movie_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_genre
        FOREIGN KEY (genre_id)
        REFERENCES Genre(genre_id)
        ON DELETE CASCADE
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
    password_hash TEXT NOT NULL
);

CREATE TABLE ML_User (
    ml_user_id BIGSERIAL PRIMARY KEY
);


-- Tags
CREATE TABLE Tag (
  tag_id    BIGSERIAL PRIMARY KEY,
  tag_text  TEXT NOT NULL UNIQUE
);

-- User-Movie-Tag
CREATE TABLE User_Movie_Tag (
  ml_user_id  BIGINT NOT NULL,
  movie_id    INT NOT NULL,
  tag_id      BIGINT NOT NULL,
  tagged_at   TIMESTAMP NOT NULL,

 PRIMARY KEY (ml_user_id, movie_id, tag_id, tagged_at),

  CONSTRAINT fk_umt_ml_user
    FOREIGN KEY (ml_user_id)
    REFERENCES ml_user(ml_user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_umt_movie
    FOREIGN KEY (movie_id)
    REFERENCES movie(movie_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_umt_tag
    FOREIGN KEY (tag_id)
    REFERENCES tag(tag_id)
    ON DELETE CASCADE
);

-- Ratings
CREATE TABLE Rating (
  ml_user_id  BIGINT NOT NULL,
  movie_id    INT NOT NULL,
  rating      NUMERIC(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
  rated_at    TIMESTAMP NOT NULL,

  PRIMARY KEY (ml_user_id, movie_id),

  CONSTRAINT fk_rating_ml_user
    FOREIGN KEY (ml_user_id)
    REFERENCES ml_user(ml_user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_rating_movie
    FOREIGN KEY (movie_id)
    REFERENCES movie(movie_id)
    ON DELETE CASCADE
);

-- =========================
-- Personality tables (Requirement 5)
-- =========================

CREATE TABLE Person_User (
  person_user_id       TEXT PRIMARY KEY,
  assigned_metric      TEXT NOT NULL,
  assigned_condition   TEXT NOT NULL,
  openness             NUMERIC(3,2) NOT NULL,
  agreeableness        NUMERIC(3,2) NOT NULL,
  extraversion         NUMERIC(3,2) NOT NULL,
  conscientiousness    NUMERIC(3,2) NOT NULL,
  emotional_stability  NUMERIC(3,2) NOT NULL
);

CREATE TABLE Person_User_Recommendation (
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

-- =========================
-- Planner tables (Requirement 6)
-- =========================

CREATE TABLE Collection_List (
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

CREATE TABLE List_Item (
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


DROP TABLE User_Movie_Tag;
DROP TABLE Rating;
DROP TABLE Tag;
DROP TABLE Movie_Character;
DROP TABLE Movie_Crew;
DROP TABLE Crew;
DROP TABLE Movie_Genre;
DROP TABLE Genre;
DROP TABLE ML_User;
DROP TABLE Person_User_Recommendation;
DROP TABLE Person_User;
DROP TABLE List_Item;
DROP TABLE Collection_List;
DROP TABLE App_User;
DROP TABLE Movie;