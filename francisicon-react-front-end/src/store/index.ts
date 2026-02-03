import { configureStore } from '@reduxjs/toolkit';
import applicationReducer from './applicationSlice.ts';
import authReducer from './authSlice.ts';
import chapelReducer from './chapelSlice.ts';
import nicheReducer from './nicheSlice.ts';
import wakeRoomReducer from './wakeRoomSlice.ts';
import gateOfLifeReducer from './gateOfLifeSlice.ts';
import receiptReducer from './receiptSlice.ts';
import reportReducer from './reportSlice.ts';
import addressReducer from './addressSlice.ts';
import inscriptionReducer from './inscriptionSlice.ts';
import nichibookingReducer from './nichibookingSlice.ts';
import invoiceReducer from './invoiceSlice.ts';
import changesReducer from './changesSlice.ts';

export const store = configureStore({
  reducer: {
    application: applicationReducer,
    auth: authReducer,
    chapel: chapelReducer,
    niche: nicheReducer,
    wakeRoom: wakeRoomReducer,
    gateOfLife: gateOfLifeReducer,
    receipt: receiptReducer,
    report: reportReducer,
    address: addressReducer,
    inscription: inscriptionReducer,
    nichibooking: nichibookingReducer,
    invoice: invoiceReducer,
    changes: changesReducer,
  },
});

// Export the inferred types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;