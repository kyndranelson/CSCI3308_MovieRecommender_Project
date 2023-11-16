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
/* END EXPRESS CONFIG */

/* START ROUTES */
app.get('/', (req, res) => {
  // Use the res.redirect method to redirect the user to the /login endpoint
  res.render('/discover')
});
// Discover route
app.get('/discover', async (req, res) => {
  try {
    // Fetch top-rated movies from TMDb using API key from .env
    const apiKey = process.env.API_KEY;
    const response = await axios.get(`https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}`);
    
    // Extract relevant data
    const topMovies = response.data.results || [];

    // Render the discover page with top movies
    res.render('pages/discover', { topMovies });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/saved_movies', async (req, res) => {
  try {
    // TODO: Query the database for saved movies
    const savedMovies = [];

    // Render the discover page with saved movies
    res.render('pages/savedMovies', { savedMovies });
  } catch (error) {
    console.error(error);
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

/* END ROUTES */

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');