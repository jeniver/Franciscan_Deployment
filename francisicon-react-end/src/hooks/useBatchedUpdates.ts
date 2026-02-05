  // Save all pending changes
  const saveChanges = useCallback(async (fullFormData?: Record<string, any>) => {
    if (!isEnabled || (!isDirty && !fullFormData) || !applicationCode) {
      // If we have full form data, we should still proceed with the update
      if (fullFormData && applicationCode) {
        // Proceed with the full form data
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
      } else {
        // If no full form data provided, ensure we have all fields by merging with potential missing data
        // This is important to maintain all data, not just the changed fields
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
        // Clear pending changes after successful save
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