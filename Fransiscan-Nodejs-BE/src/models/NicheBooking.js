/**
 * NicheBooking entity model
 * Represents a niche booking with associated beneficiaries
 */
class NicheBooking {
  constructor(data = {}) {
    // Primary keys
    this.nicheBookingId = data.nicheBookingId || data.NicheBookingId || null;
    this.nicheId = data.nicheId || data.NicheId || null;
    this.nicheApplicationId = data.nicheApplicationId || data.NicheApplicationId || null;

    // Person relationships
    this.contactPersonId = data.contactPersonId || data.ContactPersonId || null;
    this.nomineeId = data.nomineeId || data.NomineeId || null;
    this.nomineeId2 = data.nomineeId2 || data.NomineeId2 || null;

    // Booking details
    this.bookedDate = data.bookedDate || data.BookedDate || new Date();
    this.code = data.code || data.Code || null;
    this.remarks = data.remarks || data.Remarks || null;
    this.bookingStatus = data.bookingStatus || data.BookingStatus || 1; // 1=Active

    // Administrative
    this.churchId = data.churchId || data.ChurchId || null;
    this.userId = data.userId || data.UserId || null;

    // Related entities (populated by joins)
    this.contact = data.contact || data.Contact || null;
    this.nominee = data.nominee || data.Nominee || null;
    this.nominee2 = data.nominee2 || data.Nominee2 || null;
    this.nicheApplication = data.nicheApplication || data.NicheApplication || null;
    this.chapel = data.chapel || data.Chapel || null;
    this.nicheBookingBeneficiaries = data.nicheBookingBeneficiaries || data.NicheBookingBeneficiaries || [];
  }

  toJSON() {
    return {
      nicheBookingId: this.nicheBookingId,
      nicheId: this.nicheId,
      nicheApplicationId: this.nicheApplicationId,
      code: this.code,
      bookedDate: this.bookedDate,
      bookingStatus: this.bookingStatus,
      remarks: this.remarks,
      churchId: this.churchId,
      userId: this.userId,
      contact: this.contact,
      nominee: this.nominee,
      nominee2: this.nominee2,
      beneficiaries: this.nicheBookingBeneficiaries,
      nicheApplication: this.nicheApplication,
      chapel: this.chapel
    };
  }

  validate() {
    const errors = [];

    if (!this.nicheId) {
      errors.push('Niche ID is required');
    }

    if (!this.nicheApplicationId) {
      errors.push('Niche Application ID is required');
    }

    if (!this.contactPersonId) {
      errors.push('Contact Person ID is required');
    }

    if (!this.nomineeId) {
      errors.push('Nominee ID is required');
    }

    if (!this.churchId) {
      errors.push('Church ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * NicheBookingBeneficiary entity model
 */
class NicheBookingBeneficiary {
  constructor(data = {}) {
    this.nicheBookingBeneficiaryId = data.nicheBookingBeneficiaryId || data.NicheBookingBeneficiaryId || null;
    this.nicheBookingId = data.nicheBookingId || data.NicheBookingId || null;
    this.nicheId = data.nicheId || data.NicheId || null;
    this.personId = data.personId || data.PersonId || null;
    this.beneficiaryId = data.beneficiaryId || data.BeneficiaryId || null;
    this.name = data.name || data.Name || null;
    this.idNo = data.idNo || data.IDNo || null;
    this.isCatholic = data.isCatholic !== undefined ? data.isCatholic : (data.IsCatholic || null);
    this.isMale = data.isMale !== undefined ? data.isMale : (data.IsMale || null);
    this.relationshipToApplicant = data.relationshipToApplicant || data.RelationshipToApplicant || null;
    this.dateOfBirth = data.dateOfBirth || data.DateOfBirth || null;
    this.dateOfBirthInDateTime = data.dateOfBirthInDateTime || data.DateOfBirthInDateTime || null;
    this.relationshipToNominee1 = data.relationshipToNominee1 || data.RelationshipToNominee1 || null;
    this.relationshipToNominee2 = data.relationshipToNominee2 || data.RelationshipToNominee2 || null;
    this.birthYear = data.birthYear || data.BirthYear || null;
    this.beneficiaryStatus = data.beneficiaryStatus || data.BeneficiaryStatus || 1; // 1=Active
    this.churchId = data.churchId || data.ChurchId || null;
    this.createdDate = data.createdDate || data.CreatedDate || null;
    this.modifiedDate = data.modifiedDate || data.ModifiedDate || null;
  }

  toJSON() {
    return {
      nicheBookingBeneficiaryId: this.nicheBookingBeneficiaryId,
      nicheBookingId: this.nicheBookingId,
      nicheId: this.nicheId,
      personId: this.personId,
      beneficiaryId: this.beneficiaryId,
      name: this.name,
      idNo: this.idNo,
      isCatholic: this.isCatholic,
      isMale: this.isMale,
      relationshipToApplicant: this.relationshipToApplicant,
      dateOfBirth: this.dateOfBirth,
      dateOfBirthInDateTime: this.dateOfBirthInDateTime,
      relationshipToNominee1: this.relationshipToNominee1,
      relationshipToNominee2: this.relationshipToNominee2,
      birthYear: this.birthYear,
      beneficiaryStatus: this.beneficiaryStatus,
      churchId: this.churchId,
      createdDate: this.createdDate,
      modifiedDate: this.modifiedDate
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

/**
 * NicheBookingSearchParams for searching bookings
 */
class NicheBookingSearchParams {
  constructor(data = {}) {
    this.churchId = data.churchId || data.ChurchId || null;
    this.bookedDate = data.bookedDate || data.BookedDate || null;
    this.contactName = data.contactName || data.ContactName || null;
    this.contactIDNo = data.contactIDNo || data.ContactIDNo || null;
    this.nomineeName = data.nomineeName || data.NomineeName || null;
    this.nomineeIDNo = data.nomineeIDNo || data.NomineeIDNo || null;
    this.beneficiaryName = data.beneficiaryName || data.BeneficiaryName || null;
    this.nicheCode = data.nicheCode || data.NicheCode || null;
    this.chapelCode = data.chapelCode || data.ChapelCode || null;
    this.applicantAddress = data.applicantAddress || data.ApplicantAddress || null;
    this.applicantAddress2 = data.applicantAddress2 || data.ApplicantAddress2 || null;
    this.applicantAddress3 = data.applicantAddress3 || data.ApplicantAddress3 || null;
    this.applicantAddress4 = data.applicantAddress4 || data.ApplicantAddress4 || null;
    this.applicantAddressPostal = data.applicantAddressPostal || data.ApplicantAddressPostal || null;
    this.nomineeAddress = data.nomineeAddress || data.NoimineeAddress || null;
  }

  hasAnySearchCriteria() {
    return !!(
      this.contactName ||
      this.contactIDNo ||
      this.nicheCode ||
      this.bookedDate ||
      this.nomineeName ||
      this.nomineeIDNo ||
      this.beneficiaryName ||
      this.applicantAddress ||
      this.applicantAddress2 ||
      this.applicantAddress3 ||
      this.applicantAddress4
    );
  }
}

module.exports = {
  NicheBooking,
  NicheBookingBeneficiary,
  NicheBookingSearchParams
};

