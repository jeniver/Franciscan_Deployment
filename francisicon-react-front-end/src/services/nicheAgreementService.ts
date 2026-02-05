import api from './api';
import { pdfTemplateService } from './pdfTemplateService';
import { invoicePdfService } from './invoicePdfService';

// Vite exposes env vars via import.meta.env.VITE_*
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';

// Types for the new API response structure
export interface Applicant {
  name: string;
  address: string;
  addressNo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  email: string;
  idNo: string;
  mobileNo: string;
  homeTelNo: string | null;
  officeTelNo: string | null;
  isCatholic: boolean;
}

export interface Nominee {
  name: string;
  address: string;
  addressNo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  email: string;
  idNo: string;
  mobileNo: string;
  homeTelNo: string | null;
  officeTelNo: string | null;
  relationship: string;
}

export interface Beneficiary {
  name: string;
  idNo: string;
  isCatholic: boolean;
  isMale: boolean;
  relationshipToApplicant: string;
  dateOfBirth: string;
  birthYear: string;
  relationshipToNominee1: string;
  relationshipToNominee2: string;
  status: string;
  sex: string;
}

export interface Niche {
  number: string;
  code: string;
  rowNumber: string | null;
  wallName: string | null;
  chapelName: string | null;
  totalAmount: number;
  lineAmount: number;
  location?: {
    chapel: {
      chapelId: number;
      chapelCode: string;
      chapelName: string;
      description: string;
    };
    wall: {
      wallId: number;
      wallCode: string;
      wallName: string;
    };
    row: {
      rowId: number;
      rowCode: string;
      level: number;
    };
  };
}

export interface Invoice {
  invoiceNo: string;
  invoiceDate: string;
  receiptAmount: number;
  taxAmount: number;
  invoicePayingAmount: number;
  receiptPayingAmount: number;
  refDocNumber: string;
}

export interface ConsentForm {
  status: string;
  timestamp: string | null;
  submittedBy: string | null;
  notes: string | null;
}

export interface Agreement {
  status: string;
  timestamp: string | null;
  signedBy: string | null;
  notes: string | null;
}

export interface Metadata {
  generatedAt: string;
  applicationNumber: string;
  hasInvoice: boolean;
  hasReceipt: boolean;
  beneficiaryCount: number;
  nomineeCount: number;
}

export interface CrystalReport {
  reportPath: string;
  reportName: string;
  description: string;
  parameters: Record<string, any>;
}

export interface CrystalReports {
  agreement: CrystalReport;
  invoice: CrystalReport;
  invoiceReceipt: CrystalReport;
  beneficiaryReports: {
    firstBeneficiaryLiving: CrystalReport;
    firstBeneficiaryDeceased: CrystalReport;
    firstBeneficiaryLostCapacity: CrystalReport;
    secondBeneficiaryLiving: CrystalReport;
    secondBeneficiaryDeceased: CrystalReport;
    secondBeneficiaryLostCapacity: CrystalReport;
    bothBeneficiariesLiving: CrystalReport;
    bothBeneficiariesDeceased: CrystalReport;
    bothBeneficiariesLostCapacity: CrystalReport;
  };
  nomineeReports: {
    secondNomineeAgreement: CrystalReport;
  };
  inscriptionReports: {
    inscription: CrystalReport;
    inscriptionLive: CrystalReport;
    inscriptionNew: CrystalReport;
    secondInscription: CrystalReport;
  };
  additionalReports: {
    beneficiaryList: CrystalReport;
    monthlyInscription: CrystalReport;
    receiptMonthly: CrystalReport;
  };
}

export interface PrintReady {
  agreementReady: boolean;
  invoiceReady: boolean;
  receiptReady: boolean;
  consentFormReady: boolean;
}

// Define interface for 2nd Nominee Agreement response
export interface SecondNomineeAgreementResponse {
  success: boolean;
  message: string;
  data: {
    type: string;
    documentTitle: string;
    applicationNumber: string;
    generatedAt: string;
    application: {
      applicationNumber: string;
      appliedDate: string;
      agreementDate: string;
    };
    applicant: {
      name: string;
      idNo: string;
      address: string;
      mobileNo: string;
      email: string;
    };
    nominee1: {
      name: string;
      idNo: string;
      address: string;
      mobileNo: string;
      email: string;
      relationship: string;
    } | null;
    nominee2: {
      name: string;
      idNo: string;
      address: string;
      mobileNo: string;
      email: string;
      relationship: string;
    };
    niche: {
      number: string;
      rowNumber: string;
      wallName: string;
      chapelName: string;
    };
    beneficiaries: Beneficiary[];
    crystalReport?: {
      reportPath: string;
      reportName: string;
      description: string;
      parameters: Record<string, any>;
    };
    printReady: PrintReady;
    metadata: Metadata;
  };
}

export interface NicheAgreementResponse {
  success: boolean;
  message: string;
  data: {
    applicationCode: string;
    appliedDate: string;
    agreementDate: string;
    applicant: Applicant;
    nominee: Nominee;
    nominee2: Nominee;
    beneficiaries: Beneficiary[];
    niche: Niche;
    invoice: Invoice;
    consentForm: ConsentForm;
    agreement: Agreement;
    metadata: Metadata;
    crystalReports: CrystalReports;
    printReady: PrintReady;
  };
}

// Custom error class for better error handling
export class NicheAgreementError extends Error {
  public statusCode: number;
  public isAuthError: boolean;
  public isNetworkError: boolean;

  constructor(message: string, statusCode: number = 500, isAuthError: boolean = false, isNetworkError: boolean = false) {
    super(message);
    this.name = 'NicheAgreementError';
    this.statusCode = statusCode;
    this.isAuthError = isAuthError;
    this.isNetworkError = isNetworkError;
  }
}

// API service functions
export const nicheAgreementService = {
  // Get niche agreement data by application number
  getNicheAgreement: async (applicationNumber: string): Promise<NicheAgreementResponse> => {
    try {
      // Validate application number
      if (!applicationNumber || !applicationNumber.trim()) {
        throw new NicheAgreementError('Application number is required', 400);
      }

      // Create a timeout promise (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      // Race between API call and timeout
      const response = await Promise.race([
        api.get(`/api/niche-agreements/${applicationNumber.trim()}`),
        timeoutPromise
      ]);
      
      if (!response.data.success) {
        throw new NicheAgreementError('API returned unsuccessful response', 400);
      }

      return response.data;
    } catch (error: any) {
      // Handle different types of errors
      if (error instanceof NicheAgreementError) {
        throw error;
      }

      if (error.message === 'Request timeout') {
        throw new NicheAgreementError('Request timed out. Please try again.', 408, false, true);
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.error || 'Server error';
        
        if (status === 401) {
          throw new NicheAgreementError('Session expired. Please login again.', status, true);
        } else if (status === 403) {
          throw new NicheAgreementError('Access denied. You do not have permission to view this application.', status, true);
        } else if (status === 404) {
          throw new NicheAgreementError(`Application ${applicationNumber} not found. Please check the application number.`, status);
        } else if (status === 429) {
          throw new NicheAgreementError('Too many requests. Please try again later.', status);
        } else if (status >= 500) {
          throw new NicheAgreementError('Server error. Please try again later.', status);
        } else {
          throw new NicheAgreementError(message, status);
        }
      } else if (error.request) {
        // Network error
        throw new NicheAgreementError('Network error. Please check your internet connection and try again.', 0, false, true);
      } else {
        // Other error
        throw new NicheAgreementError('An unexpected error occurred. Please try again.', 500);
      }
    }
  },

  // Get PDF URL for agreement using crystal reports
  getAgreementPdfUrl: (applicationNumber: string, crystalReports?: any): string => {
    if (!applicationNumber || !applicationNumber.trim()) {
      throw new NicheAgreementError('Application number is required for PDF generation');
    }
    
    // If crystal reports data is available, use the report path
    if (crystalReports?.agreement?.reportPath) {
      const params = new URLSearchParams(crystalReports.agreement.parameters);
      return `${API_BASE}/api/reports/${crystalReports.agreement.reportName}?${params.toString()}`;
    }
    
    // Use the direct endpoint that returns PDF data
    return `${API_BASE}/api/niche-agreements/${applicationNumber.trim()}/pdf`;
  },

  // Get PDF URL for invoice using crystal reports
  getInvoicePdfUrl: (applicationNumber: string, crystalReports?: any): string => {
    if (!applicationNumber || !applicationNumber.trim()) {
      throw new NicheAgreementError('Application number is required for PDF generation');
    }
    
    // If crystal reports data is available, use the report path
    if (crystalReports?.invoiceReceipt?.reportPath) {
      const params = new URLSearchParams(crystalReports.invoiceReceipt.parameters);
      return `${API_BASE}/api/reports/${crystalReports.invoiceReceipt.reportName}?${params.toString()}`;
    }
    
    // Fallback to direct endpoint
    return `${API_BASE}/api/niche-agreements/${applicationNumber.trim()}/invoice-pdf`;
  },

  // Get PDF URL for invoice only
  getInvoiceOnlyPdfUrl: (applicationNumber: string, crystalReports?: any): string => {
    if (!applicationNumber || !applicationNumber.trim()) {
      throw new NicheAgreementError('Application number is required for PDF generation');
    }
    
    // If crystal reports data is available, use the report path
    if (crystalReports?.invoice?.reportPath) {
      const params = new URLSearchParams(crystalReports.invoice.parameters);
      return `${API_BASE}/api/reports/${crystalReports.invoice.reportName}?${params.toString()}`;
    }
    
    // Fallback to direct endpoint
    return `${API_BASE}/api/niche-agreements/${applicationNumber.trim()}/invoice-only`;
  },

  /**
   * Get 2nd Nominee Agreement Data for PDF generation
   */
  getSecondNomineeAgreementPdf: async (applicationNumber: string): Promise<SecondNomineeAgreementResponse> => {
    try {
      if (!applicationNumber || !applicationNumber.trim()) {
        throw new NicheAgreementError('Application number is required for 2nd nominee agreement PDF generation');
      }

      console.log(`[getSecondNomineeAgreementPdf] Making API call for application: ${applicationNumber}`);
      
      // Make API call with increased timeout (60 seconds) for 2nd nominee agreement
      const response = await api.get<SecondNomineeAgreementResponse>(`/api/niche-agreements/${applicationNumber.trim()}/second-nominee-agreement-pdf`, {
        timeout: 60000 // 60 second timeout (increased from 30s)
      });
      
      console.log(`[getSecondNomineeAgreementPdf] Received response for application: ${applicationNumber}`, {
        success: response.data.success,
        hasData: !!response.data.data
      });
      
      if (!response.data.success) {
        throw new NicheAgreementError('API returned unsuccessful response for 2nd nominee agreement', 400);
      }

      return response.data;
    } catch (error: any) {
      console.error(`[getSecondNomineeAgreementPdf] Error for application ${applicationNumber}:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data
      });
      
      if (error instanceof NicheAgreementError) {
        throw error;
      }

      if (error.message === 'Request timeout') {
        throw new NicheAgreementError('Request timed out. Please try again.', 408, false, true);
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.error || 'Server error';
        
        if (status === 401) {
          throw new NicheAgreementError('Session expired. Please login again.', status, true);
        } else if (status === 403) {
          throw new NicheAgreementError('Access denied. You do not have permission to view this application.', status, true);
        } else if (status === 404) {
          throw new NicheAgreementError(`Application ${applicationNumber} does not have a 2nd nominee agreement or does not exist.`, status);
        } else if (status === 429) {
          throw new NicheAgreementError('Too many requests. Please try again later.', status);
        } else if (status >= 500) {
          throw new NicheAgreementError('Server error. Please try again later.', status);
        } else {
          throw new NicheAgreementError(message, status);
        }
      } else if (error.request) {
        // Network error
        throw new NicheAgreementError('Network error. Please check your internet connection and try again.', 0, false, true);
      } else {
        // Other error
        throw new NicheAgreementError('An unexpected error occurred. Please try again.', 500);
      }
    }
  },

  // Open PDF in new tab with the new API response structure
  // If newWindow is provided, it will be used instead of opening a new one (to avoid popup blocking)
  openPdfInNewTab: async (applicationNumber: string, type: 'agreement' | 'invoice' | 'receipt' = 'agreement', newWindow?: Window | null): Promise<void> => {
    console.log(`[openPdfInNewTab] Starting PDF generation for ${applicationNumber}, type: ${type}`);
    try {
      if (!applicationNumber || !applicationNumber.trim()) {
        throw new NicheAgreementError('Application number is required for PDF generation');
      }

      // Helper function to check if error is a network error
      const isNetworkError = (error: any): boolean => {
        // Check for axios network error codes
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.code === 'ETIMEDOUT') {
          return true;
        }
        
        // Check for network error messages
        if (error.message === 'Network Error' || 
            error.message?.toLowerCase().includes('timeout') ||
            error.message?.toLowerCase().includes('network') ||
            error.message?.toLowerCase().includes('failed to fetch') ||
            error.message?.toLowerCase().includes('connection')) {
          return true;
        }
        
        // Check if request was made but no response received (network issue)
        if (error.request && !error.response) {
          return true;
        }
        
        // Check if no response at all (likely network issue)
        if (!error.response && !error.request) {
          return true;
        }
        
        return false;
      };

      // Retry logic for network errors
      let response;
      let lastError: any = null;
      const maxRetries = 2;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Use longer timeout for PDF generation requests (30 seconds)
          console.log(`[openPdfInNewTab] Attempt ${attempt + 1}/${maxRetries + 1} - Fetching application data...`);
          response = await api.get(`/api/niche-agreements/${applicationNumber.trim()}`, {
            timeout: 30000
          });
          console.log(`[openPdfInNewTab] Successfully fetched application data`);
          lastError = null; // Clear error on success
          break; // Success, exit retry loop
        } catch (error: any) {
          lastError = error;
          
          // Log detailed error information for debugging
          console.error(`[openPdfInNewTab] Error on attempt ${attempt + 1}/${maxRetries + 1}:`, {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            hasResponse: !!error.response,
            hasRequest: !!error.request,
            isNetworkError: isNetworkError(error)
          });
          
          // If it's a network error and we have retries left, wait and retry
          if (isNetworkError(error) && attempt < maxRetries) {
            const waitTime = (attempt + 1) * 1000; // Exponential backoff: 1s, 2s
            console.warn(`[openPdfInNewTab] Network error detected, retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          // If it's not a network error, throw immediately (don't retry for 404, 401, etc.)
          if (!isNetworkError(error)) {
            console.error(`[openPdfInNewTab] Non-network error (${error.response?.status || 'unknown'}), not retrying`);
            throw error;
          }
          
          // If we're here, it's a network error but we're out of retries
          // Fall through to throw after the loop
        }
      }
      
      // If we still don't have a response after retries, throw the last error
      if (!response && lastError) {
        console.error(`[openPdfInNewTab] All retry attempts failed. Last error:`, {
          message: lastError.message,
          code: lastError.code,
          status: lastError.response?.status,
          isNetworkError: isNetworkError(lastError)
        });
        
        if (isNetworkError(lastError)) {
          throw new NicheAgreementError('Network error - unable to connect to server after multiple attempts. Please check your internet connection and try again.');
        }
        // Re-throw the original error so it can be handled by the outer catch block
        throw lastError;
      }
      
      // Safety check - should never reach here, but just in case
      if (!response) {
        console.error(`[openPdfInNewTab] No response and no error - unexpected state`);
        throw new NicheAgreementError('Failed to retrieve application data - unexpected error');
      }
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;

        // For agreements, open an HTML preview in a popup window using the agreement template.
        // The popup includes controls to print or download as PDF, implemented in pdfTemplateService.
        if (type === 'agreement') {
          // Base URL can be used in the template if needed (e.g. logo)
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const title = `Agreement - ${applicationNumber}`;
          
          // Use provided window or open new one (to avoid popup blocking)
          const targetWindow = newWindow || window.open('', '_blank', 'noopener,noreferrer');
          
          if (!targetWindow) {
            throw new NicheAgreementError('Popup blocked. Please allow popups for this site to view the agreement.', 403);
          }
          
          // Show loading message while generating PDF
          if (!newWindow) {
            targetWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head><title>Loading Agreement PDF...</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                  <h2>Generating Agreement PDF...</h2>
                  <p>Please wait while the PDF is being prepared.</p>
                </body>
              </html>
            `);
            targetWindow.document.close();
          }
          
          console.log(`[openPdfInNewTab] Opening agreement HTML preview using client-side template...`);
          console.log(`[openPdfInNewTab] Data received:`, {
            hasApplicant: !!data.applicant,
            applicantName: data.applicant?.name,
            hasBeneficiaries: !!data.beneficiaries && data.beneficiaries.length > 0,
            beneficiaryCount: data.beneficiaries?.length || 0,
            hasNominee: !!data.nominee,
            hasNominee2: !!data.nominee2,
            hasNiche: !!data.niche,
            nicheNumber: data.niche?.number,
            hasInvoice: !!data.invoice,
            applicationCode: data.applicationCode
          });
          
          // Validate data before generating preview
          if (!data || !data.applicant || !data.applicant.name) {
            const errorMsg = 'Invalid data: Missing applicant information';
            console.error(`[openPdfInNewTab] ${errorMsg}`);
            if (targetWindow && targetWindow.document) {
              targetWindow.document.body.innerHTML = `
                <div style="font-family: Arial; text-align: center; padding: 50px; color: red;">
                  <h2>Error</h2>
                  <p>${errorMsg}</p>
                  <p style="font-size: 12px; color: #666; margin-top: 20px;">Please ensure the application data is complete.</p>
                </div>
              `;
            }
            throw new NicheAgreementError(errorMsg);
          }

          try {
            // Generate HTML template from the JSON data
            const template = pdfTemplateService.generateAgreementTemplate(data, baseUrl);

            // Use the template helper to open a popup window that shows the HTML,
            // with Print and Download PDF controls. This keeps behavior consistent
            // while giving a modal-like preview experience.
            pdfTemplateService.openPdfInNewTab(template, title, true, data, baseUrl);

            console.log(`[openPdfInNewTab] Successfully opened ${type} HTML preview in popup for application:`, applicationNumber);
            return;
          } catch (pdfError: any) {
            console.error('[openPdfInNewTab] Error generating or opening agreement HTML preview:', pdfError);
            throw new NicheAgreementError(`Failed to open agreement preview: ${pdfError.message || 'Unknown error'}`);
          }
        }

        // For invoice & receipt, use the same jsPDF layout used by the Download/Print buttons
        // so that viewing and downloading are consistent.
        const invoice = data.invoice || {};
        const applicant = data.applicant || {};
        const niche = data.niche || {};
        const metadata = data.metadata || {};

        const pricing = {
          nicheAmount: Number(niche.totalAmount ?? invoice.invoicePayingAmount ?? 0) || 0,
          serviceAmount: 300, // Updated service fee (Setting of tables + Sealing of niche: 20 + 20 = 40, but using 300 as per standard practice)
          taxAmount: Number(invoice.taxAmount ?? 0) || 0,
          totalAmount:
            Number(invoice.invoicePayingAmount ?? niche.totalAmount ?? 0) || 0
        };

        console.log(`[openPdfInNewTab] Generating PDF blob...`);
        let pdfBlob: Blob;
        try {
          pdfBlob = await invoicePdfService.generateInvoicePdfBlob({
            invoiceNo: invoice.invoiceNo || `INV-${applicationNumber}`,
            invoiceDate: invoice.invoiceDate || new Date().toLocaleDateString(),
            dueDate:
              invoice.invoiceDate ||
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            applicationNumber: metadata.applicationNumber || applicationNumber,
            applicantName: applicant.name || '',
            applicantIDNo: applicant.idNo || '',
            applicantEmail: applicant.email || '',
            applicantPhone: applicant.mobileNo || '',
            applicantAddress: applicant.address || '',
            nicheDetails: {
              nicheId: null,
              nicheCode: niche.code || '',
              chapel:
                niche.location?.chapel?.chapelName ||
                niche.chapelName ||
                '',
              wallName:
                niche.location?.wall?.wallName ||
                niche.wallName ||
                '',
              rowNumber:
                niche.rowNumber ||
                niche.location?.row?.rowCode ||
                '',
              rowLevel: niche.location?.row?.level ?? null
            },
            beneficiaries: (data.beneficiaries || []).map((b: any) => ({
              name: b.name || '',
              relationship: b.relationshipToApplicant || '',
              nric: b.idNo || ''
            })),
            nominees: [data.nominee, data.nominee2]
              .filter(Boolean)
              .map((n: any) => ({
                name: n.name || '',
                nric: n.idNo || '',
                relationship: n.relationship || ''
              })),
            pricing
          });
          console.log(`[openPdfInNewTab] PDF blob generated successfully, size: ${pdfBlob.size} bytes`);
        } catch (pdfError: any) {
          console.error(`[openPdfInNewTab] Error generating PDF blob:`, pdfError);
          throw new NicheAgreementError(`Failed to generate PDF: ${pdfError.message || 'Unknown error'}`);
        }

        console.log(`[openPdfInNewTab] PDF blob generated, opening in window...`);
        
        // Use provided window or open new one (fallback for direct calls)
        const targetWindow = newWindow || window.open('', '_blank', 'noopener,noreferrer');
        
        if (!targetWindow) {
          throw new NicheAgreementError('Popup blocked. Please allow popups for this site to view the invoice.', 403);
        }
        
        // If we just opened the window (not provided), show loading message
        if (!newWindow) {
          targetWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head><title>Loading Invoice PDF...</title></head>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2>Generating Invoice PDF...</h2>
                <p>Please wait while the PDF is being prepared.</p>
              </body>
            </html>
          `);
          targetWindow.document.close();
        }
        
        // Create blob URL and load PDF
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Load PDF in the window
        targetWindow.location.href = pdfUrl;
        
        // Clean up the URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 60_000);

        console.log(`[openPdfInNewTab] Successfully opened ${type} PDF in new tab for application:`, applicationNumber);
        return; // Explicitly return to ensure function completes
      } else {
        console.error('API response missing data:', response.data);
        throw new NicheAgreementError('Failed to retrieve application data - invalid response format');
      }
    } catch (error: any) {
      console.error(`[openPdfInNewTab] Outer catch block - error details:`, {
        errorType: error.constructor.name,
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        hasResponse: !!error.response,
        hasRequest: !!error.request,
        isNicheAgreementError: error instanceof NicheAgreementError
      });
      
      if (error instanceof NicheAgreementError) {
        throw error;
      }
      
      // Handle network errors specifically (comprehensive check for axios network errors)
      const isNetworkErr = !error.response || 
        error.code === 'ECONNABORTED' || 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ETIMEDOUT' ||
        error.message === 'Network Error' ||
        error.message?.includes('timeout') ||
        error.message?.includes('Network') ||
        (error.request && !error.response);
      
      if (isNetworkErr) {
        console.error(`[openPdfInNewTab] Detected as network error`);
        throw new NicheAgreementError('Network error - unable to connect to server. Please check your internet connection and try again.');
      }
      
      // Handle specific HTTP status codes
      if (error.response?.status === 401) {
        throw new NicheAgreementError('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        throw new NicheAgreementError('You do not have permission to view this invoice.');
      } else if (error.response?.status === 404) {
        throw new NicheAgreementError(`Application "${applicationNumber}" not found. Please check the application number.`);
      } else if (error.response?.status >= 500) {
        throw new NicheAgreementError(`Server error (${error.response.status}). Please try again later.`);
      }
      
      // Use error message from response if available
      if (error.response?.data?.message) {
        throw new NicheAgreementError(error.response.data.message);
      } else if (error.message) {
        throw new NicheAgreementError(error.message);
      } else {
        throw new NicheAgreementError('Failed to open PDF. Please try again.');
      }
    }
  },

  // Generate and download PDF with the new API response structure (alternative method)
  generatePdf: async (applicationNumber: string, type: 'agreement' | 'invoice' | 'receipt' = 'agreement'): Promise<void> => {
    try {
      if (!applicationNumber || !applicationNumber.trim()) {
        throw new NicheAgreementError('Application number is required for PDF generation');
      }

      const response = await api.get(`/api/niche-agreements/${applicationNumber.trim()}/pdf`);
      
      if (response.data.success && response.data.data) {
        const pdfData = response.data.data;
        
        // Create a blob from the PDF data
        const pdfBlob = new Blob([JSON.stringify(pdfData, null, 2)], { 
          type: 'application/pdf' 
        });
        
        // Create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${pdfData.documentTitle || 'Agreement'}_${applicationNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('PDF generated successfully:', pdfData);
      } else {
        throw new NicheAgreementError('Failed to generate PDF');
      }
    } catch (error: any) {
      if (error instanceof NicheAgreementError) {
        throw error;
      }
      
      if (error.response?.data?.message) {
        throw new NicheAgreementError(error.response.data.message);
      } else {
        throw new NicheAgreementError('Failed to generate PDF');
      }
    }
  }
};

export default nicheAgreementService;
