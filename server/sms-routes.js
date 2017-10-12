const Router = require('express').Router;
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const { defaultReplyMsg } = require('../utilities/twilio');

const smsRoutes = () => {
  const router = new Router();
  router.post('/', (req, res) => {
    const twiml = new MessagingResponse();
    twiml.message(defaultReplyMsg);
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
})

  return router;
}

module.exports = smsRoutes;
