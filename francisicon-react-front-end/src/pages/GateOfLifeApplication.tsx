import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EyeIcon, CheckIcon, AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, FileTextIcon, TableIcon, FileEditIcon, ReceiptIcon } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DateInput } from '../components/common/DateInput';
import { useGateOfLife } from '../hooks/useGateOfLife';
import { mapApiApplicationToFormData } from '../utils/gateOfLifeMapper';
import { useToast } from '../contexts/ToastContext';
import { getTodayDate } from '../utils/dateUtils';

interface GateOfLifeApplicationProps {
  formData?: any;
  setFormData?: (data: any) => void;
}

const steps = [
  {
    id: 1,
    label: 'Names to be Engraved',
    icon: FileTextIcon
  },
  {
    id: 2,
    label: 'Applicant Details',
    icon: UserIcon
  }
];

export function GateOfLifeApplication({ }: GateOfLifeApplicationProps = {}) {
  const navigate = useNavigate();
  const { applicationCode } = useParams<{ applicationCode?: string }>();
  const [applicationNumber, setApplicationNumber] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [lastBookingNumber] = useState('GOL-2024-001');
  const [bookingDate, setBookingDate] = useState(getTodayDate());
  const [viewMode, setViewMode] = useState<'form' | 'table'>('table');
  
  // Toast notifications
  const { showError, showSuccess } = useToast();
  
  // Use the custom hook
  const {
    formData: reduxFormData,
    applicationCode: reduxApplicationCode,
    loading,
    error,
    lastErrorType,
    isDataLoaded,
    clearApplicationError,
    handleViewApplication,
    handleSaveApplication,
    handleUpdateApplication,
    handleInvoiceReceipt,
    applicationList,
    applicationListLoading,
    applicationListError,
    applicationListFilters,
    applicationListPagination,
    updateListFilters,
    searchApplicationList,
    handleViewApplicationFromTable,
    handleEditApplicationFromTable,
    handleDeleteApplicationFromTable,
    isViewMode,
    isEditMode,
    resetApp,
    clearViewEditMode
  } = useGateOfLife();

  // Sync Redux formData with local state when data is loaded
  useEffect(() => {
    if (isDataLoaded && reduxFormData) {
      try {
        const mappedData = mapApiApplicationToFormData(reduxFormData as any);
        console.log('Mapped form data:', mappedData);
        
        if (mappedData.applicationNumber) {
          setApplicationNumber(mappedData.applicationNumber);
        }
        
        if (mappedData.bookingDate) {
          // Date is already formatted in the mapper
          setBookingDate(mappedData.bookingDate);
        }
        
        if (mappedData.applicantData) {
          // Ensure idNo is included
          setApplicantData({
            ...mappedData.applicantData,
            idNo: mappedData.applicantData.idNo || ''
          });
        }
        
        if (mappedData.engravings && mappedData.engravings.length > 0) {
          setEngravings(mappedData.engravings);
        }
        
        // Switch to form view when data is loaded
        setViewMode('form');
      } catch (error) {
        console.error('Error mapping form data:', error);
      }
    }
  }, [isDataLoaded, reduxFormData]);

  // Handle route parameters for edit mode
  useEffect(() => {
    if (applicationCode) {
      // Set application number from route parameter
      setApplicationNumber(applicationCode);
      // Set view mode to form for editing
      setViewMode('form');
      // Load the application data for editing
      handleEditApplicationFromTable(applicationCode);
    }
  }, [applicationCode, handleEditApplicationFromTable]);

  // Sync application code from Redux
  useEffect(() => {
    if (reduxApplicationCode && reduxApplicationCode !== applicationNumber) {
      setApplicationNumber(reduxApplicationCode);
    }
  }, [reduxApplicationCode]);
  
  // Names to be Engraved State
  const [engravings, setEngravings] = useState([
    {
      name: '',
      relationship: '',
      dateOfBirth: '',
      dateOfDeath: '',
      additionalInfo: ''
    }
  ]);

  // Applicant Details State
  const [applicantData, setApplicantData] = useState({
    name: '',
    idNo: '',
    block: '',
    blockNo: '',
    streetName: '',
    unitNo: '',
    postalCode: '',
    country: 'Singapore',
    mobileNo: '',
    homeTelephone: '',
    officeTelephone: '',
    emailAddress: ''
  });

  const handleView = async () => {
    if (!applicationNumber.trim()) return;
    setViewMode('form');
    await handleViewApplication(applicationNumber);
  };

  // Determine if form should be read-only
  // Form is read-only when in view mode and NOT in edit mode
  const isReadOnly = isViewMode && !isEditMode;

  // Handle Next button - moves to next step
  const handleNext = () => {
    if (currentStep < steps.length) {
      nextStep();
    }
  };

  // Handle Save/Update - only executes on last step
  const handleSave = async () => {
    if (isReadOnly) return; // Don't allow saving in view mode
    
    // Only allow save on the last step
    if (currentStep !== steps.length) {
      // If not on last step, move to next step instead
      handleNext();
      return;
    }
    
    // Validate required fields
    if (!applicantData.idNo.trim()) {
      showError('Validation Error', 'Applicant ID/NRIC/Passport number is required');
      return;
    }
    
    const applicationData = {
      bookingDate: bookingDate || new Date().toISOString(),
      applicantName: applicantData.name,
      applicantIDNo: applicantData.idNo.trim(),
      applicantEmailID: applicantData.emailAddress,
      applicantMobileNo: applicantData.mobileNo,
      applicantAddressNo: applicantData.block,
      applicantAddressLine1: applicantData.blockNo,
      applicantAddressCity: applicantData.unitNo,
      donationAmount: 0,
      details: engravings.filter(eng => eng.name.trim() !== '').map(eng => ({
        nameToEngrave: eng.name,
        remarks: eng.relationship
      }))
    };
    
    try {
      if (applicationNumber && isEditMode) {
        // Update existing application
        const result = await handleUpdateApplication(applicationNumber, applicationData);
        if (result && 'success' in result) {
          if (result.success) {
            showSuccess('Success', 'Application updated successfully');
            // Reset form state and clear view/edit mode
            resetApp();
            clearViewEditMode();
            setApplicationNumber('');
            setCurrentStep(1);
            setApplicantData({
              name: '',
              idNo: '',
              block: '',
              blockNo: '',
              streetName: '',
              unitNo: '',
              postalCode: '',
              country: 'Singapore',
              mobileNo: '',
              homeTelephone: '',
              officeTelephone: '',
              emailAddress: ''
            });
            setEngravings([{
              name: '',
              relationship: '',
              dateOfBirth: '',
              dateOfDeath: '',
              additionalInfo: ''
            }]);
            // Switch to table view and refresh the list
            await handleOpenTableView();
            await searchApplicationList({ pagination: { page: 1 } });
          } else if (result.error) {
            showError('Update Failed', result.error);
          }
        }
      } else {
        // Create new application
        const result = await handleSaveApplication(applicationData);
        if (result && 'success' in result) {
          if (result.success) {
            showSuccess('Success', 'Application created successfully');
            // Reset form state and clear view/edit mode
            resetApp();
            clearViewEditMode();
            setApplicationNumber('');
            setCurrentStep(1);
            setApplicantData({
              name: '',
              idNo: '',
              block: '',
              blockNo: '',
              streetName: '',
              unitNo: '',
              postalCode: '',
              country: 'Singapore',
              mobileNo: '',
              homeTelephone: '',
              officeTelephone: '',
              emailAddress: ''
            });
            setEngravings([{
              name: '',
              relationship: '',
              dateOfBirth: '',
              dateOfDeath: '',
              additionalInfo: ''
            }]);
            // Switch to table view and refresh the list
            await handleOpenTableView();
            await searchApplicationList({ pagination: { page: 1 } });
          } else if (result.error) {
            showError('Create Failed', result.error);
          }
        }
      }
    } catch (error: any) {
      // Error handling is done in the hook, but we can add additional handling here if needed
      console.error('Error saving application:', error);
      showError('Error', error?.message || 'An unexpected error occurred');
    }
  };

  // Handle Invoice and Receipts button
  const handleInvoiceAndReceipts = useCallback(async () => {
    const codeToUse = applicationNumber || reduxApplicationCode;
    if (!codeToUse.trim()) {
      console.warn('No application code provided for invoice/receipt');
      return;
    }
    
    // Navigate to the invoice-receipt page
    navigate(`/invoice-receipt/${codeToUse}`);
  }, [applicationNumber, reduxApplicationCode, navigate]);



  // Wizard navigation
  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepId: number) => {
    setCurrentStep(stepId);
  };

  // Add new engraving
  const addEngraving = () => {
    setEngravings([...engravings, {
      name: '',
      relationship: '',
      dateOfBirth: '',
      dateOfDeath: '',
      additionalInfo: ''
    }]);
  };

  // Remove engraving
  const removeEngraving = (index: number) => {
    if (engravings.length > 1) {
      setEngravings(engravings.filter((_, i) => i !== index));
    }
  };

  // Update engraving
  const updateEngraving = (index: number, field: string, value: string) => {
    const updated = [...engravings];
    updated[index] = { ...updated[index], [field]: value };
    setEngravings(updated);
  };

  // Get error styling based on error type
  const getErrorStyling = () => {
    switch (lastErrorType) {
      case 'auth':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'network':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'validation':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
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

  // Handle search field changes
  const handleSearchFieldChange = useCallback((field: keyof typeof applicationListFilters, value: string) => {
    updateListFilters({ [field]: value });
  }, [updateListFilters]);

  // Handle search
  const handleSearch = useCallback(async () => {
    await searchApplicationList({ pagination: { page: 1 } });
  }, [searchApplicationList]);

  // Handle reset search
  const handleResetSearch = useCallback(async () => {
    updateListFilters({
      applicationCode: '',
      applicantName: '',
      applicantIdNo: '',
      nameToEngrave: '',
      bookedFrom: '',
      bookedTo: '',
      searchTerm: ''
    });
    await searchApplicationList({
      filters: {
        applicationCode: '',
        applicantName: '',
        applicantIdNo: '',
        nameToEngrave: '',
        bookedFrom: '',
        bookedTo: '',
        searchTerm: ''
      },
      pagination: { page: 1 }
    });
  }, [updateListFilters, searchApplicationList]);

  // Handle page change
  const handleListPageChange = useCallback(async (page: number) => {
    await searchApplicationList({ pagination: { page } });
  }, [searchApplicationList]);

  // Handle open table view
  const handleOpenTableView = useCallback(async (overrides: Partial<typeof applicationListFilters> = {}) => {
    setViewMode('table');
    if (Object.keys(overrides).length > 0) {
      updateListFilters(overrides);
    }
    await searchApplicationList({
      ...(Object.keys(overrides).length > 0 ? { filters: overrides } : {}),
      pagination: { page: 1 }
    });
  }, [updateListFilters, searchApplicationList]);

  // Format date for display
  const formatDisplayDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleString();
    } catch {
      return '—';
    }
  };

  // Render table view
  const renderTableView = () => {
    const hasApplications = applicationList.length > 0;
    const totalPages = Math.max(1, applicationListPagination.totalPages || (hasApplications ? 1 : 1));

    return (
      <div className="space-y-6 pb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Gate of Life Applications</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Application Code</label>
              <Input
                type="text"
                value={applicationListFilters.applicationCode}
                onChange={(e) => handleSearchFieldChange('applicationCode', e.target.value)}
                placeholder="Search by application code (e.g., GOL-100)"
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
              <label className="text-sm font-medium text-gray-700">Applicant ID No</label>
              <Input
                type="text"
                value={applicationListFilters.applicantIdNo}
                onChange={(e) => handleSearchFieldChange('applicantIdNo', e.target.value)}
                placeholder="Search by ID number"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Name to Engrave</label>
              <Input
                type="text"
                value={applicationListFilters.nameToEngrave}
                onChange={(e) => handleSearchFieldChange('nameToEngrave', e.target.value)}
                placeholder="Search by name to engrave"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Booked From</label>
              <DateInput
                value={applicationListFilters.bookedFrom}
                onChange={(apiDate) => handleSearchFieldChange('bookedFrom', apiDate)}
                placeholder="dd/mm/yyyy"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Booked To</label>
              <DateInput
                value={applicationListFilters.bookedTo}
                onChange={(apiDate) => handleSearchFieldChange('bookedTo', apiDate)}
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
                      Names to Engrave
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Booking Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Donation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applicationList.map((application, index) => {
                    const appCode = application.code || application.applicationNumber || '';
                    const applicantName = application.applicant?.name || '—';
                    const namesToEngrave = application.details?.map(d => d.nameToEngrave).filter(Boolean).join(', ') || '—';
                    const bookingDate = formatDisplayDate(application.bookingDate);
                    const donationAmount = application.donation?.amount || 0;

                    return (
                      <tr
                        key={`${appCode || 'unknown'}-${index}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {appCode || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {applicantName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {namesToEngrave}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {bookingDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          ${typeof donationAmount === 'number' ? donationAmount.toFixed(2) : '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setViewMode('form');
                                handleViewApplicationFromTable(appCode);
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              title="View Application"
                            >
                              View
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => navigate(`/gate-of-life/edit/${appCode}`)}
                              className="text-green-600 hover:text-green-800 hover:underline"
                              title="Edit Application"
                            >
                              Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDeleteApplicationFromTable(appCode)}
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <span className="text-sm text-gray-600">
                Page {applicationListPagination.page} of {totalPages} • {applicationListPagination.total} result{applicationListPagination.total === 1 ? '' : 's'}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleListPageChange(applicationListPagination.page - 1)}
                  disabled={applicationListPagination.page <= 1 || applicationListLoading}
                >
                  ← Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleListPageChange(applicationListPagination.page + 1)}
                  disabled={applicationListPagination.page >= totalPages || applicationListLoading}
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Names to be Engraved</h3>
              <Button
                variant="outline"
                onClick={addEngraving}
                disabled={isReadOnly}
                className="bg-[#8b5a2b] text-white hover:bg-[#6d4420] border-[#8b5a2b]"
              >
                Add Name
              </Button>
            </div>
            
            {engravings.map((engraving, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Name {index + 1}</h4>
                  {engravings.length > 1 && !isReadOnly && (
                    <Button
                      variant="outline"
                      onClick={() => removeEngraving(index)}
                      className="text-red-600 hover:text-red-800 border-red-300"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name:
                    </label>
                    <Input
                      type="text"
                      value={engraving.name}
                      onChange={(e) => updateEngraving(index, 'name', e.target.value)}
                      className="w-full"
                      placeholder="Enter name to be engraved"
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship:
                    </label>
                    <Input
                      type="text"
                      value={engraving.relationship}
                      onChange={(e) => updateEngraving(index, 'relationship', e.target.value)}
                      className="w-full"
                      placeholder="Relationship to applicant"
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth:
                    </label>
                    <DateInput
                      value={engraving.dateOfBirth}
                      onChange={(apiDate) => updateEngraving(index, 'dateOfBirth', apiDate)}
                      className="w-full"
                      disabled={isReadOnly}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Death:
                    </label>
                    <DateInput
                      value={engraving.dateOfDeath}
                      onChange={(apiDate) => updateEngraving(index, 'dateOfDeath', apiDate)}
                      className="w-full"
                      disabled={isReadOnly}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Information:
                    </label>
                    <textarea
                      value={engraving.additionalInfo}
                      onChange={(e) => updateEngraving(index, 'additionalInfo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                      rows={3}
                      placeholder="Any additional information"
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name:
                </label>
                <Input
                  type="text"
                  value={applicantData.name}
                  onChange={(e) => setApplicantData({...applicantData, name: e.target.value})}
                  className="w-full"
                  placeholder="Enter full name"
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
              </div>

              {/* ID/NRIC/Passport No */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID/NRIC/Passport No: <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={applicantData.idNo}
                  onChange={(e) => setApplicantData({...applicantData, idNo: e.target.value})}
                  className="w-full"
                  placeholder="Enter ID/NRIC/Passport number"
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
              </div>

              {/* Mobile No */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile No.:
                </label>
                <Input
                  type="text"
                  value={applicantData.mobileNo}
                  onChange={(e) => setApplicantData({...applicantData, mobileNo: e.target.value})}
                  className="w-full"
                  placeholder="Enter mobile number"
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div>
                    <select 
                      value={applicantData.block}
                      onChange={(e) => setApplicantData({...applicantData, block: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                      disabled={isReadOnly}
                    >
                      <option value="">Block</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                  <div>
                    <Input
                      type="text"
                      value={applicantData.blockNo}
                      onChange={(e) => setApplicantData({...applicantData, blockNo: e.target.value})}
                      placeholder="Block No"
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div>
                    <Input
                      type="text"
                      value={applicantData.streetName}
                      onChange={(e) => setApplicantData({...applicantData, streetName: e.target.value})}
                      placeholder="Street Name"
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div>
                    <Input
                      type="text"
                      value={applicantData.unitNo}
                      onChange={(e) => setApplicantData({...applicantData, unitNo: e.target.value})}
                      placeholder="Unit No"
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div>
                    <Input
                      type="text"
                      value={applicantData.postalCode}
                      onChange={(e) => setApplicantData({...applicantData, postalCode: e.target.value})}
                      placeholder="Postal Code"
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div>
                    <select 
                      value={applicantData.country}
                      onChange={(e) => setApplicantData({...applicantData, country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                      disabled={isReadOnly}
                    >
                      <option value="Singapore">Singapore</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Home Telephone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Telephone:
                </label>
                <Input
                  type="text"
                  value={applicantData.homeTelephone}
                  onChange={(e) => setApplicantData({...applicantData, homeTelephone: e.target.value})}
                  className="w-full"
                  placeholder="Enter home telephone"
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
              </div>

              {/* Office Telephone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Telephone:
                </label>
                <Input
                  type="text"
                  value={applicantData.officeTelephone}
                  onChange={(e) => setApplicantData({...applicantData, officeTelephone: e.target.value})}
                  className="w-full"
                  placeholder="Enter office telephone"
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
              </div>

              {/* Email Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address:
                </label>
                <Input
                  type="email"
                  value={applicantData.emailAddress}
                  onChange={(e) => setApplicantData({...applicantData, emailAddress: e.target.value})}
                  className="w-full"
                  placeholder="Enter email address"
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 mb-4">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Gate of Life Applications</h2>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'form' ? 'primary' : 'outline'}
                  icon={<FileEditIcon className="w-4 h-4" />}
                  onClick={() => setViewMode('form')}
                >
                  Form View
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'outline'}
                  icon={<TableIcon className="w-4 h-4" />}
                  onClick={() => void handleOpenTableView()}
                >
                  Table View
                </Button>
              </div>
            </div>

            {viewMode === 'form' && (
              <>
                {/* Application Number Input and Action Buttons in One Row */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Application Number Input */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-700">
                      Application Number:
                    </p>
                    <Input
                      type="text"
                      value={applicationNumber}
                      onChange={(e) => setApplicationNumber(e.target.value)}
                      className="text-lg font-bold text-gray-900 w-32 md:w-40 py-2 px-3 border border-gray-300 rounded-md"
                      placeholder="GOL-001"
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                    />
                  </div>

                  {/* All Action Buttons in One Row */}
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="primary" 
                      icon={<EyeIcon className="w-4 h-4" />}
                      onClick={handleView}
                      disabled={loading || !applicationNumber.trim()}
                    >
                      {loading ? 'Loading...' : 'View'}
                    </Button>
                    <Button 
                      variant="primary" 
                      icon={<ReceiptIcon className="w-4 h-4" />}
                      onClick={handleInvoiceAndReceipts}
                      disabled={!applicationNumber.trim() && !reduxApplicationCode.trim()}
                    >
                      Invoice and Receipts
                    </Button>
                  </div>

                  {/* Right side info */}
                  <div className="ml-auto flex items-center gap-6">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Last Booking Number:</span> {lastBookingNumber}
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className={`p-4 border rounded-lg flex items-center gap-3 ${getErrorStyling()}`}>
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
              </>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'form' && (
        <>
          {/* Wizard Stepper */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  {steps.map((step) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    
                    return (
                      <button
                        key={step.id}
                        onClick={() => !isReadOnly && goToStep(step.id)}
                        disabled={isReadOnly}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                          isReadOnly 
                            ? 'opacity-50 cursor-not-allowed' 
                            : isActive 
                              ? 'bg-[#8b5a2b] text-white' 
                              : isCompleted 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{step.label}</span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Step Navigation */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    icon={<ChevronLeftIcon className="w-4 h-4" />}
                    onClick={previousStep}
                    disabled={currentStep === 1 || isReadOnly}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    icon={<ChevronRightIcon className="w-4 h-4" />}
                    onClick={nextStep}
                    disabled={currentStep === steps.length || isReadOnly}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Step Content */}
              {renderStep()}

              {/* Action Buttons */}
              {!isReadOnly && (
                <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap gap-3">
                    {currentStep === steps.length ? (
                      // Last step: Show Save/Update button
                      <Button
                        variant="primary"
                        icon={<CheckIcon className="w-4 h-4" />}
                        onClick={handleSave}
                        disabled={loading || isReadOnly}
                        className="bg-[#8b5a2b] text-white hover:bg-[#6d4420] border-[#8b5a2b]"
                      >
                        {loading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Save')}
                      </Button>
                    ) : (
                      // Not last step: Show Next button
                      <Button
                        variant="primary"
                        icon={<ChevronRightIcon className="w-4 h-4" />}
                        onClick={handleNext}
                        disabled={isReadOnly}
                        className="bg-[#8b5a2b] text-white hover:bg-[#6d4420] border-[#8b5a2b]"
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {viewMode === 'table' && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {renderTableView()}
        </div>
      )}
    </div>
  );
}
