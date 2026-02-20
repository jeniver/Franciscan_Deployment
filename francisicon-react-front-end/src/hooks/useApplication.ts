import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useCallback, useRef } from 'react';
import { RootState, AppDispatch } from '../store';
import { store } from '../store';
import { useToast } from '../contexts/ToastContext';
import {
  setCurrentStep,
  updateFormData,
  setApplicationNumber,
  resetApplication,
  clearPreviousApplicationData,
  clearError,
  loadApplicationData,
  createNicheApplication,
  updateNicheApplication,
  deleteNicheApplication,
  setValidationErrors,
  clearValidationErrors,
  setValidating,
  setLastValidatedStep,
  setApplicationViewMode,
  updateApplicationListFilters,
  resetApplicationListState,
  clearApplicationListCache,
  fetchNicheApplications,
  setViewMode as setViewModeAction,
  setEditMode,
  clearViewEditMode,
  openAgreementModal,
  closeAgreementModal,
  type ApplicationViewMode,
  type ApplicationListFilters,
} from '../store/applicationSlice';
import nicheAgreementService, { NicheAgreementError, type Applicant, type Invoice, type Niche, type Metadata } from '../services/nicheAgreementService';
import nicheApplicationService, { NicheApplicationError } from '../services/nicheApplicationService';
import { validateStep } from '../utils/validation';

export const useApplication = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const { showError, showSuccess, showInfo } = useToast();

  // Select individual properties to avoid typing issues
  const currentStep = useSelector((state: RootState) => state.application.currentStep);
  const formData = useSelector((state: RootState) => state.application.formData);
  const applicationNumber = useSelector((state: RootState) => state.application.applicationNumber);
  const loading = useSelector((state: RootState) => state.application.loading);
  const error = useSelector((state: RootState) => state.application.error);
  const isDataLoaded = useSelector((state: RootState) => state.application.isDataLoaded);
  const lastErrorType = useSelector((state: RootState) => state.application.lastErrorType);
  // Niche application creation state
  const isCreatingApplication = useSelector((state: RootState) => state.application.isCreatingApplication);
  const createdApplication = useSelector((state: RootState) => state.application.createdApplication);
  const creationError = useSelector((state: RootState) => state.application.creationError);
  // Validation state
  const validationErrors = useSelector((state: RootState) => state.application.validationErrors);
  const isValidating = useSelector((state: RootState) => state.application.isValidating);
  const lastValidatedStep = useSelector((state: RootState) => state.application.lastValidatedStep);
  const viewMode = useSelector((state: RootState) => state.application.viewMode);
  const applicationList = useSelector((state: RootState) => state.application.applicationList);
  const applicationListLoading = useSelector((state: RootState) => state.application.applicationListLoading);
  const applicationListError = useSelector((state: RootState) => state.application.applicationListError);
  const applicationListFilters = useSelector((state: RootState) => state.application.applicationListFilters);
  const applicationListPagination = useSelector((state: RootState) => state.application.applicationListPagination);
  const isViewMode = useSelector((state: RootState) => state.application.isViewMode);
  const isEditMode = useSelector((state: RootState) => state.application.isEditMode);
  const isAgreementModalOpen = useSelector((state: RootState) => state.application.isAgreementModalOpen);
  const agreementModalData = useSelector((state: RootState) => state.application.agreementModalData);

  const goToStep = (step: number) => {
    dispatch(setCurrentStep(step));
  };

  // Enhanced validation function using validation utils
  const validateStepData = useCallback((step: number, data: Record<string, any>) => {
    const validation = validateStep(step, data);
    dispatch(setValidationErrors(validation.errors));
    dispatch(setLastValidatedStep(step));
    return validation;
  }, [dispatch]);

  // Legacy validation function for backward compatibility
  const validateStepDataLegacy = useCallback((step: number, data: Record<string, any>): boolean => {
    switch (step) {
      case 1: // Niche Details (moved from step 2)
        return data.nicheId || (data.selectedNiches && data.selectedNiches.length > 0);
      case 2: // Contact Person Details (moved from step 3)
        return data.contactName; // NRIC/Passport is optional
      case 3: // Beneficiary Details (moved from step 4)
        return data.beneficiaries && data.beneficiaries.length > 0;
      case 4: // Nominee Details (moved from step 5)
        return data.nominees && data.nominees.length > 0;
      case 5: // Consent Forms (moved to last step)
        return data.consentForms && Object.keys(data.consentForms).length > 0;
      default:
        return true;
    }
  }, []);

  // Helper function to save step data
  const saveStepData = useCallback(async (step: number, data: Record<string, any>) => {
    try {
      console.log(`Saving step ${step} data:`, data);

      // For now, we'll just log the data being saved
      // In a real implementation, you might want to save to localStorage or a temporary API endpoint
      const stepData = {
        step,
        data,
        timestamp: new Date().toISOString()
      };

      // Save to localStorage for persistence
      localStorage.setItem(`niche-application-step-${step}`, JSON.stringify(stepData));

      // You could also implement an API call here to save the step data
      // await nicheApplicationService.saveStepData(step, data);

      console.log(`Step ${step} data saved successfully`);
    } catch (error) {
      console.error(`Error saving step ${step} data:`, error);
      throw error;
    }
  }, []);

  const nextStep = useCallback(async () => {
    try {
      // Auto-save application data when moving to next step
      if (currentStep < 5) {
        // Validate current step data
        const validation = validateStepData(currentStep, formData);

        if (validation.isValid) {
          // Save the current step data to Redux
          console.log(`Saving step ${currentStep} data to Redux:`, formData);

          // Save the current step data
          await saveStepData(currentStep, formData);
          // Clear validation errors
          dispatch(clearValidationErrors());
          // Move to next step
          dispatch(setCurrentStep(currentStep + 1));
        } else {
          // Validation failed, don't move to next step
          console.log('Validation failed for step:', currentStep, validation.errors);
        }
      } else if (currentStep === 5) {
        // If we're on the last step (Nominee Details), save the final step data
        console.log('Saving final step data...');
        await saveStepData(currentStep, formData);
      }
    } catch (error) {
      console.error('Error saving step data:', error);
      // Still move to next step even if save fails
      if (currentStep < 5) {
        dispatch(setCurrentStep(currentStep + 1));
      }
    }
  }, [currentStep, formData, dispatch, validateStepData, saveStepData]);

  const previousStep = () => {
    dispatch(setCurrentStep(currentStep - 1));
  };

  const updateForm = (data: Record<string, any>) => {
    dispatch(updateFormData(data));
  };

  const setAppNumber = (number: string) => {
    dispatch(setApplicationNumber(number));
  };

  const setViewMode = useCallback((mode: ApplicationViewMode) => {
    dispatch(setApplicationViewMode(mode));
  }, [dispatch]);

  const updateListFilters = useCallback((filters: Partial<ApplicationListFilters>) => {
    dispatch(updateApplicationListFilters(filters));
  }, [dispatch]);

  const resetApplicationList = useCallback(() => {
    dispatch(resetApplicationListState());
  }, [dispatch]);

  const clearListCache = useCallback(() => {
    dispatch(clearApplicationListCache());
  }, [dispatch]);

  const searchApplicationList = useCallback(
    (args?: Parameters<typeof fetchNicheApplications>[0]) => {
      return dispatch(fetchNicheApplications(args));
    },
    [dispatch]
  );

  const resetApp = () => {
    dispatch(resetApplication());
  };

  const clearApplicationError = () => {
    dispatch(clearError());
  };

  // Load application data from API
  const loadApplication = async (appNumber: string) => {
    return dispatch(loadApplicationData(appNumber));
  };

  // Create niche application
  const createApplication = useCallback(async () => {
    try {
      const result = await dispatch(createNicheApplication(formData));
      return result;
    } catch (error) {
      console.error('Error creating niche application:', error);
      throw error;
    }
  }, [dispatch, formData]);

  // Helper function to load saved step data
  const loadSavedStepData = useCallback(() => {
    try {
      const savedData: Record<string, any> = {};

      // Load data from all saved steps
      for (let step = 1; step <= 6; step++) {
        const savedStepData = localStorage.getItem(`niche-application-step-${step}`);
        if (savedStepData) {
          const parsedData = JSON.parse(savedStepData);
          savedData[`step${step}`] = parsedData.data;
        }
      }

      if (Object.keys(savedData).length > 0) {
        console.log('Loaded saved step data:', savedData);
        // Merge saved data into form data
        dispatch(updateFormData(savedData));
      }
    } catch (error) {
      console.error('Error loading saved step data:', error);
    }
  }, [dispatch]);

  // Ref to track if a request is in progress to prevent multiple simultaneous requests
  const requestInProgressRef = useRef(false);

  // Handle View button click - Navigates to view route to let App.tsx effect handle state
  const handleViewApplication = useCallback(async () => {
    if (!applicationNumber.trim()) {
      dispatch(clearError());
      return;
    }

    // Navigate to the view route
    // This will trigger the useEffect in App.tsx which calls handleViewApplicationFromTable
    navigate(`/niche/view/${applicationNumber.trim()}`);
  }, [applicationNumber, navigate, dispatch]);

  // Handle View Application from table (loads and shows in view mode)
  const handleViewApplicationFromTable = useCallback(async (applicationCode: string, navigate?: (path: string) => void, skipNavigation?: boolean) => {
    if (!applicationCode.trim()) {
      return;
    }

    if (requestInProgressRef.current) {
      return;
    }

    requestInProgressRef.current = true;

    try {
      // Navigate to view route if navigate function is provided and not skipping navigation
      if (navigate && !skipNavigation) {
        navigate(`/niche/view/${applicationCode}`);
      }

      dispatch(setApplicationNumber(applicationCode));
      dispatch(setViewModeAction(true));
      dispatch(setApplicationViewMode('form'));
      dispatch(setCurrentStep(1)); // Start at niche details for viewing

      // Set a timeout to prevent the request from hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
      });

      const action = await Promise.race([
        loadApplication(applicationCode.trim()),
        timeoutPromise
      ]) as any;

      if (action?.type?.endsWith('/fulfilled')) {
        console.log('Application loaded for viewing');
      } else if (action?.type?.endsWith('/rejected')) {
        // Handle different error types
        const errorData = (action?.payload || {}) as { message: string; type: string; statusCode: number };

        if (errorData.type === 'auth') {
          // Authentication error - redirect to login
          console.warn('Authentication error, redirecting to login');
          dispatch(clearViewEditMode());
          if (navigate) {
            navigate('/login');
          }
          return;
        } else if (errorData.type === 'network') {
          // Network error 
          console.error('Network error:', errorData.message);
          dispatch(clearViewEditMode());
        } else {
          // Other errors
          console.error('Application load error:', errorData.message);
          dispatch(clearViewEditMode());
        }
      }
    } catch (error: any) {
      if (error.message === 'Request timeout') {
        console.error('Request timed out after 30 seconds');
        dispatch(clearError());
        dispatch(clearViewEditMode());
      } else {
        console.error('Error loading application for viewing:', error);
        dispatch(clearViewEditMode());
      }
    } finally {
      requestInProgressRef.current = false;
    }
  }, [dispatch, loadApplication]);

  // Handle Edit Application from table (loads and shows in edit mode)
  const handleEditApplicationFromTable = useCallback(async (applicationCode: string, navigate?: (path: string) => void, skipNavigation?: boolean) => {
    if (!applicationCode.trim()) {
      return;
    }

    if (requestInProgressRef.current) {
      return;
    }

    requestInProgressRef.current = true;

    try {
      // Navigate to edit route if navigate function is provided and not skipping navigation
      if (navigate && !skipNavigation) {
        navigate(`/niche/edit/${applicationCode}`);
      }

      dispatch(setApplicationNumber(applicationCode));
      dispatch(setEditMode(true));
      dispatch(setApplicationViewMode('form'));
      dispatch(setCurrentStep(1)); // Start at niche details for editing

      const action = await loadApplication(applicationCode.trim());

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

  // Handle Update Application (save changes)
  const handleUpdateApplication = useCallback(async (applicationCode: string, applicationData: Record<string, any>) => {
    if (!applicationCode.trim()) {
      return { success: false, error: 'Application code is required' };
    }

    try {
      console.log('[useApplication] handleUpdateApplication called with:', {
        applicationCode,
        applicationDataKeys: Object.keys(applicationData),
        hasApplicant: !!applicationData.applicant,
        hasNominees: !!applicationData.nominees,
        hasBeneficiaries: !!applicationData.beneficiaries,
        applicantData: applicationData.applicant ? {
          name: applicationData.applicant.name,
          email: applicationData.applicant.email,
          phone: applicationData.applicant.phone
        } : null,
        // Log the actual formData structure
        fullApplicationData: applicationData
      });

      // For PUT requests, we need to ensure the payload is in the correct optimized format
      // Check if we already have the optimized structure or need to transform it
      let optimizedPayload;

      if (applicationData.applicant && applicationData.nominees && applicationData.beneficiaries) {
        // Already in optimized format, use as-is
        optimizedPayload = applicationData;
        console.log('[useApplication] PUT payload already in optimized format');
      } else {
        // Transform flat structure to optimized format
        console.log('[useApplication] Transforming flat PUT payload to optimized format');
        const { generateOptimizedPayload } = await import('../utils/nicheApplicationMapper');
        optimizedPayload = generateOptimizedPayload(applicationData);
      }

      console.log('[useApplication] PUT request payload:', JSON.stringify(optimizedPayload, null, 2));

      const result = await dispatch(updateNicheApplication({
        applicationCode: applicationCode.trim(),
        applicationData: optimizedPayload
      }));

      if (result.type.endsWith('/fulfilled')) {
        return { success: true, data: result.payload };
      } else {
        const errorData = result.payload as { message: string; type: string; statusCode: number };
        return { success: false, error: errorData.message };
      }
    } catch (error: any) {
      console.error('Error updating application:', error);
      return { success: false, error: error.message || 'Failed to update application' };
    }
  }, [dispatch]);

  // Handle Delete Application from table
  const handleDeleteApplicationFromTable = useCallback(async (applicationCode: string) => {
    if (!applicationCode.trim()) {
      showError('Error', 'Application code is required');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete application ${applicationCode}? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await dispatch(deleteNicheApplication(applicationCode.trim()));

      if (result.type.endsWith('/fulfilled')) {
        console.log('Application deleted successfully');
        showSuccess('Success', `Application ${applicationCode} has been deleted successfully`);

        // Clear frontend cache to ensure fresh data
        dispatch(clearApplicationListCache());

        // Refresh the application list to reflect the deletion
        // Use bypassCache to ensure we get fresh data from backend
        await searchApplicationList({ pagination: { page: 1 } });
      } else {
        const errorData = result.payload as { message: string; type: string; statusCode: number };
        console.error('Error deleting application:', errorData.message);
        showError('Delete Failed', errorData.message || 'Failed to delete application');
      }
    } catch (error: any) {
      console.error('Error deleting application:', error);
      showError('Error', error.message || 'An unexpected error occurred while deleting the application');
    }
  }, [dispatch, searchApplicationList, showError, showSuccess]);

  // Handle Print Agreement button click - opens modal with agreement HTML template
  const handlePrintAgreement = useCallback(async () => {
    if (!applicationNumber.trim()) {
      console.warn('No application number provided for agreement viewing');
      return;
    }

    try {
      // Fetch agreement data from API
      const response = await nicheAgreementService.getNicheAgreement(applicationNumber.trim());

      if (response.success && response.data) {
        // Open modal with agreement data
        dispatch(openAgreementModal(response.data));
      } else {
        throw new NicheAgreementError('Failed to retrieve agreement data');
      }
    } catch (error: any) {
      if (error instanceof NicheAgreementError) {
        console.error('Error loading agreement:', error.message);
        dispatch(clearError());
      } else {
        console.error('Unexpected error:', error);
        dispatch(clearError());
      }
    }
  }, [applicationNumber, dispatch]);

  const detectInvoiceType = useCallback((code: string): string => {
    const upperCode = code.trim().toUpperCase();
    if (upperCode.startsWith('INCR-') || upperCode.startsWith('I-')) return 'INCR';
    if (upperCode.startsWith('GOLA-') || upperCode.startsWith('GOL-')) return 'GOLA';
    if (upperCode.startsWith('WAPP-') || upperCode.startsWith('WR') || upperCode.startsWith('WAKE')) return 'WAPP';
    if (upperCode.startsWith('NAPP-')) return 'NAPP';
    // Ambiguous numeric-hyphen codes are most commonly NAPP in current flow.
    if (/^\d+-\d+$/.test(upperCode)) return 'NAPP';
    return 'NAPP';
  }, []);

  // Handle Go to Invoice & Receipt button click
  // Navigates to Invoice page with explicit type query
  const handleGoToInvoice = useCallback(async (code?: string, type?: string) => {
    const appCode = (code ?? applicationNumber).trim();
    if (!appCode) {
      showError('Error', 'Please enter an application number to view the invoice.');
      return;
    }

    const resolvedType = (type || detectInvoiceType(appCode)).toUpperCase();
    navigate(`/create-invoice/${encodeURIComponent(appCode)}?type=${encodeURIComponent(resolvedType)}`, {
      state: { applicationNumber: appCode }
    });
  }, [applicationNumber, navigate, showError, detectInvoiceType]);

  // Handle Go to Invoice Only button click
  // Uses actual PDF endpoint that opens in new tab and is downloadable
  const handleGoToInvoiceOnly = useCallback(async () => {
    if (!applicationNumber.trim()) {
      console.warn('No application number provided for invoice only PDF generation');
      return;
    }

    try {
      // Check if it's a niche application (NAPP-*)
      if (/^NAPP/i.test(applicationNumber.trim())) {
        // Use niche application PDF service
        await nicheApplicationService.openPdfInNewTab(applicationNumber.trim(), 'invoice');
      } else {
        // Use niche agreement service for other application types
        // Set a timeout for invoice only PDF generation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Invoice only PDF generation timeout')), 15000); // 15 second timeout
        });

        await Promise.race([
          nicheAgreementService.openPdfInNewTab(applicationNumber.trim(), 'invoice'),
          timeoutPromise
        ]);
      }
    } catch (error: any) {
      if (error.message === 'Invoice only PDF generation timeout') {
        console.error('Invoice only PDF generation timed out after 15 seconds');
        dispatch(clearError());
      } else if (error instanceof NicheApplicationError) {
        console.error('Invoice only PDF generation error:', error.message);
        dispatch(clearError());
      } else if (error instanceof NicheAgreementError) {
        console.error('Invoice only PDF generation error:', error.message);
        dispatch(clearError());
      } else {
        console.error('Unexpected invoice only PDF error:', error);
      }
    }
  }, [applicationNumber, dispatch]);

  // Helper function to clear saved step data
  const clearSavedStepData = useCallback(() => {
    try {
      for (let step = 1; step <= 6; step++) {
        localStorage.removeItem(`niche-application-step-${step}`);
      }
      console.log('Cleared all saved step data');
    } catch (error) {
      console.error('Error clearing saved step data:', error);
    }
  }, []);

  // Handle New Application button click
  const handleNewApplication = useCallback(() => {
    // Clear previous application data but keep created applications list
    dispatch(clearPreviousApplicationData());
    // Clear saved step data when starting new application
    clearSavedStepData();
    // Reset application number to blank for new application
    dispatch(setApplicationNumber(''));
    // Clear view/edit mode
    dispatch(clearViewEditMode());
    // Clear loaded data flag to ensure consent forms are hidden
    // Note: We can't directly set isDataLoaded, but clearing formData and applicationNumber should work
    // Go directly to Niche Details for new applications (step 1, skipping Consent Forms)
    dispatch(setCurrentStep(1));
    // Clear any validation errors
    dispatch(clearValidationErrors());
    // Switch to form view - this is critical for showing the form
    dispatch(setApplicationViewMode('form'));
    console.log('New application started - all data cleared, starting at step 1 (Niche Details)');
  }, [dispatch, clearSavedStepData]);

  return {
    currentStep,
    formData,
    applicationNumber,
    loading,
    error,
    isDataLoaded,
    lastErrorType,
    // Niche application creation state
    isCreatingApplication,
    createdApplication,
    creationError,
    // Validation state
    validationErrors,
    isValidating,
    lastValidatedStep,
    viewMode,
    applicationList,
    applicationListLoading,
    applicationListError,
    applicationListFilters,
    applicationListPagination,
    goToStep,
    nextStep,
    previousStep,
    updateForm,
    setAppNumber,
    setViewMode,
    updateListFilters,
    resetApplicationList,
    clearListCache,
    searchApplicationList,
    resetApp,
    clearApplicationError,
    loadApplication,
    createApplication,
    handleViewApplication,
    handleViewApplicationFromTable,
    handleEditApplicationFromTable,
    handleDeleteApplicationFromTable,
    handleUpdateApplication,
    handlePrintAgreement,
    handleGoToInvoice,
    handleGoToInvoiceOnly,
    handleNewApplication,
    resetApplication,
    // View/Edit mode
    isViewMode,
    isEditMode,
    // Auto-save functionality
    loadSavedStepData,
    clearSavedStepData,
    // Validation functions
    validateStepData,
    validateStepDataLegacy,
    // Agreement modal
    isAgreementModalOpen,
    agreementModalData,
    closeAgreementModal: () => dispatch(closeAgreementModal()),
  };
};
