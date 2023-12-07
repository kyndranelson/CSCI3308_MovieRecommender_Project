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
  res.render('partials/menu', {
    user: req.user
  });
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
    const totalPages= 2; // Number of pages to fetch, adjust as needed

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
    

    res.render('pages/discover', { popMovies, topMovies });
  } catch (error) {
    console.error('Error fetching data from TMDb:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/logout', (req, res) => {
  res.render('pages/logout',)
});
app.get('/login', (req, res) => {
  // Handle the login page logic here or render a login page if needed
  res.render('pages/login',)
});
app.get('/register', (req, res) => {
  // Use the res.redirect method to redirect the user to the /login endpoint
  res.render('pages/register',)
});
// TEST ROUTE
app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
});

app.get('/saved_movies', async (req, res) => {
  try {
    console.log(req.session.user); 
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

    console.log(savedMovies)

    // Render the discover page with saved movies
    res.render('pages/savedMovies', { savedMovies });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/watched_movies', async (req, res) => {
  try {
    console.log(req.session.user); 
    if (!req.session.user) {
      // If user is not logged in, redirect to the login page
      return res.redirect('/login');
    }
    const username = req.session.user.username;
    // TODO: Query the database for saved movies
    const watchedMovies = await db.any(
      "SELECT sm.* FROM movies sm JOIN watched_to_users stu ON sm.id = stu.movie_id WHERE stu.username = $1",
      [username]
    );

    console.log(watchedMovies)

    // Render the discover page with saved movies
    res.render('pages/watchedMovies', { watchedMovies });
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

        if (!user) {
            res.redirect('/register');
            return;
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            res.render('pages/login', { error: 'Invalid username or password' });
            return;
        }

        req.session.user = user;
        req.session.save();

        res.redirect('/discover');
    } catch (err) {
        res.render('pages/login', { error: 'Error when contacting database' });
    }
});

//REGISTER ROUTE
app.post('/register', async (req, res) => {
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

    res.render("pages/login");
  }) 
    .catch((err) => {
      res.render("pages/register", {
        error: true,
        message: err.message,
      });
    });
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

      res.status(200).json({ message: "Movie saved successfully." });
  } catch (error) {
      console.error('Error saving movie:', error);
      res.status(500).json({ error: "An error occurred while saving the movie." });
  }
});

/* END ROUTES */

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');