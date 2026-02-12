const NicheBookingRepository = require('../repositories/NicheBookingRepository');
const NicheApplicationRepository = require('../repositories/NicheApplicationRepository');
const PersonRepository = require('../repositories/PersonRepository');
const PersonService = require('./PersonService');
const MailService = require('./MailService');
const { NicheApplication, NicheApplicationBeneficiary } = require('../models/NicheApplication');
const NicheConcentForm = require('../models/NicheConcentForm');
const { NicheBookingBeneficiary, NicheBookingSearchParams } = require('../models/NicheBooking');
const NicheConcentFormRepository = require('../repositories/NicheConcentFormRepository');
const InvoiceRepository = require('../repositories/InvoiceRepository');
const ReceiptRepository = require('../repositories/ReceiptRepository');
const Invoice = require('../models/Invoice');
const InvoiceService = require('./InvoiceService');
const ItemRepository = require('../repositories/ItemRepository');
const ReceiptService = require('./ReceiptService');
const EngraveApplicationRepository = require('../repositories/EngraveApplicationRepository');
const { EngraveApplication, EngraveApplicationDetail } = require('../models/EngraveApplication');
const logger = require('../utils/logger');

const personRepository = new PersonRepository();
const personService = new PersonService(personRepository);
const invoiceRepository = new InvoiceRepository();
const invoiceService = new InvoiceService(invoiceRepository);
const itemRepository = new ItemRepository();
const receiptRepository = new ReceiptRepository();
const receiptService = new ReceiptService(receiptRepository);

const normalizePhone = (value) => {
  if (!value && value !== 0) return null;
  const str = String(value).trim();
  if (!str) return null;
  const cleaned = str.replace(/[^0-9+]/g, '');
  return cleaned || null;
};

const deriveIsCatholic = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (['catholic', 'roman catholic', 'rc', 'yes', 'true', 'y', '1'].includes(normalized)) return true;
  if (['non catholic', 'non-catholic', 'no', 'false', 'n', '0'].includes(normalized)) return false;
  return null;
};

const parseStatus = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  if (['active', '1', 'true', 'yes'].includes(normalized)) return 1;
  if (['inactive', '0', 'false', 'no'].includes(normalized)) return 0;
  return undefined;
};

const buildPersonPayload = (input = {}, churchId, extras = {}) => {
  const payload = {};

  const name = (input.name || input.fullName || input.contactName || null);
  const idNo = (input.idNo || input.nric || input.contactNric || null);

  if (name && String(name).trim()) payload.name = String(name).trim();
  if (idNo && String(idNo).trim()) payload.idNo = String(idNo).trim();

  const email =
    input.email ||
    input.emailID ||
    input.contactEmail ||
    input.applicantEmail ||
    null;
  if (email) payload.emailID = email;

  const mobile =
    normalizePhone(input.mobile || input.contactNumber || input.phone || input.contactPhone || input.applicantPhone);
  if (mobile) payload.mobileNo = mobile;

  const homeTel =
    normalizePhone(input.homeTel || input.homeTelNo || input.contactHomeTel || input.applicantHomeTel);
  if (homeTel) payload.homeTelNo = homeTel;

  const officeTel =
    normalizePhone(input.officeTel || input.officeTelNo || input.contactOfficeTel || input.applicantOfficeTel);
  if (officeTel) payload.officeTelNo = officeTel;

  const address =
    input.address ||
    input.addressLine1 ||
    input.contactAddress ||
    input.applicantAddress ||
    null;
  if (address) payload.addressLine1 = address;

  if (input.addressNo) payload.addressNo = input.addressNo;
  if (input.addressLine2) payload.addressLine2 = input.addressLine2;
  if (input.addressCity) payload.addressCity = input.addressCity;
  if (input.addressState) payload.addressState = input.addressState;
  if (input.addressCountry || input.country || extras.defaultCountry) {
    payload.addressCountry = input.addressCountry || input.country || extras.defaultCountry;
  }

  const remarks = input.remarks || input.contactRemarks || null;
  if (remarks) payload.remarks = remarks;

  const relationship = extras.relationshipToApplicant || input.relationshipToApplicant || input.relationship || null;
  if (relationship) payload.relationshipToApplicant = relationship;

  const isCatholic = deriveIsCatholic(input.religion || input.contactReligion || input.applicantReligion);
  if (isCatholic !== null) payload.isCatholic = isCatholic;

  const status = parseStatus(
    extras.status !== undefined
      ? extras.status
      : input.status || input.contactStatus || input.nomineeStatus
  );
  if (status !== undefined) payload.status = status;

  payload.churchId = churchId;

  return payload;
};

const mapPersonEntity = (person = {}) => {
  const get = (primary, secondary) => {
    if (person[primary] !== undefined && person[primary] !== null) return person[primary];
    if (secondary && person[secondary] !== undefined && person[secondary] !== null) return person[secondary];
    return null;
  };

  const addressParts = [
    get('addressNo', 'AddressNo'),
    get('addressLine1', 'AddressLine1'),
    get('addressLine2', 'AddressLine2'),
    get('addressCity', 'AddressCity'),
    get('addressState', 'AddressState'),
    get('addressCountry', 'AddressCountry')
  ].filter(Boolean);

  const isCatholicValue = get('isCatholic', 'IsCatholic');

  return {
    personId: get('personId', 'PersonId'),
    name: get('name', 'Name'),
    idNo: get('idNo', 'IDNo'),
    email: get('emailID', 'EmailID') || get('email', 'Email'),
    mobileNo: get('mobileNo', 'MobileNo'),
    homeTelNo: get('homeTelNo', 'HomeTelNo'),
    officeTelNo: get('officeTelNo', 'OfficeTelNo'),
    addressNo: get('addressNo', 'AddressNo'),
    addressLine1: get('addressLine1', 'AddressLine1'),
    addressLine2: get('addressLine2', 'AddressLine2'),
    addressCity: get('addressCity', 'AddressCity'),
    addressState: get('addressState', 'AddressState'),
    addressCountry: get('addressCountry', 'AddressCountry'),
    address: addressParts.join(', '),
    isCatholic: isCatholicValue === null || isCatholicValue === undefined ? null : Boolean(isCatholicValue),
    relationshipToApplicant: get('relationshipToApplicant', 'RelationshipToApplicant'),
    remarks: get('remarks', 'Remarks'),
    status: get('status', 'Status'),
    churchId: get('churchId', 'ChurchId')
  };
};

const parseGender = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (['male', 'm', '1', 'true', 'yes'].includes(normalized)) return true;
  if (['female', 'f', '0', 'false', 'no'].includes(normalized)) return false;
  return null;
};

const parseBeneficiaryStatus = (value) => {
  if (value === undefined || value === null) return 1;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return 1;
  if (['active', 'occupied', 'confirmed'].includes(normalized)) return 1;
  if (['inactive', 'not occupied', 'pending', 'available'].includes(normalized)) return 0;
  if (['deceased', 'released', 'closed'].includes(normalized)) return 2;
  return 1;
};

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
};

const buildBeneficiaryEntity = (input = {}, churchId) => {
  if (!input) {
    return null;
  }

  const name = (input.fullName || input.name || '').trim();
  if (!name) {
    return null;
  }

  const idNo = (input.nric || input.idNo || '').trim();
  const relationshipToApplicant = (input.relationship || input.relationshipToApplicant || '').trim() || 'Beneficiary';
  const relationshipToNominee1 = (input.relationshipToNominee1 || '').trim() || null;
  const relationshipToNominee2 = (input.relationshipToNominee2 || '').trim() || null;
  const dateOfBirth = parseDateValue(input.dateOfBirth);
  const birthYear = input.birthYear;  // No automatic conversion between dateOfBirth and birthYear
  const isMale = parseGender(
    input.isMale !== undefined ? input.isMale : input.sex
  );
  const isCatholic = input.isCatholic !== undefined
    ? Boolean(input.isCatholic)
    : deriveIsCatholic(input.religion);
  const beneficiaryStatus = parseBeneficiaryStatus(input.status);

  return {
    name,
    idNo: idNo || null,
    relationshipToApplicant,
    relationshipToNominee1,
    relationshipToNominee2,
    dateOfBirth,
    birthYear,
    isMale,
    isCatholic,
    beneficiaryStatus,
    churchId,
    personId: input.personId || null
  };
};

const pickFirst = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }

    return value;
  }

  return null;
};

const parseIntegerLike = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const candidate = String(value).trim();
  if (!candidate) {
    return null;
  }

  const numericMatch = candidate.match(/-?\d+/);
  if (!numericMatch) {
    return null;
  }

  const parsed = Number(numericMatch[0]);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};

const resolveNicheIdFromPayload = (payload = {}) => {
  const candidates = [
    payload.nicheId,
    payload.niche?.nicheId,
    payload.niche?.id,
    payload.nicheDetails?.nicheId,
    payload.nicheDetails?.nicheCode,
    payload.nicheCode,
    payload.niche?.code,
    payload.niche?.nicheCode,
    payload.nicheDetails?.id
  ];

  for (const candidate of candidates) {
    const parsed = parseIntegerLike(candidate);
    if (parsed && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const buildApplicationEntitiesFromBooking = ({
  bookingData = {},
  user,
  resolvedNicheId,
  contactPerson,
  contactInput,
  nominee,
  primaryNomineeInput,
  nominee2,
  secondaryNomineeInput,
  beneficiaryRecords
}) => {
  const appliedDate = parseDateValue(bookingData.appliedDate) || new Date();
  const agreementDate = parseDateValue(bookingData.agreementDate || bookingData.bookedDate) || new Date();

  const applicantName = pickFirst(
    contactPerson?.name,
    bookingData.applicantName,
    contactInput?.fullName,
    contactInput?.name
  );
  const applicantIDNo = pickFirst(
    contactPerson?.idNo,
    bookingData.applicantIDNo,
    contactInput?.nric,
    contactInput?.idNo
  );

  if (!applicantName || !applicantIDNo) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Applicant name and NRIC/FIN are required to create the niche application'
      }
    };
  }

  const nomineeName = pickFirst(
    nominee?.name,
    primaryNomineeInput?.fullName,
    primaryNomineeInput?.name,
    bookingData.nomineeName
  );
  const nomineeIDNo = pickFirst(
    nominee?.idNo,
    primaryNomineeInput?.nric,
    primaryNomineeInput?.idNo,
    bookingData.nomineeIDNo
  );

  if (!nomineeName || !nomineeIDNo) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Primary nominee name and NRIC/FIN are required to create the niche application'
      }
    };
  }

  const applicantIsCatholic = contactPerson?.isCatholic !== undefined && contactPerson?.isCatholic !== null
    ? contactPerson.isCatholic
    : deriveIsCatholic(bookingData.applicantReligion || contactInput?.religion);

  const nomineeIsCatholic = nominee?.isCatholic !== undefined && nominee?.isCatholic !== null
    ? nominee.isCatholic
    : deriveIsCatholic(primaryNomineeInput?.religion);

  const nominee2IsCatholic = nominee2?.isCatholic !== undefined && nominee2?.isCatholic !== null
    ? nominee2.isCatholic
    : deriveIsCatholic(secondaryNomineeInput?.religion);

  const application = new NicheApplication({
    nicheId: resolvedNicheId,
    appliedDate,
    agreementDate,
    status: 1,
    amount: Number(bookingData.amount || bookingData.nicheDetails?.amount || bookingData.nicheDetails?.price || 0) || 0,
    defaultAmount: Number(bookingData.nicheDetails?.price || bookingData.amount || 0) || 0,
    applicantName,
    applicantIDNo,
    applicantEmailID: pickFirst(contactPerson?.email, bookingData.applicantEmail, contactInput?.email),
    applicantMobileNo: pickFirst(
      contactPerson?.mobileNo,
      normalizePhone(bookingData.applicantPhone),
      normalizePhone(contactInput?.contactPhone),
      normalizePhone(contactInput?.mobile),
      normalizePhone(contactInput?.mobileNo)
    ),
    applicantHomeTelNo: pickFirst(
      contactPerson?.homeTelNo,
      normalizePhone(bookingData.applicantHomeTel),
      normalizePhone(contactInput?.homeTelNo),
      normalizePhone(contactInput?.homeTel)
    ),
    applicantOfficeTelNo: pickFirst(
      contactPerson?.officeTelNo,
      normalizePhone(bookingData.applicantOfficeTel),
      normalizePhone(contactInput?.officeTelNo),
      normalizePhone(contactInput?.officeTel)
    ),
    applicantIsCatholic,
    applicantAddressNo: pickFirst(contactPerson?.addressNo, contactInput?.addressNo),
    applicantAddressLine1: pickFirst(
      contactPerson?.addressLine1,
      contactInput?.addressLine1,
      contactInput?.address,
      bookingData.applicantAddress
    ),
    applicantAddressLine2: pickFirst(contactPerson?.addressLine2, contactInput?.addressLine2),
    applicantAddressCity: pickFirst(contactPerson?.addressCity, contactInput?.addressCity),
    applicantAddressState: pickFirst(contactPerson?.addressState, contactInput?.addressState),
    applicantAddressCountry: pickFirst(
      contactPerson?.addressCountry,
      contactInput?.addressCountry,
      contactInput?.country,
      bookingData.applicantCountry
    ),
    nomineeName,
    nomineeIDNo,
    nomineeEmailID: pickFirst(nominee?.email, primaryNomineeInput?.email, bookingData.nomineeEmail),
    nomineeMobileNo: pickFirst(
      nominee?.mobileNo,
      normalizePhone(primaryNomineeInput?.contactNumber),
      normalizePhone(primaryNomineeInput?.mobileNo),
      normalizePhone(bookingData.nomineePhone)
    ),
    nomineeHomeTelNo: pickFirst(
      nominee?.homeTelNo,
      normalizePhone(primaryNomineeInput?.homeTelNo),
      normalizePhone(primaryNomineeInput?.homeTel)
    ),
    nomineeOfficeTelNo: pickFirst(
      nominee?.officeTelNo,
      normalizePhone(primaryNomineeInput?.officeTelNo),
      normalizePhone(primaryNomineeInput?.officeTel)
    ),
    nomineeRelationship: pickFirst(
      primaryNomineeInput?.relationship,
      bookingData.nomineeRelationship,
      nominee?.relationshipToApplicant
    ),
    nomineeIsCatholic,
    nomineeAddressNo: pickFirst(nominee?.addressNo, primaryNomineeInput?.addressNo),
    nomineeAddressLine1: pickFirst(
      nominee?.addressLine1,
      primaryNomineeInput?.addressLine1,
      primaryNomineeInput?.address
    ),
    nomineeAddressLine2: pickFirst(nominee?.addressLine2, primaryNomineeInput?.addressLine2),
    nomineeAddressCity: pickFirst(nominee?.addressCity, primaryNomineeInput?.addressCity),
    nomineeAddressState: pickFirst(nominee?.addressState, primaryNomineeInput?.addressState),
    nomineeAddressCountry: pickFirst(
      nominee?.addressCountry,
      primaryNomineeInput?.addressCountry,
      primaryNomineeInput?.country
    ),
    nomineeName2: pickFirst(nominee2?.name, secondaryNomineeInput?.fullName, secondaryNomineeInput?.name),
    nomineeIDNo2: pickFirst(nominee2?.idNo, secondaryNomineeInput?.nric, secondaryNomineeInput?.idNo),
    nomineeEmailID2: pickFirst(nominee2?.email, secondaryNomineeInput?.email),
    nomineeMobileNo2: pickFirst(
      nominee2?.mobileNo,
      normalizePhone(secondaryNomineeInput?.contactNumber),
      normalizePhone(secondaryNomineeInput?.mobileNo)
    ),
    nomineeHomeTelNo2: pickFirst(
      nominee2?.homeTelNo,
      normalizePhone(secondaryNomineeInput?.homeTelNo),
      normalizePhone(secondaryNomineeInput?.homeTel)
    ),
    nomineeOfficeTelNo2: pickFirst(
      nominee2?.officeTelNo,
      normalizePhone(secondaryNomineeInput?.officeTelNo),
      normalizePhone(secondaryNomineeInput?.officeTel)
    ),
    nomineeRelationship2: pickFirst(
      secondaryNomineeInput?.relationship,
      nominee2?.relationshipToApplicant
    ),
    nomineeIsCatholic2: nominee2IsCatholic,
    nomineeAddressNo2: pickFirst(nominee2?.addressNo, secondaryNomineeInput?.addressNo),
    nomineeAddressLine12: pickFirst(
      nominee2?.addressLine1,
      secondaryNomineeInput?.addressLine1,
      secondaryNomineeInput?.address
    ),
    nomineeAddressLine22: pickFirst(nominee2?.addressLine2, secondaryNomineeInput?.addressLine2),
    nomineeAddressCity2: pickFirst(nominee2?.addressCity, secondaryNomineeInput?.addressCity),
    nomineeAddressState2: pickFirst(nominee2?.addressState, secondaryNomineeInput?.addressState),
    nomineeAddressCountry2: pickFirst(
      nominee2?.addressCountry,
      secondaryNomineeInput?.addressCountry,
      secondaryNomineeInput?.country
    ),
    churchId: user.churchId,
    userId: user.userId || null,
    remarks: bookingData.remarks || contactInput?.remarks || null
  });

  const appValidation = application.validate();
  if (!appValidation.isValid) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: `Application validation failed: ${appValidation.errors.join(', ')}`
      }
    };
  }

  const applicationBeneficiaries = beneficiaryRecords.slice(0, 3).map((record) => {
    const entity = record.entity || {};
    // Process dateOfBirth and birthYear properly
    let dateOfBirth = entity.dateOfBirth instanceof Date
      ? entity.dateOfBirth
      : parseDateValue(entity.dateOfBirth);
    let birthYear = entity.birthYear;

    return new NicheApplicationBeneficiary({
      name: entity.name,
      relationshipToApplicant: entity.relationshipToApplicant,
      dateOfBirth: dateOfBirth,
      birthYear: birthYear,
      idNo: entity.idNo,
      isCatholic: entity.isCatholic,
      isMale: entity.isMale
    });
  });

  for (const beneficiary of applicationBeneficiaries) {
    const validation = beneficiary.validate();
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: `Beneficiary validation failed: ${validation.errors.join(', ')}`
        }
      };
    }
  }

  return {
    success: true,
    application,
    beneficiaries: applicationBeneficiaries
  };
};

const buildConsentFormEntity = ({
  code,
  bookingData = {},
  application,
  contactPerson,
  nominee,
  nominee2,
  beneficiaryRecords = [],
  user,
  applicationNicheId,
  primaryNomineeInput,
  secondaryNomineeInput
}) => {
  if (!code || !applicationNicheId || !contactPerson) {
    return null;
  }

  const consentFormsInput = bookingData.consentForms || {};
  const normalizedForms = {
    firstBeneficiary: NicheConcentForm.normalizeConsentValue(consentFormsInput.firstBeneficiary),
    secondBeneficiary: NicheConcentForm.normalizeConsentValue(consentFormsInput.secondBeneficiary),
    twoBeneficiaries: NicheConcentForm.normalizeConsentValue(consentFormsInput.twoBeneficiaries)
  };

  if (
    !normalizedForms.firstBeneficiary &&
    !normalizedForms.secondBeneficiary &&
    !normalizedForms.twoBeneficiaries
  ) {
    return null;
  }

  const beneficiaryEntities = beneficiaryRecords
    .filter(record => record && record.entity)
    .map(record => record.entity)
    .slice(0, 3);

  const bene1 = beneficiaryEntities[0] || {};
  const bene2 = beneficiaryEntities[1] || {};
  const bene3 = beneficiaryEntities[2] || {};

  return new NicheConcentForm({
    nicheConcentFormId: bookingData.nicheConcentFormId || bookingData.consentFormId,
    code,
    status: NicheConcentForm.encodeConsentSelections(normalizedForms),
    appliedDate: application?.appliedDate || bookingData.appliedDate || new Date(),
    agreementDate: application?.agreementDate || bookingData.bookedDate || new Date(),
    applicantName: contactPerson.name,
    applicantIDNo: contactPerson.idNo,
    applicantRelationship: contactPerson.relationshipToApplicant || 'Applicant',
    nicheId: applicationNicheId,
    nomineeName: nominee?.name || null,
    nomineeIDNo: nominee?.idNo || null,
    nomineeRelationship: primaryNomineeInput?.relationship || nominee?.relationshipToApplicant || null,
    nomineeName2: nominee2?.name || null,
    nomineeIDNo2: nominee2?.idNo || null,
    nomineeRelationship2: secondaryNomineeInput?.relationship || nominee2?.relationshipToApplicant || null,
    bene1Name: bene1.name || null,
    bene1RelationshipToApplicant: bene1.relationshipToApplicant || null,
    bene1IDNo: bene1.idNo || null,
    bene2Name: bene2.name || null,
    bene2RelationshipToApplicant: bene2.relationshipToApplicant || null,
    bene2IDNo: bene2.idNo || null,
    bene3Name: bene3.name || null,
    bene3RelationshipToApplicant: bene3.relationshipToApplicant || null,
    bene3IDNo: bene3.idNo || null,
    churchId: user.churchId,
    userId: user.userId || null,
    consentForms: normalizedForms
  });
};

class NicheBookingService {
  /**
   * Get niche booking by application code
   * @param {string} applicationCode - Application code
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Booking data
   */
  async getBookingByApplicationCode(applicationCode, churchId) {
    try {
      const booking = await NicheBookingRepository.getByApplicationCode(applicationCode);

      if (!booking) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Niche booking not found'
          }
        };
      }

      // Check church ACL
      if (booking.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      return {
        success: true,
        data: booking.toJSON()
      };
    } catch (error) {
      logger.error('Service: Failed to get niche booking:', error);
      throw error;
    }
  }

  /**
   * Search niche bookings
   * @param {Object} searchCriteria - Search parameters
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Search results
   */
  async searchBookings(searchCriteria, churchId) {
    try {
      const searchParams = new NicheBookingSearchParams(searchCriteria);

      // Override with user's church ID
      searchParams.churchId = churchId;

      // Check if any search criteria provided
      if (!searchParams.hasAnySearchCriteria()) {
        return {
          success: false,
          error: {
            code: 'EMPTY_PARAMETERS',
            message: 'At least one search parameter is required'
          }
        };
      }

      const bookings = await NicheBookingRepository.search(searchParams);

      return {
        success: true,
        data: bookings,
        count: bookings.length
      };
    } catch (error) {
      logger.error('Service: Failed to search niche bookings:', error);
      throw error;
    }
  }

  /**
   * Update beneficiary details
   * @param {Object} beneficiaryData - Beneficiary data
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Update result
   */
  async updateBeneficiary(beneficiaryData, churchId) {
    try {
      const beneficiary = new NicheBookingBeneficiary(beneficiaryData);

      // Validate
      const validation = beneficiary.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: validation.errors.join(', ')
          }
        };
      }

      // Check church access via beneficiary's church ID
      if (beneficiary.churchId && beneficiary.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      await NicheBookingRepository.updateBeneficiary(beneficiary);

      return {
        success: true,
        message: 'Beneficiary updated successfully'
      };
    } catch (error) {
      logger.error('Service: Failed to update beneficiary:', error);
      throw error;
    }
  }

  /**
   * Update beneficiary status (activate)
   * @param {Object} beneficiaryData - Beneficiary data
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Update result
   */
  async activateBeneficiary(beneficiaryData, churchId) {
    try {
      const beneficiary = new NicheBookingBeneficiary(beneficiaryData);

      if (beneficiary.churchId && beneficiary.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      await NicheBookingRepository.updateBeneficiaryStatus(
        beneficiary.nicheBookingBeneficiaryId,
        1 // Active
      );

      return {
        success: true,
        message: 'Beneficiary activated successfully'
      };
    } catch (error) {
      logger.error('Service: Failed to activate beneficiary:', error);
      throw error;
    }
  }

  /**
   * Update beneficiary status (deactivate)
   * @param {Object} beneficiaryData - Beneficiary data
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Update result
   */
  async deactivateBeneficiary(beneficiaryData, churchId) {
    try {
      const beneficiary = new NicheBookingBeneficiary(beneficiaryData);

      if (beneficiary.churchId && beneficiary.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      await NicheBookingRepository.updateBeneficiaryStatus(
        beneficiary.nicheBookingBeneficiaryId,
        0 // Inactive
      );

      return {
        success: true,
        message: 'Beneficiary deactivated successfully'
      };
    } catch (error) {
      logger.error('Service: Failed to deactivate beneficiary:', error);
      throw error;
    }
  }

  /**
   * Add second beneficiary
   * @param {Object} beneficiaryData - Beneficiary data
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Creation result
   */
  async addSecondBeneficiary(beneficiaryData, churchId) {
    try {
      const beneficiary = new NicheBookingBeneficiary(beneficiaryData);

      // Validate
      const validation = beneficiary.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: validation.errors.join(', ')
          }
        };
      }

      // Set church ID
      beneficiary.churchId = churchId;

      const beneficiaryId = await NicheBookingRepository.addBeneficiary(beneficiary);

      return {
        success: true,
        data: {
          beneficiaryId
        },
        message: 'Second beneficiary added successfully'
      };
    } catch (error) {
      logger.error('Service: Failed to add second beneficiary:', error);
      throw error;
    }
  }

  /**
   * Delete niche booking
   * @param {string} applicationCode - Application code
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBooking(applicationCode, churchId) {
    try {
      // Get booking first to check church access
      const booking = await NicheBookingRepository.getByApplicationCode(applicationCode);

      if (!booking) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Niche booking not found'
          }
        };
      }

      if (booking.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      await NicheBookingRepository.deleteByApplicationCode(applicationCode);

      return {
        success: true,
        message: 'Niche booking deleted successfully'
      };
    } catch (error) {
      logger.error('Service: Failed to delete niche booking:', error);
      throw error;
    }
  }

  /**
   * Get booking by niche ID
   * @param {number} nicheId - Niche ID
   * @returns {Promise<Object>} Booking data or null
   */
  async getBookingByNicheId(nicheId) {
    try {
      const booking = await NicheBookingRepository.getByNicheId(nicheId);

      if (!booking) {
        return {
          success: true,
          data: null,
          message: 'No booking found for this niche'
        };
      }

      return {
        success: true,
        data: booking.toJSON()
      };
    } catch (error) {
      logger.error('Service: Failed to get booking by niche ID:', error);
      throw error;
    }
  }

  async createBooking(data, user) {
    try {
      const errors = [];

      if (!data || Object.keys(data).length === 0) {
        errors.push('Request body is required');
      }

      const hasApplicationCode = Boolean(data?.nicheApplicationCode);
      const payloadNicheIdCandidate = resolveNicheIdFromPayload(data);

      if (!hasApplicationCode && !payloadNicheIdCandidate) {
        errors.push('Niche selection is required');
      }

      const hasContactInfo = data?.contactPersonId || data?.contact || data?.contactPerson;
      const hasNomineeInfo =
        data?.nomineeId ||
        (Array.isArray(data?.nominees) && data.nominees.length > 0) ||
        data?.nominee;

      if (!hasContactInfo) {
        errors.push('Contact person details are required');
      }

      if (!hasNomineeInfo) {
        errors.push('Primary nominee details are required');
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: errors.join(', ')
          }
        };
      }

      let nicheApplicationCode = hasApplicationCode ? String(data.nicheApplicationCode).trim() : null;
      let application = null;
      let applicationNicheId = payloadNicheIdCandidate || null;
      let applicationIdNumeric = null;
      let applicationWasCreatedInThisRequest = false;

      if (nicheApplicationCode) {
        application = await NicheApplicationRepository.getByCode(nicheApplicationCode);

        if (!application) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Niche application not found'
            }
          };
        }

        if (application.churchId !== user.churchId) {
          return {
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'Access denied - Church ID mismatch'
            }
          };
        }

        const resolvedFromApplication =
          application.nicheId ??
          application.NicheId ??
          application.niche?.nicheId ??
          application.niche?.NicheId;

        const parsedNicheFromApplication = parseIntegerLike(resolvedFromApplication);
        if (parsedNicheFromApplication && parsedNicheFromApplication > 0) {
          applicationNicheId = parsedNicheFromApplication;
        }

        if (!applicationNicheId || applicationNicheId <= 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_APPLICATION',
              message: 'Niche application is missing niche selection'
            }
          };
        }

        const resolvedApplicationId =
          application.nicheApplicationId ??
          application.NicheApplicationId ??
          data.nicheApplicationId ??
          data.applicationId;

        applicationIdNumeric = parseIntegerLike(resolvedApplicationId);
        if (!applicationIdNumeric || applicationIdNumeric <= 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_APPLICATION',
              message: 'Niche application identifier is invalid'
            }
          };
        }

        if (application.status >= 3) {
          return {
            success: false,
            error: {
              code: 'APPLICATION_LOCKED',
              message: 'Niche application is already booked or completed'
            }
          };
        }

        if (payloadNicheIdCandidate && payloadNicheIdCandidate !== applicationNicheId) {
          return {
            success: false,
            error: {
              code: 'NICHE_MISMATCH',
              message: 'Provided niche selection does not match the application'
            }
          };
        }
      } else if (!applicationNicheId || applicationNicheId <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_APPLICATION',
            message: 'Niche selection is required'
          }
        };
      }

      const existingNicheBooking = await NicheBookingRepository.getByNicheId(applicationNicheId);
      if (existingNicheBooking) {
        return {
          success: false,
          error: {
            code: 'NICHE_ALREADY_BOOKED',
            message: 'Selected niche is already booked'
          }
        };
      }

      if (applicationIdNumeric) {
        const existingApplicationBooking = await NicheBookingRepository.hasActiveBookingForApplication(applicationIdNumeric);
        if (existingApplicationBooking) {
          const existingApplicationCode =
            existingApplicationBooking.Code ||
            existingApplicationBooking.ApplicationCode ||
            nicheApplicationCode;
          return {
            success: false,
            error: {
              code: 'DUPLICATE_BOOKING',
              message: 'An active booking already exists for this application',
              details: {
                bookingCode: existingApplicationCode
              }
            }
          };
        }
      }

      const contactInput = data.contact || data.contactPerson || null;
      const nomineesInput = Array.isArray(data.nominees) ? data.nominees : [];
      const beneficiariesInput = Array.isArray(data.beneficiaries) ? data.beneficiaries : [];
      const primaryNomineeInput = nomineesInput.length > 0
        ? nomineesInput[0]
        : (data.nominee || null);
      const secondaryNomineeInput = nomineesInput.length > 1 ? nomineesInput[1] : null;

      let contactPerson = null;
      if (data.contactPersonId) {
        const contactPersonRow = await NicheBookingRepository.getPersonById(data.contactPersonId);
        if (!contactPersonRow) {
          return {
            success: false,
            error: {
              code: 'CONTACT_NOT_FOUND',
              message: 'Contact person not found'
            }
          };
        }
        contactPerson = mapPersonEntity(contactPersonRow);
      } else if (contactInput) {
        const contactPayload = buildPersonPayload(contactInput, user.churchId, {
          relationshipToApplicant: 'Applicant',
          defaultCountry: contactInput.country || contactInput.contactCountry,
          status: contactInput.status || contactInput.contactStatus
        });

        try {
          const upsertedContact = await personService.upsertByIdNo(contactPayload);
          contactPerson = mapPersonEntity(upsertedContact);
        } catch (personError) {
          if (personError.code === 'PERSON_VALIDATION_FAILED') {
            return {
              success: false,
              error: {
                code: 'VALIDATION_FAILED',
                message: personError.message
              }
            };
          }
          throw personError;
        }
      } else {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Contact person details are required'
          }
        };
      }

      if (contactPerson.churchId && contactPerson.churchId !== user.churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Contact person belongs to a different church'
          }
        };
      }

      if (!contactPerson.name || !contactPerson.idNo) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Contact person name and NRIC/FIN are required'
          }
        };
      }

      const contactPersonId = Number(contactPerson.personId);
      if (!contactPersonId) {
        return {
          success: false,
          error: {
            code: 'CONTACT_NOT_FOUND',
            message: 'Failed to resolve contact person record'
          }
        };
      }

      let nominee = null;
      if (data.nomineeId) {
        const nomineeRow = await NicheBookingRepository.getPersonById(data.nomineeId);
        if (!nomineeRow) {
          return {
            success: false,
            error: {
              code: 'NOMINEE_NOT_FOUND',
              message: 'Nominee person not found'
            }
          };
        }
        nominee = mapPersonEntity(nomineeRow);
      } else if (primaryNomineeInput) {
        const primaryPayload = buildPersonPayload(primaryNomineeInput, user.churchId, {
          relationshipToApplicant: primaryNomineeInput.relationship || 'Nominee',
          defaultCountry: primaryNomineeInput.country || primaryNomineeInput.addressCountry,
          status: primaryNomineeInput.status || primaryNomineeInput.nomineeStatus
        });

        try {
          const upsertedNominee = await personService.upsertByIdNo(primaryPayload);
          nominee = mapPersonEntity(upsertedNominee);
        } catch (personError) {
          if (personError.code === 'PERSON_VALIDATION_FAILED') {
            return {
              success: false,
              error: {
                code: 'VALIDATION_FAILED',
                message: personError.message
              }
            };
          }
          throw personError;
        }
      } else {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Primary nominee details are required'
          }
        };
      }

      if (nominee.churchId && nominee.churchId !== user.churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Nominee belongs to a different church'
          }
        };
      }

      const nomineeId = Number(nominee.personId);
      if (!nomineeId) {
        return {
          success: false,
          error: {
            code: 'NOMINEE_NOT_FOUND',
            message: 'Failed to resolve nominee record'
          }
        };
      }

      if (!nominee.name || !nominee.idNo) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Primary nominee name and NRIC/FIN are required'
          }
        };
      }

      let nominee2 = null;
      if (data.nomineeId2) {
        const nominee2Row = await NicheBookingRepository.getPersonById(data.nomineeId2);
        if (!nominee2Row) {
          return {
            success: false,
            error: {
              code: 'NOMINEE2_NOT_FOUND',
              message: 'Secondary nominee person not found'
            }
          };
        }
        nominee2 = mapPersonEntity(nominee2Row);

        if (nominee2.churchId && nominee2.churchId !== user.churchId) {
          return {
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'Secondary nominee belongs to a different church'
            }
          };
        }
      } else if (secondaryNomineeInput && (secondaryNomineeInput.nric || secondaryNomineeInput.idNo || secondaryNomineeInput.fullName)) {
        const secondaryPayload = buildPersonPayload(secondaryNomineeInput, user.churchId, {
          relationshipToApplicant: secondaryNomineeInput.relationship || 'Secondary Nominee',
          defaultCountry: secondaryNomineeInput.country || secondaryNomineeInput.addressCountry,
          status: secondaryNomineeInput.status || secondaryNomineeInput.nomineeStatus
        });

        try {
          const upsertedNominee2 = await personService.upsertByIdNo(secondaryPayload);
          nominee2 = mapPersonEntity(upsertedNominee2);
        } catch (personError) {
          if (personError.code === 'PERSON_VALIDATION_FAILED') {
            return {
              success: false,
              error: {
                code: 'VALIDATION_FAILED',
                message: personError.message
              }
            };
          }
          throw personError;
        }

        if (nominee2.churchId && nominee2.churchId !== user.churchId) {
          return {
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'Secondary nominee belongs to a different church'
            }
          };
        }
      }

      const beneficiaryRecords = [];
      for (const [index, beneficiaryInput] of beneficiariesInput.entries()) {
        const beneficiaryEntity = buildBeneficiaryEntity(beneficiaryInput, user.churchId);

        if (!beneficiaryEntity) {
          continue;
        }

        let beneficiaryPerson = null;
        if (beneficiaryEntity.idNo) {
          const beneficiaryPersonPayload = buildPersonPayload(beneficiaryInput, user.churchId, {
            relationshipToApplicant: beneficiaryEntity.relationshipToApplicant || 'Beneficiary',
            status: beneficiaryEntity.beneficiaryStatus
          });

          try {
            const upsertedBeneficiaryPerson = await personService.upsertByIdNo(beneficiaryPersonPayload);
            beneficiaryPerson = mapPersonEntity(upsertedBeneficiaryPerson);
            beneficiaryEntity.personId = beneficiaryPerson.personId;
          } catch (personError) {
            if (personError.code === 'PERSON_VALIDATION_FAILED') {
              return {
                success: false,
                error: {
                  code: 'VALIDATION_FAILED',
                  message: `Beneficiary validation failed for entry ${index + 1}: ${personError.message}`
                }
              };
            }
            throw personError;
          }
        }

        beneficiaryRecords.push({
          index,
          entity: beneficiaryEntity,
          person: beneficiaryPerson
        });
      }

      const duplicateContact = await NicheBookingRepository.hasActiveBookingForPerson(
        contactPerson.name,
        contactPerson.idNo,
        user.churchId
      );

      if (duplicateContact) {
        const duplicateContactCode = duplicateContact.Code || duplicateContact.ApplicationCode || nicheApplicationCode;
        return {
          success: false,
          error: {
            code: 'DUPLICATE_PERSON',
            message: 'An active booking already exists for this contact person',
            details: {
              bookingCode: duplicateContactCode
            }
          }
        };
      }

      const duplicateNominee = await NicheBookingRepository.hasActiveBookingForPerson(
        nominee.name,
        nominee.idNo,
        user.churchId
      );

      if (duplicateNominee) {
        const duplicateNomineeCode = duplicateNominee.Code || duplicateNominee.ApplicationCode || nicheApplicationCode;
        return {
          success: false,
          error: {
            code: 'DUPLICATE_PERSON',
            message: 'An active booking already exists for this nominee',
            details: {
              bookingCode: duplicateNomineeCode
            }
          }
        };
      }

      if (application) {
        nicheApplicationCode = application.code || application.Code || nicheApplicationCode;
      }

      if (!application) {
        const applicationBuildResult = buildApplicationEntitiesFromBooking({
          bookingData: data,
          user,
          resolvedNicheId: applicationNicheId,
          contactPerson,
          contactInput,
          nominee,
          primaryNomineeInput,
          nominee2,
          secondaryNomineeInput,
          beneficiaryRecords
        });

        if (!applicationBuildResult.success) {
          return {
            success: false,
            error: applicationBuildResult.error
          };
        }

        const {
          application: applicationEntity,
          beneficiaries: applicationBeneficiaries
        } = applicationBuildResult;

        try {
          const createdCode = await NicheApplicationRepository.create(applicationEntity, applicationBeneficiaries);
          nicheApplicationCode = createdCode;
          applicationWasCreatedInThisRequest = true;

          const createdApplication = await NicheApplicationRepository.getByCode(createdCode);
          application = createdApplication || applicationEntity;
          if (!application.code && createdCode) {
            application.code = createdCode;
          }
        } catch (applicationError) {
          logger.error('Failed to create niche application during booking creation:', applicationError);
          throw applicationError;
        }

        applicationNicheId = parseIntegerLike(
          application.nicheId ??
          application.NicheId ??
          application.niche?.nicheId ??
          application.niche?.NicheId
        ) || applicationNicheId;

        applicationIdNumeric = parseIntegerLike(
          application.nicheApplicationId ??
          application.NicheApplicationId
        );

        if (!applicationIdNumeric || applicationIdNumeric <= 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_APPLICATION',
              message: 'Failed to resolve niche application identifier after creation'
            }
          };
        }

        if (application.churchId && application.churchId !== user.churchId) {
          return {
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'Created application belongs to a different church'
            }
          };
        }
      }

      if (!application) {
        return {
          success: false,
          error: {
            code: 'INVALID_APPLICATION',
            message: 'Unable to resolve niche application details for booking'
          }
        };
      }

      if (!applicationIdNumeric || applicationIdNumeric <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_APPLICATION',
            message: 'Niche application identifier is missing'
          }
        };
      }

      const bookedDate = data.bookedDate ? new Date(data.bookedDate) : new Date();
      if (Number.isNaN(bookedDate.getTime())) {
        return {
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: 'Booked date is invalid'
          }
        };
      }

      const nominee2Id = nominee2 ? Number(nominee2.personId) || null : null;

      const bookingPayload = {
        nicheApplicationId: applicationIdNumeric,
        nicheId: applicationNicheId,
        contactPersonId,
        nomineeId,
        nomineeId2: nominee2Id,
        bookedDate,
        remarks: data.remarks || null,
        bookingStatus: 1,
        churchId: user.churchId,
        userId: user.userId || null
      };

      let created;
      try {
        created = await NicheBookingRepository.createBooking(bookingPayload);
      } catch (bookingError) {
        if (applicationWasCreatedInThisRequest && nicheApplicationCode) {
          await NicheApplicationRepository.deleteByCode(nicheApplicationCode).catch((cleanupError) => {
            logger.warn(`Failed to roll back application ${nicheApplicationCode} after booking error:`, cleanupError.message);
          });
        }
        throw bookingError;
      }

      const bookingCode = created.code || application.code || nicheApplicationCode;

      const bookingSummary = {
        id: created.id,
        code: bookingCode,
        bookedDate
      };

      const persistedBeneficiaries = [];

      if (beneficiaryRecords.length > 0) {
        try {
          for (const record of beneficiaryRecords) {
            const insertPayload = {
              ...record.entity,
              nicheBookingId: created.id,
              churchId: user.churchId
            };

            const beneficiaryId = await NicheBookingRepository.addBeneficiary(insertPayload);
            const serializedEntity = {
              ...record.entity,
              nicheBookingId: created.id,
              personId: insertPayload.personId || null,
              dateOfBirth: record.entity.dateOfBirth instanceof Date
                ? record.entity.dateOfBirth.toISOString()
                : record.entity.dateOfBirth,
              beneficiaryStatus: record.entity.beneficiaryStatus
            };

            persistedBeneficiaries.push({
              ...serializedEntity,
              nicheBookingBeneficiaryId: beneficiaryId,
              person: record.person
            });
          }
        } catch (beneficiaryError) {
          logger.error('Failed to persist beneficiaries for new booking:', beneficiaryError);

          const rollbackCode = application.code || nicheApplicationCode;
          await NicheBookingRepository.deleteByApplicationCode(rollbackCode).catch((rollbackError) => {
            logger.error('Rollback attempt after beneficiary failure was unsuccessful:', rollbackError);
          });

          return {
            success: false,
            error: {
              code: 'BENEFICIARY_SAVE_FAILED',
              message: beneficiaryError.message || 'Failed to save beneficiary details for the booking'
            }
          };
        }
      }

      let consentFormRecord = null;

      if (data.consentForms && Object.keys(data.consentForms).length > 0) {
        try {
          const consentEntity = buildConsentFormEntity({
            code: nicheApplicationCode || (application && (application.code || application.Code)),
            bookingData: data,
            application,
            contactPerson,
            nominee,
            nominee2,
            beneficiaryRecords,
            user,
            applicationNicheId,
            primaryNomineeInput,
            secondaryNomineeInput
          });

          if (consentEntity) {
            consentFormRecord = await NicheConcentFormRepository.upsert(consentEntity);
          }
        } catch (consentError) {
          logger.error('Failed to persist consent form details:', consentError);
        }
      }

      // ---------------------------------------------------------------------
      // Auto-create inscription application (NicheInscriptionRequest) for the booking
      // This ensures that inscription items can be retrieved via /api/inscriptions/{applicationCode}/items
      // ---------------------------------------------------------------------
      let inscriptionInfo = null;
      let inscriptionCreationError = null;
      
      try {
        const applicationCode = application.code || application.Code || nicheApplicationCode;
        
        if (applicationCode && created.id) {
          logger.info('DIAGNOSTIC: Auto-creating inscription application for booking:', {
            applicationCode,
            nicheBookingId: created.id,
            hasApplication: !!application,
            hasBeneficiaries: persistedBeneficiaries.length > 0
          });

          // Build inscription application from niche application data
          const inscriptionApplication = new EngraveApplication({
            // Applicant information from niche application
            applicantName: application.applicantName || contactPerson.name,
            applicantIDNo: application.applicantIDNo || contactPerson.idNo,
            applicantEmailID: application.applicantEmailID || contactPerson.email,
            applicantMobileNo: application.applicantMobileNo || contactPerson.mobileNo,
            applicantHomeTelNo: application.applicantHomeTelNo || contactPerson.homeTelNo,
            applicantOfficeTelNo: application.applicantOfficeTelNo || contactPerson.officeTelNo,
            applicantAddressNo: application.applicantAddressNo || contactPerson.addressNo,
            applicantAddressLine1: application.applicantAddressLine1 || contactPerson.addressLine1,
            applicantAddressLine2: application.applicantAddressLine2 || contactPerson.addressLine2,
            applicantAddressCity: application.applicantAddressCity || contactPerson.addressCity,
            applicantAddressState: application.applicantAddressState || contactPerson.addressState,
            applicantAddressCountry: application.applicantAddressCountry || contactPerson.addressCountry,
            // Link to niche application and booking
            nicheApplicationCode: applicationCode,
            nicheBookingId: created.id,
            // Default values (can be updated later)
            bibleInscriptionChoiceId: null,
            bibleInscriptionText: null,
            churchId: user.churchId,
            userId: user.userId || null,
            remarks: `Auto-created for niche booking ${bookingCode}`,
            status: 1 // Draft status
          });

          // Build deceased details from booking beneficiaries
          // If no beneficiaries, create a default entry from the contact person
          const deceasedDetails = [];
          
          if (persistedBeneficiaries.length > 0) {
            // Use beneficiaries as deceased details for inscription
            // Note: Beneficiaries may not be deceased yet (pre-arranged inscriptions)
            // We'll map available fields and leave others null to be filled later
            for (const beneficiary of persistedBeneficiaries) {
              // Map beneficiary fields to deceased detail fields
              // NicheBookingBeneficiary has: name, dateOfBirth, birthYear
              // EngraveApplicationDetail needs: name, dateOfDeath, dateOfBirth, internmentDate, deathCertificateNo, birthYear, inscriptionText
              deceasedDetails.push(new EngraveApplicationDetail({
                name: beneficiary.name || beneficiary.Name || 'To be specified',
                dateOfDeath: null, // Not available in beneficiary - to be filled later
                dateOfBirth: beneficiary.dateOfBirth || beneficiary.DateOfBirth || null,
                internmentDate: null, // Not available in beneficiary - to be filled later
                deathCertificateNo: null, // Not available in beneficiary - to be filled later
                birthYear: beneficiary.birthYear || beneficiary.BirthYear || null,
                inscriptionText: null // Can be filled later
              }));
            }
          } else {
            // If no beneficiaries, create a default entry (can be updated later)
            // Use contact person as placeholder
            deceasedDetails.push(new EngraveApplicationDetail({
              name: contactPerson.name || 'To be specified',
              dateOfDeath: null,
              dateOfBirth: null,
              internmentDate: null,
              deathCertificateNo: null,
              birthYear: null,
              inscriptionText: null
            }));
          }

          // Create inscription application
          const inscriptionCode = await EngraveApplicationRepository.create(inscriptionApplication, deceasedDetails);
          
          inscriptionInfo = {
            inscriptionCode,
            nicheBookingId: created.id,
            nicheApplicationCode: applicationCode,
            deceasedCount: deceasedDetails.length
          };

          logger.info(`Inscription application auto-created successfully: ${inscriptionCode}`, {
            inscriptionCode,
            nicheBookingId: created.id,
            nicheApplicationCode: applicationCode,
            deceasedCount: deceasedDetails.length
          });
        } else {
          logger.warn('Skipping inscription auto-creation: missing required data', {
            hasApplicationCode: !!applicationCode,
            hasBookingId: !!created.id,
            applicationCode: applicationCode || null,
            bookingId: created?.id || null
          });
        }
      } catch (inscriptionError) {
        inscriptionCreationError = inscriptionError.message || 'Unknown error';
        logger.error('Auto inscription creation for niche booking failed (non-critical):', {
          error: inscriptionError,
          message: inscriptionError.message,
          stack: inscriptionError.stack,
          applicationCode: application.code || application.Code || nicheApplicationCode,
          bookingId: created?.id
        });
        // Don't fail the booking if inscription creation fails - it's non-critical
      }

      let emailResult = {
        success: false,
        skipped: true,
        message: 'No recipient email provided'
      };

      const recipientEmails = [
        contactPerson.email,
        nominee.email,
        nominee2 && nominee2.email
      ].filter(Boolean);

      if (recipientEmails.length > 0) {
        try {
          emailResult = await MailService.sendNicheBookingConfirmation({
            recipientEmail: recipientEmails.join(', '),
            booking: bookingSummary,
            application: application.toJSON ? application.toJSON() : application,
            contact: contactPerson,
            nominee,
            nominee2
          });
        } catch (emailError) {
          logger.error('Failed to send niche booking confirmation email:', emailError);
          emailResult = {
            success: false,
            skipped: false,
            message: emailError.message
          };
        }
      }

      // ---------------------------------------------------------------------
      // Auto-create invoice & receipt for the niche application / booking
      // According to NICHE_DRAFT_BOOKING_INVOICE_FLOW_ANALYSIS.md:
      // - Invoice creation is a separate phase (Phase 2) but can be done during booking
      // - Invoice Status = 1 (Active), not 2 (Paid)
      // - Invoice should be created even if amount is 0 (for draft bookings)
      // - InvoiceDetail.RefDocNumber = Application Code (e.g., "NAPP-49") for niche items
      // - InvoiceDetail.RefDocNumber = "I-" + Application Code (e.g., "I-NAPP-49") for inscription items
      // - InvoiceDetail.RefDocName = "NAPP" for niche, "INCR" for inscription-related items
      // - MUST use InvoiceService.saveInvoice() for proper validation (per analysis doc)
      // - MUST validate that NicheApplication exists via ReferenceDocumentValidator
      // - Support multiple invoice items: niche, inscription, urn, sealing, etc.
      // - Calculate 9% GST tax on each item
      // ---------------------------------------------------------------------
      let billingInfo = null;
      let invoiceCreationError = null;
      
      try {
        // Resolve application code - CRITICAL: Must match exactly
        const applicationCode =
          (application && (application.code || application.Code)) ||
          nicheApplicationCode;

        // DIAGNOSTIC: Log application code resolution
        logger.info('DIAGNOSTIC: Application code resolution for invoice creation:', {
          hasApplication: !!application,
          applicationCode: application?.code || application?.Code || null,
          nicheApplicationCode,
          resolvedApplicationCode: applicationCode,
          applicationWasCreatedInThisRequest,
          bookingId: created?.id,
          bookingCode: created?.code || bookingCode
        });

        if (!applicationCode) {
          logger.error('CRITICAL: Skipping auto-invoice: missing application code', {
            application: application ? {
              hasCode: !!application.code,
              hasCodeAlt: !!application.Code,
              code: application.code,
              Code: application.Code,
              nicheApplicationId: application.nicheApplicationId
            } : null,
            nicheApplicationCode,
            bookingId: created?.id
          });
          invoiceCreationError = 'Missing application code';
        } else {
          // Ensure application code is a string and trimmed
          const normalizedApplicationCode = String(applicationCode).trim();
          
          logger.info(`Attempting to create comprehensive invoice for niche booking: ${normalizedApplicationCode}`);

          // Helper function to fetch niche row level and price
          const fetchNicheRowInfo = async (nicheId) => {
            try {
              const { executeQuery } = require('../config/database');
              const nicheQuery = `
                SELECT 
                  n.NicheId,
                  n.DefaultAmount,
                  r.NicheLevel,
                  r.DefaultAmount AS RowDefaultAmount
                FROM Niche n WITH(NOLOCK)
                INNER JOIN NicheRow r WITH(NOLOCK) ON n.NicheRowlId = r.NicheRowlId
                WHERE n.NicheId = @nicheId
              `;
              const result = await executeQuery(nicheQuery, { nicheId });
              if (result.recordset && result.recordset.length > 0) {
                return {
                  nicheLevel: result.recordset[0].NicheLevel,
                  nichePrice: result.recordset[0].DefaultAmount || 0,
                  rowPrice: result.recordset[0].RowDefaultAmount || 0
                };
              }
            } catch (error) {
              logger.warn('Failed to fetch niche row info:', error);
            }
            return null;
          };

          // Helper function to get item by ItemId
          const getItemById = async (itemId, churchId) => {
            try {
              const { executeQuery } = require('../config/database');
              const itemQuery = `
                SELECT ItemId, Name, Code, Price, ChurchId, DocType
                FROM Item WITH(NOLOCK)
                WHERE ItemId = @itemId AND ChurchId = @churchId
              `;
              const result = await executeQuery(itemQuery, { itemId, churchId });
              if (result.recordset && result.recordset.length > 0) {
                return result.recordset[0];
              }
            } catch (error) {
              logger.warn(`Failed to fetch item ${itemId}:`, error);
            }
            return null;
          };

          // Helper function to determine invoice items from booking data
          const determineInvoiceItems = async (bookingData, nicheInfo, churchId, appCode) => {
            const items = [];
            const { executeQuery } = require('../config/database');

            // 1. Niche item - based on niche level or provided item
            // Priority: 1) Explicit itemId in booking data, 2) ItemId matching niche level, 3) NICHES category
            let nicheItem = null;
            
            // Priority 1: Check if itemId is explicitly provided
            const providedNicheItemId = bookingData.nicheDetails?.itemId || bookingData.itemId;
            if (providedNicheItemId) {
              nicheItem = await getItemById(providedNicheItemId, churchId);
              if (nicheItem) {
                logger.info(`Using provided niche item: ItemId=${nicheItem.ItemId}, Name=${nicheItem.Name}`);
              }
            }
            
            // Priority 2: Try to get item by niche level (ItemId typically matches level, e.g., Level 6 -> ItemId 6)
            if (!nicheItem && nicheInfo?.nicheLevel) {
              const levelItemId = nicheInfo.nicheLevel; // Level 6 -> try ItemId 6
              nicheItem = await getItemById(levelItemId, churchId);
              if (nicheItem) {
                logger.info(`Using niche item by level: Level=${nicheInfo.nicheLevel}, ItemId=${nicheItem.ItemId}, Name=${nicheItem.Name}`);
              }
            }
            
            // Priority 3: If still not found, get first NICHES category item
            if (!nicheItem) {
              try {
                const nicheItems = await itemRepository.getItemsByCategory('NICHES', churchId);
                nicheItem = Array.isArray(nicheItems) && nicheItems.length > 0 ? nicheItems[0] : null;
                if (nicheItem) {
                  logger.info(`Using NICHES category item: ItemId=${nicheItem.ItemId}, Name=${nicheItem.Name}`);
                }
              } catch (error) {
                logger.warn('Failed to get NICHES items:', error);
              }
            }
            
            // Priority 4: If still not found, try any item with ItemId <= 7 (common niche item IDs)
            if (!nicheItem) {
              try {
                const { executeQuery } = require('../config/database');
                const fallbackQuery = `
                  SELECT TOP 1 ItemId, Name, Code, Price, ChurchId, DocType
                  FROM Item WITH(NOLOCK)
                  WHERE ChurchId = @churchId AND ItemId <= 7
                  ORDER BY ItemId
                `;
                const fallbackResult = await executeQuery(fallbackQuery, { churchId });
                if (fallbackResult.recordset && fallbackResult.recordset.length > 0) {
                  nicheItem = fallbackResult.recordset[0];
                  logger.info(`Using fallback item (ItemId <= 7): ItemId=${nicheItem.ItemId}, Name=${nicheItem.Name}`);
                }
              } catch (error) {
                logger.warn('Failed to get fallback items:', error);
              }
            }
            
            // Priority 5: Last resort - get any active item for this church
            if (!nicheItem) {
              try {
                const { executeQuery } = require('../config/database');
                const emergencyQuery = `
                  SELECT TOP 1 ItemId, Name, Code, Price, ChurchId, DocType
                  FROM Item WITH(NOLOCK)
                  WHERE ChurchId = @churchId
                  ORDER BY ItemId
                `;
                const emergencyResult = await executeQuery(emergencyQuery, { churchId });
                if (emergencyResult.recordset && emergencyResult.recordset.length > 0) {
                  nicheItem = emergencyResult.recordset[0];
                  logger.warn(`Using emergency fallback item: ItemId=${nicheItem.ItemId}, Name=${nicheItem.Name}`);
                }
              } catch (error) {
                logger.error('Failed to get emergency fallback items:', error);
              }
            }

            if (nicheItem) {
              const nicheAmount = Number(
                bookingData.nicheDetails?.amount ||
                bookingData.nicheDetails?.price ||
                bookingData.amount ||
                nicheInfo?.nichePrice ||
                nicheInfo?.rowPrice ||
                nicheItem.Price ||
                0
              ) || 0;
              
              const taxPercent = 9; // 9% GST
              const taxAmount = (nicheAmount * taxPercent) / 100;
              const totalWithTax = nicheAmount + taxAmount;

              items.push({
                itemId: nicheItem.ItemId,
                itemName: nicheItem.Name,
                itemCode: nicheItem.Code,
                quantity: 1,
                unitAmount: nicheAmount,
                payingAmount: nicheAmount,
                totalPayingAmount: totalWithTax,
                refDocNumber: appCode, // NAPP-52
                refDocName: 'NAPP',
                refType: 'NAPP',
                outstandingAmount: 0,
                lineTotalAmount: nicheAmount,
                lineTaxPercent: taxPercent,
                lineTaxAmount: taxAmount
              });
            }

            // 2. Inscription item (ItemId 12) - if inscription is requested
            const hasInscription = bookingData.inscription || 
                                  bookingData.nicheDetails?.inscription ||
                                  bookingData.hasInscription !== false; // Default to true if not explicitly false
            
            if (hasInscription) {
              const inscriptionItem = await getItemById(12, churchId); // "Niche Inscription 1st Name"
              if (inscriptionItem) {
                const inscriptionAmount = Number(inscriptionItem.Price || 400) || 0;
                const taxPercent = 9;
                const taxAmount = (inscriptionAmount * taxPercent) / 100;
                const totalWithTax = inscriptionAmount + taxAmount;

                items.push({
                  itemId: inscriptionItem.ItemId,
                  itemName: inscriptionItem.Name,
                  itemCode: inscriptionItem.Code,
                  quantity: 1,
                  unitAmount: inscriptionAmount,
                  payingAmount: inscriptionAmount,
                  totalPayingAmount: totalWithTax,
                  refDocNumber: `I-${appCode}`, // I-NAPP-52
                  refDocName: 'INCR',
                  refType: 'INCR',
                  outstandingAmount: 0,
                  lineTotalAmount: inscriptionAmount,
                  lineTaxPercent: taxPercent,
                  lineTaxAmount: taxAmount
                });
              }
            }

            // 3. Urn item (ItemId 10) - if urn is requested
            const hasUrn = bookingData.urn || 
                          bookingData.nicheDetails?.urn ||
                          bookingData.hasUrn !== false; // Default to true if not explicitly false
            
            if (hasUrn) {
              const urnItem = await getItemById(10, churchId); // "Urn (Marble)"
              if (urnItem) {
                const urnAmount = Number(urnItem.Price || 150) || 0;
                const taxPercent = 9;
                const taxAmount = (urnAmount * taxPercent) / 100;
                const totalWithTax = urnAmount + taxAmount;

                items.push({
                  itemId: urnItem.ItemId,
                  itemName: urnItem.Name,
                  itemCode: urnItem.Code,
                  quantity: 1,
                  unitAmount: urnAmount,
                  payingAmount: urnAmount,
                  totalPayingAmount: totalWithTax,
                  refDocNumber: `I-${appCode}`, // I-NAPP-52
                  refDocName: 'INCR',
                  refType: 'INCR',
                  outstandingAmount: 0,
                  lineTotalAmount: urnAmount,
                  lineTaxPercent: taxPercent,
                  lineTaxAmount: taxAmount
                });
              }
            }

            // 4. Setting of tables (ItemId 33) - if requested
            const hasSettingOfTables = bookingData.settingOfTables || 
                                      bookingData.nicheDetails?.settingOfTables ||
                                      bookingData.hasSettingOfTables !== false;
            
            if (hasSettingOfTables) {
              const settingItem = await getItemById(33, churchId); // "Setting of tables"
              if (settingItem) {
                const settingAmount = Number(settingItem.Price || 20) || 0;
                const taxPercent = 9;
                const taxAmount = (settingAmount * taxPercent) / 100;
                const totalWithTax = settingAmount + taxAmount;

                items.push({
                  itemId: settingItem.ItemId,
                  itemName: settingItem.Name,
                  itemCode: settingItem.Code,
                  quantity: 1,
                  unitAmount: settingAmount,
                  payingAmount: settingAmount,
                  totalPayingAmount: totalWithTax,
                  refDocNumber: `I-${appCode}`, // I-NAPP-52
                  refDocName: 'INCR',
                  refType: 'INCR',
                  outstandingAmount: 0,
                  lineTotalAmount: settingAmount,
                  lineTaxPercent: taxPercent,
                  lineTaxAmount: taxAmount
                });
              }
            }

            // 5. Sealing of niche (ItemId 34) - if requested
            const hasSealing = bookingData.sealing || 
                              bookingData.nicheDetails?.sealing ||
                              bookingData.hasSealing !== false;
            
            if (hasSealing) {
              const sealingItem = await getItemById(34, churchId); // "Sealing of niche"
              if (sealingItem) {
                const sealingAmount = Number(sealingItem.Price || 20) || 0;
                const taxPercent = 9;
                const taxAmount = (sealingAmount * taxPercent) / 100;
                const totalWithTax = sealingAmount + taxAmount;

                items.push({
                  itemId: sealingItem.ItemId,
                  itemName: sealingItem.Name,
                  itemCode: sealingItem.Code,
                  quantity: 1,
                  unitAmount: sealingAmount,
                  payingAmount: sealingAmount,
                  totalPayingAmount: totalWithTax,
                  refDocNumber: `I-${appCode}`, // I-NAPP-52
                  refDocName: 'INCR',
                  refType: 'INCR',
                  outstandingAmount: 0,
                  lineTotalAmount: sealingAmount,
                  lineTaxPercent: taxPercent,
                  lineTaxAmount: taxAmount
                });
              }
            }

            return items;
          };

          // Fetch niche row information
          const nicheId = applicationNicheId || application?.nicheId || data.nicheDetails?.nicheId;
          const nicheInfo = nicheId ? await fetchNicheRowInfo(nicheId) : null;

          // DIAGNOSTIC: Log booking data before item determination
          logger.info('DIAGNOSTIC: Booking data for invoice item determination:', {
            applicationCode: normalizedApplicationCode,
            nicheId,
            nicheInfo,
            hasNicheDetails: !!data.nicheDetails,
            nicheDetails: data.nicheDetails ? {
              itemId: data.nicheDetails.itemId,
              amount: data.nicheDetails.amount,
              price: data.nicheDetails.price,
              nicheId: data.nicheDetails.nicheId,
              inscription: data.nicheDetails.inscription,
              urn: data.nicheDetails.urn,
              settingOfTables: data.nicheDetails.settingOfTables,
              sealing: data.nicheDetails.sealing
            } : null,
            hasInscription: !!(data.inscription || data.nicheDetails?.inscription),
            hasUrn: !!(data.urn || data.nicheDetails?.urn),
            hasSettingOfTables: !!(data.settingOfTables || data.nicheDetails?.settingOfTables),
            hasSealing: !!(data.sealing || data.nicheDetails?.sealing),
            churchId: user.churchId
          });

          // Determine all invoice items from booking data
          const invoiceItems = await determineInvoiceItems(data, nicheInfo, user.churchId, normalizedApplicationCode);

          // DIAGNOSTIC: Log item determination result
          logger.info('DIAGNOSTIC: Invoice item determination result:', {
            applicationCode: normalizedApplicationCode,
            itemCount: invoiceItems.length,
            items: invoiceItems.map(item => ({
              itemId: item.itemId,
              itemName: item.itemName,
              itemCode: item.itemCode,
              unitAmount: item.unitAmount,
              refDocNumber: item.refDocNumber,
              refDocName: item.refDocName
            }))
          });

          if (invoiceItems.length === 0) {
            invoiceCreationError = 'No invoice items determined from booking data';
            logger.error('CRITICAL: No invoice items found for niche booking:', {
              applicationCode: normalizedApplicationCode,
              nicheId,
              nicheInfo,
              bookingData: {
                hasNicheDetails: !!data.nicheDetails,
                hasItemId: !!(data.nicheDetails?.itemId || data.itemId),
                nicheDetails: data.nicheDetails
              }
            });
            
            // CRITICAL: Try emergency fallback - create invoice with a default item
            logger.warn('Attempting emergency fallback: Creating invoice with default item');
            try {
              // Get any item for this church as emergency fallback
              const { executeQuery } = require('../config/database');
              const emergencyItemQuery = `
                SELECT TOP 1 ItemId, Name, Code, Price, ChurchId
                FROM Item WITH(NOLOCK)
                WHERE ChurchId = @churchId
                ORDER BY ItemId
              `;
              const emergencyItemResult = await executeQuery(emergencyItemQuery, { churchId: user.churchId });
              
              if (emergencyItemResult.recordset && emergencyItemResult.recordset.length > 0) {
                const emergencyItem = emergencyItemResult.recordset[0];
                const defaultAmount = Number(data.nicheDetails?.amount || data.nicheDetails?.price || data.amount || emergencyItem.Price || 0) || 0;
                const taxPercent = 9;
                const taxAmount = (defaultAmount * taxPercent) / 100;
                const totalWithTax = defaultAmount + taxAmount;
                
                invoiceItems.push({
                  itemId: emergencyItem.ItemId,
                  itemName: emergencyItem.Name,
                  itemCode: emergencyItem.Code,
                  quantity: 1,
                  unitAmount: defaultAmount,
                  payingAmount: defaultAmount,
                  totalPayingAmount: totalWithTax,
                  refDocNumber: normalizedApplicationCode,
                  refDocName: 'NAPP',
                  refType: 'NAPP',
                  outstandingAmount: 0,
                  lineTotalAmount: defaultAmount,
                  lineTaxPercent: taxPercent,
                  lineTaxAmount: taxAmount
                });
                
                logger.warn(`Emergency fallback: Using default item ItemId=${emergencyItem.ItemId} for invoice creation`);
                invoiceCreationError = null; // Clear error since we have a fallback item
              } else {
                logger.error('CRITICAL: No items found in database for emergency fallback!');
              }
            } catch (emergencyError) {
              logger.error('Failed to get emergency fallback item:', emergencyError);
            }
          }
          
          if (invoiceItems.length > 0) {
            // Calculate totals
            const totalAmount = invoiceItems.reduce((sum, item) => sum + item.lineTotalAmount, 0);
            const totalTaxAmount = invoiceItems.reduce((sum, item) => sum + item.lineTaxAmount, 0);
            const totalPayingAmount = totalAmount + totalTaxAmount;

            logger.info(`Determined ${invoiceItems.length} invoice items for niche booking:`, {
              applicationCode: normalizedApplicationCode,
              items: invoiceItems.map(item => ({
                itemId: item.itemId,
                itemName: item.itemName,
                amount: item.lineTotalAmount,
                tax: item.lineTaxAmount
              })),
              totalAmount,
              totalTaxAmount,
              totalPayingAmount
            });

            // Prepare invoice data with tax calculations
            const invoiceData = {
              transactionDate: bookedDate,
              refDocNumber: normalizedApplicationCode, // Application code (e.g., "NAPP-52")
              refDocName: 'NAPP',
              customerName: contactPerson.name,
              totalAmount: totalPayingAmount, // Total including tax
              payingAmount: totalPayingAmount > 0 ? totalPayingAmount : 0,
              paymentMode: totalPayingAmount > 0 ? (data.paymentMode || 'Cash') : null,
              paymentModeDocNo: data.paymentModeDocNo || null,
              nicheApplicationId: application.nicheApplicationId || applicationIdNumeric,
              taxCode: 'GST', // GST tax code
              taxPercentage: 9, // 9% GST
              taxAmount: totalTaxAmount
            };

            // Convert invoice items to invoice details format (remove itemName and itemCode as they're not needed in details)
            // CRITICAL: Ensure RefDocNumber is properly normalized (trimmed, no trailing spaces)
            const invoiceDetails = invoiceItems.map(item => {
              // Normalize RefDocNumber: trim and ensure it's a string
              const normalizedRefDocNumber = item.refDocNumber 
                ? String(item.refDocNumber).trim() 
                : null;
              
              // Normalize RefDocName: trim and ensure it's uppercase for consistency
              const normalizedRefDocName = item.refDocName 
                ? String(item.refDocName).trim().toUpperCase() 
                : null;
              
              const detail = {
                itemId: item.itemId,
                quantity: item.quantity,
                unitAmount: item.unitAmount,
                payingAmount: item.payingAmount,
                totalPayingAmount: item.totalPayingAmount,
                refDocNumber: normalizedRefDocNumber, // Normalized: trimmed string
                refDocName: normalizedRefDocName, // Normalized: trimmed and uppercase
                refType: item.refType ? String(item.refType).trim().toUpperCase() : null,
                outstandingAmount: item.outstandingAmount,
                lineTotalAmount: item.lineTotalAmount,
                lineTaxPercent: item.lineTaxPercent,
                lineTaxAmount: item.lineTaxAmount
              };
              
              // Log each detail being prepared with normalized values
              logger.debug(`Preparing invoice detail: ItemId=${detail.itemId}, RefDocNumber="${detail.refDocNumber}", RefDocName="${detail.refDocName}"`);
              
              return detail;
            });
            
            // Log all details before saving
            logger.info(`Prepared ${invoiceDetails.length} invoice details for ${normalizedApplicationCode}:`, 
              invoiceDetails.map(d => ({
                itemId: d.itemId,
                refDocNumber: d.refDocNumber,
                refDocName: d.refDocName
              }))
            );

            // DIAGNOSTIC: Log invoice data before saving
            logger.info('DIAGNOSTIC: Invoice data prepared for saving:', {
              applicationCode: normalizedApplicationCode,
              invoiceData: {
                refDocNumber: invoiceData.refDocNumber,
                refDocName: invoiceData.refDocName,
                customerName: invoiceData.customerName,
                totalAmount: invoiceData.totalAmount,
                taxAmount: invoiceData.taxAmount,
                nicheApplicationId: invoiceData.nicheApplicationId
              },
              invoiceDetailsCount: invoiceDetails.length,
              invoiceDetails: invoiceDetails.map(d => ({
                itemId: d.itemId,
                refDocNumber: d.refDocNumber,
                refDocName: d.refDocName,
                unitAmount: d.unitAmount,
                lineTotalAmount: d.lineTotalAmount,
                lineTaxAmount: d.lineTaxAmount
              })),
              userId: user.userId,
              churchId: user.churchId,
              applicationWasCreatedInThisRequest
            });

            // Use InvoiceService.saveInvoice() for proper validation
            // Note: If application was just created in this request, validation might fail due to caching
            // We'll retry multiple times with increasing delays if validation fails
            let invoiceResult = await invoiceService.saveInvoice(
              invoiceData,
              invoiceDetails,
              user.userId,
              user.churchId
            );

            // DIAGNOSTIC: Log invoice creation result
            logger.info('DIAGNOSTIC: Invoice creation result (first attempt):', {
              applicationCode: normalizedApplicationCode,
              success: invoiceResult.success,
              error: invoiceResult.error ? {
                code: invoiceResult.error.code,
                message: invoiceResult.error.message
              } : null,
              data: invoiceResult.data ? {
                invoiceId: invoiceResult.data.invoiceId,
                invoiceCode: invoiceResult.data.invoiceCode
              } : null
            });

            // If validation failed but application was just created, retry with exponential backoff
            // (validation might fail due to cache/timing issues)
            if (!invoiceResult.success && 
                (invoiceResult.error?.code === 'INVALID_REF_DOCUMENT' || 
                 invoiceResult.error?.code === 'VALIDATION_ERROR') && 
                applicationWasCreatedInThisRequest) {
              logger.warn(`Invoice validation failed for newly created application, retrying: ${normalizedApplicationCode}`, {
                errorCode: invoiceResult.error?.code,
                errorMessage: invoiceResult.error?.message,
                attempt: 1
              });
              
              // Retry with exponential backoff (3 attempts total)
              const maxRetries = 3;
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                // Wait with exponential backoff: 200ms, 500ms, 1000ms
                const delay = attempt === 1 ? 200 : attempt === 2 ? 500 : 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                logger.info(`Retry attempt ${attempt}/${maxRetries} for invoice creation: ${normalizedApplicationCode}`);
                
                // Retry invoice creation
                invoiceResult = await invoiceService.saveInvoice(
                  invoiceData,
                  invoiceDetails,
                  user.userId,
                  user.churchId
                );
                
                if (invoiceResult.success) {
                  logger.info(`Invoice creation succeeded on retry attempt ${attempt}: ${normalizedApplicationCode}`);
                  break;
                } else {
                  logger.warn(`Invoice creation failed on retry attempt ${attempt}: ${normalizedApplicationCode}`, {
                    errorCode: invoiceResult.error?.code,
                    errorMessage: invoiceResult.error?.message
                  });
                }
              }
            }

            if (!invoiceResult.success) {
              invoiceCreationError = invoiceResult.error?.message || 'Invoice creation failed';
              logger.error('Failed to create invoice for niche booking:', {
                applicationCode: normalizedApplicationCode,
                error: invoiceResult.error,
                errorCode: invoiceResult.error?.code,
                errorDetails: JSON.stringify(invoiceResult.error)
              });
            } else {
              // CRITICAL: Set billingInfo immediately after successful invoice creation
              // This ensures billingInfo is set even if verification or receipt creation fails
              const invoiceId = invoiceResult.data.invoiceId;
              const invoiceCode = invoiceResult.data.invoiceCode;

              logger.info(`Invoice created successfully for niche booking: ${normalizedApplicationCode}`, {
                invoiceId,
                invoiceCode,
                refDocNumber: normalizedApplicationCode,
                itemCount: invoiceDetails.length,
                totalAmount,
                totalTaxAmount,
                totalPayingAmount,
                items: invoiceDetails.map(d => ({
                  itemId: d.itemId,
                  refDocName: d.refDocName,
                  amount: d.lineTotalAmount,
                  tax: d.lineTaxAmount
                }))
              });

              // Set billingInfo immediately - don't wait for verification
              billingInfo = {
                invoiceId,
                invoiceCode,
                refDocNumber: normalizedApplicationCode,
                receipt: null // Will be set later if receipt creation succeeds
              };

              // CRITICAL: Verify invoice exists and is findable by RefDocNumber
              // This ensures the invoice can be retrieved via /api/invoices/NAPP-XX
              // Use multiple verification attempts with increasing delays
              // NOTE: Verification failures don't prevent billingInfo from being set
              let invoiceVerified = false;
              const maxVerificationAttempts = 3; // Reduced from 5 to avoid long delays
              
              for (let verifyAttempt = 1; verifyAttempt <= maxVerificationAttempts; verifyAttempt++) {
                try {
                  // Wait with increasing delay for transaction to fully commit
                  const verifyDelay = verifyAttempt * 300; // 300ms, 600ms, 900ms
                  await new Promise(resolve => setTimeout(resolve, verifyDelay));
                  
                  // Verify invoice can be found by application code (RefDocNumber)
                  const verifyInvoice = await invoiceRepository.getInvoiceByCode(
                    normalizedApplicationCode,
                    user.churchId,
                    'NAPP'
                  );
                  
                  if (verifyInvoice) {
                    invoiceVerified = true;
                    logger.info(`Invoice verification successful (attempt ${verifyAttempt}/${maxVerificationAttempts}): Found by application code ${normalizedApplicationCode}`, {
                      invoiceId: verifyInvoice.invoiceId,
                      invoiceCode: verifyInvoice.code,
                      refDocNumber: verifyInvoice.refDocNumber,
                      detailCount: verifyInvoice.details?.length || 0
                    });
                    break;
                  } else {
                    // If not found by application code, try by invoice code
                    const verifyByInvoiceCode = await invoiceRepository.getInvoiceByCode(
                      invoiceCode,
                      user.churchId
                    );
                    
                    if (verifyByInvoiceCode) {
                      logger.warn(`Invoice found by invoice code but not by application code (attempt ${verifyAttempt}):`, {
                        applicationCode: normalizedApplicationCode,
                        invoiceCode,
                        invoiceId,
                        invoiceRefDocNumber: verifyByInvoiceCode.refDocNumber,
                        invoiceDetailRefDocNumber: verifyByInvoiceCode.details?.[0]?.refDocNumber
                      });
                      
                      // If found by invoice code, check if RefDocNumber matches
                      if (verifyByInvoiceCode.refDocNumber && 
                          String(verifyByInvoiceCode.refDocNumber).trim() === normalizedApplicationCode) {
                        invoiceVerified = true;
                        logger.info(`Invoice verified by invoice code with matching RefDocNumber: ${normalizedApplicationCode}`);
                        break;
                      }
                    }
                    
                    if (verifyAttempt < maxVerificationAttempts) {
                      logger.debug(`Invoice not yet findable (attempt ${verifyAttempt}/${maxVerificationAttempts}), retrying...`);
                    }
                  }
                } catch (verifyError) {
                  logger.warn(`Error verifying invoice (attempt ${verifyAttempt}/${maxVerificationAttempts}):`, {
                    error: verifyError.message,
                    applicationCode: normalizedApplicationCode,
                    invoiceCode,
                    invoiceId
                  });
                  
                  // Don't break on verification errors - invoice was created successfully
                  if (verifyAttempt === maxVerificationAttempts) {
                    logger.warn('Invoice verification failed but invoice was created successfully:', {
                      applicationCode: normalizedApplicationCode,
                      invoiceCode,
                      invoiceId,
                      note: 'Invoice exists in database but lookup may be slow'
                    });
                  }
                }
              }
              
              if (!invoiceVerified) {
                // Final check: Direct database query to confirm invoice exists
                try {
                  const { executeQuery } = require('../config/database');
                  const directCheckQuery = `
                    SELECT TOP 1 
                      i.InvoiceId,
                      i.Code,
                      i.RefDocNumber,
                      i.Status,
                      (SELECT TOP 1 id.RefDocNumber FROM InvoiceDetail id WHERE id.InvoiceId = i.InvoiceId) AS DetailRefDocNumber
                    FROM Invoice i WITH(NOLOCK)
                    WHERE i.InvoiceId = @invoiceId
                  `;
                  const directCheckResult = await executeQuery(directCheckQuery, { invoiceId });
                  
                  if (directCheckResult.recordset && directCheckResult.recordset.length > 0) {
                    const dbInvoice = directCheckResult.recordset[0];
                    logger.warn(`Invoice exists in database but lookup failed (non-critical):`, {
                      invoiceId: dbInvoice.InvoiceId,
                      invoiceCode: dbInvoice.Code,
                      invoiceRefDocNumber: dbInvoice.RefDocNumber,
                      detailRefDocNumber: dbInvoice.DetailRefDocNumber,
                      status: dbInvoice.Status,
                      applicationCode: normalizedApplicationCode,
                      note: 'Invoice is created and will be findable after transaction commits'
                    });
                  } else {
                    logger.error(`CRITICAL: Invoice does not exist in database after creation!`, {
                      invoiceId,
                      invoiceCode,
                      applicationCode: normalizedApplicationCode,
                      churchId: user.churchId
                    });
                  }
                } catch (directCheckError) {
                  logger.warn('Failed to perform direct database check (non-critical):', directCheckError.message);
                }
              }

              // Only create receipt if amount > 0
              let receiptInfo = null;
              if (totalPayingAmount > 0) {
                try {
                  // Get the created invoice to pass to receipt service
                  const createdInvoice = await invoiceRepository.getInvoiceByCode(invoiceCode, user.churchId);
                  
                  if (createdInvoice) {
                    const receiptResult = await receiptService.createReceiptFromInvoice(
                      {
                        invoiceId,
                        code: invoiceCode,
                        customerName: contactPerson.name,
                        payingAmount: totalPayingAmount,
                        paymentMode: data.paymentMode || 'Cash',
                        paymentModeDocNo: data.paymentModeDocNo || null,
                        payeeName: contactPerson.name,
                        addressNo: contactPerson.addressNo || null,
                        address: contactPerson.addressLine1 || contactPerson.address || null,
                        address2: contactPerson.addressLine2 || null,
                        addressCity: contactPerson.addressCity || null,
                        country: contactPerson.addressCountry || null,
                        outstandingAmount: 0
                      },
                      invoiceDetails,
                      user.userId,
                      user.churchId
                    );

                    if (receiptResult && receiptResult.success && receiptResult.data) {
                      receiptInfo = {
                        receiptId: receiptResult.data.receiptId,
                        receiptCode: receiptResult.data.code
                      };
                      logger.info(`Receipt created successfully for invoice: ${invoiceCode}`);
                      // Update billingInfo with receipt info
                      billingInfo.receipt = receiptInfo;
                    }
                  }
                } catch (receiptError) {
                  logger.warn('Failed to auto-create receipt for niche booking (non-critical):', receiptError.message);
                  // Don't fail the booking if receipt creation fails - billingInfo is already set
                }
              } else {
                logger.info(`Skipping receipt creation for zero-amount invoice: ${normalizedApplicationCode}`);
              }
            }
          }
        }
      } catch (billingError) {
        invoiceCreationError = billingError.message || 'Unknown error';
        logger.error('Auto invoice/receipt creation for niche booking failed:', {
          error: billingError,
          message: billingError.message,
          stack: billingError.stack,
          applicationCode: nicheApplicationCode
        });
        // Don't fail the booking if invoice creation fails, but log the error
      }

      // Log invoice creation status for debugging
      if (invoiceCreationError) {
        logger.error(`CRITICAL: Invoice not created for niche booking ${nicheApplicationCode}: ${invoiceCreationError}`, {
          applicationCode: nicheApplicationCode,
          error: invoiceCreationError,
          churchId: user?.churchId,
          userId: user?.userId,
          bookingId: created?.id,
          bookingCode: bookingCode,
          applicationWasCreatedInThisRequest,
          resolvedApplicationCode: application?.code || application?.Code || nicheApplicationCode
        });
      } else if (billingInfo) {
        logger.info(`Invoice successfully created for niche booking ${nicheApplicationCode}`, {
          applicationCode: nicheApplicationCode,
          invoiceId: billingInfo.invoiceId,
          invoiceCode: billingInfo.invoiceCode,
          refDocNumber: billingInfo.refDocNumber,
          receiptCode: billingInfo.receipt?.receiptCode || 'none',
          applicationWasCreatedInThisRequest
        });
      } else {
        logger.warn(`Invoice creation was skipped for niche booking ${nicheApplicationCode}`, {
          applicationCode: nicheApplicationCode,
          reason: 'No application code or other condition not met',
          hasApplication: !!application,
          applicationCode: application?.code || application?.Code || null,
          nicheApplicationCode,
          applicationWasCreatedInThisRequest
        });
      }

      // DIAGNOSTIC: Final summary of invoice creation attempt
      logger.info('DIAGNOSTIC: Final invoice creation summary:', {
        bookingCode: bookingCode,
        applicationCode: nicheApplicationCode,
        resolvedApplicationCode: application?.code || application?.Code || nicheApplicationCode,
        invoiceCreated: !!billingInfo,
        invoiceId: billingInfo?.invoiceId || null,
        invoiceCode: billingInfo?.invoiceCode || null,
        invoiceError: invoiceCreationError || null,
        applicationWasCreatedInThisRequest,
        bookingId: created?.id,
        churchId: user?.churchId,
        userId: user?.userId
      });

      return {
        success: true,
        data: {
          bookingId: created.id,
          code: bookingCode,
          bookedDate: bookedDate.toISOString(),
          nicheId: application.nicheId || applicationNicheId,
          nicheApplicationId: application.nicheApplicationId || applicationIdNumeric,
          nicheApplicationCode: application.code || nicheApplicationCode,
          contact: contactPerson,
          nominee,
          nominee2: nominee2 || null,
          beneficiaries: persistedBeneficiaries,
          consentForm: consentFormRecord ? consentFormRecord.toJSON() : null,
          consentForms: consentFormRecord
            ? consentFormRecord.toJSON().consentForms
            : (data.consentForms || null),
          emailNotification: emailResult,
          billing: billingInfo,
          inscription: inscriptionInfo || (inscriptionCreationError ? { error: inscriptionCreationError } : null)
        },
        message: 'Niche booking created successfully'
      };
    } catch (error) {
      logger.error('Service: Failed to create niche booking:', error);
      throw error;
    }
  }
}

module.exports = new NicheBookingService();

