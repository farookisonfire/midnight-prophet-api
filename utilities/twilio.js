const twilio = require('twilio');

const accountSid = 'ACb5ee2c88aa286611321894ccf3e8761b';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_1 = process.env.TWILIO_PHONE_1;
const client = new twilio(accountSid, TWILIO_AUTH_TOKEN);

const defaultReplyMsg = 'Thanks for reaching out! Please contact our Admissions Team at admissions@oneheartsource.org with any questions.';

const userSubmitAppMsg = (name) => {
  return `Thanks for submitting your application, ${name}! Our team will be in touch with you via email within 72 hours! If you don't see our email, be sure to check your spam/junk mail folders.`
};

const userPromotedToSecondaryMsg = (name) => {
  return `Congratulations ${name}! You've advanced to the next round of the application process. Check your email for a notification from our Admissions team for next steps. Remember to check your alternative inboxes if you don't see the email.`
};

const userSubmitSecondaryMsg = (name) => {
  return `Hi ${name}! Thank you for submitting your secondary application! Our team will be in touch soon.`
}

const userAcceptedMsg = (name) => {
  return `Hi ${name}, your Admissions result has been released via email.`
}

const sendTextMessage = (body, to) => {
  client.messages.create({
    body: body,
    to: to,
    from: TWILIO_PHONE_1
  })
};

module.exports = {
  sendTextMessage,
  defaultReplyMsg,
  userSubmitAppMsg,
  userPromotedToSecondaryMsg,
  userSubmitSecondaryMsg,
  userAcceptedMsg,
};
