/* eslint-disable no-console */
const fetch = require('node-fetch');
const SLACK_URL = process.env.SLACK_URL || '';

const slackNotificationTypes = {
  paymentPlan: 'paymentPlan',
  clippersTicket: 'clippersTicket'
}

const slackNotificationURLs = {
  paymentPlan: process.env.SLACK_FINANCE_CHANNEL,
  clippersTicket: process.env.SLACK_CLIPPERS_CHANNEL
}

const slackNotifications = (applicantDetails = {}) => {
  return {
    paymentPlan: JSON.stringify({
      text: `*________ Payment Plan Notification: ________*\nFirst Name: ${applicantDetails.firstName}\nLast Name: ${applicantDetails.lastName}\nEmail:${applicantDetails.email}`
    }),
    clippersTicket: JSON.stringify({
      text: `*________ Clippers Ticket Notification: ________*\nName: ${applicantDetails.name}\nEmail: ${applicantDetails.email}\nLevel: ${applicantDetails.level}\nSection: ${applicantDetails.section}\nTickets: ${applicantDetails.numTickets}\nOrder Total: $${applicantDetails.orderTotal}`
    })
  }
}

function createSlackText(formResponse) {
  const slackString = `*________ New Applicant Details: ________*\nFirst Name: ${formResponse["First Name"]}\nLast Name: ${formResponse["Last Name"]}\nUniversity: ${formResponse["University you attend(ed)"]}`;
  return JSON.stringify({text: slackString});
}

function updateSlack(formResponse) {
  return new Promise((resolve, reject) => {
    fetch(SLACK_URL, {
        method: 'POST',
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: createSlackText(formResponse)
      })
      .then(response => {
        if (!response.ok) { throw new Error(response.statusText); }
        console.log('slack ok');
        resolve();
        return;
      })
      .catch(err => {
        console.log(err);
        reject();
        return;
      });
  });
}

const notifySlack = (notificationType, applicantData) => {
  const slackMessage = slackNotifications(applicantData)[notificationType];

  return fetch(slackNotificationURLs[notificationType], {
    method: 'POST',
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: slackMessage
  });
};

module.exports = {
  updateSlack,
  notifySlack,
  slackNotificationTypes,
  slackNotificationURLs
};
