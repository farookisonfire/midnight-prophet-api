const Router = require('express').Router;
const fetch = require('node-fetch');
const handleEnrollmentFee = require('../utilities/stripe');
const database = require('../utilities/database');

const COLLECTION = process.env.COLLECTION_FELLOWSHIP || 'v1Fellowship';
const storeApplicant = database.storeApplicant;
const validate = database.validate;

const fellowshipRoutes = (db) => {
  const router = new Router();
  const dbCollection = db.collection(COLLECTION);

  router.post('/', (req, res) => {   
    const token = req.body.token.id;
    const email = req.body.token.email;
    const {
      selectedProgramId = '',
      enrollmentFee = '',
      name = {},
    } = req.body;
    const description = 'Fellowship Enrollment Fee';

      // make the charge
      handleEnrollmentFee(token, email, description, enrollmentFee)
      .then((charge) => {
        const dbPayload = {
          status: 'confirmed',
          customerNumber: charge.customer,
          selectedProgramId,
          firstName: name.fn,
          lastName: name.ln,
        }

        return storeApplicant(dbCollection, dbPayload);
      })
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
