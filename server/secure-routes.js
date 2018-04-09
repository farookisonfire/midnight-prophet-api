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
  findOneAndUpdateApplicant,
  findOneAndAddProgramWaitlist
} = require('../utilities/database');
const {
  resolveMailClientPayloadOne,
  addApplicantToMailList,
  resolveConfirmedListId,
  readList,
  resolveCampaignListId,
  removeApplicantFromList
} = require('../utilities/mailchimp');

const COLLECTION = process.env.COLLECTION || 'v5Collection';
const COLLECTION_PROGRAMS = process.env.COLLECTION_PROGRAMS || 'v3Programs';

const secureRoutes = (db) => {
  const router = new Router();
  const applicantCollection = db.collection(COLLECTION);
  const programsCollection = db.collection(COLLECTION_PROGRAMS);
  
  router.post('/:id', (req, res) => {    
    const id = req.params.id || '';
    const token = req.body.token.id;
    const email = req.body.token.email;
    const {
      selectedProgramId = '',
      enrollmentFee = '',
      campaign = '',
    } = req.body;

    const chargeMetadata = {};
    chargeMetadata.receiptEmail = email;
    chargeMetadata.fee = enrollmentFee;

    const isValidId = validate.test(id);
    const enrollDate = moment().format('YYYY-MM-DD');
    const promotionDeadline = moment().add(10, 'days').format('YYYY-MM-DD');
    // const finalDeadline = moment().add(90, 'days').format('YYYY-MM-DD');
    const finalDeadline = '2018-05-14';

    if (isValidId) {
      const applicantDetails = {};

      if(campaign) { // if enrollment is from a payment campaign, remove applicant from the automation list.
        const campaignListId = resolveCampaignListId(campaign);
        readList(campaignListId)
          .then(listData => {
            const { members = [] } = listData;
            let targetMember = members.filter(member => member.merge_fields.DBID === id);
            targetMember = targetMember.length ? targetMember[0] : {};
            return targetMember.id || '';
          })
          .then(memberId => removeApplicantFromList(memberId, campaignListId))
          .catch(err => console.log('Unable to remove subscriber from campaign specific list', err));
      }

      findOneApplicant(id, applicantCollection)
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
      .then(() => handleEnrollmentFee(token, chargeMetadata))
      .then((charge) => {
        const dbPayload = {
          status: 'confirmed',
          customerNumber: charge.customer,
          selectedProgramId,
          promotionDeadline,
          finalDeadline,
          enrollDate
        }
        return updateApplicant(applicantCollection, dbPayload, id);
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

  router.put('/waitlist/:programId/:id', (req, res) => {
    const selectedProgramId = req.params.programId || '';
    const applicantId = req.params.id;
    const dbApplicantPayload = { status: 'waitlist', selectedProgramId };

    return findOneAndUpdateApplicant(applicantCollection, dbApplicantPayload, applicantId)
      .then((applicantData) => {
        const applicant = applicantData.value || {};
        return {
          firstName: applicant['First Name'],
          lastName: applicant['Last Name'],
          email: applicant['Email']
        }
      })
      .then(dbProgramPayload => 
        findOneAndAddProgramWaitlist(programsCollection, dbProgramPayload, selectedProgramId))
      .then(program => {
        return res.status(200).send('Applicant added to waitlist.');
      })
  });

  return router;
}

module.exports = secureRoutes;
