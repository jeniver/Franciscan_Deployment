import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useCallback, useRef } from 'react';
import { RootState, AppDispatch } from '../store';
import {
  updateFormData,
  setApplicationCode,
  clearError,
  loadGateOfLifeApplication,
  createGateOfLifeApplication,
  updateGateOfLifeApplication,
  deleteGateOfLifeApplication,
  updateApplicationListFilters,
  resetApplicationListState,
  fetchGateOfLifeApplications,
  setViewMode as setViewModeAction,
  setEditMode,
  clearViewEditMode,
  resetForm,
  type GateOfLifeListFilters,
} from '../store/gateOfLifeSlice';
import gateOfLifeService, { GateOfLifeError, CreateGateOfLifeRequest, UpdateGateOfLifeRequest } from '../services/gateOfLifeService';

export function useGateOfLife() {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  // Select state from Redux
  const formData = useSelector((state: RootState) => state.gateOfLife.formData);
  const applicationCode = useSelector((state: RootState) => state.gateOfLife.applicationCode);
  const loading = useSelector((state: RootState) => state.gateOfLife.loading);
  const error = useSelector((state: RootState) => state.gateOfLife.error);
  const isDataLoaded = useSelector((state: RootState) => state.gateOfLife.isDataLoaded);
  const lastErrorType = useSelector((state: RootState) => state.gateOfLife.lastErrorType);
  const isCreatingApplication = useSelector((state: RootState) => state.gateOfLife.isCreatingApplication);
  const createdApplication = useSelector((state: RootState) => state.gateOfLife.createdApplication);
  const creationError = useSelector((state: RootState) => state.gateOfLife.creationError);
  const applicationList = useSelector((state: RootState) => state.gateOfLife.applicationList);
  const applicationListLoading = useSelector((state: RootState) => state.gateOfLife.applicationListLoading);
  const applicationListError = useSelector((state: RootState) => state.gateOfLife.applicationListError);
  const applicationListFilters = useSelector((state: RootState) => state.gateOfLife.applicationListFilters);
  const applicationListPagination = useSelector((state: RootState) => state.gateOfLife.applicationListPagination);
  const isViewMode = useSelector((state: RootState) => state.gateOfLife.isViewMode);
  const isEditMode = useSelector((state: RootState) => state.gateOfLife.isEditMode);

  const updateForm = useCallback((data: Record<string, any>) => {
    dispatch(updateFormData(data));
  }, [dispatch]);

  const setAppCode = useCallback((code: string) => {
    dispatch(setApplicationCode(code));
  }, [dispatch]);

  const clearApplicationError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const updateListFilters = useCallback((filters: Partial<GateOfLifeListFilters>) => {
    dispatch(updateApplicationListFilters(filters));
  }, [dispatch]);

  const resetApplicationList = useCallback(() => {
    dispatch(resetApplicationListState());
  }, [dispatch]);

  const searchApplicationList = useCallback(
    (args?: Parameters<typeof fetchGateOfLifeApplications>[0]) => {
      return dispatch(fetchGateOfLifeApplications(args));
    },
    [dispatch]
  );

  const resetApp = useCallback(() => {
    dispatch(resetForm());
  }, [dispatch]);

  const clearViewEditModeAction = useCallback(() => {
    dispatch(clearViewEditMode());
  }, [dispatch]);

  // Ref to track if a request is in progress
  const requestInProgressRef = useRef(false);

  // Load application data from API
  const loadApplication = useCallback(async (appCode: string) => {
    return dispatch(loadGateOfLifeApplication(appCode));
  }, [dispatch]);

  // Create gate of life application
  const createApplication = useCallback(async (applicationData: CreateGateOfLifeRequest) => {
    try {
      const result = await dispatch(createGateOfLifeApplication(applicationData));
      return result;
    } catch (error) {
      console.error('Error creating gate of life application:', error);
      throw error;
    }
  }, [dispatch]);

  // Handle View Application
  const handleViewApplication = useCallback(async (appCode?: string) => {
    const codeToLoad = appCode || applicationCode;
    if (!codeToLoad.trim()) {
      dispatch(clearError());
      return;
    }
    
    if (requestInProgressRef.current) {
      return;
    }
    
    requestInProgressRef.current = true;
    
    try {
      dispatch(setApplicationCode(codeToLoad.trim()));
      dispatch(setViewModeAction(true));
      dispatch(setEditMode(false)); // Explicitly set edit mode to false when viewing
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });
      
      const action = await Promise.race([
        loadApplication(codeToLoad.trim()),
        timeoutPromise
      ]);
      
      if (action.type.endsWith('/fulfilled')) {
        console.log('Gate of Life application data loaded successfully for viewing');
      } else if (action.type.endsWith('/rejected')) {
        const errorData = action.payload as { message: string; type: string; statusCode: number };
        
        if (errorData.type === 'auth') {
          navigate('/login', { replace: true });
          return;
        }
        dispatch(clearViewEditMode());
      }
    } catch (error: any) {
      if (error.message === 'Request timeout') {
        console.error('Request timed out after 30 seconds');
        dispatch(clearError());
        dispatch(clearViewEditMode());
      } else {
        console.error('Unexpected error in handleViewApplication:', error);
        dispatch(clearViewEditMode());
      }
    } finally {
      requestInProgressRef.current = false;
    }
  }, [applicationCode, dispatch, navigate, loadApplication]);

  // Handle View Application from table
  const handleViewApplicationFromTable = useCallback(async (appCode: string) => {
    if (!appCode.trim()) {
      return;
    }
    
    if (requestInProgressRef.current) {
      return;
    }
    
    requestInProgressRef.current = true;
    
    try {
      dispatch(setApplicationCode(appCode));
      dispatch(setViewModeAction(true));
      dispatch(setEditMode(false));
      
      const action = await loadApplication(appCode.trim());
      
      if (action.type.endsWith('/fulfilled')) {
        console.log('Application loaded for viewing');
      }
    } catch (error: any) {
      console.error('Error loading application for viewing:', error);
      dispatch(clearViewEditMode());
    } finally {
      requestInProgressRef.current = false;
    }
  }, [dispatch, loadApplication]);

  // Handle Edit Application from table
  const handleEditApplicationFromTable = useCallback(async (appCode: string) => {
    if (!appCode.trim()) {
      return;
    }
    
    if (requestInProgressRef.current) {
      return;
    }
    
    requestInProgressRef.current = true;
    
    try {
      dispatch(setApplicationCode(appCode));
      dispatch(setEditMode(true));
      dispatch(setViewModeAction(false));
      
      const action = await loadApplication(appCode.trim());
      
      if (action.type.endsWith('/fulfilled')) {
        console.log('Application loaded for editing');
      }
    } catch (error: any) {
      console.error('Error loading application for editing:', error);
      dispatch(clearViewEditMode());
    } finally {
      requestInProgressRef.current = false;
    }
  }, [dispatch, loadApplication]);

  // Handle Update Application
  const handleUpdateApplication = useCallback(async (appCode: string, applicationData: UpdateGateOfLifeRequest) => {
    if (!appCode.trim()) {
      return { success: false, error: 'Application code is required' };
    }
    
    try {
      const result = await dispatch(updateGateOfLifeApplication({
        applicationCode: appCode.trim(),
        applicationData
      }));
      
      if (result.type.endsWith('/fulfilled')) {
        return { success: true, data: result.payload };
      } else {
        // Parse error response
        const errorPayload = result.payload as any;
        let errorMessage = 'Failed to update application';
        
        if (errorPayload?.error?.message) {
          errorMessage = errorPayload.error.message;
        } else if (errorPayload?.message) {
          errorMessage = errorPayload.message;
        } else if (errorPayload?.error?.details && Array.isArray(errorPayload.error.details)) {
          errorMessage = errorPayload.error.details.join(', ');
        } else if (typeof errorPayload === 'string') {
          errorMessage = errorPayload;
        }
        
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error('Error updating application:', error);
      
      // Parse error response
      let errorMessage = 'Failed to update application';
      if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.response?.data?.error?.details && Array.isArray(error.response.data.error.details)) {
        errorMessage = error.response.data.error.details.join(', ');
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }, [dispatch]);

  // Handle Delete Application from table
  const handleDeleteApplicationFromTable = useCallback(async (appCode: string) => {
    if (!appCode.trim()) {
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete application ${appCode}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const result = await dispatch(deleteGateOfLifeApplication(appCode.trim()));
      
      if (result.type.endsWith('/fulfilled')) {
        console.log('Application deleted successfully');
        // Refresh the application list
        await searchApplicationList();
      } else {
        const errorData = result.payload as { message: string; type: string; statusCode: number };
        console.error('Error deleting application:', errorData.message);
      }
    } catch (error: any) {
      console.error('Error deleting application:', error);
    }
  }, [dispatch, searchApplicationList]);

  // Handle Print Agreement
  const handlePrintAgreement = useCallback(async (appCode?: string) => {
    const codeToUse = appCode || applicationCode;
    if (!codeToUse.trim()) {
      console.warn('No application code provided for PDF generation');
      return;
    }
    
    try {
      await gateOfLifeService.generateGateOfLifePDF(codeToUse.trim(), 'agreement');
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        console.error('PDF generation error:', error.message);
        dispatch(clearError());
      } else {
        console.error('Unexpected PDF error:', error);
      }
    }
  }, [applicationCode, dispatch]);

  // Handle Invoice Receipt
  const handleInvoiceReceipt = useCallback(async (appCode?: string) => {
    const codeToUse = appCode || applicationCode;
    if (!codeToUse.trim()) {
      console.warn('No application code provided for invoice PDF generation');
      return;
    }
    
    try {
      await gateOfLifeService.generateGateOfLifePDF(codeToUse.trim(), 'invoice');
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        console.error('Invoice PDF generation error:', error.message);
        dispatch(clearError());
      } else {
        console.error('Unexpected invoice PDF error:', error);
      }
    }
  }, [applicationCode, dispatch]);

  // Handle Invoice Only
  const handleInvoiceOnly = useCallback(async (appCode?: string) => {
    const codeToUse = appCode || applicationCode;
    if (!codeToUse.trim()) {
      console.warn('No application code provided for invoice only PDF generation');
      return;
    }
    
    try {
      await gateOfLifeService.generateGateOfLifePDF(codeToUse.trim(), 'invoice');
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        console.error('Invoice only PDF generation error:', error.message);
        dispatch(clearError());
      } else {
        console.error('Unexpected invoice only PDF error:', error);
      }
    }
  }, [applicationCode, dispatch]);

  // Handle Go to Receipt
  const handleGoToReceipt = useCallback(async (appCode?: string) => {
    const codeToUse = appCode || applicationCode;
    if (!codeToUse.trim()) {
      console.warn('No application code provided for receipt PDF generation');
      return;
    }
    
    try {
      await gateOfLifeService.generateGateOfLifePDF(codeToUse.trim(), 'receipt');
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        console.error('Receipt PDF generation error:', error.message);
        dispatch(clearError());
      } else {
        console.error('Unexpected receipt PDF error:', error);
      }
    }
  }, [applicationCode, dispatch]);

  // Handle Generate PDF from Data
  const handleGeneratePDFFromData = useCallback(async (formData: any, type: 'agreement' | 'invoice' | 'receipt' = 'agreement') => {
    try {
      await gateOfLifeService.generatePDFFromData(formData, type);
    } catch (error: any) {
      if (error instanceof GateOfLifeError) {
        console.error('PDF generation error:', error.message);
        dispatch(clearError());
      } else {
        console.error('Unexpected PDF error:', error);
      }
    }
  }, [dispatch]);

  // Handle New Application
  const handleNewApplication = useCallback(() => {
    dispatch(resetForm());
    dispatch(clearViewEditMode());
    console.log('New Gate of Life application started');
  }, [dispatch]);

  // Legacy methods for backward compatibility
  const handleSaveApplication = useCallback(async (applicationData: any) => {
    try {
      const result = await createApplication(applicationData as CreateGateOfLifeRequest);
      
      if (result.type.endsWith('/fulfilled')) {
        return { success: true, data: result.payload };
      } else {
        // Parse error response
        const errorPayload = result.payload as any;
        let errorMessage = 'Failed to create application';
        
        if (errorPayload?.error?.message) {
          errorMessage = errorPayload.error.message;
        } else if (errorPayload?.message) {
          errorMessage = errorPayload.message;
        } else if (errorPayload?.error?.details && Array.isArray(errorPayload.error.details)) {
          errorMessage = errorPayload.error.details.join(', ');
        } else if (typeof errorPayload === 'string') {
          errorMessage = errorPayload;
        }
        
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error('Error creating application:', error);
      
      // Parse error response
      let errorMessage = 'Failed to create application';
      if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.response?.data?.error?.details && Array.isArray(error.response.data.error.details)) {
        errorMessage = error.response.data.error.details.join(', ');
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }, [createApplication]);

  return {
    // State
    formData,
    applicationCode,
    loading,
    error,
    isDataLoaded,
    lastErrorType,
    isCreatingApplication,
    createdApplication,
    creationError,
    applicationList,
    applicationListLoading,
    applicationListError,
    applicationListFilters,
    applicationListPagination,
    isViewMode,
    isEditMode,
    
    // Actions
    updateForm,
    setAppCode,
    clearApplicationError,
    updateListFilters,
    resetApplicationList,
    searchApplicationList,
    resetApp,
    clearViewEditMode: clearViewEditModeAction,
    loadApplication,
    createApplication,
    handleViewApplication,
    handleViewApplicationFromTable,
    handleEditApplicationFromTable,
    handleDeleteApplicationFromTable,
    handleUpdateApplication,
    handlePrintAgreement,
    handleInvoiceReceipt,
    handleInvoiceOnly,
    handleGoToReceipt,
    handleGeneratePDFFromData,
    handleNewApplication,
    handleSaveApplication, // Legacy
  };
}
