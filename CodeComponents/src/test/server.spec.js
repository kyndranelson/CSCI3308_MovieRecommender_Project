// Imports the index.js file to be tested.
const server = require('../index'); //TO-DO Make sure the path to your index.js is correctly added
// Importing libraries

// Chai HTTP provides an interface for live integration testing of the API's.
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });

  // Positive login
  it('positive : /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({ username: "validUsername", password: "validPassword" })
      .end((err, res) => {
        const finalUrl = res.redirects[res.redirects.length - 1]; 
        expect(finalUrl.endsWith('/discover')).to.be.true; 
  
        done();
      });
  });
  
  // Negative login
  it('Negative : /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({ username: "invalidUsername", password: "invalidPassword" })
      .end((err, res) => {
        const finalUrl = res.redirects[res.redirects.length - 1]; 
        expect(finalUrl.endsWith('/login') || finalUrl.endsWith('/register')).to.be.true; 
  
        done();
      });
  });

  // Positive: Successful registration
  it('Positive : /register. Successful registration', done => {
    chai
      .request(server)
      .post('/register')
      .send({ username: "newUser", password: "newPassword" })
      .end((err, res) => {
        expect(err).to.be.null;
        const finalUrl = res.redirects[res.redirects.length - 1];
        expect(finalUrl.endsWith('/login')).to.be.true;
        done();
      });
  });

  // Negative: Attempting to register with an existing username
  it('Negative : /register. Register with existing username', done => {
    chai
      .request(server)
      .post('/register')
      .send({ username: "validUsername", password: "password" })
      .end((err, res) => {
        expect(err).to.be.null;
        const finalUrl = res.redirects[res.redirects.length - 1];
        expect(finalUrl.endsWith('/register')).to.be.true;
        done();
      });
  });
});