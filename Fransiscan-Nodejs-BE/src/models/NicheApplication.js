/**
 * NicheApplication entity model
 * Main niche application with applicant, nominee, and beneficiaries
 * Code format: NAPP-XXXX
 */
class NicheApplication {
  constructor(data = {}) {
    // Primary key
    this.nicheApplicationId = data.nicheApplicationId || data.NicheApplicationId || null;

    // Dates
    this.appliedDate = data.appliedDate || data.AppliedDate || new Date();
    this.agreementDate = data.agreementDate || data.AgreementDate || new Date();

    // Status and Code
    this.status = data.status || data.Status || 1; // 1=Draft, 2=Pending, 3=Booked
    this.code = data.code || data.Code || null;

    // Niche selection
    this.nicheId = data.nicheId || data.NicheId || null;
    this.amount = data.amount || data.Amount || 0;
    this.defaultAmount = data.defaultAmount || data.DefaultAmount || 0;

    // Applicant information
    this.applicantName = data.applicantName || data.ApplicantName || null;
    this.applicantIDNo = data.applicantIDNo || data.ApplicantIDNo || null;
    this.applicantEmailID = data.applicantEmailID || data.ApplicantEmailID || null;
    this.applicantMobileNo = data.applicantMobileNo || data.ApplicantMobileNo || null;
    this.applicantHomeTelNo = data.applicantHomeTelNo || data.ApplicantHomeTelNo || null;
    this.applicantOfficeTelNo = data.applicantOfficeTelNo || data.ApplicantOfficeTelNo || null;
    this.applicantIsCatholic = data.applicantIsCatholic !== undefined ? data.applicantIsCatholic : (data.ApplicantIsCatholic || false);

    // Applicant address
    this.applicantAddressNo = data.applicantAddressNo || data.ApplicantAddressNo || null;
    this.applicantAddressLine1 = data.applicantAddressLine1 || data.ApplicantAddressLine1 || null;
    this.applicantAddressLine2 = data.applicantAddressLine2 || data.ApplicantAddressLine2 || null;
    this.applicantAddressCity = data.applicantAddressCity || data.ApplicantAddressCity || null;
    this.applicantAddressState = data.applicantAddressState || data.ApplicantAddressState || null;
    this.applicantAddressCountry = data.applicantAddressCountry || data.ApplicantAddressCountry || null;

    // Primary Nominee
    this.nomineeName = data.nomineeName || data.NomineeName || null;
    this.nomineeIDNo = data.nomineeIDNo || data.NomineeIDNo || null;
    this.nomineeEmailID = data.nomineeEmailID || data.NomineeEmailID || null;
    this.nomineeMobileNo = data.nomineeMobileNo || data.NomineeMobileNo || null;
    this.nomineeHomeTelNo = data.nomineeHomeTelNo || data.NomineeHomeTelNo || null;
    this.nomineeOfficeTelNo = data.nomineeOfficeTelNo || data.NomineeOfficeTelNo || null;
    this.nomineeRelationship = data.nomineeRelationship || data.NomineeRelationship || null;
    this.nomineeIsCatholic = data.nomineeIsCatholic !== undefined ? data.nomineeIsCatholic : (data.NomineeIsCatholic || null);

    // Nominee address
    this.nomineeAddressNo = data.nomineeAddressNo || data.NomineeAddressNo || null;
    this.nomineeAddressLine1 = data.nomineeAddressLine1 || data.NomineeAddressLine1 || null;
    this.nomineeAddressLine2 = data.nomineeAddressLine2 || data.NomineeAddressLine2 || null;
    this.nomineeAddressCity = data.nomineeAddressCity || data.NomineeAddressCity || null;
    this.nomineeAddressState = data.nomineeAddressState || data.NomineeAddressState || null;
    this.nomineeAddressCountry = data.nomineeAddressCountry || data.NomineeAddressCountry || null;

    // Secondary Nominee (Optional)
    this.nomineeName2 = data.nomineeName2 || data.NomineeName2 || null;
    this.nomineeIDNo2 = data.nomineeIDNo2 || data.NomineeIDNo2 || null;
    this.nomineeEmailID2 = data.nomineeEmailID2 || data.NomineeEmailID2 || null;
    this.nomineeMobileNo2 = data.nomineeMobileNo2 || data.NomineeMobileNo2 || null;
    this.nomineeHomeTelNo2 = data.nomineeHomeTelNo2 || data.NomineeHomeTelNo2 || null;
    this.nomineeOfficeTelNo2 = data.nomineeOfficeTelNo2 || data.NomineeOfficeTelNo2 || null;
    this.nomineeRelationship2 = data.nomineeRelationship2 || data.NomineeRelationship2 || null;
    this.nomineeIsCatholic2 = data.nomineeIsCatholic2 !== undefined ? data.nomineeIsCatholic2 : (data.NomineeIsCatholic2 || null);

    // Nominee 2 address
    this.nomineeAddressNo2 = data.nomineeAddressNo2 || data.NomineeAddressNo2 || null;
    this.nomineeAddressLine12 = data.nomineeAddressLine12 || data.NomineeAddressLine12 || null;
    this.nomineeAddressLine22 = data.nomineeAddressLine22 || data.NomineeAddressLine22 || null;
    this.nomineeAddressCity2 = data.nomineeAddressCity2 || data.NomineeAddressCity2 || null;
    this.nomineeAddressState2 = data.nomineeAddressState2 || data.NomineeAddressState2 || null;
    this.nomineeAddressCountry2 = data.nomineeAddressCountry2 || data.NomineeAddressCountry2 || null;

    // Beneficiaries (up to 3, stored separately in NicheApplicationBeneficiary table)
    this.beneficiaries = data.beneficiaries || data.NicheApplicationBeneficiaries || [];

    // Administrative
    this.churchId = data.churchId || data.ChurchId || null;
    this.userId = data.userId || data.UserId || null;
    this.remarks = data.remarks || data.Remarks || null;
    this.refDocType = data.refDocType || data.RefDocType || 'NAPP';

    // Related entities
    this.niche = data.niche || data.Niche || null;
    this.contact = data.contact || data.Contact || null;
  }

  toJSON() {
    return {
      nicheApplicationId: this.nicheApplicationId,
      code: this.code,
      appliedDate: this.appliedDate,
      agreementDate: this.agreementDate,
      status: this.status,
      statusText: this.getStatusText(),

      // Applicant
      applicant: {
        name: this.applicantName,
        idNo: this.applicantIDNo,
        email: this.applicantEmailID,
        mobileNo: this.applicantMobileNo,
        homeTelNo: this.applicantHomeTelNo,
        officeTelNo: this.applicantOfficeTelNo,
        isCatholic: this.applicantIsCatholic,
        address: {
          no: this.applicantAddressNo,
          line1: this.applicantAddressLine1,
          line2: this.applicantAddressLine2,
          city: this.applicantAddressCity,
          state: this.applicantAddressState,
          country: this.applicantAddressCountry
        }
      },

      // Primary Nominee
      nominee: {
        name: this.nomineeName,
        idNo: this.nomineeIDNo,
        email: this.nomineeEmailID,
        mobileNo: this.nomineeMobileNo,
        homeTelNo: this.nomineeHomeTelNo,
        officeTelNo: this.nomineeOfficeTelNo,
        relationship: this.nomineeRelationship,
        isCatholic: this.nomineeIsCatholic,
        address: {
          no: this.nomineeAddressNo,
          line1: this.nomineeAddressLine1,
          line2: this.nomineeAddressLine2,
          city: this.nomineeAddressCity,
          state: this.nomineeAddressState,
          country: this.nomineeAddressCountry
        }
      },

      // Secondary Nominee (optional)
      nominee2: this.nomineeName2
        ? {
          name: this.nomineeName2,
          idNo: this.nomineeIDNo2,
          email: this.nomineeEmailID2,
          mobileNo: this.nomineeMobileNo2,
          homeTelNo: this.nomineeHomeTelNo2,
          officeTelNo: this.nomineeOfficeTelNo2,
          relationship: this.nomineeRelationship2,
          isCatholic: this.nomineeIsCatholic2,
          address: {
            no: this.nomineeAddressNo2,
            line1: this.nomineeAddressLine12,
            line2: this.nomineeAddressLine22,
            city: this.nomineeAddressCity2,
            state: this.nomineeAddressState2,
            country: this.nomineeAddressCountry2
          }
        }
        : null,

      // Beneficiaries
      beneficiaries: this.beneficiaries,

      // Niche details
      niche: {
        nicheId: this.nicheId,
        amount: this.amount,
        defaultAmount: this.defaultAmount
      },

      // Administrative
      churchId: this.churchId,
      userId: this.userId,
      remarks: this.remarks,
      refDocType: this.refDocType
    };
  }

  getStatusText() {
    const statusMap = {
      0: 'Deleted',
      1: 'Draft',
      2: 'Pending',
      3: 'Booked',
      4: 'Completed'
    };
    return statusMap[this.status] || 'Unknown';
  }

  validate() {
    const errors = [];

    if (!this.nicheId) {
      errors.push('Niche ID is required');
    }

    if (!this.applicantName || this.applicantName.trim() === '') {
      errors.push('Applicant name is required');
    }

    if (!this.nomineeName || this.nomineeName.trim() === '') {
      errors.push('Nominee name is required');
    }

    if (!this.churchId) {
      errors.push('Church ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  canModify() {
    return this.status === 1 || this.status === 2 || this.status === 3; // Draft, Pending, or Booked
  }
}

/**
 * NicheApplicationBeneficiary entity model
 * 
 * Note: RelationshipToNominee1 and RelationshipToNominee2 are now in the database schema
 * and will be persisted to the database. These fields were added via database migration.
 */
class NicheApplicationBeneficiary {
  constructor(data = {}) {
    this.nicheApplicationBeneficiaryId = data.nicheApplicationBeneficiaryId || data.NicheApplicationBeneficiaryId || null;
    this.nicheApplicationId = data.nicheApplicationId || data.NicheApplicationId || null;
    this.name = data.name || data.Name || null;
    this.relationshipToApplicant = data.relationshipToApplicant || data.RelationshipToApplicant || null;
    this.dateOfBirth = data.dateOfBirth || data.DateOfBirth || null;
    this.birthYear = data.birthYear || data.BirthYear || null;
    this.idNo = data.idNo || data.IDNo || null;
    this.isCatholic = data.isCatholic !== undefined ? data.isCatholic : (data.IsCatholic || null);
    this.isMale = data.isMale !== undefined ? data.isMale : (data.IsMale || null);
    // Note: These fields now exist in both the model and database table
    // They will be persisted to the database
    this.relationshipToNominee1 = data.relationshipToNominee1 || data.RelationshipToNominee1 || null;
    this.relationshipToNominee2 = data.relationshipToNominee2 || data.RelationshipToNominee2 || null;
  }

  toJSON() {
    return {
      nicheApplicationBeneficiaryId: this.nicheApplicationBeneficiaryId,
      nicheApplicationId: this.nicheApplicationId,
      name: this.name,
      relationshipToApplicant: this.relationshipToApplicant,
      dateOfBirth: this.dateOfBirth,
      birthYear: this.birthYear,
      idNo: this.idNo,
      isCatholic: this.isCatholic,
      isMale: this.isMale,
      // Include these in JSON output for frontend compatibility
      relationshipToNominee1: this.relationshipToNominee1,
      relationshipToNominee2: this.relationshipToNominee2
    };
  }

  validate() {
    const errors = [];

    if (!this.name || this.name.trim() === '') {
      errors.push('Beneficiary name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = {
  NicheApplication,
  NicheApplicationBeneficiary
};

