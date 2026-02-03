import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateNicheApplication } from '../store/applicationSlice';

interface UseUpdateApplicationReturn {
  updateApplication: (applicationCode: string, applicationData: Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string }>;
  loading: boolean;
}

export const useUpdateApplication = (): UseUpdateApplicationReturn => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state: RootState) => state.application);

  const updateApplication = useCallback(async (applicationCode: string, applicationData: Record<string, any>) => {
    if (!applicationCode.trim()) {
      return { success: false, error: 'Application code is required' };
    }
    
    try {
      // Use the applicationData directly as it's already in the correct format
      // Just ensure beneficiaries array is preserved properly
      const updateData = { ...applicationData };
      
      const result: any = await dispatch(updateNicheApplication({
        applicationCode: applicationCode.trim(),
        applicationData: updateData
      }) as any);
      
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

  return {
    updateApplication,
    loading
  };
};