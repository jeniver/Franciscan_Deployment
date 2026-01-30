import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../services/api';

// Types for Invoice/Application Data
export interface InvoiceFlags {
  isApplicationData: boolean;
  isInvoice: boolean;
  hasInvoice: boolean;
  canCreateInvoice: boolean;
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

// Create Receipt Request Type
export interface CreateReceiptPayload {
  invoice: {
    invoiceId?: number;
    invoiceCode: string;
    customerName: string;
    totalAmount: number;
    payingAmount: number;
    paymentMode: string;
  };
  invoiceDetails: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
}

interface InvoiceState {
  currentData: InvoiceOrApplicationData | null;
  loading: boolean;
  error: string | null;
  creatingInvoice: boolean;
  creatingReceipt: boolean;
  createInvoiceSuccess: boolean;
  createReceiptSuccess: boolean;
  lastCreatedInvoiceCode: string | null;
  lastCreatedReceiptCode: string | null;
}

const initialState: InvoiceState = {
  currentData: null,
  loading: false,
  error: null,
  creatingInvoice: false,
  creatingReceipt: false,
  createInvoiceSuccess: false,
  createReceiptSuccess: false,
  lastCreatedInvoiceCode: null,
  lastCreatedReceiptCode: null,
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
      return response.data;
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
  { invoiceId: number; invoiceCode: string },
  CreateInvoicePayload,
  { rejectValue: string }
>(
  'invoice/createInvoice',
  async (payload: CreateInvoicePayload, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/invoices', payload);
      
      if (response.data.success === false) {
        return rejectWithValue(response.data.message || 'Failed to create invoice');
      }
      
      return {
        invoiceId: response.data.data?.invoiceId || response.data.invoiceId,
        invoiceCode: response.data.data?.invoiceCode || response.data.invoiceCode,
      };
    } catch (error: any) {
      if (error.response?.status === 409) {
        return rejectWithValue('Duplicate invoice - invoice already exists for this application');
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to create invoice');
    }
  }
);

// Create receipt from invoice
export const createReceipt = createAsyncThunk<
  { receiptId: number; receiptCode: string },
  CreateReceiptPayload,
  { rejectValue: string }
>(
  'invoice/createReceipt',
  async (payload: CreateReceiptPayload, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/receipts/from-invoice', payload);
      
      return {
        receiptId: response.data.receiptId || response.data.data?.receiptId,
        receiptCode: response.data.receiptCode || response.data.data?.receiptCode,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create receipt');
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
    },
    clearError: (state) => {
      state.error = null;
    },
    resetCreateStatus: (state) => {
      state.createInvoiceSuccess = false;
      state.createReceiptSuccess = false;
      state.lastCreatedInvoiceCode = null;
      state.lastCreatedReceiptCode = null;
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
      state.error = null;
    });
    builder.addCase(createInvoice.rejected, (state, action) => {
      state.creatingInvoice = false;
      state.createInvoiceSuccess = false;
      state.error = action.payload || 'Failed to create invoice';
    });
    
    // Create receipt
    builder.addCase(createReceipt.pending, (state) => {
      state.creatingReceipt = true;
      state.error = null;
      state.createReceiptSuccess = false;
    });
    builder.addCase(createReceipt.fulfilled, (state, action) => {
      state.creatingReceipt = false;
      state.createReceiptSuccess = true;
      state.lastCreatedReceiptCode = action.payload.receiptCode;
      state.error = null;
    });
    builder.addCase(createReceipt.rejected, (state, action) => {
      state.creatingReceipt = false;
      state.createReceiptSuccess = false;
      state.error = action.payload || 'Failed to create receipt';
    });
  },
});

export const { clearCurrentData, clearError, resetCreateStatus } = invoiceSlice.actions;
export default invoiceSlice.reducer;

