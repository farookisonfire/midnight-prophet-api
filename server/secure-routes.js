const Router = require('express').Router;
const fetch = require('node-fetch');
const moment = require('moment');
const stripe = require('../utilities/stripe');
const handleEnrollmentFee = stripe.handleEnrollmentFee;

const database = require('../utilities/database');
const COLLECTION = process.env.COLLECTION || 'v5Collection';
const findOneAndUpdateApplicant = database.findOneAndUpdateApplicant;
const validate = database.validate;

const mailchimp = require('../utilities/mailchimp');
const resolveMailClientPayloadOne = mailchimp.resolveMailClientPayloadOne;
const addApplicantToMailList = mailchimp.addApplicantToMailList;

const secureRoutes = (db) => {
  const router = new Router();
  const dbCollection = db.collection(COLLECTION);

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

    const listId = mailchimp.lists.confirmed;

    if (isValidId) {
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
        const applicantDetails = {
          firstName: value['First Name'],
          lastName: value['Last Name'],
          id: value['_id'],
          email: value['Email'],
        }
        const mailClientPayload = resolveMailClientPayloadOne(applicantDetails);
        return addApplicantToMailList(mailClientPayload, listId);
      })
      .then((result) => {
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
