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
        expect(err).to.be.null;
        expect(res).to.redirectTo(/http:\/\/127\.0\.0\.1:\d+\/discover/);
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
        expect(res).to.not.redirect;
        done();
      });
  });  

  // Positive register
  it('Positive: /register', done => {
    chai
      .request(server)
      .post('/register')
      .send({ username: "newUsername", password: "newPassword" })
      .end((err, res) => {
        expect(err).to.be.null;
        done();
      });
  });

  // Negative register
  it('Negative: /register', done => {
    chai
      .request(server)
      .post('/register')
      .send({ password: "nousername" })
      .end((err, res) => {
        expect(res).to.not.redirect;
        done();
      });
  });
});