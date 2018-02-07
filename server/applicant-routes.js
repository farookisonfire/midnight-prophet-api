const {
  validate,
  findOneApplicant,
  findOneApplicantEmail,
  updateApplicant
} = require('../utilities/database');

const Router = require('express').Router;
const COLLECTION_APPLICANTS = process.env.COLLECTION || 'v5Collection';

const applicantRoutes = (db) => {
  const router = new Router();
  const applicantCollection = db.collection(COLLECTION_APPLICANTS);

  router.get('/:id', (req, res) => {
    const dbid = req.params.id || '';
    const isValidId = validate.test(dbid);

    if (isValidId) {
      return findOneApplicant(dbid, applicantCollection)
        .then(applicant => res.status(200).send(applicant))
        .catch((err) => {
          console.log(err);
          return res.status(500).send('Unable to get applicant')
        });
    } else {
      return res.status(500).json({msg: "Invalid user id"});
    }
  })

  router.get('/email/:email', (req, res) => {
    const applicantEmail = req.params.email || '';
    console.log(`/email/${applicantEmail}`);

    return findOneApplicantEmail(applicantEmail, applicantCollection)
      .then(document => {
        if (!document) throw new Error('GET /email/:email - applicant not found');
        const applicant = {};
        applicant.id = document._id;
        applicant.firstName = document['First Name'];
        applicant.lastName = document['Last Name'];
        applicant.status = document.status;
        applicant.email = document['Email'];
        applicant.secondary = document.secondary || '';
        applicant.selectedProgramId = document.selectedProgramId || '';
        applicant.acceptedTo = document.acceptedTo || '';
        return res.status(200).send(applicant)
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).send('Unable to get applicant')
      });
  })

  router.put('/', (req, res) => {
    console.log('PUT /applicant/api update payload -->', req.body);
    const {
      firstName,
      lastName,
      status,
      email,
      secondary,
      selectedProgramId,
      acceptedTo,
      id
    } = req.body;

    const resolvedProgramId = status === 'confirmed' ?
      selectedProgramId :
      '';

    const dbPayload = {
      ["First Name"]: firstName,
      ["Last Name"]: lastName,
      ["Email"]: email,
      status,
      secondary,
      selectedProgramId: resolvedProgramId,
      acceptedTo
    };

    return updateApplicant(applicantCollection, dbPayload, id)
      .then(() => res.status(200).json({status: 'update successful'}))
      .catch((err) => {
        console.log('Error updating applicant', err);
        res.status(500).json({status: 'Failed to update applicant'});
      })
  })

  return router;
}

module.exports = applicantRoutes;
