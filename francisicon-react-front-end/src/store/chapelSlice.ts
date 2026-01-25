import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import chapelService, { Chapel, ChapelError } from '../services/chapelService';

export interface ChapelState {
  chapels: Chapel[];
  selectedChapel: Chapel | null;
  loading: boolean;
  error: string | null;
  lastErrorType: 'auth' | 'network' | 'validation' | 'server' | null;
  isDataLoaded: boolean;
  
  // Request tracking to prevent duplicates
  lastLoadedChurchId: number | null;
  isRequestInProgress: boolean;
}

const initialState: ChapelState = {
  chapels: [],
  selectedChapel: null,
  loading: false,
  error: null,
  lastErrorType: null,
  isDataLoaded: false,
  lastLoadedChurchId: null,
  isRequestInProgress: false,
};

// Async thunk to load chapels with duplicate prevention
export const loadChapels = createAsyncThunk(
  'chapel/loadChapels',
  async (churchId: number = 1, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { chapel: ChapelState };
      
      // Check if we already have data for this church and request is not in progress
      if (state.chapel.lastLoadedChurchId === churchId && 
          state.chapel.isDataLoaded && 
          !state.chapel.isRequestInProgress) {
        console.log(`Chapel data for church ${churchId} already loaded, skipping request`);
        return { skip: true, churchId };
      }
      
      // Check if request is already in progress for this church
      if (state.chapel.isRequestInProgress && state.chapel.lastLoadedChurchId === churchId) {
        console.log(`Request already in progress for church ${churchId}, skipping duplicate`);
        return { skip: true, churchId };
      }

      console.log(`Loading chapels for church ${churchId}`);
      const response = await chapelService.getChapelsByChurch(churchId);
      return { ...response.data, churchId };
    } catch (error: any) {
      if (error instanceof ChapelError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const
      });
    }
  }
);

// Async thunk to load specific chapel
export const loadChapelById = createAsyncThunk(
  'chapel/loadChapelById',
  async (chapelId: number, { rejectWithValue }) => {
    try {
      const chapel = await chapelService.getChapelById(chapelId);
      return chapel;
    } catch (error: any) {
      if (error instanceof ChapelError) {
        return rejectWithValue({
          message: error.message,
          type: error.type,
          statusCode: error.statusCode
        });
      }
      return rejectWithValue({
        message: 'An unexpected error occurred',
        type: 'server' as const
      });
    }
  }
);

export const chapelSlice = createSlice({
  name: 'chapel',
  initialState,
  reducers: {
    setSelectedChapel: (state, action: PayloadAction<Chapel | null>) => {
      state.selectedChapel = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.lastErrorType = null;
    },
    resetChapelState: (state) => {
      state.chapels = [];
      state.selectedChapel = null;
      state.loading = false;
      state.error = null;
      state.lastErrorType = null;
      state.isDataLoaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load chapels cases
      .addCase(loadChapels.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
        state.isRequestInProgress = true;
      })
      .addCase(loadChapels.fulfilled, (state, action) => {
        state.loading = false;
        state.isRequestInProgress = false;
        
        // Check if this was a skipped request
        if (action.payload.skip) {
          console.log(`Skipped loading chapels for church ${action.payload.churchId}`);
          return;
        }
        
        state.chapels = action.payload.chapels;
        state.lastLoadedChurchId = action.payload.churchId;
        state.isDataLoaded = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadChapels.rejected, (state, action) => {
        state.loading = false;
        state.isRequestInProgress = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
        state.isDataLoaded = false;
      })
      // Load chapel by ID cases
      .addCase(loadChapelById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadChapelById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedChapel = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadChapelById.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      });
  },
});

export const { 
  setSelectedChapel, 
  clearError, 
  resetChapelState 
} = chapelSlice.actions;

export default chapelSlice.reducer;
