const Router = require('express').Router;
const fetch = require('node-fetch');
const handleEnrollmentFee = require('../utilities/stripe');
const database = require('../utilities/database');

const COLLECTION = process.env.COLLECTION || 'v3Collection';
const updateApplicant = database.updateApplicant;
const validate = database.validate;

const secureRoutes = (db) => {
  const router = new Router();
  const dbCollection = db.collection(COLLECTION);

  router.post('/:id', (req, res) => {    
    const id = req.params.id || '';
    const token = req.body.token.id;
    const email = req.body.token.email;
    const description = 'Enrollment Fee';
    const isValidId = validate.test(id);
    const selectedProgramId = req.body.selectedProgramId

    // in future create a enrollment object in mongo. Not sure how the fact that I dont have applicant entries nested within an object is going to affect things.

    if (isValidId) {
      // make the charge
      handleEnrollmentFee(token, email, description)
      .then((charge) => {
        const dbPayload = {
          status: 'confirmed',
          customerNumber: charge.customer,
          selectedProgramId
        }
        // set applicant status to "confirmed"
        return updateApplicant(dbCollection, dbPayload, id);
      })
      // TODO: move applicant from accepted to confirmed mailchimp list.
      .then(() => res.status(200).json({'payment':'success'}))
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
