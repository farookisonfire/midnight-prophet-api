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

const updateApplicant = (collection, dbPayload, id) => {
  return collection.updateOne(
    {_id: ObjectId(id)},
    {$set: dbPayload}
  );
}

function findOneAndUpdateApplicant(collection, dbPayload, id) {
  return new Promise((resolve, reject) => {
    collection.findOneAndUpdate(
      {_id: ObjectId(id)},
      {$set: dbPayload},
      {returnOriginal: false},
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

const findOneApplicant = (id, collection) => {
  return collection.findOne({_id: ObjectId(id)});
}

function findOneProgram(programId, collection) {
  return new Promise((resolve, reject) => {
    collection.findOne({id:programId})
    .then((doc) => resolve(doc))
    .catch((err) => reject(err));
  })
}

const findOneAndIncrementProgram = (programId, collection ) => {
  return collection.findOneAndUpdate(
    {id:programId},
    {$inc: {enrolled: 1}},
    {returnOriginal: false}
  );
};

const incrementProgramEnrollment = (programId, collection) => {
  return collection.updateOne(
    {id: programId},
    {$inc: {enrolled: 1}}
  );
}

const incrementProgramConfirmed = (programId, collection) => {
  return collection.updateOne(
    {id: programId},
    {$inc: {enrolled: -1, confirmed: 1}}
  );
}

const checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = {
  storeApplicant: storeApplicant,
  updateApplicant: updateApplicant,
  validate: checkForHexRegExp,
  updateManyApplicants: updateManyApplicants,
  findOneAndUpdateApplicant: findOneAndUpdateApplicant,
  findOneApplicant: findOneApplicant,
  findOneProgram: findOneProgram,
  findOneAndIncrementProgram,
  incrementProgramEnrollment,
  incrementProgramConfirmed
}
