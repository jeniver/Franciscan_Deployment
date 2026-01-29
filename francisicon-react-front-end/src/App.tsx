import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WizardStepper } from './components/WizardStepper';
import { ConsentForms } from './pages/ConsentForms';
import { NicheDetails } from './pages/NicheDetails';
import { ContactPersonDetails } from './pages/ContactPersonDetails';
import { BeneficiaryDetails } from './pages/BeneficiaryDetails';
import { NomineeDetails } from './pages/NomineeDetails';
import { InvoiceReceipt } from './pages/InvoiceReceipt';
import { NicheAgreementDetailsModal } from './components/NicheAgreementDetailsModal';
import { AgreementViewerModal } from './components/AgreementViewerModal';
import { applicationEmailService } from './services/applicationEmailService';
import { EyeIcon, PrinterIcon, PlusIcon, FileTextIcon, HomeIcon, UserIcon, UsersIcon, UserCheckIcon, AlertCircleIcon, PenToolIcon } from 'lucide-react';
import { useApplication } from './hooks/useApplication';
import { useFormValidation } from './hooks/useFormValidation';
import { Button } from './components/common/Button';
import { Input } from './components/common/Input';
import { DateInput } from './components/common/DateInput';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { useDispatch } from 'react-redux';
import { setViewMode as setViewModeAction, setEditMode } from './store/applicationSlice';
import type { ApplicationListFilters } from './store/applicationSlice';

const DEFAULT_LIST_FILTERS: ApplicationListFilters = {
  applicationCode: '',
  applicantName: '',
  nomineeName: '',
  fromDate: '',
  toDate: ''
};

const steps = [{
  id: 1,
  label: 'Niche Details',
  icon: HomeIcon
}, {
  id: 2,
  label: 'Contact Person (Applicant) Details',
  icon: UserIcon
}, {
  id: 3,
  label: 'Beneficiary Details',
  icon: UsersIcon
}, {
  id: 4,
  label: 'Nominee Details',
  icon: UserCheckIcon
}, {
  id: 5,
  label: 'Consent Forms',
  icon: FileTextIcon
}];

export function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ applicationCode?: string }>();
  const {
    currentStep,
    formData,
    applicationNumber,
    setAppNumber,
    nextStep,
    previousStep,
    goToStep,
    updateForm,
    loading,
    error,
    isDataLoaded,
    lastErrorType,
    // Niche application creation state
    isCreatingApplication,
    createdApplication,
    creationError,
    createApplication,
    handleViewApplication,
    handleViewApplicationFromTable,
    handleEditApplicationFromTable,
    handleDeleteApplicationFromTable,
    handleUpdateApplication,
    handlePrintAgreement,
    handleGoToInvoice,
    handleNewApplication,
    clearApplicationError,
    resetApplication,
    isViewMode,
    isEditMode,
    // Auto-save functionality
    loadSavedStepData,
    viewMode,
    setViewMode,
    applicationList,
    applicationListLoading,
    applicationListError,
    applicationListFilters,
    applicationListPagination,
    updateListFilters,
    searchApplicationList,
    isAgreementModalOpen,
    agreementModalData,
    closeAgreementModal
  } = useApplication();

  const {
    validateAndShowToast,
    showSuccessMessage,
    showErrorMessage
  } = useFormValidation();

  const [lastCreatedCode, setLastCreatedCode] = useState<string | null>(null);
  const [isAgreementDetailsModalOpen, setIsAgreementDetailsModalOpen] = useState(false);
  // Track if we're intentionally creating a new application to prevent auto-switching to table view
  const isCreatingNewRef = useRef(false);
  const [selectedApplicationCode, setSelectedApplicationCode] = useState<string | null>(null);
  // Track last processed route to prevent infinite loops
  const lastProcessedRouteRef = useRef<string>('');
  const routeProcessingRef = useRef(false);
  // Track current state in refs to avoid dependency issues
  const stateRef = useRef({ viewMode, applicationNumber, isViewMode, isEditMode, currentStep });
  
  // Update refs when state changes
  useEffect(() => {
    stateRef.current = { viewMode, applicationNumber, isViewMode, isEditMode, currentStep };
  }, [viewMode, applicationNumber, isViewMode, isEditMode, currentStep]);

  // Handler for opening invoice PDF (error handling is now in the hook)
  const handleGoToInvoiceWithFeedback = useCallback(async () => {
    await handleGoToInvoice();
  }, [handleGoToInvoice]);

  const isFormView = viewMode === 'form';

  const handleStepClick = (stepId: number) => {
    goToStep(stepId);
  };

  const handleOpenTableView = useCallback(async (overrides: Partial<ApplicationListFilters> = {}) => {
    setViewMode('table');
    if (Object.keys(overrides).length > 0) {
      updateListFilters(overrides);
    }
    await searchApplicationList({
      ...(Object.keys(overrides).length > 0 ? { filters: overrides } : {}),
      pagination: { page: 1 }
    });
  }, [setViewMode, updateListFilters, searchApplicationList]);

  const handleSearch = useCallback(async () => {
    // Clear any pending debounced searches
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    // Clear cache before new search
    await searchApplicationList({ pagination: { page: 1 } });
  }, [searchApplicationList]);

  const handleResetSearch = useCallback(async () => {
    // Clear any pending debounced searches
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    const resetFilters: ApplicationListFilters = { ...DEFAULT_LIST_FILTERS };
    updateListFilters(resetFilters);
    // Clear cache and reset to first page
    await searchApplicationList({
      filters: resetFilters,
      pagination: { page: 1 }
    });
  }, [updateListFilters, searchApplicationList]);

  const handleCreateNewFromTable = useCallback(() => {
    // Set flag to prevent useEffect from switching back to table view
    isCreatingNewRef.current = true;
    setLastCreatedCode(null);
    // Navigate to /niche/new route
    navigate('/niche/new');
  }, [navigate]);

  // Debounce timer ref for search inputs
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchFieldChange = useCallback((field: keyof ApplicationListFilters, value: string) => {
    updateListFilters({ [field]: value } as Partial<ApplicationListFilters>);

    // Clear existing debounce timer
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Debounce search for text inputs (dates are handled in their own onChange)
    if (field === 'applicationCode' || field === 'applicantName' || field === 'nomineeName') {
      searchDebounceRef.current = setTimeout(() => {
        // Auto-search after 500ms of no typing
        void searchApplicationList({
          filters: { [field]: value } as Partial<ApplicationListFilters>,
          pagination: { page: 1 }
        });
      }, 500);
    }
  }, [updateListFilters, searchApplicationList]);

  const handleShowApplicationsClick = useCallback(() => {
    void handleOpenTableView();
  }, [handleOpenTableView]);

  const handleListPageChange = useCallback(async (page: number) => {
    await searchApplicationList({ pagination: { page } });
  }, [searchApplicationList]);

  // Determine if consent forms step should be shown
  // Show consent forms when: application number exists AND (in view/edit mode OR application is loaded)
  // Hide consent forms when creating a new application (no application number and not in view/edit mode)
  const showConsentStep = (Boolean(applicationNumber.trim()) && (isViewMode || isEditMode || isDataLoaded)) || false;

  const visibleSteps = useMemo(() => {
    // Consent Forms is now step 5 (last step)
    return showConsentStep ? steps : steps.filter(step => step.id !== 5);
  }, [showConsentStep]);

  useEffect(() => {
    // If consent step shouldn't be shown and we're on step 5, go back to step 1
    if (!showConsentStep && currentStep === 5) {
      goToStep(1);
    }
  }, [showConsentStep, currentStep, goToStep]);

  // Sync route params with Redux state - This is the primary route handler
  useEffect(() => {
    const path = location.pathname;
    const routeKey = `${path}:${params.applicationCode || ''}`;
    
    // Prevent infinite loops - only process if route actually changed
    if (routeProcessingRef.current) {
      return;
    }
    
    // Check if route actually changed
    if (lastProcessedRouteRef.current === routeKey) {
      return;
    }
    
    routeProcessingRef.current = true;
    lastProcessedRouteRef.current = routeKey;
    
    // Use setTimeout to allow state updates to complete before resetting the flag
    const resetProcessing = () => {
      setTimeout(() => {
        routeProcessingRef.current = false;
      }, 100);
    };
    
    // Handle /niche/new route - create new application
    if (path === '/niche/new') {
      isCreatingNewRef.current = true;
      const currentState = stateRef.current;
      // Only call handleNewApplication if we're not already in the right state
      if (currentState.applicationNumber.trim() !== '' || currentState.isViewMode || currentState.isEditMode || currentState.viewMode !== 'form') {
        handleNewApplication();
      }
      // Ensure we're on step 1
      if (currentState.currentStep !== 1) {
        goToStep(1);
      }
      resetProcessing();
      return;
    }
    
    // Handle /niche/view/:applicationCode route - view application
    if (path.startsWith('/niche/view/') && params.applicationCode) {
      const codeFromRoute = params.applicationCode;
      const currentState = stateRef.current;
      // Only load if we need to
      if (codeFromRoute !== currentState.applicationNumber || !currentState.isViewMode || currentState.viewMode !== 'form') {
        if (currentState.viewMode !== 'form') {
          setViewMode('form');
        }
        // Load and view the application (skip navigation to prevent loop)
        handleViewApplicationFromTable(codeFromRoute, navigate, true).finally(() => {
          resetProcessing();
        });
      } else {
        resetProcessing();
      }
      return;
    }
    
    // Handle /niche/edit/:applicationCode route - edit application
    if (path.startsWith('/niche/edit/') && params.applicationCode) {
      const codeFromRoute = params.applicationCode;
      const currentState = stateRef.current;
      // Only load if we need to
      if (codeFromRoute !== currentState.applicationNumber || !currentState.isEditMode || currentState.viewMode !== 'form') {
        if (currentState.viewMode !== 'form') {
          setViewMode('form');
        }
        // Load and edit the application (skip navigation to prevent loop)
        handleEditApplicationFromTable(codeFromRoute, navigate, true).finally(() => {
          resetProcessing();
        });
      } else {
        resetProcessing();
      }
      return;
    }
    
    // Handle /niche route (base) - show table view
    if (path === '/niche') {
      const currentState = stateRef.current;
      // Only switch to table if not already there
      if (currentState.viewMode !== 'table') {
        setViewMode('table');
        handleOpenTableView();
      } else {
        // If already in table view, just ensure data is loaded (but don't force refresh to prevent loops)
        // The table will load data on its own if needed
      }
      resetProcessing();
      return;
    }
    
    resetProcessing();
  }, [location.pathname, params.applicationCode]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const consentVisibilityRef = useRef(showConsentStep);
  useEffect(() => {
    // Consent Forms is now step 5 (last step)
    if (!consentVisibilityRef.current && showConsentStep) {
      goToStep(5);
    } else if (consentVisibilityRef.current && !showConsentStep && currentStep === 5) {
      goToStep(1);
    }
    consentVisibilityRef.current = showConsentStep;
  }, [showConsentStep, currentStep, goToStep]);

  const handleCreateNicheApplication = async () => {
    try {
      console.log('[Save Niche Application] Clicked', {
        currentStep,
        formDataSnapshot: formData
      });

      // Validate the final step before creating niche application
      if (!validateAndShowToast(currentStep, formData)) {
        return;
      }

      // Get contact person email before creating (for email sending)
      const contactEmail = formData.applicantEmail || formData.contactEmail || '';
      const applicantName = formData.applicantName || formData.contactName || '';

      // Create the niche application
      const result = await createApplication();
      if (result.type?.endsWith('/fulfilled')) {
        const applicationPayload = (result as any).payload as {
          code?: string;
          message?: string;
          data?: any;
        } | undefined;
        const applicationCode = applicationPayload?.code || applicationNumber || createdApplication?.code;
        if (!applicationCode) {
          showErrorMessage('Missing niche application code. Please try saving again.');
          return;
        }

        // Calculate invoice data for email
        const selectedNiche = formData.nicheId ?
          (formData.niche || { defaultAmount: 1000 }) :
          { defaultAmount: 0 };
        const nicheAmount = selectedNiche.defaultAmount || 0;
        const serviceAmount = 200;
        const taxAmount = Math.round((nicheAmount + serviceAmount) * 0.07);
        const totalAmount = nicheAmount + serviceAmount + taxAmount;
        const invoiceNo = `INV-${Date.now()}`;
        const invoiceDate = new Date().toLocaleDateString();
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

        // Send emails in background (don't wait for them)
        if (contactEmail && contactEmail.trim()) {
          // Send thank you email
          applicationEmailService.sendThankYouEmail({
            to: contactEmail,
            applicationCode,
            applicantName,
            invoiceData: {
              invoiceNo,
              invoiceDate,
              totalAmount
            }
          }).catch(err => console.error('Failed to send thank you email:', err));

          // Send invoice email
          applicationEmailService.sendInvoiceEmail({
            to: contactEmail,
            applicationCode,
            applicantName,
            invoiceData: {
              invoiceNo,
              invoiceDate,
              dueDate,
              totalAmount,
              nicheAmount,
              serviceAmount,
              taxAmount
            },
            nicheDetails: {
              nicheCode: formData.nicheCode || '',
              chapel: formData.chapel || ''
            }
          }).catch(err => console.error('Failed to send invoice email:', err));
        }

        showSuccessMessage(`🎉 Niche Application Created Successfully! 
        
Application Code: ${applicationCode}
Status: Created
${contactEmail ? `\nConfirmation and invoice emails have been sent to ${contactEmail}.` : ''}

You will now be redirected to the Invoice & Receipt page.`);

        // Navigate directly to Invoice & Receipt for this application
        await handleGoToInvoice(applicationCode);
      }
    } catch (error) {
      console.error('Error creating niche application:', error);
      showErrorMessage('Failed to create niche application. Please try again.');
    }
  };

  // Load saved step data when component mounts
  useEffect(() => {
    loadSavedStepData();
  }, [loadSavedStepData]);

  // Secondary effect: Reset flag after form view is established for /niche/new
  // This prevents the auto-table-view effect from interfering with /niche/new
  useEffect(() => {
    const path = location.pathname;
    
    // Reset the flag after a delay to allow the form view to be established for /niche/new
    if (isCreatingNewRef.current && path === '/niche/new') {
      const timer = setTimeout(() => {
        isCreatingNewRef.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Create a read-only setFormData that prevents updates in view mode
  const readOnlySetFormData = useCallback((data: any) => {
    if (!isViewMode) {
      updateForm(data);
    }
  }, [isViewMode, updateForm]);

  const renderStep = () => {
    const isReadOnly = isViewMode;
    const setFormDataFn = isReadOnly ? readOnlySetFormData : updateForm;

    switch (currentStep) {
      case 1:
        return <NicheDetails formData={formData} setFormData={setFormDataFn} isReadOnly={isReadOnly} />;
      case 2:
        return <ContactPersonDetails formData={formData} setFormData={setFormDataFn} isReadOnly={isReadOnly} />;
      case 3:
        return <BeneficiaryDetails formData={formData} setFormData={setFormDataFn} isReadOnly={isReadOnly} />;
      case 4:
        return <NomineeDetails formData={formData} setFormData={setFormDataFn} isReadOnly={isReadOnly} />;
      case 5:
        // Consent Forms is now the last step
        if (!showConsentStep) {
          // If consent step shouldn't be shown, go back to step 1
          return <NicheDetails formData={formData} setFormData={setFormDataFn} isReadOnly={isReadOnly} />;
        }
        return <ConsentForms formData={formData} setFormData={setFormDataFn} isReadOnly={isReadOnly} />;
      case 6:
        return <InvoiceReceipt formData={formData} setFormData={setFormDataFn} isReadOnly={isReadOnly} />;
      default:
        return <NicheDetails formData={formData} setFormData={setFormDataFn} isReadOnly={isReadOnly} />;
    }
  };

  const formatDisplayDate = (value?: string) => {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    // Format as "date - month - year" (e.g., "13 - Oct - 2025")
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

  const renderTableView = () => {
    const hasApplications = applicationList.length > 0;
    // Calculate totalPages correctly - ensure it's at least 1 and never less than current page
    const calculatedTotalPages = applicationListPagination.total > 0 && applicationListPagination.pageSize > 0
      ? Math.max(1, Math.ceil(applicationListPagination.total / applicationListPagination.pageSize))
      : (hasApplications ? 1 : 1);
    const totalPages = Math.max(1, applicationListPagination.totalPages ?? calculatedTotalPages);

    return (
      <div className="space-y-6 pb-6">
        {lastCreatedCode && (
          <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg text-sm text-emerald-700">
            Recent application <span className="font-semibold">{lastCreatedCode}</span> has been created successfully and highlighted below.
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Niche Applications</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Application Code</label>
              <Input
                type="text"
                value={applicationListFilters.applicationCode}
                onChange={(e) => handleSearchFieldChange('applicationCode', e.target.value)}
                placeholder="Search by application code (e.g., NAPP-23)"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Applicant Name</label>
              <Input
                type="text"
                value={applicationListFilters.applicantName}
                onChange={(e) => handleSearchFieldChange('applicantName', e.target.value)}
                placeholder="Search by applicant name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Nominee Name</label>
              <Input
                type="text"
                value={applicationListFilters.nomineeName}
                onChange={(e) => handleSearchFieldChange('nomineeName', e.target.value)}
                placeholder="Search by nominee name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <DateInput
                label="From Date"
                value={applicationListFilters.fromDate}
                onChange={(apiDate) => {
                  handleSearchFieldChange('fromDate', apiDate);
                  // Debounce date changes to avoid excessive API calls
                  if (searchDebounceRef.current) {
                    clearTimeout(searchDebounceRef.current);
                  }
                  searchDebounceRef.current = setTimeout(() => {
                    void searchApplicationList({
                      filters: { fromDate: apiDate } as Partial<ApplicationListFilters>,
                      pagination: { page: 1 }
                    });
                  }, 800); // Slightly longer debounce for dates
                }}
                placeholder="dd/mm/yyyy"
              />
            </div>
            <div className="flex flex-col gap-2">
              <DateInput
                label="To Date"
                value={applicationListFilters.toDate}
                onChange={(apiDate) => {
                  handleSearchFieldChange('toDate', apiDate);
                  // Debounce date changes to avoid excessive API calls
                  if (searchDebounceRef.current) {
                    clearTimeout(searchDebounceRef.current);
                  }
                  searchDebounceRef.current = setTimeout(() => {
                    void searchApplicationList({
                      filters: { toDate: apiDate } as Partial<ApplicationListFilters>,
                      pagination: { page: 1 }
                    });
                  }, 800); // Slightly longer debounce for dates
                }}
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => void handleSearch()}
              disabled={applicationListLoading}
              icon={applicationListLoading ? <LoadingSpinner size="sm" text="" /> : undefined}
            >
              {applicationListLoading ? 'Searching...' : 'Search'}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleResetSearch()}
              disabled={applicationListLoading}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {applicationListError && (
            <div className="p-4 border-b border-red-200 bg-red-50 text-sm text-red-700">
              {applicationListError}
            </div>
          )}

          {applicationListLoading && !hasApplications ? (
            <div className="p-12 flex items-center justify-center">
              <LoadingSpinner size="md" text="Loading applications..." />
            </div>
          ) : hasApplications ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Application #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Chapel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Niche
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applicationList.map((application, index) => {
                    const applicationCode =
                      application.applicationCode ||
                      application.code ||
                      application.applicationNumber ||
                      '';
                    const applicantNameValue =
                      application.applicantName ||
                      application.applicant?.name ||
                      application.contactName ||
                      '—';
                    const chapelName =
                      application.chapelName ||
                      application.chapel?.name ||
                      application.niche?.chapelName ||
                      application.nicheDetails?.chapel ||
                      '—';
                    const nicheCode =
                      application.nicheCode ||
                      application.niche?.code ||
                      application.nicheDetails?.nicheCode ||
                      '—';
                    const statusRaw =
                      application.statusText ||
                      application.statusLabel ||
                      application.statusDescription ||
                      application.status ||
                      application.applicationStatus ||
                      application.state ||
                      'Pending';
                    const statusLabel = typeof statusRaw === 'number' ? `Status ${statusRaw}` : String(statusRaw);
                    const statusTone = statusLabel.toLowerCase();
                    let statusClass = 'bg-gray-100 text-gray-700';
                    if (statusTone.includes('pending')) {
                      statusClass = 'bg-yellow-100 text-yellow-700';
                    } else if (statusTone.includes('approve') || statusTone.includes('create') || statusTone.includes('active')) {
                      statusClass = 'bg-emerald-100 text-emerald-700';
                    } else if (statusTone.includes('reject') || statusTone.includes('cancel') || statusTone.includes('void')) {
                      statusClass = 'bg-red-100 text-red-700';
                    }
                    const createdTimestamp =
                      application.createdAt ||
                      application.createdOn ||
                      application.createdDate ||
                      application.appliedDate ||
                      application.created ||
                      '';
                    const isHighlighted = !!(lastCreatedCode && applicationCode && lastCreatedCode === applicationCode);

                    return (
                      <tr
                        key={`${applicationCode || 'unknown'}-${index}`}
                        className={`${isHighlighted ? 'bg-emerald-50' : 'hover:bg-gray-50'} transition-colors`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {applicationCode || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {applicantNameValue}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {chapelName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {nicheCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                            {statusLabel || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDisplayDate(createdTimestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                handleViewApplicationFromTable(applicationCode, navigate);
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              title="View Application Details"
                            >
                              View
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleEditApplicationFromTable(applicationCode, navigate)}
                              className="text-green-600 hover:text-green-800 hover:underline"
                              title="Edit Application"
                            >
                              Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDeleteApplicationFromTable(applicationCode)}
                              className="text-red-600 hover:text-red-800 hover:underline"
                              title="Delete Application"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-gray-500">
              No applications found. Adjust your filters and try again.
            </div>
          )}

          {applicationListPagination.total > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">
                  Page {applicationListPagination.page} of {totalPages}
                </span>
                <span className="text-xs text-gray-500">
                  Showing {applicationListPagination.currentPageStart ?? ((applicationListPagination.page - 1) * applicationListPagination.pageSize + 1)} - {applicationListPagination.currentPageEnd ?? Math.min(applicationListPagination.page * applicationListPagination.pageSize, applicationListPagination.total)} of {applicationListPagination.total} result{applicationListPagination.total === 1 ? '' : 's'}
                  {applicationListPagination.remainingPages !== undefined && applicationListPagination.remainingPages > 0 && (
                    <span> • {applicationListPagination.remainingPages} page{applicationListPagination.remainingPages === 1 ? '' : 's'} remaining</span>
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleListPageChange(applicationListPagination.page - 1)}
                  disabled={!applicationListPagination.hasPreviousPage || applicationListLoading}
                  title={applicationListPagination.hasPreviousPage ? 'Go to previous page' : 'No previous page'}
                >
                  ← Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleListPageChange(applicationListPagination.page + 1)}
                  disabled={!applicationListPagination.hasNextPage || applicationListLoading}
                  title={applicationListPagination.hasNextPage ? 'Go to next page' : 'No next page'}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Get error styling based on error type
  const getErrorStyling = () => {
    switch (lastErrorType) {
      case 'auth':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'network':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'validation':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-red-50 border-red-200 text-red-700';
    }
  };

  // Get error icon based on error type
  const getErrorIcon = () => {
    switch (lastErrorType) {
      case 'auth':
        return <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case 'network':
        return <AlertCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
      case 'validation':
        return <AlertCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />;
      default:
        return <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />;
    }
  };

  return <Layout title="Niche Application">
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 mb-4">
            {isFormView ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-700">
                    Application Number:
                  </p>
                  <Input
                    type="text"
                    value={applicationNumber}
                    onChange={(e) => setAppNumber(e.target.value)}
                    className="text-lg font-bold text-gray-900 w-32 md:w-40 py-2 px-3 border border-gray-300 rounded-md"
                    placeholder="Enter application number"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    icon={loading ? <LoadingSpinner size="sm" text="" /> : <EyeIcon className="w-4 h-4" />}
                    onClick={handleViewApplication}
                    disabled={loading || !applicationNumber.trim()}
                  >
                    {loading ? 'Loading...' : 'View'}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<PrinterIcon className="w-4 h-4" />}
                    onClick={handlePrintAgreement}
                    disabled={!applicationNumber.trim()}
                  >
                    Print Agreement
                  </Button>
                  <Button
                    variant="primary"
                    iconPosition="right"
                    onClick={handleGoToInvoiceWithFeedback}
                    disabled={!applicationNumber.trim()}
                  >
                    Invoice & Receipt
                  </Button>
                  {applicationNumber && (
                    <Button
                      variant="secondary"
                      icon={<PenToolIcon className="w-4 h-4" />}
                      onClick={() => navigate(`/inscription?applicationCode=${applicationNumber}`)}
                      title="View Inscription"
                    >
                      View Inscription
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    icon={<FileTextIcon className="w-4 h-4" />}
                    onClick={handleShowApplicationsClick}
                  >
                    View Applications
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Niche Applications</h2>
                  <p className="text-sm text-gray-600">
                    Use the filters, date range, or status below to locate existing applications.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleSearch()}
                    disabled={applicationListLoading}
                  >
                    {applicationListLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button
                    variant="primary"
                    icon={<PlusIcon className="w-4 h-4" />}
                    onClick={handleCreateNewFromTable}
                    className="bg-[#8b5a2b] text-white hover:bg-[#6d4420] border-[#8b5a2b]"
                  >
                    Create New Application
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Error Display */}
          {error && (
            <div className={`mb-4 p-4 border rounded-lg flex items-center gap-3 ${getErrorStyling()}`}>
              {getErrorIcon()}
              <div className="flex-1 text-sm">{error}</div>
              <button
                onClick={clearApplicationError}
                className="text-sm font-medium hover:opacity-75"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Niche Application Creation Error Display */}
          {creationError && (
            <div className="mb-4 p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 flex items-center gap-3">
              <AlertCircleIcon className="w-5 h-5 text-red-600" />
              <div className="flex-1 text-sm">{creationError}</div>
              <button
                onClick={clearApplicationError}
                className="text-sm font-medium hover:opacity-75"
              >
                Dismiss
              </button>
            </div>
          )}

          {isFormView ? (
            <>
              {createdApplication && (
                <div className="mb-4 p-4 border border-green-200 bg-green-50 rounded-lg flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-green-800">
                      🎉 Niche Application Created Successfully!
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Application Code: {createdApplication.code} | Status: Created
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      resetApplication();
                    }}
                    className="text-sm font-medium text-green-700 hover:opacity-75"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {isDataLoaded && !error && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <EyeIcon className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-green-700 text-sm">
                    Application data loaded successfully for {applicationNumber}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActiveStep = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  return <button key={step.id} onClick={() => handleStepClick(step.id)} className="flex flex-col items-center gap-2 flex-1 relative group">
                    {index < steps.length - 1 && <div className={`absolute left-1/2 top-5 h-0.5 w-full ${isCompleted ? 'bg-gradient-to-r from-[#8b2828] to-[#7d1f1f]' : 'bg-gray-300'}`} />}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActiveStep ? 'bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white ring-4 ring-red-100' : isCompleted ? 'bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white' : 'bg-gray-200 text-gray-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-medium text-center max-w-[120px] ${isActiveStep ? 'text-[#8b2828]' : isCompleted ? 'text-gray-700' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </button>;
                })}
              </div>
            </>
          ) : (
            renderTableView()
          )}
        </div>
      </div>
      {isFormView && (
        <div className="flex max-w-7xl mx-auto">
          <WizardStepper steps={visibleSteps} currentStep={currentStep} onStepClick={handleStepClick} />
          <div className="flex-1 p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* View/Edit Mode Banner */}
              {isViewMode && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EyeIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">View Mode - Application is read-only</span>
                    </div>
                    <button
                      onClick={() => {
                        navigate('/niche');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Back to Applications
                    </button>
                  </div>
                </div>
              )}
              {isEditMode && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PrinterIcon className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-900">Edit Mode - You can modify the application</span>
                    </div>
                    <button
                      onClick={() => {
                        navigate('/niche');
                      }}
                      className="text-sm text-green-600 hover:text-green-800 hover:underline"
                    >
                      Back to Applications
                    </button>
                  </div>
                </div>
              )}
              {renderStep()}
              {!isViewMode && !isEditMode && (
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={previousStep}
                    disabled={currentStep === 1}
                  >
                    ← Previous Step
                  </Button>
                  <Button
                    variant="primary"
                    onClick={currentStep === 4 ? handleCreateNicheApplication : nextStep}
                    disabled={(currentStep === 4 || currentStep === 5) && isCreatingApplication}
                    icon={(loading || isCreatingApplication) ? <LoadingSpinner size="sm" text="" /> : undefined}
                  >
                    {loading ? 'Saving...' :
                      isCreatingApplication ? 'Creating Niche Application...' :
                        currentStep === 4 ? 'Create Application' : 
                        currentStep === 5 ? 'Next Step →' : 'Next Step →'}
                  </Button>
                </div>
              )}
              {isEditMode && (
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigate('/niche');
                      setViewMode('table');
                    }}
                  >
                    ← Cancel
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={previousStep}
                      disabled={currentStep === 1}
                    >
                      ← Previous Step
                    </Button>
                    <Button
                      variant="primary"
                      onClick={async () => {
                        if (currentStep === 5) {
                          // Save the application - only Consent Forms can update when editing
                          const result = await handleUpdateApplication(applicationNumber, formData);
                          if (result.success) {
                            showSuccessMessage('Application updated successfully!');
                            // Switch to view mode after successful update
                            dispatch(setViewModeAction(true));
                            dispatch(setEditMode(false));
                            // Reload the application to show updated data and navigate to view
                            await handleViewApplicationFromTable(applicationNumber, navigate);
                            // Ensure we're in form view mode (handleViewApplicationFromTable already does this)
                          } else {
                            showErrorMessage(result.error || 'Failed to update application');
                          }
                        } else {
                          // For steps 1-4, just move to next step
                          nextStep();
                        }
                      }}
                      disabled={loading}
                      icon={loading ? <LoadingSpinner size="sm" text="" /> : undefined}
                    >
                      {loading ? 'Saving...' :
                        currentStep === 5 ? 'Update Application' : 'Next Step →'}
                    </Button>
                  </div>
                </div>
              )}
              {isViewMode && (
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigate('/niche');
                    }}
                  >
                    ← Back to Applications
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleEditApplicationFromTable(applicationNumber)}
                      className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                    >
                      Edit Application
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGoToInvoiceWithFeedback}
                      disabled={!applicationNumber.trim()}
                    >
                      Go to Invoice & Receipt
                    </Button>
                    {applicationNumber && (
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/inscription?applicationCode=${applicationNumber}`)}
                        className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                        icon={<PenToolIcon className="w-4 h-4" />}
                      >
                        View Inscription
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Niche Agreement Details Modal */}
    <NicheAgreementDetailsModal
      isOpen={isAgreementDetailsModalOpen}
      onClose={() => {
        setIsAgreementDetailsModalOpen(false);
        setSelectedApplicationCode(null);
      }}
      applicationCode={selectedApplicationCode}
    />

    {/* Agreement Viewer Modal - for Print Agreement */}
    <AgreementViewerModal
      isOpen={isAgreementModalOpen}
      onClose={closeAgreementModal}
      agreementData={agreementModalData}
      applicationNumber={applicationNumber}
      loading={loading}
    />
  </Layout>;
}