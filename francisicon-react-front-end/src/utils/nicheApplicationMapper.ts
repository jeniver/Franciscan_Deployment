import type { CreateNichiApplicationRequest } from '../services/nichiApplicationService';
import type { DeceasedDetail } from '../store/nichibookingSlice';
import { mapComponentToBackendFields, formatAddress } from './addressMapper';
import { paymentModeToCode, paymentModeToLabel } from './paymentMode';

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
  // Inscription address fields
  inscriptionAddress?: string;
  inscriptionAddressNo?: string;
  inscriptionAddressLine1?: string;
  inscriptionAddressLine2?: string;
  inscriptionAddressCity?: string;
  inscriptionAddressState?: string;
  inscriptionAddressCountry?: string;

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
  remarks?: string;
}): CreateNichiApplicationRequest {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/\s/g, '-'); // Format: "05-Jun-2025"

  // Calculate invoice amounts
  const subtotal = formData.nichiQuantity * formData.nichiUnitPrice;
  const taxAmount = Math.round(subtotal * (formData.lineTaxPercent / 100) * 100) / 100;
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
      storagePeriodFrom: formData.deceasedDetails[0].storagePeriodFrom || null,
      storagePeriodTo: formData.deceasedDetails[0].storagePeriodTo || null,
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
      storagePeriodFrom: formData.deceasedDetails[1].storagePeriodFrom || null,
      storagePeriodTo: formData.deceasedDetails[1].storagePeriodTo || null,
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
    // Add inscription address
    inscriptionAddress: formData.inscriptionAddress || '',
    inscriptionAddressNo: formData.inscriptionAddressNo || '',
    inscriptionAddressLine1: formData.inscriptionAddressLine1 || '',
    inscriptionAddressLine2: formData.inscriptionAddressLine2 || '',
    inscriptionAddressCity: formData.inscriptionAddressCity || '',
    inscriptionAddressState: formData.inscriptionAddressState || '',
    inscriptionAddressCountry: formData.inscriptionAddressCountry || 'Singapore',
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
    remarks: formData.remarks || undefined,
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
    remarks: formData.remarks || undefined,
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
    formData.paymentMode = paymentModeToLabel(applicationData.invoice.paymentMode);
    formData.refDocNumber = applicationData.invoice.refDocNumber || applicationData.applicationCode || '';

    // Resolve itemId from invoice details or niche level
    if (applicationData.invoice?.invoiceDetails?.[0]?.itemId) {
      formData.itemId = applicationData.invoice.invoiceDetails[0].itemId;
    } else if (applicationData.niche?.location?.row?.level) {
      formData.itemId = applicationData.niche.location.row.level;
    }
  }

  // Extract unit price from multiple sources with priority
  const unitPriceFromDetails = applicationData.invoice?.invoiceDetails?.[0]?.unitPrice
    || applicationData.invoice?.invoiceDetails?.[0]?.unitAmount;
  const unitPriceFromNiche = applicationData.niche?.totalAmount
    || applicationData.niche?.defaultAmount
    || applicationData.niche?.location?.row?.rowPrice;

  formData.nichiUnitPrice = unitPriceFromDetails || unitPriceFromNiche || 0;
  formData.nichiQuantity = 1;

  // Calculate tax percent from invoice data if available
  if (applicationData.invoice?.taxAmount && formData.nichiUnitPrice > 0) {
    const subtotal = formData.nichiUnitPrice;
    formData.lineTaxPercent = Math.round((applicationData.invoice.taxAmount / subtotal) * 100);
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
  formData.remarks = applicationData.remarks || applicationData.additionalDetails?.remarks || '';

  // Map applicant details (optional)
  if (applicationData.applicant) {
    formData.applicantName = applicationData.applicant.name || '';
    formData.applicantIdNo = applicationData.applicant.idNo || '';
    formData.applicantIDNo = applicationData.applicant.idNo || '';
    formData.contactNric = applicationData.applicant.idNo || '';
    formData.applicantEmail = applicationData.applicant.email || '';
    formData.applicantPhone = applicationData.applicant.mobileNo || '';
    // Prefer structured address parts when present, but keep legacy address string
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

      // Reconstruct address string using new format
      formData.applicantAddress = formatAddress({
        block: formData.applicantBlock,
        blockNo: formData.applicantBlockNo,
        streetName: formData.applicantStreetName,
        unitNo: formData.applicantUnitNo,
        postalCode: formData.applicantPostalCode,
        country: formData.applicantCountry
      });
    } else {
      formData.applicantAddress = applicationData.applicant.address || '';
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

      // Reconstruct address string using new format
      formData.nomineeAddress = formatAddress({
        block: formData.nomineeBlock,
        blockNo: formData.nomineeBlockNo,
        streetName: formData.nomineeStreetName,
        unitNo: formData.nomineeUnitNo,
        postalCode: formData.nomineePostalCode,
        country: formData.nomineeCountry
      });
    } else {
      formData.nomineeAddress = applicationData.nominee.address || '';
    }
  }

  // Map second nominee details (optional)
  if (applicationData.nominee2) {
    formData.nomineeName2 = applicationData.nominee2.name || '';
    formData.nomineeIdNo2 = applicationData.nominee2.idNo || '';
    formData.nomineeEmail2 = applicationData.nominee2.email || '';
    formData.nomineePhone2 = applicationData.nominee2.mobileNo || '';
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

      // Reconstruct address string using new format
      formData.nomineeAddress2 = formatAddress({
        block: formData.nomineeBlock2,
        blockNo: formData.nomineeBlockNo2,
        streetName: formData.nomineeStreetName2,
        unitNo: formData.nomineeUnitNo2,
        postalCode: formData.nomineePostalCode2,
        country: formData.nomineeCountry2
      });
    } else {
      formData.nomineeAddress2 = applicationData.nominee2.address || '';
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
        storagePeriodFrom: applicationData.deceased.deceased1.storagePeriodFrom || '',
        storagePeriodTo: applicationData.deceased.deceased1.storagePeriodTo || '',
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
        storagePeriodFrom: applicationData.deceased.deceased2.storagePeriodFrom || '',
        storagePeriodTo: applicationData.deceased.deceased2.storagePeriodTo || '',
      });
    }
  }
  formData.deceasedDetails = deceasedDetailsArray;

  // Map beneficiaries
  if (applicationData.beneficiaries && Array.isArray(applicationData.beneficiaries)) {
    formData.beneficiaries = applicationData.beneficiaries.map((b: any) => ({
      id: b.id,
      name: b.name || b.fullName,
      idNo: b.idNo || b.nric,
      relationshipToApplicant: b.relationship || b.relationshipToApplicant,
      dateOfBirth: b.dateOfBirth ? formatDateFromAPI(b.dateOfBirth) : null,
      birthYear: b.birthYear,
      isCatholic: b.isCatholic ?? (b.religion === 'Catholic'),
      isMale: b.isMale ?? (b.gender === 'Male' || b.sex === 'Male'),
      status: b.status,
      religion: b.religion,
      relationshipToNominee1: b.relationshipToNominee1,
      relationshipToNominee2: b.relationshipToNominee2,
      gender: b.gender || b.sex || (b.isMale ? 'Male' : 'Female')
    }));
  }

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
  return paymentModeToCode(paymentMode);
}

/**
 * Map payment mode number to string
 */
function mapPaymentModeToString(paymentMode: number | string): string {
  return paymentModeToLabel(paymentMode);
}

/**
 * Maps form data to niche application request structure (OPTIMIZED)
 * @param formData - The form data to map
 * @returns Mapped request data in optimized structure
 */
export function mapFormDataToNicheApplicationRequest(formData: Record<string, any>): any {
  // Generate clean optimized payload that removes duplicate fields
  return generateOptimizedPayload(formData);
}

/**
 * Generates clean optimized payload for niche application API
 * Removes duplicate fields and organizes data into proper structure
 * @param formData - The raw form data
 * @returns Clean optimized payload
 */
export function generateOptimizedPayload(formData: Record<string, any>): any {
  // Generate clean optimized payload that removes all duplicate fields
  console.log('[generateOptimizedPayload] Input formData:', JSON.stringify(formData, null, 2));
  console.log('[generateOptimizedPayload] FormData keys:', Object.keys(formData));
  console.log('[generateOptimizedPayload] Applicant data in formData:', {
    applicantName: formData.applicantName,
    applicantEmail: formData.applicantEmail,
    applicantPhone: formData.applicantPhone,
    applicantIDNo: formData.applicantIDNo,
    applicantHomeTel: formData.applicantHomeTel,
    applicantOfficeTel: formData.applicantOfficeTel,
    applicantIsCatholic: formData.applicantIsCatholic,
    applicantReligion: formData.applicantReligion,
    // Check if applicant is a nested object
    hasApplicantObject: !!formData.applicant,
    applicantObject: formData.applicant
  });

  // Build chapel information - handle both flat and nested structures
  const chapel = {
    id: formData.chapelId,
    name: formData.chapelName || formData.chapel?.name || formData.chapel,
    code: formData.chapelCode || formData.chapel?.code || formData.chapel
  };

  // Build niche information - handle both flat and nested structures
  const nicheId = formData.nicheId ||
    (formData.nicheCode ? parseInt(formData.nicheCode, 10) : undefined) ||
    formData.niche?.id;

  const niche = {
    id: nicheId,
    code: formData.nicheCode || formData.nicheNumber || formData.niche?.code || formData.niche?.number,
    number: formData.nicheNumber || formData.nicheCode || formData.niche?.number || formData.niche?.code
  };

  const pickDefined = (...values: any[]) => {
    for (const value of values) {
      if (value !== undefined && value !== null) {
        return value;
      }
    }
    return undefined;
  };

  // Build applicant information - handle both flat and nested structures
  const applicant = {
    name: pickDefined(formData.applicantName, formData.applicant?.name, formData.contactName) ?? '',
    email: pickDefined(
      formData.applicantEmail,
      formData.applicant?.email,
      formData.applicant?.emailID,
      formData.contactEmail
    ) ?? '',
    phone: pickDefined(
      formData.applicantPhone,
      formData.applicant?.phone,
      formData.applicant?.mobileNo,
      formData.contactPhone
    ) ?? '',
    mobileNo: pickDefined(
      formData.applicantPhone,
      formData.applicant?.mobileNo,
      formData.applicant?.phone,
      formData.contactPhone
    ) ?? '',
    homeTel: pickDefined(formData.applicantHomeTel, formData.applicant?.homeTel, formData.applicant?.homeTelNo) ?? '',
    homeTelNo: pickDefined(formData.applicantHomeTel, formData.applicant?.homeTelNo, formData.applicant?.homeTel) ?? '',
    officeTel: pickDefined(formData.applicantOfficeTel, formData.applicant?.officeTel, formData.applicant?.officeTelNo) ?? '',
    officeTelNo: pickDefined(formData.applicantOfficeTel, formData.applicant?.officeTelNo, formData.applicant?.officeTel) ?? '',
    idNo: pickDefined(
      formData.applicantIDNo,
      formData.applicantIdNo,
      formData.applicant?.idNo,
      formData.contactNric
    ) ?? '',
    isCatholic: formData.applicantIsCatholic ??
      formData.applicant?.isCatholic ??
      ((formData.applicantReligion === 'Catholic') ||
        (formData.applicant?.religion === 'Catholic') ||
        (formData.contactReligion === 'Catholic')),
    religion: formData.applicantReligion ||
      formData.applicant?.religion ||
      formData.contactReligion ||
      (formData.applicantIsCatholic ? 'Catholic' : 'Non Catholic') ||
      (formData.applicant?.isCatholic ? 'Catholic' : 'Non Catholic'),
    address: {
      no: pickDefined(formData.applicantAddressNo, formData.applicant?.address?.no) ?? '',
      line1: pickDefined(formData.applicantAddressLine1, formData.applicant?.address?.line1) ?? '',
      line2: pickDefined(formData.applicantAddressLine2, formData.applicant?.address?.line2) ?? '',
      city: pickDefined(formData.applicantAddressCity, formData.applicant?.address?.city) ?? '',
      state: pickDefined(formData.applicantAddressState, formData.applicant?.address?.state) ?? '',
      country: pickDefined(
        formData.applicantAddressCountry,
        formData.applicant?.address?.country,
        formData.applicantCountry,
        formData.applicant?.country,
        formData.contactCountry
      ) ?? 'Singapore'
    }
  };

  // Build nominees array (organized) - handle both flat and nested structures
  const nominees = buildCleanNominees(formData);

  // Build beneficiaries array (organized) - handle both flat and nested structures
  const beneficiaries = buildCleanBeneficiaries(formData);

  // Create the clean optimized payload
  // Include BOTH nested applicant AND flat applicant fields so backend can use either path
  const optimizedPayload = {
    // Core information
    chapel,
    niche,
    selectedNiches: formData.selectedNiches || (nicheId ? [nicheId] : []),
    code: formData.applicationCode || formData.code || '',

    // Main entities
    applicant,
    nominees,
    beneficiaries,

    // Flat applicant fields (backup for backend pickFirst - ensures Contact Person updates persist)
    applicantName: applicant.name,
    applicantIDNo: applicant.idNo,
    applicantEmail: applicant.email,
    applicantEmailID: applicant.email,
    applicantPhone: applicant.phone,
    applicantMobileNo: applicant.mobileNo,
    applicantHomeTel: applicant.homeTel || applicant.homeTelNo,
    applicantOfficeTel: applicant.officeTel || applicant.officeTelNo,
    applicantAddressNo: applicant.address?.no,
    applicantAddressLine1: applicant.address?.line1,
    applicantAddressLine2: applicant.address?.line2,
    applicantAddressCity: applicant.address?.city,
    applicantAddressState: applicant.address?.state,
    applicantAddressCountry: applicant.address?.country,
    applicantIsCatholic: applicant.isCatholic,
    applicantReligion: applicant.religion,

    // Contact info (minimal duplicate for compatibility)
    contact: {
      name: formData.contactName || applicant.name,
      email: formData.contactEmail || applicant.email,
      phone: formData.contactPhone || applicant.phone,
      nric: formData.contactNric || applicant.idNo,
      religion: formData.contactReligion || applicant.religion,
      status: formData.contactStatus || 'Active'
    }
  };

  console.log('[generateOptimizedPayload] Generated optimized payload:', JSON.stringify(optimizedPayload, null, 2));

  return optimizedPayload;
}

/**
 * Build clean nominees array from form data (removes duplicate fields)
 */
function buildCleanNominees(formData: Record<string, any>): Array<Record<string, any>> {
  const nominees: Array<Record<string, any>> = [];

  // If nominees array exists in formData, use it exclusively (avoids phantom duplicates from stale flat fields)
  if (Array.isArray(formData.nominees) && formData.nominees.length > 0) {
    formData.nominees.forEach((nominee: any) => {
      const name = nominee.fullName || nominee.name;
      if (name) {
        nominees.push({
          id: nominee.id,
          name: name,
          email: nominee.email || '',
          phone: nominee.contactNumber || nominee.phone || nominee.mobileNo || '',
          homeTel: nominee.homeTelNo || nominee.homeTel || '',
          officeTel: nominee.officeTelNo || nominee.officeTel || '',
          idNo: nominee.nric || nominee.idNo || '',
          relationship: nominee.relationship || '',
          dateOfBirth: nominee.dateOfBirth || '',
          status: nominee.status || 'Active',
          address: nominee.address && typeof nominee.address === 'object' ? nominee.address : {
            no: nominee.block === 'Block' || nominee.block?.toLowerCase() === 'block' || nominee.addressNo?.toLowerCase() === 'block' || nominee.addressNo?.toLowerCase() === 'blk' ? 'Blk' : 'No',
            line1: nominee.blockNo || nominee.addressLine1 || '',
            line2: nominee.streetName || nominee.addressLine2 || '',
            city: nominee.unitNo && nominee.unitNo.trim() !== '' ? (nominee.unitNo.trim().startsWith('#') ? nominee.unitNo.trim() : `#${nominee.unitNo.trim()}`) : nominee.addressCity || '',
            state: nominee.postalCode || nominee.addressState || '',
            country: nominee.country || nominee.addressCountry || 'Singapore'
          }
        });
      }
    });
    return nominees;
  }

  // Fallback: Add first nominee if present - handle both flat and nested structures
  const nomineeName = formData.nomineeName || formData.nominee?.name;
  if (nomineeName) {
    nominees.push({
      id: Date.now(), // Generate unique ID
      name: nomineeName,
      email: formData.nomineeEmail || formData.nominee?.email || '',
      phone: formData.nomineePhone || formData.nominee?.mobileNo || formData.nominee?.phone || '',
      homeTel: formData.nomineeHomeTel || formData.nominee?.homeTelNo || formData.nominee?.homeTel || '',
      officeTel: formData.nomineeOfficeTel || formData.nominee?.officeTelNo || formData.nominee?.officeTel || '',
      idNo: formData.nomineeIDNo || formData.nominee?.idNo || '',
      relationship: formData.nomineeRelationship || formData.nominee?.relationship || '',
      status: formData.nomineeStatus || 'Active',
      address: {
        no: formData.nomineeAddressNo || formData.nominee?.address?.no || '',
        line1: formData.nomineeAddressLine1 || formData.nominee?.address?.line1 || '',
        line2: formData.nomineeAddressLine2 || formData.nominee?.address?.line2 || '',
        city: formData.nomineeAddressCity || formData.nominee?.address?.city || '',
        state: formData.nomineeAddressState || formData.nominee?.address?.state || '',
        country: formData.nomineeAddressCountry ||
          formData.nominee?.address?.country ||
          formData.nomineeCountry ||
          formData.nominee?.country ||
          'Singapore'
      }
    });
  }

  // Add second nominee if present - handle both flat and nested structures
  const nomineeName2 = formData.nomineeName2 || formData.nominee2?.name;
  if (nomineeName2) {
    nominees.push({
      id: Date.now() + 1, // Generate unique ID
      name: nomineeName2,
      email: formData.nomineeEmail2 || formData.nominee2?.email || '',
      phone: formData.nomineePhone2 || formData.nominee2?.mobileNo || formData.nominee2?.phone || '',
      homeTel: formData.nomineeHomeTel2 || formData.nominee2?.homeTelNo || formData.nominee2?.homeTel || '',
      officeTel: formData.nomineeOfficeTel2 || formData.nominee2?.officeTelNo || formData.nominee2?.officeTel || '',
      idNo: formData.nomineeIDNo2 || formData.nominee2?.idNo || '',
      relationship: formData.nomineeRelationship2 || formData.nominee2?.relationship || '',
      status: formData.nomineeStatus2 || 'Active',
      address: {
        no: formData.nomineeAddressNo2 || formData.nominee2?.address?.no || '',
        line1: formData.nomineeAddressLine12 || formData.nominee2?.address?.line1 || '',
        line2: formData.nomineeAddressLine22 || formData.nominee2?.address?.line2 || '',
        city: formData.nomineeAddressCity2 || formData.nominee2?.address?.city || '',
        state: formData.nomineeAddressState2 || formData.nominee2?.address?.state || '',
        country: formData.nomineeAddressCountry2 ||
          formData.nominee2?.address?.country ||
          formData.nomineeCountry2 ||
          formData.nominee2?.country ||
          'Singapore'
      }
    });
  }

  return nominees;
}

/**
 * Build clean beneficiaries array from form data (removes duplicate fields)
 */
function buildCleanBeneficiaries(formData: Record<string, any>): Array<Record<string, any>> {
  const beneficiaries: Array<Record<string, any>> = [];

  // Handle nested beneficiaries array first
  if (Array.isArray(formData.beneficiaries) && formData.beneficiaries.length > 0) {
    formData.beneficiaries.forEach((beneficiary: any, index: number) => {
      const resolvedStatus = beneficiary.status || 'Not Occupied';
      beneficiaries.push({
        id: beneficiary.id || Date.now() + index + 2,
        name: beneficiary.name || beneficiary.fullName || '',
        idNo: beneficiary.idNo || beneficiary.nric || '',
        isCatholic: beneficiary.isCatholic ?? false,
        isMale: beneficiary.isMale ?? false,
        gender: beneficiary.gender || (beneficiary.isMale ? 'Male' : 'Female'),
        relationship: beneficiary.relationship || beneficiary.relationshipToApplicant || '',
        dateOfBirth: beneficiary.dateOfBirth ?? null,
        birthYear: beneficiary.birthYear ?? null,
        status: resolvedStatus,
        lifeStatus: beneficiary.lifeStatus || resolvedStatus,
        relationshipToNominee1: beneficiary.relationshipToNominee1 || '',
        relationshipToNominee2: beneficiary.relationshipToNominee2 || '',
        religion: beneficiary.religion || ''
      });
    });
    return beneficiaries;
  }

  // Process individual beneficiary fields (beneficiary1, beneficiary2, etc.)
  const beneficiaryFields = [
    'beneficiary1', 'beneficiary2', 'beneficiary3', 'beneficiary4', 'beneficiary5'
  ];

  beneficiaryFields.forEach((fieldPrefix, index) => {
    // Handle both flat and nested field structures
    const name = formData[`${fieldPrefix}Name`] ||
      formData[fieldPrefix]?.name ||
      formData[`${fieldPrefix}?.fullName`];

    if (name) {
      beneficiaries.push({
        id: Date.now() + index + 2, // Generate unique ID
        name: name,
        idNo: formData[`${fieldPrefix}IDNo`] ||
          formData[fieldPrefix]?.idNo ||
          formData[fieldPrefix]?.nric || '',
        isCatholic: formData[`${fieldPrefix}IsCatholic`] ||
          formData[fieldPrefix]?.isCatholic ||
          false,
        isMale: formData[`${fieldPrefix}IsMale`] ||
          formData[fieldPrefix]?.isMale ||
          false,
        gender: formData[`${fieldPrefix}Gender`] ||
          formData[fieldPrefix]?.gender ||
          (formData[`${fieldPrefix}IsMale`] ? 'Male' : 'Female'),
        relationship: formData[`${fieldPrefix}Relationship`] ||
          formData[fieldPrefix]?.relationship ||
          formData[fieldPrefix]?.relationshipToApplicant || '',
        dateOfBirth: formData[`${fieldPrefix}DateOfBirth`] ??
          formData[fieldPrefix]?.dateOfBirth ??
          null,
        birthYear: formData[`${fieldPrefix}BirthYear`] ??
          formData[fieldPrefix]?.birthYear ??
          null,
        status: formData[`${fieldPrefix}Status`] ||
          formData[fieldPrefix]?.status ||
          'Not Occupied',
        lifeStatus: formData[`${fieldPrefix}LifeStatus`] ||
          formData[fieldPrefix]?.lifeStatus ||
          formData[`${fieldPrefix}Status`] ||
          formData[fieldPrefix]?.status ||
          'Not Occupied',
        relationshipToNominee1: formData[`${fieldPrefix}RelationshipToNominee1`] ||
          formData[fieldPrefix]?.relationshipToNominee1 || '',
        relationshipToNominee2: formData[`${fieldPrefix}RelationshipToNominee2`] ||
          formData[fieldPrefix]?.relationshipToNominee2 || '',
        religion: formData[`${fieldPrefix}Religion`] ||
          formData[fieldPrefix]?.religion || ''
      });
    }
  });

  return beneficiaries;
}

/**
 * Build optimized nominees array from form data
 */
function buildOptimizedNominees(formData: Record<string, any>, nomineeFields: any, nominee2Fields: any): Array<Record<string, any>> {
  const nominees: Array<Record<string, any>> = [];

  // Add first nominee if present
  if (formData.nomineeName || formData.nominee?.name) {
    nominees.push({
      id: formData.nominee?.id,
      name: formData.nomineeName || formData.nominee?.name || '',
      email: formData.nomineeEmail || formData.nominee?.email || '',
      phone: formData.nomineePhone || formData.nominee?.mobileNo || '',
      homeTel: formData.nomineeHomeTel || formData.nominee?.homeTelNo || '',
      officeTel: formData.nomineeOfficeTel || formData.nominee?.officeTelNo || '',
      idNo: formData.nomineeIDNo || formData.nominee?.idNo || '',
      relationship: formData.nomineeRelationship || formData.nominee?.relationship || '',
      status: formData.nomineeStatus || 'Active',
      address: {
        no: formData.nomineeAddressNo || nomineeFields.addressNo || '',
        line1: formData.nomineeAddressLine1 || nomineeFields.addressLine1 || '',
        line2: formData.nomineeAddressLine2 || nomineeFields.addressLine2 || '',
        city: formData.nomineeAddressCity || nomineeFields.addressCity || '',
        state: formData.nomineeAddressState || nomineeFields.addressState || '',
        country: formData.nomineeAddressCountry || nomineeFields.addressCountry || formData.nomineeCountry || 'Singapore',
        blockNo: formData.nomineeBlockNo || '',
        streetName: formData.nomineeStreetName || '',
        unitNo: formData.nomineeUnitNo || '',
        postalCode: formData.nomineePostalCode || ''
      }
    });
  }

  // Add second nominee if present
  if (formData.nomineeName2 || formData.nominee2?.name) {
    nominees.push({
      id: formData.nominee2?.id,
      name: formData.nomineeName2 || formData.nominee2?.name || '',
      email: formData.nomineeEmail2 || formData.nominee2?.email || '',
      phone: formData.nomineePhone2 || formData.nominee2?.mobileNo || '',
      homeTel: formData.nomineeHomeTel2 || formData.nominee2?.homeTelNo || '',
      officeTel: formData.nomineeOfficeTel2 || formData.nominee2?.officeTelNo || '',
      idNo: formData.nomineeIDNo2 || formData.nominee2?.idNo || '',
      relationship: formData.nomineeRelationship2 || formData.nominee2?.relationship || '',
      status: formData.nomineeStatus2 || 'Active',
      address: {
        no: formData.nomineeAddressNo2 || nominee2Fields.addressNo || '',
        line1: formData.nomineeAddressLine12 || nominee2Fields.addressLine1 || '',
        line2: formData.nomineeAddressLine22 || nominee2Fields.addressLine2 || '',
        city: formData.nomineeAddressCity2 || nominee2Fields.addressCity || '',
        state: formData.nomineeAddressState2 || nominee2Fields.addressState || '',
        country: formData.nomineeAddressCountry2 || nominee2Fields.addressCountry || formData.nomineeCountry2 || 'Singapore',
        blockNo: formData.nomineeBlockNo2 || '',
        streetName: formData.nomineeStreetName2 || '',
        unitNo: formData.nomineeUnitNo2 || '',
        postalCode: formData.nomineePostalCode2 || ''
      }
    });
  }

  // Add any additional nominees from nominees array if present
  if (Array.isArray(formData.nominees)) {
    formData.nominees.forEach((nominee: any) => {
      // Avoid duplicates by checking if already added
      const exists = nominees.some((n: Record<string, any>) =>
        (n.name === nominee.name && n.idNo === nominee.idNo) ||
        n.name === nominee.name
      );
      if (!exists) {
        nominees.push({
          id: nominee.id,
          name: nominee.name || nominee.fullName,
          email: nominee.email,
          phone: nominee.phone || nominee.contactNumber || nominee.mobileNo,
          idNo: nominee.idNo || nominee.nric,
          relationship: nominee.relationship || nominee.relationshipToApplicant,
          status: nominee.status,
          address: nominee.address ? {
            formatted: nominee.address
          } : undefined
        });
      }
    });
  }

  return nominees;
}

/**
 * Build optimized beneficiaries array from form data
 */
function buildOptimizedBeneficiaries(formData: Record<string, any>): Array<Record<string, any>> {
  const beneficiaries: Array<Record<string, any>> = [];

  // Process beneficiaries array if provided
  if (Array.isArray(formData.beneficiaries) && formData.beneficiaries.length > 0) {
    formData.beneficiaries.forEach((beneficiary: any, index: number) => {
      beneficiaries.push({
        id: beneficiary.id,
        name: beneficiary.name || beneficiary.fullName,
        idNo: beneficiary.idNo || beneficiary.nric,
        isCatholic: beneficiary.isCatholic,
        isMale: beneficiary.isMale,
        gender: beneficiary.gender || (beneficiary.isMale ? 'Male' : 'Female'),
        relationship: beneficiary.relationship || beneficiary.relationshipToApplicant,
        dateOfBirth: beneficiary.dateOfBirth,
        birthYear: beneficiary.birthYear,
        status: beneficiary.status || 'Not Occupied',
        relationshipToNominee1: beneficiary.relationshipToNominee1,
        relationshipToNominee2: beneficiary.relationshipToNominee2,
        religion: beneficiary.religion
      });
    });
  } else {
    // Fallback to individual beneficiary fields
    const beneficiaryFields = [
      'beneficiary1', 'beneficiary2', 'beneficiary3', 'beneficiary4', 'beneficiary5'
    ];

    beneficiaryFields.forEach((fieldPrefix, index) => {
      const name = formData[`${fieldPrefix}Name`] || formData[fieldPrefix]?.name;
      if (name) {
        beneficiaries.push({
          id: formData[`${fieldPrefix}Id`] || formData[fieldPrefix]?.id,
          name: name,
          idNo: formData[`${fieldPrefix}IDNo`] || formData[fieldPrefix]?.idNo,
          isCatholic: formData[`${fieldPrefix}IsCatholic`] || formData[fieldPrefix]?.isCatholic,
          isMale: formData[`${fieldPrefix}IsMale`] || formData[fieldPrefix]?.isMale,
          gender: formData[`${fieldPrefix}Gender`] || formData[fieldPrefix]?.gender || (formData[`${fieldPrefix}IsMale`] ? 'Male' : 'Female'),
          relationship: formData[`${fieldPrefix}Relationship`] || formData[fieldPrefix]?.relationship,
          dateOfBirth: formData[`${fieldPrefix}DateOfBirth`] || formData[fieldPrefix]?.dateOfBirth,
          birthYear: formData[`${fieldPrefix}BirthYear`] || formData[fieldPrefix]?.birthYear,
          status: formData[`${fieldPrefix}Status`] || formData[fieldPrefix]?.status || 'Not Occupied',
          relationshipToNominee1: formData[`${fieldPrefix}RelationshipToNominee1`] || formData[fieldPrefix]?.relationshipToNominee1,
          relationshipToNominee2: formData[`${fieldPrefix}RelationshipToNominee2`] || formData[fieldPrefix]?.relationshipToNominee2,
          religion: formData[`${fieldPrefix}Religion`] || formData[fieldPrefix]?.religion
        });
      }
    });
  }

  return beneficiaries;
}

/**
 * Maps API application data to form data structure
 * @param apiData - The API response data
 * @returns Form data object
 */
export function mapApiApplicationToFormData(apiData: any): Record<string, any> {
  // Create a copy of the API data to avoid mutating the original
  const formData = { ...apiData };

  // Flatten applicant to form fields (applicantName, applicantEmail, etc.)
  // Form components expect these at root; API returns nested applicant: { name, address: { no, line1, ... } }
  const applicant = apiData.applicant || {};
  const addr = applicant.address || {};
  const applicantAddressNo = addr.no ?? applicant.addressNo ?? '';
  const applicantAddressLine1 = addr.line1 ?? applicant.addressLine1 ?? '';
  const applicantAddressLine2 = addr.line2 ?? applicant.addressLine2 ?? '';
  const applicantAddressCity = addr.city ?? applicant.addressCity ?? '';
  const applicantAddressState = addr.state ?? applicant.addressState ?? '';
  const applicantAddressCountry = addr.country ?? applicant.addressCountry ?? 'Singapore';

  const applicantBlock =
    applicantAddressNo && String(applicantAddressNo).trim().toLowerCase() !== 'no' ? 'Blk' : '';
  const unitNoRaw = String(applicantAddressCity || '').trim();
  const unitNoNormalized = unitNoRaw ? (unitNoRaw.startsWith('#') ? unitNoRaw : `#${unitNoRaw}`) : '';
  const country = String(applicantAddressCountry || 'Singapore').trim() || 'Singapore';
  const postalCode = String(applicantAddressState || '').trim();

  const hasStructuredAddress = !!(applicantAddressNo || applicantAddressLine1 || applicantAddressLine2 || applicantAddressCity);
  const legacyApplicantAddress =
    (typeof applicant.address === 'string' && String(applicant.address).trim() !== '')
      ? String(applicant.address)
      : hasStructuredAddress && (applicantAddressLine1 || applicantAddressLine2)
        ? `${applicantBlock ? applicantBlock + ' ' : ''}${String(applicantAddressLine1 || '').trim()} ${String(applicantAddressLine2 || '').trim()}${unitNoNormalized ? ` ${unitNoNormalized}` : ''}${postalCode ? ` ${country} ${postalCode}` : ''}`.trim()
        : '';

  Object.assign(formData, {
    applicantName: applicant.name ?? apiData.applicantName ?? '',
    applicantIDNo: applicant.idNo ?? apiData.applicantIDNo ?? '',
    applicantEmail: applicant.email ?? apiData.applicantEmail ?? '',
    applicantPhone: applicant.mobileNo ?? apiData.applicantPhone ?? '',
    applicantHomeTel: applicant.homeTelNo ?? apiData.applicantHomeTel ?? '',
    applicantOfficeTel: applicant.officeTelNo ?? apiData.applicantOfficeTel ?? '',
    applicantIsCatholic: applicant.isCatholic ?? apiData.applicantIsCatholic,
    applicantReligion: applicant.isCatholic === true ? 'Catholic' : applicant.isCatholic === false ? 'Non Catholic' : (apiData.applicantReligion ?? ''),
    applicantAddress: legacyApplicantAddress || (apiData.applicantAddress ?? ''),
    applicantAddressNo: applicantBlock ? 'Blk' : 'No',
    applicantAddressLine1,
    applicantAddressLine2,
    applicantAddressCity: unitNoNormalized || applicantAddressCity,
    applicantAddressState: postalCode,
    applicantAddressCountry: country,
    contactName: applicant.name ?? apiData.contactName ?? '',
    contactNric: applicant.idNo ?? apiData.contactNric ?? '',
    contactEmail: applicant.email ?? apiData.contactEmail ?? '',
    contactPhone: applicant.mobileNo ?? apiData.contactPhone ?? '',
    contactAddress: legacyApplicantAddress || (apiData.contactAddress ?? ''),
    contactHomeTel: applicant.homeTelNo ?? apiData.contactHomeTel ?? '',
    contactOfficeTel: applicant.officeTelNo ?? apiData.contactOfficeTel ?? '',
    contactCountry: country,
    applicantBlock,
    applicantBlockNo: String(applicantAddressLine1 || '').trim(),
    applicantStreetName: String(applicantAddressLine2 || '').trim(),
    applicantUnitNo: unitNoRaw,
    applicantPostalCode: postalCode,
    applicantCountry: country
  });

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

  // Build the nominees array so NomineeDetails useEffect can sync correctly.
  // Without this, after an update replaces formData entirely, formData.nominees
  // would be undefined and NomineeDetails would never re-sync local state.
  const nomineesArray: any[] = [];
  const buildNomineeEntry = (src: any, id: number) => {
    const addrNo = src.addressNo || src.address?.no || '';
    const isBlock = addrNo && String(addrNo).trim().toLowerCase() !== 'no';
    const blockLabel = isBlock ? 'Block' : (addrNo ? 'No' : 'Block');
    const blockNo = src.addressLine1 || src.address?.line1 || '';
    const streetName = src.addressLine2 || src.address?.line2 || '';
    const rawUnit = src.addressCity || src.address?.city || '';
    const unitNo = rawUnit ? (String(rawUnit).startsWith('#') ? rawUnit : `#${rawUnit}`) : '';
    const postalCode = src.addressState || src.address?.state || '';
    const country = src.addressCountry || src.address?.country || 'Singapore';

    // Build legacy address string
    let legacyAddr = '';
    if (typeof src.address === 'string' && src.address.trim()) {
      legacyAddr = src.address;
    } else if (blockNo || streetName) {
      const parts: string[] = [];
      if (blockNo && streetName) {
        parts.push(`${blockLabel === 'Block' ? 'Blk' : 'No'} ${blockNo} ${streetName}`.trim());
      } else if (blockNo) {
        parts.push(blockNo);
      } else if (streetName) {
        parts.push(streetName);
      }
      if (unitNo) parts.push(unitNo);
      if (postalCode) parts.push(`${country} ${postalCode}`);
      legacyAddr = parts.join(' ');
    }

    return {
      id,
      fullName: src.name || '',
      nric: src.idNo || '',
      relationship: src.relationship || '',
      dateOfBirth: '',
      contactNumber: src.mobileNo || '',
      address: legacyAddr,
      block: blockLabel,
      blockNo: String(blockNo || '').trim(),
      streetName: String(streetName || '').trim(),
      unitNo: String(unitNo || '').trim(),
      postalCode: String(postalCode || '').trim(),
      country: String(country || 'Singapore').trim(),
      officeTelNo: src.officeTelNo || '',
      homeTelNo: src.homeTelNo || '',
      email: src.email || '',
      status: src.status === 'Non-Active' || src.status === 'Inactive' ? 'Non-Active' : 'Active'
    };
  };

  if (apiData.nominee && apiData.nominee.name) {
    nomineesArray.push(buildNomineeEntry(apiData.nominee, 1));
  }
  if (apiData.nominee2 && apiData.nominee2.name) {
    nomineesArray.push(buildNomineeEntry(apiData.nominee2, 2));
  }
  formData.nominees = nomineesArray;

  // Process beneficiaries to handle dateOfBirth and birthYear mapping
  if (apiData.beneficiaries && Array.isArray(apiData.beneficiaries)) {
    formData.beneficiaries = apiData.beneficiaries.map((beneficiary: any) => {
      const processedBeneficiary = { ...beneficiary };

      // Ensure null/empty handling
      if (processedBeneficiary.dateOfBirth === '' || processedBeneficiary.dateOfBirth === 'null') {
        processedBeneficiary.dateOfBirth = null;
      }
      if (processedBeneficiary.birthYear === '' || processedBeneficiary.birthYear === 'null') {
        processedBeneficiary.birthYear = null;
      }

      // If birthYear is missing but dateOfBirth exists, extract it
      if (processedBeneficiary.dateOfBirth && !processedBeneficiary.birthYear) {
        if (processedBeneficiary.dateOfBirth.includes('-')) {
          const parts = processedBeneficiary.dateOfBirth.split('-');
          if (parts.length === 3) {
            processedBeneficiary.birthYear = parts[2];
          }
        }
      }

      return processedBeneficiary;
    });
  } else {
    formData.beneficiaries = [];
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