import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import nicheAgreementService, { NicheAgreementResponse, NicheAgreementError } from '../services/nicheAgreementService';
import nicheApplicationService, {
  NicheApplicationRequest,
  NicheApplicationResponse,
  NicheApplicationError,
  NicheApplicationListItem,
  NicheApplicationListResponse,
  SearchNicheApplicationParams
} from '../services/nicheApplicationService';
import { mapApiResponseToFormData } from '../utils/dataMapper';
import { mapFormDataToNicheApplicationRequest, mapApiApplicationToFormData, normalizeNicheApplicationListItem } from '../utils/nicheApplicationMapper';

export type ApplicationViewMode = 'form' | 'table';

export interface ApplicationListFilters {
  applicationCode: string;
  applicantName: string;
  nomineeName: string;
  fromDate: string;
  toDate: string;
}

export interface ApplicationListPagination {
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

const defaultListFilters: ApplicationListFilters = {
  applicationCode: '',
  applicantName: '',
  nomineeName: '',
  fromDate: '',
  toDate: ''
};

const defaultListPagination: ApplicationListPagination = {
  page: 1,
  currentPage: 1,
  pageSize:10,
  total: 0,
  totalPages: 0,
  itemsRetrieved: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  remainingPages: 0,
  remainingRecords: 0,
  currentPageStart: 0,
  currentPageEnd: 0
};

export interface ApplicationState {
  currentStep: number;
  formData: Record<string, any>;
  applicationNumber: string;
  loading: boolean;
  error: string | null;
  isDataLoaded: boolean;
  lastErrorType: 'auth' | 'network' | 'validation' | 'server' | null;
  loadedApplicationSource: 'nicheAgreement' | 'nicheApplication' | null;
  loadedApplicationRaw: any;
  // Niche application creation state
  isCreatingApplication: boolean;
  createdApplication: NicheApplicationResponse | null;
  creationError: string | null;
  // Validation state
  validationErrors: Record<string, string>;
  isValidating: boolean;
  lastValidatedStep: number | null;
  viewMode: ApplicationViewMode;
  applicationList: NicheApplicationListItem[];
  applicationListLoading: boolean;
  applicationListError: string | null;
  applicationListFilters: ApplicationListFilters;
  applicationListPagination: ApplicationListPagination;
  // Store created applications for quick access
  createdApplications: NicheApplicationListItem[];
  // View/Edit mode state
  isViewMode: boolean;
  isEditMode: boolean;
  // Agreement modal state
  isAgreementModalOpen: boolean;
  agreementModalData: any | null;
}

const initialState: ApplicationState = {
  currentStep: 1,
  formData: {},
  applicationNumber: '',
  loading: false,
  error: null,
  isDataLoaded: false,
  lastErrorType: null,
  loadedApplicationSource: null,
  loadedApplicationRaw: null,
  // Niche application creation state
  isCreatingApplication: false,
  createdApplication: null,
  creationError: null,
  // Validation state
  validationErrors: {},
  isValidating: false,
  lastValidatedStep: null,
  viewMode: 'form',
  applicationList: [],
  applicationListLoading: false,
  applicationListError: null,
  applicationListFilters: { ...defaultListFilters },
  applicationListPagination: { ...defaultListPagination },
  createdApplications: [],
  isViewMode: false,
  isEditMode: false,
  // Agreement modal state
  isAgreementModalOpen: false,
  agreementModalData: null,
};

interface LoadApplicationDataSuccess {
  formData: Record<string, any>;
  rawData: any;
  source: 'nicheAgreement' | 'nicheApplication';
  applicationNumber?: string;
}

// Async thunk to load application data
export const loadApplicationData = createAsyncThunk<
  LoadApplicationDataSuccess,
  string,
  { rejectValue: { message: string; type: string; statusCode: number } }
>(
  'application/loadApplicationData',
  async (applicationNumber: string, { rejectWithValue }) => {
    const trimmedNumber = applicationNumber.trim();

    if (trimmedNumber.length === 0) {
      return rejectWithValue({
        message: 'Application number is required',
        type: 'validation',
        statusCode: 400
      });
    }

    try {
      if (/^NAPP/i.test(trimmedNumber)) {
        // Use the direct GET endpoint by code instead of search
        try {
          const response = await nicheApplicationService.getNicheApplication(trimmedNumber);
          
          if (response.data) {
            const normalizedRecord = normalizeNicheApplicationListItem(response.data);
            const formData = mapApiApplicationToFormData(normalizedRecord);

            return {
              formData,
              rawData: normalizedRecord,
              source: 'nicheApplication',
              applicationNumber: normalizedRecord.applicationNumber || normalizedRecord.applicationCode || trimmedNumber
            };
          } else {
            return rejectWithValue({
              message: `Niche application ${trimmedNumber} was not found`,
              type: 'validation',
              statusCode: 404
            });
          }
        } catch (error: any) {
          // If direct GET fails, fall back to search
          const searchResponse = await nicheApplicationService.searchNicheApplications({
            applicationCode: trimmedNumber,
            page: 1,
            pageSize: 1
          });

          const record = searchResponse.data?.[0];

          if (!record) {
            return rejectWithValue({
              message: `Niche application ${trimmedNumber} was not found`,
              type: 'validation',
              statusCode: 404
            });
          }

          const normalizedRecord = normalizeNicheApplicationListItem(record);
          const formData = mapApiApplicationToFormData(normalizedRecord);

          return {
            formData,
            rawData: normalizedRecord,
            source: 'nicheApplication',
            applicationNumber: normalizedRecord.applicationNumber || normalizedRecord.applicationCode || trimmedNumber
          };
        }
      }

      const response: NicheAgreementResponse = await nicheAgreementService.getNicheAgreement(trimmedNumber);
      const mappedData = mapApiResponseToFormData(response);

      return {
        formData: mappedData,
        rawData: response,
        source: 'nicheAgreement',
        applicationNumber: response.data?.applicationCode || trimmedNumber
      };
    } catch (error: any) {
      if (error instanceof NicheApplicationError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode ?? 400
        });
      }

      if (error instanceof NicheAgreementError) {
        // Return error with type information
        return rejectWithValue({
          message: error.message,
          type: error.isAuthError ? 'auth' : error.isNetworkError ? 'network' : 'server',
          statusCode: error.statusCode
        });
      }

      return rejectWithValue({
        message: error.message || 'Failed to load application data',
        type: 'server',
        statusCode: error.statusCode ?? 500
      });
    }
  }
);

// Async thunk to create niche application
export const createNicheApplication = createAsyncThunk(
  'application/createNicheApplication',
  async (formData: Record<string, any>, { getState, rejectWithValue }) => {
    try {
      // Get the current state to access existing applications
      const state: any = getState();
      const existingApplications = state?.application?.applicationList || [];
      
      // Map form data to API request format
      const mappedRequest = mapFormDataToNicheApplicationRequest(formData);
      
      // Extract niche number/code from the form data to generate application ID
      // Priority: nicheNumber (the actual niche identifier) > nicheCode > nicheDetails.nicheCode
      const nicheIdentifier = formData.nicheNumber || formData.nicheCode || formData.nicheDetails?.nicheCode || '';
      
      // For display purposes, also keep track of what we're using
      const sourceField = formData.nicheNumber ? 'nicheNumber' : 
                         formData.nicheCode ? 'nicheCode' : 
                         formData.nicheDetails?.nicheCode ? 'nicheDetails.nicheCode' : 'none';
      
      // Create a new request object to avoid mutation issues
      let applicationRequest = { ...mappedRequest };
      
      // If we have a niche identifier, we can generate an application ID based on it
      if (nicheIdentifier) {
        try {
          // Import the application ID generator
          const { generateApplicationId } = await import('../utils/applicationIdGenerator');
          
          // Generate the application ID based on niche identifier
          const generatedAppId = generateApplicationId(nicheIdentifier, existingApplications);
          
          // Add the generated application ID to the request
          // Note: We're adding this to the request object, but the backend API
          // should handle the actual application ID generation
          // The generated ID is mainly for frontend tracking and display
          applicationRequest = {
            ...mappedRequest,
            applicationCode: generatedAppId,
            // Also add it as 'code' in case the API expects that
            code: generatedAppId
          };
          
          console.log('Generated application ID:', generatedAppId, 'for niche identifier:', nicheIdentifier, '(from field:', sourceField, ')');
        } catch (error) {
          console.warn('Failed to generate application ID, using default request:', error);
          // If ID generation fails, use the original mapped request
          applicationRequest = mappedRequest;
        }
      } else {
        console.log('No niche identifier found for application ID generation');
      }
      
      // Create the niche application
      const response = await nicheApplicationService.createNicheApplication(applicationRequest);
      return response;
    } catch (error: any) {
      if (error instanceof NicheApplicationError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode
        });
      } else {
        return rejectWithValue({
          message: error.message || 'Failed to create niche application',
          type: 'server',
          statusCode: 500
        });
      }
    }
  }
);

interface FetchNicheApplicationsArgs {
  filters?: Partial<ApplicationListFilters>;
  pagination?: Partial<ApplicationListPagination>;
  skipTotal?: boolean; // Skip COUNT query for maximum performance on large datasets
}

export const fetchNicheApplications = createAsyncThunk<
  {
    response: NicheApplicationListResponse;
    appliedFilters: ApplicationListFilters;
    appliedPagination: ApplicationListPagination;
  },
  FetchNicheApplicationsArgs | undefined,
  { state: { application: ApplicationState }; rejectValue: { message: string } }
>(
  'application/fetchNicheApplications',
  async (args, { getState, rejectWithValue }) => {
    const { application } = getState();

    const mergedFilters: ApplicationListFilters = {
      ...application.applicationListFilters,
      ...args?.filters
    };

    const mergedPagination: ApplicationListPagination = {
      ...application.applicationListPagination,
      ...args?.pagination
    };

    // Always use fetchAll=false for paginated requests to ensure proper backend pagination
    const requestParams: SearchNicheApplicationParams = {
      page: mergedPagination.page,
      pageSize: mergedPagination.pageSize,
      fetchAll: false, // Always false for paginated requests
      skipTotal: args?.skipTotal, // Optional: skip COUNT query for performance
      applicationCode: mergedFilters.applicationCode || undefined,
      applicantName: mergedFilters.applicantName || undefined,
      nomineeName: mergedFilters.nomineeName || undefined,
      fromDate: mergedFilters.fromDate || undefined,
      toDate: mergedFilters.toDate || undefined
    };

    try {
      const response = await nicheApplicationService.searchNicheApplications(requestParams);
      return {
        response,
        appliedFilters: mergedFilters,
        appliedPagination: mergedPagination
      };
    } catch (error: any) {
      return rejectWithValue({
        message: error?.message || 'Failed to fetch niche applications'
      });
    }
  }
);

// Async thunk to update niche application
export const updateNicheApplication = createAsyncThunk<
  NicheApplicationResponse,
  { applicationCode: string; applicationData: Partial<NicheApplicationRequest> },
  { rejectValue: { message: string; type: string; statusCode: number } }
>(
  'application/updateNicheApplication',
  async ({ applicationCode, applicationData }, { rejectWithValue }) => {
    try {
      const response = await nicheApplicationService.updateNicheApplication(applicationCode, applicationData);
      return response;
    } catch (error: any) {
      if (error instanceof NicheApplicationError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode ?? 400
        });
      } else {
        return rejectWithValue({
          message: error.message || 'Failed to update niche application',
          type: 'server',
          statusCode: 500
        });
      }
    }
  }
);

// Async thunk to delete niche application
export const deleteNicheApplication = createAsyncThunk<
  { success: boolean; message: string },
  string,
  { rejectValue: { message: string; type: string; statusCode: number } }
>(
  'application/deleteNicheApplication',
  async (applicationCode: string, { rejectWithValue }) => {
    try {
      const response = await nicheApplicationService.deleteNicheApplication(applicationCode);
      return response;
    } catch (error: any) {
      if (error instanceof NicheApplicationError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode ?? 400
        });
      } else {
        return rejectWithValue({
          message: error.message || 'Failed to delete niche application',
          type: 'server',
          statusCode: 500
        });
      }
    }
  }
);

export const applicationSlice = createSlice({
  name: 'application',
  initialState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    updateFormData: (state, action: PayloadAction<Record<string, any>>) => {
      state.formData = { ...state.formData, ...action.payload };
      // Clear validation errors for updated fields
      const updatedFields = Object.keys(action.payload);
      updatedFields.forEach(field => {
        if (state.validationErrors[field]) {
          delete state.validationErrors[field];
        }
      });
    },
    setApplicationNumber: (state, action: PayloadAction<string>) => {
      state.applicationNumber = action.payload;
    },
    resetApplication: (state) => {
      state.currentStep = 1; // Start at step 1 (Niche Details) for new applications
      state.formData = {};
      state.applicationNumber = '';
      state.loading = false;
      state.error = null;
      state.isDataLoaded = false;
      state.lastErrorType = null;
      state.loadedApplicationSource = null;
      state.loadedApplicationRaw = null;
      state.validationErrors = {};
      state.isValidating = false;
      state.lastValidatedStep = null;
      state.createdApplication = null;
      // Don't clear createdApplications - keep them for reference
      // Don't clear viewMode - keep current view
      // Don't clear applicationList - keep it for reference
    },
    clearPreviousApplicationData: (state) => {
      // Clear only form-related data, keep created applications
      state.currentStep = 1; // Start at step 1 (Niche Details) for new applications
      state.formData = {};
      state.applicationNumber = '';
      state.createdApplication = null;
      state.validationErrors = {};
      state.isValidating = false;
      state.lastValidatedStep = null;
      state.isDataLoaded = false; // Ensure isDataLoaded is false for new applications
      state.loadedApplicationSource = null;
      state.loadedApplicationRaw = null;
    },
    clearError: (state) => {
      state.error = null;
      state.lastErrorType = null;
    },
    setValidationErrors: (state, action: PayloadAction<Record<string, string>>) => {
      state.validationErrors = action.payload;
    },
    clearValidationErrors: (state) => {
      state.validationErrors = {};
    },
    setValidating: (state, action: PayloadAction<boolean>) => {
      state.isValidating = action.payload;
    },
    setLastValidatedStep: (state, action: PayloadAction<number | null>) => {
      state.lastValidatedStep = action.payload;
    },
    setApplicationViewMode: (state, action: PayloadAction<ApplicationViewMode>) => {
      state.viewMode = action.payload;
    },
    updateApplicationListFilters: (state, action: PayloadAction<Partial<ApplicationListFilters>>) => {
      state.applicationListFilters = {
        ...state.applicationListFilters,
        ...action.payload
      };
    },
    resetApplicationListState: (state) => {
      // Clear all list-related state including cache
      state.applicationList = [];
      state.applicationListLoading = false;
      state.applicationListError = null;
      state.applicationListFilters = { ...defaultListFilters };
      state.applicationListPagination = { ...defaultListPagination };
    },
    clearApplicationListCache: (state) => {
      // Clear only the list data, keep filters and pagination for user convenience
      state.applicationList = [];
      state.applicationListError = null;
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
    openAgreementModal: (state, action: PayloadAction<any>) => {
      state.isAgreementModalOpen = true;
      state.agreementModalData = action.payload;
    },
    closeAgreementModal: (state) => {
      state.isAgreementModalOpen = false;
      state.agreementModalData = null;
    },
    refreshApplicationList: (state) => {
      // Trigger a refresh by resetting loading state
      // Actual refresh should happen in the component by calling fetchNicheApplications
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadApplicationData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
        state.loadedApplicationSource = null;
        state.loadedApplicationRaw = null;
      })
      .addCase(loadApplicationData.fulfilled, (state, action) => {
        state.loading = false;
        state.formData = action.payload.formData;
        state.applicationNumber = action.payload.applicationNumber || state.applicationNumber;
        state.isDataLoaded = true;
        state.error = null;
        state.lastErrorType = null;
        state.loadedApplicationSource = action.payload.source;
        state.loadedApplicationRaw = action.payload.rawData;
      })
      .addCase(loadApplicationData.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
        state.isDataLoaded = false;
        state.loadedApplicationSource = null;
        state.loadedApplicationRaw = null;
      })
      // Create niche application cases
      .addCase(createNicheApplication.pending, (state) => {
        state.isCreatingApplication = true;
        state.creationError = null;
      })
      .addCase(createNicheApplication.fulfilled, (state, action) => {
        state.isCreatingApplication = false;
        // Use the full data structure directly - it contains all fields including nicheDetails, consentForms, beneficiaries
        const applicationData = action.payload.data;
        state.createdApplication = {
          ...action.payload,
          data: applicationData
        };
        state.creationError = null;
        // Update application number with the created application code
        const appCode = action.payload.code || action.payload.data?.applicationNumber || '';
        state.applicationNumber = appCode;
        
        // Store the created application in the list for quick access
        if (applicationData) {
          const normalizedApp = normalizeNicheApplicationListItem(applicationData);
          // Add to createdApplications list (prepend to show latest first)
          state.createdApplications = [normalizedApp, ...state.createdApplications];
          // Keep only last 50 applications to prevent memory issues
          if (state.createdApplications.length > 50) {
            state.createdApplications = state.createdApplications.slice(0, 50);
          }
          
          // Add to applicationList if not already present
          const existingIndex = state.applicationList.findIndex(
            app => app.applicationCode === normalizedApp.applicationCode
          );
          if (existingIndex === -1) {
            // Add to the beginning of the list to show the newest first
            state.applicationList = [normalizedApp, ...state.applicationList];
          } else {
            // Update the existing entry
            state.applicationList[existingIndex] = normalizedApp;
          }
        }
      })
      .addCase(createNicheApplication.rejected, (state, action) => {
        state.isCreatingApplication = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.creationError = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      .addCase(fetchNicheApplications.pending, (state) => {
        state.applicationListLoading = true;
        state.applicationListError = null;
        // Clear previous error state when starting new request
      })
      .addCase(fetchNicheApplications.fulfilled, (state, action) => {
        state.applicationListLoading = false;
        const rawList = action.payload.response.data ?? [];
        
        // Clear and update list with new data
        state.applicationList = rawList.map(item => normalizeNicheApplicationListItem(item));
        state.applicationListFilters = action.payload.appliedFilters;

        // Extract enhanced pagination from API response
        const apiPagination = action.payload.response.pagination;
        const appliedPagination = action.payload.appliedPagination;
        
        if (apiPagination) {
          // Use page as source of truth (prefer apiPagination.page over currentPage)
          const actualPage = apiPagination.page ?? appliedPagination.page;
          const actualPageSize = apiPagination.pageSize ?? appliedPagination.pageSize;
          const actualTotal = apiPagination.total ?? appliedPagination.total;
          
          // Calculate totalPages correctly
          const calculatedTotalPages = actualTotal > 0 ? Math.max(1, Math.ceil(actualTotal / actualPageSize)) : 1;
          const actualTotalPages = apiPagination.totalPages ?? appliedPagination.totalPages ?? calculatedTotalPages;
          
          // Use actualPage for all calculations (not currentPage which may be inconsistent)
          const calculatedCurrentPageStart = (actualPage - 1) * actualPageSize + 1;
          const calculatedCurrentPageEnd = Math.min(actualPage * actualPageSize, actualTotal);
          
          // Use enhanced pagination data from API, but recalculate based on actualPage
          state.applicationListPagination = {
            page: actualPage,
            currentPage: actualPage, // Ensure currentPage matches page
            pageSize: actualPageSize,
            total: actualTotal,
            totalPages: actualTotalPages,
            itemsRetrieved: apiPagination.itemsRetrieved ?? rawList.length,
            hasNextPage: apiPagination.hasNextPage ?? (actualPage < actualTotalPages),
            hasPreviousPage: apiPagination.hasPreviousPage ?? (actualPage > 1),
            remainingPages: apiPagination.remainingPages ?? Math.max(0, actualTotalPages - actualPage),
            remainingRecords: apiPagination.remainingRecords ?? Math.max(0, actualTotal - (actualPage * actualPageSize)),
            currentPageStart: apiPagination.currentPageStart ?? calculatedCurrentPageStart,
            currentPageEnd: apiPagination.currentPageEnd ?? calculatedCurrentPageEnd
          };
        } else {
          // Fallback to basic pagination if API doesn't provide enhanced fields
          state.applicationListPagination = {
            ...appliedPagination,
            currentPage: appliedPagination.page,
            itemsRetrieved: rawList.length,
            hasNextPage: appliedPagination.page < appliedPagination.totalPages,
            hasPreviousPage: appliedPagination.page > 1,
            remainingPages: Math.max(0, appliedPagination.totalPages - appliedPagination.page),
            remainingRecords: Math.max(0, appliedPagination.total - (appliedPagination.page * appliedPagination.pageSize)),
            currentPageStart: (appliedPagination.page - 1) * appliedPagination.pageSize + 1,
            currentPageEnd: Math.min(appliedPagination.page * appliedPagination.pageSize, appliedPagination.total)
          };
        }

        // Clear error on success
        state.applicationListError = action.payload.response.success === false
          ? action.payload.response.message || 'No applications found.'
          : null;
      })
      .addCase(fetchNicheApplications.rejected, (state, action) => {
        state.applicationListLoading = false;
        const errorMessage = (action.payload as { message?: string } | undefined)?.message
          || action.error.message
          || 'Failed to fetch niche applications';
        state.applicationListError = errorMessage;
        
        // Clear list on error to prevent showing stale data
        state.applicationList = [];
        // Reset pagination to prevent invalid page states
        state.applicationListPagination = {
          ...defaultListPagination,
          pageSize: state.applicationListPagination.pageSize // Keep pageSize preference
        };
      })
      // Update niche application cases
      .addCase(updateNicheApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(updateNicheApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.lastErrorType = null;
        // Update form data with the updated application data if available
        if (action.payload.data) {
          const normalizedApp = normalizeNicheApplicationListItem(action.payload.data);
          const formData = mapApiApplicationToFormData(normalizedApp);
          state.formData = formData;
          state.loadedApplicationRaw = normalizedApp;
          
          // Update the application in the applicationList if present
          const applicationCode = action.meta.arg.applicationCode;
          const existingIndex = state.applicationList.findIndex(
            app => app.applicationCode === applicationCode
          );
          if (existingIndex !== -1) {
            state.applicationList[existingIndex] = normalizedApp;
          }
          
          // Also update in createdApplications if present
          const createdAppIndex = state.createdApplications.findIndex(
            app => app.applicationCode === applicationCode
          );
          if (createdAppIndex !== -1) {
            state.createdApplications[createdAppIndex] = normalizedApp;
          }
        }
      })
      .addCase(updateNicheApplication.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Delete niche application cases
      .addCase(deleteNicheApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(deleteNicheApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.lastErrorType = null;
        // Clear the application data after successful deletion
        state.formData = {};
        state.applicationNumber = '';
        state.isDataLoaded = false;
        state.loadedApplicationRaw = null;
        
        // Remove the deleted application from the application list
        if (action.meta.arg) {
          const applicationCode = action.meta.arg;
          state.applicationList = state.applicationList.filter(
            app => app.applicationCode !== applicationCode
          );
          
          // Also remove from createdApplications if present
          state.createdApplications = state.createdApplications.filter(
            app => app.applicationCode !== applicationCode
          );
        }
      })
      .addCase(deleteNicheApplication.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      });
  },
});

export const { 
  setCurrentStep, 
  updateFormData, 
  setApplicationNumber, 
  resetApplication,
  clearPreviousApplicationData,
  clearError,
  setValidationErrors,
  clearValidationErrors,
  setValidating,
  setLastValidatedStep,
  openAgreementModal,
  closeAgreementModal,
  setApplicationViewMode,
  updateApplicationListFilters,
  resetApplicationListState,
  clearApplicationListCache,
  setViewMode,
  setEditMode,
  clearViewEditMode,
  refreshApplicationList
} = applicationSlice.actions;

export default applicationSlice.reducer;