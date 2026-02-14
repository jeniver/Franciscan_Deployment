import api from './api';

// Vite exposes env vars via import.meta.env.VITE_*
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://192.168.1.24:3000';

// Custom error class for gate of life operations
export class GateOfLifeError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(message: string, type: 'auth' | 'network' | 'server' | 'validation' = 'server', statusCode?: number) {
    super(message);
    this.name = 'GateOfLifeError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Types for Gate of Life data
export interface GateOfLifeApplicant {
  name: string;
  block: string;
  blockNo: string;
  streetName: string;
  unitNo: string;
  postalCode: string;
  country: string;
  mobileNo: string;
  homeTelephone: string;
  officeTelephone: string;
  emailAddress: string;
}

export interface GateOfLifeEngraving {
  name: string;
  relationship: string;
  dateOfBirth: string;
  dateOfDeath: string;
  additionalInfo: string;
}

export interface GateOfLifeApplication {
  applicationId?: number;
  code?: string;
  applicationNumber?: string;
  bookingDate?: string;
  donation?: {
    amount?: number;
    defaultAmount?: number | null;
  };
  applicant?: {
    name?: string;
    idNo?: string | null;
    email?: string | null;
    mobileNo?: string;
    homeTelNo?: string | null;
    officeTelNo?: string | null;
    address?: {
      no?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  };
  applicantDetails?: GateOfLifeApplicant;
  details?: Array<{
    detailId?: number;
    applicationId?: number;
    nameToEngrave?: string;
    remarks?: string | null;
  }>;
  engravings?: GateOfLifeEngraving[];
  metadata?: {
    churchId?: number;
    userId?: number;
    refDocType?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  requestSameBrick?: boolean;
}

export interface GateOfLifeResponse {
  success: boolean;
  message?: string;
  data: GateOfLifeApplication;
}

export interface GateOfLifeListItem extends GateOfLifeApplication {
  code?: string;
  applicationNumber?: string;
}

export interface GateOfLifePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GateOfLifeListResponse {
  success: boolean;
  message?: string;
  data: GateOfLifeListItem[];
  pagination?: GateOfLifePagination;
  filters?: Record<string, any>;
}

export interface SearchGateOfLifeParams {
  page?: number;
  pageSize?: number;
  applicationCode?: string;
  applicantName?: string;
  applicantIdNo?: string;
  nameToEngrave?: string;
  bookedFrom?: string;
  bookedTo?: string;
  searchTerm?: string;
}

export interface CreateGateOfLifeRequest {
  bookingDate: string;
  applicantName: string;
  applicantIDNo: string;
  applicantEmailID?: string;
  applicantMobileNo: string;
  applicantHomeTelNo?: string;
  applicantOfficeTelNo?: string;
  applicantAddressNo?: string;
  applicantAddressLine1?: string;
  applicantAddressLine2?: string;
  applicantAddressCity?: string;
  applicantAddressState?: string;
  applicantAddressCountry?: string;
  donationAmount: number;
  details: Array<{
    nameToEngrave: string;
    remarks?: string;
    dateOfBirth?: string;
    dateOfDeath?: string;
    additionalInfo?: string;
  }>;
}

export interface UpdateGateOfLifeRequest {
  bookingDate?: string;
  applicantName?: string;
  applicantIDNo?: string;
  applicantEmailID?: string;
  applicantMobileNo?: string;
  applicantHomeTelNo?: string;
  applicantOfficeTelNo?: string;
  applicantAddressNo?: string;
  applicantAddressLine1?: string;
  applicantAddressLine2?: string;
  applicantAddressCity?: string;
  applicantAddressState?: string;
  applicantAddressCountry?: string;
  donationAmount?: number;
  details?: Array<{
    nameToEngrave: string;
    remarks?: string;
    dateOfBirth?: string;
    dateOfDeath?: string;
    additionalInfo?: string;
  }>;
}

// Gate of Life Service
export const gateOfLifeService = {
  // Search gate of life applications
  searchGateOfLifeApplications: async (
    params: SearchGateOfLifeParams = {}
  ): Promise<GateOfLifeListResponse> => {
    try {
      const queryParams: Record<string, any> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        applicationCode: params.applicationCode,
        applicantName: params.applicantName,
        applicantIdNo: params.applicantIdNo,
        nameToEngrave: params.nameToEngrave,
        bookedFrom: params.bookedFrom,
        bookedTo: params.bookedTo,
        searchTerm: params.searchTerm
      };

      // Remove undefined, null, or empty string values
      Object.keys(queryParams).forEach(key => {
        const value = queryParams[key];
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          delete queryParams[key];
        }
      });

      const response = await api.get('/api/gates-of-life', { params: queryParams });
      const payload = response.data ?? {};
      const rawData = payload.data ?? payload.records ?? payload.items ?? payload.results;

      const data: GateOfLifeListItem[] = Array.isArray(rawData)
        ? rawData
        : rawData && Array.isArray(rawData.items)
          ? rawData.items
          : Array.isArray(payload)
            ? payload
            : rawData
              ? [rawData]
              : [];

      if (payload.success === false) {
        throw new GateOfLifeError(payload.message || 'Failed to fetch gate of life applications');
      }

      const fallbackPage = Number(params.page ?? 1);
      const fallbackPageSize = Number(params.pageSize ?? (data.length || 1));
      const fallbackTotal = Number(payload.total ?? data.length ?? 0);
      const fallbackTotalPages = Number(
        payload.totalPages ?? Math.max(1, Math.ceil(fallbackTotal / (fallbackPageSize || 1)))
      );

      const pagination: GateOfLifePagination | undefined = payload.pagination
        ? {
          page: Number(payload.pagination.page ?? fallbackPage),
          pageSize: Number(payload.pagination.pageSize ?? fallbackPageSize),
          total: Number(payload.pagination.total ?? fallbackTotal),
          totalPages: Number(payload.pagination.totalPages ?? fallbackTotalPages)
        }
        : (payload.total !== undefined || payload.totalPages !== undefined)
          ? {
            page: fallbackPage,
            pageSize: fallbackPageSize,
            total: fallbackTotal,
            totalPages: fallbackTotalPages
          }
          : undefined;

      return {
        success: payload.success === undefined ? true : Boolean(payload.success),
        message: payload.message,
        data,
        pagination,
        filters: payload.filters
      };
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        throw error;
      }

      const status = error.response?.status;
      const message = error.response?.data?.message || error.message || 'Failed to fetch gate of life applications';
      let type: 'auth' | 'network' | 'validation' | 'server' = 'server';

      if (status === 401) {
        type = 'auth';
      } else if (status === 400 || status === 404) {
        type = 'validation';
      } else if (!status && (error.code === 'NETWORK_ERROR' || !error.response)) {
        type = 'network';
      }

      throw new GateOfLifeError(message, type, status);
    }
  },

  // Get gate of life application by code
  getGateOfLifeApplication: async (applicationCode: string): Promise<GateOfLifeResponse> => {
    try {
      if (!applicationCode || !applicationCode.trim()) {
        throw new GateOfLifeError('Application code is required', 'validation');
      }

      const response = await api.get(`/api/gates-of-life/${applicationCode.trim()}`);

      if (response.data.success) {
        return response.data;
      } else {
        throw new GateOfLifeError(response.data.message || 'Failed to retrieve gate of life application');
      }
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new GateOfLifeError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new GateOfLifeError('Gate of life application not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new GateOfLifeError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new GateOfLifeError('Network error. Please check your connection.', 'network');
      } else {
        throw new GateOfLifeError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Create gate of life application
  createGateOfLifeApplication: async (applicationData: CreateGateOfLifeRequest): Promise<GateOfLifeResponse> => {
    try {
      const response = await api.post('/api/gates-of-life', applicationData);

      if (response.data.success) {
        return response.data;
      } else {
        throw new GateOfLifeError(response.data.message || 'Failed to create gate of life application');
      }
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new GateOfLifeError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 400) {
        // Parse validation error response
        const errorData = error.response?.data;
        let errorMessage = 'Invalid application data';

        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData?.error?.details && Array.isArray(errorData.error.details)) {
          errorMessage = errorData.error.details.join(', ');
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        }

        throw new GateOfLifeError(errorMessage, 'validation', 400);
      } else if (error.response?.status >= 500) {
        throw new GateOfLifeError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new GateOfLifeError('Network error. Please check your connection.', 'network');
      } else {
        throw new GateOfLifeError(error.response?.data?.message || 'Failed to create gate of life application');
      }
    }
  },

  // Update gate of life application
  updateGateOfLifeApplication: async (
    applicationCode: string,
    applicationData: UpdateGateOfLifeRequest
  ): Promise<GateOfLifeResponse> => {
    try {
      if (!applicationCode || !applicationCode.trim()) {
        throw new GateOfLifeError('Application code is required', 'validation');
      }

      const response = await api.put(`/api/gates-of-life/${applicationCode.trim()}`, applicationData);

      if (response.data.success) {
        return response.data;
      } else {
        throw new GateOfLifeError(response.data.message || 'Failed to update gate of life application');
      }
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new GateOfLifeError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 400) {
        // Parse validation error response
        const errorData = error.response?.data;
        let errorMessage = 'Invalid application data';

        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData?.error?.details && Array.isArray(errorData.error.details)) {
          errorMessage = errorData.error.details.join(', ');
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        }

        throw new GateOfLifeError(errorMessage, 'validation', 400);
      } else if (error.response?.status === 404) {
        throw new GateOfLifeError('Gate of life application not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new GateOfLifeError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new GateOfLifeError('Network error. Please check your connection.', 'network');
      } else {
        throw new GateOfLifeError(error.response?.data?.message || 'Failed to update gate of life application');
      }
    }
  },

  // Delete gate of life application
  deleteGateOfLifeApplication: async (applicationCode: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!applicationCode || !applicationCode.trim()) {
        throw new GateOfLifeError('Application code is required', 'validation');
      }

      const response = await api.delete(`/api/gates-of-life/${applicationCode.trim()}`);

      if (response.data.success) {
        return response.data;
      } else {
        throw new GateOfLifeError(response.data.message || 'Failed to delete gate of life application');
      }
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new GateOfLifeError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new GateOfLifeError('Gate of life application not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new GateOfLifeError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new GateOfLifeError('Network error. Please check your connection.', 'network');
      } else {
        throw new GateOfLifeError(error.response?.data?.message || 'Failed to delete gate of life application');
      }
    }
  },

  // Save gate of life application (legacy method, redirects to create)
  saveGateOfLifeApplication: async (applicationData: any): Promise<GateOfLifeResponse> => {
    return gateOfLifeService.createGateOfLifeApplication(applicationData as CreateGateOfLifeRequest);
  },

  // Generate PDF for gate of life application
  generateGateOfLifePDF: async function (applicationNumber: string, type: 'agreement' | 'invoice' | 'receipt' = 'agreement'): Promise<void> {
    try {
      if (!applicationNumber || !applicationNumber.trim()) {
        throw new GateOfLifeError('Application number is required for PDF generation', 'validation');
      }

      // Determine the correct endpoint based on type
      let endpoint = '';
      switch (type) {
        case 'agreement':
          endpoint = `/api/gates-of-life/${applicationNumber.trim()}/pdf`;
          break;
        case 'invoice':
          endpoint = `/api/gates-of-life/${applicationNumber.trim()}/invoice-pdf`;
          break;
        case 'receipt':
          endpoint = `/api/gates-of-life/${applicationNumber.trim()}/receipt-pdf`;
          break;
        default:
          endpoint = `/api/gates-of-life/${applicationNumber.trim()}/pdf`;
      }

      // First, try to check if the endpoint exists by making a HEAD request
      try {
        await api.head(endpoint);
        // If HEAD succeeds, open the PDF
        const pdfUrl = `${API_BASE}${endpoint}`;
        const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');

        if (!newWindow) {
          throw new GateOfLifeError('Popup blocked. Please allow popups for this site.', 'validation', 403);
        }

        console.log(`Opening ${type} PDF in new tab:`, pdfUrl);
        return;
      } catch (headError: any) {
        // If HEAD fails (404), try to get application data and use client-side generation
        console.warn(`PDF endpoint ${endpoint} not available, trying to get application data for client-side generation`);

        // Get application data for PDF generation
        let appData: any = null;
        try {
          const appResponse = await api.get(`/api/gates-of-life/${applicationNumber.trim()}`);
          if (appResponse.data?.success && appResponse.data?.data) {
            appData = appResponse.data.data;
          }
        } catch (appError: any) {
          console.warn('Could not get application data for PDF generation:', appError.message);
        }

        // If we have application data, use client-side generation
        if (appData) {
          const formData = {
            applicationNumber: appData.code || appData.applicationNumber || applicationNumber,
            applicantDetails: {
              name: appData.applicant?.name || '',
              mobileNo: appData.applicant?.mobileNo || '',
              emailAddress: appData.applicant?.email || '',
              address: appData.applicant?.address ?
                `${appData.applicant.address.no || ''} ${appData.applicant.address.line1 || ''} ${appData.applicant.address.line2 || ''} ${appData.applicant.address.city || ''} ${appData.applicant.address.state || ''} ${appData.applicant.address.country || ''}`.trim() : ''
            },
            engravings: (appData.details || []).map((d: any) => ({
              name: d.nameToEngrave || '',
              relationship: d.remarks || ''
            })),
            bookingDate: appData.bookingDate || '',
            donationAmount: appData.donation?.amount || 0
          };

          // Use client-side PDF generation
          // Call the generatePDFFromData method from the service object
          await gateOfLifeService.generatePDFFromData(formData, type);
          return;
        }

        // If we can't get data, throw the original error
        if (headError.response?.status === 404) {
          throw new GateOfLifeError(
            `PDF endpoint not available for ${type}. The server endpoint may not be configured.`,
            'validation',
            404
          );
        }
        throw headError;
      }
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        throw error;
      }

      if (error.response?.status === 404) {
        throw new GateOfLifeError(
          `PDF endpoint not found. Please contact support or use the application form to generate PDFs.`,
          'validation',
          404
        );
      } else if (error.response?.status === 401) {
        throw new GateOfLifeError('Authentication required', 'auth', 401);
      } else if (error.response?.data?.message) {
        throw new GateOfLifeError(error.response.data.message, 'server', error.response.status);
      } else {
        throw new GateOfLifeError(error.message || 'Failed to generate PDF', 'server');
      }
    }
  },

  // Generate PDF from form data (actual PDF generation, not template)
  generatePDFFromData: async (formData: any, type: 'agreement' | 'invoice' | 'receipt' = 'agreement'): Promise<void> => {
    try {
      // Create PDF content from form data
      const htmlContent = createPDFContent(formData, type);

      // Use html2pdf for proper PDF generation
      const html2pdf = (await import('html2pdf.js')).default;

      // Create a temporary element with the HTML content
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '-9999px';
      document.body.appendChild(element);

      // Configure html2pdf options
      const opt = {
        margin: 1,
        filename: `GateOfLife_${type}_${formData.applicationNumber || 'Document'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };

      // Generate and download PDF
      await html2pdf().set(opt).from(element).save();

      // Clean up
      document.body.removeChild(element);

      console.log(`Generated ${type} PDF from form data`);
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        throw error;
      } else {
        // Fallback to HTML template if html2pdf fails
        console.warn('html2pdf not available, falling back to HTML template');
        const htmlContent = createPDFContent(formData, type);
        const printWindow = window.open('', '_blank', 'width=800,height=600');

        if (!printWindow) {
          throw new GateOfLifeError('Popup blocked. Please allow popups for this site.');
        }

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    }
  }
};

// Helper function to create PDF content from form data
function createPDFContent(formData: any, type: string): string {
  const { applicationNumber, applicantDetails, engravings, bookingDate } = formData;

  // Create HTML content that can be converted to PDF
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gate of Life ${type.charAt(0).toUpperCase() + type.slice(1)} - ${applicationNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #8b5a2b;
            padding: 20px 0;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #8b5a2b;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .header h2 {
            color: #666;
            font-size: 18px;
            font-weight: normal;
        }
        
        .document-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 15px;
            background: #fef3c7;
            border-left: 4px solid #8b5a2b;
        }
        
        .document-info div {
            flex: 1;
        }
        
        .document-info label {
            font-weight: bold;
            color: #8b5a2b;
            display: block;
            margin-bottom: 5px;
        }
        
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .section h3 {
            color: #8b5a2b;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 2px solid #8b5a2b;
            padding-bottom: 5px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-item {
            margin-bottom: 10px;
        }
        
        .info-item label {
            font-weight: bold;
            color: #555;
            display: block;
            margin-bottom: 3px;
        }
        
        .info-item span {
            color: #333;
            padding: 5px 10px;
            background: #f9fafb;
            border-radius: 4px;
            display: inline-block;
            min-width: 150px;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 2px solid #8b5a2b;
            padding-top: 20px;
            color: #666;
        }
        
        @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>FRANCISCAN COLUMBARIUM</h1>
        <h2>Gate of Life ${type.charAt(0).toUpperCase() + type.slice(1)} Document</h2>
    </div>
    
    <div class="document-info">
        <div>
            <label>Application Number:</label>
            <span>${applicationNumber || 'N/A'}</span>
        </div>
        <div>
            <label>Document Type:</label>
            <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        </div>
        <div>
            <label>Booking Date:</label>
            <span>${bookingDate || 'N/A'}</span>
        </div>
        <div>
            <label>Generated Date:</label>
            <span>${new Date().toLocaleDateString()}</span>
        </div>
    </div>
    
    <div class="section">
        <h3>Applicant Information</h3>
        <div class="info-grid">
            <div class="info-item">
                <label>Name:</label>
                <span>${applicantDetails?.name || 'N/A'}</span>
            </div>
            <div class="info-item">
                <label>Mobile Number:</label>
                <span>${applicantDetails?.mobileNo || 'N/A'}</span>
            </div>
            <div class="info-item">
                <label>Home Telephone:</label>
                <span>${applicantDetails?.homeTelephone || 'N/A'}</span>
            </div>
            <div class="info-item">
                <label>Office Telephone:</label>
                <span>${applicantDetails?.officeTelephone || 'N/A'}</span>
            </div>
            <div class="info-item">
                <label>Email Address:</label>
                <span>${applicantDetails?.emailAddress || 'N/A'}</span>
            </div>
            <div class="info-item">
                <label>Address:</label>
                <span>${applicantDetails ? `${applicantDetails.block} ${applicantDetails.blockNo} ${applicantDetails.streetName} #${applicantDetails.unitNo} ${applicantDetails.postalCode} ${applicantDetails.country}` : 'N/A'}</span>
            </div>
        </div>
    </div>
    
    ${engravings && engravings.length > 0 ? `
    <div class="section">
        <h3>Names to be Engraved</h3>
        <div class="info-grid">
            ${engravings.map((engraving: any, index: number) => `
            <div class="info-item">
                <label>Name ${index + 1}:</label>
                <span>${engraving.name || 'N/A'}</span>
            </div>
            <div class="info-item">
                <label>Relationship:</label>
                <span>${engraving.relationship || 'N/A'}</span>
            </div>
            <div class="info-item">
                <label>Date of Birth:</label>
                <span>${engraving.dateOfBirth || 'N/A'}</span>
            </div>
            <div class="info-item">
                <label>Date of Death:</label>
                <span>${engraving.dateOfDeath || 'N/A'}</span>
            </div>
            `).join('')}
        </div>
    </div>
    ` : ''}
    
    <div class="footer">
        <p>This document was generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>Franciscan Columbarium Management System</p>
    </div>
</body>
</html>`;

  return htmlContent;
}

export default gateOfLifeService;
