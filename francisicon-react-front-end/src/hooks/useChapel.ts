import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { 
  loadChapels, 
  loadChapelById, 
  setSelectedChapel, 
  clearError, 
  resetChapelState 
} from '../store/chapelSlice';

export function useChapel() {
  const dispatch = useDispatch<AppDispatch>();
  
  const {
    chapels,
    selectedChapel,
    loading,
    error,
    lastErrorType,
    isDataLoaded
  } = useSelector((state: RootState) => state.chapel);

  // Load chapels on component mount
  useEffect(() => {
    if (!isDataLoaded && !loading) {
      console.log('Loading chapels on component mount...');
      dispatch(loadChapels(1)); // Default church ID is 1
    }
  }, [dispatch, isDataLoaded, loading]);

  const handleLoadChapels = useCallback((churchId: number = 1) => {
    dispatch(loadChapels(churchId));
  }, [dispatch]);

  const handleLoadChapelById = useCallback((chapelId: number) => {
    dispatch(loadChapelById(chapelId));
  }, [dispatch]);

  const handleSelectChapel = useCallback((chapel: any) => {
    dispatch(setSelectedChapel(chapel));
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleResetChapelState = useCallback(() => {
    dispatch(resetChapelState());
  }, [dispatch]);

  // Helper function to get chapel by ID from loaded chapels
  const getChapelById = useCallback((chapelId: number) => {
    return chapels.find(chapel => chapel.chapelId === chapelId);
  }, [chapels]);

  // Helper function to get chapel by code from loaded chapels
  const getChapelByCode = useCallback((code: string) => {
    return chapels.find(chapel => chapel.code === code);
  }, [chapels]);

  return {
    // State
    chapels,
    selectedChapel,
    loading,
    error,
    lastErrorType,
    isDataLoaded,
    
    // Actions
    handleLoadChapels,
    handleLoadChapelById,
    handleSelectChapel,
    handleClearError,
    handleResetChapelState,
    
    // Helper functions
    getChapelById,
    getChapelByCode,
  };
}
