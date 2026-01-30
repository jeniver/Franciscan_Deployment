import type { NichiApplicationResponse } from '../services/nichiApplicationService';
import type { DeceasedDetail } from '../store/nichibookingSlice';

/**
 * Maps loaded Nichi application data to form fields
 * This populates the form when viewing an existing application
 * 
 * @param applicationData - The loaded application data from API
 * @returns Form data object with all fields populated
 */
export function mapNichiApplicationToFormData(
  applicationData: NichiApplicationResponse['data']
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
  if ((applicationData as any).nicheDetails) {
    const nicheDetails = (applicationData as any).nicheDetails;
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
    if ((applicationData.applicant as any).addressNo ||
        (applicationData.applicant as any).addressLine1 ||
        (applicationData.applicant as any).addressLine2 ||
        (applicationData.applicant as any).addressCity ||
        (applicationData.applicant as any).addressState ||
        (applicationData.applicant as any).addressCountry) {
      formData.applicantBlock = (applicationData.applicant as any).addressNo || '';
      formData.applicantBlockNo = (applicationData.applicant as any).addressLine1 || '';
      formData.applicantStreetName = (applicationData.applicant as any).addressLine2 || '';
      formData.applicantUnitNo = (applicationData.applicant as any).addressCity || '';
      formData.applicantPostalCode = (applicationData.applicant as any).addressState || '';
      formData.applicantCountry = (applicationData.applicant as any).addressCountry || 'Singapore';
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
    if ((applicationData.nominee as any).addressNo ||
        (applicationData.nominee as any).addressLine1 ||
        (applicationData.nominee as any).addressLine2 ||
        (applicationData.nominee as any).addressCity ||
        (applicationData.nominee as any).addressState ||
        (applicationData.nominee as any).addressCountry) {
      formData.nomineeBlock = (applicationData.nominee as any).addressNo || '';
      formData.nomineeBlockNo = (applicationData.nominee as any).addressLine1 || '';
      formData.nomineeStreetName = (applicationData.nominee as any).addressLine2 || '';
      formData.nomineeUnitNo = (applicationData.nominee as any).addressCity || '';
      formData.nomineePostalCode = (applicationData.nominee as any).addressState || '';
      formData.nomineeCountry = (applicationData.nominee as any).addressCountry || formData.applicantCountry || 'Singapore';
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
  const additionalDetails = (applicationData as any).additionalDetails || (applicationData as any).additionalDetails;
  if (additionalDetails) {
    formData.selectedBibleChoiceId = additionalDetails.bibleInscriptionChoiceId || null;
    formData.phraseOfChoice = additionalDetails.additionalInscriptionPhrase || 
                               additionalDetails.bibleInscriptionText || '';
    formData.crossType = additionalDetails.crossType || 'Crucifix';
  }

  return formData;
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

