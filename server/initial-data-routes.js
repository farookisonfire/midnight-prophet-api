const Router = require('express').Router;

const COLLECTION = process.env.COLLECTION || 'v5Collection';
const COLLECTION_PROGRAMS = process.env.COLLECTION_PROGRAMS || 'v3Programs';
const COLLECTION_FELLOWSHIP = process.env.COLLECTION_FELLOWSHIP || 'v1Fellowship';

const initialDataRoutes = (db) => {
  const router = new Router();
  const applicantCollection = db.collection(COLLECTION);
  const programsCollection = db.collection(COLLECTION_PROGRAMS);
  const fellowsCollection = db.collection(COLLECTION_FELLOWSHIP);

  router.get('/', (req, res) => {
    const data = {};
    applicantCollection.find().toArray()
      .then(applicants => data.applicants = applicants)
      .then(() => programsCollection.find().toArray())
      .then(programs => data.programs = programs)
      .then(() => fellowsCollection.find().toArray())
      .then(fellows => data.fellows = fellows)
      .then(() => res.status(200).json({data}))
      .catch((err) => {
        console.log(err);
        return res.status(500).send('Unable to get initial data');
      })
    })

    router.get('/programs', (req, res) => {
      programsCollection.find().toArray()
      .then(programs => res.status(200).json(programs))
      .catch((err) => {
        console.log(err);
        return res.status(500).send('Unable to get initial data');
      })
    })

  return router;
}

module.exports = initialDataRoutes;
