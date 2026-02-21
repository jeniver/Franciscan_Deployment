import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import nicheService, { Niche, Wall, Chapel, NicheStatistics, NicheError } from '../services/nicheService';

export interface NicheState {
  // Chapel and niche data
  chapel: Chapel | null;
  walls: Wall[];
  niches: Niche[];
  statistics: NicheStatistics | null;

  // Pagination
  currentPage: number;
  nichesPerPage: number;
  totalNiches: number;

  // Selection
  selectedNiches: number[];
  selectedNiche: Niche | null;

  // UI State
  loading: boolean;
  error: string | null;
  lastErrorType: 'auth' | 'network' | 'validation' | 'server' | null;
  isDataLoaded: boolean;

  // Request tracking to prevent duplicates
  lastLoadedChapelId: number | null;
  isRequestInProgress: boolean;
}

const initialState: NicheState = {
  chapel: null,
  walls: [],
  niches: [],
  statistics: null,
  currentPage: 1,
  nichesPerPage: 40,
  totalNiches: 0,
  selectedNiches: [],
  selectedNiche: null,
  loading: false,
  error: null,
  lastErrorType: null,
  isDataLoaded: false,
  lastLoadedChapelId: null,
  isRequestInProgress: false,
};

// Async thunk to load niches by chapel with duplicate prevention
export const loadNichesByChapel = createAsyncThunk(
  'niche/loadNichesByChapel',
  async ({ chapelId, churchId }: { chapelId: number; churchId?: number }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { niche: NicheState };

      // Check if we already have data for this chapel and request is not in progress
      if (state.niche.lastLoadedChapelId === chapelId &&
        state.niche.isDataLoaded &&
        !state.niche.isRequestInProgress) {
        console.log(`Niche data for chapel ${chapelId} already loaded, skipping request`);
        return { skip: true, chapelId };
      }

      // Check if request is already in progress for this chapel
      if (state.niche.isRequestInProgress && state.niche.lastLoadedChapelId === chapelId) {
        console.log(`Request already in progress for chapel ${chapelId}, skipping duplicate`);
        return { skip: true, chapelId };
      }

      console.log(`Loading niches for chapel ${chapelId}`);
      const response = await nicheService.getNichesByChapel(chapelId, churchId || 1);
      return { ...response.data, chapelId };
    } catch (error: any) {
      if (error instanceof NicheError) {
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

// Async thunk to load specific niche
export const loadNicheById = createAsyncThunk(
  'niche/loadNicheById',
  async (nicheId: number, { rejectWithValue }) => {
    try {
      const niche = await nicheService.getNicheById(nicheId);
      return niche;
    } catch (error: any) {
      if (error instanceof NicheError) {
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

export const nicheSlice = createSlice({
  name: 'niche',
  initialState,
  reducers: {
    setSelectedNiches: (state, action: PayloadAction<number[]>) => {
      state.selectedNiches = action.payload;
    },
    addSelectedNiche: (state, action: PayloadAction<number>) => {
      if (!state.selectedNiches.includes(action.payload)) {
        state.selectedNiches.push(action.payload);
      }
    },
    removeSelectedNiche: (state, action: PayloadAction<number>) => {
      state.selectedNiches = state.selectedNiches.filter(id => id !== action.payload);
    },
    setSelectedNiche: (state, action: PayloadAction<Niche | null>) => {
      state.selectedNiche = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setNichesPerPage: (state, action: PayloadAction<number>) => {
      state.nichesPerPage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.lastErrorType = null;
    },
    resetNicheState: (state) => {
      state.chapel = null;
      state.walls = [];
      state.niches = [];
      state.statistics = null;
      state.currentPage = 1;
      state.totalNiches = 0;
      state.selectedNiches = [];
      state.selectedNiche = null;
      state.loading = false;
      state.error = null;
      state.lastErrorType = null;
      state.isDataLoaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load niches by chapel cases
      .addCase(loadNichesByChapel.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
        state.isRequestInProgress = true;
      })
      .addCase(loadNichesByChapel.fulfilled, (state, action) => {
        state.loading = false;
        state.isRequestInProgress = false;

        // Check if this was a skipped request
        if ('skip' in action.payload && action.payload.skip) {
          console.log(`Skipped loading niches for chapel ${action.payload.chapelId}`);
          return;
        }

        const payload = action.payload as {
          chapel: Chapel;
          walls: Wall[];
          statistics?: NicheStatistics;
          chapelId: number
        };

        state.chapel = payload.chapel;
        state.walls = payload.walls;
        state.statistics = payload.statistics || null;
        state.lastLoadedChapelId = payload.chapelId;

        // Flatten all niches from all walls and rows
        const allNiches: Niche[] = [];
        const chapelData = payload.chapel;

        payload.walls.forEach((wall: any) => {
          wall.rows.forEach((row: any) => {
            if (Array.isArray(row.niches)) {
              row.niches.forEach((niche: any) => {
                allNiches.push({
                  ...niche,
                  wallId: wall.wallId,
                  wallCode: wall.wallCode,
                  wallName: wall.wallName,
                  rowNumber: row.rowCode,
                  rowLevel: row.level,
                  chapelId: chapelData?.chapelId,
                  chapelName: chapelData?.chapelName
                });
              });
            }
          });
        });

        state.niches = allNiches;
        state.totalNiches = allNiches.length;
        state.isDataLoaded = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadNichesByChapel.rejected, (state, action) => {
        state.loading = false;
        state.isRequestInProgress = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
        state.isDataLoaded = false;
      })
      // Load niche by ID cases
      .addCase(loadNicheById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadNicheById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedNiche = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadNicheById.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      });
  },
});

export const {
  setSelectedNiches,
  addSelectedNiche,
  removeSelectedNiche,
  setSelectedNiche,
  setCurrentPage,
  setNichesPerPage,
  clearError,
  resetNicheState
} = nicheSlice.actions;

export default nicheSlice.reducer;
