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
    const token = req.body.id;
    const email = req.body.email;
    const description = 'Enrollment Fee';
    const metadata = req.body.card;
    const isValidId = validate.test(id);

    if (isValidId) {
      // make the charge
      handleEnrollmentFee(token, email, description, metadata)
      .then((charge) => {
        const dbPayload = {
          status: 'confirmed',
          customerNumber: charge.customer,
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
