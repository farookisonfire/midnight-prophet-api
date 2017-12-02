const Router = require('express').Router;
const fetch = require('node-fetch');
const mapAnswersToQuestions = require('../utilities/typeform');
const { updateSlack } = require('../utilities/slack');
const moment = require('moment');
const database = require('../utilities/database');
const mailchimp = require('../utilities/mailchimp');
const utils = require('../utilities/utils');
const {
  sendTextMessage,
  sendManyTextMessages,
  userSubmitAppMsg,
 } = require('../utilities/twilio');

const COLLECTION = process.env.COLLECTION || 'v6Collection';
const storeApplicant = database.storeApplicant;
const validate = database.validate;
const updateApplicant = database.updateApplicant;
const updateManyApplicants = database.updateManyApplicants;

const resolveMailClientPayload = mailchimp.resolveMailClientPayload;
const resolveListId = mailchimp.resolveListId;
const addApplicantsToMailList = mailchimp.addApplicantsToMailList;

const splitApplicantName = utils.splitApplicantName;

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
    const applicantFirstName = formResponse['First Name']
    const applicantPhone = formResponse['Mobile Phone Number'];
    const messageToSend = userSubmitAppMsg(applicantFirstName);

    storeApplicant(myCollection, formResponse)
    .then(() => sendTextMessage(messageToSend, applicantPhone))
    .then(() => res.status(200).send('Applicant data added to DB. Slack Notified.'))
    .then(updateSlack(formResponse))
    .catch((err) => {
      console.log(err);
      return res.status(500).send(err)
    });
  });

////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
  // APPLICANT PROMOTED TO TIER 2 or 3

  router.put('/', function(req,res) {
    const {
      selectedApplicants = [],
      program = '',
      status = '',
    } = req.body;

    const actionDate = moment().format('YYYY-MM-DD'); // When the user was promoted / accepted
    const threeDayDeadline = moment().add(3, 'days').format('YYYY-MM-DD'); // Deadline for submitting secondary or enrollment fee
    const selectedApplicantsToUse = splitApplicantName(selectedApplicants);
    const selectedApplicantIds = selectedApplicantsToUse.map(applicant => applicant.id);

    const listId = resolveListId(status, program);
    const mailChimpPayload = resolveMailClientPayload(selectedApplicantsToUse, listId, program, threeDayDeadline);

    let dbPayload;
    if (status === 'secondary') {
      dbPayload = {
        status,
        secondary: program,
        secondaryDate: actionDate,
        secondaryDeadline: threeDayDeadline,
      }
    } else if (status === 'accepted') {
      dbPayload = {
        status,
        acceptedTo: program,
        acceptedDate: actionDate,
        enrollmentFeeDeadline: threeDayDeadline,
      }
    } else if (status) {
      dbPayload = {status}
    }
    
    if (status === 'removed') {
      return updateManyApplicants(selectedApplicantIds, myCollection, dbPayload)
        .then(() => {
          console.log('Applicants status set to REMOVED');
          return res.status(200).send('Applicants added to db and mail list.');
        })
        .catch((err) => console.log('caught after updateApplicant and addToMailList', err));
    }

    addApplicantsToMailList(mailChimpPayload)
      .then(() => updateManyApplicants(selectedApplicantIds, myCollection, dbPayload))
      .then(() => sendManyTextMessages(selectedApplicantsToUse, status))
      .then(() => {
        console.log('Applicants added to DB and MailList');
        return res.status(200).send('Applicants added to db and mail list.');
      })
    //TODO: inform the client that the update was unsuccessfuls
      .catch((err) => console.log('caught after updateApplicant and addToMailList and sendManyTextMessages', err));
  });

////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
   // APPLICANT SUBMITS PART 2 APP (WEBHOOK)

  router.post('/secondary/:program', (req, res) => {
    const secondaryProgram = req.params.program || '';
    const { form_response = {} } = req.body;
    const {
      definition = {},
      answers = [],
      hidden = {},
      submitted_at = moment().format('YYYY-MM-DD'),
    } = form_response;

    const questions = definition.fields || [];
    const id = hidden.dbid || '';
    const status = 'secondary';
    const submitDate = moment.utc(submitted_at).format('YYYY-MM-DD');

    // validate the database id
    const isValidId = validate.test(id)

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
        .then(() => {
          console.log('DB tier 2 update is successful')
          return res.status(200).send('Applicant update with secondary data successful.')
        })
        .catch(err => {
          console.log('catch', err)
          res.status(500).send('Error, unable to update applicant with secondary.')
        });

    } else {
      res.status(500).send('Invalid UserId');
    }
  });

  ////////////////////////////////////////////////////////////////////////////////////////////////////////
   // APPLICANT WITHDRAW
  router.post('/withdraw', (req, res) => {
    const { form_response = {} } = req.body;
    const {
      definition = {},
      answers = [],
      hidden = {},
    } = form_response;
    const id = hidden.dbid || '';
    const questions = definition.fields || [];
    const isValidId = validate.test(id)

    const typeformPayload = { questions, answers };
    const formResponse = mapAnswersToQuestions(typeformPayload);
    const applicantDecision = formResponse['Please select the option that applies to you'];

    let status;
    const deferWithdrawOn = moment().format('YYYY-MM-DD');

    if (applicantDecision && applicantDecision === 'Withdraw my enrollment.') {
      status = 'confirmed-withdraw';
    } else if (applicantDecision && applicantDecision === 'Defer my enrollment.') {
      status = 'confirmed-defer'
    } else {
      status = 'withdrawn';
    }

    if (isValidId) {
      const dbPayload = { status, deferWithdrawOn };
      updateApplicant(myCollection, dbPayload, id)
      .then(() => res.status(200).send('Ok'))
      .catch((err) => {
        console.log(err);
        res.status(500).send('Unable to withdraw applicant.');
      })
    } else {
      res.status(500).send('Invalid Id. Unable to withdraw applicant.')
    }
  })

  router.post('/defer-enroll', (req, res) => {
    const { form_response = {} } = req.body;
    const {
      definition = {},
      answers = [],
      submitted_at = moment().format('MM-DD-YYYY'),
    } = form_response;

    const refcode = 'defer-enroll';
    const questions = definition.fields || [];
    const status = 'defer-enroll';
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
    .catch((err) => {
      console.log(err);
      return res.status(500).send(err)
    });
  })

  return router;
};
