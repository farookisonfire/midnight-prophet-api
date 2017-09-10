var Router = require('express').Router;
var fetch = require('node-fetch');
var mapAnswersToQuestions = require('../utilities/typeform');
var updateSlack = require('../utilities/slack');

const ObjectId = require('mongodb').ObjectID;
const COLLECTION = process.env.COLLECTION || 'v2Collection';

const Mailchimp = require('mailchimp-api-v3');
const mailchimp = new Mailchimp(process.env.MAILCHIMP_KEY || '23f25152f40bbd591f91a9852a2c33a4-us14');

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
    .then(updateSlack(formResponse))
    .then(() => res.status(200).send('Applicant data added to DB. Slack Notified.'))
    .catch((err) => res.status(500).send(err));
  });

  // APPLICAT IS PROMOTED TO SECONDARY OR DENIED
  router.put('/:id', function(req,res) {
    const {
      id = '',
      email = '',
      firstName = '',
      lastName = '',
      status = '',
      program = '',
    } = req.body;

    const dbPayload = program ?
      {status: status, secondary: program} :
      {status: status};

      console.log('DB PAYLOAD', dbPayload)

    const mailClientPayload = resolveMailClientPayload(email, firstName, lastName, id);
    const listId = resolveListId(status, program);
    
    updateApplicant(myCollection, dbPayload, id)
    //TODO: do not add record to db if the subsequent step - add to MailChimp fails. 
    //Also, inform the client that the update was unsuccessful s
      .then(() => addToMailList(res, mailClientPayload, listId))
      .catch((err) => console.log('caught after updateApplicant and addToMailList', err));
  });

   // APPLICANT SUBMITS PART 2 APP (WEBHOOK)
  router.post('/secondary/:program', (req, res) => {
    const secondaryProgram = req.params.program || '';
    const questions = req.body.form_response.definition.fields || [];
    const answers = req.body.form_response.answers || [];
    const id = req.body.form_response.hidden.dbid || '';
    const status = 'secondary';

    // validate the database id
    const checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
    const isValidId = checkForHexRegExp.test(id);

    console.log('THE ID', id)

    if (isValidId) {
      const formResponse = mapAnswersToQuestions(questions, answers, status, secondaryProgram);
    console.log('THE FORM RESPONSE', formResponse)
      updateApplicant(myCollection, formResponse, id)
        .then(() => res.status(200).send('Applicant update with secondary data successful.'))
        .catch(err => {
          console.log('catch', err)
          res.status(500).send('Error, unable to update applicant with secondary.')
        });

    } else {
      res.status(500).send('Invalid UserId');
    }
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

function updateApplicant(collection, dbPayload, id) {
  return new Promise((resolve, reject) => {
    collection.update(
      {_id: ObjectId(id)},
      {$set: dbPayload},
      (err, result) => {
        if (err) {
          console.log(err);
          reject();
        }
        resolve(result);
    })
  })
}

function resolveMailClientPayload(email, firstName, lastName, id) {
  const payload = {
    "email_address": email,
    "status": "subscribed",
    "merge_fields": {
      "FNAME": firstName,
      "LNAME": lastName,
      "DBID": id,
    }
  };
  return payload;
}

function resolveListId(status, program) {
  if (status === 'denied') {
    return lists.denied;
  }

  if (status === 'secondary' && program) {
    switch(program) {
      case 'healthInnovation':
        return lists.secondaryHealth;
      case 'education':
        return lists.secondaryEducation;
      case 'Impact':
        return lists.secondaryImpact;
      default:
        return;
    }
  }
  return;
}

function addToMailList(res, mailPayload, listId) {
  mailchimp.post({
    path: `lists/${listId}/members`,
    body: mailPayload,
  }, function(err, result){
    if (err) {
      console.log(err);
      return res.status(500).send('unable to add new list member.');
    }
    console.log('MAILCHIMP RESULT:', result);
    res.status(200).send('User added to list successfully.');
  });
}
