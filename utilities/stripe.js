var secret = process.env.STRIPE_SECRET_KEY || "sk_test_6m55BYyH2L1xa7j9uboViaNq";
// var secret = "sk_test_6m55BYyH2L1xa7j9uboViaNq";
var stripe = require("stripe")(secret);

const handleEnrollmentFee = (token, email, description, fee) => {
  return new Promise((resolve, reject) => {
    stripe.customers.create({
      email: email,
      description: description,
      source: token,
    })
    .then((customer) => {
      console.log('CREATED A CUSTOMER ----> ', customer);
      return stripe.charges.create({
        amount: parseInt(fee) * 100,
        currency: 'usd',
        customer: customer.id,
      });
    })
    .then((charge) => {
      console.log('Program Secure Charge Success')
      return resolve(charge)
    })
    .catch((error) => {
      console.log(error);
      reject('Program Secure Charge Fail')
    })
  })
}

module.exports = handleEnrollmentFee;
