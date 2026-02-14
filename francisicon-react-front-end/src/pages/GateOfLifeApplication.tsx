import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  EyeIcon,
  CheckIcon,
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  FileTextIcon,
  FileEditIcon,
  ReceiptIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  ArrowLeftIcon,
  PrinterIcon,
  LayoutIcon,
  InfoIcon,
  HelpCircleIcon,
  FileText,
  MapPinIcon,
  ChevronDownIcon,
  LoaderIcon
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DateInput } from '../components/common/DateInput';
import { AddressInput } from '../components/AddressInput';
import { useGateOfLife } from '../hooks/useGateOfLife';
import { mapApiApplicationToFormData } from '../utils/gateOfLifeMapper';
import { useToast } from '../contexts/ToastContext';
import { getTodayDate } from '../utils/dateUtils';
import { AgreementViewerModal } from '../components/AgreementViewerModal';
import api from '../services/api';

interface GateOfLifeApplicationProps {
  formData?: any;
  setFormData?: (data: any) => void;
}

const steps = [
  {
    id: 1,
    label: 'Names to be Engraved',
    icon: FileTextIcon,
    color: 'from-amber-500 to-amber-700'
  },
  {
    id: 2,
    label: 'Applicant Details',
    icon: UserIcon,
    color: 'from-amber-600 to-amber-800'
  }
];

export function GateOfLifeApplication({ }: GateOfLifeApplicationProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { applicationCode: routeAppCode } = useParams<{ applicationCode?: string }>();

  const [currentStep, setCurrentStep] = useState(1);
  const [bookingDate, setBookingDate] = useState(getTodayDate());

  // Local form state - will be synced with Redux
  const [engravings, setEngravings] = useState([
    {
      name: '',
      relationship: '',
      dateOfBirth: '',
      dateOfDeath: '',
      additionalInfo: ''
    }
  ]);

  const [requestSameBrick, setRequestSameBrick] = useState(false);

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
    emailAddress: '',
    // Add structured address fields
    addressNo: '',
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressState: '',
    addressCountry: 'Singapore',
    fullAddress: ''
  });

  const [donationAmount, setDonationAmount] = useState(0);

  // Agreement Viewer State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerData, setViewerData] = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

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
    applicationList,
    applicationListLoading,
    applicationListFilters,
    applicationListPagination,
    updateListFilters,
    searchApplicationList,
    handleDeleteApplicationFromTable,
    isViewMode,
    isEditMode,
    resetApp,
    handleInvoiceReceipt,
    handleEditApplicationFromTable
  } = useGateOfLife();

  // Determine mode from URL
  const isNewMode = location.pathname.endsWith('/new');
  const isViewRoute = location.pathname.includes('/view/');
  const isEditRoute = location.pathname.includes('/edit/');
  const isTableMode = !isNewMode && !isViewRoute && !isEditRoute;

  // Sync with route params
  useEffect(() => {
    if (isViewRoute && routeAppCode) {
      handleViewApplication(routeAppCode);
    } else if (isEditRoute && routeAppCode) {
      handleEditApplicationFromTable(routeAppCode);
    } else if (isNewMode) {
      resetApp();
    }
  }, [location.pathname, routeAppCode, handleViewApplication, resetApp, isViewRoute, isEditRoute, isNewMode]);

  // Sync Redux formData with local state when data is loaded
  useEffect(() => {
    if (isDataLoaded && reduxFormData) {
      try {
        const mappedData = mapApiApplicationToFormData(reduxFormData as any);

        if (mappedData.bookingDate) {
          setBookingDate(mappedData.bookingDate);
        }

        if (mappedData.applicantData) {
          setApplicantData(prev => ({ ...prev, ...mappedData.applicantData }));
        }

        if (mappedData.engravings && mappedData.engravings.length > 0) {
          setEngravings(mappedData.engravings);
        }

        if (mappedData.donationAmount !== undefined) {
          setDonationAmount(mappedData.donationAmount);
        }

        if (reduxFormData.applicant?.address) {
          const addr = reduxFormData.applicant.address;
          setApplicantData(prev => ({
            ...prev,
            addressNo: addr.no || '',
            addressLine1: addr.line1 || '',
            addressLine2: addr.line2 || '',
            addressCity: addr.city || '',
            addressState: addr.state || '',
            addressCountry: addr.country || 'Singapore',
            fullAddress: [addr.no, addr.line1, addr.line2, addr.city, addr.state, addr.country].filter(Boolean).join(' ')
          }));
        }

        if (reduxFormData.requestSameBrick !== undefined) {
          setRequestSameBrick(!!reduxFormData.requestSameBrick);
        }
      } catch (error) {
        console.error('Error mapping form data:', error);
      }
    }
  }, [isDataLoaded, reduxFormData]);

  // Handle read-only state
  const isReadOnly = (isViewMode || isViewRoute) && !isEditMode && !isEditRoute;

  // Handle address change from AddressInput component
  const handleAddressChange = useCallback((addressData: any) => {
    setApplicantData(prev => ({
      ...prev,
      block: addressData.block || '',
      blockNo: addressData.blockNo || '',
      streetName: addressData.streetName || '',
      unitNo: addressData.unitNo || '',
      postalCode: addressData.postalCode || '',
      country: addressData.country || 'Singapore',
      // Structured fields
      addressNo: addressData.addressNo || '',
      addressLine1: addressData.addressLine1 || '',
      addressLine2: addressData.addressLine2 || '',
      addressCity: addressData.addressCity || '',
      addressState: addressData.addressState || '',
      addressCountry: addressData.addressCountry || 'Singapore'
    }));
  }, []);

  // Navigation handlers
  const handleOpenTableView = useCallback(async (overrides: Partial<typeof applicationListFilters> = {}) => {
    navigate('/gates-of-life');
    if (Object.keys(overrides).length > 0) {
      updateListFilters(overrides);
    }
    await searchApplicationList({
      ...(Object.keys(overrides).length > 0 ? { filters: overrides } : {}),
      pagination: { page: 1 }
    });
  }, [navigate, updateListFilters, searchApplicationList]);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSave();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (isReadOnly) return;

    // Validate required fields
    // Validate required fields
    if (!applicantData.name.trim()) {
      showError('Validation Error', 'Applicant Name is required');
      setCurrentStep(2);
      return;
    }
    // ID validation removed as per user request

    const validEngravings = engravings.filter(eng => eng.name.trim() !== '');
    if (validEngravings.length === 0) {
      showError('Validation Error', 'At least one name to engrave is required');
      setCurrentStep(1);
      return;
    }

    const applicationData = {
      bookingDate: bookingDate || new Date().toISOString(),
      applicantName: applicantData.name,
      applicantIDNo: applicantData.idNo.trim(),
      applicantEmailID: applicantData.emailAddress,
      applicantMobileNo: applicantData.mobileNo,
      applicantHomeTelNo: applicantData.homeTelephone,
      applicantOfficeTelNo: applicantData.officeTelephone,
      applicantAddressNo: applicantData.addressNo || applicantData.block,
      applicantAddressLine1: applicantData.addressLine1 || applicantData.blockNo,
      applicantAddressLine2: applicantData.addressLine2 || applicantData.streetName,
      applicantAddressCity: applicantData.addressCity || applicantData.unitNo,
      applicantAddressState: applicantData.addressState || applicantData.postalCode,
      applicantAddressCountry: applicantData.addressCountry || applicantData.country,
      donationAmount: donationAmount,
      requestSameBrick: requestSameBrick,
      details: validEngravings.map(eng => ({
        nameToEngrave: eng.name,
        remarks: eng.relationship,
        // Optional fields if backend supports them
        dateOfBirth: eng.dateOfBirth,
        dateOfDeath: eng.dateOfDeath,
        additionalInfo: eng.additionalInfo
      }))
    };

    try {
      if (routeAppCode && (isEditMode || isEditRoute)) {
        // Update existing application
        const result = await handleUpdateApplication(routeAppCode, applicationData as any);
        if (result && result.success) {
          showSuccess('Success', 'Application updated successfully');
          handleOpenTableView();
        } else {
          showError('Update Failed', result?.error || 'Failed to update application');
        }
      } else {
        // Create new application
        const result = await handleSaveApplication(applicationData);
        if (result && result.success) {
          showSuccess('Success', 'Application created successfully');
          handleOpenTableView();
        } else {
          showError('Create Failed', result?.error || 'Failed to create application');
        }
      }
    } catch (error: any) {
      showError('Error', error?.message || 'An unexpected error occurred');
    }
  };

  // Modern badge component
  const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'error' }) => {
    const variants = {
      default: 'bg-gray-100 text-gray-700 border-gray-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      warning: 'bg-amber-50 text-amber-700 border-amber-100',
      error: 'bg-red-50 text-red-700 border-red-100'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant]}`}>
        {children}
      </span>
    );
  };

  const getErrorStyling = () => {
    switch (lastErrorType) {
      case 'auth': return 'bg-red-50 border-red-200 text-red-800';
      case 'validation': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'network': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-red-50 border-red-100 text-red-700';
    }
  };

  const getErrorIcon = () => {
    switch (lastErrorType) {
      case 'auth': return <AlertCircleIcon className="w-5 h-5 text-red-500" />;
      case 'validation': return <AlertCircleIcon className="w-5 h-5 text-amber-500" />;
      case 'network': return <AlertCircleIcon className="w-5 h-5 text-blue-500" />;
      default: return <AlertCircleIcon className="w-5 h-5 text-red-400" />;
    }
  };

  // Render Table View
  const renderTableView = () => {
    const hasApplications = applicationList.length > 0;
    const totalPages = Math.max(1, applicationListPagination.totalPages);

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Search & Filters */}
        <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl shadow-sm p-6 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <SearchIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Search Applications</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Application Code</label>
              <Input
                type="text"
                value={applicationListFilters.applicationCode}
                onChange={(e) => updateListFilters({ applicationCode: e.target.value })}
                placeholder="e.g. GOL-00001"
                className="bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Applicant Name</label>
              <Input
                type="text"
                value={applicationListFilters.applicantName}
                onChange={(e) => updateListFilters({ applicantName: e.target.value })}
                placeholder="Search by name"
                className="bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void searchApplicationList({ pagination: { page: 1 } });
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name to Engrave</label>
              <Input
                type="text"
                value={applicationListFilters.nameToEngrave}
                onChange={(e) => updateListFilters({ nameToEngrave: e.target.value })}
                placeholder="Search by engraved name"
                className="bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Booked From</label>
              <DateInput
                value={applicationListFilters.bookedFrom}
                onChange={(date) => updateListFilters({ bookedFrom: date })}
                placeholder="dd/mm/yyyy"
                className="bg-gray-50 border-gray-200 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Booked To</label>
              <DateInput
                value={applicationListFilters.bookedTo}
                onChange={(date) => updateListFilters({ bookedTo: date })}
                placeholder="dd/mm/yyyy"
                className="bg-gray-50 border-gray-200 shadow-sm"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => void searchApplicationList({ pagination: { page: 1 } })}
                disabled={applicationListLoading}
                className="bg-amber-700 hover:bg-amber-800 text-white shadow-md hover:shadow-lg transition-all"
                icon={applicationListLoading ? <LoadingSpinner size="sm" text="" /> : <SearchIcon className="w-4 h-4" />}
              >
                {applicationListLoading ? 'Searching...' : 'Search Applications'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  updateListFilters({
                    applicationCode: '',
                    applicantName: '',
                    applicantIdNo: '',
                    nameToEngrave: '',
                    bookedFrom: '',
                    bookedTo: '',
                    searchTerm: ''
                  });
                  searchApplicationList({ pagination: { page: 1 } });
                }}
                disabled={applicationListLoading}
                className="border-gray-300 text-gray-600"
              >
                Reset Filters
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/gates-of-life/new')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-xl transition-all"
              icon={<PlusIcon className="w-4 h-4" />}
            >
              New Application
            </Button>
          </div>
        </div>

        {/* Table Results */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-5 duration-700">
          {applicationListLoading && !hasApplications ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
              <LoadingSpinner size="lg" text="Fetching latest records..." />
              <p className="text-sm text-gray-400">Please wait while we sync with the database</p>
            </div>
          ) : hasApplications ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Application #</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Applicant</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Engraved Names</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Booking Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Donation</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {applicationList.map((app: any, idx) => {
                    const code = app.code || app.applicationNumber || '—';
                    const name = app.applicant?.name || app.applicantName || '—';
                    const details = app.details?.map((d: any) => d.nameToEngrave).filter(Boolean).join(', ') || '—';
                    const date = app.bookingDate ? new Date(app.bookingDate).toLocaleDateString() : '—';
                    const amount = typeof app.donation?.amount === 'number' ? app.donation.amount : (app.donationAmount || 0);

                    return (
                      <tr key={`${code}-${idx}`} className="hover:bg-amber-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                            {code}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-semibold text-gray-900">{name}</p>
                          <p className="text-xs text-gray-400">{app.applicant?.email || 'No email'}</p>
                        </td>
                        <td className="px-6 py-5 max-w-xs">
                          <p className="text-sm text-gray-600 truncate" title={details}>{details}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileTextIcon className="w-3.5 h-3.5 text-gray-400" />
                            {date}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="text-sm font-bold text-emerald-700">${amount.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/gates-of-life/view/${code}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/gates-of-life/edit/${code}`)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit Application"
                            >
                              <FileEditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteApplicationFromTable(code)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2Icon className="w-4 h-4" />
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
            <div className="p-20 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <LayoutIcon className="w-8 h-8" />
              </div>
              <p className="text-gray-500 font-medium">No results found matching your criteria</p>
              <Button variant="outline" onClick={() => navigate('/gates-of-life/new')}>Create First Application</Button>
            </div>
          )}

          {/* Pagination */}
          {applicationListPagination.total > 0 && (
            <div className="px-6 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Showing {applicationList.length} of {applicationListPagination.total} Results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => searchApplicationList({ pagination: { page: applicationListPagination.page - 1 } })}
                  disabled={applicationListPagination.page <= 1 || applicationListLoading}
                  className="px-3"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                <div className="px-3 py-1 bg-white border border-gray-200 rounded text-sm font-bold text-gray-600">
                  {applicationListPagination.page} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => searchApplicationList({ pagination: { page: applicationListPagination.page + 1 } })}
                  disabled={applicationListPagination.page >= totalPages || applicationListLoading}
                  className="px-3"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Step 1: Names to be Engraved
  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-5 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-gray-900">Names to be Engraved</h3>
          <p className="text-sm text-gray-500">Provide the names and details for the engraving wall</p>
        </div>
        {!isReadOnly && (
          <Button
            variant="outline"
            onClick={() => setEngravings([...engravings, { name: '', relationship: '', dateOfBirth: '', dateOfDeath: '', additionalInfo: '' }])}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
            icon={<PlusIcon className="w-4 h-4" />}
          >
            Add New Name
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {engravings.map((eng, idx) => (
          <div key={idx} className="group relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-2xl bg-gradient-to-b ${steps[0].color}`}></div>

            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-700 font-bold text-sm border border-amber-100">
                  {idx + 1}
                </span>
                <h4 className="font-bold text-gray-800">Person Details</h4>
              </div>
              {!isReadOnly && engravings.length > 1 && (
                <button
                  onClick={() => setEngravings(engravings.filter((_, i) => i !== idx))}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove Person"
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name to Engrave <span className="text-red-500">*</span></label>
                <Input
                  value={eng.name}
                  onChange={(e) => {
                    const newEng = [...engravings];
                    newEng[idx].name = e.target.value;
                    setEngravings(newEng);
                  }}
                  placeholder="Enter name exactly as it should appear"
                  disabled={isReadOnly}
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Relationship to Applicant</label>
                <Input
                  value={eng.relationship}
                  onChange={(e) => {
                    const newEng = [...engravings];
                    newEng[idx].relationship = e.target.value;
                    setEngravings(newEng);
                  }}
                  placeholder="e.g. Spouse, Parent, Child"
                  disabled={isReadOnly}
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date of Birth</label>
                <DateInput
                  value={eng.dateOfBirth}
                  onChange={(val) => {
                    const newEng = [...engravings];
                    newEng[idx].dateOfBirth = val;
                    setEngravings(newEng);
                  }}
                  placeholder="dd/mm/yyyy"
                  disabled={isReadOnly}
                  className="bg-gray-50 border-gray-200 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date of Death</label>
                <DateInput
                  value={eng.dateOfDeath}
                  onChange={(val) => {
                    const newEng = [...engravings];
                    newEng[idx].dateOfDeath = val;
                    setEngravings(newEng);
                  }}
                  placeholder="dd/mm/yyyy"
                  disabled={isReadOnly}
                  className="bg-gray-50 border-gray-200 shadow-sm"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Information / Remarks</label>
                <textarea
                  value={eng.additionalInfo}
                  onChange={(e) => {
                    const newEng = [...engravings];
                    newEng[idx].additionalInfo = e.target.value;
                    setEngravings(newEng);
                  }}
                  className="w-full min-h-[100px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-sm outline-none text-sm text-gray-700"
                  placeholder="Any extra details like title, honors, etc."
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {requestSameBrick !== undefined && (
        <div className={`p-6 rounded-2xl border transition-all flex items-start gap-4 ${requestSameBrick ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
          <div className="pt-1">
            <input
              type="checkbox"
              id="sameBrick"
              checked={requestSameBrick}
              onChange={(e) => setRequestSameBrick(e.target.checked)}
              disabled={isReadOnly}
              className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
          </div>
          <div className="space-y-1 cursor-pointer" onClick={() => !isReadOnly && setRequestSameBrick(!requestSameBrick)}>
            <label htmlFor="sameBrick" className="font-bold text-gray-900 flex items-center gap-2 cursor-pointer text-base">
              Request Same Brick
              <HelpCircleIcon className="w-3.5 h-3.5 text-gray-400" />
            </label>
            <p className="text-sm text-gray-600 leading-relaxed">
              Tick if the names are for husband and wife and you'd like them engraved on the same brick. Each brick can hold two (2) names.
            </p>
          </div>
        </div>
      )}

      {/* Donations Section */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <ReceiptIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-emerald-900">Donation Amount</h4>
            <p className="text-xs text-emerald-700">Thank you for your generous contribution to the Franciscan community.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-emerald-900">$</span>
          <input
            type="number"
            value={donationAmount}
            onChange={(e) => setDonationAmount(parseFloat(e.target.value) || 0)}
            className="w-32 px-4 py-2 bg-white border border-emerald-200 rounded-xl shadow-inner focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-right font-bold text-emerald-900"
            disabled={isReadOnly}
          />
        </div>
      </div>
    </div>
  );

  // Step 2: Applicant Details
  const renderStep2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-5 duration-500">
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-gray-900">Applicant Information</h3>
        <p className="text-sm text-gray-500">Details of the person requesting the engraving</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Personal Details */}
        <div className="space-y-6">
          <h4 className="text-xs font-black text-amber-800 uppercase tracking-[0.2em] border-l-4 border-amber-600 pl-3">Personal Details</h4>
          <div className="grid gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
              <Input
                value={applicantData.name}
                onChange={(e) => setApplicantData({ ...applicantData, name: e.target.value })}
                placeholder="As per ID/Passport"
                disabled={isReadOnly}
                className="bg-gray-50 border-gray-200 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ID / NRIC / Passport No.</label>
              <Input
                value={applicantData.idNo}
                onChange={(e) => setApplicantData({ ...applicantData, idNo: e.target.value })}
                placeholder="Enter document number"
                disabled={isReadOnly}
                className="bg-gray-50 border-gray-200 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
              <Input
                type="email"
                value={applicantData.emailAddress}
                onChange={(e) => setApplicantData({ ...applicantData, emailAddress: e.target.value })}
                placeholder="name@example.com"
                disabled={isReadOnly}
                className="bg-gray-50 border-gray-200 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-6">
          <h4 className="text-xs font-black text-amber-800 uppercase tracking-[0.2em] border-l-4 border-amber-600 pl-3">Contact Information</h4>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mobile Number</label>
              <Input
                value={applicantData.mobileNo}
                onChange={(e) => setApplicantData({ ...applicantData, mobileNo: e.target.value })}
                placeholder="+65 0000 0000"
                disabled={isReadOnly}
                className="bg-gray-50 border-gray-200 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Home Telephone</label>
              <Input
                value={applicantData.homeTelephone}
                onChange={(e) => setApplicantData({ ...applicantData, homeTelephone: e.target.value })}
                placeholder="6000 0000"
                disabled={isReadOnly}
                className="bg-gray-50 border-gray-200 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Office Telephone</label>
              <Input
                value={applicantData.officeTelephone}
                onChange={(e) => setApplicantData({ ...applicantData, officeTelephone: e.target.value })}
                placeholder="6000 0000"
                disabled={isReadOnly}
                className="bg-gray-50 border-gray-200 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="md:col-span-2 space-y-6">
          <h4 className="text-xs font-black text-amber-800 uppercase tracking-[0.2em] border-l-4 border-amber-600 pl-3">Residential Address</h4>
          <AddressInput
            fieldPrefix="applicant"
            onAddressChange={handleAddressChange}
            autoSync={false}
            initialValues={{
              block: applicantData.block || '',
              blockNo: applicantData.blockNo || '',
              streetName: applicantData.streetName || '',
              unitNo: applicantData.unitNo || '',
              postalCode: applicantData.postalCode || '',
              country: applicantData.country || 'Singapore',
              // Provide backend-style fields for proper conversion
              addressNo: applicantData.addressNo || '',
              addressLine1: applicantData.addressLine1 || '',
              addressLine2: applicantData.addressLine2 || '',
              addressCity: applicantData.addressCity || '',
              addressState: applicantData.addressState || '',
              addressCountry: applicantData.addressCountry || 'Singapore'
            }}
            initialAddressString={applicantData.fullAddress || ''}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#faf9f6] text-gray-900 selection:bg-amber-100 selection:text-amber-900 pb-20">
      {/* Standardized Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {!isTableMode ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700">
                  Application Number:
                </p>
                <Input
                  type="text"
                  value={reduxApplicationCode}
                  onChange={() => {
                    // Update the code in Redux or local state if needed
                    // In GateOfLife, it's primarily managed by the hook
                  }}
                  className="text-lg font-bold text-gray-900 w-32 md:w-40 py-2 px-3 border border-gray-300 rounded-md"
                  placeholder="Enter application code"
                  readOnly={true} // For now, keep it read-only as navigate handles the change
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  icon={loading ? <LoadingSpinner size="sm" text="" /> : <EyeIcon className="w-4 h-4" />}
                  onClick={() => handleViewApplication(reduxApplicationCode)}
                  disabled={loading || !reduxApplicationCode}
                >
                  {loading ? 'Loading...' : 'View'}
                </Button>

                <Button
                  variant="secondary"
                  icon={<PrinterIcon className="w-4 h-4" />}
                  onClick={async () => {
                    setViewerLoading(true);
                    setIsViewerOpen(true);
                    try {
                      const response = await api.get(`/api/gates-of-life/${reduxApplicationCode}/pdf-data`);
                      if (response.data.success) {
                        setViewerData(response.data.data);
                      } else {
                        showError('Error', 'Failed to fetch agreement data');
                      }
                    } catch (err: any) {
                      showError('Error', err.message || 'Failed to fetch agreement data');
                    } finally {
                      setViewerLoading(false);
                    }
                  }}
                  disabled={!reduxApplicationCode}
                >
                  View Gate of Life Application
                </Button>

                <Button
                  variant="primary"
                  icon={<ReceiptIcon className="w-4 h-4" />}
                  onClick={() => handleInvoiceReceipt(reduxApplicationCode)}
                  disabled={!reduxApplicationCode}
                >
                  Invoice & Receipt
                </Button>

                {isViewRoute && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/gates-of-life/edit/${reduxApplicationCode}`)}
                    className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    icon={<FileEditIcon className="w-4 h-4" />}
                  >
                    Edit Application
                  </Button>
                )}

                <Button
                  variant="secondary"
                  icon={<LayoutIcon className="w-4 h-4" />}
                  onClick={() => handleOpenTableView()}
                >
                  View Applications
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gate of Life Applications</h2>
                <p className="text-sm text-gray-600">
                  Manage and search through all Gate of Life engraving applications.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void searchApplicationList({ pagination: { page: 1 } })}
                  disabled={applicationListLoading}
                >
                  {applicationListLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  variant="primary"
                  icon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => navigate('/gates-of-life/new')}
                  className="bg-amber-700 hover:bg-amber-800 text-white border-amber-700"
                >
                  Create New Application
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        {isTableMode ? (
          renderTableView()
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
            {/* Form Section */}
            <div className="space-y-10">
              {/* Stepper for mobile/compact */}
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1 md:hidden">
                {steps.map(step => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${currentStep === step.id ? 'bg-amber-100 text-amber-900 font-bold' : 'text-gray-400'
                      }`}
                  >
                    <step.icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* Main Content Area */}
              <div className="bg-white rounded-[2rem] shadow-2xl shadow-amber-900/5 border border-amber-900/5 p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>

                {currentStep === 1 ? renderStep1() : renderStep2()}

                {/* Navigation Footer */}
                <div className="mt-16 pt-10 border-t border-gray-100 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className="py-6 px-8 border-gray-200 text-gray-500 rounded-2xl"
                    icon={<ArrowLeftIcon className="w-4 h-4" />}
                  >
                    Back to previous
                  </Button>

                  <div className="flex gap-3">
                    {!isReadOnly && (
                      <Button
                        variant="primary"
                        onClick={handleNext}
                        isLoading={loading}
                        className={`py-6 px-10 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 text-base font-bold text-white bg-gradient-to-r ${steps[currentStep - 1].color}`}
                        iconPosition="right"
                        icon={currentStep === steps.length ? <CheckIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                      >
                        {currentStep === steps.length ? (isEditRoute || isEditMode ? 'Save Changes' : 'Complete Application') : 'Continue to next'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar info section */}
            <div className="hidden lg:block space-y-8 sticky top-32 h-fit">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-8 border-b border-gray-700 pb-4">Application Progress</h4>

                <div className="space-y-6">
                  {steps.map((step, idx) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    return (
                      <div key={step.id} className="flex items-start gap-4">
                        <div className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isActive
                          ? `bg-gradient-to-br ${step.color} shadow-lg shadow-amber-900/40 ring-4 ring-amber-500/20`
                          : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-gray-700 text-gray-500'
                          }`}>
                          {isCompleted ? <CheckIcon className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                          {idx < steps.length - 1 && (
                            <div className={`absolute top-10 left-1/2 w-0.5 h-6 -translate-x-1/2 transition-colors ${isCompleted ? 'bg-emerald-500/20' : 'bg-gray-700'}`}></div>
                          )}
                        </div>
                        <div className="space-y-1 py-1">
                          <p className={`text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider">{isActive ? 'Current Step' : isCompleted ? 'Completed' : 'Upcoming'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-12 bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
                  <div className="flex items-center gap-3 text-amber-500 mb-3">
                    <InfoIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Booking Logic</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-400">
                    Gates of Life applications require at least one name to be engraved.
                    Standard donation amounts are recommended but can be customized.
                  </p>
                </div>
              </div>

              {/* Status Info Box */}
              {!isNewMode && reduxApplicationCode && (
                <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-lg">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Metadata</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Status</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Code</span>
                      <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded italic">{reduxApplicationCode}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Document</span>
                      <span className="font-bold text-gray-700">Engrave Application</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Action Toast / Feedback Overlay (Global) */}
      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 ${getErrorStyling()}`}>
            {getErrorIcon()}
            <div className="text-sm font-bold">{error}</div>
            <button onClick={clearApplicationError} className="p-1 hover:bg-black/5 rounded">
              <ArrowLeftIcon className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Agreement Viewer */}
      <AgreementViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        agreementData={viewerData}
        secoundNomineeAgreement={null}
        applicationNumber={routeAppCode || ''}
        loading={viewerLoading}
        templateType="gateOfLife"
      />
    </div>
  );
}
