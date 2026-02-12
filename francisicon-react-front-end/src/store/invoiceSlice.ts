import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Types for Invoice/Application Data
export interface InvoiceFlags {
  isApplicationData: boolean;
  isInvoice: boolean;
  hasInvoice: boolean;
  canCreateInvoice: boolean;
}

// Creation Status Interface
export interface CreationStatus {
  code: string;
  hasInvoice: boolean;
  hasReceipt: boolean;
  isApplication: boolean;
  isExistingRecord: boolean;
  canCreateInvoice: boolean;
  canCreateReceipt: boolean;
  invoiceCode: string | null;
  receiptCode: string | null;
  invoiceId: number | null;
  receiptId: number | null;
  applicationData: any | null;
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
  refType: string;
  lineTotalAmount: number;
  lineTaxPercent: number;
  lineTaxAmount: number;
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

export interface CreateIndividualReceiptRequest {
  applicationCode: string;
  customerName: string;
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
  creationStatus: CreationStatus | null;
  loading: boolean;
  error: string | null;
  creatingInvoice: boolean;
  creatingReceipt: boolean;
  createInvoiceSuccess: boolean;
  createReceiptSuccess: boolean;
  lastCreatedInvoiceCode: string | null;
  lastCreatedReceiptCode: string | null;
  canCreateInvoice: boolean;
  canCreateReceipt: boolean;
}

const initialState: InvoiceState = {
  currentData: null,
  creationStatus: null,
  loading: false,
  error: null,
  creatingInvoice: false,
  creatingReceipt: false,
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
  string,
  { rejectValue: string }
>(
  'invoice/fetchInvoiceOrApplication',
  async (code: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/invoices/${code.trim()}`);

      // Backend can return either:
      // 1) { success: true, message: "...", data: { ...InvoiceOrApplicationData } }
      // 2) { ...InvoiceOrApplicationData } (direct)
      const body = response.data;
      if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
        const wrapped: any = body;
        if (wrapped.success === true && wrapped.data) {
          return wrapped.data as InvoiceOrApplicationData;
        }
        return rejectWithValue(wrapped.message || 'Failed to fetch data');
      }

      return body as InvoiceOrApplicationData;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return rejectWithValue('Invoice or application not found');
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch data');
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

// Fetch creation status
export const fetchCreationStatus = createAsyncThunk<
  CreationStatus,
  string,
  { rejectValue: string }
>(
  'invoice/fetchCreationStatus',
  async (code: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/invoices/status/${code.trim()}`);
      return response.data.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch creation status');
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

// Create individual receipt from application
export const createIndividualReceipt = createAsyncThunk<
  { receiptCode: string; receiptCreated?: boolean },
  CreateIndividualReceiptRequest,
  { rejectValue: string }
>(
  'invoice/createIndividualReceipt',
  async (payload: CreateIndividualReceiptRequest, { rejectWithValue }) => {
    try {
      // Backend route: POST /api/receipts/individual
      const response = await api.post('/api/receipts/individual', payload);
      
      if (response.data.success === false) {
        return rejectWithValue(response.data.message || 'Failed to create individual receipt');
      }
      
      return {
        receiptCode: response.data.code || response.data.receiptCode,
        receiptCreated: response.data.receiptCreated,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create individual receipt');
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
      state.creationStatus = null;
      state.error = null;
      state.createInvoiceSuccess = false;
      state.createReceiptSuccess = false;
      state.lastCreatedInvoiceCode = null;
      state.lastCreatedReceiptCode = null;
      state.canCreateInvoice = true;
      state.canCreateReceipt = true;
    },
    clearCreationStatus: (state) => {
      state.creationStatus = null;
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
    // Fetch creation status
    builder.addCase(fetchCreationStatus.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCreationStatus.fulfilled, (state, action) => {
      state.loading = false;
      state.creationStatus = action.payload;
      state.error = null;
    });
    builder.addCase(fetchCreationStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to fetch creation status';
      state.creationStatus = null;
    });
    
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
      state.error = null;
    });
    builder.addCase(createIndividualInvoice.rejected, (state, action) => {
      state.creatingInvoice = false;
      state.createInvoiceSuccess = false;
      state.error = action.payload || 'Failed to create individual invoice';
    });
    
    // Create individual receipt
    builder.addCase(createIndividualReceipt.pending, (state) => {
      state.creatingReceipt = true;
      state.error = null;
      state.createReceiptSuccess = false;
    });
    builder.addCase(createIndividualReceipt.fulfilled, (state, action) => {
      state.creatingReceipt = false;
      state.createReceiptSuccess = true;
      state.lastCreatedReceiptCode = action.payload.receiptCode;
      if (action.payload.receiptCreated) {
        state.createReceiptSuccess = true;
      }
      state.error = null;
    });
    builder.addCase(createIndividualReceipt.rejected, (state, action) => {
      state.creatingReceipt = false;
      state.createReceiptSuccess = false;
      state.error = action.payload || 'Failed to create individual receipt';
    });
    
    // Receipt is created together with invoice when createReceipt=true on createInvoice
  },
});

export const { clearCurrentData, clearCreationStatus, clearError, resetCreateStatus } = invoiceSlice.actions;
export default invoiceSlice.reducer;

