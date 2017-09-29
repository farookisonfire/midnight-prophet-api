const ObjectId = require('mongodb').ObjectID;

function storeApplicant(collection, formResponse) {
  return new Promise((resolve, reject) => {
    collection.insert(formResponse, (err, inserted) => {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      resolve(inserted);
      return;
    })
  })
}

function updateApplicant(collection, dbPayload, id) {
  return new Promise((resolve, reject) => {
    collection.update(
      {_id: ObjectId(id)},
      {$set: dbPayload},
      (err, result) => {
        if (err) {
          console.log(err);
          reject();
          return;
        }
        resolve(result);
        return;
    })
  })
}

function updateManyApplicants(applicantIds, collection, dbPayload) {
  const mongoIds = applicantIds.map(id => ObjectId(id));
  return new Promise((resolve, reject) => {
    collection.updateMany(
      { _id: {$in: mongoIds} },
      {$set: dbPayload},
      (err, result) => {
        if (err) {
          console.log(err);
          reject();
          return;
        }
        resolve(result);
        return;
    })
  })
}

const checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = {
  storeApplicant: storeApplicant,
  updateApplicant: updateApplicant,
  validate: checkForHexRegExp,
  updateManyApplicants: updateManyApplicants,
}
