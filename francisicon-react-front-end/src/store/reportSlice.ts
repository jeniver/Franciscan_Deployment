import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import reportService, {
  ReportInfo,
  MonthlyReportParams,
  InvoiceReceiptReportParams,
  ChapelReportParams,
  ReportError,
} from '../services/reportService';

export interface ReportState {
  // Available reports
  availableReports: ReportInfo[];
  loadingReports: boolean;
  reportsError: string | null;

  // Current report generation state
  generatingReport: boolean;
  reportError: string | null;
  lastErrorType: 'auth' | 'network' | 'validation' | 'server' | null;

  // Report history (optional - for tracking generated reports)
  reportHistory: Array<{
    id: string;
    type: string;
    generatedAt: string;
    params?: any;
  }>;
}

const initialState: ReportState = {
  availableReports: [],
  loadingReports: false,
  reportsError: null,
  generatingReport: false,
  reportError: null,
  lastErrorType: null,
  reportHistory: [],
};

// Async thunks
export const fetchAvailableReports = createAsyncThunk(
  'report/fetchAvailableReports',
  async (_, { rejectWithValue }) => {
    try {
      const reports = await reportService.getAvailableReports();
      return reports;
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateInvoiceReceiptReport = createAsyncThunk(
  'report/generateInvoiceReceiptReport',
  async (params: InvoiceReceiptReportParams, { rejectWithValue }) => {
    try {
      const blob = await reportService.getInvoiceReceiptReport(params);
      return { blob, params, type: 'invoice-receipt' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateInscriptionReport = createAsyncThunk(
  'report/generateInscriptionReport',
  async (insCode: string, { rejectWithValue }) => {
    try {
      const blob = await reportService.getInscriptionReport(insCode);
      return { blob, params: { insCode }, type: 'inscription' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateMonthlyReceiptsReport = createAsyncThunk(
  'report/generateMonthlyReceiptsReport',
  async (params: MonthlyReportParams, { rejectWithValue }) => {
    try {
      const blob = await reportService.getMonthlyReceiptsReport(params);
      return { blob, params, type: 'monthly-receipts' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateMonthlyInscriptionsReport = createAsyncThunk(
  'report/generateMonthlyInscriptionsReport',
  async (params: MonthlyReportParams, { rejectWithValue }) => {
    try {
      const blob = await reportService.getMonthlyInscriptionsReport(params);
      return { blob, params, type: 'monthly-inscriptions' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateMonthlyWakeRoomsReport = createAsyncThunk(
  'report/generateMonthlyWakeRoomsReport',
  async (params: MonthlyReportParams, { rejectWithValue }) => {
    try {
      const blob = await reportService.getMonthlyWakeRoomsReport(params);
      return { blob, params, type: 'monthly-wakerooms' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateMonthlyGOAReport = createAsyncThunk(
  'report/generateMonthlyGOAReport',
  async (params: MonthlyReportParams, { rejectWithValue }) => {
    try {
      const blob = await reportService.getMonthlyGOAReport(params);
      return { blob, params, type: 'monthly-goa' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateNichesSoldToBothReport = createAsyncThunk(
  'report/generateNichesSoldToBothReport',
  async (_, { rejectWithValue }) => {
    try {
      const blob = await reportService.getNichesSoldToBothReport();
      return { blob, params: {}, type: 'niches-sold-both' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateNichesSoldToCatholicReport = createAsyncThunk(
  'report/generateNichesSoldToCatholicReport',
  async (_, { rejectWithValue }) => {
    try {
      const blob = await reportService.getNichesSoldToCatholicReport();
      return { blob, params: {}, type: 'niches-sold-catholic' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateNichesSoldToNonCatholicReport = createAsyncThunk(
  'report/generateNichesSoldToNonCatholicReport',
  async (_, { rejectWithValue }) => {
    try {
      const blob = await reportService.getNichesSoldToNonCatholicReport();
      return { blob, params: {}, type: 'niches-sold-noncatholic' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateRenewalNichesReport = createAsyncThunk(
  'report/generateRenewalNichesReport',
  async (_, { rejectWithValue }) => {
    try {
      const blob = await reportService.getRenewalNichesReport();
      return { blob, params: {}, type: 'niches-renewal' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateSameAddressNichesReport = createAsyncThunk(
  'report/generateSameAddressNichesReport',
  async (_, { rejectWithValue }) => {
    try {
      const blob = await reportService.getSameAddressNichesReport();
      return { blob, params: {}, type: 'niches-same-address' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateChapelLevelReport = createAsyncThunk(
  'report/generateChapelLevelReport',
  async (params: ChapelReportParams, { rejectWithValue }) => {
    try {
      const blob = await reportService.getChapelLevelReport(params);
      return { blob, params, type: 'chapel-level' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateChapelMonthReport = createAsyncThunk(
  'report/generateChapelMonthReport',
  async (params: ChapelReportParams, { rejectWithValue }) => {
    try {
      const blob = await reportService.getChapelMonthReport(params);
      return { blob, params, type: 'chapel-month' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateChapelVacancyReport = createAsyncThunk(
  'report/generateChapelVacancyReport',
  async (chapel: string, { rejectWithValue }) => {
    try {
      const blob = await reportService.getChapelVacancyReport(chapel);
      return { blob, params: { chapel }, type: 'chapel-vacancy' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateBeneficiariesListReport = createAsyncThunk(
  'report/generateBeneficiariesListReport',
  async (_, { rejectWithValue }) => {
    try {
      const blob = await reportService.getBeneficiariesListReport();
      return { blob, params: {}, type: 'beneficiaries-list' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const generateGSTReport = createAsyncThunk(
  'report/generateGSTReport',
  async (params: MonthlyReportParams, { rejectWithValue }) => {
    try {
      const blob = await reportService.getGSTReport(params);
      return { blob, params, type: 'gst' };
    } catch (error: any) {
      if (error instanceof ReportError) {
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

export const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    clearError: (state) => {
      state.reportError = null;
      state.lastErrorType = null;
    },
    clearReportsError: (state) => {
      state.reportsError = null;
    },
    addReportToHistory: (state, action: PayloadAction<{ type: string; params?: any }>) => {
      state.reportHistory.unshift({
        id: Date.now().toString(),
        type: action.payload.type,
        generatedAt: new Date().toISOString(),
        params: action.payload.params,
      });
      // Keep only last 50 reports
      if (state.reportHistory.length > 50) {
        state.reportHistory = state.reportHistory.slice(0, 50);
      }
    },
    clearReportHistory: (state) => {
      state.reportHistory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch available reports
      .addCase(fetchAvailableReports.pending, (state) => {
        state.loadingReports = true;
        state.reportsError = null;
      })
      .addCase(fetchAvailableReports.fulfilled, (state, action) => {
        state.loadingReports = false;
        state.availableReports = action.payload;
        state.reportsError = null;
      })
      .addCase(fetchAvailableReports.rejected, (state, action) => {
        state.loadingReports = false;
        const errorData = action.payload as { message: string; type: string; statusCode?: number };
        state.reportsError = errorData.message;
      })
      // Generic report generation handlers
      .addMatcher(
        (action) => action.type.startsWith('report/generate') && action.type.endsWith('/pending'),
        (state) => {
          state.generatingReport = true;
          state.reportError = null;
          state.lastErrorType = null;
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('report/generate') && action.type.endsWith('/fulfilled'),
        (state, action: any) => {
          state.generatingReport = false;
          state.reportError = null;
          state.lastErrorType = null;
          // Add to history
          if (action.payload?.type) {
            state.reportHistory.unshift({
              id: Date.now().toString(),
              type: action.payload.type,
              generatedAt: new Date().toISOString(),
              params: action.payload.params,
            });
            if (state.reportHistory.length > 50) {
              state.reportHistory = state.reportHistory.slice(0, 50);
            }
          }
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('report/generate') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.generatingReport = false;
          const errorData = action.payload as { message: string; type: string; statusCode?: number };
          state.reportError = errorData.message;
          state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
        }
      );
  },
});

export const {
  clearError,
  clearReportsError,
  addReportToHistory,
  clearReportHistory,
} = reportSlice.actions;

export default reportSlice.reducer;

