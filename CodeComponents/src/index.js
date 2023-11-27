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
  res.redirect('/discover')
});
// Discover route
app.get('/discover', async (req, res) => {
  try {
    const tmdbEndpoint = 'https://api.themoviedb.org/3/discover/movie';
    const params = {
      api_key: process.env.API_KEY,
      language: 'en-US',
      sort_by: 'popularity.desc',
      page: 1,
    };

    const response = await axios.get(tmdbEndpoint, { params });


    const topMovies = response.data.results.slice(0, 10); // Adjust the number of movies as needed
    res.render('pages/discover', { topMovies });
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

/* END ROUTES */

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');