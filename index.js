/* eslint-disable no-console */
var MongoClient = require('mongodb').MongoClient;
var createApp = require('./server/express');

const MONGODB_URI = MONGODB_URI || 'mongodb://localhost:27017/ohs';
const PORT = process.env.PORT || 1337;

MongoClient.connect(MONGODB_URI, (err, db) => {
  if(err) {
    console.error(err);
    process.exit(1);  
  }

  const app = createApp(db);
  app.listen(PORT, () => {
    console.log('listening on port: ' + PORT);
  });
});
