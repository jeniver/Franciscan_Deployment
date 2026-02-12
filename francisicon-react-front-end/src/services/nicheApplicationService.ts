import api from './api';

// Vite exposes env vars via import.meta.env.VITE_*
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://192.168.1.24:3000';

// Custom error class for niche application operations
export class NicheApplicationError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(message: string, type: 'auth' | 'network' | 'server' | 'validation' = 'server', statusCode?: number) {
    super(message);
    this.name = 'NicheApplicationError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Types for Niche Application data
export interface Beneficiary {
  id?: number;
  name: string;
  relationshipToApplicant: string;
  fullName?: string;
  nric?: string;
  status?: string;
  religion?: string;
  dateOfBirth?: string;
  relationshipToNominee1?: string;
  relationshipToNominee2?: string;
}

export interface Nominee {
  id: number;
  fullName: string;
  nric: string;
  relationship: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  dateOfBirth?: string;
  officeTelNo?: string;
  homeTelNo?: string;
  status?: string;
}

export interface RawNicheApplication {
  applicationId?: number;
  code?: string;
  applicationCode?: string;
  applicationNumber?: string;
  nicheId?: number | number[] | null;
  nicheDetails?: Record<string, any>;
  applicantName?: string;
  applicantIDNo?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantAddress?: string;
  applicantReligion?: string | null;
  applicantHomeTel?: string | null;
  applicantOfficeTel?: string | null;
  nomineeName?: string;
  nomineeIDNo?: string;
  nomineeEmail?: string;
  nomineePhone?: string;
  nomineeRelationship?: string;
  nomineeAddress?: string;
  nomineeStatus?: string;
  beneficiaries?: Array<Record<string, any>>;
  beneficiary1?: Record<string, any>;
  beneficiary2?: Record<string, any> | null;
  beneficiary3?: Record<string, any> | null;
  nominees?: Array<Record<string, any>>;
  nominee?: Record<string, any>;
  nominee2?: Record<string, any> | null;
  applicant?: Record<string, any>;
  consentForms?: Record<string, any>;
  invoice?: Record<string, any>;
  status?: string | number;
  statusText?: string;
  statusLabel?: string;
  statusDescription?: string;
  state?: string;
  createdAt?: string;
  createdOn?: string;
  createdDate?: string;
  created?: string;
  appliedDate?: string;
  agreementDate?: string;
  [key: string]: any;
}

export interface NicheApplicationRequest {
  nicheId: number;
  applicantName: string;
  applicantIDNo: string;
  nomineeName: string;
  nomineeIDNo: string;
  beneficiary1: Beneficiary;
  beneficiary2?: Beneficiary;
  beneficiary3?: Beneficiary;
  // Additional fields that might be needed
  applicantEmail?: string;
  applicantPhone?: string;
  applicantAddress?: string;
  applicantReligion?: string;
  contactStatus?: string;
  nomineeRelationship?: string;
  nomineeAddress?: string;
  nomineePhone?: string;
  nomineeEmail?: string;
  nomineeStatus?: string;
  beneficiaries?: Beneficiary[];
  nominees?: Nominee[];
  consentForms?: {
    firstBeneficiary?: string;
    secondBeneficiary?: string;
    twoBeneficiaries?: string;
  };
  nicheDetails?: {
    chapel?: string;
    chapelId?: number;
    chapelCode?: string;
    nicheCode?: string;
    nicheNumber?: string;
    wallName?: string;
    wallCode?: string;
    rowNumber?: string;
    rowLevel?: number;
  };
}

export interface NicheApplicationResponse {
  success: boolean;
  code: string;
  message: string;
  data?: RawNicheApplication;
}

export interface NicheApplicationListItem extends RawNicheApplication {
  applicationCode?: string;
  applicationNumber?: string;
  code?: string;
  applicantName?: string;
  applicant?: {
    name?: string;
  };
  chapelName?: string;
  chapel?: {
    name?: string;
  };
  nicheCode?: string;
  niche?: {
    code?: string;
    chapelName?: string;
  };
  nicheDetails?: {
    nicheCode?: string;
    chapel?: string;
  };
  status?: string | number;
  statusText?: string;
  statusLabel?: string;
  statusDescription?: string;
  applicationStatus?: string;
  state?: string;
  createdAt?: string;
  createdOn?: string;
  createdDate?: string;
  created?: string;
  appliedDate?: string;
  agreementDate?: string;
  [key: string]: any;
}

export interface NicheApplicationPagination {
  page: number;
  currentPage?: number;
  pageSize: number;
  total: number;
  totalPages: number;
  itemsRetrieved?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  remainingPages?: number;
  remainingRecords?: number;
  currentPageStart?: number;
  currentPageEnd?: number;
}

export interface NicheApplicationListResponse {
  success: boolean;
  message?: string;
  data: RawNicheApplication[];
  pagination?: NicheApplicationPagination;
  filters?: Record<string, any>;
}

export interface SearchNicheApplicationParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  search?: string;
  applicationCode?: string;
  applicantName?: string;
  nomineeName?: string;
  fromDate?: string;
  toDate?: string;
  status?: string | number | null;
  fetchAll?: boolean;
  skipTotal?: boolean; // Skip COUNT query for maximum performance on large datasets
}

// Niche Application Service
export const nicheApplicationService = {
  // Create new niche application
  createNicheApplication: async (applicationData: NicheApplicationRequest): Promise<NicheApplicationResponse> => {
    try {
      const response = await api.post('/api/niche-applications', applicationData);
      
      if (response.data.success) {
        return response.data;
      } else {
        throw new NicheApplicationError(response.data.message || 'Failed to create niche application');
      }
    } catch (error: any) {
      if (error instanceof NicheApplicationError) {
        throw error;
      }
      
      if (error.response?.status === 401) {
        throw new NicheApplicationError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 400) {
        throw new NicheApplicationError('Invalid application data', 'validation', 400);
      } else if (error.response?.status === 404) {
        throw new NicheApplicationError('Niche not found', 'validation', 404);
      } else if (error.response?.status === 409) {
        throw new NicheApplicationError('Niche already occupied', 'validation', 409);
      } else if (error.response?.status >= 500) {
        throw new NicheApplicationError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new NicheApplicationError('Network error - please check your connection', 'network');
      } else {
        throw new NicheApplicationError(error.response?.data?.message || 'Failed to create niche application');
      }
    }
  },

  searchNicheApplications: async (
    params: SearchNicheApplicationParams = {}
  ): Promise<NicheApplicationListResponse> => {
    const startTime = Date.now();
    let queryParams: Record<string, any> = {};
    
    try {
      // Check if any search filters are provided
      const hasSearchFilters = !!(
        params.searchTerm ||
        params.search ||
        params.applicationCode ||
        params.applicantName ||
        params.nomineeName ||
        params.fromDate ||
        params.toDate ||
        (params.status !== undefined && params.status !== null && params.status !== '')
      );

      // Determine if the caller is asking for paginated data
      const hasPaginationParams = params.page !== undefined || params.pageSize !== undefined;

      // Decide whether to use fetchAll or respect backend pagination:
      // - If fetchAll is explicitly provided, always respect it.
      // - If NOT provided and pagination params are present, force fetchAll=false so backend pagination works.
      // - If NOT provided and NO pagination params, keep previous behaviour:
      //   fetchAll=true for default search without filters, false when filters are present.
      const shouldFetchAll =
        params.fetchAll !== undefined
          ? params.fetchAll
          : hasPaginationParams
            ? false
            : !hasSearchFilters;

      queryParams = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        fetchAll: shouldFetchAll,
        search: params.searchTerm ?? params.search,
        applicationCode: params.applicationCode,
        applicantName: params.applicantName,
        nomineeName: params.nomineeName,
        fromDate: params.fromDate,
        toDate: params.toDate,
        status: params.status ?? undefined,
        skipTotal: params.skipTotal ?? undefined
      };

      // Log the parameters being sent to API for debugging
      console.log('[searchNicheApplications] Sending parameters to API:', queryParams);
      
      // Log date formats specifically for debugging
      if (queryParams.fromDate) {
        console.log('[searchNicheApplications] From Date format:', typeof queryParams.fromDate, queryParams.fromDate);
      }
      if (queryParams.toDate) {
        console.log('[searchNicheApplications] To Date format:', typeof queryParams.toDate, queryParams.toDate);
      }

      // Remove undefined, null, or empty string values (but keep fetchAll, page, pageSize, and skipTotal)
      Object.keys(queryParams).forEach(key => {
        const value = queryParams[key];
        if (key !== 'fetchAll' && key !== 'page' && key !== 'pageSize' && key !== 'skipTotal') {
          if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            delete queryParams[key];
          }
        }
      });

      // Use longer timeout for search requests (30 seconds) as they may take longer
      console.log('[searchNicheApplications] Starting API call', {
        url: '/api/niche-applications',
        params: queryParams,
        timeout: 30000
      });
      
      const response = await api.get('/api/niche-applications', { 
        params: queryParams,
        timeout: 30000 // 30 seconds for search requests
      });
      
      const duration = Date.now() - startTime;
      console.log('[searchNicheApplications] API call completed', {
        duration: `${duration}ms`,
        dataCount: response.data?.data?.length || 0,
        hasPagination: !!response.data?.pagination
      });
      const payload = response.data ?? {};
      const rawData = payload.data ?? payload.records ?? payload.items ?? payload.results;

      const data: NicheApplicationListItem[] = Array.isArray(rawData)
        ? rawData
        : rawData && Array.isArray(rawData.items)
          ? rawData.items
          : Array.isArray(payload)
            ? payload
            : rawData
              ? [rawData]
              : [];

      if (payload.success === false) {
        throw new NicheApplicationError(payload.message || 'Failed to fetch niche applications');
      }

      // Extract pagination data from API response
      const paginationData = payload.pagination || {};
      const fallbackPage = Number(params.page ?? 1);
      const currentPage = Number(paginationData.currentPage ?? paginationData.page ?? fallbackPage);
      const fallbackPageSize = Number(params.pageSize ?? 20);
      const pageSize = Number(paginationData.pageSize ?? fallbackPageSize);
      const itemsRetrieved = Number(paginationData.itemsRetrieved ?? data.length);
      
      // Handle total calculation - if skipTotal is true, total might not be available
      let total: number;
      if (params.skipTotal && paginationData.total === undefined && payload.total === undefined) {
        // When skipTotal is used and API doesn't provide total, we can't calculate it
        // Use a fallback that indicates unknown total
        total = paginationData.total ?? payload.total ?? 0;
      } else {
        total = Number(paginationData.total ?? payload.total ?? data.length ?? 0);
      }
      
      const totalPages = Number(
        paginationData.totalPages ?? payload.totalPages ?? (total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1)
      );

      // Calculate enhanced pagination fields
      const hasNextPage = paginationData.hasNextPage ?? (currentPage < totalPages);
      const hasPreviousPage = paginationData.hasPreviousPage ?? (currentPage > 1);
      const remainingPages = paginationData.remainingPages ?? Math.max(0, totalPages - currentPage);
      const remainingRecords = paginationData.remainingRecords ?? Math.max(0, total - (currentPage * pageSize));
      const currentPageStart = paginationData.currentPageStart ?? ((currentPage - 1) * pageSize + 1);
      const currentPageEnd = paginationData.currentPageEnd ?? Math.min(currentPage * pageSize, total);

      const pagination: NicheApplicationPagination | undefined = {
        page: currentPage,
        currentPage: currentPage,
        pageSize: pageSize,
        total: total,
        totalPages: totalPages,
        itemsRetrieved: itemsRetrieved,
        hasNextPage: hasNextPage,
        hasPreviousPage: hasPreviousPage,
        remainingPages: remainingPages,
        remainingRecords: remainingRecords,
        currentPageStart: currentPageStart,
        currentPageEnd: currentPageEnd
      };

      return {
        success: payload.success === undefined ? true : Boolean(payload.success),
        message: payload.message,
        data,
        pagination,
        filters: payload.filters
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.error('[searchNicheApplications] API call failed', {
        error: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        duration: `${duration}ms`,
        params: queryParams,
        isTimeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
        responseData: error.response?.data
      });
      
      if (error instanceof NicheApplicationError) {
        throw error;
      }

      const status = error.response?.status;
      let message = error.response?.data?.message || error.message || 'Failed to fetch niche applications';
      let type: 'auth' | 'network' | 'validation' | 'server' = 'server';

      // Handle timeout errors specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        type = 'network';
        message = `Request timeout - The search is taking longer than expected. This may be due to a large dataset or slow backend response. Please try again or contact support if the issue persists.`;
        console.error('[searchNicheApplications] Timeout detected - Backend may be slow or query is complex', {
          params: queryParams,
          timeout: 30000,
          duration: `${duration}ms`
        });
      } else if (status === 401) {
        type = 'auth';
      } else if (status === 400 || status === 404) {
        type = 'validation';
      } else if (!status && (error.code === 'NETWORK_ERROR' || !error.response)) {
        type = 'network';
        message = 'Network error - Please check your connection and try again.';
      }

      throw new NicheApplicationError(message, type, status);
    }
  },

  // Get niche application by code
  getNicheApplication: async (applicationCode: string): Promise<NicheApplicationResponse> => {
    try {
      const response = await api.get(`/api/niche-applications/${applicationCode}`);
      
      if (response.data.success) {
        return response.data;
      } else {
        throw new NicheApplicationError(response.data.message || 'Failed to retrieve niche application');
      }
    } catch (error: any) {
      if (error instanceof NicheApplicationError) {
        throw error;
      }
      
      if (error.response?.status === 401) {
        throw new NicheApplicationError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'NOT_FOUND' || errorCode === 'ACCESS_DENIED') {
          throw new NicheApplicationError(
            error.response?.data?.message || 'Application not found or access denied',
            'validation',
            404
          );
        }
        throw new NicheApplicationError('Application not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new NicheApplicationError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new NicheApplicationError('Network error - please check your connection', 'network');
      } else {
        throw new NicheApplicationError(error.response?.data?.message || 'Failed to retrieve niche application');
      }
    }
  },

  // Update niche application by code
  updateNicheApplication: async (applicationCode: string, applicationData: Partial<NicheApplicationRequest>): Promise<NicheApplicationResponse> => {
    try {
      const response = await api.put(`/api/niche-applications/${applicationCode}`, applicationData);
      
      if (response.data.success) {
        return response.data;
      } else {
        throw new NicheApplicationError(response.data.message || 'Failed to update niche application');
      }
    } catch (error: any) {
      if (error instanceof NicheApplicationError) {
        throw error;
      }
      
      if (error.response?.status === 401) {
        throw new NicheApplicationError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 400) {
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'VALIDATION_FAILED') {
          throw new NicheApplicationError(
            error.response?.data?.message || 'Validation failed',
            'validation',
            400
          );
        }
        throw new NicheApplicationError('Invalid application data', 'validation', 400);
      } else if (error.response?.status === 404) {
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'NOT_FOUND' || errorCode === 'ACCESS_DENIED') {
          throw new NicheApplicationError(
            error.response?.data?.message || 'Application not found or access denied',
            'validation',
            404
          );
        }
        throw new NicheApplicationError('Application not found', 'validation', 404);
      } else if (error.response?.status === 409) {
        throw new NicheApplicationError(
          error.response?.data?.message || 'Application cannot be modified (already Booked/Completed)',
          'validation',
          409
        );
      } else if (error.response?.status >= 500) {
        throw new NicheApplicationError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new NicheApplicationError('Network error - please check your connection', 'network');
      } else {
        throw new NicheApplicationError(error.response?.data?.message || 'Failed to update niche application');
      }
    }
  },

  // Delete niche application by code
  deleteNicheApplication: async (applicationCode: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.delete(`/api/niche-applications/${applicationCode}`);
      
      if (response.data.success) {
        return response.data;
      } else {
        throw new NicheApplicationError(response.data.message || 'Failed to delete niche application');
      }
    } catch (error: any) {
      if (error instanceof NicheApplicationError) {
        throw error;
      }
      
      if (error.response?.status === 401) {
        throw new NicheApplicationError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'NOT_FOUND' || errorCode === 'ACCESS_DENIED') {
          throw new NicheApplicationError(
            error.response?.data?.message || 'Application not found or access denied',
            'validation',
            404
          );
        }
        throw new NicheApplicationError('Application not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new NicheApplicationError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new NicheApplicationError('Network error - please check your connection', 'network');
      } else {
        throw new NicheApplicationError(error.response?.data?.message || 'Failed to delete niche application');
      }
    }
  },

  // Open PDF in new tab for niche application
  // First tries niche-agreements endpoint (which may work for NAPP codes), then falls back to client-side generation
  // If newWindow is provided, it will be used instead of opening a new one (to avoid popup blocking)
  openPdfInNewTab: async (applicationCode: string, type: 'invoice' | 'receipt' | 'agreement' = 'invoice', newWindow?: Window | null): Promise<void> => {
    try {
      if (!applicationCode || !applicationCode.trim()) {
        throw new NicheApplicationError('Application code is required for PDF generation', 'validation', 400);
      }

      const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://192.168.1.24:3000';
      
      // Helper function to check if error is a network error
      const isNetworkError = (error: any): boolean => {
        return !error.response || 
          error.code === 'ECONNABORTED' || 
          error.code === 'ERR_NETWORK' || 
          error.code === 'ETIMEDOUT' ||
          error.message === 'Network Error' ||
          error.message?.includes('timeout') ||
          error.message?.includes('Network') ||
          (error.request && !error.response);
      };

      // Retry helper function
      const retryApiCall = async (apiCall: () => Promise<any>, maxRetries = 2): Promise<any> => {
        let lastError: any = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            // Use longer timeout for PDF generation requests (30 seconds)
            return await apiCall();
          } catch (error: any) {
            lastError = error;
            
            // If it's a network error and we have retries left, wait and retry
            if (isNetworkError(error) && attempt < maxRetries) {
              const waitTime = (attempt + 1) * 1000; // Exponential backoff: 1s, 2s
              console.warn(`Network error on attempt ${attempt + 1}, retrying in ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            
            // If it's not a network error or we're out of retries, throw
            throw error;
          }
        }
        
        throw lastError;
      };

      // First, try to get the application data to check for crystal reports
      let appData: any = null;
      try {
        const appResponse = await retryApiCall(() => 
          api.get(`/api/niche-applications/${applicationCode.trim()}`, { timeout: 30000 })
        );
        
        if (appResponse.data?.success && appResponse.data?.data) {
          appData = appResponse.data.data;
          
          // Check if crystal reports are available
          if (appData.crystalReports) {
            let pdfUrl = '';
            
            switch (type) {
              case 'invoice':
                if (appData.crystalReports.invoiceReceipt?.reportPath) {
                  const params = new URLSearchParams(appData.crystalReports.invoiceReceipt.parameters);
                  pdfUrl = `${API_BASE}/api/reports/${appData.crystalReports.invoiceReceipt.reportName}?${params.toString()}`;
                } else if (appData.crystalReports.invoice?.reportPath) {
                  const params = new URLSearchParams(appData.crystalReports.invoice.parameters);
                  pdfUrl = `${API_BASE}/api/reports/${appData.crystalReports.invoice.reportName}?${params.toString()}`;
                }
                break;
              case 'receipt':
                if (appData.crystalReports.invoiceReceipt?.reportPath) {
                  const params = new URLSearchParams(appData.crystalReports.invoiceReceipt.parameters);
                  pdfUrl = `${API_BASE}/api/reports/${appData.crystalReports.invoiceReceipt.reportName}?${params.toString()}`;
                }
                break;
              case 'agreement':
                if (appData.crystalReports.agreement?.reportPath) {
                  const params = new URLSearchParams(appData.crystalReports.agreement.parameters);
                  pdfUrl = `${API_BASE}/api/reports/${appData.crystalReports.agreement.reportName}?${params.toString()}`;
                }
                break;
            }
            
            if (pdfUrl) {
              // Use provided window or open new one
              const targetWindow = newWindow || window.open(pdfUrl, '_blank', 'noopener,noreferrer');
              if (!targetWindow) {
                throw new NicheApplicationError('Popup blocked. Please allow popups for this site.', 'validation', 403);
              }
              // If we just opened the window (not provided), it already has the URL
              // If window was provided, load the URL in it
              if (newWindow) {
                targetWindow.location.href = pdfUrl;
              }
              console.log(`Opening ${type} PDF via crystal reports for application:`, applicationCode);
              return;
            }
          }
        }
      } catch (error: any) {
        // If getting application data fails, continue to fallback methods
        console.warn('Could not get application data for PDF generation, trying fallback methods:', error.message);
      }
      
      // Fallback 1: Try niche-agreements endpoint (may work for NAPP codes)
      let endpoint = '';
      switch (type) {
        case 'invoice':
          endpoint = `/api/niche-agreements/${applicationCode.trim()}/invoice-pdf`;
          break;
        case 'receipt':
          endpoint = `/api/niche-agreements/${applicationCode.trim()}/invoice-pdf`; // Receipt might use same endpoint
          break;
        case 'agreement':
          endpoint = `/api/niche-agreements/${applicationCode.trim()}/pdf`;
          break;
        default:
          endpoint = `/api/niche-agreements/${applicationCode.trim()}/invoice-pdf`;
      }

      // Try to open the PDF URL - if it fails, we'll catch and use client-side generation
      const pdfUrl = `${API_BASE}${endpoint}`;
      
      // Test if the endpoint exists by making a HEAD request
      try {
        await retryApiCall(() => api.head(endpoint, { timeout: 30000 }));
        // If HEAD succeeds, open the PDF
        // Use provided window or open new one
        const targetWindow = newWindow || window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        if (!targetWindow) {
          throw new NicheApplicationError('Popup blocked. Please allow popups for this site.', 'validation', 403);
        }
        // If window was provided, load the URL in it
        if (newWindow) {
          targetWindow.location.href = pdfUrl;
        }
        console.log(`Opening ${type} PDF via niche-agreements endpoint for application:`, applicationCode);
        return;
      } catch (headError: any) {
        // If HEAD fails, check if it's a network error or just 404
        // Network errors should fall back to client-side generation if we have appData
        // 404 errors should also fall back to client-side generation
        const isNetworkError = !headError.response || 
          headError.code === 'ECONNABORTED' || 
          headError.code === 'ERR_NETWORK' || 
          headError.message === 'Network Error' ||
          (headError.request && !headError.response);
        
        if (isNetworkError) {
          // Network error - if we have appData, continue to client-side generation
          // Otherwise, we'll try to get appData and if that also fails, throw network error
          console.warn('Network error checking PDF endpoint, will try client-side generation if data available');
        } else if (headError.response?.status === 404) {
          // Endpoint doesn't exist, fall back to client-side generation
          console.warn('PDF endpoint not available (404), using client-side generation');
        } else {
          // Other error (401, 500, etc.) - log and continue to client-side generation
          console.warn('PDF endpoint check failed, using client-side generation:', headError.message);
        }
      }
      
      // Fallback 2: Use client-side PDF generation
      // Import the invoice PDF service dynamically
      const { invoicePdfService } = await import('./invoicePdfService');
      
      // Get application data for PDF generation (if not already retrieved)
      if (!appData) {
        try {
          const appResponse = await retryApiCall(() => 
            api.get(`/api/niche-applications/${applicationCode.trim()}`, { timeout: 30000 })
          );
          if (!appResponse.data?.success || !appResponse.data?.data) {
            // Application not found
            throw new NicheApplicationError('Application not found. Please check the application number.', 'validation', 404);
          }
          appData = appResponse.data.data;
        } catch (error: any) {
          // Check if it's a network error (comprehensive check for axios network errors)
          const isNetworkError = !error.response || 
            error.code === 'ECONNABORTED' || 
            error.code === 'ERR_NETWORK' || 
            error.message === 'Network Error' ||
            (error.request && !error.response);
          
          if (isNetworkError) {
            throw new NicheApplicationError('Network error - please check your connection and try again', 'network');
          } else if (error.response?.status === 404) {
            throw new NicheApplicationError('Application not found. Please check the application number.', 'validation', 404);
          } else {
            throw new NicheApplicationError('Failed to retrieve application data for PDF generation', 'validation', error.response?.status || 500);
          }
        }
      }
      
      // Generate PDF using client-side service
      if (type === 'invoice' || type === 'receipt') {
        const pdfBlob = await invoicePdfService.generateInvoicePdfBlob({
          invoiceNo: appData.invoice?.invoiceNo || `INV-${applicationCode}`,
          invoiceDate: appData.invoice?.invoiceDate || new Date().toLocaleDateString(),
          dueDate: appData.invoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          applicationNumber: applicationCode,
          applicantName: appData.applicantName || appData.applicant?.name || '',
          applicantIDNo: appData.applicantIDNo || appData.applicant?.idNo || '',
          applicantEmail: appData.applicantEmail || appData.applicant?.email || '',
          applicantPhone: appData.applicantPhone || appData.applicant?.mobileNo || '',
          applicantAddress: appData.applicantAddress || appData.applicant?.address || '',
          nicheDetails: {
            nicheId: appData.nicheId || appData.nicheDetails?.nicheId || null,
            nicheCode: appData.nicheCode || appData.nicheDetails?.nicheCode || '',
            chapel: appData.chapel || appData.nicheDetails?.chapel || appData.chapelName || '',
            wallName: appData.wallName || appData.nicheDetails?.wallName || '',
            rowNumber: appData.rowNumber || appData.nicheDetails?.rowNumber || '',
            rowLevel: appData.rowLevel || appData.nicheDetails?.rowLevel || null
          },
          beneficiaries: (appData.beneficiaries || []).map((b: any) => ({
            name: b.name || b.fullName || '',
            relationship: b.relationshipToApplicant || b.relationship || '',
            nric: b.nric || b.idNo || ''
          })),
          nominees: (appData.nominees || [appData.nominee].filter(Boolean)).map((n: any) => ({
            name: n.name || n.fullName || '',
            nric: n.nric || n.idNo || '',
            relationship: n.relationship || ''
          })),
          pricing: {
            nicheAmount: appData.nicheDetails?.totalAmount || appData.invoice?.invoicePayingAmount || 0,
            serviceAmount: 300, // Updated service fee (Setting of tables + Sealing of niche: 20 + 20 = 40, but using 300 as per standard practice)
            taxAmount: appData.invoice?.taxAmount || 0,
            totalAmount: appData.invoice?.invoicePayingAmount || appData.nicheDetails?.totalAmount || 0
          }
        });
        
        // Use provided window or open new one (fallback for direct calls)
        const targetWindow = newWindow || window.open('', '_blank', 'noopener,noreferrer');
        
        if (!targetWindow) {
          throw new NicheApplicationError('Popup blocked. Please allow popups for this site to view the invoice.', 'validation', 403);
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
        
        // Create blob URL and load PDF in the window
        const pdfUrl = URL.createObjectURL(pdfBlob);
        targetWindow.location.href = pdfUrl;
        
        // Clean up the URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 60_000);
        
        console.log(`Opening ${type} PDF (client-side generated) in new tab for application:`, applicationCode);
      } else {
        // For agreement, we'll need to use a different approach or show a message
        throw new NicheApplicationError('Agreement PDF generation not yet implemented for niche applications', 'validation', 501);
      }
      
    } catch (error: any) {
      if (error instanceof NicheApplicationError) {
        throw error;
      }
      
      if (error.response?.status === 401) {
        throw new NicheApplicationError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new NicheApplicationError('Application not found or PDF endpoint not available', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new NicheApplicationError('Server error occurred', 'server', error.response.status);
      } else if (!error.response || 
                 error.code === 'ECONNABORTED' || 
                 error.code === 'ERR_NETWORK' || 
                 error.message === 'Network Error' ||
                 (error.request && !error.response)) {
        throw new NicheApplicationError('Network error - please check your connection', 'network');
      } else {
        throw new NicheApplicationError(error.response?.data?.message || error.message || 'Failed to open PDF');
      }
    }
  }
};

export default nicheApplicationService;
