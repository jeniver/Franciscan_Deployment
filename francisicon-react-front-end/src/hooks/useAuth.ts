import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { loginAsync, logoutAsync, refreshTokenAsync, clearError } from '../store/authSlice';

export const useAuth = () => {
  const dispatch: AppDispatch = useDispatch();
  const { isAuthenticated, user, loading, error } = useSelector((state: RootState) => state.auth);

  const loginUser = async (username: string, password: string) => {
    // returns the dispatched promise so callers can await
    return dispatch(loginAsync({ username, password }));
  };

  const logoutUser = async () => {
    return dispatch(logoutAsync());
  };

  const refreshToken = async () => {
    return dispatch(refreshTokenAsync());
  };

  const clearAuthError = () => {
    dispatch(clearError());
  };

  return {
    isAuthenticated,
    user,
    loading,
    error,
    loginUser,
    logoutUser,
    refreshToken,
    clearAuthError,
  };
};