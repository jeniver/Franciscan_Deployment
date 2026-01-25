import { NicheApplicationRequest, RawNicheApplication, NicheApplicationListItem } from '../services/nicheApplicationService';
import { normalizeFormData, createNicheApplicationRequest, NicheApplicationFormData } from '../types/nicheApplication';
import { formatDateForInput } from './dateUtils';

// Map form data to niche application request format
export const mapFormDataToNicheApplicationRequest = (formData: Record<string, any>): NicheApplicationRequest => {
  const normalizedData = normalizeFormData(formData);
  return createNicheApplicationRequest(normalizedData);
};

const normalizeAddress = (address: any): string => {
  if (!address) {
    return '';
  }
  if (typeof address === 'string') {
    return address;
  }
  if (typeof address === 'object') {
    if (typeof address.formatted === 'string' && address.formatted.trim() !== '') {
      return address.formatted;
    }
    const parts = [
      address.no,
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.country
    ]
      .map(part => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean);
    return parts.join(', ');
  }
  return '';
};

const toUniqueNumberArray = (value: number | number[] | null | undefined): number[] => {
  const values = Array.isArray(value) ? value : value != null ? [value] : [];
  return Array.from(
    new Set(
      values
        .map(item => Number(item))
        .filter(item => !Number.isNaN(item))
    )
  );
};

const normalizeBeneficiaries = (beneficiaries: any[] | undefined): NicheApplicationFormData['beneficiaries'] => {
  if (!Array.isArray(beneficiaries)) {
    return [];
  }
  return beneficiaries.map((beneficiary, index) => ({
    id: beneficiary?.id || beneficiary?.index || index + 1,
    name: beneficiary?.fullName || beneficiary?.name || '',
    fullName: beneficiary?.fullName || beneficiary?.name || '',
    nric: beneficiary?.nric || beneficiary?.idNo || '',
    idNo: beneficiary?.nric || beneficiary?.idNo || '',
    relationship: beneficiary?.relationshipToApplicant || beneficiary?.relationship || '',
    relationshipToApplicant: beneficiary?.relationshipToApplicant || beneficiary?.relationship || '',
    dateOfBirth: formatDateForInput(beneficiary?.dateOfBirth) || '',
    birthYear: beneficiary?.birthYear || '',
    isCatholic: typeof beneficiary?.isCatholic === 'boolean' ? beneficiary?.isCatholic : undefined,
    religion: typeof beneficiary?.isCatholic === 'boolean' 
      ? (beneficiary.isCatholic ? 'Catholic' : 'Non-Catholic')
      : 'Unknown',
    isMale: beneficiary?.isMale,
    sex: beneficiary?.isMale === true ? 'Male' : beneficiary?.isMale === false ? 'Female' : 'N/A',
    relationshipToNominee1: beneficiary?.relationshipToNominee1 || '',
    relationshipToNominee2: beneficiary?.relationshipToNominee2 || '',
    status: beneficiary?.status || 'Active'
  }));
};

const normalizeNominees = (nominees: any[] | undefined): NicheApplicationFormData['nominees'] => {
  if (!Array.isArray(nominees)) {
    return [];
  }
  return nominees.map((nominee, index) => {
    const address = normalizeAddress(nominee?.address);
    const contactNumber = nominee?.contactNumber || nominee?.phone || nominee?.mobileNo || '';

    return {
      id: nominee?.id || index + 1,
      name: nominee?.name || nominee?.fullName || '',
      fullName: nominee?.fullName || nominee?.name || '',
      nric: nominee?.nric || nominee?.idNo || '',
      relationship: nominee?.relationship || nominee?.relationshipToApplicant || '',
      address,
      phone: contactNumber,
      contactNumber,
      email: nominee?.email || '',
      dateOfBirth: formatDateForInput(nominee?.dateOfBirth) || '',
      officeTelNo: nominee?.officeTelNo || '',
      homeTelNo: nominee?.homeTelNo || '',
      status: nominee?.status || 'Active'
    };
  });
};

// Map API niche application response to form data
export const mapApiApplicationToFormData = (record?: RawNicheApplication): NicheApplicationFormData => {
  if (!record) {
    return normalizeFormData({});
  }

  const applicant = record.applicant || {};
  const beneficiaries = normalizeBeneficiaries(record.beneficiaries);
  const nominees = normalizeNominees(
    record.nominees ||
      (record.nominee ? [record.nominee] : []) ||
      []
  );
  const primaryNominee = (record.nominee || nominees[0]) || {};
  
  // Handle nicheId - can be array or single value
  let nicheIds: number[] = [];
  if (Array.isArray(record.nicheId)) {
    nicheIds = toUniqueNumberArray(record.nicheId);
  } else if (record.nicheId != null) {
    nicheIds = toUniqueNumberArray(record.nicheId);
  } else if (record.nicheDetails?.nicheId) {
    const nicheIdValue = Array.isArray(record.nicheDetails.nicheId) 
      ? record.nicheDetails.nicheId[0] 
      : record.nicheDetails.nicheId;
    nicheIds = toUniqueNumberArray(nicheIdValue);
  }

  // Extract niche code - NEVER use application code as fallback
  const nicheCode = record.nicheDetails?.nicheCode || record.nicheCode || '';
  
  // Extract chapel - prioritize nicheDetails
  const chapel = record.nicheDetails?.chapel || record.chapel || record.chapelName || '';
  const chapelId = record.nicheDetails?.chapelId ?? record.chapelId ?? null;
  const chapelCode = record.nicheDetails?.chapelCode || record.chapelCode || '';

  // Handle consent forms - map from API structure
  const consentForms = record.consentForms || {};
  const consentFormsData = {
    firstBeneficiary: consentForms.firstBeneficiary || null,
    secondBeneficiary: consentForms.secondBeneficiary || null,
    twoBeneficiaries: consentForms.twoBeneficiaries || null
  };

  const baseFormData: Record<string, any> = {
    applicationNumber: record.applicationNumber || record.applicationCode || record.code || '',
    consentForms: consentFormsData,
    nicheId: nicheIds[0] ?? null,
    selectedNiches: nicheIds,
    chapel: chapel,
    chapelId: chapelId,
    chapelCode: chapelCode,
    nicheCode: nicheCode,
    nicheNumber: record.nicheDetails?.nicheNumber || record.nicheNumber || '',
    wallName: record.nicheDetails?.wallName || record.wallName || '',
    wallCode: record.nicheDetails?.wallCode || record.wallCode || '',
    rowNumber: record.nicheDetails?.rowNumber || record.rowNumber || '',
    rowLevel: record.nicheDetails?.rowLevel ?? record.rowLevel ?? null,
    applicantName: record.applicantName || applicant.name || '',
    applicantIDNo: record.applicantIDNo || applicant.idNo || '',
    applicantEmail: record.applicantEmail || applicant.email || '',
    applicantPhone: record.applicantPhone || applicant.mobileNo || '',
    applicantAddress: record.applicantAddress || normalizeAddress(applicant.address),
    applicantReligion:
      record.applicantReligion ||
      (typeof applicant.isCatholic === 'boolean'
        ? applicant.isCatholic
          ? 'Catholic'
          : 'Non-Catholic'
        : ''),
    applicantHomeTel: record.applicantHomeTel || applicant.homeTelNo || '',
    applicantOfficeTel: record.applicantOfficeTel || applicant.officeTelNo || '',
    applicantCountry: record.applicantCountry || 'Singapore',
    contactStatus: record.contactStatus || 'Active',
    contactRemarks: record.contactRemarks || '',
    remarks: record.remarks || '',
    bookedDate: record.bookedDate || '',
    beneficiaries,
    beneficiary1: record.beneficiary1 || beneficiaries[0] || {
      name: '',
      relationshipToApplicant: ''
    },
    nominees,
    nomineeName:
      record.nomineeName ||
      primaryNominee.fullName ||
      primaryNominee.name ||
      '',
    nomineeIDNo:
      record.nomineeIDNo ||
      primaryNominee.nric ||
      primaryNominee.idNo ||
      '',
    nomineeRelationship:
      record.nomineeRelationship ||
      primaryNominee.relationship ||
      primaryNominee.relationshipToApplicant ||
      '',
    nomineeAddress: record.nomineeAddress || normalizeAddress(primaryNominee.address),
    nomineePhone:
      record.nomineePhone ||
      primaryNominee.contactNumber ||
      primaryNominee.phone ||
      primaryNominee.mobileNo ||
      '',
    nomineeEmail: record.nomineeEmail || primaryNominee.email || '',
    nomineeStatus: record.nomineeStatus || primaryNominee.status || 'Active',
    invoice: record.invoice || {}
  };

  // Legacy contact fields
  baseFormData.contactName = baseFormData.applicantName;
  baseFormData.contactNric = baseFormData.applicantIDNo;
  baseFormData.contactEmail = baseFormData.applicantEmail;
  baseFormData.contactPhone = baseFormData.applicantPhone;
  baseFormData.contactAddress = baseFormData.applicantAddress;
  baseFormData.contactReligion = baseFormData.applicantReligion;
  baseFormData.contactHomeTel = baseFormData.applicantHomeTel;
  baseFormData.contactOfficeTel = baseFormData.applicantOfficeTel;
  baseFormData.contactCountry = baseFormData.applicantCountry;

  return normalizeFormData(baseFormData);
};

// Normalize niche application list item for table display
export const normalizeNicheApplicationListItem = (record: RawNicheApplication): NicheApplicationListItem => {
  const normalized: NicheApplicationListItem = { ...record };

  const applicationCode =
    record.applicationNumber ||
    record.applicationCode ||
    record.code ||
    '';

  if (applicationCode) {
    normalized.applicationCode = normalized.applicationCode || applicationCode;
    normalized.applicationNumber = normalized.applicationNumber || applicationCode;
    normalized.code = normalized.code || applicationCode;
  }

  const applicantName =
    record.applicantName ||
    record.applicant?.name ||
    normalized.contactName ||
    '';

  if (applicantName) {
    normalized.applicantName = applicantName;
  }

  const nominee =
    record.nominee ||
    (Array.isArray(record.nominees) ? record.nominees[0] : undefined);

  const chapelName =
    record.chapelName ||
    record.chapel?.name ||
    record.niche?.chapelName ||
    record.nicheDetails?.chapel ||
    '';

  if (chapelName) {
    normalized.chapelName = chapelName;
  }

  const nicheCode =
    record.nicheCode ||
    record.niche?.code ||
    record.nicheDetails?.nicheCode ||
    '';

  if (nicheCode) {
    normalized.nicheCode = nicheCode;
  }

  const statusValue =
    record.statusText ||
    record.statusLabel ||
    record.statusDescription ||
    record.status ||
    record.applicationStatus ||
    record.state;

  if (statusValue !== undefined && statusValue !== null && statusValue !== '') {
    normalized.statusText =
      typeof statusValue === 'string'
        ? statusValue
        : `Status ${statusValue}`;
  }

  const createdTimestamp =
    record.createdAt ||
    record.createdOn ||
    record.createdDate ||
    record.appliedDate ||
    record.created ||
    record.agreementDate;

  if (createdTimestamp) {
    normalized.createdAt = createdTimestamp;
  }

  if (!normalized.nomineeName) {
    normalized.nomineeName =
      record.nomineeName ||
      nominee?.fullName ||
      nominee?.name ||
      '';
  }

  if (!normalized.nomineePhone) {
    normalized.nomineePhone =
      record.nomineePhone ||
      nominee?.contactNumber ||
      nominee?.mobileNo ||
      nominee?.phone ||
      '';
  }

  if (!normalized.nomineeEmail) {
    normalized.nomineeEmail = record.nomineeEmail || nominee?.email || '';
  }

  if (!normalized.beneficiaries && record.beneficiaries) {
    normalized.beneficiaries = record.beneficiaries;
  }

  if (!normalized.nominees && record.nominees) {
    normalized.nominees = record.nominees;
  }

  return normalized;
};

// Validate niche application request
export const validateNicheApplicationRequest = (request: NicheApplicationRequest): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required fields validation
  if (!request.nicheId) {
    errors.push('Niche ID is required');
  }

  if (!request.applicantName || request.applicantName.trim() === '') {
    errors.push('Applicant name is required');
  }

  // Applicant ID number is optional - removed required validation

  if (!request.nomineeName || request.nomineeName.trim() === '') {
    errors.push('Nominee name is required');
  }

  if (!request.nomineeIDNo || request.nomineeIDNo.trim() === '') {
    errors.push('Nominee ID number is required');
  }

  if (!request.beneficiary1 || !request.beneficiary1.name || request.beneficiary1.name.trim() === '') {
    errors.push('At least one beneficiary is required');
  }

  if (!request.beneficiary1 || !request.beneficiary1.relationshipToApplicant || request.beneficiary1.relationshipToApplicant.trim() === '') {
    errors.push('Beneficiary relationship is required');
  }

  // Email validation if provided
  if (request.applicantEmail && !isValidEmail(request.applicantEmail)) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format form data for display
export const formatNicheApplicationForDisplay = (request: NicheApplicationRequest) => {
  return {
    'Niche ID': request.nicheId,
    'Applicant Name': request.applicantName,
    'Applicant ID': request.applicantIDNo,
    'Nominee Name': request.nomineeName,
    'Nominee ID': request.nomineeIDNo,
    'Primary Beneficiary': `${request.beneficiary1.name} (${request.beneficiary1.relationshipToApplicant})`,
    'Secondary Beneficiary': request.beneficiary2 ? `${request.beneficiary2.name} (${request.beneficiary2.relationshipToApplicant})` : 'None',
    'Email': request.applicantEmail || 'Not provided',
    'Phone': request.applicantPhone || 'Not provided',
    'Address': request.applicantAddress || 'Not provided',
    'Religion': request.applicantReligion || 'Not specified'
  };
};
