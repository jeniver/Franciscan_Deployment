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

      return response.data.data || response.data;
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
};

export default invoiceService;

