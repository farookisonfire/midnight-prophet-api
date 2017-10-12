const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./router');
const donationRoutes = require('./donation-routes');
const secureRoutes = require('./secure-routes');
const fellowshipRoutes = require('./fellowship-routes');
const programFeeRoutes = require('./programfee-routes');
const initialDataRoutes = require('./initial-data-routes');
const smsRoutes = require('./sms-routes');

module.exports = function createApp(db) {
  const app = express();
  
  app.use(cors());
  app.use(bodyParser.json());
  app.use('/sms', bodyParser.urlencoded({ extended:false }), smsRoutes());
  app.use('/api/applicants', routes(db));
  app.use('/api/initial-data', initialDataRoutes(db));
  app.use('/donation', donationRoutes());
  app.use('/secure', secureRoutes(db));
  app.use('/fellowship', fellowshipRoutes(db));
  app.use('/confirm', programFeeRoutes(db));
  app.use((err, req, res, next) => {
    res.status(500).send("500 Internal server error");
  });

  return app;
};
