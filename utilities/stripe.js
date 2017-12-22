var secret = process.env.STRIPE_SECRET_KEY || "sk_test_6m55BYyH2L1xa7j9uboViaNq";
var stripe = require("stripe")(secret);

const handleEnrollmentFee = (token, email, description, fee, chargeMetadata = {}) => {
  return new Promise((resolve, reject) => {
    stripe.customers.create({
      email: email,
      description: description,
      source: token,
    })
    .then((customer) => {
      console.log('Create customer success ----> ', customer);
      return stripe.charges.create({
        amount: parseInt(fee) * 100,
        currency: 'usd',
        customer: customer.id,
        metadata: chargeMetadata,
      });
    })
    .then((charge) => {
      console.log('Create charge success ---->', charge)
      return resolve(charge)
    })
    .catch((error) => {
      console.log(error);
      reject('Program Secure Charge Fail')
    })
  })
}

const handleClippersTicketPurchase = (token, orderDetails) => {
  const {
    email,
    orderTotal,
  } = orderDetails

  return stripe.customers.create({
    email: email,
    source: token
  })
  .then(customer =>
    stripe.charges.create({
      amount: parseInt(orderTotal) * 100,
      description: 'LA Clippers vs. OKC Thunder - Jan. 4',
      currency: 'usd',
      customer: customer.id,
      receipt_email: email,
      metadata: orderDetails,
    }));
};

const chargeCustomer = (customerId, fee, chargeMetadata = {}, receiptEmail, taxDeductibleAmount) => {
  return new Promise((resolve, reject) => {
    stripe.charges.create({
      amount: parseInt(fee) * 100,
      currency: 'usd',
      customer: customerId,
      metadata: chargeMetadata,
      receipt_email: receiptEmail,
      description: generateReceipt(taxDeductibleAmount)
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

const createCustomer = (token, email, description) => {
  return new Promise((resolve, reject) => {
    stripe.customers.create({
      email: email,
      description: description,
      source: token,
    })
    .then(customer => resolve(customer))
    .catch((err) => {
      console.log('Create Customer Error', err);
      reject(err);
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

const generateReceipt = (amount) =>(`
    Note for US residents:
    As One Heart Source is a registered 501(c)(3) non-profit organization, your contribution is tax-deductible in accordance with the IRS Nonprofit Tax Guidelines. If you would like to claim a tax deduction, this serves as your tax receipt and 88% of your contribution is tax-deductible.

    Maximum Tax Deductible Amount: ${amount}.

    One Heart Source EIN:  80-0151663

    Contact information:
    Name: One Heart Source
    Contact Name:  John Freedman
    Address: 1443 E. Washington Blvd., #179, Pasadena, CA 91104  

    Thank you!
`);

module.exports = {
  handleEnrollmentFee,
  retrieveCustomer,
  chargeCustomer,
  retrieveCustomerCharges,
  createCustomer,
  handleClippersTicketPurchase
}
