const Mailchimp = require('mailchimp-api-v3');
const mailchimp = new Mailchimp(process.env.MAILCHIMP_KEY);

const lists = {
  test: 'b5972e3719',
  denied: 'b5605e65e2',
  secondaryHealth: 'e5b5eaa47c',
  secondaryServe: '6d961a792a',
  secondaryEducation: '30309beba4',
  secondaryYouth: '892191e664',
  accepted: '213226583d',
  confirmed: '2338599b06',
  confirmedHealth: '2474f944d3',
  confirmedYouth: '54e14261f2',
  confirmedEducation: 'bd6ca247ef',
  infoHealth: 'a91ff19844',
  confirmedDeferWithdraw: '808197db04',
  reminderSecondaryHealth: '4b39957dad',
  reminderSecondaryYouth: '0330455789',
  reminderSecondaryEducation: '1ecee0a13d'
};

function resolveListId(status, program) {
  if (status === 'denied') {
    return lists.denied;
  }
  if (status === 'accepted') {
    return lists.accepted;
  }
  if (status === 'info-health') {
    return lists.infoHealth;
  }
  if (status === 'reminder-secondary') {
    switch(program) {
      case 'healthInnovation':
        return lists.reminderSecondaryHealth;
      case 'youthEmpowerment':
        return lists.reminderSecondaryYouth;
      case 'education':
        return lists.reminderSecondaryEducation;
      case 'hbcu':
        return 'hbcu'
      default:
        return;
    }
  }
  if (status === 'defer' || status === 'withdraw') {
    return lists.confirmedDeferWithdraw;
  }
  if (status === 'secondary' && program) {
    switch(program) {
      case 'healthInnovation':
        return lists.secondaryHealth;
      case 'serve':
        return lists.secondaryServe;
      case 'education':
        return lists.secondaryEducation;
      case 'youthEmpowerment':
        return lists.secondaryYouth;
      default:
        return;
    }
  }
  return;
}

function resolveConfirmedListId(program) {
  switch(program) {
    case 'healthInnovation':
      return lists.confirmedHealth;
    case 'education':
      return lists.confirmedEducation;
    case 'serve':
      return lists.confirmedYouth;
    case 'youthEmpowerment':
      return lists.confirmedYouth;
    default:
      return;
  }
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
}

const addApplicantsToMailList = (mailPayload) => {
  return mailchimp.batch(mailPayload);
};

const resolveMailClientPayloadMany = ( selectedApplicants, listId, programTypeId, deadline ) => {
  if (listId === 'hbcu') { // for secondary reminder, if HBCU need unique listIds for each applicant
    return selectedApplicants.map((applicant) => {
      const {
        id = '',
        email = '',
        firstName = '',
        lastName = '',
        hbcu = '',
        secondaryProgram = ''
      } = applicant;

      const reminderListId = resolveListId('reminder-secondary', secondaryProgram)
      return {
        method: 'POST',
        path: `lists/${reminderListId}/members`,
        body: {
          email_address:email,
          status:"subscribed",
          merge_fields: {
            FNAME: firstName,
            LNAME: lastName,
            DBID: id,
            PTYPE: programTypeId,
            DEADLINE: deadline,
            HBCU: hbcu
          }
        },
      }
    })
  } else {
      return selectedApplicants.map((applicant) => {
        const {
          id = '',
          email = '',
          firstName = '',
          lastName = '',
          hbcu = '',
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
              DEADLINE: deadline,
              HBCU: hbcu
            }
          },
        }
      })
  }
}

module.exports = {
  lists: lists,
  resolveMailClientPayloadOne: resolveMailClientPayloadOne,
  resolveMailClientPayload: resolveMailClientPayloadMany,
  resolveListId: resolveListId,
  addApplicantToMailList: addApplicantToMailList,
  addApplicantsToMailList: addApplicantsToMailList,
  resolveConfirmedListId
}
