const Router = require('express').Router;
const fetch = require('node-fetch');
const mapAnswersToQuestions = require('../utilities/typeform');
const updateSlack = require('../utilities/slack');
const moment = require('moment');
const database = require('../utilities/database');
const mailchimp = require('../utilities/mailchimp');

const COLLECTION = process.env.COLLECTION || 'v4Collection';
const storeApplicant = database.storeApplicant;
const updateApplicant = database.updateApplicant;
const validate = database.validate;

const resolveMailClientPayload = mailchimp.resolveMailClientPayload;
const resolveListId = mailchimp.resolveListId;
const addToMailList = mailchimp.addToMailList;

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

  // APPLICANT PROMOTED TO TIER 2 or 3
  router.put('/:id', function(req,res) {
    const {
      id = '',
      email = '',
      firstName = '',
      lastName = '',
      status = '',
      program = '',
    } = req.body;

    let dbPayload;
    if (status === 'secondary') {
      dbPayload = {status, secondary: program}
    } else if (status) {
      dbPayload = {status}
    }

    const mailClientPayload = resolveMailClientPayload(email, firstName, lastName, id, program);
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
    const isValidId = validate.test.id

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
