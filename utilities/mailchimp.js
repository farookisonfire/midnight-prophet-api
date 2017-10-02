const Mailchimp = require('mailchimp-api-v3');
const mailchimp = new Mailchimp(process.env.MAILCHIMP_KEY);

const lists = {
  test: 'b5972e3719',
  denied: 'b5605e65e2',
  secondaryHealth: 'e5b5eaa47c',
  secondaryServe: '6d961a792a',
  secondaryImpact: '5c163c3011',
  accepted: '213226583d',
  confirmed: '2338599b06',
};

function resolveListId(status, program) {
  if (status === 'denied') {
    return lists.denied;
  }

  if (status === 'accepted') {
    return lists.accepted;
  }

  if (status === 'secondary' && program) {
    switch(program) {
      case 'healthInnovation':
        return lists.secondaryHealth;
      case 'serve':
        return lists.secondaryServe;
      case 'Impact':
        return lists.secondaryImpact;
      default:
        return;
    }
  }
  return;
}

function resolveMailClientPayloadOne(applicantDetails) {
  const {
    email = '',
    firstName = '',
    lastName = '',
    id = '',
  } = applicantDetails;

  const payload = {
    "email_address": email,
    "status": "subscribed",
    "merge_fields": {
      "FNAME": firstName,
      "LNAME": lastName,
      "DBID": id,
    }
  };
  return payload;
}

function addApplicantToMailList(mailPayload, listId) {
  return mailchimp.post({
    path: `lists/${listId}/members`,
    body: mailPayload,
  })
  .then(result => console.log('------------- Mailchimp Result --------------', result))
  .catch(err => console.log('addApplicantToMailList Error', err));
}

const addApplicantsToMailList = (mailPayload) => {
  return mailchimp.batch(mailPayload);
};

const resolveMailClientPayloadMany = ( selectedApplicants, listId, programTypeId ) => {
  return selectedApplicants.map((applicant) => {
    const {
      id,
      email,
      firstName,
      lastName,
    } = applicant;
    
    return {
      method: 'POST',
      path: `lists/${listId}/members`,
      body: {
      email_address:email, 
      status:"subscribed",
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
        DBID: id,
        PTYPE: programTypeId,
      }
    },
    }
  }) 
}

module.exports = {
  lists: lists,
  resolveMailClientPayloadOne: resolveMailClientPayloadOne,
  resolveMailClientPayload: resolveMailClientPayloadMany,
  resolveListId: resolveListId,
  addApplicantToMailList: addApplicantToMailList,
  addApplicantsToMailList: addApplicantsToMailList,
}
