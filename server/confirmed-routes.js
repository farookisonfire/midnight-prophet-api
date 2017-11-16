const Router = require('express').Router;
const moment = require('moment');
const { splitApplicantName } = require('../utilities/utils');
const { updateManyApplicants } = require('../utilities/database');
const { sendManyTextMessages } = require('../utilities/twilio');
const { 
  resolveListId,
  resolveMailClientPayload,
  addApplicantsToMailList
} = require('../utilities/mailchimp.js');

const COLLECTION_APPLICANTS = process.env.COLLECTION || 'v6Collection';

const confirmedRoutes = (db) => {
  const router = new Router();
  const applicantCollection = db.collection(COLLECTION_APPLICANTS);

  router.put('/', (req, res) => {
    const {
      selectedApplicants = [],
      program = '',
      status = '',
    } = req.body;

  const sentDeferWithdrawEmail = moment().format('YYYY-MM-DD');
  const dbPayload = {sentDeferWithdrawEmail};

  const selectedApplicantsToUse = splitApplicantName(selectedApplicants);
  const selectedApplicantIds = selectedApplicantsToUse.map(applicant => applicant.id);
  const listId = resolveListId(status, program);
  const mailChimpPayload = resolveMailClientPayload(selectedApplicantsToUse, listId, program);

  addApplicantsToMailList(mailChimpPayload)
    .then(() => updateManyApplicants(selectedApplicantIds, applicantCollection, dbPayload))
    .then(() => sendManyTextMessages(selectedApplicantsToUse, status))
    .then(() => res.status(200).send('Applicant sent defer withdraw success.'))
    .catch((err) => {
      console.log('Error - send info fail. ', err);
      res.status(500).send('Unable to send info.');
    });
  })
  return router;
}

module.exports = confirmedRoutes;
