/* eslint-disable no-console */
const fetch = require('node-fetch');
const SLACK_URL = process.env.SLACK_URL || 'https://hooks.slack.com/services/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';

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
        console.log('ok');
        resolve();
      })
      .catch(err => {
        console.log(err);
        reject();
      });
  });
}

module.exports = updateSlack;
