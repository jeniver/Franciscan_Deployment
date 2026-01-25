import { NicheAgreementResponse } from '../services/nicheAgreementService';

// Map API response data to form data structure
export const mapApiResponseToFormData = (apiResponse: NicheAgreementResponse) => {
  const { data } = apiResponse;
  
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
    contactAddress: data.applicant?.address || '',
    contactReligion: data.applicant?.isCatholic ? 'Catholic' : 'Non-Catholic',
    contactHomeTel: data.applicant?.homeTelNo || '',
    contactOfficeTel: data.applicant?.officeTelNo || '',
    contactCountry: 'Singapore',

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
        officeTelNo: data.nominee.officeTelNo
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
        officeTelNo: data.nominee2.officeTelNo
      } : null
    ].filter(Boolean),

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
