import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import wakeRoomService, { 
  WakeRoom, 
  WakeRoomBooking, 
  WakeRoomError,
  AvailabilityRangeCheck,
  AvailabilityDatesCheck,
  WakeRoomDropdownOption
} from '../services/wakeRoomService';

export interface WakeRoomState {
  // Wake room data
  wakeRooms: WakeRoom[];
  selectedWakeRoom: WakeRoom | null;
  
  // Church selection and dropdown
  selectedChurchId: number | null;
  wakeRoomDropdownOptions: WakeRoomDropdownOption[];
  
  // Booking data
  bookings: WakeRoomBooking[];
  selectedBooking: WakeRoomBooking | null;
  searchResults: WakeRoomBooking[];
  
  // Availability checking
  availabilityCheck: {
    isAvailable: boolean;
    conflicts: any[];
    message: string;
  } | null;
  availabilityRangeCheck: AvailabilityRangeCheck | null;
  availabilityDatesCheck: AvailabilityDatesCheck | null;
  
  // UI State
  loading: boolean;
  error: string | null;
  lastErrorType: 'auth' | 'network' | 'validation' | 'server' | null;
  isDataLoaded: boolean;
  
  // Request tracking to prevent duplicates
  lastLoadedChurchId: number | null;
  isRequestInProgress: boolean;
  
  // Search state
  searchCriteria: {
    applicantName?: string;
    nameOfDeceased?: string;
    usingDate?: string;
    wakeRoomId?: number;
  };
}

const initialState: WakeRoomState = {
  wakeRooms: [],
  selectedWakeRoom: null,
  selectedChurchId: null,
  wakeRoomDropdownOptions: [],
  bookings: [],
  selectedBooking: null,
  searchResults: [],
  availabilityCheck: null,
  availabilityRangeCheck: null,
  availabilityDatesCheck: null,
  loading: false,
  error: null,
  lastErrorType: null,
  isDataLoaded: false,
  lastLoadedChurchId: null,
  isRequestInProgress: false,
  searchCriteria: {}
};

// Async thunk to load all wake rooms (no church filter)
export const loadAllWakeRooms = createAsyncThunk(
  'wakeRoom/loadAllWakeRooms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await wakeRoomService.getAllWakeRooms();
      return response.data;
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to load wake rooms by church
export const loadWakeRoomsByChurch = createAsyncThunk(
  'wakeRoom/loadWakeRoomsByChurch',
  async (churchId: number, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { wakeRoom: WakeRoomState };
      
      // Check if we already have data for this church and request is not in progress
      if (state.wakeRoom.lastLoadedChurchId === churchId && 
          state.wakeRoom.isDataLoaded && 
          !state.wakeRoom.isRequestInProgress) {
        console.log(`Wake room data for church ${churchId} already loaded, skipping request`);
        return { skip: true, churchId };
      }
      
      // Check if request is already in progress for this church
      if (state.wakeRoom.isRequestInProgress && state.wakeRoom.lastLoadedChurchId === churchId) {
        console.log(`Request already in progress for church ${churchId}, skipping duplicate`);
        return { skip: true, churchId };
      }

      console.log(`Loading wake rooms for church ${churchId}`);
      const response = await wakeRoomService.getWakeRoomsByChurch(churchId);
      return { ...response.data, churchId };
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to check availability
export const checkAvailability = createAsyncThunk(
  'wakeRoom/checkAvailability',
  async ({ wakeRoomId, fromTime, toTime }: { wakeRoomId: number; fromTime: string; toTime: string }, { rejectWithValue }) => {
    try {
      const response = await wakeRoomService.checkAvailability(wakeRoomId, fromTime, toTime);
      return response.data;
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to check availability by date range
export const checkAvailabilityRange = createAsyncThunk(
  'wakeRoom/checkAvailabilityRange',
  async ({ wakeRoomId, fromDate, toDate }: { wakeRoomId: number; fromDate: string; toDate: string }, { rejectWithValue }) => {
    try {
      const response = await wakeRoomService.checkAvailabilityRange(wakeRoomId, fromDate, toDate);
      return response.data;
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to check availability for multiple dates (calendar view)
export const checkAvailabilityDates = createAsyncThunk(
  'wakeRoom/checkAvailabilityDates',
  async ({ wakeRoomId, dates }: { wakeRoomId: number; dates: string[] }, { rejectWithValue }) => {
    try {
      const response = await wakeRoomService.checkAvailabilityDates(wakeRoomId, dates);
      return response.data;
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to create booking
export const createBooking = createAsyncThunk(
  'wakeRoom/createBooking',
  async (bookingData: any, { rejectWithValue }) => {
    try {
      const response = await wakeRoomService.createBooking(bookingData);
      return response.data;
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to get booking by code
export const getBookingByCode = createAsyncThunk(
  'wakeRoom/getBookingByCode',
  async ({ code, churchId }: { code: string; churchId: number }, { rejectWithValue }) => {
    try {
      const response = await wakeRoomService.getBookingByCode(code, churchId);
      return response.data;
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to search bookings
export const searchBookings = createAsyncThunk(
  'wakeRoom/searchBookings',
  async (searchCriteria: any, { rejectWithValue }) => {
    try {
      const response = await wakeRoomService.searchBookings(searchCriteria);
      return { results: response.data, criteria: searchCriteria };
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to load wake room dropdown options
export const loadWakeRoomsDropdown = createAsyncThunk(
  'wakeRoom/loadWakeRoomsDropdown',
  async (churchId: number, { rejectWithValue }) => {
    try {
      if (!churchId) {
        throw new WakeRoomError('Church ID is required', 'validation');
      }
      const response = await wakeRoomService.getWakeRoomsDropdown(churchId);
      return { churchId, options: response.data };
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to update booking
export const updateBooking = createAsyncThunk(
  'wakeRoom/updateBooking',
  async ({ bookingId, bookingData }: { bookingId: number; bookingData: any }, { rejectWithValue }) => {
    try {
      const response = await wakeRoomService.updateBooking(bookingId, bookingData);
      return response.data;
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

// Async thunk to delete booking
export const deleteBooking = createAsyncThunk(
  'wakeRoom/deleteBooking',
  async (bookingId: number, { rejectWithValue }) => {
    try {
      const response = await wakeRoomService.deleteBooking(bookingId);
      return bookingId;
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
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

export const wakeRoomSlice = createSlice({
  name: 'wakeRoom',
  initialState,
  reducers: {
    setSelectedWakeRoom: (state, action: PayloadAction<WakeRoom | null>) => {
      state.selectedWakeRoom = action.payload;
    },
    setSelectedBooking: (state, action: PayloadAction<WakeRoomBooking | null>) => {
      state.selectedBooking = action.payload;
    },
    setSearchCriteria: (state, action: PayloadAction<any>) => {
      state.searchCriteria = action.payload;
    },
    clearAvailabilityCheck: (state) => {
      state.availabilityCheck = null;
    },
    clearAvailabilityRangeCheck: (state) => {
      state.availabilityRangeCheck = null;
    },
    clearAvailabilityDatesCheck: (state) => {
      state.availabilityDatesCheck = null;
    },
    clearError: (state) => {
      state.error = null;
      state.lastErrorType = null;
    },
    setSelectedChurch: (state, action: PayloadAction<number | null>) => {
      state.selectedChurchId = action.payload;
      // Clear dropdown options when church changes
      if (state.selectedChurchId !== action.payload) {
        state.wakeRoomDropdownOptions = [];
      }
    },
    resetWakeRoomState: (state) => {
      state.wakeRooms = [];
      state.selectedWakeRoom = null;
      state.selectedChurchId = null;
      state.wakeRoomDropdownOptions = [];
      state.bookings = [];
      state.selectedBooking = null;
      state.searchResults = [];
      state.availabilityCheck = null;
      state.availabilityRangeCheck = null;
      state.availabilityDatesCheck = null;
      state.loading = false;
      state.error = null;
      state.lastErrorType = null;
      state.isDataLoaded = false;
      state.lastLoadedChurchId = null;
      state.isRequestInProgress = false;
      state.searchCriteria = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Load all wake rooms (no church filter)
      .addCase(loadAllWakeRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadAllWakeRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.wakeRooms = action.payload || [];
        state.isDataLoaded = true;
        state.lastLoadedChurchId = null;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadAllWakeRooms.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
        state.isDataLoaded = false;
      })
      // Load wake rooms by church cases
      .addCase(loadWakeRoomsByChurch.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
        state.isRequestInProgress = true;
      })
      .addCase(loadWakeRoomsByChurch.fulfilled, (state, action) => {
        state.loading = false;
        state.isRequestInProgress = false;
        
        // Check if this was a skipped request
        if (action.payload.skip) {
          console.log(`Skipped loading wake rooms for church ${action.payload.churchId}`);
          return;
        }
        
        state.wakeRooms = action.payload.data || [];
        state.lastLoadedChurchId = action.payload.churchId;
        state.isDataLoaded = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadWakeRoomsByChurch.rejected, (state, action) => {
        state.loading = false;
        state.isRequestInProgress = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
        state.isDataLoaded = false;
      })
      // Check availability cases
      .addCase(checkAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(checkAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.availabilityCheck = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(checkAvailability.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Check availability range cases
      .addCase(checkAvailabilityRange.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(checkAvailabilityRange.fulfilled, (state, action) => {
        state.loading = false;
        state.availabilityRangeCheck = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(checkAvailabilityRange.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Check availability dates cases
      .addCase(checkAvailabilityDates.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(checkAvailabilityDates.fulfilled, (state, action) => {
        state.loading = false;
        state.availabilityDatesCheck = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(checkAvailabilityDates.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Create booking cases
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.lastErrorType = null;
        // Add the new booking to the list
        if (action.payload && !action.payload.isDuplicate) {
          // Note: The API returns booking code and ID, not the full booking object
          // We would need to fetch the full booking details if needed
        }
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Get booking by code cases
      .addCase(getBookingByCode.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(getBookingByCode.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedBooking = action.payload;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(getBookingByCode.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Search bookings cases
      .addCase(searchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(searchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload.results;
        state.searchCriteria = action.payload.criteria;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(searchBookings.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Load dropdown cases
      .addCase(loadWakeRoomsDropdown.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadWakeRoomsDropdown.fulfilled, (state, action) => {
        state.loading = false;
        state.wakeRoomDropdownOptions = action.payload.options;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(loadWakeRoomsDropdown.rejected, (state, action) => {
        state.loading = false;
        state.wakeRoomDropdownOptions = [];
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Update booking cases
      .addCase(updateBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(updateBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(updateBooking.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      })
      // Delete booking cases
      .addCase(deleteBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.lastErrorType = null;
      })
      .addCase(deleteBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.lastErrorType = null;
        // Remove the booking from the list
        state.bookings = state.bookings.filter(booking => booking.wakeRoomBookingId !== action.payload);
        state.searchResults = state.searchResults.filter(booking => booking.wakeRoomBookingId !== action.payload);
      })
      .addCase(deleteBooking.rejected, (state, action) => {
        state.loading = false;
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        state.error = errorData.message;
        state.lastErrorType = errorData.type as 'auth' | 'network' | 'validation' | 'server';
      });
  },
});

export const {
  setSelectedWakeRoom,
  setSelectedBooking,
  setSelectedChurch,
  setSearchCriteria,
  clearAvailabilityCheck,
  clearAvailabilityRangeCheck,
  clearAvailabilityDatesCheck,
  clearError,
  resetWakeRoomState
} = wakeRoomSlice.actions;

export default wakeRoomSlice.reducer;
