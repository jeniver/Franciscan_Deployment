import { useCallback } from 'react';
import { SaveIcon, Loader2Icon } from 'lucide-react';
import { Button } from './common/Button';
import { useBatchedUpdates } from '../hooks/useBatchedUpdates';
import { useApplication } from '../hooks/useApplication';
import { useFormValidation } from '../hooks/useFormValidation';

interface UpdateApplicationButtonProps {
  formData: any;
  isReadOnly?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

export function UpdateApplicationButton({
  formData,
  isReadOnly = false,
  className = '',
  size = 'md',
  variant = 'primary'
}: UpdateApplicationButtonProps) {
  const { applicationNumber, isEditMode } = useApplication();
  const { isDirty, saveChanges, isUpdating } = useBatchedUpdates({
    applicationCode: applicationNumber,
    isEnabled: !isReadOnly
  });
  const { showSuccessMessage, showErrorMessage } = useFormValidation();

  const handleUpdateApplication = useCallback(async () => {
    if (isReadOnly) return;

    try {
      console.log('[UpdateApplicationButton] Updating application with formData:', {
        applicationCode: applicationNumber,
        formDataKeys: Object.keys(formData),
        hasApplicant: !!formData.applicantName || !!formData.applicant,
        hasBeneficiaries: !!formData.beneficiaries,
        hasNominees: !!formData.nominees,
        isDirty
      });

      // Save all changes with the complete form data
      // Even if there are no pending changes, we still want to save the complete form
      const result = await saveChanges(formData);

      if (result.success) {
        showSuccessMessage('Application updated successfully!');
      } else {
        showErrorMessage(result.error || 'Failed to update application');
      }
    } catch (error: any) {
      console.error('[UpdateApplicationButton] Error updating application:', error);
      showErrorMessage(error.message || 'Failed to update application');
    }
  }, [isReadOnly, applicationNumber, formData, saveChanges, showSuccessMessage, showErrorMessage]);

  // Show button ONLY in edit mode
  // This ensures it's hidden on /niche/new route
  if (isReadOnly || !isEditMode) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleUpdateApplication}
      disabled={isUpdating}
      className={`flex items-center gap-2 ${className}`}
    >
      {isUpdating ? (
        <>
          <Loader2Icon className="w-4 h-4 animate-spin" />
          Updating...
        </>
      ) : (
        <>
          <SaveIcon className="w-4 h-4" />
          Update Application
        </>
      )}
    </Button>
  );
}