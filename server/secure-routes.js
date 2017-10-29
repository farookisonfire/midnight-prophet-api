const Router = require('express').Router;
const fetch = require('node-fetch');
const moment = require('moment');
const { handleEnrollmentFee } = require('../utilities/stripe');
const {
  sendTextMessage,
  userSubmitEnrollmentFeeMsg,
 } = require('../utilities/twilio');
const {
  validate,
  findOneApplicant,
  findOneAndIncrementProgram,
  updateApplicant,
} = require('../utilities/database');
const {
  resolveMailClientPayloadOne,
  addApplicantToMailList,
  resolveConfirmedListId,
} = require('../utilities/mailchimp');

const COLLECTION = process.env.COLLECTION || 'v5Collection';
const COLLECTION_PROGRAMS = process.env.COLLECTION_PROGRAMS || 'v3Programs';

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
      const chargeMetadata = {};

      findOneApplicant(id, dbCollection)
      .then(applicant => {
        applicantDetails.firstName = applicant['First Name'];
        applicantDetails.lastName = applicant['Last Name'];
        applicantDetails.id = applicant['_id'];
        applicantDetails.email = applicant['Email'];
        applicantDetails.applicantPhone = applicant['Mobile Phone Number'];
        chargeMetadata.firstName = applicant['First Name'];
        chargeMetadata.lastName = applicant['Last Name'];
        chargeMetadata.email = applicant['Email'];
        chargeMetadata.applicantPhone = applicant['Mobile Phone Number'];
      })
      .then(() => handleEnrollmentFee(token, email, description, enrollmentFee, chargeMetadata))
      .then((charge) => {
        const dbPayload = {
          status: 'confirmed',
          customerNumber: charge.customer,
          selectedProgramId,
          promotionDeadline,
          finalDeadline
        }
        return updateApplicant(dbCollection, dbPayload, id);
      })
      // TODO: move applicant from accepted to confirmed mailchimp list.
      .then(() => {
        const messageToSend = userSubmitEnrollmentFeeMsg(applicantDetails.firstName);
        return sendTextMessage(messageToSend, applicantDetails.applicantPhone);
      })
      .then(() => findOneAndIncrementProgram(selectedProgramId, programsCollection))
      .then((programDetails) => {
        const { value = {} } = programDetails;
        const { typeId = '' } = value;
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
