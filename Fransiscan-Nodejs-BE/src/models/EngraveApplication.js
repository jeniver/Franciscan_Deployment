const AddressUtils = require('../utils/AddressUtils');

/**
 * EngraveApplication entity model (NicheInscriptionRequest in ASP.NET)
 * For engraving/inscription applications
 */
class EngraveApplication {
  constructor(data = {}) {
    // Primary key
    this.nicheInscriptionRequestId = data.nicheInscriptionRequestId || data.NicheInscriptionRequestId || null;

    // Application code and status
    this.code = data.code || data.Code || null;
    this.status = data.status || data.Status || 1; // 1=Draft, 2=Pending, 3=Confirmed

    // Niche Application relationship
    this.nicheApplicationCode = data.nicheApplicationCode || data.NicheApplicationCode || null;
    this.nicheBookingId = data.nicheBookingId || data.NicheBookingId || null;

    // Applicant basic information
    this.applicantName = data.applicantName || data.ApplicantName || null;
    this.applicantIDNo = data.applicantIDNo || data.ApplicantIDNo || null;
    this.applicantEmailID = data.applicantEmailID || data.ApplicantEmailID || null;
    this.applicantMobileNo = data.applicantMobileNo || data.ApplicantMobileNo || null;
    this.applicantHomeTelNo = data.applicantHomeTelNo || data.ApplicantHomeTelNo || null;
    this.applicantOfficeTelNo = data.applicantOfficeTelNo || data.ApplicantOfficeTelNo || null;

    // Applicant address
    this.applicantAddressNo = data.applicantAddressNo || data.ApplicantAddressNo || null;
    this.applicantAddressLine1 = data.applicantAddressLine1 || data.ApplicantAddressLine1 || null;
    this.applicantAddressLine2 = data.applicantAddressLine2 || data.ApplicantAddressLine2 || null;
    this.applicantAddressCity = data.applicantAddressCity || data.ApplicantAddressCity || null;
    this.applicantAddressState = data.applicantAddressState || data.ApplicantAddressState || null;
    this.applicantAddressCountry = data.applicantAddressCountry || data.ApplicantAddressCountry || null;

    // Bible inscription choice
    this.bibleInscriptionChoiceId = data.bibleInscriptionChoiceId || data.BibleInscriptionChoiceId || null;
    // Map AdditionalInscriptionPhrase to both bibleInscriptionText and additionalInscriptionPhrase for backward compatibility
    // The database column is AdditionalInscriptionPhrase, but we maintain both properties
    this.additionalInscriptionPhrase = data.additionalInscriptionPhrase || data.AdditionalInscriptionPhrase || null;
    this.bibleInscriptionText = data.bibleInscriptionText || data.BibleInscriptionText || this.additionalInscriptionPhrase || null;

    // Deceased details (list)
    this.deceasedDetails = data.deceasedDetails || data.DeceasedDetails || [];

    // Dates
    this.applicationDate = data.applicationDate || data.ApplicationDate || null;
    this.createdDate = data.createdDate || data.CreatedDate || new Date();

    // Administrative
    this.churchId = data.churchId || data.ChurchId || null;
    this.userId = data.userId || data.UserId || null;
    this.remarks = data.remarks || data.Remarks || null;
    this.crossType = data.crossType || data.CrossType || 'Crucifix'; // Default to Crucifix

    // Storage period
    this.storageFrom = data.storageFrom || (data.storage && data.storage.storageFrom) || data.StorageFrom || null;
    this.storageTo = data.storageTo || (data.storage && data.storage.storageTo) || data.StorageTo || null;
  }

  /**
   * Get formatted applicant address
   * @returns {string} Complete address
   */
  getApplicantAddress() {
    return AddressUtils.formatAddress({
      AddressNo: this.applicantAddressNo,
      Address: this.applicantAddressLine1,
      Address2: this.applicantAddressLine2,
      AddressCity: this.applicantAddressCity,
      DistrictCode: this.applicantAddressState,
      Country: this.applicantAddressCountry
    });
  }

  /**
   * Convert to JSON format
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      nicheInscriptionRequestId: this.nicheInscriptionRequestId,
      code: this.code,
      status: this.status,
      statusText: this.getStatusText(),

      // Applicant information
      applicant: {
        name: this.applicantName,
        idNo: this.applicantIDNo,
        email: this.applicantEmailID,
        mobileNo: this.applicantMobileNo,
        homeTelNo: this.applicantHomeTelNo,
        officeTelNo: this.applicantOfficeTelNo,
        address: this.getApplicantAddress(),
        addressDetails: {
          no: this.applicantAddressNo,
          line1: this.applicantAddressLine1,
          line2: this.applicantAddressLine2,
          city: this.applicantAddressCity,
          state: this.applicantAddressState,
          country: this.applicantAddressCountry
        }
      },

      // Inscription details
      inscription: {
        bibleInscriptionChoiceId: this.bibleInscriptionChoiceId,
        bibleInscriptionText: this.bibleInscriptionText,
        nicheApplicationCode: this.nicheApplicationCode,
        nicheBookingId: this.nicheBookingId,
        crossType: this.crossType
      },

      // Deceased details
      deceasedDetails: this.deceasedDetails,

      // Dates
      applicationDate: this.applicationDate,
      createdDate: this.createdDate,

      // Administrative
      churchId: this.churchId,
      userId: this.userId,
      remarks: this.remarks,

      // Storage period
      storage: {
        storageFrom: this.storageFrom,
        storageTo: this.storageTo
      }
    };
  }

  /**
   * Get status text
   * @returns {string} Human-readable status
   */
  getStatusText() {
    const statusMap = {
      0: 'Deleted',
      1: 'Draft',
      2: 'Pending',
      3: 'Confirmed',
      4: 'Completed'
    };
    return statusMap[this.status] || 'Unknown';
  }

  /**
   * Validate application data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.applicantName || this.applicantName.trim() === '') {
      errors.push('Applicant name is required');
    }

    if (!this.nicheApplicationCode || this.nicheApplicationCode.trim() === '') {
      errors.push('Niche application code is required');
    }

    if (!this.churchId) {
      errors.push('Church ID is required');
    }

    // Deceased details are optional - can be added later
    // Removed validation: if (!this.deceasedDetails || this.deceasedDetails.length === 0) {
    //   errors.push('At least one deceased detail is required');
    // }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if application can be modified
   * @returns {boolean} True if can be modified
   */
  canModify() {
    return this.status === 1 || this.status === 2; // Draft or Pending
  }
}

/**
 * EngraveApplicationDetail (Deceased person details)
 */
class EngraveApplicationDetail {
  constructor(data = {}) {
    this.nicheInscriptionRequestDecesedId = data.nicheInscriptionRequestDecesedId || data.NicheInscriptionRequestDecesedId || null;
    this.nicheInscriptionRequestId = data.nicheInscriptionRequestId || data.NicheInscriptionRequestId || null;

    this.name = data.name || data.Name || null;
    this.dateOfDeath = data.dateOfDeath || data.DateOfDeath || data.DateDied || null;
    this.dateOfBirth = data.dateOfBirth || data.DateOfBirth || null;
    this.internmentDate = data.internmentDate || data.intermentDate || data.InternmentDate || data.IntermentDate || null;
    this.deathCertificateNo = data.deathCertificateNo || data.DeathCertificateNo || null;
    this.birthYear = data.birthYear || data.BirthYear || null;
    this.inscriptionText = data.inscriptionText || data.InscriptionText || null;
    this.sequence = data.sequence || data.Sequence || 1;
  }

  toJSON() {
    return {
      nicheInscriptionRequestDecesedId: this.nicheInscriptionRequestDecesedId,
      nicheInscriptionRequestId: this.nicheInscriptionRequestId,
      name: this.name,
      dateOfDeath: this.dateOfDeath,
      dateOfBirth: this.dateOfBirth,
      internmentDate: this.internmentDate,
      deathCertificateNo: this.deathCertificateNo,
      birthYear: this.birthYear,
      inscriptionText: this.inscriptionText,
      sequence: this.sequence
    };
  }

  validate() {
    const errors = [];

    if (!this.name || this.name.trim() === '') {
      errors.push('Deceased name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = {
  EngraveApplication,
  EngraveApplicationDetail
};

