import {
  CheckIcon,
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  XIcon,
  FileTextIcon,
  PrinterIcon,
  MapPinIcon
} from 'lucide-react';
import { WakeRoomAgreementModal } from './WakeRoomAgreementModal';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { DateInput } from './common/DateInput';
import { Card } from './common/Card';
import { AddressInput } from './AddressInput';
import { useWakeRoom } from '../hooks/useWakeRoom';
import { createBooking as createBookingAction } from '../store/wakeRoomSlice';
import { AppDispatch, RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import wakeRoomService from '../services/wakeRoomService';

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
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingCode, setBookingCode] = useState('');
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [isBookingCreated, setIsBookingCreated] = useState(false);

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
    email: '',
    mobileNo: '',
    homeTelNo: '',
    officeTelNo: '',
    // Supporting AddressInput
    block: '',
    blockNo: '',
    streetName: '',
    unitNo: '',
    postalCode: '',
    country: 'Singapore',
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
    usingDate: '', // Used as start date (API usingDate)
    usingDateTo: '', // Used as end date
    usingTimeFrom: '', // API usingTimeFrom (datetime)
    usingTimeTo: '',   // API usingTimeTo (datetime)
    noOfDays: 1,
    donationAmount: 0,
    defaultDonationAmount: 0,
    remarks: ''
  });

  // Calculate days and amount whenever dates or default amount changes
  useEffect(() => {
    if (bookingData.usingDate && bookingData.usingDateTo) {
      const from = new Date(bookingData.usingDate);
      const to = new Date(bookingData.usingDateTo);

      // Normalize to midnight for accurate day calculation
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);

      const diffTime = to.getTime() - from.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const days = diffDays > 0 ? diffDays : 1;
      const amount = days * bookingData.defaultDonationAmount;

      // Only update if values actually changed to avoid infinite loops
      // IMPORTANT: Do NOT include bookingData.donationAmount in deps to allow manual override
      if (days !== bookingData.noOfDays) {
        setBookingData(prev => ({
          ...prev,
          noOfDays: days,
          donationAmount: amount // Only update amount if days/dates change
        }));
      }
    }
  }, [bookingData.usingDate, bookingData.usingDateTo, bookingData.defaultDonationAmount, bookingData.noOfDays]);

  // Service Details State
  const [serviceData, setServiceData] = useState({
    serviceby: '',
    casketCompany: '',
    hallNo: '',
    timeOfCremation: '',
    massTime: ''
  });

  // Handle address change from AddressInput component
  const handleAddressChange = useCallback((addressData: any) => {
    setContactData(prev => ({
      ...prev,
      block: addressData.block || '',
      blockNo: addressData.blockNo || '',
      streetName: addressData.streetName || '',
      unitNo: addressData.unitNo || '',
      postalCode: addressData.postalCode || '',
      country: addressData.country || 'Singapore',
      addressDetails: {
        no: addressData.addressNo || addressData.block || '',
        line1: addressData.addressLine1 || addressData.blockNo || '',
        line2: addressData.addressLine2 || addressData.streetName || '',
        city: addressData.addressCity || addressData.unitNo || 'Singapore',
        state: addressData.addressState || addressData.postalCode || 'Central',
        country: addressData.addressCountry || addressData.country || 'Singapore'
      }
    }));
  }, []);

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


  // Helper function to safely parse time only (HH:mm)
  const safeParseTime = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      // Check if it's already HH:mm or HH:mm:ss
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(dateString)) {
        return dateString.substring(0, 5);
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
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
          name: safeString(applicant.name),
          email: safeString(applicant.email),
          mobileNo: safeString(applicant.mobileNo),
          homeTelNo: safeString(applicant.homeTelNo),
          officeTelNo: safeString(applicant.officeTelNo),
          block: safeString(addressDetails.no),
          blockNo: safeString(addressDetails.line1),
          streetName: safeString(addressDetails.line2),
          unitNo: safeString(addressDetails.city),
          postalCode: safeString(addressDetails.state),
          country: safeString(addressDetails.country) || 'Singapore',
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
          usingDateTo: safeParseDateOnly(selectedBooking.booking.usingTimeTo),
          usingTimeFrom: safeParseDate(selectedBooking.booking.usingTimeFrom),
          usingTimeTo: safeParseDate(selectedBooking.booking.usingTimeTo),
          noOfDays: selectedBooking.booking.noOfDays || 1,
          donationAmount: selectedBooking.financial?.donationAmount || 0,
          defaultDonationAmount: selectedBooking.financial?.defaultDonationAmount || 0,
          remarks: selectedBooking.booking.remarks || ''
        });
      }

      // Populate service details
      if (selectedBooking.service) {
        setServiceData({
          serviceby: selectedBooking.service.serviceby || '',
          casketCompany: selectedBooking.service.casketCompany || '',
          hallNo: selectedBooking.service.hallNo || '',
          timeOfCremation: safeParseTime(selectedBooking.service.timeOfCremation),
          massTime: safeParseTime(selectedBooking.booking?.massTime)
        });
      }

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

  // Donation amount is handled in direct input changes for noOfDays and defaultDonationAmount


  const createBooking = async () => {
    // Validate required fields
    if (!bookingData.wakeRoomId || !contactData.name || !bookingData.nameOfDeceased || !contactData.mobileNo) {
      alert('Please fill in all required fields (Name, Mobile No, Wake Room, Name of Deceased)');
      return;
    }

    const completeBookingData = createCompleteBookingData(contactData, {
      ...bookingData,
      ...serviceData,
      usingTimeFrom: bookingData.usingDate ? `${bookingData.usingDate}T00:00:00` : '',
      usingTimeTo: bookingData.usingDateTo ? `${bookingData.usingDateTo}T23:59:59` : '',
      churchId: defaultChurchId
    });

    try {
      const response = await dispatch(createBookingAction(completeBookingData)).unwrap();
      // Response is the data object directly, not wrapped in { success: true, data: ... }
      if (response.code) {
        // Set booking code for display
        setBookingCode(response.code);
        setIsBookingCreated(true);

        // Call the callback to notify parent component
        onBookingCreated?.(response.code);

        // Navigate to step 4 (review/confirmation)
        setCurrentStep(4);
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      alert('Error creating booking: ' + (error.message || 'Unknown error'));
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
      usingTimeFrom: bookingData.usingDate ? `${bookingData.usingDate}T00:00:00` : '',
      usingTimeTo: bookingData.usingDateTo ? `${bookingData.usingDateTo}T23:59:59` : '',
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
    setIsBookingCreated(false);
    setContactData({
      name: '',
      email: '',
      mobileNo: '',
      homeTelNo: '',
      officeTelNo: '',
      block: '',
      blockNo: '',
      streetName: '',
      unitNo: '',
      postalCode: '',
      country: 'Singapore',
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
      usingDateTo: '',
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
  // Wizard navigation
  const nextStep = () => {
    // Validation for Step 1
    if (currentStep === 1) {
      if (!contactData.name.trim()) {
        alert('Applicant Name is required');
        return;
      }
      if (!contactData.mobileNo.trim()) {
        alert('Mobile Number is required');
        return;
      }
      // Check if address is filled (line1 and city/unitNo/postalCode)
      if (!contactData.addressDetails.line1.trim() && !contactData.addressDetails.no.trim()) {
        alert('Residential Address is required');
        return;
      }
    }

    // Validation for Step 2
    if (currentStep === 2) {
      if (!bookingData.wakeRoomId) {
        alert('Wake Room selection is required');
        return;
      }
      if (!bookingData.nameOfDeceased.trim()) {
        alert('Name of Deceased is required');
        return;
      }
      if (!bookingData.usingDate) {
        alert('Using Date from is required');
        return;
      }
      if (!bookingData.usingDateTo) {
        alert('Using Date to is required');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fromDate = new Date(bookingData.usingDate);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(bookingData.usingDateTo);
      toDate.setHours(0, 0, 0, 0);

      // Using Date from can't be yesterday (must be today or later)
      // Only check if it's a NEW booking (not in edit mode)
      if (fromDate < today && !selectedBooking && !bookingCode) {
        alert('Using Date from cannot be in the past. Please select today or a future date.');
        return;
      }

      // Using Date to can't be less than Using Date from
      if (toDate < fromDate) {
        alert('Using Date to cannot be earlier than Using Date from');
        return;
      }
    }

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
        {/* Success Message */}
        {isBookingCreated && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-800 mb-2">Booking Created Successfully!</h3>
                <p className="text-green-700 mb-3">
                  Your wake room booking has been created successfully.
                  <span className="font-semibold">Booking Code: {bookingCode}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => navigate('/wake-room')}
                  >
                    View All Applications
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Clear form and reset to step 1
                      handleClear();
                      setCurrentStep(1);
                      setIsBookingCreated(false);
                    }}
                  >
                    Create Another Booking
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</p>
              <p className="text-gray-900 font-medium">{contactData.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Home Telephone</p>
              <p className="text-gray-900 font-medium">{contactData.homeTelNo || '—'}</p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Booking from</p>
              <p className="text-gray-900 font-medium">{bookingData.usingDate ? new Date(bookingData.usingDate).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Booking to</p>
              <p className="text-gray-900 font-medium">{bookingData.usingDateTo ? new Date(bookingData.usingDateTo).toLocaleDateString() : '—'}</p>
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
              <p className="text-gray-900 font-medium">{serviceData.timeOfCremation || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mass Time</p>
              <p className="text-gray-900 font-medium">{serviceData.massTime || '—'}</p>
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
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                  icon={<FileTextIcon className="w-4 h-4" />}
                  onClick={() => setIsAgreementModalOpen(true)}
                >
                  View Agreement
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                  icon={<PrinterIcon className="w-4 h-4" />}
                  onClick={() => navigate(`/invoice-receipt/${selectedBooking.code}`)}
                >
                  Invoice
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
                  icon={<PrinterIcon className="w-4 h-4" />}
                  onClick={() => wakeRoomService.generateWakeRoomPDF(selectedBooking.code, 'receipt')}
                >
                  Receipt
                </Button>
              </div>
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

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email:
                </label>
                <Input
                  type="email"
                  value={contactData.email}
                  onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                  className="w-full"
                  placeholder="Enter email address"
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
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPinIcon className="w-4 h-4 text-[#8b5a2b]" />
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Residential Address
                </label>
              </div>
              <AddressInput
                onAddressChange={handleAddressChange}
                initialValues={{
                  block: contactData.block,
                  blockNo: contactData.blockNo,
                  streetName: contactData.streetName,
                  unitNo: contactData.unitNo,
                  postalCode: contactData.postalCode,
                  country: contactData.country,
                }}
              />
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
                      setBookingData(prev => {
                        const amount = prev.noOfDays * wakeRoom.rentingAmount;
                        return {
                          ...prev,
                          wakeRoomId,
                          defaultDonationAmount: wakeRoom.rentingAmount,
                          donationAmount: amount
                        };
                      });
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

              {/* Using Date From and To in one row */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Using Date From */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Using Date from: <span className="text-red-500">*</span>
                  </label>
                  <DateInput
                    value={bookingData.usingDate}
                    onChange={(apiDate) => setBookingData(prev => ({ ...prev, usingDate: apiDate }))}
                    className="w-full"
                    required
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                {/* Using Date To */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Using Date to: <span className="text-red-500">*</span>
                  </label>
                  <DateInput
                    value={bookingData.usingDateTo}
                    onChange={(apiDate) => setBookingData(prev => ({ ...prev, usingDateTo: apiDate }))}
                    className="w-full"
                    required
                    placeholder="dd/mm/yyyy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Days:
                </label>
                <Input
                  type="number"
                  value={bookingData.noOfDays}
                  onChange={(e) => {
                    const noOfDays = parseInt(e.target.value) || 0;
                    setBookingData(prev => ({
                      ...prev,
                      noOfDays
                    }));
                  }}
                  className="w-full"
                />
              </div>

              {/* Default Donation Amount (Rate per Day) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate per Day:
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={bookingData.defaultDonationAmount}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value) || 0;
                    setBookingData(prev => ({
                      ...prev,
                      defaultDonationAmount: rate,
                      donationAmount: prev.noOfDays * rate
                    }));
                  }}
                  className="w-full"
                />
              </div>

              {/* Donation Amount (Total) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Donation Amount:
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

            {(bookingData.wakeRoomId && bookingData.usingDate && bookingData.usingDateTo) && (
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    const fromTime = `${bookingData.usingDate}T00:00:00`;
                    const toTime = `${bookingData.usingDateTo}T23:59:59`;
                    handleCheckAvailability(bookingData.wakeRoomId, fromTime, toTime);
                  }}
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
                  type="time"
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
