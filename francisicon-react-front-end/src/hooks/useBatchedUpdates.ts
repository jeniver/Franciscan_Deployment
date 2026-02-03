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
  const saveChanges = useCallback(async () => {
    if (!isEnabled || !isDirty || !applicationCode) {
      return { success: false, error: 'No changes to save or missing application code' };
    }

    try {
      const result: any = await dispatch(updateNicheApplication({
        applicationCode,
        applicationData: pendingChanges
      }) as any);

      if (result.type.endsWith('/fulfilled')) {
        // Clear pending changes after successful save
        dispatch(clearChanges());
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