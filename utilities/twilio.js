const twilio = require('twilio');

const accountSid = 'ACb5ee2c88aa286611321894ccf3e8761b';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_1 = process.env.TWILIO_PHONE_1;
const client = new twilio(accountSid, TWILIO_AUTH_TOKEN);

const defaultReplyMsg = 'Thanks for reaching out! Please contact our Admissions Team at admissions@oneheartsource.org with any questions.';

const userSubmitAppMsg = (name) => {
  return `Thanks for submitting your application, ${name}! Our team will be in touch with you via email within 72 hours! If you don't see our email, be sure to check your spam/junk mail folders. - One Heart Source Admissions`
};

const userPromotedToSecondaryMsg = (name) => {
  return `Congratulations ${name}! You've advanced to the next round of the application process. Check your email for a notification from our Admissions team for next steps. Remember to check your alternative inboxes if you don't see the email. - One Heart Source Admissions`
};

const userSubmitSecondaryMsg = (name) => {
  return `Hi ${name}! Thank you for submitting your secondary application! Our team will be in touch soon. - One Heart Source Admissions`
}

const userAcceptedMsg = (name) => {
  return `Hi ${name}, your Admissions result has been released via email. - One Heart Source Admissions`
}

const userSubmitEnrollmentFeeMsg = (name) => {
  return `Hi ${name}, thank you for submitting your enrollment fee! Your position has been secured. - One Heart Source Admissions`
}

const userSentInfo = (name) => {
  return `Hi ${name}, we've just sent you some details via email regarding your program! - One Heart Source Admissions`
}

const userSentDeferWithdraw = (name) => {
  return `Hi ${name}, we've just sent you some details via email regarding your deferral/withdrawal! - One Heart Source Admissions`
}

const userSentReminderSecondary = (name) => {
  return `Hi ${name}, you still have time to complete your secondary application! For details, please check your email (remember to check your spam/junk folders) - One Heart Source Admissions`
}

const sendTextMessage = (body, to) => {
  client.messages.create({
    body: body,
    to: to,
    from: TWILIO_PHONE_1
  })
  .then(() => console.log(`SMS to ${to} Success`))
  .catch((err) => console.log(`SMS to ${to} Fail`, err))
};

const sendManyTextMessages = (applicants, status) => {
  const smsPromises = [];
  applicants.forEach((applicant) => {
    const { firstName, phone } = applicant;
    let msgBody;
      if (status === 'secondary') {
        msgBody = userPromotedToSecondaryMsg(firstName);
      } else if (status === 'accepted') {
        msgBody = userAcceptedMsg(firstName);
      } else if (status === 'info-health') {
        msgBody = userSentInfo(firstName);
      } else if (status === 'defer' || status === 'withdraw') {
        msgBody = userSentDeferWithdraw(firstName);
      } else if (status === 'reminder-secondary') {
        msgBody = userSentReminderSecondary(firstName);
      } else {
        return;
      }
      smsPromises.push(sendTextMessage(msgBody, phone))
  })
  return Promise.all(smsPromises);
}

module.exports = {
  sendTextMessage,
  sendManyTextMessages,
  defaultReplyMsg,
  userSubmitAppMsg,
  userPromotedToSecondaryMsg,
  userSubmitSecondaryMsg,
  userAcceptedMsg,
  userSubmitEnrollmentFeeMsg,
  userSentDeferWithdraw
};
