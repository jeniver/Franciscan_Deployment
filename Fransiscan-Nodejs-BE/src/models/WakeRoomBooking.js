/**
 * WakeRoomBooking entity model
 * Based on ASP.NET Entity.WakeRoomBooking structure
 */
class WakeRoomBooking {
  constructor(data = {}) {
    // Primary key
    this.wakeRoomBookingId = data.wakeRoomBookingId || data.WakeRoomBookingId || null;

    // Wake Room relationship
    this.wakeRoomId = data.wakeRoomId || data.WakeRoomId || null;
    this.wakeRoom = data.wakeRoom || data.WakeRoom || null;

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

    // Booking details
    this.purpose = data.purpose || data.Purpose || null;
    this.nameOfDeceased = data.nameOfDeceased || data.NameOfDeceased || null;
    this.usingDate = data.usingDate || data.UsingDate || null;
    this.massTime = data.massTime || data.MassTime || null;
    this.massTimeStr = data.massTimeStr || data.MassTimeStr || null;
    this.usingTimeFrom = data.usingTimeFrom || data.UsingTimeFrom || null;
    this.usingTimeTo = data.usingTimeTo || data.UsingTimeTo || null;
    this.noOfDays = data.noOfDays || data.NoOfDays || 0;
    this.remarks = data.remarks || data.Remarks || null;

    // Financial information
    this.donationAmount = data.donationAmount || data.DonationAmount || 0;
    this.defaultDonationAmount = data.defaultDonationAmount || data.DefaultDonationAmount || 0;

    // Service details
    this.serviceby = data.serviceby || data.Serviceby || null;
    this.casketCompany = data.casketCompany || data.CasketCompany || null;
    this.hallNo = data.hallNo || data.HallNo || null;
    this.timeOfCremation = data.timeOfCremation || data.TimeOfCremation || null;
    this.timeOfCremationInTime = data.timeOfCremationInTime || data.TimeOfCremationInTime || null;

    // Status and administrative
    this.status = data.status || data.Status || 0;
    this.code = data.code || data.Code || null;
    this.refDocType = data.refDocType || data.RefDocType || null;
    this.churchId = data.churchId || data.ChurchId || null;
    this.userId = data.userId || data.UserId || null;
  }

  /**
   * Get formatted applicant address
   * @returns {string} Complete address
   */
  getApplicantAddress() {
    const parts = [
      this.applicantAddressNo,
      this.applicantAddressLine1,
      this.applicantAddressLine2,
      this.applicantAddressCity,
      this.applicantAddressState,
      this.applicantAddressCountry
    ].filter(part => part && part.trim() !== '');

    return parts.join(', ');
  }

  /**
   * Convert to JSON format
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      wakeRoomBookingId: this.wakeRoomBookingId,
      wakeRoomId: this.wakeRoomId,
      code: this.code,

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

      // Booking details
      booking: {
        purpose: this.purpose,
        nameOfDeceased: this.nameOfDeceased,
        usingDate: this.usingDate,
        massTime: this.massTime,
        massTimeStr: this.massTimeStr,
        usingTimeFrom: this.usingTimeFrom,
        usingTimeTo: this.usingTimeTo,
        noOfDays: this.noOfDays,
        remarks: this.remarks
      },

      // Financial information
      financial: {
        donationAmount: this.donationAmount,
        defaultDonationAmount: this.defaultDonationAmount
      },

      // Service details
      service: {
        serviceby: this.serviceby,
        casketCompany: this.casketCompany,
        hallNo: this.hallNo,
        timeOfCremation: this.timeOfCremation
      },

      // Administrative
      status: this.status,
      refDocType: this.refDocType,
      churchId: this.churchId,
      userId: this.userId,

      // Related entities
      wakeRoom: this.wakeRoom ? this.wakeRoom.toJSON() : null
    };
  }

  /**
   * Validate booking data
   * @returns {Object} Validation result
   */
  validate() {
    // Validations removed to support niche application style
    return {
      isValid: true,
      errors: []
    };
  }
}

module.exports = WakeRoomBooking;
