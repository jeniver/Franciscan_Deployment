import type { CreateNichiApplicationRequest } from '../services/nichiApplicationService';
import type { DeceasedDetail } from '../store/nichibookingSlice';

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
    metadata: {
      generatedAt: now.toISOString(),
      applicationNumber: formData.refDocNumber,
      hasInvoice: true,
      beneficiaryCount: beneficiaries.length,
      nomineeCount: nominee ? 1 : 0,
    },
  };

  return request;
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

