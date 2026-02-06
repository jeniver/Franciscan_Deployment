import api from './api';

// Custom error class for invoice operations
export class InvoiceError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(message: string, type: 'auth' | 'network' | 'server' | 'validation' = 'server', statusCode?: number) {
    super(message);
    this.name = 'InvoiceError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Types for Invoice data
export interface InvoiceDetail {
  itemId: number;
  quantity: number;
  unitAmount: number;
  refDocNumber: string;
  refDocName: string;
  lineTaxPercent: number;
}

export interface CreateInvoiceRequest {
  paymentMode: string;
  details: InvoiceDetail[];
}

export interface CreateInvoiceResponse {
  success?: boolean;
  data?: {
    invoiceId?: number;
    invoiceCode?: string;
    invoiceNumber?: string;
  };
  message?: string;
}

// Invoice Service
export const invoiceService = {
  /**
   * Create an invoice
   * POST /api/invoices/:invoiceNumber
   * 
   * @param invoiceNumber - The invoice number (e.g., "4652-0")
   * @param data - Invoice creation data including paymentMode and details
   * @returns Created invoice data
   */
  createInvoice: async (
    invoiceNumber: string,
    data: CreateInvoiceRequest
  ): Promise<CreateInvoiceResponse['data']> => {
    try {
      if (!invoiceNumber) {
        throw new InvoiceError('Invoice number is required', 'validation');
      }

      if (!data.paymentMode) {
        throw new InvoiceError('Payment mode is required', 'validation');
      }

      if (!data.details || data.details.length === 0) {
        throw new InvoiceError('Invoice details are required', 'validation');
      }

      // Validate each detail item
      for (const detail of data.details) {
        if (!detail.itemId) {
          throw new InvoiceError('Item ID is required for all details', 'validation');
        }
        if (detail.quantity <= 0) {
          throw new InvoiceError('Quantity must be greater than 0', 'validation');
        }
        if (detail.unitAmount < 0) {
          throw new InvoiceError('Unit amount cannot be negative', 'validation');
        }
        if (!detail.refDocNumber) {
          throw new InvoiceError('Reference document number is required', 'validation');
        }
        if (!detail.refDocName) {
          throw new InvoiceError('Reference document name is required', 'validation');
        }
        if (detail.lineTaxPercent < 0 || detail.lineTaxPercent > 100) {
          throw new InvoiceError('Tax percent must be between 0 and 100', 'validation');
        }
      }

      const response = await api.post<CreateInvoiceResponse>(
        `/api/invoices/${encodeURIComponent(invoiceNumber)}`,
        data
      );

      // Handle different response formats
      if (response.data.success === false) {
        throw new InvoiceError(
          response.data.message || 'Failed to create invoice',
          'server',
          response.status
        );
      }

      return response.data.data || (response.data as CreateInvoiceResponse['data']);
    } catch (error: any) {
      if (error instanceof InvoiceError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401 || status === 403) {
          throw new InvoiceError(
            errorData?.message || 'Unauthorized access',
            'auth',
            status
          );
        } else if (status === 400) {
          throw new InvoiceError(
            errorData?.message || 'Invalid invoice data',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new InvoiceError('Server error occurred', 'server', status);
        } else {
          throw new InvoiceError(
            errorData?.message || 'Failed to create invoice',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new InvoiceError('Network error: Unable to connect to server', 'network');
      } else {
        throw new InvoiceError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  /**
   * Search invoices
   * GET /api/invoices/search
   * 
   * @param params - Search parameters
   * @returns List of invoices with pagination
   */
  searchInvoices: async (params: InvoiceSearchParams = {}): Promise<InvoiceListResponse> => {
    try {
      const queryParams: Record<string, any> = {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        sortBy: params.sortBy || 'TransactionDate',
        sortOrder: params.sortOrder || 'desc',
      };

      if (params.searchTerm) queryParams.searchTerm = params.searchTerm;
      if (params.fromDate) queryParams.fromDate = params.fromDate;
      if (params.toDate) queryParams.toDate = params.toDate;
      if (params.customerName) queryParams.customerName = params.customerName;
      if (params.invoiceCode) queryParams.invoiceCode = params.invoiceCode;
      if (params.paymentMode) queryParams.paymentMode = params.paymentMode;

      const response = await api.get('/api/invoices/search', { params: queryParams });
      const responseData = response.data ?? {};

      // Extract invoices from response (handle both nested and flat structures)
      const rawInvoices = responseData.invoices || responseData.data?.invoices || responseData.data || 
                         (Array.isArray(responseData) ? responseData : []);

      // Map backend invoice fields to frontend InvoiceListItem format
      const invoices: InvoiceListItem[] = Array.isArray(rawInvoices)
        ? rawInvoices.map((invoice: any) => ({
            invoiceId: invoice.InvoiceId || invoice.invoiceId || 0,
            invoiceCode: invoice.Code || invoice.InvoiceCode || invoice.invoiceCode || '',
            customerName: invoice.CustomerName || invoice.customerName || '',
            totalAmount: invoice.TotalAmount || invoice.totalAmount || 0,
            payingAmount: invoice.PayingAmount || invoice.payingAmount || 0,
            paymentMode: invoice.PaymentMode || invoice.paymentMode || '',
            invoiceDate: invoice.TransactionDate || invoice.InvoiceDate || invoice.invoiceDate || invoice.transactionDate || '',
            transactionDate: invoice.TransactionDate || invoice.transactionDate || invoice.InvoiceDate || invoice.invoiceDate || '',
            status: invoice.Status === 1 ? 'Active' : invoice.Status === 0 ? 'Inactive' : invoice.Status?.toString() || 'Active',
            applicationCode: invoice.RefDocNumber || invoice.refDocNumber || invoice.ApplicationCode || invoice.applicationCode || undefined,
          }))
        : [];

      // Extract pagination from response
      const pagination = responseData.pagination || responseData.data?.pagination || {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        total: invoices.length,
        totalPages: Math.ceil((invoices.length || 1) / (params.limit ?? 20)),
      };

      return {
        invoices,
        pagination,
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401 || status === 403) {
          throw new InvoiceError(
            errorData?.message || 'Unauthorized access',
            'auth',
            status
          );
        } else if (status >= 500) {
          throw new InvoiceError('Server error occurred', 'server', status);
        } else {
          throw new InvoiceError(
            errorData?.message || 'Failed to search invoices',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new InvoiceError('Network error: Unable to connect to server', 'network');
      } else {
        throw new InvoiceError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  /**
   * Get invoice or application by code
   * GET /api/invoices/:code
   * 
   * @param code - The invoice or application code (e.g., "1405-0", "I-5339-0", "INV-00123")
   * @returns Invoice or application data
   */
  getInvoiceByCode: async (code: string): Promise<any> => {
    try {
      if (!code) {
        throw new InvoiceError('Code is required', 'validation');
      }

      const response = await api.get(`/api/invoices/${encodeURIComponent(code)}`);

      // Handle different response formats
      if (response.data && typeof response.data === 'object') {
        if ('success' in response.data && response.data.success === false) {
          throw new InvoiceError(
            (response.data as any).message || 'Failed to fetch invoice/application',
            'server',
            response.status
          );
        }
        
        // Return the data directly or from nested structure
        return (response.data as any).data || response.data;
      }

      throw new InvoiceError('Invalid response format', 'server', response.status);
    } catch (error: any) {
      if (error instanceof InvoiceError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401 || status === 403) {
          throw new InvoiceError(
            errorData?.message || 'Unauthorized access',
            'auth',
            status
          );
        } else if (status === 400) {
          throw new InvoiceError(
            errorData?.message || 'Invalid code',
            'validation',
            status
          );
        } else if (status === 404) {
          throw new InvoiceError(
            errorData?.message || `Invoice/application not found: ${code}`,
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new InvoiceError('Server error occurred', 'server', status);
        } else {
          throw new InvoiceError(
            errorData?.message || 'Failed to fetch invoice/application',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new InvoiceError('Network error: Unable to connect to server', 'network');
      } else {
        throw new InvoiceError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  /**
   * Get all items linked to an application code
   * GET /api/invoices/application/:code
   * 
   * @param applicationCode - The application code (e.g., "1405-0")
   * @returns Application items with automatic calculations and references
   */
  getApplicationItems: async (applicationCode: string): Promise<ApplicationItemsResponse> => {
    try {
      if (!applicationCode) {
        throw new InvoiceError('Application code is required', 'validation');
      }

      const response = await api.get<ApplicationItemsResponse>(
        `/api/invoices/application/${encodeURIComponent(applicationCode)}`
      );

      // Handle different response formats
      if (response.data && typeof response.data === 'object') {
        if ('success' in response.data && response.data.success === false) {
          throw new InvoiceError(
            (response.data as any).message || 'Failed to fetch application items',
            'server',
            response.status
          );
        }
        
        // Return the data directly or from nested structure
        return (response.data as any).data || response.data;
      }

      throw new InvoiceError('Invalid response format', 'server', response.status);
    } catch (error: any) {
      if (error instanceof InvoiceError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401 || status === 403) {
          throw new InvoiceError(
            errorData?.message || 'Unauthorized access',
            'auth',
            status
          );
        } else if (status === 400) {
          throw new InvoiceError(
            errorData?.message || 'Invalid application code',
            'validation',
            status
          );
        } else if (status === 404) {
          throw new InvoiceError(
            errorData?.message || `No items found for application code: ${applicationCode}`,
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new InvoiceError('Server error occurred', 'server', status);
        } else {
          throw new InvoiceError(
            errorData?.message || 'Failed to fetch application items',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new InvoiceError('Network error: Unable to connect to server', 'network');
      } else {
        throw new InvoiceError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },
};

export interface InvoiceListItem {
  invoiceId: number;
  invoiceCode: string;
  customerName: string;
  totalAmount: number;
  payingAmount: number;
  paymentMode: string;
  invoiceDate: string;
  transactionDate: string;
  status?: string;
  applicationCode?: string;
}

export interface InvoiceListResponse {
  invoices: InvoiceListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InvoiceSearchParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  customerName?: string;
  invoiceCode?: string;
  paymentMode?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Application Items Types
export interface ApplicationItem {
  id: number;
  itemType: 'niche' | 'inscription';
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  reference?: string;
  refType?: string;
  itemId?: number;
  applicationCode?: string;
}

export interface ApplicationItemsResponse {
  applicationCode: string;
  items: ApplicationItem[];
  summary: {
    subtotal: number;
    totalTax: number;
    grandTotal: number;
    totalItems: number;
  };
  references: {
    NAPP: string[];
    INCR: string[];
    [key: string]: string[];
  };
  totalItems: number;
}

export interface ApplicationItemsError {
  message: string;
  status: number;
  code?: string;
}

export default invoiceService;

