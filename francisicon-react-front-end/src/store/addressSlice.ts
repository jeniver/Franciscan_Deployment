import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { addressService, AddressLookupResult } from '../services/addressService';

export interface AddressState {
  // Address fields
  block: string;
  blockNo: string;
  streetName: string;
  unitNo: string;
  postalCode: string;
  country: string;
  
  // Auto-fill state
  isLookingUp: boolean;
  lookupError: string | null;
  lastLookupResult: AddressLookupResult | null;
}

const initialState: AddressState = {
  block: '',
  blockNo: '',
  streetName: '',
  unitNo: '',
  postalCode: '',
  country: 'Singapore',
  isLookingUp: false,
  lookupError: null,
  lastLookupResult: null
};

/**
 * Async thunk to lookup address by postal code
 */
export const lookupAddressByPostalCode = createAsyncThunk(
  'address/lookupByPostalCode',
  async (postalCode: string, { rejectWithValue }) => {
    try {
      const result = await addressService.searchByPostalCode(postalCode);
      if (!result) {
        return rejectWithValue('No address found for this postal code');
      }
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to lookup address');
    }
  }
);

/**
 * Async thunk to lookup address by block number and street name
 */
export const lookupAddressByBlockAndStreet = createAsyncThunk(
  'address/lookupByBlockAndStreet',
  async ({ blockNo, streetName }: { blockNo: string; streetName: string }, { rejectWithValue }) => {
    try {
      const result = await addressService.searchByBlockAndStreet(blockNo, streetName);
      if (!result) {
        return rejectWithValue('No address found for this block and street');
      }
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to lookup address');
    }
  }
);

const addressSlice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    setBlock: (state, action: PayloadAction<string>) => {
      state.block = action.payload;
    },
    setBlockNo: (state, action: PayloadAction<string>) => {
      state.blockNo = action.payload;
    },
    setStreetName: (state, action: PayloadAction<string>) => {
      state.streetName = action.payload;
    },
    setUnitNo: (state, action: PayloadAction<string>) => {
      state.unitNo = action.payload;
    },
    setPostalCode: (state, action: PayloadAction<string>) => {
      state.postalCode = action.payload;
    },
    setCountry: (state, action: PayloadAction<string>) => {
      state.country = action.payload;
    },
    setAddressFields: (state, action: PayloadAction<Partial<AddressState>>) => {
      return { ...state, ...action.payload };
    },
    clearAddress: (state) => {
      return {
        ...initialState,
        country: state.country // Keep country selection
      };
    },
    clearLookupError: (state) => {
      state.lookupError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Lookup by postal code
      .addCase(lookupAddressByPostalCode.pending, (state) => {
        state.isLookingUp = true;
        state.lookupError = null;
      })
      .addCase(lookupAddressByPostalCode.fulfilled, (state, action) => {
        state.isLookingUp = false;
        state.lastLookupResult = action.payload;
        
        // Auto-fill address fields from lookup result
        if (action.payload.blockNo) {
          state.blockNo = action.payload.blockNo;
        }
        if (action.payload.streetName) {
          state.streetName = action.payload.streetName;
        }
        if (action.payload.unitNo) {
          state.unitNo = action.payload.unitNo;
        }
        if (action.payload.postalCode) {
          state.postalCode = action.payload.postalCode;
        }
        if (action.payload.country) {
          state.country = action.payload.country;
        }
        // Block letter is not available from API, so we don't auto-fill it
      })
      .addCase(lookupAddressByPostalCode.rejected, (state, action) => {
        state.isLookingUp = false;
        state.lookupError = action.payload as string || 'Failed to lookup address';
      })
      // Lookup by block and street
      .addCase(lookupAddressByBlockAndStreet.pending, (state) => {
        state.isLookingUp = true;
        state.lookupError = null;
      })
      .addCase(lookupAddressByBlockAndStreet.fulfilled, (state, action) => {
        state.isLookingUp = false;
        state.lastLookupResult = action.payload;
        
        // Auto-fill address fields from lookup result
        if (action.payload.blockNo) {
          state.blockNo = action.payload.blockNo;
        }
        if (action.payload.streetName) {
          state.streetName = action.payload.streetName;
        }
        if (action.payload.unitNo) {
          state.unitNo = action.payload.unitNo;
        }
        if (action.payload.postalCode) {
          state.postalCode = action.payload.postalCode;
        }
        if (action.payload.country) {
          state.country = action.payload.country;
        }
      })
      .addCase(lookupAddressByBlockAndStreet.rejected, (state, action) => {
        state.isLookingUp = false;
        state.lookupError = action.payload as string || 'Failed to lookup address';
      });
  }
});

export const {
  setBlock,
  setBlockNo,
  setStreetName,
  setUnitNo,
  setPostalCode,
  setCountry,
  setAddressFields,
  clearAddress,
  clearLookupError
} = addressSlice.actions;

export default addressSlice.reducer;

