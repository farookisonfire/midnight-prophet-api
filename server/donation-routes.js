var Router = require('express').Router;
var handleCharge = require('../utilities/donations');

function donationRoutes() {
  const router = new Router();
  
  router.post('/', handleCharge)

  return router;
}

module.exports = donationRoutes;
