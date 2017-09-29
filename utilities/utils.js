const splitApplicantName = (applicants) => {
  return applicants.map((applicant) => {
    const {
      name,
      id,
      email,
    } = applicant;

    const applicantName = name.split(' ');
      const firstName = applicantName[0];
      const lastName = applicantName[applicantName.length - 1];
    
    return {
      firstName: firstName,
      lastName: lastName,
      id: id,
      email: email,
    }
  })
}

module.exports = {
  splitApplicantName: splitApplicantName,
}
