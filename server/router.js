var Router = require('express').Router;
var fetch = require('node-fetch');
var mapAnswersToQuestions = require('../utilities/typeform');
var createSlackText = require('../utilities/slack');

const ObjectId = require('mongodb').ObjectID;
const COLLECTION = process.env.COLLECTION || 'v2Collection';
const lists = {
  test: 'b5972e3719',
  denied: 'b5605e65e2',
  secondaryHealth: 'e5b5eaa47c',
  secondaryEducation: '6d961a792a',
  secondaryImpact: '5c163c3011',
};

module.exports = function routes(db) {
  const router = new Router();
  const myCollection = db.collection(COLLECTION);

  // GET LIST OF APPLICANTS
  router.get('/', function(req,res) {
    myCollection.find().toArray((err, docs) => {
      if(err) return res.status(500).send('Unable to find docs.');
      res.status(200).json(docs);
    });
  });

  // APPLICANT SUBMITS PART 1 APP (WEBHOOK)
  router.post('/', function(req, res) {
    const questions = req.body.form_response.definition.fields;
    const answers = req.body.form_response.answers;
    const status = 'applied';
    const formResponse = mapAnswersToQuestions(questions, answers, status);

    storeApplicant(myCollection, formResponse)

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

function storeApplicant(collection, formResponse) {
  return new Promise((resolve, reject) => {
    collection.insert(formResponse, (err, inserted) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      resolve(inserted);
    })
  })
}