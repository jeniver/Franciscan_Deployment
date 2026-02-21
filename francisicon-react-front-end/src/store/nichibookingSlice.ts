import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import invoiceService, {
  InvoiceError,
  CreateInvoiceRequest,
  InvoiceDetail,
} from '../services/invoiceService';
import nichiApplicationService, {
  NichiApplicationError,
  CreateNichiApplicationRequest,
  NichiApplicationResponse,
} from '../services/nichiApplicationService';
import { mapNichiBookingToApplicationRequest } from '../utils/nicheApplicationMapper';

// Deceased detail interface (from Inscription)
export interface DeceasedDetail {
  selectBeneficiary: string;
  nameOfDeceased: string;
  dateBorn: string;
  dateDied: string;
  internmentDate: string;
  internmentTime: string;
  deathCertNo: string;
  storagePeriodFrom?: string;
  storagePeriodTo?: string;
}

export interface NichiBookingState {
  // Invoice creation state
  creatingInvoice: boolean;
  invoiceError: string | null;
  lastErrorType: 'auth' | 'network' | 'validation' | 'server' | null;
  createdInvoice: {
    invoiceId?: number;
    invoiceCode?: string;
    invoiceNumber?: string;
  } | null;

  // Nichi Application creation state
  creatingApplication: boolean;
  applicationError: string | null;
  createdApplication: NichiApplicationResponse['data'] | null;

  // Nichi Application loading state
  loadingApplication: boolean;
  loadApplicationError: string | null;
  loadedApplication: NichiApplicationResponse['data'] | null;

  // Form state for Nichi booking
  invoiceNumber: string;
  paymentMode: string;
  nichiQuantity: number;
  nichiUnitPrice: number;
  refDocNumber: string;
  lineTaxPercent: number;
  itemId: number;
  remarks: string;

  // Optional: Applicant details
  applicantName?: string;
  applicantIdNo?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantAddress?: string;
  applicantHomeTel?: string;
  applicantOfficeTel?: string;
  applicantIsCatholic?: boolean;

  // Optional: Nominee details
  nomineeName?: string;
  nomineeIdNo?: string;
  nomineeEmail?: string;
  nomineePhone?: string;
  nomineeAddress?: string;
  nomineeRelationship?: string;
  nomineeHomeTel?: string;
  nomineeOfficeTel?: string;

  // Optional: Beneficiary details
  beneficiaryName?: string;
  beneficiaryIdNo?: string;
  beneficiaryRelationship?: string;
  beneficiaryDateOfBirth?: string;
  beneficiaryIsCatholic?: boolean;

  // Optional: Niche details
  nicheNumber?: string;
  nicheCode?: string;
  nicheId?: number;
  chapelId?: number;
  chapelCode?: string;
  chapelName?: string;
  wallId?: number;
  wallCode?: string;
  wallName?: string;
  rowId?: number;
  rowCode?: string;
  rowNumber?: string;
  rowLevel?: string | number;

  // Details of Deceased (from Inscription - optional)
  deceasedDetails: DeceasedDetail[];

  // Additional Details of Inscription (optional)
  selectedBibleChoiceId: number | null;
  phraseOfChoice: string;
  crossType: string;

  // UI State
  loading: boolean;
  error: string | null;
}

const initialState: NichiBookingState = {
  creatingInvoice: false,
  invoiceError: null,
  lastErrorType: null,
  createdInvoice: null,
  creatingApplication: false,
  applicationError: null,
  createdApplication: null,
  loadingApplication: false,
  loadApplicationError: null,
  loadedApplication: null,
  invoiceNumber: '',
  paymentMode: 'Cash',
  nichiQuantity: 1,
  nichiUnitPrice: 0,
  refDocNumber: '',
  lineTaxPercent: 9, // Default tax percent for Nichi (NAPP)
  itemId: 0, // 0 = not set; resolved from rowLevel or fallback to 6
  remarks: '',
  deceasedDetails: [],
  selectedBibleChoiceId: null,
  phraseOfChoice: '',
  crossType: 'Crucifix',
  loading: false,
  error: null,
};

/**
 * Load Nichi application by application code/number
 * This loads an existing application and populates the form
 */
export const loadNichiApplication = createAsyncThunk<
  NichiApplicationResponse['data'],
  string,
  { rejectValue: { message: string; type: string; statusCode?: number } }
>(
  'nichibooking/loadNichiApplication',
  async (applicationCode: string, { rejectWithValue }) => {
    try {
      if (!applicationCode || !applicationCode.trim()) {
        return rejectWithValue({
          message: 'Application code is required',
          type: 'validation',
          statusCode: 400,
        });
      }

      const response = await nichiApplicationService.getNichiApplication(applicationCode.trim());
      return response.data;
    } catch (error: any) {
      if (error instanceof NichiApplicationError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: error?.message || 'Failed to load Nichi application',
        type: 'server',
      });
    }
  }
);

/**
 * Create Nichi application with full structure
 * This creates a complete application following the niche agreement structure
 */
export const createNichiApplication = createAsyncThunk<
  NichiApplicationResponse['data'],
  Record<string, any>,
  { rejectValue: { message: string; type: string; statusCode?: number } }
>(
  'nichibooking/createNichiApplication',
  async (formData: Record<string, any>, { rejectWithValue }) => {
    try {
      // Map form data to API request structure
      const applicationRequest = mapNichiBookingToApplicationRequest(formData);
      
      // Create the application
      const response = await nichiApplicationService.createNichiApplication(applicationRequest);
      
      const resultData = response.data || {} as any;
      if (!resultData.applicationCode && (response as any).code) {
        resultData.applicationCode = (response as any).code;
      }
      return resultData;
    } catch (error: any) {
      if (error instanceof NichiApplicationError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: error?.message || 'Failed to create Nichi application',
        type: 'server',
      });
    }
  }
);

/**
 * Create invoice for a Nichi booking
 * This creates an invoice with the specified parameters following the NAPP (Nichi) format
 */
export const createNichiBookingInvoice = createAsyncThunk<
  { invoiceId?: number; invoiceCode?: string; invoiceNumber?: string },
  {
    invoiceNumber: string;
    paymentMode: string;
    quantity: number;
    unitAmount: number;
    refDocNumber: string;
    itemId?: number;
    lineTaxPercent?: number;
  },
  { rejectValue: { message: string; type: string; statusCode?: number } }
>(
  'nichibooking/createNichiBookingInvoice',
  async (
    {
      invoiceNumber,
      paymentMode,
      quantity,
      unitAmount,
      refDocNumber,
      itemId,
      lineTaxPercent = 9, // Default tax percent for NAPP
    },
    { rejectWithValue, getState }
  ) => {
    const resolvedItemId = (itemId && itemId > 0)
      ? itemId
      : ((getState() as any).nichibooking?.rowLevel
          ? Number((getState() as any).nichibooking.rowLevel) || 6
          : 6);
    try {
      // Validate inputs
      if (!invoiceNumber || invoiceNumber.trim() === '') {
        return rejectWithValue({
          message: 'Invoice number is required',
          type: 'validation',
        });
      }

      if (!paymentMode || paymentMode.trim() === '') {
        return rejectWithValue({
          message: 'Payment mode is required',
          type: 'validation',
        });
      }

      if (quantity <= 0) {
        return rejectWithValue({
          message: 'Quantity must be greater than 0',
          type: 'validation',
        });
      }

      if (unitAmount < 0) {
        return rejectWithValue({
          message: 'Unit amount cannot be negative',
          type: 'validation',
        });
      }

      if (!refDocNumber || refDocNumber.trim() === '') {
        return rejectWithValue({
          message: 'Reference document number is required',
          type: 'validation',
        });
      }

      // Create invoice detail following NAPP format
      const detail: InvoiceDetail = {
        itemId: resolvedItemId,
        quantity,
        unitAmount,
        refDocNumber,
        refDocName: 'NAPP', // Always "NAPP" for Nichi bookings
        lineTaxPercent,
      };

      // Create invoice request
      const invoiceRequest: CreateInvoiceRequest = {
        paymentMode,
        details: [detail],
      };

      // Call the invoice service
      const result = await invoiceService.createInvoice(invoiceNumber, invoiceRequest);

      return {
        invoiceId: result?.invoiceId,
        invoiceCode: result?.invoiceCode,
        invoiceNumber: invoiceNumber,
      };
    } catch (error: any) {
      if (error instanceof InvoiceError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
        });
      }
      return rejectWithValue({
        message: error?.message || 'Failed to create Nichi booking invoice',
        type: 'server',
      });
    }
  }
);

const nichibookingSlice = createSlice({
  name: 'nichibooking',
  initialState,
  reducers: {
    // Form field updates
    setInvoiceNumber: (state, action: PayloadAction<string>) => {
      state.invoiceNumber = action.payload;
    },
    setPaymentMode: (state, action: PayloadAction<string>) => {
      state.paymentMode = action.payload;
    },
    setNichiQuantity: (state, action: PayloadAction<number>) => {
      state.nichiQuantity = action.payload;
    },
    setNichiUnitPrice: (state, action: PayloadAction<number>) => {
      state.nichiUnitPrice = action.payload;
    },
    setRefDocNumber: (state, action: PayloadAction<string>) => {
      state.refDocNumber = action.payload;
    },
    setLineTaxPercent: (state, action: PayloadAction<number>) => {
      state.lineTaxPercent = action.payload;
    },
    setItemId: (state, action: PayloadAction<number>) => {
      state.itemId = action.payload;
    },
    setRemarks: (state, action: PayloadAction<string>) => {
      state.remarks = action.payload;
    },

    // Applicant details (optional)
    setApplicantName: (state, action: PayloadAction<string>) => {
      state.applicantName = action.payload;
    },
    setApplicantIdNo: (state, action: PayloadAction<string>) => {
      state.applicantIdNo = action.payload;
    },
    setApplicantEmail: (state, action: PayloadAction<string>) => {
      state.applicantEmail = action.payload;
    },
    setApplicantPhone: (state, action: PayloadAction<string>) => {
      state.applicantPhone = action.payload;
    },
    setApplicantAddress: (state, action: PayloadAction<string>) => {
      state.applicantAddress = action.payload;
    },
    setApplicantHomeTel: (state, action: PayloadAction<string>) => {
      state.applicantHomeTel = action.payload;
    },
    setApplicantOfficeTel: (state, action: PayloadAction<string>) => {
      state.applicantOfficeTel = action.payload;
    },
    setApplicantIsCatholic: (state, action: PayloadAction<boolean>) => {
      state.applicantIsCatholic = action.payload;
    },

    // Nominee details (optional)
    setNomineeName: (state, action: PayloadAction<string>) => {
      state.nomineeName = action.payload;
    },
    setNomineeIdNo: (state, action: PayloadAction<string>) => {
      state.nomineeIdNo = action.payload;
    },
    setNomineeEmail: (state, action: PayloadAction<string>) => {
      state.nomineeEmail = action.payload;
    },
    setNomineePhone: (state, action: PayloadAction<string>) => {
      state.nomineePhone = action.payload;
    },
    setNomineeAddress: (state, action: PayloadAction<string>) => {
      state.nomineeAddress = action.payload;
    },
    setNomineeRelationship: (state, action: PayloadAction<string>) => {
      state.nomineeRelationship = action.payload;
    },
    setNomineeHomeTel: (state, action: PayloadAction<string>) => {
      state.nomineeHomeTel = action.payload;
    },
    setNomineeOfficeTel: (state, action: PayloadAction<string>) => {
      state.nomineeOfficeTel = action.payload;
    },

    // Beneficiary details (optional)
    setBeneficiaryName: (state, action: PayloadAction<string>) => {
      state.beneficiaryName = action.payload;
    },
    setBeneficiaryIdNo: (state, action: PayloadAction<string>) => {
      state.beneficiaryIdNo = action.payload;
    },
    setBeneficiaryRelationship: (state, action: PayloadAction<string>) => {
      state.beneficiaryRelationship = action.payload;
    },
    setBeneficiaryDateOfBirth: (state, action: PayloadAction<string>) => {
      state.beneficiaryDateOfBirth = action.payload;
    },
    setBeneficiaryIsCatholic: (state, action: PayloadAction<boolean>) => {
      state.beneficiaryIsCatholic = action.payload;
    },

    // Niche details (optional)
    setNicheNumber: (state, action: PayloadAction<string>) => {
      state.nicheNumber = action.payload;
    },
    setNicheCode: (state, action: PayloadAction<string>) => {
      state.nicheCode = action.payload;
    },
    setNicheId: (state, action: PayloadAction<number>) => {
      state.nicheId = action.payload;
    },
    setChapelId: (state, action: PayloadAction<number>) => {
      state.chapelId = action.payload;
    },
    setChapelCode: (state, action: PayloadAction<string>) => {
      state.chapelCode = action.payload;
    },
    setChapelName: (state, action: PayloadAction<string>) => {
      state.chapelName = action.payload;
    },
    setWallId: (state, action: PayloadAction<number>) => {
      state.wallId = action.payload;
    },
    setWallCode: (state, action: PayloadAction<string>) => {
      state.wallCode = action.payload;
    },
    setWallName: (state, action: PayloadAction<string>) => {
      state.wallName = action.payload;
    },
    setRowId: (state, action: PayloadAction<number>) => {
      state.rowId = action.payload;
    },
    setRowCode: (state, action: PayloadAction<string>) => {
      state.rowCode = action.payload;
    },
    setRowNumber: (state, action: PayloadAction<string>) => {
      state.rowNumber = action.payload;
    },
    setRowLevel: (state, action: PayloadAction<string | number>) => {
      state.rowLevel = action.payload;
    },

    // Deceased Details (optional)
    setDeceasedDetails: (state, action: PayloadAction<DeceasedDetail[]>) => {
      state.deceasedDetails = action.payload;
    },
    addDeceasedDetail: (state, action: PayloadAction<DeceasedDetail>) => {
      state.deceasedDetails.push(action.payload);
    },
    removeDeceasedDetail: (state, action: PayloadAction<number>) => {
      state.deceasedDetails = state.deceasedDetails.filter((_, index) => index !== action.payload);
    },
    updateDeceasedDetail: (state, action: PayloadAction<{ index: number; detail: Partial<DeceasedDetail> }>) => {
      const { index, detail } = action.payload;
      if (state.deceasedDetails[index]) {
        state.deceasedDetails[index] = { ...state.deceasedDetails[index], ...detail };
      }
    },

    // Additional Details of Inscription (optional)
    setSelectedBibleChoiceId: (state, action: PayloadAction<number | null>) => {
      state.selectedBibleChoiceId = action.payload;
    },
    setPhraseOfChoice: (state, action: PayloadAction<string>) => {
      state.phraseOfChoice = action.payload;
    },
    setCrossType: (state, action: PayloadAction<string>) => {
      state.crossType = action.payload;
    },

    // Clear errors
    clearError: (state) => {
      state.error = null;
      state.invoiceError = null;
      state.lastErrorType = null;
    },

    // Clear invoice result
    clearInvoiceResult: (state) => {
      state.createdInvoice = null;
      state.invoiceError = null;
    },

    // Clear application result
    clearApplicationResult: (state) => {
      state.createdApplication = null;
      state.applicationError = null;
    },

    // Clear loaded application
    clearLoadedApplication: (state) => {
      state.loadedApplication = null;
      state.loadApplicationError = null;
    },

    // Reset form
    resetForm: (state) => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    // Create invoice
    builder
      .addCase(createNichiBookingInvoice.pending, (state) => {
        state.creatingInvoice = true;
        state.invoiceError = null;
        state.lastErrorType = null;
        state.loading = true;
      })
      .addCase(createNichiBookingInvoice.fulfilled, (state, action) => {
        state.creatingInvoice = false;
        state.loading = false;
        state.createdInvoice = action.payload;
        state.invoiceError = null;
        state.lastErrorType = null;
      })
      .addCase(createNichiBookingInvoice.rejected, (state, action) => {
        state.creatingInvoice = false;
        state.loading = false;
        state.invoiceError = action.payload?.message || 'Failed to create invoice';
        state.lastErrorType = (action.payload?.type as any) || 'server';
        state.error = action.payload?.message || 'Failed to create invoice';
      });

    // Create Nichi application
    builder
      .addCase(createNichiApplication.pending, (state) => {
        state.creatingApplication = true;
        state.applicationError = null;
        state.lastErrorType = null;
        state.loading = true;
      })
      .addCase(createNichiApplication.fulfilled, (state, action) => {
        state.creatingApplication = false;
        state.loading = false;
        state.createdApplication = action.payload;
        state.applicationError = null;
        state.lastErrorType = null;
      })
      .addCase(createNichiApplication.rejected, (state, action) => {
        state.creatingApplication = false;
        state.loading = false;
        state.applicationError = action.payload?.message || 'Failed to create application';
        state.lastErrorType = (action.payload?.type as any) || 'server';
        state.error = action.payload?.message || 'Failed to create application';
      });

    // Load Nichi application
    builder
      .addCase(loadNichiApplication.pending, (state) => {
        state.loadingApplication = true;
        state.loadApplicationError = null;
        state.lastErrorType = null;
        state.loading = true;
      })
      .addCase(loadNichiApplication.fulfilled, (state, action) => {
        state.loadingApplication = false;
        state.loading = false;
        state.loadedApplication = action.payload;
        state.loadApplicationError = null;
        state.lastErrorType = null;
      })
      .addCase(loadNichiApplication.rejected, (state, action) => {
        state.loadingApplication = false;
        state.loading = false;
        state.loadApplicationError = action.payload?.message || 'Failed to load application';
        state.lastErrorType = (action.payload?.type as any) || 'server';
        state.error = action.payload?.message || 'Failed to load application';
      });
  },
});

export const {
  setInvoiceNumber,
  setPaymentMode,
  setNichiQuantity,
  setNichiUnitPrice,
  setRefDocNumber,
  setLineTaxPercent,
  setItemId,
  setRemarks,
  setApplicantName,
  setApplicantIdNo,
  setApplicantEmail,
  setApplicantPhone,
  setApplicantAddress,
  setApplicantHomeTel,
  setApplicantOfficeTel,
  setApplicantIsCatholic,
  setNomineeName,
  setNomineeIdNo,
  setNomineeEmail,
  setNomineePhone,
  setNomineeAddress,
  setNomineeRelationship,
  setNomineeHomeTel,
  setNomineeOfficeTel,
  setBeneficiaryName,
  setBeneficiaryIdNo,
  setBeneficiaryRelationship,
  setBeneficiaryDateOfBirth,
  setBeneficiaryIsCatholic,
  setNicheNumber,
  setNicheCode,
  setNicheId,
  setChapelId,
  setChapelCode,
  setChapelName,
  setWallId,
  setWallCode,
  setWallName,
  setRowId,
  setRowCode,
  setRowNumber,
  setRowLevel,
  setDeceasedDetails,
  addDeceasedDetail,
  removeDeceasedDetail,
  updateDeceasedDetail,
  setSelectedBibleChoiceId,
  setPhraseOfChoice,
  setCrossType,
  clearError,
  clearInvoiceResult,
  clearApplicationResult,
  clearLoadedApplication,
  resetForm,
} = nichibookingSlice.actions;

export default nichibookingSlice.reducer;

