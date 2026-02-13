import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EyeIcon, RefreshCwIcon, CheckIcon, AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, CalendarIcon, ClockIcon, XIcon, FileTextIcon } from 'lucide-react';
import { WakeRoomAgreementModal } from './WakeRoomAgreementModal';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { DateInput } from './common/DateInput';
import { LoadingSpinner } from './common/LoadingSpinner';
import { Card } from './common/Card';
import { useWakeRoom } from '../hooks/useWakeRoom';
import { createBooking as createBookingAction } from '../store/wakeRoomSlice';
import { AppDispatch, RootState } from '../store';

interface WakeRoomBookingFormProps {
  onBookingCreated?: (bookingCode: string) => void;
  onBookingUpdated?: (bookingCode: string) => void;
}

const steps = [
  {
    id: 1,
    label: 'Contact Details',
    icon: UserIcon
  },
  {
    id: 2,
    label: 'Booking Details',
    icon: CalendarIcon
  },
  {
    id: 3,
    label: 'Service Details',
    icon: ClockIcon
  },
  {
    id: 4,
    label: 'Review & Submit',
    icon: CheckIcon
  }
];

export function WakeRoomBookingForm({ onBookingCreated, onBookingUpdated: _onBookingUpdated }: WakeRoomBookingFormProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingCode, setBookingCode] = useState('');
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);

  // Get user's church ID from auth
  const user = useSelector((state: RootState) => state.auth.user);
  const defaultChurchId = user?.churchId || 1;

  const {
    wakeRooms,
    selectedWakeRoom: _selectedWakeRoom,
    selectedBooking,
    availabilityCheck,
    loading,
    error,
    lastErrorType,
    handleLoadAllWakeRooms,
    handleCheckAvailability,
    handleGetBookingByCode,
    handleUpdateBooking,
    handleSetSelectedWakeRoom,
    handleClearAvailabilityCheck,
    handleClearError,
    getWakeRoomById,
    formatDateForAPI,
    calculateBookingDuration,
    createCompleteBookingData
  } = useWakeRoom();

  // Load all wake rooms on mount (for dropdown)
  useEffect(() => {
    if (!Array.isArray(wakeRooms) || wakeRooms.length === 0) {
      handleLoadAllWakeRooms();
    }
  }, [wakeRooms, handleLoadAllWakeRooms]);

  // Contact Details State
  const [contactData, setContactData] = useState({
    name: '',
    idNo: '',
    email: '',
    mobileNo: '',
    homeTelNo: '',
    officeTelNo: '',
    addressDetails: {
      no: '',
      line1: '',
      line2: '',
      city: 'Singapore',
      state: 'Central',
      country: 'Singapore'
    }
  });

  // Booking Details State
  const [bookingData, setBookingData] = useState({
    wakeRoomId: 0,
    nameOfDeceased: '',
    purpose: 'Wake Service',
    usingDate: '',
    usingTimeFrom: '',
    usingTimeTo: '',
    noOfDays: 1,
    donationAmount: 0,
    defaultDonationAmount: 0,
    remarks: ''
  });

  // Service Details State
  const [serviceData, setServiceData] = useState({
    serviceby: '',
    casketCompany: '',
    hallNo: '',
    timeOfCremation: '',
    massTime: ''
  });

  // Helper function to safely parse dates for datetime-local input
  const safeParseDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Convert to local datetime format (YYYY-MM-DDTHH:mm)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return '';
    }
  };

  // Helper function to safely parse date only (YYYY-MM-DD)
  const safeParseDateOnly = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return '';
    }
  };

  // Helper function to parse datetime to time format (HH:mm)
  const safeParseTime = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Error parsing time:', dateString, error);
      return '';
    }
  };

  // Populate form when selectedBooking changes
  useEffect(() => {
    if (selectedBooking) {
      console.log('Populating form with selected booking:', selectedBooking);
      console.log('Applicant data:', selectedBooking.applicant);
      // Populate contact data - correctly map all addressDetails fields
      // Handle null/undefined values properly - convert null to empty string
      if (selectedBooking.applicant) {
        const applicant = selectedBooking.applicant;
        const addressDetails = (applicant.addressDetails || {}) as any;

        // Helper function to safely convert null/undefined to empty string
        const safeString = (value: any) => {
          if (value === null || value === undefined || value === '') return '';
          return String(value);
        };

        const newContactData = {
          name: safeString(applicant.name || applicant.applicantName),
          idNo: safeString(applicant.idNo || applicant.applicantIDNo),
          email: safeString(applicant.email || applicant.applicantEmailID),
          mobileNo: safeString(applicant.mobileNo),
          homeTelNo: safeString(applicant.homeTelNo),
          officeTelNo: safeString(applicant.officeTelNo),
          addressDetails: {
            no: safeString(addressDetails.no),
            line1: safeString(addressDetails.line1),
            line2: safeString(addressDetails.line2),
            city: safeString(addressDetails.city) || 'Singapore',
            state: safeString(addressDetails.state) || 'Central',
            country: safeString(addressDetails.country) || 'Singapore'
          }
        };

        console.log('Setting contact data:', newContactData);
        setContactData(newContactData);

        // Log raw values for debugging
        console.log('Raw applicant values:', {
          idNo: applicant.idNo,
          email: applicant.email,
          homeTelNo: applicant.homeTelNo,
          officeTelNo: applicant.officeTelNo
        });
      } else {
        console.warn('No applicant data found in selectedBooking');
      }

      // Populate booking data - correctly parse all date/time fields
      if (selectedBooking.booking) {
        setBookingData({
          wakeRoomId: selectedBooking.wakeRoomId || 0,
          nameOfDeceased: selectedBooking.booking.nameOfDeceased || '',
          purpose: selectedBooking.booking.purpose || 'Wake Service',
          usingDate: safeParseDateOnly(selectedBooking.booking.usingDate),
          usingTimeFrom: safeParseDate(selectedBooking.booking.usingTimeFrom),
          usingTimeTo: safeParseDate(selectedBooking.booking.usingTimeTo),
          noOfDays: selectedBooking.booking.noOfDays || 1,
          donationAmount: selectedBooking.financial?.donationAmount || 0,
          defaultDonationAmount: selectedBooking.financial?.defaultDonationAmount || 0,
          remarks: selectedBooking.booking.remarks || ''
        });
      }

      // Populate service data - correctly map all service fields
      setServiceData({
        serviceby: selectedBooking.service?.serviceby || selectedBooking.serviceby || '',
        casketCompany: selectedBooking.service?.casketCompany || selectedBooking.casketCompany || '',
        hallNo: selectedBooking.service?.hallNo || selectedBooking.hallNo || '',
        timeOfCremation: (selectedBooking.service?.timeOfCremation || selectedBooking.timeOfCremation) ? safeParseDate(selectedBooking.service?.timeOfCremation || selectedBooking.timeOfCremation) : '',
        massTime: (selectedBooking.booking?.massTime || selectedBooking.massTime) ? safeParseTime(selectedBooking.booking?.massTime || selectedBooking.massTime) : ''
      });

      // Set the booking code
      setBookingCode(selectedBooking.code || '');
    }
  }, [selectedBooking]);

  // Update selected wake room when wakeRoomId changes or dropdown options are loaded
  useEffect(() => {
    if (bookingData.wakeRoomId > 0) {
      const wakeRoom = getWakeRoomById(bookingData.wakeRoomId);
      if (wakeRoom) {
        handleSetSelectedWakeRoom(wakeRoom);
        // Only update default donation amount if not already set from booking
        if (!selectedBooking || !selectedBooking.financial?.defaultDonationAmount) {
          setBookingData(prev => ({
            ...prev,
            defaultDonationAmount: wakeRoom.rentingAmount
          }));
        }
      }
    }
  }, [bookingData.wakeRoomId, selectedBooking, getWakeRoomById, handleSetSelectedWakeRoom]);

  // Calculate booking duration when times change
  useEffect(() => {
    if (bookingData.usingTimeFrom && bookingData.usingTimeTo) {
      const duration = calculateBookingDuration(bookingData.usingTimeFrom, bookingData.usingTimeTo);
      setBookingData(prev => ({
        ...prev,
        noOfDays: duration
      }));
    }
  }, [bookingData.usingTimeFrom, bookingData.usingTimeTo, calculateBookingDuration]);

  const handleViewBooking = async () => {
    if (!bookingCode.trim()) {
      return;
    }
    // Use user's default churchId
    const churchId = defaultChurchId;
    await handleGetBookingByCode(bookingCode.trim(), churchId);
  };

  const checkAvailability = async () => {
    if (!bookingData.wakeRoomId || !bookingData.usingTimeFrom || !bookingData.usingTimeTo) {
      alert('Please select wake room and time slot');
      return;
    }

    await handleCheckAvailability(
      bookingData.wakeRoomId,
      formatDateForAPI(new Date(bookingData.usingTimeFrom)),
      formatDateForAPI(new Date(bookingData.usingTimeTo))
    );
  };

  const createBooking = async () => {
    // Validate required fields
    if (!bookingData.wakeRoomId || !contactData.name || !bookingData.nameOfDeceased || !contactData.email || !contactData.mobileNo) {
      alert('Please fill in all required fields (Name, Email, Mobile No, Wake Room, Name of Deceased)');
      return;
    }

    if (!bookingData.usingDate || !bookingData.usingTimeFrom || !bookingData.usingTimeTo) {
      alert('Please select date and time for the booking');
      return;
    }

    const completeBookingData = createCompleteBookingData(contactData, {
      ...bookingData,
      ...serviceData,
      churchId: defaultChurchId
    });

    try {
      const result = await dispatch(createBookingAction(completeBookingData));
      if (createBookingAction.fulfilled.match(result)) {
        const bookingResult = result.payload;
        if (bookingResult && bookingResult.code) {
          alert(`Booking created successfully! Code: ${bookingResult.code}`);
          onBookingCreated?.(bookingResult.code);
          // Clear form after successful creation
          handleClear();
        } else if (bookingResult && bookingResult.isDuplicate) {
          alert(`Duplicate booking detected: ${bookingResult.existingCode}`);
        }
      } else {
        // Error is already handled by Redux state
        console.error('Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const updateBooking = async () => {
    if (!selectedBooking?.wakeRoomBookingId) {
      alert('No booking selected for update');
      return;
    }

    const completeBookingData = createCompleteBookingData(contactData, {
      ...bookingData,
      ...serviceData,
      churchId: defaultChurchId
    });

    try {
      await handleUpdateBooking(selectedBooking.wakeRoomBookingId, completeBookingData);
      alert('Booking updated successfully!');
      _onBookingUpdated?.(selectedBooking.code || '');
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const handleClear = () => {
    setBookingCode('');
    setContactData({
      name: '',
      idNo: '',
      email: '',
      mobileNo: '',
      homeTelNo: '',
      officeTelNo: '',
      addressDetails: {
        no: '',
        line1: '',
        line2: '',
        city: 'Singapore',
        state: 'Central',
        country: 'Singapore'
      }
    });
    setBookingData({
      wakeRoomId: 0,
      nameOfDeceased: '',
      purpose: 'Wake Service',
      usingDate: '',
      usingTimeFrom: '',
      usingTimeTo: '',
      noOfDays: 1,
      donationAmount: 0,
      defaultDonationAmount: 0,
      remarks: ''
    });
    setServiceData({
      serviceby: '',
      casketCompany: '',
      hallNo: '',
      timeOfCremation: '',
      massTime: ''
    });
    handleClearAvailabilityCheck();
    handleClearError();
  };

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

  const renderReviewStep = () => {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-[#fdf8f3] border border-[#ecd5c5] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#8b5a2b] flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#ecd5c5] flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-[#8b5a2b]" />
            </div>
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Applicant Name</p>
              <p className="text-gray-900 font-medium">{contactData.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ID Number</p>
              <p className="text-gray-900 font-medium">{contactData.idNo || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</p>
              <p className="text-gray-900 font-medium">{contactData.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mobile number</p>
              <p className="text-gray-900 font-medium">{contactData.mobileNo || '—'}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Residential Address</p>
              <p className="text-gray-900 font-medium">
                {[
                  contactData.addressDetails.no,
                  contactData.addressDetails.line1,
                  contactData.addressDetails.line2,
                  contactData.addressDetails.city,
                  contactData.addressDetails.state,
                  contactData.addressDetails.country
                ].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#f5f7fa] border border-[#e2e8f0] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-slate-600" />
            </div>
            Booking Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Wake Room</p>
              <p className="text-gray-900 font-medium">
                {getWakeRoomById(bookingData.wakeRoomId)?.name || 'Not selected'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name of Deceased</p>
              <p className="text-gray-900 font-medium italic">{bookingData.nameOfDeceased || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Duration</p>
              <p className="text-gray-900 font-medium">{bookingData.noOfDays} Day(s)</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From</p>
              <p className="text-gray-900 font-medium">{bookingData.usingTimeFrom ? new Date(bookingData.usingTimeFrom).toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To</p>
              <p className="text-gray-900 font-medium">{bookingData.usingTimeTo ? new Date(bookingData.usingTimeTo).toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Donation</p>
              <p className="text-gray-900 font-bold text-lg text-emerald-700">
                ${bookingData.donationAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <ClockIcon className="w-4 h-4 text-blue-600" />
            </div>
            Service & Partner Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Service Provider</p>
              <p className="text-gray-900 font-medium">{serviceData.serviceby || 'Internal'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Casket Company</p>
              <p className="text-gray-900 font-medium">{serviceData.casketCompany || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Time of Cremation</p>
              <p className="text-gray-900 font-medium">{serviceData.timeOfCremation ? new Date(serviceData.timeOfCremation).toLocaleString() : '—'}</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeftIcon className="w-4 h-4" />}
            onClick={previousStep}
          >
            Review Details
          </Button>
          <div className="flex gap-2">
            {selectedBooking && (
              <Button
                variant="secondary"
                size="sm"
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                icon={<FileTextIcon className="w-4 h-4" />}
                onClick={() => setIsAgreementModalOpen(true)}
              >
                View Agreement
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              className="px-8 bg-gradient-to-r from-[#8b5a2b] to-[#6d4420] text-white"
              icon={<CheckIcon className="w-4 h-4" />}
              onClick={selectedBooking ? updateBooking : createBooking}
              disabled={loading}
            >
              {loading
                ? (selectedBooking ? 'Updating booking...' : 'Creating booking...')
                : (selectedBooking ? 'Confirm and update booking' : 'Complete booking')}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Tell us who is making the booking so we can contact them about any updates.
              Fields marked <span className="text-red-500">*</span> are required.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name: <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={contactData.name}
                  onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                  className="w-full"
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* ID Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Number:
                </label>
                <Input
                  type="text"
                  value={contactData.idNo}
                  onChange={(e) => setContactData({ ...contactData, idNo: e.target.value })}
                  className="w-full"
                  placeholder="Enter ID number"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email: <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={contactData.email}
                  onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                  className="w-full"
                  placeholder="Enter email address"
                  required
                />
              </div>

              {/* Mobile No */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile No: <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  value={contactData.mobileNo}
                  onChange={(e) => setContactData({ ...contactData, mobileNo: e.target.value })}
                  className="w-full"
                  placeholder="Enter mobile number"
                  required
                />
              </div>

              {/* Home Telephone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Telephone:
                </label>
                <Input
                  type="tel"
                  value={contactData.homeTelNo}
                  onChange={(e) => setContactData({ ...contactData, homeTelNo: e.target.value })}
                  className="w-full"
                  placeholder="Enter home telephone"
                />
              </div>

              {/* Office Telephone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Telephone:
                </label>
                <Input
                  type="tel"
                  value={contactData.officeTelNo}
                  onChange={(e) => setContactData({ ...contactData, officeTelNo: e.target.value })}
                  className="w-full"
                  placeholder="Enter office telephone"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <Input
                    type="text"
                    value={contactData.addressDetails.no}
                    onChange={(e) => setContactData({
                      ...contactData,
                      addressDetails: { ...contactData.addressDetails, no: e.target.value }
                    })}
                    placeholder="House / Block no."
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    value={contactData.addressDetails.line1}
                    onChange={(e) => setContactData({
                      ...contactData,
                      addressDetails: { ...contactData.addressDetails, line1: e.target.value }
                    })}
                    placeholder="Street name"
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    value={contactData.addressDetails.line2}
                    onChange={(e) => setContactData({
                      ...contactData,
                      addressDetails: { ...contactData.addressDetails, line2: e.target.value }
                    })}
                    placeholder="Unit / Floor"
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    value={contactData.addressDetails.city}
                    onChange={(e) => setContactData({
                      ...contactData,
                      addressDetails: { ...contactData.addressDetails, city: e.target.value }
                    })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    value={contactData.addressDetails.state}
                    onChange={(e) => setContactData({
                      ...contactData,
                      addressDetails: { ...contactData.addressDetails, state: e.target.value }
                    })}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    value={contactData.addressDetails.country}
                    onChange={(e) => setContactData({
                      ...contactData,
                      addressDetails: { ...contactData.addressDetails, country: e.target.value }
                    })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Step navigation - bottom for step 1 */}
            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronRightIcon className="w-4 h-4" />}
                onClick={nextStep}
              >
                Next
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Provide details about the deceased and when the wake room is needed.
              This helps us check availability and calculate the correct duration.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Wake Room Selection */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wake Room: <span className="text-red-500">*</span>
                </label>
                <select
                  value={bookingData.wakeRoomId}
                  onChange={(e) => {
                    const wakeRoomId = parseInt(e.target.value);
                    setBookingData({ ...bookingData, wakeRoomId });
                    const wakeRoom = getWakeRoomById(wakeRoomId);
                    if (wakeRoom) {
                      handleSetSelectedWakeRoom(wakeRoom as any);
                      setBookingData(prev => ({
                        ...prev,
                        wakeRoomId,
                        defaultDonationAmount: wakeRoom.rentingAmount
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                  required
                >
                  <option value={0}>
                    {loading ? 'Loading...' : 'Select Wake Room'}
                  </option>
                  {wakeRooms.map(room => (
                    <option key={room.wakeRoomId} value={room.wakeRoomId}>
                      {room.name} - ${room.rentingAmount}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name of Deceased */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name of Deceased: <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={bookingData.nameOfDeceased}
                  onChange={(e) => setBookingData({ ...bookingData, nameOfDeceased: e.target.value })}
                  className="w-full"
                  placeholder="Enter deceased person's name"
                  required
                />
              </div>

              {/* Purpose */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose:
                </label>
                <Input
                  type="text"
                  value={bookingData.purpose}
                  onChange={(e) => setBookingData({ ...bookingData, purpose: e.target.value })}
                  className="w-full"
                  placeholder="Wake Service"
                />
              </div>

              {/* Using Date */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Using Date: <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={bookingData.usingDate}
                  onChange={(apiDate) => setBookingData({ ...bookingData, usingDate: apiDate })}
                  className="w-full"
                  required
                  placeholder="dd/mm/yyyy"
                />
              </div>

              {/* Time From */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Using Time From: <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={bookingData.usingTimeFrom}
                  onChange={(e) => setBookingData({ ...bookingData, usingTimeFrom: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              {/* Time To */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Using Time To: <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={bookingData.usingTimeTo}
                  onChange={(e) => setBookingData({ ...bookingData, usingTimeTo: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              {/* Number of Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Days:
                </label>
                <Input
                  type="number"
                  value={bookingData.noOfDays}
                  readOnly
                  className="w-full bg-gray-100"
                />
              </div>

              {/* Default Donation Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Donation Amount:
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={bookingData.defaultDonationAmount}
                  readOnly
                  className="w-full bg-gray-100"
                />
              </div>

              {/* Donation Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Donation Amount:
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={bookingData.donationAmount}
                  onChange={(e) => setBookingData({ ...bookingData, donationAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full"
                  placeholder="0.00"
                />
              </div>

              {/* Remarks */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks:
                </label>
                <textarea
                  value={bookingData.remarks}
                  onChange={(e) => setBookingData({ ...bookingData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                  rows={3}
                  placeholder="Enter any additional remarks"
                />
              </div>
            </div>

            {/* Availability Check */}
            {bookingData.wakeRoomId && bookingData.usingTimeFrom && bookingData.usingTimeTo && (
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={checkAvailability}
                  disabled={loading}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {loading ? 'Checking...' : 'Check Availability'}
                </Button>

                {availabilityCheck && (
                  <div className={`mt-4 p-4 rounded-lg ${availabilityCheck.isAvailable
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                    <p className="font-medium">{availabilityCheck.message}</p>
                    {!availabilityCheck.isAvailable && availabilityCheck.conflicts.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Conflicts:</p>
                        <ul className="list-disc list-inside mt-1">
                          {availabilityCheck.conflicts.map((conflict: any, index: number) => (
                            <li key={index} className="text-sm">
                              {conflict.applicant.name} - {conflict.booking.nameOfDeceased}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step navigation - bottom for step 2 */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronLeftIcon className="w-4 h-4" />}
                onClick={previousStep}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronRightIcon className="w-4 h-4" />}
                onClick={nextStep}
              >
                Next
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Add any service-related details so our team and partners can coordinate smoothly.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Service By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service By:
                </label>
                <Input
                  type="text"
                  value={serviceData.serviceby}
                  onChange={(e) => setServiceData({ ...serviceData, serviceby: e.target.value })}
                  className="w-full"
                  placeholder="Enter service provider"
                />
              </div>

              {/* Casket Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Casket Company:
                </label>
                <Input
                  type="text"
                  value={serviceData.casketCompany}
                  onChange={(e) => setServiceData({ ...serviceData, casketCompany: e.target.value })}
                  className="w-full"
                  placeholder="Enter casket company"
                />
              </div>

              {/* Hall No */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hall No:
                </label>
                <Input
                  type="text"
                  value={serviceData.hallNo}
                  onChange={(e) => setServiceData({ ...serviceData, hallNo: e.target.value })}
                  className="w-full"
                  placeholder="Enter hall number"
                />
              </div>

              {/* Time of Cremation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time of Cremation:
                </label>
                <Input
                  type="datetime-local"
                  value={serviceData.timeOfCremation}
                  onChange={(e) => setServiceData({ ...serviceData, timeOfCremation: e.target.value })}
                  className="w-full"
                />
              </div>

              {/* Mass Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mass Time:
                </label>
                <Input
                  type="time"
                  value={serviceData.massTime}
                  onChange={(e) => setServiceData({ ...serviceData, massTime: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Step navigation - bottom for step 3 (final submit) */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronLeftIcon className="w-4 h-4" />}
                onClick={previousStep}
              >
                Previous
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<CheckIcon className="w-4 h-4" />}
                onClick={selectedBooking ? updateBooking : createBooking}
                disabled={loading}
              >
                {loading
                  ? (selectedBooking ? 'Updating...' : 'Creating...')
                  : (selectedBooking ? 'Update booking' : 'Create booking')}
              </Button>
            </div>
          </div>
        );

      case 4:
        return renderReviewStep();

      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Dynamic Progress Indicator */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                {selectedBooking ? 'Edit Booking' : 'New Reservation'}
              </h1>
              <p className="text-gray-500 font-medium">
                {selectedBooking ? `Updating ${selectedBooking.code}` : 'Complete the steps below to secure a wake room.'}
              </p>
            </div>
            {!selectedBooking && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-100"
                onClick={handleClear}
              >
                Clear Form
              </Button>
            )}
          </div>

          <div className="relative pt-4 pb-2">
            <div className="flex items-center justify-between relative z-10">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={() => goToStep(step.id)}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 transform ${isActive
                        ? 'bg-[#8b5a2b] text-white shadow-xl scale-110 -translate-y-1'
                        : isCompleted
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-400 grayscale hover:grayscale-0'
                        }`}
                    >
                      {isCompleted ? <CheckIcon className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </button>
                    <span className={`text-xs font-bold uppercase tracking-widest ${isActive ? 'text-[#8b5a2b]' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Progress Bar Background */}
            <div className="absolute top-[3.75rem] left-8 right-8 h-1 bg-gray-100 rounded-full -z-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(0, (currentStep - 1) / (steps.length - 1) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <Card gradient className="rounded-3xl shadow-xl border-0 overflow-visible p-6 sm:p-8">
        {renderStep()}
      </Card>

      {/* Error Notifications */}
      {/* Error Notifications */}
      {error && (
        <div className={`p-4 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-4 ${getErrorStyling()}`}>
          <div className="p-2 rounded-full bg-white/20">
            {getErrorIcon()}
          </div>
          <p className="flex-1 font-semibold">{error}</p>
          <button onClick={handleClearError} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Agreement Modal */}
      <WakeRoomAgreementModal
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        booking={selectedBooking}
      />
    </div>
  );
};

export default WakeRoomBookingForm;
