const Router = require('express').Router;
const fetch = require('node-fetch');
const mapAnswersToQuestions = require('../utilities/typeform');
const updateSlack = require('../utilities/slack');
const ObjectId = require('mongodb').ObjectID;
const moment = require('moment');

const COLLECTION = process.env.COLLECTION || 'v3Collection';
const Mailchimp = require('mailchimp-api-v3');
const mailchimp = new Mailchimp(process.env.MAILCHIMP_KEY);

const lists = {
  test: 'b5972e3719',
  denied: 'b5605e65e2',
  secondaryHealth: 'e5b5eaa47c',
  secondaryServe: '6d961a792a',
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
    const { form_response = {} } = req.body;
    const {
      definition = {},
      answers = [],
      submitted_at = moment().format('MM-DD-YYYY'),
      hidden = {},
    } = form_response;

    const { refcode = '' } = hidden;
    const questions = definition.fields || [];
    const status = 'applied';
    const submitDate = moment.utc(submitted_at).format('MM-DD-YYYY');

    const typeformPayload = {
      refcode,
      submitDate,
      status,
      questions,
      answers,
    }

    const formResponse = mapAnswersToQuestions(typeformPayload);

    storeApplicant(myCollection, formResponse)
    .then(() => res.status(200).send('Applicant data added to DB. Slack Notified.'))
    .then(updateSlack(formResponse))
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
    const { form_response = {} } = req.body;
    const {
      definition = {},
      answers = [],
      hidden = {},
      submitted_at = moment().format('MM-DD-YYYY'),
    } = form_response;

    const questions = definition.fields || [];
    const id = hidden.dbid || '';
    const status = 'secondary';
    const submitDate = moment.utc(submitted_at).format('MM-DD-YYYY');

    // validate the database id
    const checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
    const isValidId = checkForHexRegExp.test(id);

    const typeformPayload = {
      submitDate,
      questions,
      answers,
      status,
      secondaryProgram
    }

    if (isValidId) {
      const formResponse = mapAnswersToQuestions(typeformPayload);
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
      case 'serve':
        return lists.secondaryServe;
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
