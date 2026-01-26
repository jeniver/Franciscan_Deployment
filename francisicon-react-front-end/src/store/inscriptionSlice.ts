import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import inscriptionService, {
  InscriptionError,
  InscriptionItem,
  CreateInvoiceRequest,
  BibleChoice,
  InscriptionItemsResponse
} from '../services/inscriptionService';

export interface DeceasedDetail {
  selectBeneficiary: string;
  nameOfDeceased: string;
  dateBorn: string;
  dateDied: string;
  internmentDate: string;
  internmentTime: string;
  deathCertNo: string;
}

export interface InscriptionState {
  // Form state
  inscriptionRequestNo: string;
  nicheApplicationCode: string;
  
  // Create/Update inscription state
  creatingInscription: boolean;
  updatingInscription: boolean;
  inscriptionError: string | null;
  
  // Applicant/Contact Details
  applicantName: string;
  nricPassportNo: string;
  block: string;
  street: string;
  unitNo: string;
  postalCode: string;
  mobile: string;
  homeTel: string;
  emailId: string;

  // Deceased Details
  deceasedDetails: DeceasedDetail[];

  // Inscription Items
  inscriptionItems: InscriptionItem[];
  itemsLoading: boolean;
  itemsError: string | null;

  // Invoice creation state
  creatingInvoice: boolean;
  invoiceError: string | null;
  createdInvoice: {
    invoiceId: number;
    invoiceCode: string;
  } | null;

  // Bible Choices
  bibleChoices: BibleChoice[];
  bibleChoicesLoading: boolean;
  bibleChoicesError: string | null;
  selectedBibleChoiceId: number | null;
  phraseOfChoice: string;

  // UI State
  loading: boolean;
  error: string | null;
  lastErrorType: 'auth' | 'network' | 'validation' | 'server' | null;
}

const initialState: InscriptionState = {
  inscriptionRequestNo: '',
  nicheApplicationCode: '',
  applicantName: '',
  nricPassportNo: '',
  block: '',
  street: '',
  unitNo: '',
  postalCode: '',
  mobile: '',
  homeTel: '',
  emailId: '',
  deceasedDetails: [],
  inscriptionItems: [],
  itemsLoading: false,
  itemsError: null,
  creatingInvoice: false,
  invoiceError: null,
  createdInvoice: null,
  bibleChoices: [],
  bibleChoicesLoading: false,
  bibleChoicesError: null,
  selectedBibleChoiceId: null,
  phraseOfChoice: '',
  loading: false,
  error: null,
  lastErrorType: null,
  creatingInscription: false,
  updatingInscription: false,
  inscriptionError: null
};

/**
 * Fetch inscription items for a given document code
 * Returns full response including items, applicant, deceased details, and additional details
 */
export const fetchInscriptionItems = createAsyncThunk<
  InscriptionItemsResponse['data'],
  string,
  { rejectValue: { message: string; type: string; statusCode?: number } }
>(
  'inscription/fetchInscriptionItems',
  async (code: string, { rejectWithValue }) => {
    try {
      const data = await inscriptionService.getInscriptionItems(code);
      return data;
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode
        });
      }
      return rejectWithValue({
        message: error?.message || 'Failed to fetch inscription items',
        type: 'server'
      });
    }
  }
);

/**
 * Create invoice for an inscription application
 */
export const createInscriptionInvoice = createAsyncThunk<
  { invoiceId: number; invoiceCode: string },
  { code: string; body?: CreateInvoiceRequest },
  { rejectValue: { message: string; type: string; statusCode?: number; code?: string } }
>(
  'inscription/createInscriptionInvoice',
  async ({ code, body }, { rejectWithValue }) => {
    try {
      const result = await inscriptionService.createInscriptionInvoice(code, body);
      return result;
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode,
          code: error.code
        });
      }
      return rejectWithValue({
        message: error?.message || 'Failed to create invoice',
        type: 'server'
      });
    }
  }
);

/**
 * Fetch Bible inscription choices
 */
export const fetchBibleChoices = createAsyncThunk<
  BibleChoice[],
  void,
  { rejectValue: { message: string; type: string; statusCode?: number } }
>(
  'inscription/fetchBibleChoices',
  async (_, { rejectWithValue }) => {
    try {
      const choices = await inscriptionService.getBibleChoices();
      return choices;
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode
        });
      }
      return rejectWithValue({
        message: error?.message || 'Failed to fetch bible choices',
        type: 'server'
      });
    }
  }
);

/**
 * Create a new inscription application
 */
export const createInscription = createAsyncThunk<
  { code: string; message: string },
  {
    applicant: {
      name: string;
      nricPassportNo: string;
      address: {
        block: string;
        blockNo: string;
        street: string;
        streetName: string;
        unitNo: string;
        postalCode: string;
      };
      mobile: string;
      homeTel: string;
      emailId: string;
    };
    deceasedDetails?: Array<{
      name: string;
      dateOfDeath: string;
      dateOfBirth: string;
      internmentDate: string;
      deathCertificateNo: string;
      birthYear: string;
      inscriptionText: string;
    }>;
    inscription?: {
      bibleInscriptionChoiceId: number | null;
      bibleInscriptionText: string;
      additionalInscriptionPhrase: string;
      remarks: string;
      nicheApplicationCode: string;
      nicheBookingId: number | null;
    };
  },
  { rejectValue: { message: string; type: string; statusCode?: number } }
>(
  'inscription/createInscription',
  async (data, { rejectWithValue }) => {
    try {
      const result = await inscriptionService.createInscription(data);
      return result;
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode
        });
      }
      return rejectWithValue({
        message: error?.message || 'Failed to create inscription',
        type: 'server'
      });
    }
  }
);

/**
 * Update an existing inscription application
 */
export const updateInscription = createAsyncThunk<
  { code: string; message: string },
  {
    code: string;
    applicant: {
      name: string;
      nricPassportNo: string;
      address: {
        block: string;
        blockNo: string;
        street: string;
        streetName: string;
        unitNo: string;
        postalCode: string;
      };
      mobile: string;
      homeTel: string;
      emailId: string;
    };
    deceasedDetails?: Array<{
      name: string;
      dateOfDeath: string;
      dateOfBirth: string;
      internmentDate: string;
      deathCertificateNo: string;
      birthYear: string;
      inscriptionText: string;
    }>;
    inscription?: {
      bibleInscriptionChoiceId: number | null;
      bibleInscriptionText: string;
      additionalInscriptionPhrase: string;
      remarks: string;
    };
  },
  { rejectValue: { message: string; type: string; statusCode?: number } }
>(
  'inscription/updateInscription',
  async ({ code, ...data }, { rejectWithValue }) => {
    try {
      const result = await inscriptionService.updateInscription(code, data);
      return result;
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode
        });
      }
      return rejectWithValue({
        message: error?.message || 'Failed to update inscription',
        type: 'server'
      });
    }
  }
);

const inscriptionSlice = createSlice({
  name: 'inscription',
  initialState,
  reducers: {
    // Form field updates
    setInscriptionRequestNo: (state, action: PayloadAction<string>) => {
      state.inscriptionRequestNo = action.payload;
    },
    setNicheApplicationCode: (state, action: PayloadAction<string>) => {
      state.nicheApplicationCode = action.payload;
    },
    setApplicantName: (state, action: PayloadAction<string>) => {
      state.applicantName = action.payload;
    },
    setNricPassportNo: (state, action: PayloadAction<string>) => {
      state.nricPassportNo = action.payload;
    },
    setBlock: (state, action: PayloadAction<string>) => {
      state.block = action.payload;
    },
    setStreet: (state, action: PayloadAction<string>) => {
      state.street = action.payload;
    },
    setUnitNo: (state, action: PayloadAction<string>) => {
      state.unitNo = action.payload;
    },
    setPostalCode: (state, action: PayloadAction<string>) => {
      state.postalCode = action.payload;
    },
    setMobile: (state, action: PayloadAction<string>) => {
      state.mobile = action.payload;
    },
    setHomeTel: (state, action: PayloadAction<string>) => {
      state.homeTel = action.payload;
    },
    setEmailId: (state, action: PayloadAction<string>) => {
      state.emailId = action.payload;
    },

    // Deceased Details
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

    // Bible Choice updates
    setSelectedBibleChoiceId: (state, action: PayloadAction<number | null>) => {
      state.selectedBibleChoiceId = action.payload;
      // Auto-update phrase when bible choice is selected
      if (action.payload !== null) {
        const selectedChoice = state.bibleChoices.find(c => c.bibleInscriptionChoiceId === action.payload);
        if (selectedChoice) {
          state.phraseOfChoice = selectedChoice.bibleInscriptionChoiceNoValue;
        }
      }
    },
    setPhraseOfChoice: (state, action: PayloadAction<string>) => {
      state.phraseOfChoice = action.payload;
      // Clear selected bible choice if user manually edits the phrase
      if (action.payload !== '') {
        const matchingChoice = state.bibleChoices.find(
          c => c.bibleInscriptionChoiceNoValue === action.payload
        );
        if (!matchingChoice) {
          state.selectedBibleChoiceId = null;
        }
      }
    },

    // Clear errors
    clearError: (state) => {
      state.error = null;
      state.lastErrorType = null;
      state.itemsError = null;
      state.invoiceError = null;
    },

    // Clear invoice result
    clearInvoiceResult: (state) => {
      state.createdInvoice = null;
      state.invoiceError = null;
    },

    // Reset form
    resetForm: (state) => {
      return { ...initialState };
    }
  },
  extraReducers: (builder) => {
    // Fetch inscription items
    builder
      .addCase(fetchInscriptionItems.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(fetchInscriptionItems.fulfilled, (state, action) => {
        state.itemsLoading = false;
        const data = action.payload;
        
        // Map items
        state.inscriptionItems = data.items || [];
        
        // Map inscription request number
        if (data.inscriptionRequestNo) {
          state.inscriptionRequestNo = data.inscriptionRequestNo;
        }
        
        // Map applicant details
        if (data.applicant) {
          state.applicantName = data.applicant.name || '';
          state.nricPassportNo = data.applicant.nricPassportNo || '';
          state.mobile = data.applicant.mobile || '';
          state.homeTel = data.applicant.homeTel || '';
          state.emailId = data.applicant.emailId || '';
          
          // Map address
          if (data.applicant.address) {
            state.block = data.applicant.address.blockNo || data.applicant.address.block || '';
            state.street = data.applicant.address.streetName || data.applicant.address.street || '';
            state.unitNo = data.applicant.address.unitNo || '';
            state.postalCode = data.applicant.address.postalCode || '';
          }
        }
        
        // Map deceased details
        if (data.deceasedDetails && Array.isArray(data.deceasedDetails)) {
          state.deceasedDetails = data.deceasedDetails.map((deceased) => {
            // Parse dates from API format to input format (YYYY-MM-DD)
            // API can return: YYYY-MM-DD or DD-MMM-YYYY or YYYY-MM-DD HH:MM
            const parseDate = (dateStr: string): string => {
              if (!dateStr) return '';
              try {
                // Remove time portion if present (e.g., "2026-01-07 12:00" -> "2026-01-07")
                const dateOnly = dateStr.split(' ')[0].trim();
                
                // Check if already in YYYY-MM-DD format (e.g., "2026-01-07")
                const ymdPattern = /^\d{4}-\d{2}-\d{2}$/;
                if (ymdPattern.test(dateOnly)) {
                  return dateOnly;
                }
                
                // Try parsing DD-MMM-YYYY format (e.g., "02-Jun-2025")
                const parts = dateOnly.split('-');
                if (parts.length === 3) {
                  // Check if middle part is a month name
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const monthIndex = monthNames.indexOf(parts[1]);
                  if (monthIndex !== -1) {
                    const day = parts[0].padStart(2, '0');
                    const month = String(monthIndex + 1).padStart(2, '0');
                    const year = parts[2];
                    return `${year}-${month}-${day}`;
                  }
                }
                
                // If can't parse, try to use as-is or parse with Date object
                const parsed = new Date(dateOnly);
                if (!isNaN(parsed.getTime())) {
                  const year = parsed.getFullYear();
                  const month = String(parsed.getMonth() + 1).padStart(2, '0');
                  const day = String(parsed.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                }
                
                return dateOnly;
              } catch {
                return dateStr;
              }
            };
            
            // Parse internment date and time
            const internmentDateStr = deceased.internmentDate || '';
            let internmentDate = '';
            let internmentTime = '12:00'; // Default time
            
            if (internmentDateStr) {
              // Check if it includes time (e.g., "2026-01-07 12:00" or "2056-01-07 12:00")
              const dateTimeParts = internmentDateStr.split(' ');
              internmentDate = parseDate(dateTimeParts[0]);
              if (dateTimeParts.length > 1) {
                internmentTime = dateTimeParts[1] || '12:00';
              }
            }
            
            return {
              selectBeneficiary: '',
              nameOfDeceased: deceased.name || '',
              dateBorn: parseDate(deceased.dateOfBirth || ''),
              dateDied: parseDate(deceased.dateOfDeath || ''),
              internmentDate: internmentDate,
              internmentTime: internmentTime,
              deathCertNo: deceased.deathCertificateNo || ''
            };
          });
          
          // If no deceased details, add empty one
          if (state.deceasedDetails.length === 0) {
            state.deceasedDetails = [{
              selectBeneficiary: '',
              nameOfDeceased: '',
              dateBorn: '',
              dateDied: '',
              internmentDate: '',
              internmentTime: '12:00',
              deathCertNo: ''
            }];
          }
        }
        
        // Map additional details
        if (data.additionalDetails) {
          // Map Bible choice
          if (data.additionalDetails.bibleInscriptionChoiceId) {
            state.selectedBibleChoiceId = data.additionalDetails.bibleInscriptionChoiceId;
            // Auto-update phrase if bible choice is set
            const selectedChoice = state.bibleChoices.find(
              c => c.bibleInscriptionChoiceId === data.additionalDetails.bibleInscriptionChoiceId
            );
            if (selectedChoice) {
              state.phraseOfChoice = selectedChoice.bibleInscriptionChoiceNoValue;
            }
          }
          
          // Map phrase of choice (prioritize additionalInscriptionPhrase over bibleInscriptionText)
          if (data.additionalDetails.additionalInscriptionPhrase) {
            state.phraseOfChoice = data.additionalDetails.additionalInscriptionPhrase;
          } else if (data.additionalDetails.bibleInscriptionText) {
            state.phraseOfChoice = data.additionalDetails.bibleInscriptionText;
          }
          
          // Map niche application code if available
          if (data.additionalDetails.nicheApplicationCode) {
            state.nicheApplicationCode = data.additionalDetails.nicheApplicationCode;
          }
        }
        
        // CRITICAL: Ensure nicheApplicationCode is set from the code parameter if not already set
        // This handles cases where the API doesn't return it in additionalDetails
        if (!state.nicheApplicationCode && action.meta.arg) {
          state.nicheApplicationCode = action.meta.arg;
        }
        
        state.itemsError = null;
      })
      .addCase(fetchInscriptionItems.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload?.message || 'Failed to fetch inscription items';
        state.lastErrorType = (action.payload?.type as any) || 'server';
      });

    // Fetch Bible choices
    builder
      .addCase(fetchBibleChoices.pending, (state) => {
        state.bibleChoicesLoading = true;
        state.bibleChoicesError = null;
      })
      .addCase(fetchBibleChoices.fulfilled, (state, action) => {
        state.bibleChoicesLoading = false;
        state.bibleChoices = action.payload;
        state.bibleChoicesError = null;
      })
      .addCase(fetchBibleChoices.rejected, (state, action) => {
        state.bibleChoicesLoading = false;
        state.bibleChoicesError = action.payload?.message || 'Failed to fetch bible choices';
        state.lastErrorType = (action.payload?.type as any) || 'server';
      });

    // Create invoice
    builder
      .addCase(createInscriptionInvoice.pending, (state) => {
        state.creatingInvoice = true;
        state.invoiceError = null;
      })
      .addCase(createInscriptionInvoice.fulfilled, (state, action) => {
        state.creatingInvoice = false;
        state.createdInvoice = action.payload;
        state.invoiceError = null;
      })
      .addCase(createInscriptionInvoice.rejected, (state, action) => {
        state.creatingInvoice = false;
        state.invoiceError = action.payload?.message || 'Failed to create invoice';
        state.lastErrorType = (action.payload?.type as any) || 'server';
      });

    // Create inscription
    builder
      .addCase(createInscription.pending, (state) => {
        state.creatingInscription = true;
        state.inscriptionError = null;
      })
      .addCase(createInscription.fulfilled, (state, action) => {
        state.creatingInscription = false;
        state.inscriptionRequestNo = action.payload.code;
        state.inscriptionError = null;
      })
      .addCase(createInscription.rejected, (state, action) => {
        state.creatingInscription = false;
        state.inscriptionError = action.payload?.message || 'Failed to create inscription';
        state.lastErrorType = (action.payload?.type as any) || 'server';
      });

    // Update inscription
    builder
      .addCase(updateInscription.pending, (state) => {
        state.updatingInscription = true;
        state.inscriptionError = null;
      })
      .addCase(updateInscription.fulfilled, (state, action) => {
        state.updatingInscription = false;
        state.inscriptionRequestNo = action.payload.code;
        state.inscriptionError = null;
      })
      .addCase(updateInscription.rejected, (state, action) => {
        state.updatingInscription = false;
        state.inscriptionError = action.payload?.message || 'Failed to update inscription';
        state.lastErrorType = (action.payload?.type as any) || 'server';
      });
  }
});

export const {
  setInscriptionRequestNo,
  setNicheApplicationCode,
  setApplicantName,
  setNricPassportNo,
  setBlock,
  setStreet,
  setUnitNo,
  setPostalCode,
  setMobile,
  setHomeTel,
  setEmailId,
  setDeceasedDetails,
  addDeceasedDetail,
  removeDeceasedDetail,
  updateDeceasedDetail,
  setSelectedBibleChoiceId,
  setPhraseOfChoice,
  clearError,
  clearInvoiceResult,
  resetForm
} = inscriptionSlice.actions;

export default inscriptionSlice.reducer;

