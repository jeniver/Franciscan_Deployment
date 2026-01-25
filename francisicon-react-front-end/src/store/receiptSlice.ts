import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import receiptService, {
  Receipt,
  CreateReceiptRequest,
  CreateReceiptFromInvoiceRequest,
  ReceiptReport,
  MonthlyList,
  ReceiptListResponse,
  ReceiptSummary,
  Invoice,
  ReceiptError,
  ReceiptSearchParams,
  ReceiptItem,
} from '../services/receiptService';

export interface ReceiptState {
  // Receipt data
  receipts: Receipt[];
  selectedReceipt: Receipt | null;
  currentReceipt: Receipt | null;
  
  // Invoice data
  selectedInvoice: Invoice | null;
  
  // Reports
  receiptReport: ReceiptReport | null;
  goaMonthlyList: MonthlyList | null;
  inscriptionMonthlyList: MonthlyList | null;
  wakeRoomMonthlyList: MonthlyList | null;
  
  // Last numbers
  lastReceiptNumber: string | null;
  lastMiscReceiptNumber: string | null;
  
  // Items
  receiptItems: ReceiptItem[];
  itemsLoading: boolean;
  itemsError: string | null;
  
  // Pagination
  currentPage: number;
  receiptsPerPage: number;
  totalReceipts: number;
  totalPages: number;
  
  // Filters
  filters: {
    fromDate: string | null;
    toDate: string | null;
    searchTerm: string;
    receiptCode: string;
    customerName: string;
    paymentMode: string | null;
    applicationId: string;
    invoiceId: string;
  };
  reportSummary: ReceiptSummary | null;
  
  // UI State
  loading: boolean;
  error: string | null;
  lastErrorType: 'auth' | 'network' | 'validation' | 'server' | null;
  isDataLoaded: boolean;
  
  // Action states
  isCreating: boolean;
  isFetchingReport: boolean;
  isFetchingMonthlyList: boolean;
}

const initialState: ReceiptState = {
  receipts: [],
  selectedReceipt: null,
  currentReceipt: null,
  selectedInvoice: null,
  receiptReport: null,
  goaMonthlyList: null,
  inscriptionMonthlyList: null,
  wakeRoomMonthlyList: null,
  lastReceiptNumber: null,
  lastMiscReceiptNumber: null,
  receiptItems: [],
  itemsLoading: false,
  itemsError: null,
  currentPage: 1,
  receiptsPerPage: 50,
  totalReceipts: 0,
  totalPages: 0,
  filters: {
    fromDate: null,
    toDate: null,
    searchTerm: '',
    receiptCode: '',
    customerName: '',
    paymentMode: null,
    applicationId: '',
    invoiceId: '',
  },
  reportSummary: null,
  loading: false,
  error: null,
  lastErrorType: null,
  isDataLoaded: false,
  isCreating: false,
  isFetchingReport: false,
  isFetchingMonthlyList: false,
};

// Async thunks
export const fetchReceiptByCode = createAsyncThunk(
  'receipt/fetchReceiptByCode',
  async (code: string, { rejectWithValue }) => {
    try {
      const receipt = await receiptService.getReceiptByCode(code);
      return receipt;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const createReceipt = createAsyncThunk(
  'receipt/createReceipt',
  async (data: CreateReceiptRequest, { rejectWithValue }) => {
    try {
      const receipt = await receiptService.createReceipt(data);
      return receipt;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const createReceiptFromInvoice = createAsyncThunk(
  'receipt/createReceiptFromInvoice',
  async (data: CreateReceiptFromInvoiceRequest, { rejectWithValue }) => {
    try {
      const receipt = await receiptService.createReceiptFromInvoice(data);
      return receipt;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const fetchLastReceiptNumber = createAsyncThunk(
  'receipt/fetchLastReceiptNumber',
  async (_, { rejectWithValue }) => {
    try {
      const lastNumber = await receiptService.getLastReceiptNumber();
      return lastNumber;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const fetchLastMiscReceiptNumber = createAsyncThunk(
  'receipt/fetchLastMiscReceiptNumber',
  async (_, { rejectWithValue }) => {
    try {
      const lastNumber = await receiptService.getLastMiscReceiptNumber();
      return lastNumber;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const fetchReceiptReport = createAsyncThunk(
  'receipt/fetchReceiptReport',
  async ({ fromDate, toDate }: { fromDate: string; toDate: string }, { rejectWithValue }) => {
    try {
      const report = await receiptService.getReceiptReport(fromDate, toDate);
      return report;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const fetchGOAMonthlyList = createAsyncThunk(
  'receipt/fetchGOAMonthlyList',
  async ({ fromDate, toDate }: { fromDate: string; toDate: string }, { rejectWithValue }) => {
    try {
      const list = await receiptService.getGOAMonthlyList(fromDate, toDate);
      return list;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const fetchInscriptionMonthlyList = createAsyncThunk(
  'receipt/fetchInscriptionMonthlyList',
  async ({ fromDate, toDate }: { fromDate: string; toDate: string }, { rejectWithValue }) => {
    try {
      const list = await receiptService.getInscriptionMonthlyList(fromDate, toDate);
      return list;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const fetchWakeRoomMonthlyList = createAsyncThunk(
  'receipt/fetchWakeRoomMonthlyList',
  async ({ fromDate, toDate }: { fromDate: string; toDate: string }, { rejectWithValue }) => {
    try {
      const list = await receiptService.getWakeRoomMonthlyList(fromDate, toDate);
      return list;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const fetchReceiptsByDateRange = createAsyncThunk(
  'receipt/fetchReceiptsByDateRange',
  async (
    {
      fromDate,
      toDate,
      page,
      limit,
      searchTerm,
      paymentMode,
      applicationId,
      invoiceId,
      sortBy,
      sortOrder,
    }: {
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
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await receiptService.getReceiptsByDateRange({
        fromDate,
        toDate,
        page,
        limit,
        searchTerm,
        paymentMode,
        applicationId,
        invoiceId,
        sortBy,
        sortOrder,
      });
      return response;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const searchReceipts = createAsyncThunk(
  'receipt/searchReceipts',
  async (params: ReceiptSearchParams = {}, { rejectWithValue }) => {
    try {
      const response = await receiptService.searchReceipts(params);
      return response;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const fetchInvoiceByCode = createAsyncThunk(
  'receipt/fetchInvoiceByCode',
  async (code: string, { rejectWithValue }) => {
    try {
      const invoice = await receiptService.getInvoiceByCode(code);
      return invoice;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const fetchReceiptItems = createAsyncThunk(
  'receipt/fetchReceiptItems',
  async (params: { receiptId: string | number; includeItemInfo?: boolean }, { rejectWithValue }) => {
    try {
      const items = await receiptService.getReceiptItems(
        params.receiptId,
        params.includeItemInfo !== false // Default to true
      );
      return items;
    } catch (error: any) {
      if (error instanceof ReceiptError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const,
      });
    }
  }
);

export const receiptSlice = createSlice({
  name: 'receipt',
  initialState,
  reducers: {
    setSelectedReceipt: (state, action: PayloadAction<Receipt | null>) => {
      state.selectedReceipt = action.payload;
    },
    setCurrentReceipt: (state, action: PayloadAction<Receipt | null>) => {
      state.currentReceipt = action.payload;
    },
    setSelectedInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.selectedInvoice = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setReceiptsPerPage: (state, action: PayloadAction<number>) => {
      state.receiptsPerPage = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<ReceiptState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        fromDate: null,
        toDate: null,
        searchTerm: '',
        receiptCode: '',
        customerName: '',
        paymentMode: null,
        applicationId: '',
        invoiceId: '',
      };
    },
    clearError: (state) => {
      state.error = null;
      state.lastErrorType = null;
    },
    resetReceiptState: (state) => {
      state.receipts = [];
      state.selectedReceipt = null;
      state.currentReceipt = null;
      state.selectedInvoice = null;
      state.receiptReport = null;
      state.goaMonthlyList = null;
      state.inscriptionMonthlyList = null;
      state.wakeRoomMonthlyList = null;
      state.lastReceiptNumber = null;
      state.lastMiscReceiptNumber = null;
      state.currentPage = 1;
      state.totalReceipts = 0;
      state.totalPages = 0;
      state.filters = {
        fromDate: null,
        toDate: null,
        searchTerm: '',
        receiptCode: '',
        customerName: '',
        paymentMode: null,
        applicationId: '',
        invoiceId: '',
      };
      state.loading = false;
      state.error = null;
      state.lastErrorType = null;
      state.isDataLoaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch receipt by code
      .addCase(fetchReceiptByCode.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchReceiptByCode.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedReceipt = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchReceiptByCode.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Create receipt
      .addCase(createReceipt.pending, (state) => {
        state.isCreating = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(createReceipt.fulfilled, (state, action) => {
        state.isCreating = false;
        state.currentReceipt = action.payload;
        state.receipts.unshift(action.payload);
        state.totalReceipts += 1;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(createReceipt.rejected, (state, action) => {
        state.isCreating = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Create receipt from invoice
      .addCase(createReceiptFromInvoice.pending, (state) => {
        state.isCreating = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(createReceiptFromInvoice.fulfilled, (state, action) => {
        state.isCreating = false;
        state.currentReceipt = action.payload;
        state.receipts.unshift(action.payload);
        state.totalReceipts += 1;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(createReceiptFromInvoice.rejected, (state, action) => {
        state.isCreating = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Fetch last receipt number
      .addCase(fetchLastReceiptNumber.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLastReceiptNumber.fulfilled, (state, action) => {
        state.loading = false;
        state.lastReceiptNumber = action.payload;
      })
      .addCase(fetchLastReceiptNumber.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Fetch last misc receipt number
      .addCase(fetchLastMiscReceiptNumber.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLastMiscReceiptNumber.fulfilled, (state, action) => {
        state.loading = false;
        state.lastMiscReceiptNumber = action.payload;
      })
      .addCase(fetchLastMiscReceiptNumber.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Fetch receipt report
      .addCase(fetchReceiptReport.pending, (state) => {
        state.isFetchingReport = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchReceiptReport.fulfilled, (state, action) => {
        state.isFetchingReport = false;
        state.receiptReport = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchReceiptReport.rejected, (state, action) => {
        state.isFetchingReport = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Fetch GOA monthly list
      .addCase(fetchGOAMonthlyList.pending, (state) => {
        state.isFetchingMonthlyList = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchGOAMonthlyList.fulfilled, (state, action) => {
        state.isFetchingMonthlyList = false;
        state.goaMonthlyList = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchGOAMonthlyList.rejected, (state, action) => {
        state.isFetchingMonthlyList = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Fetch inscription monthly list
      .addCase(fetchInscriptionMonthlyList.pending, (state) => {
        state.isFetchingMonthlyList = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchInscriptionMonthlyList.fulfilled, (state, action) => {
        state.isFetchingMonthlyList = false;
        state.inscriptionMonthlyList = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchInscriptionMonthlyList.rejected, (state, action) => {
        state.isFetchingMonthlyList = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Fetch wake room monthly list
      .addCase(fetchWakeRoomMonthlyList.pending, (state) => {
        state.isFetchingMonthlyList = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchWakeRoomMonthlyList.fulfilled, (state, action) => {
        state.isFetchingMonthlyList = false;
        state.wakeRoomMonthlyList = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchWakeRoomMonthlyList.rejected, (state, action) => {
        state.isFetchingMonthlyList = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Fetch receipts by date range
      .addCase(fetchReceiptsByDateRange.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchReceiptsByDateRange.fulfilled, (state, action) => {
        state.loading = false;
        state.receipts = action.payload.receipts;
        state.totalReceipts = action.payload.total;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.page;
        state.reportSummary = action.payload.summary || null;
        state.isDataLoaded = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchReceiptsByDateRange.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
        state.isDataLoaded = false;
      })
      // Search receipts
      .addCase(searchReceipts.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(searchReceipts.fulfilled, (state, action) => {
        state.loading = false;
        state.receipts = action.payload.receipts;
        state.totalReceipts = action.payload.total;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.page;
        state.reportSummary = action.payload.summary || null;
        state.isDataLoaded = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(searchReceipts.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Fetch invoice by code
      .addCase(fetchInvoiceByCode.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchInvoiceByCode.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedInvoice = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(fetchInvoiceByCode.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Fetch receipt items
      .addCase(fetchReceiptItems.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(fetchReceiptItems.fulfilled, (state, action) => {
        state.itemsLoading = false;
        state.receiptItems = action.payload;
        state.itemsError = null;
      })
      .addCase(fetchReceiptItems.rejected, (state, action) => {
        state.itemsLoading = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.itemsError = errorData.message;
      });
  },
});

export const {
  setSelectedReceipt,
  setCurrentReceipt,
  setSelectedInvoice,
  setCurrentPage,
  setReceiptsPerPage,
  setFilters,
  clearFilters,
  clearError,
  resetReceiptState,
} = receiptSlice.actions;

export default receiptSlice.reducer;

