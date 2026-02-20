import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  EyeIcon,
  CheckIcon,
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  FileEditIcon,
  ReceiptIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  ArrowLeftIcon,
  PrinterIcon,
  LayoutIcon,
  HelpCircleIcon,
  Loader2,
  CheckCircle2,
  X
} from 'lucide-react';
import { usePersonLookup } from '../hooks/usePersonLookup';
import { PersonData } from '../services/personService';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DateInput } from '../components/common/DateInput';
import { useGateOfLife } from '../hooks/useGateOfLife';
import { mapApiApplicationToFormData } from '../utils/gateOfLifeMapper';
import { useToast } from '../contexts/ToastContext';
import { getTodayDate } from '../utils/dateUtils';
import { AgreementViewerModal } from '../components/AgreementViewerModal';
import { AddressInput } from '../components/AddressInput';
import api from '../services/api';

interface GateOfLifeApplicationProps {
  formData?: any;
  setFormData?: (data: any) => void;
}

export function GateOfLifeApplication({ }: GateOfLifeApplicationProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { applicationCode: routeAppCode } = useParams<{ applicationCode?: string }>();

  const [bookingDate, setBookingDate] = useState(getTodayDate());

  // Local form state
  const [engravings, setEngravings] = useState([
    {
      name: ''
    }
  ]);

  const [requestSameBrick, setRequestSameBrick] = useState(false);

  const [applicantData, setApplicantData] = useState({
    name: '',
    idNo: '',
    mobileNo: '',
    homeTelephone: '',
    officeTelephone: '',
    emailAddress: '',
    // Address fields
    addressNo: '',
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressState: '',
    addressCountry: 'Singapore',
    block: 'Block',
    blockNo: '',
    streetName: '',
    unitNo: '',
    postalCode: '',
    country: 'Singapore'
  });

  const [donationAmount, setDonationAmount] = useState(0);
  const [validationErrors, setValidationErrors] = useState<any>({});

  const { searchPerson, searchResults, isSearching, clearResults } = usePersonLookup();
  const [showSearchResults, setShowSearchResults] = useState(false);

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
      // Explicitly reset local state for new application
      setBookingDate(getTodayDate());
      setEngravings([{ name: '' }]);
      setRequestSameBrick(false);
      setApplicantData({
        name: '',
        idNo: '',
        mobileNo: '',
        homeTelephone: '',
        officeTelephone: '',
        emailAddress: '',
        addressNo: '',
        addressLine1: '',
        addressLine2: '',
        addressCity: '',
        addressState: '',
        addressCountry: 'Singapore',
        block: 'Block',
        blockNo: '',
        streetName: '',
        unitNo: '',
        postalCode: '',
        country: 'Singapore'
      });
      setDonationAmount(0);
      setValidationErrors({});
    } else if (isTableMode) {
      // Check if we need to reload the list (e.g. if it's empty or stale)
      // For now, always refresh to be safe as per user request
      searchApplicationList({ pagination: { page: 1 }, bypassCache: true });
    }
  }, [location.pathname, routeAppCode, handleViewApplication, resetApp, isViewRoute, isEditRoute, isNewMode, isTableMode, searchApplicationList]);

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

        if (mappedData.requestSameBrick !== undefined) {
          setRequestSameBrick(mappedData.requestSameBrick);
        }
      } catch (error) {
        console.error('Error mapping form data:', error);
      }
    }
  }, [isDataLoaded, reduxFormData]);

  // Handle donation calculation
  useEffect(() => {
    // Keep donation synced to number of entered names (300 per person).
    const calculatedAmount = engravings.filter(e => e.name.trim()).length * 300;
    if (donationAmount !== calculatedAmount) {
      setDonationAmount(calculatedAmount);
    }
  }, [engravings, donationAmount]);

  // Handle read-only state
  const isReadOnly = (isViewMode || isViewRoute) && !isEditMode && !isEditRoute;

  // Navigation handlers
  const handleOpenTableView = useCallback(async (overrides: Partial<typeof applicationListFilters> = {}) => {
    navigate('/gates-of-life');
    if (Object.keys(overrides).length > 0) {
      updateListFilters(overrides);
    }
    await searchApplicationList({
      ...(Object.keys(overrides).length > 0 ? { filters: overrides } : {}),
      pagination: { page: 1 },
      bypassCache: true
    });
  }, [navigate, updateListFilters, searchApplicationList]);

  const handleAddressChange = useCallback((addressData: any) => {
    setApplicantData(prev => ({
      ...prev,
      addressNo: addressData.addressNo || '',
      addressLine1: addressData.addressLine1 || '',
      addressLine2: addressData.addressLine2 || '',
      addressCity: addressData.addressCity || '',
      addressState: addressData.addressState || '',
      addressCountry: addressData.addressCountry || 'Singapore',
      block: addressData.block,
      blockNo: addressData.blockNo,
      streetName: addressData.streetName,
      unitNo: addressData.unitNo,
      postalCode: addressData.postalCode,
      country: addressData.country
    }));
  }, []);

  const handleSelectPerson = useCallback((person: PersonData) => {
    const isBlock = person.addressNo?.toLowerCase() === 'block' || person.addressNo?.toLowerCase() === 'blk';

    setApplicantData({
      name: person.name,
      idNo: person.idNo || '',
      emailAddress: person.emailID || '',
      mobileNo: person.mobileNo || '',
      homeTelephone: person.homeTelNo || '',
      officeTelephone: person.officeTelNo || '',
      addressNo: person.addressNo || (isBlock ? 'Block' : 'No'),
      addressLine1: person.addressLine1 || '',
      addressLine2: person.addressLine2 || '',
      addressCity: person.addressCity || 'Singapore',
      addressState: person.addressState || 'Central',
      addressCountry: person.addressCountry || 'Singapore',
      block: isBlock ? 'Block' : 'No',
      blockNo: person.addressLine1 || '',
      streetName: person.addressLine2 || '',
      unitNo: person.addressCity?.replace('#', '') || '',
      postalCode: person.addressState || '',
      country: person.addressCountry || 'Singapore'
    });

    setShowSearchResults(false);
    clearResults();
  }, [clearResults]);

  const handleSave = async () => {
    if (isReadOnly) return;

    // Validate required fields - DISABLED per requirement to allow partial saves
    /*
    if (!applicantData.name.trim()) {
      showError('Validation Error', 'Applicant Name is required');
      return;
    }

    const validEngravings = engravings.filter(eng => eng.name.trim() !== '');
    if (validEngravings.length === 0) {
      showError('Validation Error', 'At least one name to engrave is required');
      return;
    }
    */
    const validEngravings = engravings.filter(eng => eng.name.trim() !== '');

    const applicationPayload = {
      bookingDate: bookingDate || new Date().toISOString(),
      applicantName: applicantData.name,
      applicantIDNo: applicantData.idNo,
      applicantEmailID: applicantData.emailAddress,
      applicantMobileNo: applicantData.mobileNo,
      applicantHomeTelNo: applicantData.homeTelephone,
      applicantOfficeTelNo: applicantData.officeTelephone,
      applicantAddressNo: applicantData.addressNo,
      applicantAddressLine1: applicantData.addressLine1,
      applicantAddressLine2: applicantData.addressLine2,
      applicantAddressCity: applicantData.addressCity,
      applicantAddressState: applicantData.addressState,
      applicantAddressCountry: applicantData.addressCountry,
      donationAmount: donationAmount,
      requestSameBrick: requestSameBrick,
      details: validEngravings.map(eng => ({
        nameToEngrave: eng.name
      }))
    };

    try {
      const updateCode = routeAppCode || reduxApplicationCode;
      if (updateCode && (isEditMode || isEditRoute)) {
        const result = await handleUpdateApplication(updateCode, applicationPayload as any);
        if (result && result.success) {
          showSuccess('Success', 'Application updated successfully');
          handleOpenTableView();
        } else {
          showError('Update Failed', result?.error || 'Failed to update application');
        }
      } else {
        const result = await handleSaveApplication(applicationPayload);
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
                onClick={() => void searchApplicationList({ pagination: { page: 1 }, bypassCache: true })}
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
                    nameToEngrave: '',
                    bookedFrom: '',
                    bookedTo: '',
                    searchTerm: ''
                  });
                  searchApplicationList({ pagination: { page: 1 }, bypassCache: true });
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
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Booking Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Donation</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {applicationList.map((app: any, idx) => {
                    const code = app.code || app.applicationNumber || '—';
                    const name = app.applicant?.name || app.applicantName || '—';
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
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileTextIcon className="w-3.5 h-3.5 text-gray-400" />
                            {date}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="text-sm font-bold text-emerald-700">${amount.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
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
              <div>
                <p className="text-sm font-bold text-gray-900">No applications found</p>
                <p className="text-xs text-gray-500 mt-1">Try adjusting your search filters or create a new application</p>
              </div>
            </div>
          )}

          {applicationListPagination.total > 0 && (
            <div className="px-6 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Showing {applicationList.length} of {applicationListPagination.total} Results
              </p>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => searchApplicationList({ pagination: { page: applicationListPagination.page - 1 } })}
                    disabled={applicationListPagination.page <= 1 || applicationListLoading}
                    className="px-3 h-9 rounded-lg border-gray-200"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </Button>

                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5) {
                        if (applicationListPagination.page > 3) {
                          pageNum = applicationListPagination.page - 2 + i;
                        }
                        if (pageNum > totalPages) {
                          pageNum = totalPages - (4 - i);
                        }
                        if (pageNum < 1) pageNum = i + 1;
                      }

                      if (pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => searchApplicationList({ pagination: { page: pageNum } })}
                          className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${applicationListPagination.page === pageNum
                            ? 'bg-amber-700 text-white shadow-md'
                            : 'text-gray-400 hover:bg-white hover:text-amber-700 border border-transparent'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => searchApplicationList({ pagination: { page: applicationListPagination.page + 1 } })}
                    disabled={applicationListPagination.page >= totalPages || applicationListLoading}
                    className="px-3 h-9 rounded-lg border-gray-200"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-gray-900 selection:bg-amber-100 selection:text-amber-900 pb-20">
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
                  onChange={() => { }}
                  className="text-lg font-bold text-gray-900 w-40 py-2 px-3 border border-gray-300 rounded-md"
                  placeholder="Application code"
                  readOnly={true}
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
                  Invoice
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
                  onClick={() => void searchApplicationList({ pagination: { page: 1 }, bypassCache: true })}
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
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="bg-white rounded-[2rem] shadow-2xl shadow-amber-900/5 border border-amber-900/5 p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>

              {/* Names to be Engraved Section */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-900">Names to be Engraved</h3>
                    <p className="text-sm text-gray-500">Provide the names for the engraving wall</p>
                  </div>
                  {!isReadOnly && (
                    <Button
                      variant="outline"
                      onClick={() => setEngravings([...engravings, { name: '' }])}
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
                      <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl bg-gradient-to-b from-amber-500 to-amber-700"></div>

                      <div className="flex justify-between items-start mb-4">
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
                    </div>
                  ))}
                </div>
              </div>

              {/* Applicant Information Section */}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-8">
                {/* <div className="space-y-1">
                  <h3 className="text-xl font-bold text-gray-900">Applicant Information</h3>
                  <p className="text-sm text-gray-500">Details of the person requesting the engraving</p>
                </div> */}

                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Input
                      value={applicantData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApplicantData({ ...applicantData, name: val });
                        if (val.length >= 3) {
                          searchPerson(val);
                          setShowSearchResults(true);
                        } else {
                          setShowSearchResults(false);
                        }
                      }}
                      placeholder="As per ID/Passport"
                      disabled={isReadOnly}
                      className="bg-gray-50 border-gray-200 shadow-sm"
                      icon={isSearching ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : undefined}
                    />

                    {showSearchResults && searchResults.length > 0 && !isReadOnly && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 flex items-center justify-between">
                          <span>MATCHES FOUND</span>
                          <button onClick={() => setShowSearchResults(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {searchResults.map((person) => (
                          <div
                            key={person.personId}
                            className="p-3 hover:bg-amber-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors group"
                            onClick={() => handleSelectPerson(person)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col text-left">
                                <span className="font-medium text-gray-900 group-hover:text-amber-700">{person.name}</span>
                                <span className="text-xs text-gray-500">{person.idNo} • {person.emailID}</span>
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-6">
                    <AddressInput
                      fieldPrefix="applicant"
                      onAddressChange={handleAddressChange}
                      autoSync={false}
                      initialValues={{
                        addressNo: applicantData.addressNo || '',
                        addressLine1: applicantData.addressLine1 || '',
                        addressLine2: applicantData.addressLine2 || '',
                        addressCity: applicantData.addressCity || '',
                        addressState: applicantData.addressState || '',
                        addressCountry: applicantData.addressCountry || 'Singapore',
                        block: applicantData.block || 'Block',
                        blockNo: applicantData.blockNo || '',
                        streetName: applicantData.streetName || '',
                        unitNo: applicantData.unitNo || '',
                        postalCode: applicantData.postalCode || '',
                        country: applicantData.country || 'Singapore'
                      }}
                      isReadOnly={isReadOnly}
                      error={validationErrors.applicantAddress}
                    />

                    <div className="grid gap-5 md:grid-cols-2">
                      {/* <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ID / NRIC / Passport No.</label>
                        <Input
                          value={applicantData.idNo}
                          onChange={(e) => setApplicantData({ ...applicantData, idNo: e.target.value })}
                          placeholder="Enter ID number"
                          disabled={isReadOnly}
                          className="bg-gray-50 border-gray-200 shadow-sm"
                        />
                      </div> */}
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
                      <div className="space-y-2">
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
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                          <ReceiptIcon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-emerald-900">Donation Amount</h4>
                          <p className="text-xs text-emerald-700">Generous contribution for the Franciscan community.</p>
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
                </div>
              </div>

              {/* Footer */}
              <div className="mt-16 pt-10 border-t border-gray-100 flex items-center justify-end">
                {!isReadOnly && (
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={loading}
                    className="py-6 px-12 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 text-lg font-bold text-white bg-gradient-to-r from-amber-600 to-amber-800"
                    icon={<CheckIcon className="w-6 h-6" />}
                  >
                    {isEditRoute || isEditMode ? 'Save Changes' : 'Complete Application'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

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

      <AgreementViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        agreementData={viewerData}
        secoundNomineeAgreement={null}
        applicationNumber={routeAppCode || reduxApplicationCode || ''}
        loading={viewerLoading}
        templateType="gateOfLife"
      />
    </div>
  );
}
