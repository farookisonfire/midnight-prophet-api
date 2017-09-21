const ObjectId = require('mongodb').ObjectID;

function storeApplicant(collection, formResponse) {
  return new Promise((resolve, reject) => {
    collection.insert(formResponse, (err, inserted) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      resolve(inserted);
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
        }
        resolve(result);
    })
  })
}

const checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = {
  storeApplicant: storeApplicant,
  updateApplicant: updateApplicant,
  validate: checkForHexRegExp,
}
