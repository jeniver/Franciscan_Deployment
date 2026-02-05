import { nicheAgreementService } from '../services/nicheAgreementService';

/**
 * Fetches 2nd nominee agreement data for the given application number
 * @param applicationNumber - The application number to fetch data for
 * @returns Promise that resolves to the transformed 2nd nominee agreement data
 */
export const fetchSecondNomineeAgreementData = async (applicationNumber: string) => {
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
    applicant: secondNomineeData.applicant,
    // For 2nd nominee agreement, we'll treat the 2nd nominee as the main nominee in the template
    nominee: secondNomineeData.nominee2,
    // Include the first nominee as nominee2
    nominee2: secondNomineeData.nominee1,
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