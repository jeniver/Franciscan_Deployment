import { NicheApplicationRequest, RawNicheApplication, NicheApplicationListItem } from '../services/nicheApplicationService';
import { normalizeFormData, createNicheApplicationRequest, NicheApplicationFormData } from '../types/nicheApplication';
import { formatDateForInput } from './dateUtils';

// Map form data to niche application request format
export const mapFormDataToNicheApplicationRequest = (formData: Record<string, any>): NicheApplicationRequest => {
  const normalizedData = normalizeFormData(formData);
  const request = createNicheApplicationRequest(normalizedData);
  // Ensure all required fields have default values
  return {
    ...request,
    nicheId: request.nicheId ?? 0,
    applicantName: request.applicantName || '',
    applicantIDNo: request.applicantIDNo || '',
    nomineeName: request.nomineeName || '',
    nomineeIDNo: request.nomineeIDNo || '',
    beneficiary1: request.beneficiary1 || { name: '', relationshipToApplicant: '' }
  } as unknown as NicheApplicationRequest;
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
  const primaryNominee = (record.nominee || nominees?.[0]) || {};
  
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

  // Extract structured address fields from API response
  // Priority: record level > applicant.address object > direct address* fields on applicant
  const applicantAddress = applicant.address || {};
  
  // Check multiple sources for address fields (handles both nested and flat structures)
  const addressNo = record.applicantAddressNo || 
    applicantAddress.no || 
    applicantAddress.addressNo || 
    (applicant as any)?.addressNo ||  // Direct field on applicant (e.g., applicant.addressNo)
    '';
  const addressLine1 = record.applicantAddressLine1 || 
    applicantAddress.line1 || 
    applicantAddress.addressLine1 || 
    (applicant as any)?.addressLine1 ||  // Direct field on applicant (e.g., applicant.addressLine1)
    '';
  const addressLine2 = record.applicantAddressLine2 || 
    applicantAddress.line2 || 
    applicantAddress.addressLine2 || 
    (applicant as any)?.addressLine2 ||  // Direct field on applicant (e.g., applicant.addressLine2)
    '';
  const addressCity = record.applicantAddressCity || 
    applicantAddress.city || 
    applicantAddress.addressCity || 
    (applicant as any)?.addressCity ||  // Direct field on applicant (e.g., applicant.addressCity)
    '';
  const addressState = record.applicantAddressState || 
    applicantAddress.state || 
    applicantAddress.addressState || 
    (applicant as any)?.addressState ||  // Direct field on applicant (e.g., applicant.addressState)
    '';
  const addressCountry = record.applicantAddressCountry || 
    applicantAddress.country || 
    applicantAddress.addressCountry || 
    (applicant as any)?.addressCountry ||  // Direct field on applicant (e.g., applicant.addressCountry)
    'Singapore';

  // Map address fields based on API structure:
  // addressNo -> block dropdown (Block/No), addressLine1 -> blockNo, addressLine2 -> streetName
  // addressCity -> unitNo, addressState -> postalCode, addressCountry -> country
  // Handle "No" value: if addressNo is "No", set block to empty string (which shows "No" in dropdown)
  const applicantBlock = addressNo && addressNo.trim() !== '' && addressNo !== 'No' ? 'Block' : '';
  const applicantBlockNo = (addressLine1 || '').trim();
  const applicantStreetName = (addressLine2 || '').trim();
  const applicantUnitNo = (addressCity || '').trim();
  const applicantPostalCode = (addressState || '').trim();
  const applicantCountry = (addressCountry || 'Singapore').trim();

  // Build legacy address string if structured fields exist, otherwise use normalized address
  let legacyAddress = '';
  if (applicantBlockNo && applicantStreetName) {
    legacyAddress = `${applicantBlock ? applicantBlock + ' ' : ''}${applicantBlockNo} ${applicantStreetName}${applicantUnitNo ? ' #' + applicantUnitNo : ''}${applicantPostalCode ? ', ' + applicantCountry + ' ' + applicantPostalCode : ''}`;
  } else {
    legacyAddress = record.applicantAddress || normalizeAddress(applicant.address) || '';
  }

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
    // Trim name and phone fields to fix validation issues
    applicantName: (record.applicantName || applicant.name || '').trim(),
    applicantIDNo: (record.applicantIDNo || applicant.idNo || '').trim(),
    applicantEmail: (record.applicantEmail || applicant.email || '').trim(),
    applicantPhone: (record.applicantPhone || applicant.mobileNo || '').trim(),
    applicantAddress: legacyAddress,
    // Structured address fields
    applicantBlock: applicantBlock,
    applicantBlockNo: applicantBlockNo,
    applicantStreetName: applicantStreetName,
    applicantUnitNo: applicantUnitNo,
    applicantPostalCode: applicantPostalCode,
    applicantCountry: applicantCountry,
    applicantReligion:
      record.applicantReligion ||
      (typeof applicant.isCatholic === 'boolean'
        ? applicant.isCatholic
          ? 'Catholic'
          : 'Non-Catholic'
        : ''),
    applicantHomeTel: (record.applicantHomeTel || applicant.homeTelNo || '').trim(),
    applicantOfficeTel: (record.applicantOfficeTel || applicant.officeTelNo || '').trim(),
    contactStatus: record.contactStatus || 'Active',
    contactRemarks: record.contactRemarks || '',
    remarks: record.remarks || '',
    bookedDate: record.bookedDate || '',
    beneficiaries,
    beneficiary1: record.beneficiary1 || beneficiaries?.[0] || {
      name: '',
      relationshipToApplicant: ''
    },
    nominees,
    nomineeName:
      (record.nomineeName ||
      primaryNominee.fullName ||
      primaryNominee.name ||
      '').trim(),
    nomineeIDNo:
      (record.nomineeIDNo ||
      primaryNominee.nric ||
      '').trim(),
    nomineeRelationship:
      (record.nomineeRelationship ||
      primaryNominee.relationship ||
      '').trim(),
    nomineeAddress: record.nomineeAddress || normalizeAddress(primaryNominee.address),
    nomineePhone:
      (record.nomineePhone ||
      primaryNominee.contactNumber ||
      primaryNominee.phone ||
      '').trim(),
    nomineeEmail: (record.nomineeEmail || primaryNominee.email || '').trim(),
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
