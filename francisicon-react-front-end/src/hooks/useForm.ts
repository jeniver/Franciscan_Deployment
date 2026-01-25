import { useState, useCallback } from 'react';

interface FormErrors {
  [key: string]: string;
}

interface UseFormProps<T> {
  initialValues: T;
  validate?: (values: T) => FormErrors;
}

export const useForm = <T extends Record<string, any>>({
  initialValues,
  validate,
}: UseFormProps<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  }, [errors]);

  const handleSubmit = useCallback(async (onSubmit: (values: T) => Promise<void> | void) => {
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (validate) {
        const validationErrors = validate(values);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          setIsSubmitting(false);
          return;
        }
      }
      
      // Clear errors
      setErrors({});
      
      // Submit form
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    reset,
  };
};