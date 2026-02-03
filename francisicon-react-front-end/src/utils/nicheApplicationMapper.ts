import type { CreateNichiApplicationRequest } from '../services/nichiApplicationService';
import type { DeceasedDetail } from '../store/nichibookingSlice';
import { mapComponentToBackendFields } from './addressMapper';

/**
 * Niche Application Mapper Utility
 * 
 * This unified mapper handles both:
 * 1. Mapping form data to API request structure (for creation)
 * 2. Mapping API response to form data structure (for loading existing data)
 */

/**
 * Maps Nichi Booking form data to the API request structure
 * 
 * @param formData - The form data from Nichi Booking page
 * @returns Mapped request data matching the API structure
 */
export function mapNichiBookingToApplicationRequest(formData: {
  // Invoice fields
  invoiceNumber: string;
  paymentMode: string;
  nichiQuantity: number;
  nichiUnitPrice: number;
  refDocNumber: string;
  lineTaxPercent: number;
  itemId: number;
  
  // Optional: Applicant details (if provided)
  applicantName?: string;
  applicantIdNo?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantAddress?: string;
  applicantHomeTel?: string;
  applicantOfficeTel?: string;
  applicantIsCatholic?: boolean;
  
  // Optional: Nominee details (if provided)
  nomineeName?: string;
  nomineeIdNo?: string;
  nomineeEmail?: string;
  nomineePhone?: string;
  nomineeAddress?: string;
  nomineeRelationship?: string;
  nomineeHomeTel?: string;
  nomineeOfficeTel?: string;
  
  // Optional: Beneficiary details (if provided)
  beneficiaryName?: string;
  beneficiaryIdNo?: string;
  beneficiaryRelationship?: string;
  beneficiaryDateOfBirth?: string;
  beneficiaryIsCatholic?: boolean;
  
  // Optional: Niche details (if provided)
  nicheNumber?: string;
  nicheCode?: string;
  nicheId?: number;
  chapelId?: number;
  chapelCode?: string;
  chapelName?: string;
  wallId?: number;
  wallCode?: string;
  wallName?: string;
  rowId?: number;
  rowCode?: string;
  rowNumber?: string;
  rowLevel?: string | number;
  
  // Deceased details (from Inscription)
  deceasedDetails?: DeceasedDetail[];
  
  // Additional details (from Inscription)
  selectedBibleChoiceId?: number | null;
  phraseOfChoice?: string;
  crossType?: string;
}): CreateNichiApplicationRequest {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/\s/g, '-'); // Format: "05-Jun-2025"

  // Calculate invoice amounts
  const subtotal = formData.nichiQuantity * formData.nichiUnitPrice;
  const taxAmount = Math.round(subtotal * (formData.lineTaxPercent / 100));
  const totalAmount = subtotal + taxAmount;

  // Map deceased details
  const deceased1 = formData.deceasedDetails && formData.deceasedDetails.length > 0
    ? {
        name: formData.deceasedDetails[0].nameOfDeceased || null,
        dateDied: formData.deceasedDetails[0].dateDied 
          ? formatDateForAPI(formData.deceasedDetails[0].dateDied) 
          : null,
        internmentDate: formData.deceasedDetails[0].internmentDate
          ? formatDateForAPI(formData.deceasedDetails[0].internmentDate)
          : null,
        deathCertificateNo: formData.deceasedDetails[0].deathCertNo || null,
      }
    : {
        name: null,
        dateDied: null,
        internmentDate: null,
        deathCertificateNo: null,
      };

  const deceased2 = formData.deceasedDetails && formData.deceasedDetails.length > 1
    ? {
        name: formData.deceasedDetails[1].nameOfDeceased || null,
        dateDied: formData.deceasedDetails[1].dateDied
          ? formatDateForAPI(formData.deceasedDetails[1].dateDied)
          : null,
        internmentDate: formData.deceasedDetails[1].internmentDate
          ? formatDateForAPI(formData.deceasedDetails[1].internmentDate)
          : null,
        deathCertificateNo: formData.deceasedDetails[1].deathCertNo || null,
      }
    : undefined;

  // Map applicant (use provided data or defaults)
  const applicant = {
    name: formData.applicantName || 'N/A',
    address: formData.applicantAddress || 'N/A',
    email: formData.applicantEmail || '',
    idNo: formData.applicantIdNo || 'N/A',
    mobileNo: formData.applicantPhone || '',
    homeTelNo: formData.applicantHomeTel || '',
    officeTelNo: formData.applicantOfficeTel || '',
    isCatholic: formData.applicantIsCatholic ?? false,
  };

  // Map nominee (optional)
  const nominee = formData.nomineeName
    ? {
        name: formData.nomineeName,
        address: formData.nomineeAddress || '',
        email: formData.nomineeEmail || '',
        idNo: formData.nomineeIdNo || '',
        mobileNo: formData.nomineePhone || '',
        homeTelNo: formData.nomineeHomeTel || '',
        officeTelNo: formData.nomineeOfficeTel || '',
        relationship: formData.nomineeRelationship || '',
      }
    : undefined;

  // Map beneficiaries (optional)
  const beneficiaries = formData.beneficiaryName
    ? [
        {
          name: formData.beneficiaryName,
          idNo: formData.beneficiaryIdNo || '',
          isCatholic: formData.beneficiaryIsCatholic ?? false,
          relationshipToApplicant: formData.beneficiaryRelationship || '',
          dateOfBirth: formData.beneficiaryDateOfBirth
            ? formatDateForAPI(formData.beneficiaryDateOfBirth)
            : undefined,
        },
      ]
    : [];

  // Extract nicheId from nicheCode or formData
  let nicheId: number | undefined;
  if (formData.nicheId) {
    nicheId = formData.nicheId;
  } else if (formData.nicheCode) {
    // Try to parse nicheCode as number (e.g., "1407" -> 1407)
    const parsed = parseInt(formData.nicheCode, 10);
    if (!isNaN(parsed)) {
      nicheId = parsed;
    }
  } else if (formData.nicheNumber) {
    const parsed = parseInt(formData.nicheNumber, 10);
    if (!isNaN(parsed)) {
      nicheId = parsed;
    }
  }

  // Map niche (use provided data or minimal defaults) - for the nested structure
  const toRowNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const str = String(value).trim();
    if (!str) return null;
    // Accept pure numeric or strings containing digits (e.g. "Row 12" -> 12)
    const digits = str.match(/\d+/);
    if (!digits) return null;
    const parsed = parseInt(digits[0], 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const niche = {
    number: formData.nicheNumber || formData.nicheCode || formData.refDocNumber || 'N/A',
    code: formData.nicheCode || formData.nicheNumber || formData.refDocNumber || 'N/A',
    // `NichiNiche.rowNumber` is numeric in our types
    rowNumber: toRowNumber(formData.rowNumber),
    wallName: formData.wallName || null,
    chapelName: formData.chapelName || null,
    totalAmount: formData.nichiUnitPrice,
    lineAmount: totalAmount,
    location: {
      chapel: {
        chapelId: formData.chapelId || 0,
        chapelCode: formData.chapelCode || 'N/A',
        chapelName: formData.chapelName || 'N/A',
      },
      wall: {
        wallId: formData.wallId || 0,
        wallCode: formData.wallCode || 'N/A',
        wallName: formData.wallName || 'N/A',
      },
      row: {
        rowId: formData.rowId || 0,
        rowCode: formData.rowCode || 'N/A',
        level: typeof formData.rowLevel === 'number' ? formData.rowLevel : (formData.rowLevel ? parseInt(String(formData.rowLevel), 10) || 0 : 0),
      },
    },
  };

  // Map nicheDetails (flat structure) - required by API
  const nicheDetails = {
    chapel: formData.chapelName || formData.chapelCode || '',
    chapelId: formData.chapelId || undefined,
    chapelCode: formData.chapelCode || '',
    nicheCode: formData.nicheCode || formData.nicheNumber || '',
    nicheNumber: formData.nicheNumber || formData.nicheCode || '',
    nicheId: nicheId,
    wallName: formData.wallName || '',
    wallCode: formData.wallCode || '',
    rowNumber: formData.rowNumber ? String(formData.rowNumber) : '',
    rowLevel: formData.rowLevel ? String(formData.rowLevel) : '',
  };

  // Map invoice
  const invoice = {
    invoiceNo: formData.invoiceNumber,
    invoiceDate: formattedDate,
    taxAmount: taxAmount,
    invoicePayingAmount: totalAmount,
    totalAmount: totalAmount,
    paymentMode: mapPaymentModeToNumber(formData.paymentMode),
    refDocNumber: formData.refDocNumber,
  };

  // Map additional details
  const additionalDetails = {
    bibleInscriptionChoiceId: formData.selectedBibleChoiceId || null,
    additionalInscriptionPhrase: formData.phraseOfChoice || undefined,
    crossType: formData.crossType || undefined,
  };

  // Build the request
  const request: CreateNichiApplicationRequest = {
    appliedDate: formattedDate,
    agreementDate: formattedDate,
    applicant,
    nominee,
    beneficiaries: beneficiaries.length > 0 ? beneficiaries : undefined,
    niche,
    nicheDetails, // Add the flat nicheDetails structure
    invoice,
    deceased: {
      deceased1,
      ...(deceased2 && { deceased2 }),
    },
    additionalDetails: Object.keys(additionalDetails).length > 0 ? additionalDetails : undefined,
    consentForm: {
      status: 'pending',
    },
    agreement: {
      status: 'pending',
    },
  };

  return request;
}

/**
 * Maps loaded Nichi application data to form fields
 * This populates the form when viewing an existing application
 * 
 * @param applicationData - The loaded application data from API
 * @returns Form data object with all fields populated
 */
export function mapNichiApplicationToFormData(
  applicationData: any // Using 'any' to handle various response structures
): Record<string, any> {
  const formData: Record<string, any> = {};

  // Map invoice fields
  if (applicationData.invoice) {
    formData.invoiceNumber = applicationData.invoice.invoiceNo || '';
    formData.paymentMode = mapPaymentModeToString(applicationData.invoice.paymentMode);
    formData.refDocNumber = applicationData.invoice.refDocNumber || applicationData.applicationCode || '';
    
    // Calculate quantity and unit price from invoice amounts
    if (applicationData.invoice.totalAmount && applicationData.niche) {
      formData.nichiUnitPrice = applicationData.niche.totalAmount || 0;
      formData.nichiQuantity = 1; // Default to 1 for Nichi
      
      // Calculate tax percent if possible
      if (applicationData.invoice.taxAmount && applicationData.invoice.totalAmount) {
        const subtotal = applicationData.invoice.totalAmount - applicationData.invoice.taxAmount;
        if (subtotal > 0) {
          formData.lineTaxPercent = Math.round((applicationData.invoice.taxAmount / subtotal) * 100);
        }
      }
    }
  }

  // Map niche details - CRITICAL: Reset all niche fields
  // Priority: nicheDetails (flat) > niche.location (nested)
  let nicheId: number | undefined;
  let nicheCode = '';
  let nicheNumber = '';
  let chapelId: number | undefined;
  let chapelCode = '';
  let chapelName = '';
  let wallId: number | undefined;
  let wallCode = '';
  let wallName = '';
  let rowId: number | undefined;
  let rowCode = '';
  let rowNumber = '';
  let rowLevel = '';

  // First, try to get from nicheDetails (flat structure) - HIGHEST PRIORITY
  if (applicationData.nicheDetails) {
    const nicheDetails = applicationData.nicheDetails;
    nicheId = nicheDetails.nicheId;
    nicheCode = nicheDetails.nicheCode || '';
    nicheNumber = nicheDetails.nicheNumber || '';
    chapelId = nicheDetails.chapelId;
    chapelCode = nicheDetails.chapelCode || '';
    chapelName = nicheDetails.chapel || '';
    wallId = nicheDetails.wallId;
    wallCode = nicheDetails.wallCode || '';
    wallName = nicheDetails.wallName || '';
    rowId = nicheDetails.rowId;
    rowCode = nicheDetails.rowCode || '';
    rowNumber = nicheDetails.rowNumber || '';
    rowLevel = nicheDetails.rowLevel || '';
  }

  // Fallback to nested niche.location structure if nicheDetails not available
  if (applicationData.niche) {
    const niche = applicationData.niche;
    
    // Extract nicheId from niche code or number if not already set
    if (!nicheId) {
      if (niche.code) {
        const parsed = parseInt(niche.code, 10);
        if (!isNaN(parsed)) {
          nicheId = parsed;
        }
      } else if (niche.number) {
        const parsed = parseInt(niche.number, 10);
        if (!isNaN(parsed)) {
          nicheId = parsed;
        }
      }
    }

    // Use nested structure values only if not already set from nicheDetails
    if (!nicheCode) nicheCode = niche.code || niche.number || '';
    if (!nicheNumber) nicheNumber = niche.number || niche.code || '';
    
    // Map location details (only if not already set from nicheDetails)
    if (niche.location) {
      if (niche.location.chapel) {
        if (chapelId === undefined) chapelId = niche.location.chapel.chapelId || undefined;
        if (!chapelCode) chapelCode = niche.location.chapel.chapelCode || '';
        if (!chapelName) chapelName = niche.location.chapel.chapelName || niche.location.chapel.chapelCode || '';
      }
      
      if (niche.location.wall) {
        if (wallId === undefined) wallId = niche.location.wall.wallId || undefined;
        if (!wallCode) wallCode = niche.location.wall.wallCode || '';
        if (!wallName) wallName = niche.location.wall.wallName || niche.location.wall.wallCode || '';
      }
      
      if (niche.location.row) {
        if (rowId === undefined) rowId = niche.location.row.rowId || undefined;
        if (!rowCode) rowCode = niche.location.row.rowCode || '';
        if (!rowLevel) rowLevel = niche.location.row.level ? String(niche.location.row.level) : '';
        if (!rowNumber) rowNumber = niche.location.row.rowCode || '';
      }
    }
  }

  // Set all form data fields
  formData.nicheId = nicheId;
  formData.nicheCode = nicheCode;
  formData.nicheNumber = nicheNumber;
  formData.chapelId = chapelId;
  formData.chapelCode = chapelCode;
  formData.chapelName = chapelName;
  formData.wallId = wallId;
  formData.wallCode = wallCode;
  formData.wallName = wallName;
  formData.rowId = rowId;
  formData.rowCode = rowCode;
  formData.rowNumber = rowNumber;
  formData.rowLevel = rowLevel;

  // Map applicant details (optional)
  if (applicationData.applicant) {
    formData.applicantName = applicationData.applicant.name || '';
    formData.applicantIdNo = applicationData.applicant.idNo || '';
    formData.applicantEmail = applicationData.applicant.email || '';
    formData.applicantPhone = applicationData.applicant.mobileNo || '';
    // Prefer structured address parts when present, but keep legacy address string
    formData.applicantAddress = applicationData.applicant.address || '';
    if (applicationData.applicant.addressNo ||
        applicationData.applicant.addressLine1 ||
        applicationData.applicant.addressLine2 ||
        applicationData.applicant.addressCity ||
        applicationData.applicant.addressState ||
        applicationData.applicant.addressCountry) {
      formData.applicantBlock = applicationData.applicant.addressNo || '';
      formData.applicantBlockNo = applicationData.applicant.addressLine1 || '';
      formData.applicantStreetName = applicationData.applicant.addressLine2 || '';
      formData.applicantUnitNo = applicationData.applicant.addressCity || '';
      formData.applicantPostalCode = applicationData.applicant.addressState || '';
      formData.applicantCountry = applicationData.applicant.addressCountry || 'Singapore';
    }
    formData.applicantHomeTel = applicationData.applicant.homeTelNo || '';
    formData.applicantOfficeTel = applicationData.applicant.officeTelNo || '';
    // Map religion dropdown from isCatholic when possible
    formData.applicantIsCatholic = applicationData.applicant.isCatholic ?? false;
    if (!formData.applicantReligion) {
      if (applicationData.applicant.isCatholic === true) {
        formData.applicantReligion = 'Catholic';
      } else if (applicationData.applicant.isCatholic === false) {
        formData.applicantReligion = 'Non Catholic';
      }
    }
  }

  // Map nominee details (optional)
  if (applicationData.nominee) {
    formData.nomineeName = applicationData.nominee.name || '';
    formData.nomineeIdNo = applicationData.nominee.idNo || '';
    formData.nomineeEmail = applicationData.nominee.email || '';
    formData.nomineePhone = applicationData.nominee.mobileNo || '';
    formData.nomineeAddress = applicationData.nominee.address || '';
    formData.nomineeRelationship = applicationData.nominee.relationship || '';
    formData.nomineeHomeTel = applicationData.nominee.homeTelNo || '';
    formData.nomineeOfficeTel = applicationData.nominee.officeTelNo || '';
    // Map structured nominee address parts when present
    if (applicationData.nominee.addressNo ||
        applicationData.nominee.addressLine1 ||
        applicationData.nominee.addressLine2 ||
        applicationData.nominee.addressCity ||
        applicationData.nominee.addressState ||
        applicationData.nominee.addressCountry) {
      formData.nomineeBlock = applicationData.nominee.addressNo || '';
      formData.nomineeBlockNo = applicationData.nominee.addressLine1 || '';
      formData.nomineeStreetName = applicationData.nominee.addressLine2 || '';
      formData.nomineeUnitNo = applicationData.nominee.addressCity || '';
      formData.nomineePostalCode = applicationData.nominee.addressState || '';
      formData.nomineeCountry = applicationData.nominee.addressCountry || formData.applicantCountry || 'Singapore';
    }
  }
  
  // Map second nominee details (optional)
  if (applicationData.nominee2) {
    formData.nomineeName2 = applicationData.nominee2.name || '';
    formData.nomineeIdNo2 = applicationData.nominee2.idNo || '';
    formData.nomineeEmail2 = applicationData.nominee2.email || '';
    formData.nomineePhone2 = applicationData.nominee2.mobileNo || '';
    formData.nomineeAddress2 = applicationData.nominee2.address || '';
    formData.nomineeRelationship2 = applicationData.nominee2.relationship || '';
    formData.nomineeHomeTel2 = applicationData.nominee2.homeTelNo || '';
    formData.nomineeOfficeTel2 = applicationData.nominee2.officeTelNo || '';
    // Map structured second nominee address parts when present
    if (applicationData.nominee2.addressNo ||
        applicationData.nominee2.addressLine1 ||
        applicationData.nominee2.addressLine2 ||
        applicationData.nominee2.addressCity ||
        applicationData.nominee2.addressState ||
        applicationData.nominee2.addressCountry) {
      formData.nomineeBlock2 = applicationData.nominee2.addressNo || '';
      formData.nomineeBlockNo2 = applicationData.nominee2.addressLine1 || '';
      formData.nomineeStreetName2 = applicationData.nominee2.addressLine2 || '';
      formData.nomineeUnitNo2 = applicationData.nominee2.addressCity || '';
      formData.nomineePostalCode2 = applicationData.nominee2.addressState || '';
      formData.nomineeCountry2 = applicationData.nominee2.addressCountry || formData.applicantCountry || 'Singapore';
    }
  }

  // Map deceased details
  const deceasedDetailsArray: DeceasedDetail[] = [];
  if (applicationData.deceased) {
    if (applicationData.deceased.deceased1 && applicationData.deceased.deceased1.name) {
      deceasedDetailsArray.push({
        selectBeneficiary: '',
        nameOfDeceased: applicationData.deceased.deceased1.name || '',
        dateBorn: '',
        dateDied: applicationData.deceased.deceased1.dateDied 
          ? formatDateFromAPI(applicationData.deceased.deceased1.dateDied) 
          : '',
        internmentDate: applicationData.deceased.deceased1.internmentDate
          ? formatDateFromAPI(applicationData.deceased.deceased1.internmentDate.split(' ')[0]) // Remove time if present
          : '',
        internmentTime: applicationData.deceased.deceased1.internmentDate
          ? (applicationData.deceased.deceased1.internmentDate.includes(' ') 
              ? applicationData.deceased.deceased1.internmentDate.split(' ')[1] || '12:00'
              : '12:00')
          : '12:00',
        deathCertNo: applicationData.deceased.deceased1.deathCertificateNo || '',
      });
    }
    
    if (applicationData.deceased.deceased2 && applicationData.deceased.deceased2.name) {
      deceasedDetailsArray.push({
        selectBeneficiary: '',
        nameOfDeceased: applicationData.deceased.deceased2.name || '',
        dateBorn: '',
        dateDied: applicationData.deceased.deceased2.dateDied
          ? formatDateFromAPI(applicationData.deceased.deceased2.dateDied)
          : '',
        internmentDate: applicationData.deceased.deceased2.internmentDate
          ? formatDateFromAPI(applicationData.deceased.deceased2.internmentDate.split(' ')[0])
          : '',
        internmentTime: applicationData.deceased.deceased2.internmentDate
          ? (applicationData.deceased.deceased2.internmentDate.includes(' ')
              ? applicationData.deceased.deceased2.internmentDate.split(' ')[1] || '12:00'
              : '12:00')
          : '12:00',
        deathCertNo: applicationData.deceased.deceased2.deathCertificateNo || '',
      });
    }
  }
  formData.deceasedDetails = deceasedDetailsArray;

  // Map additional details (API may provide this under data.additionalDetails or flattened)
  const additionalDetails = applicationData.additionalDetails || applicationData.additionalDetails;
  if (additionalDetails) {
    formData.selectedBibleChoiceId = additionalDetails.bibleInscriptionChoiceId || null;
    formData.phraseOfChoice = additionalDetails.additionalInscriptionPhrase || 
                               additionalDetails.bibleInscriptionText || '';
    formData.crossType = additionalDetails.crossType || 'Crucifix';
  }

  return formData;
}

/**
 * Format date from YYYY-MM-DD to DD-MMM-YYYY format
 */
function formatDateForAPI(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format date from DD-MMM-YYYY to YYYY-MM-DD format for input fields
 */
function formatDateFromAPI(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    // Handle DD-MMM-YYYY format (e.g., "05-Jun-2025")
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(parts[1]);
      if (monthIndex === -1) return dateStr;
      const month = String(monthIndex + 1).padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    
    // If already in YYYY-MM-DD format, return as is
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Map payment mode string to number
 */
function mapPaymentModeToNumber(paymentMode: string): number {
  const modeMap: Record<string, number> = {
    'Cash': 1,
    'Cheque': 2,
    'Bank Transfer': 3,
    'Credit Card': 4,
  };
  
  return modeMap[paymentMode] || 1; // Default to Cash (1)
}

/**
 * Map payment mode number to string
 */
function mapPaymentModeToString(paymentMode: number | string): string {
  if (typeof paymentMode === 'string') {
    return paymentMode;
  }
  
  const modeMap: Record<number, string> = {
    1: 'Cash',
    2: 'Cheque',
    3: 'Bank Transfer',
    4: 'Credit Card',
  };
  
  return modeMap[paymentMode] || 'Cash';
}

/**
 * Maps form data to niche application request structure
 * @param formData - The form data to map
 * @returns Mapped request data
 */
export function mapFormDataToNicheApplicationRequest(formData: Record<string, any>): any {
  // Map applicant address fields using utility function
  const applicantComponentFields = {
    block: formData.applicantBlock || '',
    blockNo: formData.applicantBlockNo || '',
    streetName: formData.applicantStreetName || '',
    unitNo: formData.applicantUnitNo || '',
    postalCode: formData.applicantPostalCode || '',
    country: formData.applicantCountry || 'Singapore'
  };
  
  const applicantBackendFields = mapComponentToBackendFields(applicantComponentFields);
  
  // Map nominee address fields using utility function
  const nomineeComponentFields = {
    block: formData.nomineeBlock || '',
    blockNo: formData.nomineeBlockNo || '',
    streetName: formData.nomineeStreetName || '',
    unitNo: formData.nomineeUnitNo || '',
    postalCode: formData.nomineePostalCode || '',
    country: formData.nomineeCountry || formData.applicantCountry || 'Singapore'
  };
  
  const nomineeBackendFields = mapComponentToBackendFields(nomineeComponentFields);
  
  // Map second nominee address fields using utility function
  const nominee2ComponentFields = {
    block: formData.nomineeBlock2 || '',
    blockNo: formData.nomineeBlockNo2 || '',
    streetName: formData.nomineeStreetName2 || '',
    unitNo: formData.nomineeUnitNo2 || '',
    postalCode: formData.nomineePostalCode2 || '',
    country: formData.nomineeCountry2 || formData.applicantCountry || 'Singapore'
  };
  
  const nominee2BackendFields = mapComponentToBackendFields(nominee2ComponentFields);
  
  // Map structured nominee objects if they exist
  const structuredNominee = formData.nominee;
  const structuredNominee2 = formData.nominee2;
  
  // Create mapped request with proper field structure
  const mappedRequest = {
    ...formData,
    // Applicant address fields (backend format)
    applicantAddressNo: applicantBackendFields.addressNo,
    applicantAddressLine1: applicantBackendFields.addressLine1,
    applicantAddressLine2: applicantBackendFields.addressLine2,
    applicantAddressCity: applicantBackendFields.addressCity,
    applicantAddressState: applicantBackendFields.addressState,
    applicantAddressCountry: applicantBackendFields.addressCountry,
    
    // Nominee address fields (backend format)
    nomineeAddressNo: nomineeBackendFields.addressNo,
    nomineeAddressLine1: nomineeBackendFields.addressLine1,
    nomineeAddressLine2: nomineeBackendFields.addressLine2,
    nomineeAddressCity: nomineeBackendFields.addressCity,
    nomineeAddressState: nomineeBackendFields.addressState,
    nomineeAddressCountry: nomineeBackendFields.addressCountry,
    
    // Second nominee address fields (backend format)
    nomineeAddressNo2: nominee2BackendFields.addressNo,
    nomineeAddressLine12: nominee2BackendFields.addressLine1,
    nomineeAddressLine22: nominee2BackendFields.addressLine2,
    nomineeAddressCity2: nominee2BackendFields.addressCity,
    nomineeAddressState2: nominee2BackendFields.addressState,
    nomineeAddressCountry2: nominee2BackendFields.addressCountry,
    
    // Structured nominee objects (new format) - prioritize these over individual fields
    ...(structuredNominee && {
      nominee: {
        name: formData.nomineeName || structuredNominee.name || '',
        address: formData.nomineeAddress || structuredNominee.address || '',
        addressNo: formData.nomineeAddressNo || structuredNominee.addressNo || '',
        addressLine1: formData.nomineeBlockNo || structuredNominee.addressLine1 || '',
        addressLine2: formData.nomineeStreetName || structuredNominee.addressLine2 || null,
        addressCity: formData.nomineeUnitNo || structuredNominee.addressCity || null,
        addressState: formData.nomineePostalCode || structuredNominee.addressState || null,
        addressCountry: formData.nomineeCountry || structuredNominee.addressCountry || 'Singapore',
        email: formData.nomineeEmail || structuredNominee.email || '',
        idNo: formData.nomineeIDNo || structuredNominee.idNo || '',
        mobileNo: formData.nomineePhone || structuredNominee.mobileNo || '',
        homeTelNo: formData.nomineeHomeTel || structuredNominee.homeTelNo || '',
        officeTelNo: formData.nomineeOfficeTel || structuredNominee.officeTelNo || '',
        relationship: formData.nomineeRelationship || structuredNominee.relationship || ''
      }
    }),
    ...(structuredNominee2 && {
      nominee2: {
        name: formData.nomineeName2 || structuredNominee2.name || '',
        address: formData.nomineeAddress2 || structuredNominee2.address || '',
        addressNo: formData.nomineeAddressNo2 || structuredNominee2.addressNo || '',
        addressLine1: formData.nomineeBlockNo2 || structuredNominee2.addressLine1 || '',
        addressLine2: formData.nomineeStreetName2 || structuredNominee2.addressLine2 || null,
        addressCity: formData.nomineeUnitNo2 || structuredNominee2.addressCity || null,
        addressState: formData.nomineePostalCode2 || structuredNominee2.addressState || null,
        addressCountry: formData.nomineeCountry2 || structuredNominee2.addressCountry || 'Singapore',
        email: formData.nomineeEmail2 || structuredNominee2.email || '',
        idNo: formData.nomineeIDNo2 || structuredNominee2.idNo || '',
        mobileNo: formData.nomineePhone2 || structuredNominee2.mobileNo || '',
        homeTelNo: formData.nomineeHomeTel2 || structuredNominee2.homeTelNo || '',
        officeTelNo: formData.nomineeOfficeTel2 || structuredNominee2.officeTelNo || '',
        relationship: formData.nomineeRelationship2 || structuredNominee2.relationship || ''
      }
    }),
    
    // Ensure required fields are present
    applicantName: formData.applicantName || '',
    applicantIDNo: formData.applicantIDNo || '',
    applicantEmail: formData.applicantEmail || '',
    applicantPhone: formData.applicantPhone || '',
    nomineeName: formData.nomineeName || '',
    nomineeIDNo: formData.nomineeIDNo || '',
    nomineeEmail: formData.nomineeEmail || '',
    nomineePhone: formData.nomineePhone || '',
    nomineeName2: formData.nomineeName2 || '',
    nomineeIDNo2: formData.nomineeIDNo2 || '',
    nomineeEmail2: formData.nomineeEmail2 || '',
    nomineePhone2: formData.nomineePhone2 || '',
    
    // Application ID generation should be handled by the backend
    // but we can prepare the data structure here if needed
  };
  
  return mappedRequest;
}

/**
 * Maps API application data to form data structure
 * @param apiData - The API response data
 * @returns Form data object
 */
export function mapApiApplicationToFormData(apiData: any): Record<string, any> {
  // Create a copy of the API data to avoid mutating the original
  const formData = { ...apiData };
  
  // Ensure nominee objects are properly structured for the frontend
  if (apiData.nominee) {
    formData.nominee = {
      name: apiData.nominee.name || '',
      address: apiData.nominee.address || '',
      addressNo: apiData.nominee.addressNo || '',
      addressLine1: apiData.nominee.addressLine1 || '',
      addressLine2: apiData.nominee.addressLine2 || null,
      addressCity: apiData.nominee.addressCity || null,
      addressState: apiData.nominee.addressState || null,
      addressCountry: apiData.nominee.addressCountry || 'Singapore',
      email: apiData.nominee.email || '',
      idNo: apiData.nominee.idNo || '',
      mobileNo: apiData.nominee.mobileNo || '',
      homeTelNo: apiData.nominee.homeTelNo || '',
      officeTelNo: apiData.nominee.officeTelNo || '',
      relationship: apiData.nominee.relationship || ''
    };
  }
  
  if (apiData.nominee2) {
    formData.nominee2 = {
      name: apiData.nominee2.name || '',
      address: apiData.nominee2.address || '',
      addressNo: apiData.nominee2.addressNo || '',
      addressLine1: apiData.nominee2.addressLine1 || '',
      addressLine2: apiData.nominee2.addressLine2 || null,
      addressCity: apiData.nominee2.addressCity || null,
      addressState: apiData.nominee2.addressState || null,
      addressCountry: apiData.nominee2.addressCountry || 'Singapore',
      email: apiData.nominee2.email || '',
      idNo: apiData.nominee2.idNo || '',
      mobileNo: apiData.nominee2.mobileNo || '',
      homeTelNo: apiData.nominee2.homeTelNo || '',
      officeTelNo: apiData.nominee2.officeTelNo || '',
      relationship: apiData.nominee2.relationship || ''
    };
  }
  
  return formData;
}

/**
 * Normalizes a niche application list item
 * @param item - The raw list item from API
 * @returns Normalized list item
 */
export function normalizeNicheApplicationListItem(item: any): any {
  // This is a placeholder - the actual implementation would normalize the item structure
  // For now, return the item as-is
  return item;
}