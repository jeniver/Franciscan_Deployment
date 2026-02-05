import { nicheAgreementService } from '../services/nicheAgreementService';

/**
 * Fetches 2nd nominee agreement data for the given application number
 * @param applicationNumber - The application number to fetch data for
 * @returns Promise that resolves to the transformed 2nd nominee agreement data
 */
export const fetchSecondNomineeAgreementData = async (applicationNumber: string) => {
  // Validate application number before making API call
  if (!applicationNumber || applicationNumber.trim() === '') {
    throw new Error('Application number is required for 2nd nominee agreement PDF generation');
  }
  
  try {
    const response = await nicheAgreementService.getSecondNomineeAgreementPdf(applicationNumber);
    if (response.success && response.data) {
      // Transform the data to match the expected format for the AgreementViewerModal
      return transformSecondNomineeData(response.data);
    } else {
      throw new Error(response.message || 'Failed to fetch 2nd nominee agreement data');
    }
  } catch (error: any) {
    console.error('Error fetching 2nd nominee agreement:', error);
    throw new Error(`Failed to fetch 2nd nominee agreement: ${error.message || 'Unknown error'}`);
  }
};

export const fetchSecondNomineeAgreementDataForViewer = async (applicationNumber: string) => {
  // Validate application number before making API call
  if (!applicationNumber || applicationNumber.trim() === '') {
    throw new Error('Application number is required for 2nd nominee agreement PDF generation');
  }
  
  try {
    const response = await nicheAgreementService.getSecondNomineeAgreementPdf(applicationNumber);
    if (response.success && response.data) {
      // Transform the data to match the expected format for the NomineeAgreement component
      return transformSecondNomineeDataForViewer(response.data);
    } else {
      throw new Error(response.message || 'Failed to fetch 2nd nominee agreement data');
    }
  } catch (error: any) {
    console.error('Error fetching 2nd nominee agreement for viewer:', error);
    throw new Error(`Failed to fetch 2nd nominee agreement: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Transforms 2nd nominee agreement data to match the NomineeAgreement component props
 * @param secondNomineeData - Raw 2nd nominee agreement data from the API
 * @returns Transformed data compatible with NomineeAgreement component
 */
export const transformSecondNomineeDataForViewer = (secondNomineeData: any) => {
  return {
    nicheNo: secondNomineeData.niche?.number,
    chapelName: secondNomineeData.niche?.chapelName,
    agreementDate: secondNomineeData.application?.agreementDate,
    applicant: {
      name: secondNomineeData.applicant?.name,
      address: secondNomineeData.applicant?.address,
      email: secondNomineeData.applicant?.email,
      nricPassport: secondNomineeData.applicant?.idNo,
      mobileNo: secondNomineeData.applicant?.mobileNo,
      homeTel: secondNomineeData.applicant?.homeTelNo || '',
      officeTel: secondNomineeData.applicant?.officeTelNo || '',
    },
    nominee: {
      name: secondNomineeData.nominee2?.name,
      address: secondNomineeData.nominee2?.address,
      email: secondNomineeData.nominee2?.email,
      nricPassport: secondNomineeData.nominee2?.idNo,
      mobileNo: secondNomineeData.nominee2?.mobileNo,
      homeTel: secondNomineeData.nominee2?.homeTelNo || '',
      officeTel: secondNomineeData.nominee2?.officeTelNo || '',
      relationshipToApplicant: secondNomineeData.nominee2?.relationship,
    }
  };
};

/**
 * Transforms 2nd nominee agreement data to match the standard agreement template format
 * @param secondNomineeData - Raw 2nd nominee agreement data from the API
 * @returns Transformed data compatible with AgreementViewerModal
 */
export const transformSecondNomineeData = (secondNomineeData: any) => {
  return {
    applicationCode: secondNomineeData.applicationNumber,
    appliedDate: secondNomineeData.application.appliedDate,
    agreementDate: secondNomineeData.application.agreementDate,
    applicant: {
      ...secondNomineeData.applicant,
      // Ensure all required fields are present
      homeTelNo: secondNomineeData.applicant?.homeTelNo || '',
      officeTelNo: secondNomineeData.applicant?.officeTelNo || '',
    },
    // For 2nd nominee agreement, we'll treat the 2nd nominee as the main nominee in the template
    nominee: {
      ...secondNomineeData.nominee2,
      // Ensure all required fields are present
      homeTelNo: secondNomineeData.nominee2?.homeTelNo || '',
      officeTelNo: secondNomineeData.nominee2?.officeTelNo || '',
    },
    // Include the first nominee as nominee2
    nominee2: {
      ...secondNomineeData.nominee1,
      // Ensure all required fields are present
      homeTelNo: secondNomineeData.nominee1?.homeTelNo || '',
      officeTelNo: secondNomineeData.nominee1?.officeTelNo || '',
    },
    beneficiaries: secondNomineeData.beneficiaries,
    niche: secondNomineeData.niche,
    // Add placeholder for invoice since 2nd nominee agreements typically don't have invoices
    invoice: {
      invoiceNo: '',
      invoiceDate: '',
      nicheAmount: 0,
      taxAmount: 0,
      totalAmount: 0
    },
    // Add placeholders for other fields
    deceased: {},
    storage: {},
    consentForm: {},
    agreement: {},
    metadata: secondNomineeData.metadata || {},
    crystalReports: {},
    printReady: secondNomineeData.printReady || {}
  };
};