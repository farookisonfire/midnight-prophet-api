const Router = require('express').Router;
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

const programFeeRoutes = (db) => {
  const router = new Router();
  const applicantCollection = db.collection(COLLECTION);
  const programsCollection = db.collection(COLLECTION_PROGRAMS);
  const fellowshipCollection = db.collection(COLLECTION_FELLOWSHIP);
  
  router.get('/:id', (req, res) => {
    const dbid = req.params.id || '';
    const isValidId = validate.test(dbid);
      if (isValidId) {
        findOneApplicant(dbid, applicantCollection)
          .then((applicant) => {
            const discount = applicant.discount ? applicant.discount : '';
            const firstName = applicant['First Name'] ? applicant['First Name'] : '';
            // const promotionDeadline =
            const programId = applicant.selectedProgramId ?
              applicant.selectedProgramId :
              '';

            return findOneProgram(programId, programsCollection)
              .then((programDetails) => {
                const applicantDetails = {
                  discount,
                  firstName
                };
                return { programDetails, applicantDetails }
              })
          })
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

    if (isValidId) {
      const collectionToUse = applicantCollection;
      return findOneApplicant(id, collectionToUse)
        .then(applicant => applicant.customerNumber || '')
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
