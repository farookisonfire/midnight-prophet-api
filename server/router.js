var Router = require('express').Router;
var fetch = require('node-fetch');
var mapAnswersToQuestions = require('../utilities/typeform');
var createSlackText = require('../utilities/slack');

const ObjectId = require('mongodb').ObjectID;

module.exports = function routes(db) {
  const router = new Router();
  const myCollection = db.collection('pulse');

  router.get('/', function(req,res) {
    myCollection.find().toArray((err,docs) => {
      if(err) return res.sendStatus(500);
      res.json(docs);
    });
  });

  router.post('/', function(req, res) {
    const questions = req.body.form_response.definition.fields;
    const answers = req.body.form_response.answers;
    const formResponse = mapAnswersToQuestions(questions, answers);

    myCollection.insert(formResponse, (err, inserted) => {
      if (err) { return console.log(err); }
      console.log('inserted', inserted);
    });

    fetch('https://hooks.slack.com/services/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', { 
      method: 'POST',
      headers: {"Content-Type": "application/json"},
      body: createSlackText(formResponse)
     })
     .then(response => {
       if (!response.ok) { throw Error(response.statusText); }
       console.log('ok')
     })
     .catch(err => console.log(err));  

     res.status(200).json(req.body);
  });

  router.put('/:id/:status', function(req,res) {
    const id = req.params.id;
    const status = req.params.status
    myCollection.update(
      {_id: ObjectId(id)}, 
      {$set:{status: status}}, 
      (err, result) => {
        if (err) { return console.log(err); }
        console.log('update successful');
        console.log('~~~~~~~status~~~~~~', result);
        res.status(200).json(result);
    });
  });

  return router;
};