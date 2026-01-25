import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { RootState, AppDispatch } from '../store';
import { 
  loadNichesByChapel, 
  loadNicheById,
  setSelectedNiches,
  addSelectedNiche,
  removeSelectedNiche,
  setSelectedNiche,
  setCurrentPage,
  setNichesPerPage,
  clearError,
  resetNicheState
} from '../store/nicheSlice';

export function useNiche() {
  const dispatch = useDispatch<AppDispatch>();
  
  const {
    chapel,
    walls,
    niches,
    statistics,
    currentPage,
    nichesPerPage,
    totalNiches,
    selectedNiches,
    selectedNiche,
    loading,
    error,
    lastErrorType,
    isDataLoaded
  } = useSelector((state: RootState) => state.niche);

  const handleLoadNichesByChapel = useCallback((chapelId: number, churchId: number = 1) => {
    dispatch(loadNichesByChapel({ chapelId, churchId }));
  }, [dispatch]);

  const handleLoadNicheById = (nicheId: number) => {
    dispatch(loadNicheById(nicheId));
  };

  const handleSetSelectedNiches = (nicheIds: number[]) => {
    dispatch(setSelectedNiches(nicheIds));
  };

  const handleAddSelectedNiche = (nicheId: number) => {
    dispatch(addSelectedNiche(nicheId));
  };

  const handleRemoveSelectedNiche = (nicheId: number) => {
    dispatch(removeSelectedNiche(nicheId));
  };

  const handleSelectNiche = (nicheId: number) => {
    const niche = niches.find(n => n.nicheId === nicheId);
    if (niche) {
      if (selectedNiches.includes(nicheId)) {
        handleRemoveSelectedNiche(nicheId);
      } else {
        handleAddSelectedNiche(nicheId);
      }
    }
  };

  const handleSetSelectedNiche = (niche: any) => {
    dispatch(setSelectedNiche(niche));
  };

  const handleSetCurrentPage = (page: number) => {
    dispatch(setCurrentPage(page));
  };

  const handleSetNichesPerPage = (perPage: number) => {
    dispatch(setNichesPerPage(perPage));
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  const handleResetNicheState = () => {
    dispatch(resetNicheState());
  };

  // Helper function to get niche by ID
  const getNicheById = (nicheId: number) => {
    return niches.find(niche => niche.nicheId === nicheId);
  };

  // Helper function to get niches by status
  const getNichesByStatus = (status: number) => {
    return niches.filter(niche => niche.status === status);
  };

  // Helper function to get available niches
  const getAvailableNiches = () => {
    return niches.filter(niche => niche.isAvailable);
  };

  // Helper function to get paginated niches
  const getPaginatedNiches = () => {
    const startIndex = (currentPage - 1) * nichesPerPage;
    const endIndex = startIndex + nichesPerPage;
    return niches.slice(startIndex, endIndex);
  };

  // Helper function to get total pages
  const getTotalPages = () => {
    return Math.ceil(totalNiches / nichesPerPage);
  };

  // Helper function to get niche status info
  const getNicheStatusInfo = (niche: any) => {
    return {
      status: niche.status,
      statusText: niche.statusText,
      statusColor: niche.statusColor,
      isAvailable: niche.isAvailable
    };
  };

  return {
    // State
    chapel,
    walls,
    niches,
    statistics,
    currentPage,
    nichesPerPage,
    totalNiches,
    selectedNiches,
    selectedNiche,
    loading,
    error,
    lastErrorType,
    isDataLoaded,
    
    // Actions
    handleLoadNichesByChapel,
    handleLoadNicheById,
    handleSetSelectedNiches,
    handleAddSelectedNiche,
    handleRemoveSelectedNiche,
    handleSelectNiche,
    handleSetSelectedNiche,
    handleSetCurrentPage,
    handleSetNichesPerPage,
    handleClearError,
    handleResetNicheState,
    
    // Helper functions
    getNicheById,
    getNichesByStatus,
    getAvailableNiches,
    getPaginatedNiches,
    getTotalPages,
    getNicheStatusInfo,
  };
}
