import api from './api';
import { receiptPdfService } from './receiptPdfService';
import { paymentModeToLabel } from '../utils/paymentMode';

// Custom error class for receipt operations
export class ReceiptError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(message: string, type: 'auth' | 'network' | 'server' | 'validation' = 'server', statusCode?: number) {
    super(message);
    this.name = 'ReceiptError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Types for Receipt data
export interface Receipt {
  receiptId?: number;
  receiptCode: string;
  invoiceId?: number;
  invoiceCode?: string;
  applicationId?: number | string;
  applicationCode?: string;
  customerName: string;
  totalAmount: number;
  payingAmount: number;
  paymentMode: string;
  receiptDate?: string;
  createdAt?: string;
  updatedAt?: string;
  invoiceDetails?: InvoiceDetail[];
  customerAddress?: string;
  addressNo?: string;
  address?: string;
  address2?: string;
  addressCity?: string;
  districtCode?: string;
  country?: string;
  description?: string;
  invoice?: {
    code?: string;
  };
  paymentModeDocNo?: string;
}

export interface InvoiceDetail {
  invoiceDetailId?: number | null;
  invoiceId?: number | null;
  description?: string;
  quantity?: number;
  unitAmount?: number;
  payingAmount?: number;
  totalPayingAmount?: number;
  refDocNumber?: string;
  refDocName?: string;
  refType?: string;
  lineTotalAmount?: number;
  lineTaxPercent?: number;
  lineTaxAmount?: number;
  outstandingAmount?: number;

  // API Compatibility aliases
  RefDocNumber?: string;
  TotalPayingAmount?: number;
  itemName?: string;
  itemCode?: string;
  itemId?: number;
  UnitAmount?: number;
  Quantity?: number;
  LineTotalAmount?: number;
  LineTaxPercent?: number;
  LineTaxAmount?: number;
  PayingAmount?: number;
  unitPrice?: number;
  amount?: number;
  taxPercent?: number;
  itemPrice?: number;
}

export interface CreateReceiptRequest {
  invoiceId?: number;
  customerName: string;
  totalAmount: number;
  payingAmount: number;
  paymentMode: number | string;
  invoiceDetails?: InvoiceDetail[];
  churchId?: number;
  userId?: number;
}

export interface CreateReceiptFromInvoiceRequest {
  invoice: {
    invoiceId?: number;
    invoiceCode?: string;
    customerName: string;
    totalAmount: number;
    payingAmount: number;
    paymentMode: string;
  };
  invoiceDetails: InvoiceDetail[];
}

export interface CreateIndividualReceiptRequest {
  applicationCode: string;
  customerName?: string;
  payingAmount?: number;
  paymentMode?: string;
  paymentModeDocNo?: string;
  invoiceId?: number;
  invoiceCode?: string;
  receiptDetails?: any[];
  addressNo?: string;
  address?: string;
  address2?: string;
  addressCity?: string;
  districtCode?: string;
  country?: string;
}

export interface Invoice {
  invoiceId: number;
  invoiceCode: string;
  customerName: string;
  totalAmount: number;
  payingAmount: number;
  paymentMode: string;
  invoiceDate?: string;
  invoiceDetails?: InvoiceDetail[];
  // Additional fields from API response
  addressNo?: string;
  address?: string;
  address2?: string;
  addressCity?: string;
  country?: string;
  taxAmount?: number;
  taxCode?: string;
  taxPercentage?: number;
  refDocNumber?: string;
  districtCode?: string;
  paymentModeDocNo?: string;
}

export interface ReceiptItem {
  itemId?: number;
  itemName: string;
  description?: string;
  unitPrice?: number;
  defaultAmount?: number;
  taxPercent?: number;
  category?: string;
  isActive?: boolean;
  code?: string;
  churchId?: number;
  isRefType?: boolean;
  docType?: string;
}

export interface ReceiptItemsResponse {
  success?: boolean;
  data?: ReceiptItem[];
  items?: ReceiptItem[];
  message?: string;
}

export interface ReceiptReportTransaction {
  TransactionDate: string;
  Code: string;
  CustomerName: string;
  TotalAmount: number;
  PaymentModeDocNo: string;
  PaymentMode: string;
  RefDocNumber: string;
  RefDocName: string;
  Item: string;
  Total: number;
  Status: string;
  InvoiceCode?: string;
  Tot_Niche: number;
  Tot_Wapp: number;
  Tot_Goa: number;
  Tot_Incr: number;
  Tot_Donation: number;
  Tot_Urn: number;
  Tot_Marble: number;
  Tot_Others: number;
  Total_val: number;
  CustomerAddress?: string;
  customerAddress?: string;
  address?: string;
}

export interface ReceiptReport {
  success: boolean;
  data: {
    data: ReceiptReportTransaction[];
  };
}

export interface MonthlyList {
  receipts: Receipt[];
  totalAmount: number;
  totalCount: number;
}

export interface ReceiptSummary {
  totalTransactions: number;
  totalValue: number;
  totalNiche: number;
  totalWapp: number;
  totalGoa: number;
  totalInscription: number;
  totalDonation: number;
  totalUrn: number;
  totalMarble: number;
  totalOthers: number;
}

export interface ReceiptListResponse {
  receipts: Receipt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: ReceiptSummary | null;
}

export interface ReceiptQueryParams {
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
  paymentMode?: string | null;
  applicationId?: string;
  invoiceId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  bypassCache?: boolean;
}

export interface ReceiptSearchParams {
  receiptCode?: string;
  customerName?: string;
  invoiceCode?: string;
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  bypassCache?: boolean;
}

export interface LastReceiptNumberResponse {
  lastNumber: string;
}

// Receipt Service
export const receiptService = {
  // Get receipt by code
  getReceiptByCode: async (code: string, applicationCode?: string): Promise<Receipt> => {
    try {
      if (!code) {
        throw new ReceiptError('Receipt code is required', 'validation');
      }

      const trimmedCode = code.trim();
      const url = applicationCode
        ? `/api/receipts/${trimmedCode}?applicationCode=${applicationCode}`
        : `/api/receipts/${trimmedCode}`;
      const response = await api.get(url);

      // Unwrap response: API returns { success: true, data: { ... } }
      const responseData = response.data;
      const data = (responseData && responseData.success && responseData.data) ? responseData.data : responseData;

      if (!data) {
        throw new ReceiptError('Receipt not found', 'validation', 404);
      }

      const paymentModeToString = (mode: any) => {
        return paymentModeToLabel(mode);
      };

      // Map backend fields to frontend interface
      return {
        ...data,
        receiptCode: data.code || data.receiptCode || data.ReceiptCode,
        invoiceCode: data.invoice?.code || data.invoiceCode || data.InvoiceCode,
        customerName: data.customerName || data.CustomerName || data.payeeName || data.PayeeName,
        totalAmount: data.totalAmount || data.TotalAmount || 0,
        payingAmount: data.payingAmount || data.PayingAmount || 0,
        paymentMode: paymentModeToString(data.paymentMode || data.PaymentMode),
        receiptDate: data.transactionDate || data.receiptDate || data.ReceiptDate || data.createdAt,
        invoiceDetails: data.invoiceDetails || data.details || [],
        // Ensure invoice object has code if needed
        invoice: data.invoice ? {
          ...data.invoice,
          code: data.invoice.code || data.invoice.invoiceCode || data.invoice.Code
        } : undefined
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 404) {
          throw new ReceiptError('Receipt not found', 'validation', status);
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch receipt',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Create receipt
  createReceipt: async (data: CreateReceiptRequest): Promise<Receipt> => {
    try {
      if (!data.customerName || !data.totalAmount || !data.payingAmount || !data.paymentMode) {
        throw new ReceiptError('Missing required fields', 'validation');
      }

      const normalizedPaymentMode =
        typeof data.paymentMode === 'number'
          ? data.paymentMode
          : /^\d+$/.test(data.paymentMode)
            ? Number(data.paymentMode)
            : data.paymentMode;

      const payload: CreateReceiptRequest = {
        ...data,
        paymentMode: normalizedPaymentMode,
      };

      const response = await api.post('/api/receipts', payload);
      const responseData = response.data;
      return (responseData && responseData.success && responseData.data) ? responseData.data : responseData;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReceiptError(
            error.response.data?.message || 'Invalid receipt data',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to create receipt',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Create receipt from invoice
  createReceiptFromInvoice: async (data: CreateReceiptFromInvoiceRequest): Promise<Receipt> => {
    try {
      if (!data.invoice || !data.invoiceDetails) {
        throw new ReceiptError('Missing required invoice data', 'validation');
      }

      const response = await api.post('/api/receipts/from-invoice', data);
      const responseData = response.data;
      return (responseData && responseData.success && responseData.data) ? responseData.data : responseData;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReceiptError(
            error.response.data?.message || 'Invalid invoice data',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to create receipt from invoice',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Create individual receipt
  createIndividualReceipt: async (data: CreateIndividualReceiptRequest): Promise<Receipt> => {
    try {
      // Validation removed to allow standalone receipts (e.g. Others / Miscellaneous)
      // if (!data.applicationCode) {
      //   throw new ReceiptError('Application code is required', 'validation');
      // }

      const response = await api.post('/api/receipts/individual', data);

      const responseData = response.data;
      const dataResult = (responseData && responseData.success && responseData.data) ? responseData.data : responseData;

      return dataResult;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 404) {
          throw new ReceiptError('Application not found', 'validation', status);
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          const msg = error.response.data?.error ?? error.response.data?.message ?? error.response.data?.error?.message ?? 'Failed to create individual receipt';
          throw new ReceiptError(
            typeof msg === 'string' ? msg : 'Failed to create individual receipt',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get last receipt number
  getLastReceiptNumber: async (): Promise<string> => {
    try {
      const response = await api.get('/api/receipts/last-number');
      const data = response.data;

      // Handle different response formats
      if (typeof data === 'string') {
        return data;
      }
      if (typeof data === 'object' && data !== null) {
        // Handle {lastNumber: "12345"} format
        if ('lastNumber' in data && typeof data.lastNumber === 'string') {
          return data.lastNumber;
        }
        // Handle {success: true, data: "12345"} format
        if ('data' in data && typeof data.data === 'string') {
          return data.data;
        }
        // Handle {success: true, data: {lastNumber: "12345"}} format
        if ('data' in data && typeof data.data === 'object' && data.data?.lastNumber) {
          return String(data.data.lastNumber);
        }
        // Handle {success: true, data: {lastReceiptNumber: "003682"}} format
        if ('data' in data && typeof data.data === 'object' && data.data?.lastReceiptNumber) {
          return String(data.data.lastReceiptNumber);
        }
        // If data itself is a number, convert to string
        if ('lastNumber' in data && (typeof data.lastNumber === 'number')) {
          return String(data.lastNumber);
        }
      }
      // Fallback: convert to string
      return String(data);
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch last receipt number',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get last misc receipt number
  getLastMiscReceiptNumber: async (): Promise<string> => {
    try {
      const response = await api.get('/api/receipts/last-misc-number');
      const data = response.data;

      // Handle { success: true, data: "..." } or { lastNumber: "..." } or direct string
      if (typeof data === 'string') return data;
      if (data && typeof data === 'object') {
        if (data.success && data.data && typeof data.data === 'string') return data.data;
        if (data.lastNumber) return String(data.lastNumber);
        if (data.data) return String(data.data);
      }
      return String(data || '');
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch last misc receipt number',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get receipt report
  getReceiptReport: async (fromDate: string, toDate: string): Promise<ReceiptReport> => {
    try {
      if (!fromDate || !toDate) {
        throw new ReceiptError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/receipts/report', {
        params: { fromDate, toDate },
      });

      // API returns: { success: true, data: { data: [...] } }
      // axios response.data contains the actual response body
      const responseData = response.data;

      // If response has the expected structure with success and nested data
      if (responseData && responseData.success && responseData.data) {
        // Check if data.data is an array (the actual transaction list)
        if (responseData.data.data && Array.isArray(responseData.data.data)) {
          return responseData;
        }
        // If data itself is an array, wrap it properly
        if (Array.isArray(responseData.data)) {
          return {
            success: true,
            data: {
              data: responseData.data
            }
          };
        }
        // Return as-is if structure is correct
        return responseData;
      }

      // If response.data is directly an array, wrap it
      if (Array.isArray(responseData)) {
        return {
          success: true,
          data: {
            data: responseData
          }
        };
      }

      // Return as-is if it has success property (might be different structure)
      if (responseData && responseData.success !== undefined) {
        return responseData;
      }

      // Fallback: return empty structure
      return {
        success: true,
        data: {
          data: []
        }
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReceiptError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch receipt report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get GOA monthly list
  getGOAMonthlyList: async (fromDate: string, toDate: string): Promise<MonthlyList> => {
    try {
      if (!fromDate || !toDate) {
        throw new ReceiptError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/receipts/goa-monthly', {
        params: { fromDate, toDate },
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReceiptError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch GOA monthly list',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get inscription monthly list
  getInscriptionMonthlyList: async (fromDate: string, toDate: string): Promise<MonthlyList> => {
    try {
      if (!fromDate || !toDate) {
        throw new ReceiptError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/receipts/inscription-monthly', {
        params: { fromDate, toDate },
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReceiptError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch inscription monthly list',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get wake room monthly list
  getWakeRoomMonthlyList: async (fromDate: string, toDate: string): Promise<MonthlyList> => {
    try {
      if (!fromDate || !toDate) {
        throw new ReceiptError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/receipts/wake-room-monthly', {
        params: { fromDate, toDate },
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReceiptError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch wake room monthly list',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get receipts by date range (report endpoint with pagination & filters)
  getReceiptsByDateRange: async ({
    fromDate,
    toDate,
    page = 1,
    limit = 50,
    searchTerm,
    paymentMode,
    applicationId,
    invoiceId,
    sortBy = 'TransactionDate',
    sortOrder = 'desc',
    bypassCache = false,
  }: ReceiptQueryParams = {}): Promise<ReceiptListResponse> => {
    try {
      const params: Record<string, any> = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (searchTerm) params.search = searchTerm;
      if (paymentMode) params.paymentMode = paymentMode;
      if (applicationId) params.applicationId = applicationId;
      if (invoiceId) params.invoiceId = invoiceId;

      if (bypassCache) {
        params._t = Date.now();
      }

      const response = await api.get('/api/receipts/report', {
        params,
        headers: bypassCache ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } : {}
      });
      const responseData = response.data;

      const transactions: ReceiptReportTransaction[] = (() => {
        if (Array.isArray(responseData?.data?.items)) {
          return responseData.data.items;
        }
        if (Array.isArray(responseData?.data?.data)) {
          return responseData.data.data;
        }
        if (Array.isArray(responseData?.data)) {
          return responseData.data;
        }
        if (Array.isArray(responseData)) {
          return responseData;
        }
        return [];
      })();

      // Group transactions by receipt code to avoid duplicates
      // One receipt can have multiple transaction items (line items)
      const receiptMap = new Map<string, {
        receiptCode: string;
        customerName: string;
        totalAmount: number;
        payingAmount: number;
        paymentMode: string;
        receiptDate: string;
        invoiceCode: string;
        applicationCode?: string;
        applicationId?: string;
        transactionCount: number;
        customerAddress?: string;
      }>();

      transactions.forEach((transaction) => {
        const receiptCode = transaction.Code || '';
        if (!receiptCode) return;

        const existing = receiptMap.get(receiptCode);
        const transactionTotal = typeof transaction.Total === 'number'
          ? transaction.Total
          : typeof transaction.TotalAmount === 'number'
            ? transaction.TotalAmount
            : 0;

        if (existing) {
          // Aggregate totals for duplicate receipt codes
          existing.totalAmount += transactionTotal;
          existing.payingAmount += transactionTotal;
          existing.transactionCount += 1;
          // Keep the most recent invoice code if multiple exist
          if (transaction.RefDocNumber) {
            existing.applicationId = transaction.RefDocNumber;
          }
          if (transaction.RefDocName) {
            existing.applicationCode = transaction.RefDocName;
          }
          if (transaction.InvoiceCode) {
            existing.invoiceCode = transaction.InvoiceCode;
          }
        } else {
          // Create new receipt entry
          receiptMap.set(receiptCode, {
            receiptCode,
            customerName: transaction.CustomerName || 'Unknown Customer',
            totalAmount: transactionTotal,
            payingAmount: transactionTotal,
            paymentMode: transaction.PaymentMode || 'N/A',
            receiptDate: transaction.TransactionDate || '',
            invoiceCode: transaction.InvoiceCode || '',
            applicationId: transaction.RefDocNumber,
            applicationCode: transaction.RefDocName,
            transactionCount: 1,
            customerAddress: transaction.CustomerAddress || transaction.customerAddress || transaction.address,
          });
        }
      });

      // Convert map to array of Receipt objects
      const receipts: Receipt[] = Array.from(receiptMap.values()).map((receiptData, index) => ({
        receiptId: index,
        receiptCode: receiptData.receiptCode,
        customerName: receiptData.customerName,
        totalAmount: receiptData.totalAmount,
        payingAmount: receiptData.payingAmount,
        paymentMode: receiptData.paymentMode,
        receiptDate: receiptData.receiptDate,
        invoiceCode: receiptData.invoiceCode || undefined,
        invoiceId: undefined,
        invoiceDetails: undefined,
        applicationId: receiptData.applicationId,
        applicationCode: receiptData.applicationCode,
        customerAddress: receiptData.customerAddress,
        address: receiptData.customerAddress,
      }));

      const paginationSource =
        responseData?.data?.pagination ||
        responseData?.pagination || {
          total: responseData?.total,
          page: responseData?.page,
          limit: responseData?.limit,
          totalPages: responseData?.totalPages,
        };

      const totalRecords =
        paginationSource?.total ??
        paginationSource?.totalRecords ??
        paginationSource?.count ??
        transactions.length;

      const resolvedLimit =
        paginationSource?.limit ?? paginationSource?.pageSize ?? paginationSource?.perPage ?? limit;

      const resolvedPage =
        paginationSource?.page ??
        paginationSource?.currentPage ??
        paginationSource?.pageNumber ??
        page;

      const resolvedTotalPages =
        paginationSource?.totalPages ??
        paginationSource?.pages ??
        (resolvedLimit ? Math.max(1, Math.ceil(totalRecords / resolvedLimit)) : 1);

      const extractNumericValue = (source: any, keys: string[]): number => {
        for (const key of keys) {
          if (source && typeof source[key] === 'number') return source[key];
          if (source && typeof source[key] === 'string') {
            const parsed = Number(source[key]);
            if (!Number.isNaN(parsed)) return parsed;
          }
        }
        return 0;
      };

      const summarySource =
        responseData?.data?.summary ||
        responseData?.summary ||
        (Array.isArray(transactions) && transactions.length > 0 ? transactions[0] : null);

      const summary: ReceiptSummary | null = summarySource
        ? {
          totalTransactions:
            extractNumericValue(responseData?.data, ['totalTransactions']) ||
            extractNumericValue(responseData, ['totalTransactions']) ||
            totalRecords ||
            transactions.length,
          totalValue: extractNumericValue(summarySource, ['Total_val', 'totalValue', 'TotalValue']),
          totalNiche: extractNumericValue(summarySource, ['Tot_Niche', 'totalNiche']),
          totalWapp: extractNumericValue(summarySource, ['Tot_Wapp', 'totalWapp']),
          totalGoa: extractNumericValue(summarySource, ['Tot_Goa', 'totalGoa']),
          totalInscription: extractNumericValue(summarySource, ['Tot_Incr', 'totalInscription']),
          totalDonation: extractNumericValue(summarySource, ['Tot_Donation', 'totalDonation']),
          totalUrn: extractNumericValue(summarySource, ['Tot_Urn', 'totalUrn']),
          totalMarble: extractNumericValue(summarySource, ['Tot_Marble', 'totalMarble']),
          totalOthers: extractNumericValue(summarySource, ['Tot_Others', 'totalOthers']),
        }
        : null;

      return {
        receipts,
        total: totalRecords,
        page: resolvedPage,
        limit: resolvedLimit,
        totalPages: resolvedTotalPages,
        summary,
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch receipts',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Search receipts using flexible filters (receipt code, customer name, invoice code, free text)
  searchReceipts: async (params: ReceiptSearchParams = {}): Promise<ReceiptListResponse> => {
    try {
      const {
        receiptCode,
        customerName,
        invoiceCode,
        query,
        page = 1,
        limit = 20,
        sortBy = 'r.TransactionDate',
        sortOrder = 'desc',
      } = params;

      const queryParams: Record<string, any> = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      if (receiptCode) queryParams.receiptCode = receiptCode;
      if (customerName) queryParams.customerName = customerName;
      if (invoiceCode) queryParams.invoiceCode = invoiceCode;
      if (query) queryParams.query = query;

      if (params.bypassCache) {
        queryParams._t = Date.now();
      }

      const response = await api.get('/api/receipts/search', {
        params: queryParams,
        headers: params.bypassCache ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } : {}
      });
      const responseData = response.data;

      const items =
        responseData?.data?.items ||
        responseData?.data?.data ||
        responseData?.items ||
        responseData?.data ||
        responseData?.results ||
        (Array.isArray(responseData) ? responseData : []);

      const receipts: Receipt[] = Array.isArray(items)
        ? items.map((item, index) => {
          const derivedTotal =
            item.totalAmount ??
            item.TotalAmount ??
            item.total ??
            item.Total ??
            item.payingAmount ??
            item.PayingAmount ??
            0;

          return {
            receiptId: item.receiptId ?? item.id ?? index,
            receiptCode:
              item.receiptCode ||
              item.code ||
              item.ReceiptCode ||
              item.Code ||
              item.invoiceNo ||
              '',
            invoiceId: item.invoiceId ?? item.InvoiceId,
            invoiceCode:
              item.invoiceCode ||
              item.InvoiceCode ||
              item.invoiceNo ||
              '',
            customerName: item.customerName || item.CustomerName || 'Unknown Customer',
            totalAmount: derivedTotal,
            payingAmount:
              item.payingAmount ?? item.PayingAmount ?? item.total ?? item.Total ?? derivedTotal,
            paymentMode: item.paymentMode || item.PaymentMode || 'N/A',
            receiptDate:
              item.receiptDate ||
              item.ReceiptDate ||
              item.transactionDate ||
              item.TransactionDate ||
              item.createdAt ||
              '',
            applicationCode: item.applicationCode || item.ApplicationCode || item.RefDocName || '',
            applicationId: item.applicationId || item.ApplicationId,
            addressNo: item.addressNo || item.AddressNo,
            address: item.address || item.Address,
            address2: item.address2 || item.Address2,
            addressCity: item.addressCity || item.AddressCity,
            country: item.country || item.Country,
            invoiceDetails: item.details || item.invoiceDetails,
          };
        })
        : [];

      const paginationSource =
        responseData?.data?.pagination ||
        responseData?.pagination ||
        responseData?.metadata || {
          total: responseData?.total,
          page: responseData?.page,
          limit: responseData?.limit,
          totalPages: responseData?.totalPages,
        };

      const totalRecords =
        paginationSource?.total ??
        paginationSource?.totalRecords ??
        paginationSource?.count ??
        responseData?.data?.total ??
        receipts.length;

      const resolvedLimit =
        paginationSource?.limit ??
        paginationSource?.pageSize ??
        paginationSource?.perPage ??
        limit;

      const resolvedPage =
        paginationSource?.page ??
        paginationSource?.currentPage ??
        paginationSource?.pageNumber ??
        page;

      const resolvedTotalPages =
        paginationSource?.totalPages ??
        paginationSource?.pages ??
        (resolvedLimit ? Math.max(1, Math.ceil(totalRecords / resolvedLimit)) : 1);

      const summary: ReceiptSummary | null =
        responseData?.summary || responseData?.data?.summary || null;

      return {
        receipts,
        total: totalRecords,
        page: resolvedPage,
        limit: resolvedLimit,
        totalPages: resolvedTotalPages,
        summary,
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReceiptError(
            error.response.data?.message || 'Invalid search parameters',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to search receipts',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get invoice by code
  getInvoiceByCode: async (code: string): Promise<Invoice> => {
    try {
      if (!code) {
        throw new ReceiptError('Invoice code is required', 'validation');
      }

      const trimmedCode = code.trim();
      console.log('[ReceiptService] Fetching invoice data for code:', trimmedCode);

      const response = await api.get(`/api/invoices/${trimmedCode}`);
      console.log('[ReceiptService] API response:', response.data);

      // Handle response structure: {success: true, data: {...}}
      let invoiceData;
      if (response.data && response.data.success && response.data.data) {
        invoiceData = response.data.data;
      } else if (response.data && response.data.InvoiceId) {
        // Handle direct data object
        invoiceData = response.data;
      } else {
        invoiceData = response.data;
      }

      console.log('[ReceiptService] Processed invoice data:', invoiceData);

      // Enhanced mapping to handle all API response fields properly
      const invoice: Invoice = {
        invoiceId: invoiceData.InvoiceId || invoiceData.invoiceId || invoiceData.invoiceId || 0,
        invoiceCode: invoiceData.Code || invoiceData.code || invoiceData.invoiceCode || trimmedCode,
        customerName: invoiceData.CustomerName || invoiceData.customerName || invoiceData.payeeName || '',
        totalAmount: invoiceData.TotalAmount || invoiceData.totalAmount || invoiceData.totalAmount || 0,
        payingAmount: invoiceData.PayingAmount || invoiceData.payingAmount || invoiceData.payingAmount || 0,
        paymentMode: invoiceData.PaymentMode || invoiceData.paymentMode || 'Cash',
        invoiceDate: invoiceData.TransactionDate || invoiceData.transactionDate || invoiceData.invoiceDate || new Date().toISOString(),
        invoiceDetails: (invoiceData.details || invoiceData.invoiceDetails || []).map((detail: any) => ({
          invoiceDetailId: detail.InvoiceDetailId || detail.invoiceDetailId || detail.invoiceDetailId,
          description: detail.Item || detail.description || detail.ItemName || detail.itemName || detail.itemName || '',
          quantity: detail.Quantity || detail.quantity || detail.quantity || 1,
          unitPrice: detail.UnitAmount || detail.unitPrice || detail.UnitPrice || detail.unitAmount || detail.itemPrice || 0,
          amount: detail.TotalPayingAmount || detail.totalPayingAmount || detail.amount || detail.TotalPayingAmount || 0,
          // Preserve additional fields for component mapping
          RefDocNumber: detail.RefDocNumber || detail.refDocNumber || detail.refDocNumber || '',
          TotalPayingAmount: detail.TotalPayingAmount || detail.totalPayingAmount || detail.totalPayingAmount || detail.amount || 0,
          // New fields from API
          itemName: detail.ItemName || detail.itemName || detail.Item || detail.description || detail.itemName || '',
          itemCode: detail.ItemCode || detail.itemCode || detail.Code || detail.itemCode || '',
          itemId: detail.ItemId || detail.itemId || detail.itemId || 0,
          payingAmount: detail.PayingAmount || detail.payingAmount || detail.payingAmount || detail.unitPrice || detail.UnitAmount || 0,
          lineTaxPercent: detail.LineTaxPercent || detail.lineTaxPercent || detail.TaxPercent || detail.taxPercent || detail.lineTaxPercent || 9,
          lineTaxAmount: detail.LineTaxAmount || detail.lineTaxAmount || detail.TaxAmount || detail.taxAmount || detail.lineTaxAmount || 0,
          lineTotalAmount: detail.LineTotalAmount || detail.lineTotalAmount || detail.lineTotalAmount || detail.unitPrice || detail.UnitAmount || 0,
          refDocName: detail.RefDocName || detail.refDocName || detail.refDocName || '',
          refType: detail.RefType || detail.refType || detail.refType || '',
          outstandingAmount: detail.OutstandingAmount || detail.outstandingAmount || detail.outstandingAmount || 0
        }))
      };

      // Add additional fields that might be useful
      (invoice as any).addressNo = invoiceData.addressNo || invoiceData.addressNo;
      (invoice as any).address = invoiceData.address || invoiceData.address;
      (invoice as any).address2 = invoiceData.address2 || invoiceData.address2;
      (invoice as any).addressCity = invoiceData.addressCity || invoiceData.addressCity;
      (invoice as any).country = invoiceData.country || invoiceData.country;
      (invoice as any).taxAmount = invoiceData.taxAmount || invoiceData.taxAmount;
      (invoice as any).taxCode = invoiceData.taxCode || invoiceData.taxCode;
      (invoice as any).taxPercentage = invoiceData.taxPercentage || invoiceData.taxPercentage;

      console.log('[ReceiptService] Final mapped invoice:', invoice);

      return invoice;
    } catch (error: any) {
      console.error('[ReceiptService] Error fetching invoice:', error);
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 404) {
          throw new ReceiptError('Invoice not found', 'validation', status);
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch invoice',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get receipt PDF link - opens PDF in new tab
  // Backend automatically handles fallback mechanism (tries multiple variations):
  // 1. Try: Code='053130' AND ChurchId=1 (exact match with churchId from JWT token)
  // 2. Try: UPPER(Code)='053130' AND ChurchId=1 (case-insensitive match with churchId)
  // 3. Fallback: Code='053130' (exact match without churchId)
  // The backend will return the PDF if found in any of these attempts
  // New API: /api/receipts/{code}/pdf?data=true (with optional applicationCode parameter)
  getReceiptPdfLink: async (code: string, openInNewTab: boolean = true, applicationCode?: string): Promise<string> => {
    try {
      if (!code) {
        throw new ReceiptError('Receipt code is required', 'validation');
      }

      // Build query parameters
      const params: Record<string, string> = {
        data: 'true',
      };

      // Add application code if provided
      if (applicationCode && applicationCode.trim()) {
        params.applicationCode = applicationCode.trim();
      }

      // Backend fallback mechanism (automatic):
      // - ChurchId is extracted from JWT token in Authorization header
      // - Backend tries: exact match with churchId → case-insensitive with churchId → exact without churchId
      // API format: GET /api/receipts/{code}/pdf?data=true
      // Headers: Authorization: Bearer <token>, Content-Type: application/json
      const response = await api.get(`/api/receipts/${code.trim()}/pdf`, {
        params,
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = (response.headers?.['content-type'] || '').toLowerCase();
      const isJsonBlob =
        response.data instanceof Blob &&
        (contentType.includes('application/json') || contentType.includes('text/json'));

      if (isJsonBlob) {
        const jsonPayload = JSON.parse(await response.data.text());
        if (jsonPayload?.success && jsonPayload?.data) {
          // For RECEIPT endpoint, always use the receipt layout
          const pdfBlob = await receiptPdfService.generateReceiptPdf(jsonPayload.data, {
            requestedCode: code,
            applicationCode,
          });
          const pdfUrl = URL.createObjectURL(pdfBlob);

          if (openInNewTab) {
            const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
            if (!newWindow) {
              URL.revokeObjectURL(pdfUrl);
              throw new ReceiptError('Popup blocked. Please allow popups for this site.', 'validation', 403);
            }
          }

          setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
          return pdfUrl;
        }
        throw new ReceiptError('Invalid receipt response format', 'server');
      }

      // Check if response is a blob (PDF file) or a string (URL)
      if (response.data instanceof Blob) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        if (openInNewTab) {
          window.open(url, '_blank');
        }

        return url;
      } else if (typeof response.data === 'string') {
        // If API returns a URL string, use it directly
        if (openInNewTab) {
          window.open(response.data, '_blank');
        }
        return response.data;
      } else if (response.data?.success && response.data?.data) {
        // API returned JSON data containing receipt/invoice details - generate PDF on the fly
        // Open window immediately to avoid popup blocking (before PDF generation)
        const newWindow = openInNewTab ? window.open('', '_blank', 'noopener,noreferrer') : null;

        if (openInNewTab && !newWindow) {
          throw new ReceiptError('Popup blocked. Please allow popups for this site to view the receipt.', 'validation', 403);
        }

        // Show loading message in the new window
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head><title>Loading Receipt PDF...</title></head>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2>Generating Receipt PDF...</h2>
                <p>Please wait while the PDF is being prepared.</p>
              </body>
            </html>
          `);
          newWindow.document.close();
        }

        const pdfBlob = await receiptPdfService.generateReceiptPdf(response.data.data, {
          requestedCode: code,
          applicationCode,
        });
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Load PDF in the already-opened window
        if (newWindow) {
          newWindow.location.href = pdfUrl;
        }

        // Clean up after some time to avoid memory leaks
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
        return pdfUrl;
      } else {
        // Try to extract URL from response data
        const pdfUrl = response.data?.url || response.data?.pdfUrl || response.data?.link;
        if (pdfUrl && typeof pdfUrl === 'string') {
          if (openInNewTab) {
            window.open(pdfUrl, '_blank');
          }
          return pdfUrl;
        }
        throw new ReceiptError('Invalid PDF response format', 'server');
      }
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 404) {
          throw new ReceiptError('Receipt PDF not found', 'validation', status);
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch receipt PDF',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get invoice PDF link - opens PDF in new tab
  // New API pattern: /api/receipts/invoice/{code}/pdf?data=true&applicationCode=INCR
  // When the API returns JSON (data=true), we generate a new INVOICE UI PDF on the client.
  getInvoicePdfLink: async (
    code: string,
    openInNewTab: boolean = true,
    applicationCode?: string
  ): Promise<string> => {
    try {
      if (!code) {
        throw new ReceiptError('Invoice code is required', 'validation');
      }

      const params: Record<string, string> = {
        data: 'true',
      };
      if (applicationCode && applicationCode.trim()) {
        params.applicationCode = applicationCode.trim();
      }

      const response = await api.get(`/api/receipts/invoice/${code.trim()}/pdf`, {
        params,
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = (response.headers?.['content-type'] || '').toLowerCase();
      const isJsonBlob =
        response.data instanceof Blob &&
        (contentType.includes('application/json') || contentType.includes('text/json'));

      if (isJsonBlob) {
        const jsonPayload = JSON.parse(await response.data.text());
        console.log('[getInvoicePdfLink] Parsed JSON payload:', jsonPayload);

        if (jsonPayload?.success && jsonPayload?.data) {
          // Generate PDF first (like getReceiptPdfLink does) - this avoids blank screen issues
          try {
            // Map API response to InvoiceData format for invoicePdfService
            console.log('[getInvoicePdfLink] Mapping API response to InvoiceData format...');
            const apiData = jsonPayload.data;

            // Helper to get first non-null value from array or use value directly
            const getFirstValue = (value: any): any => {
              if (Array.isArray(value)) {
                const filtered = value.filter(v => v !== null && v !== undefined && v !== '');
                return filtered.length > 0 ? filtered[0] : value[0];
              }
              return value;
            };

            // Helper to normalize reference fields
            const normalizeRefField = (field: any): string => {
              if (!field) return '';
              if (Array.isArray(field)) {
                const filtered = field.filter(v => v !== null && v !== undefined && v !== '');
                return filtered.length > 0 ? String(filtered[0]).trim() : '';
              }
              return String(field).trim();
            };

            // Extract invoice details
            const invoiceNo = apiData.Code || apiData.InvoiceNo || code || 'N/A';
            const invoiceDate = apiData.TransactionDate || apiData.InvoiceDate || new Date().toISOString();
            const customerName = apiData.CustomerName || 'N/A';
            const address = apiData.Address || '';

            // Extract amounts
            const totalAmount = typeof apiData.TotalAmount === 'number' ? apiData.TotalAmount : 0;
            const taxAmount = typeof apiData.TaxAmount === 'number' ? apiData.TaxAmount : 0;
            const payingAmount = getFirstValue(apiData.PayingAmount);
            const finalPayingAmount = typeof payingAmount === 'number' ? payingAmount : totalAmount;

            // Extract reference document info
            const refDocNumber = normalizeRefField(getFirstValue(apiData.RefDocNumber));
            const refDocName = normalizeRefField(getFirstValue(apiData.RefDocName));

            // Build line items from details array
            const lineItems: Array<{
              description: string;
              referenceNo: string;
              gstPercent: number;
              quantity: number;
              unitPrice: number;
              amount: number;
            }> = [];

            if (Array.isArray(apiData.details) && apiData.details.length > 0) {
              apiData.details.forEach((detail: any, index: number) => {
                const itemRefNumber = normalizeRefField(getFirstValue(detail.refDocNumber || detail.RefDocNumber));
                const itemRefName = normalizeRefField(getFirstValue(detail.refDocName || detail.RefDocName));
                const quantity = typeof detail.quantity === 'number' ? detail.quantity : 1;
                const unitAmount = typeof detail.unitAmount === 'number' ? detail.unitAmount : 0;
                const lineTaxAmount = typeof detail.lineTaxAmount === 'number' ? detail.lineTaxAmount : 0;
                const gstPercent = typeof detail.lineTaxPercent === 'number' ? detail.lineTaxPercent : 9.0;

                // Calculate base amount (excluding GST)
                // If lineTotalAmount includes GST, subtract tax; otherwise use lineTotalAmount as base
                let lineTotal = typeof detail.lineTotalAmount === 'number' ? detail.lineTotalAmount : (unitAmount * quantity);
                let baseAmount = lineTotal;

                // If we have tax amount, the base is lineTotal - tax
                if (lineTaxAmount > 0 && lineTotal > 0) {
                  baseAmount = lineTotal - lineTaxAmount;
                } else if (gstPercent > 0 && lineTotal > 0) {
                  // Calculate base from total with GST
                  baseAmount = lineTotal / (1 + gstPercent / 100);
                } else {
                  // Use lineTotal as base if no GST info
                  baseAmount = lineTotal;
                }

                // Calculate unit price from base amount
                const unitPrice = quantity > 0 ? baseAmount / quantity : baseAmount;

                // Create better description based on item type or reference
                // Try to detect item type from description or itemId
                let description = '';
                if (detail.description && typeof detail.description === 'string') {
                  description = detail.description;
                } else if (detail.itemId) {
                  // Map common item IDs to descriptions
                  const itemDescriptions: Record<number, string> = {
                    1: 'Niche Service',
                    2: 'Inscription Service',
                    3: 'Administrative Fee',
                    4: 'Level 3 Niche',
                    5: 'Level 2 Niche',
                    6: 'Level 1 Niche',
                  };
                  description = itemDescriptions[detail.itemId] || `Item ${detail.itemId}`;
                } else if (itemRefName && itemRefNumber) {
                  // If we have both ref name and number, use them as description
                  description = `${itemRefName} ${itemRefNumber}`.trim();
                } else if (itemRefName || itemRefNumber) {
                  description = itemRefName || itemRefNumber;
                } else {
                  // Default descriptions based on line item index
                  const defaultDescriptions = [
                    'Level 3 Niche',
                    'Niche Inscription 1st Name',
                    'Setting of tables',
                    'Sealing of niche'
                  ];
                  description = defaultDescriptions[index] || 'Niche Service';
                }

                // Reference number for line item - combine chapel/niche info if available
                let refNo = itemRefNumber || itemRefName || applicationCode || refDocNumber || refDocName || 'N/A';

                // If we have both ref name and number, combine them for better reference
                if (itemRefName && itemRefNumber && itemRefName !== itemRefNumber) {
                  refNo = `${itemRefName} ${itemRefNumber}`.trim();
                }

                lineItems.push({
                  description,
                  referenceNo: refNo,
                  gstPercent,
                  quantity,
                  unitPrice: unitPrice, // Base amount per unit (excluding GST)
                  amount: baseAmount // Base amount for line item (excluding GST)
                });
              });
            } else {
              // Fallback: create single line item from total
              const baseAmount = totalAmount - taxAmount;
              lineItems.push({
                description: refDocName || refDocNumber || applicationCode || 'Niche Service',
                referenceNo: refDocNumber || refDocName || applicationCode || 'N/A',
                gstPercent: taxAmount > 0 ? 9.0 : 0,
                quantity: 1,
                unitPrice: baseAmount,
                amount: baseAmount
              });
            }

            // Calculate pricing breakdown
            const subTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
            const calculatedTax = lineItems.reduce((sum, item) => sum + (item.amount * item.gstPercent / 100), 0);
            const finalTaxAmount = taxAmount > 0 ? taxAmount : calculatedTax;
            const nicheAmount = lineItems.length > 0 ? lineItems[0].amount : subTotal;
            const serviceAmount = subTotal > nicheAmount ? subTotal - nicheAmount : 0;

            // Format address - remove extra "Blk:" if already present
            let formattedAddress = address || '';
            if (formattedAddress && !formattedAddress.toLowerCase().includes('blk')) {
              formattedAddress = `Blk: ${formattedAddress}`;
            }

            // Map to InvoiceData format
            const invoicePdfData = {
              invoiceNo,
              invoiceDate, // ISO date string - invoicePdfService will format it
              dueDate: invoiceDate, // Use invoice date as due date if not provided
              applicationNumber: applicationCode || refDocNumber || refDocName || '',
              applicantName: customerName,
              applicantAddress: formattedAddress,
              nicheDetails: {
                nicheId: null,
                nicheCode: refDocNumber || refDocName || applicationCode || '',
                chapel: '',
                wallName: '',
                rowNumber: '',
                rowLevel: null
              },
              pricing: {
                nicheAmount,
                serviceAmount,
                taxAmount: finalTaxAmount,
                totalAmount: finalPayingAmount || totalAmount
              },
              lineItems
            };

            console.log('[getInvoicePdfLink] Mapped invoice data:', invoicePdfData);

            // Use invoicePdfService for better HTML template UI
            const { invoicePdfService } = await import('./invoicePdfService');
            console.log('[getInvoicePdfLink] Generating invoice PDF using invoicePdfService...');
            const pdfBlob = await invoicePdfService.generateInvoicePdfBlob(invoicePdfData);
            console.log('[getInvoicePdfLink] PDF blob generated, size:', pdfBlob.size);

            // Validate PDF blob
            if (!pdfBlob || pdfBlob.size === 0) {
              throw new Error('Generated PDF blob is empty or invalid');
            }

            // Check if blob is actually a PDF (should start with %PDF)
            try {
              const blobArrayBuffer = await pdfBlob.arrayBuffer();
              const blobStart = new Uint8Array(blobArrayBuffer.slice(0, 4));
              const pdfHeader = String.fromCharCode(...blobStart);
              console.log('[getInvoicePdfLink] PDF header check:', pdfHeader.substring(0, 10));

              if (!pdfHeader.startsWith('%PDF')) {
                console.warn('[getInvoicePdfLink] PDF header check failed, but continuing...');
              }
            } catch (headerError) {
              console.warn('[getInvoicePdfLink] Could not verify PDF header:', headerError);
            }

            const pdfUrl = URL.createObjectURL(pdfBlob);
            console.log('[getInvoicePdfLink] PDF URL created:', pdfUrl);

            // Open PDF in new tab AFTER generation (same pattern as getReceiptPdfLink)
            if (openInNewTab) {
              const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
              if (!newWindow) {
                URL.revokeObjectURL(pdfUrl);
                throw new ReceiptError('Popup blocked. Please allow popups for this site.', 'validation', 403);
              }
              console.log('[getInvoicePdfLink] PDF opened in new window successfully');
            }

            setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
            return pdfUrl;
          } catch (pdfError: any) {
            console.error('[getInvoicePdfLink] Error generating invoice PDF:', pdfError);
            throw new ReceiptError(`Failed to generate invoice PDF: ${pdfError.message || 'Unknown error'}`, 'server');
          }
        }
        console.error('[getInvoicePdfLink] Invalid response format:', jsonPayload);
        throw new ReceiptError('Invalid invoice response format', 'server');
      }

      // Fallback: direct PDF or URL from backend
      console.log('[getInvoicePdfLink] Response is not JSON blob, checking other formats...');
      if (response.data instanceof Blob) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        if (openInNewTab) {
          const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
          if (!newWindow) {
            URL.revokeObjectURL(url);
            throw new ReceiptError('Popup blocked. Please allow popups for this site to view the invoice.', 'validation', 403);
          }
        }

        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return url;
      } else if (typeof response.data === 'string') {
        if (openInNewTab) {
          const newWindow = window.open(response.data, '_blank', 'noopener,noreferrer');
          if (!newWindow) {
            throw new ReceiptError('Popup blocked. Please allow popups for this site to view the invoice.', 'validation', 403);
          }
        }
        return response.data;
      } else {
        const pdfUrl = response.data?.url || response.data?.pdfUrl || response.data?.link;
        if (pdfUrl && typeof pdfUrl === 'string') {
          if (openInNewTab) {
            const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
            if (!newWindow) {
              throw new ReceiptError('Popup blocked. Please allow popups for this site to view the invoice.', 'validation', 403);
            }
          }
          return pdfUrl;
        }
        console.error('[getInvoicePdfLink] Invalid response format:', response.data);
        throw new ReceiptError('Invalid PDF response format', 'server');
      }
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 404) {
          throw new ReceiptError('Invoice PDF not found', 'validation', status);
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch invoice PDF',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Get items for invoices/receipts (legacy name kept for compatibility)
  // This now calls /api/items to get the full catalog
  getReceiptItems: async (_receiptId: string | number, _includeItemInfo: boolean = true): Promise<ReceiptItem[]> => {
    try {
      // New API: /api/items
      const response = await api.get('/api/items');

      // Handle response structure: {success: true, data: [...]} or direct array
      let items: ReceiptItem[] = [];

      if (response.data) {
        if (response.data.success && response.data.data) {
          items = response.data.data;
        } else if (Array.isArray(response.data)) {
          items = response.data;
        } else if (response.data.items && Array.isArray(response.data.items)) {
          items = response.data.items;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          items = response.data.data;
        }
      }

      // Map API /api/items response to ReceiptItem interface
      return items.map((item: any) => ({
        itemId: item.ItemId || item.itemId || item.ItemID || item.id,
        itemName: item.Name || item.ItemName || item.itemName || item.name || '',
        description: item.Description || item.description || item.Name || item.ItemName || '',
        unitPrice: item.Price ?? item.UnitPrice ?? item.unitPrice ?? 0,
        defaultAmount: item.Price ?? item.DefaultAmount ?? item.defaultAmount ?? 0,
        taxPercent: item.TaxPercent || item.taxPercent || item.Tax || item.tax || 9,
        category: item.Category || item.category || item.ItemCategory || item.itemCategory || '',
        isActive: item.IsActive !== undefined ? item.IsActive : (item.isActive !== undefined ? item.isActive : true),
        code: item.Code || item.code || '',
        churchId: item.ChurchId ?? item.churchId,
        isRefType: item.IsRefType !== undefined ? item.IsRefType : item.isRefType,
        docType: item.DocType || item.docType || ''
      }));
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReceiptError('Unauthorized access', 'auth', status);
        } else if (status === 404) {
          throw new ReceiptError('Receipt items not found', 'validation', status);
        } else if (status >= 500) {
          throw new ReceiptError('Server error occurred', 'server', status);
        } else {
          throw new ReceiptError(
            error.response.data?.message || 'Failed to fetch receipt items',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReceiptError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReceiptError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },
};

export default receiptService;

