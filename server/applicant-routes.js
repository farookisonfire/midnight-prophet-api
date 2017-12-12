const {
  validate,
  findOneApplicant
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

  return router;
}

module.exports = applicantRoutes;
