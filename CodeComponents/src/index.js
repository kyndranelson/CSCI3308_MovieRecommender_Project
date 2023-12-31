const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.



/* START DATA BASE STUFF */
const dbConfig = {
    host: 'db', // the database server
    port: 5432, // the database port
    database: process.env.POSTGRES_DB, // the database name
    user: process.env.POSTGRES_USER, // the user account to connect with
    password: process.env.POSTGRES_PASSWORD, // the password of the user account
  };
  
const db = pgp(dbConfig);
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });
/* END DATA BASE STUFF */

/* START EXPRESS CONFIG */
app.set('view engine', 'ejs');
app.use(bodyParser.json());

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      saveUninitialized: false,
      resave: false,
    })
  );
  
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

app.use(express.static('resources'));
/* END EXPRESS CONFIG */

/* START ROUTES */
app.get('/', (req, res) => {
  // Use the res.redirect method to redirect the user to the /discover endpoint
  res.redirect('/discover')
});

// Discover route
app.get('/discover', async (req, res) => {
  try {
    const genresResponse = await axios.get('https://api.themoviedb.org/3/genre/movie/list', {
      params: {
        api_key: process.env.API_KEY,
        language: 'en-US',
      },
    });

    const genres = genresResponse.data.genres.reduce((acc, genre) => {
      acc[genre.id] = genre.name;
      return acc;
    }, {});

    const poptmdbEndpoint = 'https://api.themoviedb.org/3/discover/movie';
    const toptmdbEndpoint = 'https://api.themoviedb.org/3/movie/top_rated';
    
    const params = {
      api_key: process.env.API_KEY,
      language: 'en-US',
      sort_by: 'popularity.desc',
    };
    let topMovies = [];
    let popMovies = []; // To store all fetched movies
    let currentPage = 1;
    const totalPages= 2 // Number of pages to fetch, adjust as needed

    while (currentPage <= totalPages) {
      const response = await axios.get(poptmdbEndpoint, {
        params: {
          ...params,
          page: currentPage,
        },
      });
      

      const popmoviesOnPage = response.data.results;
      
      popmoviesOnPage.forEach((movie) => {
        movie.genres_ids = movie.genre_ids.map((genreId) => genres[genreId]);
      });

      popMovies.push(...popmoviesOnPage);
      currentPage++;
    }
    //reset current page
    currentPage = 1;
    //Get top movies
    while (currentPage <= totalPages) {
      const response2 = await axios.get(toptmdbEndpoint, {
        params: {
          ...params,
          page: currentPage,
        },
      });
      

      const topmoviesOnPage = response2.data.results;
      
      topmoviesOnPage.forEach((movie) => {
        movie.genres_ids = movie.genre_ids.map((genreId) => genres[genreId]);
      });

      topMovies.push(...topmoviesOnPage);
      currentPage++;
    }

    console.log(popMovies.length);
    popMovies.forEach((movie) => {

      // Map genre_ids to their corresponding genre names using the genres object
      movie.genres_ids = movie.genre_ids.map((genreId) => genres[genreId]);
    
    });
    topMovies.forEach((movie) => {

      // Map genre_ids to their corresponding genre names using the genres object
      movie.genres_ids = movie.genre_ids.map((genreId) => genres[genreId]);
    
    });
    console.log(topMovies.length);
    

    res.render('pages/discover', { popMovies, topMovies, user: req.session?.user });
  } catch (error) {
    console.error('Error fetching data from TMDb:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.query; // Extracting the search query parameter from the request

    const searchLink = 'https://api.themoviedb.org/3/search/movie';

    const response = await axios.get(searchLink, {
      params: {
        api_key: process.env.API_KEY,
        language: 'en-US',
        query: searchQuery, 
        page: 1, 
      },
    });

    const searchedMovies = response.data.results.splice(0,12);
    const genresResponse = await axios.get('https://api.themoviedb.org/3/genre/movie/list', {
      params: {
        api_key: process.env.API_KEY,
        language: 'en-US',
      },
    });

    const genres = genresResponse.data.genres.reduce((acc, genre) => {
      acc[genre.id] = genre.name;
      return acc;
    }, {});
    searchedMovies.forEach((movie) => {
      movie.genre_ids = movie.genre_ids.map((genreId) => genres[genreId]);
    });

    res.render('pages/search', {searchedMovies, user: req.session?.user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/logout', (req, res) => {
  //destroy the session first so the user can  be logged out
  req.session.destroy();
  //render the logout page to then have the user redirect themselves to the discover page
  res.render('pages/logout', {user: req.session?.user} )
});
app.get('/login', (req, res) => {
  // Handle the login page logic here or render a login page if needed
  res.render('pages/login', {user: req.session?.user} )
});
app.get('/register', (req, res) => {
  // Use the res.redirect method to redirect the user to the /login endpoint
  res.render('pages/register', {user: req.session?.user} )
});

// TEST ROUTE
app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
});

app.get('/saved_movies', async (req, res) => {
  try {
    if (!req.session.user) {
      // If user is not logged in, redirect to the login page
      return res.redirect('/login');
    }
    const username = req.session.user.username;
    // TODO: Query the database for saved movies
    const savedMovies = await db.any(
      "SELECT sm.* FROM movies sm JOIN saved_to_users stu ON sm.id = stu.movie_id WHERE stu.username = $1",
      [username]
    );
    console.log(savedMovies);
    const genresResponse = await axios.get('https://api.themoviedb.org/3/genre/movie/list', {
      params: {
        api_key: process.env.API_KEY,
        language: 'en-US',
      },
    });

    const genres = genresResponse.data.genres.reduce((acc, genre) => {
      acc[genre.id] = genre.name;
      return acc;
    }, {});
    savedMovies.forEach((movie) => {
      const genreArray = movie.genre.split(',').map((id) => parseInt(id.trim()));
      movie.genres = genreArray.map((genreId) => genres[genreId]);
    });

    console.log(savedMovies);

    // Render the discover page with saved movies
    res.render('pages/savedMovies', { savedMovies, user: req.session?.user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/watched_movies', async (req, res) => {
  try {
    if (!req.session.user) {
      // If user is not logged in, redirect to the login page
      return res.redirect('/login');
    }
    const username = req.session.user.username;
    // TODO: Query the database for watched movies
    const watchedMovies = await db.any(
      "SELECT sm.* FROM movies sm JOIN watched_to_users stu ON sm.id = stu.movie_id WHERE stu.username = $1",
      [username]
    );
    const genresResponse = await axios.get('https://api.themoviedb.org/3/genre/movie/list', {
      params: {
        api_key: process.env.API_KEY,
        language: 'en-US',
      },
    });

    const genres = genresResponse.data.genres.reduce((acc, genre) => {
      acc[genre.id] = genre.name;
      return acc;
    }, {});
    watchedMovies.forEach((movie) => {
      const genreArray = movie.genre.split(',').map((id) => parseInt(id.trim()));
      movie.genres = genreArray.map((genreId) => genres[genreId]);
    });

    console.log(watchedMovies);

    // Render the discover page with watched movies
    res.render('pages/watchedMovies', { watchedMovies, user: req.session?.user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// RECOMMENDED ROUTE
app.get('/recommended_movies', async (req, res) => {
  try {
    if (!req.session.user) {
      // If user is not logged in, redirect to the login page
      return res.redirect('/login');
    }
    const username = req.session.user.username;
    // TODO: Query the database for recommended movies
    // const topGenre = await db.any(
    //   "SELECT w.genre, COUNT(*) AS genre_count FROM users u JOIN watched_to_users wu ON u.username = wu.username JOIN movies w ON wu.movie_id = w.id WHERE u.username = $1 GROUP BY w.genre ORDER BY genre_count DESC LIMIT 1;",
    //   [username]
    // );

    // console.log(topGenre)
    // const topGenreFormatted = topGenre[0].genre;
    
    // const recommendedMovies = await db.any(
    //   "SELECT m.* FROM movies m LEFT JOIN watched_to_users wu ON m.id = wu.movie_id LEFT JOIN saved_to_users su ON m.id = su.movie_id WHERE m.genre = $1 AND wu.movie_id IS NULL AND su.movie_id IS NULL ORDER BY CAST(m.vote_average AS DECIMAL) DESC LIMIT 12;",
    //   [topGenreFormatted]
    // );


    const watchedGenres = await db.any(
      `SELECT genre
       FROM watched_to_users
       JOIN movies ON watched_to_users.movie_id = movies.id
       WHERE username = $1`, [username]
    );

    console.log("watched genres", watchedGenres)

    // Parse the genre ids and flatten the array
    const genreIds = watchedGenres.flatMap(({ genre }) => genre.split(',').map(id => id.trim()));


    console.log("genre ids", genreIds)

    // Count the frequency of each genre id
    const genreFrequency = genreIds.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
    }, {});

    console.log("genre freq", genreFrequency)

    // Find the most frequent genre id
    const mostFrequentGenreId = Object.keys(genreFrequency).sort((a, b) => genreFrequency[b] - genreFrequency[a])[0];

    console.log("most freq", mostFrequentGenreId)

    // If they have not saved any movies i.e no top genre to pick from, return blank.
    if(!mostFrequentGenreId) {
      res.render('pages/recommendedMovies', { recommendedMovies: [], user: req.session?.user });
      return;
    }

    // Get the list of movies that the user has not watched which contain the most frequent genre id
    const recommendedMovies = await db.any(
        `SELECT *
        FROM movies
        WHERE id NOT IN (SELECT movie_id FROM watched_to_users WHERE username = $1)`, [username]
    );

    /*
     [
codecomponents-web-1  |   {
codecomponents-web-1  |     id: 1,
codecomponents-web-1  |     title: 'Meg 2: The Trench',
codecomponents-web-1  |     release_date: '2023-08-02',
codecomponents-web-1  |     genre: '28,878,27',
codecomponents-web-1  |     vote_average: '6.7',
codecomponents-web-1  |     overview: 'An exploratory dive into the deepest depths of the ocean of a daring research team spirals into chaos when a malevolent mining operation threatens their mission and forces them into a high-stakes battle for survival.',
codecomponents-web-1  |     image_url: 'https://image.tmdb.org/t/p/w500/4m1Au3YkjqsxF8iwQy0fPYSxE0h.jpg',
codecomponents-web-1  |     genres: [ 'Action', 'Science Fiction', 'Horror' ]
codecomponents-web-1  |   }
codecomponents-web-1  | ]
*/


    console.log("recommended (all movies not watched)", recommendedMovies)


    const realMovies = [];

    for(const movie of recommendedMovies) {
      // if the user has marked watched movie genre id
      const mvids = movie.genre.split(',').map(id => id.trim());
      const tempg = [];
      for(const geid of genreIds) {
        if(mvids.includes(geid)) {
          tempg.push(geid)
        }
      }
      if(tempg.length>0) {
        realMovies.push({...movie, tempg});
      }
    }

    console.log("real moviez", realMovies)

    
    const genresResponse = await axios.get('https://api.themoviedb.org/3/genre/movie/list', {
      params: {
        api_key: process.env.API_KEY,
        language: 'en-US',
      },
    });
    const genres = genresResponse.data.genres.reduce((acc, genre) => {
      acc[genre.id] = genre.name;
      return acc;
    }, {});
    realMovies.forEach((movie) => {
      const genreArray = movie.genre.split(',').map((id) => parseInt(id.trim()));
      movie.genres = genreArray.map((genreId) => genres[genreId]);

      movie.tempg = movie.tempg.map(e => genres[e]);
    });

    console.log("rec movies", recommendedMovies)
    console.log("real moviez2 ", realMovies)
    // Render the discover page with recommended movies
    res.render('pages/recommendedMovies', { recommendedMovies: realMovies, user: req.session?.user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// LOGIN ROUTE
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);


        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            res.render('pages/login', { user: req.session?.user, error: 'Invalid username or password' });
            return;
        }

        req.session.user = user;
        req.session.save();

        res.redirect('/discover');
    } catch (err) {
        res.render('pages/login', { user: req.session?.user, error: 'Error when contacting database' });
    }
});

//REGISTER ROUTE
app.post('/register', async (req, res) => {
  try {
    //hash the password using bcrypt library
    const hash = await bcrypt.hash(req.body.password, 10);

    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [req.body.username]);

    if (user) {
        res.redirect('/login');
        return;
    }

    db.tx(async (t) => {
      await t.none(
        "INSERT INTO users(username, password) VALUES ($1, $2);",
        [req.body.username, hash]
      );

      res.render('pages/login', {user: req.session?.user});
    }) 
      .catch((err) => {
        res.render("pages/register", {
          error: true,
          message: err.message,
        });
      });
  } catch (err) {
    res.render("pages/register", {
      error: true,
      message: err.message,
    });
  }
  
});

// SAVE MOVIE
app.post('/save_movie', async (req, res) => {
  try {
      const { title, release_date, genre, vote_average, overview, image_url } = req.body;
      const username = req.session.user.username;

      const existingMovie = await db.oneOrNone('SELECT id FROM movies WHERE title = $1', [title]);

      let movieId;
      if (existingMovie) {
          movieId = existingMovie.id;
      } else {
          const insertedMovie = await db.one(
              'INSERT INTO movies (title, release_date, genre, vote_average, overview, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
              [title, release_date, genre, vote_average, overview, image_url]
          );
          movieId = insertedMovie.id;
      }

      await db.none('INSERT INTO saved_to_users (username, movie_id) VALUES ($1, $2)', [username, movieId]);
      res.status(200).json({ message: "Movie saved successfully." });
  } catch (error) {
      console.error('Error saving movie:', error);
      res.status(500).json({ error: "An error occurred while saving the movie." });
  }
});

//DELETE SAVE MOVIE
app.post('/delete_save_movie', async (req, res) => {
  try {
      const { title } = req.body;
      const username = req.session.user.username;

      const movieId = await db.oneOrNone('SELECT id FROM movies WHERE title = $1', [title])
      //delete from saved_to_users
      await db.none('DELETE FROM saved_to_users WHERE username = $1 AND movie_id = $2', [username, movieId.id]);
      res.status(200).json({ message: "Movie deleted successfully. Refresh page." });
  } catch (error) {
      console.error('Error deleting movie:', error);
      res.status(500).json({ error: "An error occurred while deleting the movie." });
  }
});

//DELETE WATCHED MOVIE
app.post('/delete_watched_movie', async (req, res) => {
  try {
      const { title } = req.body;
      const username = req.session.user.username;

      const movieId = await db.oneOrNone('SELECT id FROM movies WHERE title = $1', [title])
      //delete from watched_to_users
      await db.none('DELETE FROM watched_to_users WHERE username = $1 AND movie_id = $2', [username, movieId.id]);
      res.status(200).json({ message: "Movie deleted successfully. Refresh page." });
  } catch (error) {
      console.error('Error deleting movie:', error);
      res.status(500).json({ error: "An error occurred while deleting the movie." });
  }
});




// WATCH MOVIE
app.post('/watch_movie', async (req, res) => {
  try {
      const { title, release_date, genre, vote_average, overview, image_url } = req.body;
      const username = req.session.user.username;

      const existingMovie = await db.oneOrNone('SELECT id FROM movies WHERE title = $1', [title]);

      let movieId;
      if (existingMovie) {
          movieId = existingMovie.id;
      } else {
          const insertedMovie = await db.one(
              'INSERT INTO movies (title, release_date, genre, vote_average, overview, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
              [title, release_date, genre, vote_average, overview, image_url]
          );
          movieId = insertedMovie.id;
      }

      await db.none('INSERT INTO watched_to_users (username, movie_id) VALUES ($1, $2)', [username, movieId]);

      res.status(200).json({ message: "Movie added to watched successfully." });
  } catch (error) {
      console.error('Error saving movie:', error);
      res.status(500).json({ error: "An error occurred while saving the movie." });
  }
});

app.get('/about_us', (req, res) => {
  res.render('pages/aboutUs', {user: req.session?.user} )
});

/* END ROUTES */

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
