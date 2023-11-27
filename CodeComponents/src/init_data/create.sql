CREATE TABLE users (
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL 
);

CREATE TABLE saved_movies (
    movie VARCHAR(200),
    movie_id INTEGER
);

CREATE TABLE saved_to_users (
    
);

CREATE TABLE watched_movies (

);

CREATE TABLE watched_to_users (

);


