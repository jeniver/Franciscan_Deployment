const parseDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

class NicheConcentForm {
  constructor(data = {}) {
    const consentSelections = data.consentForms || data.consentSelections || NicheConcentForm.decodeConsentSelections(data.status ?? data.Status);
    const normalizedConsentForms = {
      firstBeneficiary: NicheConcentForm.normalizeConsentValue(consentSelections.firstBeneficiary),
      secondBeneficiary: NicheConcentForm.normalizeConsentValue(consentSelections.secondBeneficiary),
      twoBeneficiaries: NicheConcentForm.normalizeConsentValue(consentSelections.twoBeneficiaries)
    };

    this.nicheConcentFormId = data.nicheConcentFormId || data.NicheConcentFormId || null;
    this.status = data.status ?? data.Status ?? NicheConcentForm.encodeConsentSelections(normalizedConsentForms);
    this.appliedDate = parseDate(data.appliedDate || data.AppliedDate) || null;
    this.agreementDate = parseDate(data.agreementDate || data.AgreementDate) || null;
    this.applicantName = data.applicantName || data.ApplicantName || null;
    this.applicantIDNo = data.applicantIDNo || data.ApplicantIDNo || null;
    this.applicantRelationship = data.applicantRelationship || data.ApplicantRelationship || null;
    this.nicheId = data.nicheId || data.NicheId || null;
    this.nomineeName = data.nomineeName || data.NomineeName || null;
    this.nomineeIDNo = data.nomineeIDNo || data.NomineeIDNo || null;
    this.nomineeRelationship = data.nomineeRelationship || data.NomineeRelationship || null;
    this.nomineeName2 = data.nomineeName2 || data.NomineeName2 || null;
    this.nomineeIDNo2 = data.nomineeIDNo2 || data.NomineeIDNo2 || null;
    this.nomineeRelationship2 = data.nomineeRelationship2 || data.NomineeRelationship2 || null;
    this.code = data.code || data.Code || null;
    this.churchId = data.churchId || data.ChurchId || null;
    this.userId = data.userId || data.UserId || null;
    this.bene1Name = data.bene1Name || data.Bene1Name || null;
    this.bene1RelationshipToApplicant = data.bene1RelationshipToApplicant || data.Bene1RelationshipToApplicant || null;
    this.bene1IDNo = data.bene1IDNo || data.Bene1IDNo || null;
    this.bene2Name = data.bene2Name || data.Bene2Name || null;
    this.bene2RelationshipToApplicant = data.bene2RelationshipToApplicant || data.Bene2RelationshipToApplicant || null;
    this.bene2IDNo = data.bene2IDNo || data.Bene2IDNo || null;
    this.bene3Name = data.bene3Name || data.Bene3Name || null;
    this.bene3RelationshipToApplicant = data.bene3RelationshipToApplicant || data.Bene3RelationshipToApplicant || null;
    this.bene3IDNo = data.bene3IDNo || data.Bene3IDNo || null;
    this.consentForms = normalizedConsentForms;
  }

  static normalizeConsentValue(value) {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (['living', 'alive', 'yes', 'y', '1'].includes(normalized)) {
      return 'living';
    }
    if (['deceased', 'dead', 'passed', '2'].includes(normalized)) {
      return 'deceased';
    }
    if (['lostcapacity', 'lost_capacity', 'lost-capacity', 'lost capacity', 'incapacitated', '3'].includes(normalized)) {
      return 'lostCapacity';
    }

    return normalized;
  }

  static encodeConsentSelections(forms = {}) {
    const first = NicheConcentForm.mapConsent(forms.firstBeneficiary || forms.first);
    const second = NicheConcentForm.mapConsent(forms.secondBeneficiary || forms.second);
    const both = NicheConcentForm.mapConsent(forms.twoBeneficiaries || forms.both);

    return (first & 0xF) | ((second & 0xF) << 4) | ((both & 0xF) << 8);
  }

  static decodeConsentSelections(status) {
    if (status === undefined || status === null) {
      return {
        firstBeneficiary: null,
        secondBeneficiary: null,
        twoBeneficiaries: null
      };
    }

    const numeric = Number(status);
    if (Number.isNaN(numeric)) {
      return {
        firstBeneficiary: null,
        secondBeneficiary: null,
        twoBeneficiaries: null
      };
    }

    const decodeValue = (value) => {
      switch (value) {
        case 1:
          return 'Living';
        case 2:
          return 'Deceased';
        case 3:
          return 'Lost Capacity';
        default:
          return null;
      }
    };

    return {
      firstBeneficiary: decodeValue(numeric & 0xF),
      secondBeneficiary: decodeValue((numeric >> 4) & 0xF),
      twoBeneficiaries: decodeValue((numeric >> 8) & 0xF)
    };
  }

  static mapConsent(value) {
    const normalized = NicheConcentForm.normalizeConsentValue(value);

    switch (normalized) {
      case 'living':
        return 1;
      case 'deceased':
        return 2;
      case 'lostcapacity':
      case 'lost_capacity':
      case 'lost-capacity':
      case 'lost capacity':
        return 3;
      default:
        return 0;
    }
  }

  toJSON() {
    return {
      nicheConcentFormId: this.nicheConcentFormId,
      status: this.status,
      appliedDate: this.appliedDate,
      agreementDate: this.agreementDate,
      applicantName: this.applicantName,
      applicantIDNo: this.applicantIDNo,
      applicantRelationship: this.applicantRelationship,
      nicheId: this.nicheId,
      nomineeName: this.nomineeName,
      nomineeIDNo: this.nomineeIDNo,
      nomineeRelationship: this.nomineeRelationship,
      nomineeName2: this.nomineeName2,
      nomineeIDNo2: this.nomineeIDNo2,
      nomineeRelationship2: this.nomineeRelationship2,
      code: this.code,
      churchId: this.churchId,
      userId: this.userId,
      bene1Name: this.bene1Name,
      bene1RelationshipToApplicant: this.bene1RelationshipToApplicant,
      bene1IDNo: this.bene1IDNo,
      bene2Name: this.bene2Name,
      bene2RelationshipToApplicant: this.bene2RelationshipToApplicant,
      bene2IDNo: this.bene2IDNo,
      bene3Name: this.bene3Name,
      bene3RelationshipToApplicant: this.bene3RelationshipToApplicant,
      bene3IDNo: this.bene3IDNo,
      consentForms: this.consentForms
    };
  }

  validate() {
    const errors = [];

    if (!this.code) {
      errors.push('Application code is required');
    }

    if (!this.nicheId) {
      errors.push('Niche ID is required');
    }

    if (!this.churchId) {
      errors.push('Church ID is required');
    }

    if (!this.applicantName) {
      errors.push('Applicant name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toPersistence() {
    return {
      status: this.status,
      appliedDate: this.appliedDate || new Date(),
      agreementDate: this.agreementDate || new Date(),
      applicantName: this.applicantName,
      applicantIDNo: this.applicantIDNo,
      applicantRelationship: this.applicantRelationship,
      nicheId: this.nicheId,
      nomineeName: this.nomineeName,
      nomineeIDNo: this.nomineeIDNo,
      nomineeRelationship: this.nomineeRelationship,
      nomineeName2: this.nomineeName2,
      nomineeIDNo2: this.nomineeIDNo2,
      nomineeRelationship2: this.nomineeRelationship2,
      code: this.code,
      churchId: this.churchId,
      userId: this.userId,
      bene1Name: this.bene1Name,
      bene1RelationshipToApplicant: this.bene1RelationshipToApplicant,
      bene1IDNo: this.bene1IDNo,
      bene2Name: this.bene2Name,
      bene2RelationshipToApplicant: this.bene2RelationshipToApplicant,
      bene2IDNo: this.bene2IDNo,
      bene3Name: this.bene3Name,
      bene3RelationshipToApplicant: this.bene3RelationshipToApplicant,
      bene3IDNo: this.bene3IDNo
    };
  }
}

module.exports = NicheConcentForm;

