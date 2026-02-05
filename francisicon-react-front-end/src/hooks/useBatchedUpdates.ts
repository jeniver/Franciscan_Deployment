import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  addChange, 
  addChanges, 
  clearChanges, 
  initializeChanges,
  markAsClean
} from '../store/changesSlice';
import { updateNicheApplication } from '../store/applicationSlice';
import { useToast } from '../contexts/ToastContext';

interface UseBatchedUpdatesProps {
  applicationCode?: string;
  isEnabled?: boolean;
}

export const useBatchedUpdates = ({
  applicationCode,
  isEnabled = true
}: UseBatchedUpdatesProps = {}) => {
  const dispatch = useDispatch();
  const { showSuccess, showError } = useToast();
  
  const { pendingChanges, isDirty } = useSelector((state: RootState) => state.changes);
  const { loading: isUpdating } = useSelector((state: RootState) => state.application);

  // Add a single field change to pending changes
  const addFieldChange = useCallback((field: string, value: any) => {
    if (!isEnabled) return;
    
    dispatch(addChange({ field, value }));
  }, [dispatch, isEnabled]);

  // Add multiple field changes at once
  const addMultipleChanges = useCallback((changes: Record<string, any>) => {
    if (!isEnabled) return;
    
    dispatch(addChanges(changes));
  }, [dispatch, isEnabled]);

  // Save all pending changes
  const saveChanges = useCallback(async (fullFormData?: Record<string, any>) => {
    if (!isEnabled || (!isDirty && !fullFormData) || !applicationCode) {
      if (fullFormData && applicationCode) {
        // If we have full form data, proceed with the update anyway
      } else if (!applicationCode) {
        return { success: false, error: 'No application code provided' };
      } else {
        // If no changes and no full form data, return early
        return { success: true, data: null }; // Nothing to save but not an error
      }
    }

    try {
      console.log('[useBatchedUpdates] saveChanges called with:', {
        applicationCode,
        pendingChangesKeys: Object.keys(pendingChanges),
        hasFullFormData: !!fullFormData,
        fullFormDataKeys: fullFormData ? Object.keys(fullFormData) : [],
        pendingChanges: pendingChanges,
        // Check if there are flat fields
        applicantName: pendingChanges.applicantName,
        applicantEmail: pendingChanges.applicantEmail,
        applicantPhone: pendingChanges.applicantPhone,
        applicantIDNo: pendingChanges.applicantIDNo,
        applicantHomeTel: pendingChanges.applicantHomeTel,
        applicantOfficeTel: pendingChanges.applicantOfficeTel
      });

      // Merge pending changes with full form data if provided
      // This ensures we send complete data instead of just changes
      let combinedData = { ...pendingChanges };
      
      if (fullFormData) {
        // Override pending changes with full form data to ensure completeness
        combinedData = { ...fullFormData, ...pendingChanges };
      }

      // Ensure the payload is in the correct optimized format for PUT requests
      let updateData;
      
      if (combinedData.applicant && combinedData.nominees && combinedData.beneficiaries) {
        // Already in optimized format
        updateData = combinedData;
        console.log('[useBatchedUpdates] PUT payload already in optimized format');
      } else {
        // Transform flat structure to optimized format
        console.log('[useBatchedUpdates] Transforming flat PUT payload to optimized format');
        const { generateOptimizedPayload } = await import('../utils/nicheApplicationMapper');
        updateData = generateOptimizedPayload(combinedData);
      }
      
      console.log('[useBatchedUpdates] PUT request payload:', JSON.stringify(updateData, null, 2));

      const result: any = await dispatch(updateNicheApplication({
        applicationCode,
        applicationData: updateData
      }) as any);

      if (result.type.endsWith('/fulfilled')) {
        // Clear pending changes after successful save only if we had pending changes
        if (Object.keys(pendingChanges).length > 0) {
          dispatch(clearChanges());
        }
        showSuccess('Success', 'Changes saved successfully');
        return { success: true, data: result.payload };
      } else {
        const errorData = result.payload as { message: string; type: string; statusCode: number };
        showError('Error', errorData.message || 'Failed to save changes');
        return { success: false, error: errorData.message };
      }
    } catch (error: any) {
      console.error('Error saving changes:', error);
      showError('Error', error.message || 'Failed to save changes');
      return { success: false, error: error.message };
    }
  }, [dispatch, isEnabled, isDirty, applicationCode, pendingChanges, showSuccess, showError]);

  // Initialize changes when loading an application
  const initializeApplicationChanges = useCallback((initialData: Record<string, any>) => {
    if (!isEnabled) return;
    
    dispatch(initializeChanges(initialData));
  }, [dispatch, isEnabled]);

  // Mark current changes as saved without clearing them (for manual save scenarios)
  const markChangesAsSaved = useCallback(() => {
    if (!isEnabled) return;
    
    dispatch(markAsClean());
  }, [dispatch, isEnabled]);

  // Check if specific field has pending changes
  const hasPendingChange = useCallback((field: string) => {
    return field in pendingChanges;
  }, [pendingChanges]);

  // Get the pending value for a field
  const getPendingValue = useCallback((field: string) => {
    return pendingChanges[field];
  }, [pendingChanges]);

  return {
    // State
    pendingChanges,
    isDirty,
    isUpdating,
    
    // Actions
    addFieldChange,
    addMultipleChanges,
    saveChanges,
    initializeApplicationChanges,
    markChangesAsSaved,
    hasPendingChange,
    getPendingValue,
    
    // Utility
    clearChanges: () => dispatch(clearChanges())
  };
};