const Router = require('express').Router;
const moment = require('moment');
const stripe = require('../utilities/stripe');
const database = require('../utilities/database');

const { chargeCustomer } = stripe;
const {
  findOneApplicant,
  findOneProgram,
  validate,
  updateApplicant,
} = database;

const COLLECTION = process.env.COLLECTION || 'v5Collection';
const COLLECTION_PROGRAMS = process.env.COLLECTION_PROGRAMS || 'v1Programs';
const COLLECTION_FELLOWSHIP = process.env.COLLECTION_FELLOWSHIP || 'v1Fellowship';

const checkQualifyPromotion = (promotionDeadline) => {
  return moment(promotionDeadline).isBefore(moment());
}

const programFeeRoutes = (db) => {
  const router = new Router();
  const applicantCollection = db.collection(COLLECTION);
  const programsCollection = db.collection(COLLECTION_PROGRAMS);
  const fellowshipCollection = db.collection(COLLECTION_FELLOWSHIP);
  
  router.get('/:id/:fellow', (req, res) => {
    const dbid = req.params.id || '';
    const fellow = req.params.fellow || false;
    const isValidId = validate.test(dbid);
    const applicantDetails = {};

      if (isValidId) {
        const collectionToUse = fellow === 'true'?
          fellowshipCollection :
          applicantCollection;
          
        findOneApplicant(dbid, collectionToUse)
          .then((applicant) => {
            if (!applicant) {
              throw new Error('No user associated to that id.');
            }
            const discount = applicant.discount ?
              applicant.discount :
              0;
            const firstName = applicant['First Name'] ?
              applicant['First Name'] :
              applicant.firstName;
            const programId = applicant.selectedProgramId ?
              applicant.selectedProgramId :
              '';
            const promotionDeadline = applicant.promotionDeadline ?
              applicant.promotionDeadline :
              '';
            
            applicantDetails.discount = discount;
            applicantDetails.firstName = firstName;
            applicantDetails.promotionDeadline = promotionDeadline;
            
            return programId
          })
          .then(programId => findOneProgram(programId, programsCollection))
          .then(programDetails => ({ programDetails, applicantDetails }))
          .then(result => res.status(200).send(result))
          .catch((err) => {
            console.log(err);
            res.status(500).send('Unable to find applicant and program')
          })
      }
  })

  // handle program fee payment - need to make distinction between firstYear and Fellow
  router.post('/:id', (req, res) => {
    const id = req.params.id || '';
    const programFee = req.body.enrollmentFee || '';
    const description = 'Program Fee Payment';
    const isValidId = validate.test(id);
    const dbPayload = { status: 'paid in full' };
    const fellow = req.body.fellow || '';

    if (isValidId) {
      const collectionToUse = fellow === 'true'?
          fellowshipCollection :
          applicantCollection;

      return findOneApplicant(id, collectionToUse)
        .then(applicant => {
          dbPayload.qualifyPromotion = checkQualifyPromotion(applicant.promotionDeadline)
          return applicant.customerNumber || '';
        })
        .then(customerNumber => chargeCustomer(customerNumber, programFee, description))
        .then(() => updateApplicant(collectionToUse, dbPayload, id))
        .then(() => res.status(200).json({payment:"program fee success"}))
        .catch((err) => {
          console.log(err);
          res.status(500).send('Program fee payment failed.')
        })
    }
    return res.status(500).json({msg: "Invalid user id"})
  })
  
  return router;
}

module.exports = programFeeRoutes;
