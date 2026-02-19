const GateOfLifeApplicationDetail = require('./GateOfLifeApplicationDetail');

const coerceNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

/**
 * GateOfLifeApplication model
 * Represents a Gates of Life (Engrave Wall) booking/application.
 */
class GateOfLifeApplication {
  constructor(data = {}) {
    const applicant = data.applicant || {};
    const applicantAddress = applicant.address || {};

    this.applicationId = data.applicationId
      || data.gateOfLifeApplicationId
      || data.EngraveWallApplicationId
      || data.engraveWallApplicationId
      || null;

    this.code = data.code || data.Code || null;

    const bookingDateValue = data.bookingDate
      || data.BookingDate
      || data.bookedDate
      || data.BookedDate
      || null;
    this.bookingDate = bookingDateValue ? new Date(bookingDateValue) : new Date();

    this.applicantName = data.applicantName ?? data.ApplicantName ?? applicant.name ?? null;
    this.applicantIDNo = data.applicantIDNo ?? data.ApplicantIDNo ?? applicant.idNo ?? null;
    this.applicantEmailID = data.applicantEmailID ?? data.ApplicantEmailID ?? applicant.email ?? null;
    this.applicantMobileNo = data.applicantMobileNo ?? data.ApplicantMobileNo ?? applicant.mobileNo ?? null;
    this.applicantHomeTelNo = data.applicantHomeTelNo ?? data.ApplicantHomeTelNo ?? applicant.homeTelNo ?? null;
    this.applicantOfficeTelNo = data.applicantOfficeTelNo ?? data.ApplicantOfficeTelNo ?? applicant.officeTelNo ?? null;

    this.applicantAddressNo = data.applicantAddressNo ?? data.ApplicantAddressNo ?? applicantAddress.no ?? null;
    this.applicantAddressLine1 = data.applicantAddressLine1 ?? data.ApplicantAddressLine1 ?? applicantAddress.line1 ?? null;
    this.applicantAddressLine2 = data.applicantAddressLine2 ?? data.ApplicantAddressLine2 ?? applicantAddress.line2 ?? null;
    this.applicantAddressCity = data.applicantAddressCity ?? data.ApplicantAddressCity ?? applicantAddress.city ?? null;
    this.applicantAddressState = data.applicantAddressState ?? data.ApplicantAddressState ?? applicantAddress.state ?? null;
    this.applicantAddressCountry = data.applicantAddressCountry ?? data.ApplicantAddressCountry ?? applicantAddress.country ?? null;

    this.donationAmount = coerceNumber(data.donationAmount ?? data.DonationAmount);
    this.defaultDonationAmount = coerceNumber(data.defaultDonationAmount ?? data.DefaultDonationAmount);

    this.churchId = data.churchId ?? data.ChurchId ?? null;
    this.userId = data.userId ?? data.UserId ?? null;
    this.requestSameBrick = !!(data.requestSameBrick || data.RequestSameBrick || data.isHusbandWife || data.IsHusbandWife);
    this.refDocType = data.refDocType || data.RefDocType || 'GOLA';

    this.remarks = data.remarks || data.Remarks || null;

    const rawDetails = data.details
      || data.detailList
      || data.EngraveWallApplicationDetailList
      || data.detailsList
      || [];

    this.details = Array.isArray(rawDetails)
      ? rawDetails.map(detail => new GateOfLifeApplicationDetail(detail)).filter(detail => detail.isValid())
      : [];
  }

  ensureDefaultDetail() {
    if (!this.details.length) {
      this.details.push(new GateOfLifeApplicationDetail({
        nameToEngrave: this.applicantName
      }));
    }
  }

  validate() {
    // Validations removed to support niche application style
    return {
      isValid: true,
      errors: []
    };
  }

  toJSON() {
    return {
      applicationId: this.applicationId,
      code: this.code,
      bookingDate: this.bookingDate,
      donation: {
        amount: this.donationAmount,
        defaultAmount: this.defaultDonationAmount
      },
      applicant: {
        name: this.applicantName,
        idNo: this.applicantIDNo,
        email: this.applicantEmailID,
        mobileNo: this.applicantMobileNo,
        homeTelNo: this.applicantHomeTelNo,
        officeTelNo: this.applicantOfficeTelNo,
        address: {
          no: this.applicantAddressNo,
          line1: this.applicantAddressLine1,
          line2: this.applicantAddressLine2,
          city: this.applicantAddressCity,
          state: this.applicantAddressState,
          country: this.applicantAddressCountry
        }
      },
      details: this.details.map(detail => detail.toJSON()),
      requestSameBrick: this.requestSameBrick,
      metadata: {
        churchId: this.churchId,
        userId: this.userId,
        refDocType: this.refDocType
      }
    };
  }
}

module.exports = GateOfLifeApplication;


