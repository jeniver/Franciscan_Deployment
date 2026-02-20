import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Types for Invoice/Application Data
export interface InvoiceFlags {
  isApplicationData: boolean;
  isInvoice: boolean;
  hasInvoice: boolean;
  hasReceipt: boolean;
  canCreateInvoice: boolean;
  canCreateReceipt: boolean;
}



export interface InvoiceDetail {
  invoiceDetailId?: number | null;
  invoiceId?: number | null;
  itemId: number;
  itemName: string;
  itemCode: string | null;
  itemPrice: number;
  itemDocType?: string | null;
  itemIsRefType?: boolean;
  quantity: number;
  unitAmount: number;
  payingAmount: number;
  totalPayingAmount: number;
  refDocNumber: string;
  refDocName: string;

  lineTotalAmount: number;
  lineTaxPercent: number;
  lineTaxAmount: number;
  UnitAmount?: number;
  Quantity?: number;
  LineTotalAmount?: number;
  LineTaxPercent?: number;
  LineTaxAmount?: number;
  TotalPayingAmount?: number;
  RefDocNumber?: string;
  ItemId?: number;
  ItemName?: string;
  ItemPrice?: number;
  PayingAmount?: number;
  unitPrice?: number;
  amount?: number;
  taxPercent?: number;
}

export interface NicheInfo {
  nicheId: number;
  nicheCode: string;
  nichePrice: number;
  nicheLevel: number;
  rowCode: string;
  rowPrice: number;
  wallId: number;
  wallCode: string;
  wallName: string;
  chapelId: number;
  chapelCode: string;
  chapelName: string;
}

export interface BookingInfo {
  nicheBookingId: number;
  nicheId: number;
  nicheApplicationId: number;
  bookedDate: string;
  bookingStatus: number;
  bookingRemarks: string | null;
  contactPersonName: string;
  nomineeName: string;
}

export interface InvoiceOrApplicationData extends InvoiceFlags {
  // Invoice/Application ID
  invoiceId: number | null;
  code: string | null;
  applicationCode?: string;
  nicheApplicationId?: number;

  // Customer Info
  customerName: string;
  applicantIDNo?: string;
  applicantEmail?: string;
  applicantMobile?: string;

  // Address
  addressNo?: string;
  address?: string;
  address2?: string;
  addressCity?: string;
  districtCode?: string;
  country?: string;

  // Financial
  totalAmount: number;
  payingAmount: number;
  taxAmount: number;
  taxPercentage: number;
  taxCode: string | null;
  paymentMode?: string | null;

  // System
  userId: number;
  churchId: number;
  status: number;
  transactionDate: string;
  refDocNumber?: string;
  refDocName?: string;
  payeeName?: string;
  paymentModeDocNo?: string;
  PaymentMode?: string;
  PaymentModeDocNo?: string;
  InvoiceCode?: string;
  invoiceCode?: string;
  receipt?: any;

  // Niche Info (only in application data)
  niche?: NicheInfo | null;

  // Booking Info (only in application data)
  booking?: BookingInfo | null;

  // Details
  details: InvoiceDetail[];

  // Summary
  summary: {
    totalItems: number;
    subtotal: number;
    totalTax: number;
    grandTotal: number;
  };
}

// Create Invoice Request Type
export interface CreateIndividualInvoiceRequest {
  applicationCode: string;
  customerName: string;
  totalAmount: number;
  payingAmount: number;
  paymentMode: string;
  paymentModeDocNo?: string;
}

// Create Invoice Request Type
export interface CreateInvoicePayload {
  invoice: {
    transactionDate: string;
    refDocNumber: string;
    refDocName: string;
    customerName: string;
    totalAmount: number;
    payingAmount: number;
    taxAmount: number;
    taxPercentage: number;
    taxCode: string | null;
    nicheApplicationId?: number;
    addressNo?: string;
    address?: string;
    address2?: string;
    addressCity?: string;
    districtCode?: string;
    country?: string;
    paymentMode?: string;
  };
  invoiceDetails: Array<{
    itemId: number;
    quantity: number;
    unitAmount: number;
    payingAmount: number;
    totalPayingAmount: number;
    refDocNumber: string;
    refDocName: string;
    lineTotalAmount: number;
    lineTaxPercent: number;
    lineTaxAmount: number;
  }>;
  createReceipt?: boolean;
}

// NOTE: Receipt table requires InvoiceId NOT NULL. So "receipt only" without an invoice
// is not supported by the DB schema. Use invoice.createReceipt=true (invoice + receipt)
// or /api/receipts/from-invoice for existing invoices.

interface InvoiceState {
  currentData: InvoiceOrApplicationData | null;
  loading: boolean;
  error: string | null;
  creatingInvoice: boolean;
  createInvoiceSuccess: boolean;
  createReceiptSuccess: boolean;
  lastCreatedInvoiceCode: string | null;
  lastCreatedReceiptCode: string | null;
  canCreateInvoice: boolean;
  canCreateReceipt: boolean;
}

const initialState: InvoiceState = {
  currentData: null,
  loading: false,
  error: null,
  creatingInvoice: false,
  createInvoiceSuccess: false,
  createReceiptSuccess: false,
  lastCreatedInvoiceCode: null,
  lastCreatedReceiptCode: null,
  canCreateInvoice: true,
  canCreateReceipt: true,
};

// Async thunks

// Fetch invoice or application by code
export const fetchInvoiceOrApplication = createAsyncThunk<
  InvoiceOrApplicationData,
  string | { code: string; type?: string },
  { rejectValue: string }
>(
  'invoice/fetchInvoiceOrApplication',
  async (arg, { rejectWithValue }) => {
    try {
      let code: string;
      let type: string | undefined;

      if (typeof arg === 'string') {
        code = arg;
      } else {
        code = arg.code;
        type = arg.type;
      }

      // Use invoiceService instead of direct API call to consistency utilize the updated service method
      // which handles the type parameter correctly
      try {
        const invoiceService = (await import('../services/invoiceService')).default;
        const data = await invoiceService.getInvoiceByCode(code.trim(), type);
        return data as InvoiceOrApplicationData;
      } catch (serviceError: any) {
        // Fallback or rethrow service error
        throw serviceError;
      }
    } catch (error: any) {
      if (error.statusCode === 404 || error.response?.status === 404) {
        return rejectWithValue('Invoice or application not found');
      }
      return rejectWithValue(error.message || error.response?.data?.message || 'Failed to fetch data');
    }
  }
);

// Fetch combined invoice and receipt data by code
export const fetchCombinedInvoiceReceiptData = createAsyncThunk<
  any, // Combined response type
  string,
  { rejectValue: string }
>(
  'invoice/fetchCombinedInvoiceReceiptData',
  async (code: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/invoices/${code.trim()}/combined`);

      // Backend returns combined data with invoice, receipt, and flags
      const body = response.data;
      if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
        const wrapped: any = body;
        if (wrapped.success === true && wrapped.data) {
          return wrapped.data;
        }
        return rejectWithValue(wrapped.message || 'Failed to fetch combined data');
      }

      return body;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return rejectWithValue('No invoice or receipt data found for code');
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch combined data');
    }
  }
);

// Create invoice from application
export const createInvoice = createAsyncThunk<
  { invoiceId: number; invoiceCode: string; receiptCode?: string; receiptCreated?: boolean },
  CreateInvoicePayload,
  { rejectValue: string }
>(
  'invoice/createInvoice',
  async (payload: CreateInvoicePayload, { rejectWithValue }) => {
    try {
      // Backend route: POST /api/invoices  (expects { invoice, invoiceDetails, createReceipt })
      const response = await api.post('/api/invoices', payload);

      if (response.data.success === false) {
        return rejectWithValue(response.data.message || 'Failed to create invoice');
      }

      return {
        invoiceId: response.data.data?.invoiceId || response.data.invoiceId,
        invoiceCode: response.data.data?.invoiceCode || response.data.invoiceCode,
        receiptCode: response.data.data?.receiptCode || response.data.receiptCode,
        receiptCreated: response.data.data?.receiptCreated || response.data.receiptCreated || false,
      };
    } catch (error: any) {
      if (error.response?.status === 409) {
        return rejectWithValue('Duplicate invoice - invoice already exists for this application');
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to create invoice');
    }
  }
);



// Create individual invoice from application
export interface IndividualInvoiceResponse {
  invoiceCode: string;
  receiptCreated?: boolean;
  hasInvoice: boolean;
  hasReceipt: boolean;
  canCreateInvoice: boolean;
  canCreateReceipt: boolean;
  invoiceDetails: any;
}

export const createIndividualInvoice = createAsyncThunk<
  IndividualInvoiceResponse,
  CreateIndividualInvoiceRequest,
  { rejectValue: string }
>(
  'invoice/createIndividualInvoice',
  async (payload: CreateIndividualInvoiceRequest, { rejectWithValue }) => {
    try {
      // Backend route: POST /api/invoices/individual
      const response = await api.post('/api/invoices/individual', payload);

      if (response.data.success === false) {
        return rejectWithValue(response.data.message || 'Failed to create individual invoice');
      }

      return {
        invoiceCode: response.data.data?.invoiceCode || response.data.invoiceCode,
        receiptCreated: response.data.receiptCreated,
        hasInvoice: response.data.data?.hasInvoice || true,
        hasReceipt: response.data.data?.hasReceipt || false,
        canCreateInvoice: response.data.data?.canCreateInvoice || false,
        canCreateReceipt: response.data.data?.canCreateReceipt || true,
        invoiceDetails: response.data.data?.invoiceDetails || null
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create individual invoice');
    }
  }
);


// Invoice slice
const invoiceSlice = createSlice({
  name: 'invoice',
  initialState,
  reducers: {
    clearCurrentData: (state) => {
      state.currentData = null;
      state.error = null;
      state.createInvoiceSuccess = false;
      state.createReceiptSuccess = false;
      state.lastCreatedInvoiceCode = null;
      state.lastCreatedReceiptCode = null;
      state.canCreateInvoice = true;
      state.canCreateReceipt = true;
    },

    clearError: (state) => {
      state.error = null;
    },
    resetCreateStatus: (state) => {
      state.createInvoiceSuccess = false;
      state.createReceiptSuccess = false;
      state.lastCreatedInvoiceCode = null;
      state.lastCreatedReceiptCode = null;
      state.canCreateInvoice = true;
      state.canCreateReceipt = true;
    },
  },
  extraReducers: (builder) => {


    // Fetch invoice or application
    builder.addCase(fetchInvoiceOrApplication.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.currentData = null; // Clear previous data
    });
    builder.addCase(fetchInvoiceOrApplication.fulfilled, (state, action) => {
      state.loading = false;
      state.currentData = action.payload;
      state.error = null;
      
      // Set proper flags based on the loaded data
      if (state.currentData) {
        // Determine if this is an invoice or application data
        state.currentData.isApplicationData = !state.currentData.isInvoice || action.payload?.applicationCode !== undefined;
        state.currentData.isInvoice = !!state.currentData.isInvoice;
        
        // Determine if invoice can be created (for new applications)
        // Check if it's a new application without existing invoice
        state.currentData.canCreateInvoice = 
          Boolean((state.currentData.isApplicationData && !state.currentData.isInvoice) || 
          (!state.currentData.isInvoice && state.currentData.applicationCode));
      }
    });
    builder.addCase(fetchInvoiceOrApplication.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to fetch data';
      state.currentData = null;
    });
    // Create invoice
    builder.addCase(createInvoice.pending, (state) => {
      state.creatingInvoice = true;
      state.error = null;
      state.createInvoiceSuccess = false;
    });
    builder.addCase(createInvoice.fulfilled, (state, action) => {
      state.creatingInvoice = false;
      state.createInvoiceSuccess = true;
      state.lastCreatedInvoiceCode = action.payload.invoiceCode;
      if (action.payload.receiptCode) {
        state.lastCreatedReceiptCode = action.payload.receiptCode;
        state.createReceiptSuccess = true;
      }

      // Update currentData flags
      if (state.currentData) {
        state.currentData.hasInvoice = true;
        state.currentData.canCreateInvoice = false;
        state.currentData.code = action.payload.invoiceCode;

        if (action.payload.receiptCreated || action.payload.receiptCode) {
          state.currentData.hasReceipt = true;
          state.currentData.canCreateReceipt = false;
          // Note: code in currentData specifically refers to invoice code, but can wrap receipt info
        }
      }

      state.error = null;
    });
    builder.addCase(createInvoice.rejected, (state, action) => {
      state.creatingInvoice = false;
      state.createInvoiceSuccess = false;
      state.error = action.payload || 'Failed to create invoice';
    });

    // Create individual invoice
    builder.addCase(createIndividualInvoice.pending, (state) => {
      state.creatingInvoice = true;
      state.error = null;
      state.createInvoiceSuccess = false;
    });
    builder.addCase(createIndividualInvoice.fulfilled, (state, action) => {
      state.creatingInvoice = false;
      state.createInvoiceSuccess = true;
      state.lastCreatedInvoiceCode = action.payload.invoiceCode;
      if (action.payload.receiptCreated) {
        state.lastCreatedReceiptCode = action.payload.invoiceCode; // Use invoice code as receipt code if receipt was created
        state.createReceiptSuccess = true;
      }
      // Update button control flags
      state.canCreateInvoice = action.payload.canCreateInvoice;
      state.canCreateReceipt = action.payload.canCreateReceipt;

      // Update currentData flags
      if (state.currentData) {
        state.currentData.hasInvoice = action.payload.hasInvoice;
        state.currentData.hasReceipt = action.payload.hasReceipt;
        state.currentData.canCreateInvoice = action.payload.canCreateInvoice;
        state.currentData.canCreateReceipt = action.payload.canCreateReceipt;
        state.currentData.code = action.payload.invoiceCode;
      }

      state.error = null;
    });
    builder.addCase(createIndividualInvoice.rejected, (state, action) => {
      state.creatingInvoice = false;
      state.createInvoiceSuccess = false;
      state.error = action.payload || 'Failed to create individual invoice';
    });

    // Receipt is created together with invoice when createReceipt=true on createInvoice
  },
});

export const { clearCurrentData, clearError, resetCreateStatus } = invoiceSlice.actions;
export default invoiceSlice.reducer;

