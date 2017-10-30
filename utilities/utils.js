const splitApplicantName = (applicants) => {
  return applicants.map((applicant) => {
    const {
      name,
      id,
      email,
      phone,
      hbcu
    } = applicant;

    const applicantName = name.split(' ');
      const firstName = applicantName[0];
      const lastName = applicantName[applicantName.length - 1];
    
    return {
      firstName,
      lastName,
      id,
      email,
      phone,
      hbcu
    }
  })
}

module.exports = {
  splitApplicantName: splitApplicantName,
}
