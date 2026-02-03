import { NicheAgreementResponse } from '../services/nicheAgreementService';

// Map API response data to form data structure
export const mapApiResponseToFormData = (apiResponse: NicheAgreementResponse) => {
  const { data } = apiResponse;

  // Map applicant structured address fields (if present) into the UI fields used by AddressInput.
  // This is important for /niche/edit/<non-NAPP-code> flows which load via nicheAgreementService.
  const applicantAddressNo = (data.applicant as any)?.addressNo || '';
  const applicantAddressLine1 = (data.applicant as any)?.addressLine1 || '';
  const applicantAddressLine2 = (data.applicant as any)?.addressLine2 || '';
  const applicantAddressCity = (data.applicant as any)?.addressCity || '';
  const applicantAddressState = (data.applicant as any)?.addressState || '';
  const applicantAddressCountry = (data.applicant as any)?.addressCountry || 'Singapore';

  const hasStructuredApplicantAddress = !!(
    applicantAddressNo ||
    applicantAddressLine1 ||
    applicantAddressLine2 ||
    applicantAddressCity ||
    applicantAddressState ||
    applicantAddressCountry
  );

  const applicantBlock =
    applicantAddressNo && String(applicantAddressNo).trim().toLowerCase() !== 'no' ? 'Block' : '';

  const unitNoRaw = String(applicantAddressCity || '').trim();
  const unitNoNormalized = unitNoRaw ? (unitNoRaw.startsWith('#') ? unitNoRaw : `#${unitNoRaw}`) : '';

  const country = String(applicantAddressCountry || 'Singapore').trim() || 'Singapore';
  const postalCode = String(applicantAddressState || '').trim();

  const legacyApplicantAddress =
    (data.applicant?.address && String(data.applicant.address).trim() !== '')
      ? String(data.applicant.address)
      : (hasStructuredApplicantAddress && (applicantAddressLine1 || applicantAddressLine2)
          ? `${applicantBlock ? 'Blk ' : ''}${String(applicantAddressLine1 || '').trim()} ${String(applicantAddressLine2 || '').trim()}${unitNoNormalized ? ` ${unitNoNormalized}` : ''}${postalCode ? ` ${country} ${postalCode}` : ''}`.trim()
          : '');
  
  return {
    // Application Number
    applicationNumber: data.applicationCode || '',
    
    // Consent Forms (Step 1)
    termsAndConditions: data.consentForm?.status === 'completed' || false,
    dataProtection: data.consentForm?.status === 'completed' || false,
    nicheAgreement: data.agreement?.status === 'completed' || false,
    paymentTerms: data.consentForm?.status === 'completed' || false,

    // Niche Details (Step 2) - Updated to handle new API structure
    chapel: data.niche?.location?.chapel?.chapelName || data.niche?.chapelName || '',
    chapelId: data.niche?.location?.chapel?.chapelId || null,
    chapelCode: data.niche?.location?.chapel?.chapelCode || '',
    nicheCode: data.niche?.code || data.niche?.number || '',
    nicheNumber: data.niche?.number || '',
    wallName: data.niche?.location?.wall?.wallName || data.niche?.wallName || '',
    wallCode: data.niche?.location?.wall?.wallCode || '',
    rowNumber: data.niche?.location?.row?.rowCode || data.niche?.rowNumber || '',
    rowLevel: data.niche?.location?.row?.level || null,
    selectedNiches: data.niche?.number ? [data.niche.number] : [],
    nicheId: data.niche?.number || null,

    // Contact Person Details (Step 3) - Applicant
    contactName: data.applicant?.name || '',
    contactNric: data.applicant?.idNo || '',
    contactEmail: data.applicant?.email || '',
    contactPhone: data.applicant?.mobileNo || '',
    contactAddress: legacyApplicantAddress,
    contactReligion: data.applicant?.isCatholic ? 'Catholic' : 'Non Catholic',
    contactHomeTel: data.applicant?.homeTelNo || '',
    contactOfficeTel: data.applicant?.officeTelNo || '',
    contactCountry: country,

    // Applicant fields used by ContactPersonDetails (Step 3)
    applicantName: data.applicant?.name || '',
    applicantIDNo: data.applicant?.idNo || '',
    applicantEmail: data.applicant?.email || '',
    applicantPhone: data.applicant?.mobileNo || '',
    applicantAddress: legacyApplicantAddress,
    applicantHomeTel: data.applicant?.homeTelNo || '',
    applicantOfficeTel: data.applicant?.officeTelNo || '',
    applicantIsCatholic: data.applicant?.isCatholic ?? undefined,
    applicantReligion: data.applicant?.isCatholic === true ? 'Catholic' : data.applicant?.isCatholic === false ? 'Non Catholic' : '',

    // AddressInput UI fields (these drive the address textbox values)
    applicantBlock,
    applicantBlockNo: String(applicantAddressLine1 || '').trim(),
    applicantStreetName: String(applicantAddressLine2 || '').trim(),
    applicantUnitNo: unitNoRaw,
    applicantPostalCode: postalCode,
    applicantCountry: country,

    // Structured fields (so downstream PDFs/API payloads have consistent data)
    applicantAddressNo: applicantBlock ? 'Blk' : 'No',
    applicantAddressLine1: String(applicantAddressLine1 || '').trim(),
    applicantAddressLine2: String(applicantAddressLine2 || '').trim(),
    applicantAddressCity: unitNoNormalized,
    applicantAddressState: postalCode,
    applicantAddressCountry: country,

    // Beneficiary Details (Step 4)
    beneficiaries: data.beneficiaries?.map((beneficiary, index) => ({
      id: index + 1,
      fullName: beneficiary.name,
      nric: beneficiary.idNo,
      relationship: beneficiary.relationshipToApplicant,
      dateOfBirth: beneficiary.dateOfBirth,
      status: beneficiary.status === 'Occupied' ? 'Active' : 'Unknown',
      religion: beneficiary.isCatholic ? 'Catholic' : 'Non-Catholic',
      sex: beneficiary.sex,
      isMale: beneficiary.isMale,
      relationshipToNominee1: beneficiary.relationshipToNominee1,
      relationshipToNominee2: beneficiary.relationshipToNominee2,
      birthYear: beneficiary.birthYear
    })) || [],

    // Nominee Details (Step 5) - Combine both nominees into array
    nominees: [
      data.nominee ? {
        id: 1,
        fullName: data.nominee.name,
        nric: data.nominee.idNo,
        relationship: data.nominee.relationship,
        dateOfBirth: '',
        contactNumber: data.nominee.mobileNo,
        email: data.nominee.email,
        address: data.nominee.address,
        homeTelNo: data.nominee.homeTelNo,
        officeTelNo: data.nominee.officeTelNo,
        // Include structured address fields
        block: (data.nominee.addressNo?.toLowerCase() === 'block') ? 'Block' : 'No',
        blockNo: data.nominee.addressLine1 || '',
        streetName: data.nominee.addressLine2 || '',
        unitNo: data.nominee.addressCity || '',
        postalCode: data.nominee.addressState || '',
        country: data.nominee.addressCountry || 'Singapore'
      } : null,
      data.nominee2 ? {
        id: 2,
        fullName: data.nominee2.name,
        nric: data.nominee2.idNo,
        relationship: data.nominee2.relationship,
        dateOfBirth: '',
        contactNumber: data.nominee2.mobileNo,
        email: data.nominee2.email,
        address: data.nominee2.address,
        homeTelNo: data.nominee2.homeTelNo,
        officeTelNo: data.nominee2.officeTelNo,
        // Include structured address fields
        block: (data.nominee2.addressNo?.toLowerCase() === 'block') ? 'Block' : 'No',
        blockNo: data.nominee2.addressLine1 || '',
        streetName: data.nominee2.addressLine2 || '',
        unitNo: data.nominee2.addressCity || '',
        postalCode: data.nominee2.addressState || '',
        country: data.nominee2.addressCountry || 'Singapore'
      } : null
    ].filter(Boolean),
    
    // Extract first nominee's structured address fields (similar to applicant)
    nomineeAddressNo: (data.nominee as any)?.addressNo || '',
    nomineeAddressLine1: (data.nominee as any)?.addressLine1 || '',
    nomineeAddressLine2: (data.nominee as any)?.addressLine2 || '',
    nomineeAddressCity: (data.nominee as any)?.addressCity || '',
    nomineeAddressState: (data.nominee as any)?.addressState || '',
    nomineeAddressCountry: (data.nominee as any)?.addressCountry || 'Singapore',
    // UI fields for AddressInput (match applicant pattern)
    nomineeBlock: (() => {
      const addrNo = (data.nominee as any)?.addressNo || '';
      return addrNo && String(addrNo).trim().toLowerCase() !== 'no' ? 'Block' : '';
    })(),
    nomineeBlockNo: ((data.nominee as any)?.addressLine1 || '').trim(),
    nomineeStreetName: ((data.nominee as any)?.addressLine2 || '').trim(),
    nomineeUnitNo: ((data.nominee as any)?.addressCity || '').trim(),
    nomineePostalCode: ((data.nominee as any)?.addressState || '').trim(),
    nomineeCountry: ((data.nominee as any)?.addressCountry || 'Singapore').trim(),
    // Extract second nominee's structured address fields
    nomineeAddressNo2: (data.nominee2 as any)?.addressNo || '',
    nomineeAddressLine12: (data.nominee2 as any)?.addressLine1 || '',
    nomineeAddressLine22: (data.nominee2 as any)?.addressLine2 || '',
    nomineeAddressCity2: (data.nominee2 as any)?.addressCity || '',
    nomineeAddressState2: (data.nominee2 as any)?.addressState || '',
    nomineeAddressCountry2: (data.nominee2 as any)?.addressCountry || 'Singapore',
    // UI fields for AddressInput for second nominee
    nomineeBlock2: (() => {
      const addrNo = (data.nominee2 as any)?.addressNo || '';
      return addrNo && String(addrNo).trim().toLowerCase() !== 'no' ? 'Block' : '';
    })(),
    nomineeBlockNo2: ((data.nominee2 as any)?.addressLine1 || '').trim(),
    nomineeStreetName2: ((data.nominee2 as any)?.addressLine2 || '').trim(),
    nomineeUnitNo2: ((data.nominee2 as any)?.addressCity || '').trim(),
    nomineePostalCode2: ((data.nominee2 as any)?.addressState || '').trim(),
    nomineeCountry2: ((data.nominee2 as any)?.addressCountry || 'Singapore').trim(),
    // Legacy single address field for backward compatibility
    nomineeAddress: data.nominee?.address || '',
    nomineeAddress2: data.nominee2?.address || '',
    nomineePhone: data.nominee?.mobileNo || '',
    nomineePhone2: data.nominee2?.mobileNo || '',
    nomineeEmail: data.nominee?.email || '',
    nomineeEmail2: data.nominee2?.email || '',
    nomineeName: data.nominee?.name || '',
    nomineeName2: data.nominee2?.name || '',
    nomineeIDNo: data.nominee?.idNo || '',
    nomineeIDNo2: data.nominee2?.idNo || '',
    nomineeRelationship: data.nominee?.relationship || '',
    nomineeRelationship2: data.nominee2?.relationship || '',
    // Add structured nominee objects for full compatibility
    nominee: data.nominee ? {
      name: data.nominee.name || '',
      address: data.nominee.address || '',
      addressNo: data.nominee.addressNo || '',
      addressLine1: data.nominee.addressLine1 || '',
      addressLine2: data.nominee.addressLine2 || null,
      addressCity: data.nominee.addressCity || null,
      addressState: data.nominee.addressState || null,
      addressCountry: data.nominee.addressCountry || 'Singapore',
      email: data.nominee.email || '',
      idNo: data.nominee.idNo || '',
      mobileNo: data.nominee.mobileNo || '',
      homeTelNo: data.nominee.homeTelNo || '',
      officeTelNo: data.nominee.officeTelNo || '',
      relationship: data.nominee.relationship || ''
    } : undefined,
    nominee2: data.nominee2 ? {
      name: data.nominee2.name || '',
      address: data.nominee2.address || '',
      addressNo: data.nominee2.addressNo || '',
      addressLine1: data.nominee2.addressLine1 || '',
      addressLine2: data.nominee2.addressLine2 || null,
      addressCity: data.nominee2.addressCity || null,
      addressState: data.nominee2.addressState || null,
      addressCountry: data.nominee2.addressCountry || 'Singapore',
      email: data.nominee2.email || '',
      idNo: data.nominee2.idNo || '',
      mobileNo: data.nominee2.mobileNo || '',
      homeTelNo: data.nominee2.homeTelNo || '',
      officeTelNo: data.nominee2.officeTelNo || '',
      relationship: data.nominee2.relationship || ''
    } : undefined,

    // Invoice & Receipt (Step 6)
    invoice: {
      invoiceNo: data.invoice?.invoiceNo || '',
      invoiceDate: data.invoice?.invoiceDate || '',
      receiptAmount: data.invoice?.receiptAmount || 0,
      taxAmount: data.invoice?.taxAmount || 0,
      invoicePayingAmount: data.invoice?.invoicePayingAmount || 0,
      receiptPayingAmount: data.invoice?.receiptPayingAmount || 0,
      refDocNumber: data.invoice?.refDocNumber || '',
      // Legacy fields for backward compatibility
      nicheBookingFee: data.niche?.totalAmount || 0,
      administrativeFee: 0,
      gst: data.invoice?.taxAmount || 0,
      totalAmount: data.invoice?.invoicePayingAmount || 0,
      paymentStatus: 'Paid',
      paymentMethod: 'Bank Transfer',
      dueDate: data.invoice?.invoiceDate || '',
    },

    // Additional metadata
    metadata: {
      generatedAt: data.metadata?.generatedAt || '',
      applicationNumber: data.metadata?.applicationNumber || '',
      hasInvoice: data.metadata?.hasInvoice || false,
      hasReceipt: data.metadata?.hasReceipt || false,
      beneficiaryCount: data.metadata?.beneficiaryCount || 0,
      nomineeCount: data.metadata?.nomineeCount || 0,
    },

    // Crystal Reports data
    crystalReports: data.crystalReports || {},

    // Agreement status
    agreementStatus: data.agreement?.status || '',
    consentFormStatus: data.consentForm?.status || '',
    printReady: data.printReady || { 
      agreementReady: false, 
      invoiceReady: false, 
      receiptReady: false, 
      consentFormReady: false 
    },

    // Applied and agreement dates
    appliedDate: data.appliedDate || '',
    agreementDate: data.agreementDate || '',
  };
};

// Validate application number format
export const validateApplicationNumber = (applicationNumber: string): boolean => {
  // Basic validation - adjust based on your application number format
  return applicationNumber.trim().length > 0 && applicationNumber.includes('-');
};

// Format application number for display
export const formatApplicationNumber = (applicationNumber: string): string => {
  return applicationNumber.trim().toUpperCase();
};

export default {
  mapApiResponseToFormData,
  validateApplicationNumber,
  formatApplicationNumber,
};
