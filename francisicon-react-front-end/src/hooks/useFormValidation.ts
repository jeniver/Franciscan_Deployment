import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { validateStep, ValidationResult } from '../utils/validation';

export interface UseFormValidationReturn {
  validateCurrentStep: (step: number, formData: Record<string, any>) => ValidationResult;
  validateAndShowToast: (step: number, formData: Record<string, any>) => boolean;
  showValidationErrors: (errors: Record<string, string>) => void;
  showSuccessMessage: (message: string) => void;
  showErrorMessage: (message: string) => void;
  showWarningMessage: (message: string) => void;
  showInfoMessage: (message: string) => void;
}

export const useFormValidation = (): UseFormValidationReturn => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const validateCurrentStep = useCallback((step: number, formData: Record<string, any>): ValidationResult => {
    return validateStep(step, formData);
  }, []);

  const validateAndShowToast = useCallback((step: number, formData: Record<string, any>): boolean => {
    const validation = validateCurrentStep(step, formData);
    
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors);
      showValidationErrors(validation.errors);
      
      if (errorMessages.length === 1) {
        showError('Validation Error', errorMessages[0]);
      } else {
        showError('Validation Errors', `Please fix the following issues: ${errorMessages.join(', ')}`);
      }
      
      return false;
    }
    
    return true;
  }, [validateCurrentStep, showError]);

  const showValidationErrors = useCallback((errors: Record<string, string>) => {
    const errorMessages = Object.values(errors);
    if (errorMessages.length > 0) {
      showError('Form Validation', errorMessages.join(', '));
    }
  }, [showError]);

  const showSuccessMessage = useCallback((message: string) => {
    showSuccess('Success', message);
  }, [showSuccess]);

  const showErrorMessage = useCallback((message: string) => {
    showError('Error', message);
  }, [showError]);

  const showWarningMessage = useCallback((message: string) => {
    showWarning('Warning', message);
  }, [showWarning]);

  const showInfoMessage = useCallback((message: string) => {
    showInfo('Info', message);
  }, [showInfo]);

  return {
    validateCurrentStep,
    validateAndShowToast,
    showValidationErrors,
    showSuccessMessage,
    showErrorMessage,
    showWarningMessage,
    showInfoMessage
  };
};
