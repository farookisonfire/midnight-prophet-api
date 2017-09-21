var secret = process.env.STRIPE_SECRET_KEY || "sk_test_6m55BYyH2L1xa7j9uboViaNq";
var stripe = require("stripe")(secret);

const handleEnrollmentFee = (token, email, description, metadata) => {
  return new Promise((resolve, reject) => {
    stripe.customers.create({
      email: email,
      description: description,
      source: token,
      metadata: metadata,
    })
    .then((customer) => {
      return stripe.charges.create({
        amount: 100,
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

// function handleCharge(req, res){
//   const {customerDetails, token} = req.body;

//   // Create a Customer:
//   stripe.customers.create({
//     email: customerDetails.email,
//     description: 'Donation via website.',
//     source: token,
//     metadata: customerDetails
//   })
  
//   .then(function(customer) {
//     // YOUR CODE: Save the customer ID and other info in a database for later.
//     console.log('------- CUSTOMER INFO --------', customer)
//     console.log('here is the customers id to be saved in databse', customer.id)

//     return stripe.charges.create({
//       amount: customerDetails.amount * 100,
//       currency: "usd",
//       customer: customer.id,
//     });
//   })

//   .then(function(charge) {
//     console.log('-----CHARGE INFO------', charge)
//     res.status(200).send({payment: 'Your donation of ' + customerDetails.amount + ' has been successful!'})
//   });
// }

module.exports = handleEnrollmentFee;