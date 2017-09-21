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

function resolveMailClientPayload(email, firstName, lastName, id) {
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

function addToMailList(res, mailPayload, listId) {
  mailchimp.post({
    path: `lists/${listId}/members`,
    body: mailPayload,
  }, function(err, result){
    if (err) {
      console.log(err);
      return res.status(500).send('unable to add new list member.');
    }
    console.log('MAILCHIMP RESULT:', result);
    return res.status(200).send('User added to list successfully.');
  });
}

module.exports = {
  lists: lists,
  resolveMailClientPayload: resolveMailClientPayload,
  resolveListId: resolveListId,
  addToMailList: addToMailList,
}
