CREATE TABLE users (
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL 
);

CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    release_date VARCHAR(50),
    genre VARCHAR(50),
    vote_average VARCHAR(50),
    overview VARCHAR(1000)
);

CREATE TABLE saved_to_users (
    username VARCHAR(50),
    movie_id INTEGER,
    PRIMARY KEY (username, movie_id),
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

CREATE TABLE watched_to_users (
    username VARCHAR(50),
    movie_id INTEGER,
    PRIMARY KEY (username, movie_id),
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

-- SELECT sm.*
-- FROM movies sm
-- JOIN saved_to_users stu ON sm.id = stu.movie_id
-- WHERE stu.username = 'some_username';

