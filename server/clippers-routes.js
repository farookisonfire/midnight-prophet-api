const Router = require('express').Router;
const { handleClippersTicketPurchase } = require('../utilities/stripe');
const {
  notifySlack,
  slackNotificationTypes,
 } = require('../utilities/slack');
const { decrementSectionTickets } = require('../utilities/database');

const COLLECTION_CLIPPERS_SECTIONS = process.env.COLLECTION_CLIPPERS_SECTIONS || 'clippers_sections';

const clippersRoutes = (db) => {
  const router = new Router();
  const sectionsCollection = db.collection(COLLECTION_CLIPPERS_SECTIONS);

  router.get('/sections', (req, res) => {
    sectionsCollection.find().toArray((err, docs) => {
      if(err) return res.status(500).send('Unable to get clipper ticket sections.');
      res.status(200).json(docs);
    });
  });

  router.post('/purchase', (req, res) => {
    const token = req.body.token.id;
    const email = req.body.token.email;
    const name = req.body.token.card.name;
    const orderDetails = req.body.clipperOrder;
    orderDetails.name = name;
    orderDetails.email = email;

    return handleClippersTicketPurchase(token, orderDetails)
      .then(() => notifySlack(slackNotificationTypes.clippersTicket, orderDetails))
      .then(() => decrementSectionTickets(orderDetails.section, sectionsCollection, orderDetails.numTickets))
      .then(() => res.status(200).json({status:'charge successful'}))
      .catch((err) => {
        console.log('Clipper ticket charge unsuccessful', err)
        res.status(500).send('Clipper ticket charge unsuccessful');
      });
  })



//   router.put('/secondary', (req, res) => {
//   const {
//     selectedApplicants = [],
//     status = '',
//     program = ''
//   } = req.body;

//   const secondaryReminderSentDate = moment().format('YYYY-MM-DD');
//   const dbPayload = {secondaryReminderSentDate};

//   const selectedApplicantsToUse = splitApplicantName(selectedApplicants);
//   const selectedApplicantIds = selectedApplicantsToUse.map(applicant => applicant.id);
//   const listId = resolveListId(status, program);
//   const mailChimpPayload = resolveMailClientPayload(selectedApplicantsToUse, listId);

//   addApplicantsToMailList(mailChimpPayload)
//     .then(() => updateManyApplicants(selectedApplicantIds, applicantCollection, dbPayload))
//     .then(() => sendManyTextMessages(selectedApplicantsToUse, status))
//     .then(() => res.status(200).send('Applicant sent reminder secondary success.'))
//     .catch((err) => {
//       console.log('Error - send info fail. ', err);
//       res.status(500).send('Unable to send info.');
//     });
// })
  
  return router;
}

module.exports = clippersRoutes;
