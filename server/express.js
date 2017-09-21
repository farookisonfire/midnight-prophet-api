const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./router');
const donationRoutes = require('./donation-routes');
const secureRoutes = require('./secure-routes');

module.exports = function createApp(db) {
  const app = express();
  
  app.use(cors());
  app.use(bodyParser.json());
  app.use('/api/applicants', routes(db));
  app.use('/donation', donationRoutes());
  app.use('/secure', secureRoutes(db));
  app.use((err, req, res, next) => {
    res.status(500).send("500 Internal server error");
  });

  return app;
};
