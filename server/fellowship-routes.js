const Router = require('express').Router;
const fetch = require('node-fetch');
const stripe = require('../utilities/stripe');
const handleEnrollmentFee = stripe.handleEnrollmentFee;
const {
  storeApplicant,
  incrementProgramEnrollment
} = require('../utilities/database');

const COLLECTION = process.env.COLLECTION_FELLOWSHIP || 'v1Fellowship';
const COLLECTION_PROGRAMS = process.env.COLLECTION_PROGRAMS || 'v3Programs';

const fellowshipRoutes = (db) => {
  const router = new Router();
  const dbCollection = db.collection(COLLECTION);
  const programsCollection = db.collection(COLLECTION_PROGRAMS);

  router.post('/', (req, res) => {   
    const token = req.body.token.id;
    const email = req.body.token.email;
    const {
      selectedProgramId = '',
      enrollmentFee = '',
      name = {},
    } = req.body;
    const description = 'Fellowship Enrollment Fee';
    const chargeMetadata = {
      firstName: name.fn,
      lastName: name.ln,
      email
    }
      // make the charge
      handleEnrollmentFee(token, email, description, enrollmentFee, chargeMetadata)
      .then((charge) => {
        const dbPayload = {
          status: 'confirmed',
          memberType: 'fellow',
          customerNumber: charge.customer,
          selectedProgramId,
          firstName: name.fn,
          lastName: name.ln,
        }

        return storeApplicant(dbCollection, dbPayload);
      })
      .then(() => incrementProgramEnrollment(selectedProgramId, programsCollection))
      // TODO: move applicant from accepted to confirmed mailchimp list.
      .then(() => {
        console.log('Fellow stored, and payment success.')
        return res.status(200).json({'payment':'success'})
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).send('Unable to update applicant to confirmed status.')
      })
  })

  return router;
}

module.exports = fellowshipRoutes;
