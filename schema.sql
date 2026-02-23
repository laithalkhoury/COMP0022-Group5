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
    password_hash TEXT NOT NULL
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