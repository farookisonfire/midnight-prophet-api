const Router = require('express').Router;
const fetch = require('node-fetch');
const moment = require('moment');
const {
  sendTextMessage,
  userSubmitEnrollmentFeeMsg,
 } = require('../utilities/twilio');
const stripe = require('../utilities/stripe');
const handleEnrollmentFee = stripe.handleEnrollmentFee;

const database = require('../utilities/database');
const COLLECTION = process.env.COLLECTION || 'v5Collection';
const COLLECTION_PROGRAMS = process.env.COLLECTION_PROGRAMS || 'v3Programs';
const findOneAndUpdateApplicant = database.findOneAndUpdateApplicant;
const findOneProgram = database.findOneProgram;
const validate = database.validate;

const mailchimp = require('../utilities/mailchimp');
const resolveMailClientPayloadOne = mailchimp.resolveMailClientPayloadOne;
const addApplicantToMailList = mailchimp.addApplicantToMailList;
const resolveConfirmedListId = mailchimp.resolveConfirmedListId;

const secureRoutes = (db) => {
  const router = new Router();
  const dbCollection = db.collection(COLLECTION);
  const programsCollection = db.collection(COLLECTION_PROGRAMS);

  router.post('/:id', (req, res) => {    
    const id = req.params.id || '';
    const token = req.body.token.id;
    const email = req.body.token.email;
    const {
      selectedProgramId = '',
      enrollmentFee = '',
    } = req.body;
    const description = 'Enrollment Fee';
    const isValidId = validate.test(id);
    const promotionDeadline = moment().add(16, 'days').format('YYYY-MM-DD');
    const finalDeadline = moment().add(90, 'days').format('YYYY-MM-DD');

    if (isValidId) {
      const applicantDetails = {};
      // make the charge
      handleEnrollmentFee(token, email, description, enrollmentFee)
      .then((charge) => {
        const dbPayload = {
          status: 'confirmed',
          customerNumber: charge.customer,
          selectedProgramId,
          promotionDeadline,
          finalDeadline
        }
        return findOneAndUpdateApplicant(dbCollection, dbPayload, id);
      })
      // TODO: move applicant from accepted to confirmed mailchimp list.
      .then((result) => {
        const { value = {} } = result;
        applicantDetails.firstName = value['First Name'];
        applicantDetails.lastName = value['Last Name'];
        applicantDetails.id = value['_id'];
        applicantDetails.email = value['Email'];
        const applicantPhone = value['Mobile Phone Number'];
        const messageToSend = userSubmitEnrollmentFeeMsg(applicantDetails.firstName);
        return sendTextMessage(messageToSend, applicantPhone);
      })
      .then(() => findOneProgram(selectedProgramId, programsCollection))
      .then((programDetails) => {
        const { typeId = '' } = programDetails;
        const resolvedListId = resolveConfirmedListId(typeId);
        const mailClientPayload = resolveMailClientPayloadOne(applicantDetails);
        return addApplicantToMailList(mailClientPayload, resolvedListId);
      })
      .then(() => {
        console.log('CHARGE MADE, APPLICANT UPDATE, APPLICANT ADD MAIL LIST - SUCCESS')
        return res.status(200).json({'payment':'success'})
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).send('Unable to update applicant to confirmed status.')
      })
    } else {
      return res.status(500).send('Transaction rejected. The user ID is invalid.')
    }
  })

  return router;
}

module.exports = secureRoutes;
