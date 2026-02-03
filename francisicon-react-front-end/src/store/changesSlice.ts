import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PendingChanges {
  [key: string]: any;
}

interface ChangesState {
  pendingChanges: PendingChanges;
  isDirty: boolean;
  lastSavedAt: string | null;
}

const initialState: ChangesState = {
  pendingChanges: {},
  isDirty: false,
  lastSavedAt: null
};

export const changesSlice = createSlice({
  name: 'changes',
  initialState,
  reducers: {
    // Add a single change
    addChange: (state, action: PayloadAction<{ field: string; value: any }>) => {
      const { field, value } = action.payload;
      state.pendingChanges[field] = value;
      state.isDirty = true;
    },
    
    // Add multiple changes at once
    addChanges: (state, action: PayloadAction<Record<string, any>>) => {
      state.pendingChanges = { ...state.pendingChanges, ...action.payload };
      state.isDirty = Object.keys(state.pendingChanges).length > 0;
    },
    
    // Remove a specific change
    removeChange: (state, action: PayloadAction<string>) => {
      delete state.pendingChanges[action.payload];
      state.isDirty = Object.keys(state.pendingChanges).length > 0;
    },
    
    // Clear all pending changes (after successful save)
    clearChanges: (state) => {
      state.pendingChanges = {};
      state.isDirty = false;
      state.lastSavedAt = new Date().toISOString();
    },
    
    // Reset the dirty state without clearing changes
    markAsClean: (state) => {
      state.isDirty = false;
      state.lastSavedAt = new Date().toISOString();
    },
    
    // Initialize changes from existing form data (when loading an application)
    initializeChanges: (state, action: PayloadAction<Record<string, any>>) => {
      state.pendingChanges = { ...action.payload };
      state.isDirty = false; // Start clean when loading
      state.lastSavedAt = new Date().toISOString();
    }
  }
});

export const { 
  addChange, 
  addChanges, 
  removeChange, 
  clearChanges, 
  markAsClean,
  initializeChanges
} = changesSlice.actions;

export default changesSlice.reducer;