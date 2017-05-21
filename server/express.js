var express = require('express');
var bodyParser = require('body-parser');
var routes = require('./router');

module.exports = function createApp(db) {
  const app = express();
  
  app.use(bodyParser.json());
  app.use('/api/applicants', routes(db));
  app.use((err, req, res, next) => {
    res.status(500).send("500 Internal server error");
  });

  return app;
};
