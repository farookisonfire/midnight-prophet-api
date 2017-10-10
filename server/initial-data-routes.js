const Router = require('express').Router;

const COLLECTION = process.env.COLLECTION || 'v5Collection';
const COLLECTION_PROGRAMS = process.env.COLLECTION_PROGRAMS || 'v1Programs';

const initialDataRoutes = (db) => {
  console.log('GET initial data route hit');
  const router = new Router();
  const applicantCollection = db.collection(COLLECTION);
  const programsCollection = db.collection(COLLECTION_PROGRAMS);

  router.get('/', (req, res) => {
    const data = {};
    applicantCollection.find().toArray()
      .then(applicants => data.applicants = applicants)
      .then(() => programsCollection.find().toArray())
      .then(programs => data.programs = programs)
      .then(() => res.status(200).json({data}))
      .catch((err) => {
        console.log(err);
        return res.status(500).send('Unable to get initial data');
      })
    })

  return router;
}

module.exports = initialDataRoutes;
