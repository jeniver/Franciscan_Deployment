import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import gateOfLifeService, {
  GateOfLifeError,
  GateOfLifeListItem,
  GateOfLifeListResponse,
  SearchGateOfLifeParams,
  CreateGateOfLifeRequest,
  UpdateGateOfLifeRequest,
  GateOfLifeResponse
} from '../services/gateOfLifeService';

export interface GateOfLifeListFilters {
  applicationCode: string;
  applicantName: string;
  applicantIdNo: string;
  nameToEngrave: string;
  bookedFrom: string;
  bookedTo: string;
  searchTerm: string;
}

export interface GateOfLifeListPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const defaultListFilters: GateOfLifeListFilters = {
  applicationCode: '',
  applicantName: '',
  applicantIdNo: '',
  nameToEngrave: '',
  bookedFrom: '',
  bookedTo: '',
  searchTerm: ''
};

const defaultListPagination: GateOfLifeListPagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
};

export interface GateOfLifeState {
  // Application form state
  formData: Record<string, any>;
  applicationCode: string;
  loading: boolean;
  error: string | null;
  isDataLoaded: boolean;
  lastErrorType: 'auth' | 'network' | 'validation' | 'server' | null;
  
  // List state
  applicationList: GateOfLifeListItem[];
  applicationListLoading: boolean;
  applicationListError: string | null;
  applicationListFilters: GateOfLifeListFilters;
  applicationListPagination: GateOfLifeListPagination;
  
  // View/Edit mode state
  isViewMode: boolean;
  isEditMode: boolean;
  
  // Created application
  createdApplication: GateOfLifeResponse | null;
  isCreatingApplication: boolean;
  creationError: string | null;
}

const initialState: GateOfLifeState = {
  formData: {},
  applicationCode: '',
  loading: false,
  error: null,
  isDataLoaded: false,
  lastErrorType: null,
  applicationList: [],
  applicationListLoading: false,
  applicationListError: null,
  applicationListFilters: { ...defaultListFilters },
  applicationListPagination: { ...defaultListPagination },
  isViewMode: false,
  isEditMode: false,
  createdApplication: null,
  isCreatingApplication: false,
  creationError: null
};

interface FetchGateOfLifeApplicationsArgs {
  filters?: Partial<GateOfLifeListFilters>;
  pagination?: Partial<GateOfLifeListPagination>;
}

export const fetchGateOfLifeApplications = createAsyncThunk<
  {
    response: GateOfLifeListResponse;
    appliedFilters: GateOfLifeListFilters;
    appliedPagination: GateOfLifeListPagination;
  },
  FetchGateOfLifeApplicationsArgs | undefined,
  { state: { gateOfLife: GateOfLifeState }; rejectValue: { message: string } }
>(
  'gateOfLife/fetchGateOfLifeApplications',
  async (args, { getState, rejectWithValue }) => {
    const { gateOfLife } = getState();

    const mergedFilters: GateOfLifeListFilters = {
      ...gateOfLife.applicationListFilters,
      ...args?.filters
    };

    const mergedPagination: GateOfLifeListPagination = {
      ...gateOfLife.applicationListPagination,
      ...args?.pagination
    };

    const requestParams: SearchGateOfLifeParams = {
      page: mergedPagination.page,
      pageSize: mergedPagination.pageSize,
      applicationCode: mergedFilters.applicationCode,
      applicantName: mergedFilters.applicantName,
      applicantIdNo: mergedFilters.applicantIdNo,
      nameToEngrave: mergedFilters.nameToEngrave,
      bookedFrom: mergedFilters.bookedFrom,
      bookedTo: mergedFilters.bookedTo,
      searchTerm: mergedFilters.searchTerm
    };

    try {
      const response = await gateOfLifeService.searchGateOfLifeApplications(requestParams);
      return {
        response,
        appliedFilters: mergedFilters,
        appliedPagination: mergedPagination
      };
    } catch (error: any) {
      return rejectWithValue({
        message: error?.message || 'Failed to fetch gate of life applications'
      });
    }
  }
);

export const loadGateOfLifeApplication = createAsyncThunk<
  GateOfLifeResponse,
  string,
  { rejectValue: { message: string; type: string; statusCode: number } }
>(
  'gateOfLife/loadGateOfLifeApplication',
  async (applicationCode: string, { rejectWithValue }) => {
    const trimmedCode = applicationCode.trim();

    if (trimmedCode.length === 0) {
      return rejectWithValue({
        message: 'Application code is required',
        type: 'validation',
        statusCode: 400
      });
    }

    try {
      const response = await gateOfLifeService.getGateOfLifeApplication(trimmedCode);
      return response;
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode ?? 400
        });
      }

      return rejectWithValue({
        message: error.message || 'Failed to load gate of life application',
        type: 'server',
        statusCode: error.statusCode ?? 500
      });
    }
  }
);

export const createGateOfLifeApplication = createAsyncThunk<
  GateOfLifeResponse,
  CreateGateOfLifeRequest,
  { rejectValue: { message: string; type: string; statusCode: number } }
>(
  'gateOfLife/createGateOfLifeApplication',
  async (applicationData, { rejectWithValue }) => {
    try {
      const response = await gateOfLifeService.createGateOfLifeApplication(applicationData);
      return response;
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode ?? 400
        });
      }

      return rejectWithValue({
        message: error.message || 'Failed to create gate of life application',
        type: 'server',
        statusCode: 500
      });
    }
  }
);

export const updateGateOfLifeApplication = createAsyncThunk<
  GateOfLifeResponse,
  { applicationCode: string; applicationData: UpdateGateOfLifeRequest },
  { rejectValue: { message: string; type: string; statusCode: number } }
>(
  'gateOfLife/updateGateOfLifeApplication',
  async ({ applicationCode, applicationData }, { rejectWithValue }) => {
    try {
      const response = await gateOfLifeService.updateGateOfLifeApplication(applicationCode, applicationData);
      return response;
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode ?? 400
        });
      }

      return rejectWithValue({
        message: error.message || 'Failed to update gate of life application',
        type: 'server',
        statusCode: 500
      });
    }
  }
);

export const deleteGateOfLifeApplication = createAsyncThunk<
  { success: boolean; message: string },
  string,
  { rejectValue: { message: string; type: string; statusCode: number } }
>(
  'gateOfLife/deleteGateOfLifeApplication',
  async (applicationCode: string, { rejectWithValue }) => {
    try {
      const response = await gateOfLifeService.deleteGateOfLifeApplication(applicationCode);
      return response;
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode ?? 400
        });
      }

      return rejectWithValue({
        message: error.message || 'Failed to delete gate of life application',
        type: 'server',
        statusCode: 500
      });
    }
  }
);

export const gateOfLifeSlice = createSlice({
  name: 'gateOfLife',
  initialState,
  reducers: {
    updateFormData: (state, action: PayloadAction<Record<string, any>>) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    setApplicationCode: (state, action: PayloadAction<string>) => {
      state.applicationCode = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.lastErrorType = null;
    },
    updateApplicationListFilters: (state, action: PayloadAction<Partial<GateOfLifeListFilters>>) => {
      state.applicationListFilters = {
        ...state.applicationListFilters,
        ...action.payload
      };
    },
    resetApplicationListState: (state) => {
      state.applicationList = [];
      state.applicationListLoading = false;
      state.applicationListError = null;
      state.applicationListFilters = { ...defaultListFilters };
      state.applicationListPagination = { ...defaultListPagination };
    },
    setViewMode: (state, action: PayloadAction<boolean>) => {
      state.isViewMode = action.payload;
      state.isEditMode = false;
    },
    setEditMode: (state, action: PayloadAction<boolean>) => {
      state.isEditMode = action.payload;
      state.isViewMode = false;
    },
    clearViewEditMode: (state) => {
      state.isViewMode = false;
      state.isEditMode = false;
    },
    resetForm: (state) => {
      state.formData = {};
      state.applicationCode = '';
      state.loading = false;
      state.error = null;
      state.isDataLoaded = false;
      state.lastErrorType = null;
      state.createdApplication = null;
      state.creationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Load application
      .addCase(loadGateOfLifeApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadGateOfLifeApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.formData = action.payload.data as any;
        state.applicationCode = action.payload.data.code || action.payload.data.applicationNumber || state.applicationCode;
        state.isDataLoaded = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadGateOfLifeApplication.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
        state.isDataLoaded = false;
      })
      // Fetch list
      .addCase(fetchGateOfLifeApplications.pending, (state) => {
        state.applicationListLoading = true;
        state.applicationListError = null;
      })
      .addCase(fetchGateOfLifeApplications.fulfilled, (state, action) => {
        state.applicationListLoading = false;
        state.applicationList = action.payload.response.data ?? [];
        state.applicationListFilters = action.payload.appliedFilters;

        const pagination = action.payload.response.pagination ?? action.payload.appliedPagination;
        state.applicationListPagination = {
          page: pagination.page ?? action.payload.appliedPagination.page,
          pageSize: pagination.pageSize ?? action.payload.appliedPagination.pageSize,
          total: pagination.total ?? action.payload.appliedPagination.total,
          totalPages: pagination.totalPages ?? action.payload.appliedPagination.totalPages
        };

        state.applicationListError = action.payload.response.success === false
          ? action.payload.response.message || 'No applications found.'
          : null;
      })
      .addCase(fetchGateOfLifeApplications.rejected, (state, action) => {
        state.applicationListLoading = false;
        state.applicationListError = (action.payload as { message?: string } | undefined)?.message
          || action.error.message
          || 'Failed to fetch gate of life applications';
      })
      // Create application
      .addCase(createGateOfLifeApplication.pending, (state) => {
        state.isCreatingApplication = true;
        state.creationError = null;
      })
      .addCase(createGateOfLifeApplication.fulfilled, (state, action) => {
        state.isCreatingApplication = false;
        state.createdApplication = action.payload;
        state.creationError = null;
        state.applicationCode = action.payload.data.code || action.payload.data.applicationNumber || '';
      })
      .addCase(createGateOfLifeApplication.rejected, (state, action) => {
        state.isCreatingApplication = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.creationError = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Update application
      .addCase(updateGateOfLifeApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(updateGateOfLifeApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.lastErrorType = null;
        if (action.payload.data) {
          state.formData = action.payload.data as any;
        }
      })
      .addCase(updateGateOfLifeApplication.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Delete application
      .addCase(deleteGateOfLifeApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(deleteGateOfLifeApplication.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        state.lastErrorType = null;
        state.formData = {};
        state.applicationCode = '';
        state.isDataLoaded = false;
      })
      .addCase(deleteGateOfLifeApplication.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      });
  }
});

export const {
  updateFormData,
  setApplicationCode,
  clearError,
  updateApplicationListFilters,
  resetApplicationListState,
  setViewMode,
  setEditMode,
  clearViewEditMode,
  resetForm
} = gateOfLifeSlice.actions;

export default gateOfLifeSlice.reducer;

