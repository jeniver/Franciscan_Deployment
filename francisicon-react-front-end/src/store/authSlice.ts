import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/authService';
import { USER_STORAGE_KEY } from '../constants/storageKeys';
import { getStoredJSON, setStoredJSON } from '../utils/storage';

export interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  employeeId?: number;
  roleId?: number;
  active?: boolean;
  isLocked?: boolean;
  failedLoginAttempts?: number;
  lastLoginDate?: string | null;
  createdDate?: string;
  modifiedDate?: string | null;
  churchId?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error?: string | null;
}

const storedUser = getStoredJSON<User>(USER_STORAGE_KEY);
const hasValidToken = authService.isAuthenticated();

const initialState: AuthState = {
  isAuthenticated: hasValidToken,
  user: hasValidToken ? storedUser : null,
  loading: false,
  error: null,
};

// Async thunk to call login API
export const loginAsync = createAsyncThunk(
  'auth/loginAsync',
  async (
    credentials: { username: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await authService.login(credentials.username, credentials.password);
      setStoredJSON(USER_STORAGE_KEY, res?.user ?? null);
      return res;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Login failed');
    }
  }
);

// Async thunk to refresh access token
export const refreshTokenAsync = createAsyncThunk(
  'auth/refreshTokenAsync',
  async (_, { rejectWithValue }) => {
    try {
      const newToken = await authService.refreshAccessToken();
      return { access_token: newToken };
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Token refresh failed');
    }
  }
);

// Async thunk to logout
export const logoutAsync = createAsyncThunk(
  'auth/logoutAsync',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      setStoredJSON(USER_STORAGE_KEY, null);
      return true;
    } catch (err: any) {
      setStoredJSON(USER_STORAGE_KEY, null);
      // Even if logout fails on server, we should clear local state
      authService.clearTokens();
      return rejectWithValue(err?.message || 'Logout failed');
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action: PayloadAction<{ user: User }>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string || 'Login failed';
      })
      // Refresh token cases
      .addCase(refreshTokenAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshTokenAsync.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(refreshTokenAsync.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string || 'Token refresh failed';
      })
      // Logout cases
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      })
      .addCase(logoutAsync.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;

export default authSlice.reducer;