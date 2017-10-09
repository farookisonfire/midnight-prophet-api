var secret = process.env.STRIPE_SECRET_KEY || "sk_test_6m55BYyH2L1xa7j9uboViaNq";
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

const chargeCustomer = (customerId, fee, description) => {
  console.log('------------------------------ customerId', customerId)
  console.log('------------------------------fee',fee )
  console.log('------------------------------description', description)
  
  return new Promise((resolve, reject) => {
    stripe.charges.create({
      amount: parseInt(fee) * 100,
      currency: 'usd',
      customer: customerId,
      description: description
    })
    .then(charge => {
      console.log('charge success', charge)
      return resolve(charge)
    })
    .catch((err) => {
      console.log(err);
      return reject(err);
    })
  })
}

const retrieveCustomer = (customerId) => {
  return new Promise((resolve, reject) => {
    stripe.customers.retrieve(
      customerId,
      (err, customer) => {
        if (err) {
          return reject(err);
        }
        return resolve(customer);
      }
    )
  })
}

const retrieveCustomerCharges = (customerId) => {
  return new Promise((resolve, reject) => {
    stripe.charges.list(
      {customer: customerId},
      (err, charges) => {
        if (err) {
          return reject(err);
        }
        return resolve(charges);
      }
    )
  })
}

module.exports = {
  handleEnrollmentFee,
  retrieveCustomer,
  chargeCustomer,
  retrieveCustomerCharges,
}
