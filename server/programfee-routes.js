const Router = require('express').Router;

const programFeeRoutes = () => {
  const router = new Router();
  
  router.get('/:id', (req, res) => {
    const dbid = req.params.id || '';
    console.log('dbid', dbid);

    // hit the applicants collection to get applicant's programId, and discounts

    // use the programId to get the programDetails object mocked below



    const programDetails = {
      id: 'health-2-july20-august10',
      type: 'Health Innovation',
      typeId: 'healthInnovation',
      length: '2 week',
      lengthId: 'twoWeek',
      date: 'July 20 - August 10',
      enrolled: 0,
      confirmed: 0,
    }

    const applicantDetails = {
      discount: 0,
    }

    res.status(200).send({programDetails, applicantDetails});
  })
  
  return router;
}

module.exports = programFeeRoutes;
