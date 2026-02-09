import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, RefreshCwIcon, CheckIcon, HashIcon, AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, CalendarIcon } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useWakeRoom } from '../hooks/useWakeRoom';
import { WakeRoomBookingDetails } from './WakeRoomBookingDetails';

interface WakeRoomBookingProps {
  // No props required for this component
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
  }
];

export function WakeRoomBooking({ }: WakeRoomBookingProps = {}) {
  const navigate = useNavigate();
  const [bookingNumber, setBookingNumber] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  
  // Use the custom hook
  const {
    loading,
    error,
    lastErrorType,
    handleGetBookingByCode,
    handleClearError,
    handleLoadAllWakeRooms
  } = useWakeRoom();
  
  // Contact Details State
  const [contactData, setContactData] = useState({
    name: '',
    block: '',
    blockNo: '',
    streetName: '',
    unitNo: '',
    postalCode: '',
    country: 'Singapore',
    mobileNo: '',
    homeTelephone: '',
    officeTelephone: ''
  });

  // Booking Details State
  const [bookingData, setBookingData] = useState({
    wakeRoom: '',
    fromDate: '',
    toDate: '',
    donationAmount: 0,
    nameOfDeceased: '',
    funeralServiceDate: '',
    massTime: '',
    cremationMassTime: '',
    hallNo: '',
    funeralMassServiceBy: '',
    casketCompany: '',
    burial: ''
  });

  const handleView = async () => {
    // Use user's default churchId (hardcoded as 1 for now)
    const churchId = 1;
    await handleGetBookingByCode(bookingNumber, churchId);
  };

  const handlePrint = async () => {
    // Print functionality would go here
    alert('Print functionality would be implemented here');
  };

  const handleSave = async () => {
    // Save functionality would go here
    alert('Save functionality would be implemented here');
  };

  const handleClear = () => {
    setBookingNumber('');
    setContactData({
      name: '',
      block: '',
      blockNo: '',
      streetName: '',
      unitNo: '',
      postalCode: '',
      country: 'Singapore',
      mobileNo: '',
      homeTelephone: '',
      officeTelephone: ''
    });
    setBookingData({
      wakeRoom: '',
      fromDate: '',
      toDate: '',
      donationAmount: 0,
      nameOfDeceased: '',
      funeralServiceDate: '',
      massTime: '',
      cremationMassTime: '',
      hallNo: '',
      funeralMassServiceBy: '',
      casketCompany: '',
      burial: ''
    });
    handleClearError();
  };

  // Generate PDF from current form data
  const handleGeneratePDFFromForm = async (type: 'booking' | 'invoice' | 'receipt' = 'booking') => {
    // PDF generation from form would go here
    alert(`PDF generation for ${type} would be implemented here`);
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
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
                  value={contactData.name}
                  onChange={(e) => setContactData({...contactData, name: e.target.value})}
                  className="w-full"
                  placeholder="Enter full name"
                />
              </div>

              {/* Mobile No */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile No.:
                </label>
                <Input
                  type="text"
                  value={contactData.mobileNo}
                  onChange={(e) => setContactData({...contactData, mobileNo: e.target.value})}
                  className="w-full"
                  placeholder="Enter mobile number"
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
                      value={contactData.block}
                      onChange={(e) => setContactData({...contactData, block: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
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
                      value={contactData.blockNo}
                      onChange={(e) => setContactData({...contactData, blockNo: e.target.value})}
                      placeholder="Block No"
                    />
                  </div>
                  <div>
                    <Input
                      type="text"
                      value={contactData.streetName}
                      onChange={(e) => setContactData({...contactData, streetName: e.target.value})}
                      placeholder="Street Name"
                    />
                  </div>
                  <div>
                    <Input
                      type="text"
                      value={contactData.unitNo}
                      onChange={(e) => setContactData({...contactData, unitNo: e.target.value})}
                      placeholder="Unit No"
                    />
                  </div>
                  <div>
                    <Input
                      type="text"
                      value={contactData.postalCode}
                      onChange={(e) => setContactData({...contactData, postalCode: e.target.value})}
                      placeholder="Postal Code"
                    />
                  </div>
                  <div>
                    <select 
                      value={contactData.country}
                      onChange={(e) => setContactData({...contactData, country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
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
                  value={contactData.homeTelephone}
                  onChange={(e) => setContactData({...contactData, homeTelephone: e.target.value})}
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
                  type="text"
                  value={contactData.officeTelephone}
                  onChange={(e) => setContactData({...contactData, officeTelephone: e.target.value})}
                  className="w-full"
                  placeholder="Enter office telephone"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return <WakeRoomBookingDetails formData={{bookingDetails: bookingData}} setFormData={(data) => setBookingData(data.bookingDetails)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 mb-4">
            {/* Booking Number Input and Action Buttons in One Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Booking Number Input */}
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700">
                  Booking Number:
                </p>
                <Input
                  type="text"
                  value={bookingNumber}
                  onChange={(e) => setBookingNumber(e.target.value)}
                  className="text-lg font-bold text-gray-900 w-32 md:w-40 py-2 px-3 border border-gray-300 rounded-md"
                  placeholder="WR-001"
                />
              </div>

              {/* All Action Buttons in One Row */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="primary" 
                  icon={<EyeIcon className="w-4 h-4" />}
                  onClick={handleView}
                  disabled={loading || !bookingNumber.trim()}
                >
                  {loading ? 'Loading...' : 'View'}
                </Button>
                <Button 
                  variant="secondary" 
                  icon={<RefreshCwIcon className="w-4 h-4" />}
                  onClick={() => handleGeneratePDFFromForm('booking')}
                  disabled={!bookingNumber.trim() && !contactData.name.trim()}
                >
                  Print Agreement
                </Button>
                <Button 
                  variant="primary" 
                  icon={<HashIcon className="w-4 h-4" />}
                  onClick={() => navigate(`/invoice-receipt/${bookingNumber}`)}
                  disabled={!bookingNumber.trim() && !contactData.name.trim()}
                >
                  Go to Invoice & Receipt
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className={`p-4 border rounded-lg flex items-center gap-3 ${getErrorStyling()}`}>
                {getErrorIcon()}
                <div className="flex-1 text-sm">{error}</div>
                <button 
                  onClick={handleClearError}
                  className="text-sm font-medium hover:opacity-75"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
                    onClick={() => goToStep(step.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 font-semibold ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white shadow-md' 
                        : isCompleted 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                variant="secondary"
                icon={<ChevronLeftIcon className="w-4 h-4" />}
                onClick={previousStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                icon={<ChevronRightIcon className="w-4 h-4" />}
                onClick={nextStep}
                disabled={currentStep === steps.length}
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
          <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-gray-200">
            {/* First Row */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                icon={<CheckIcon className="w-4 h-4" />}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="secondary"
                icon={<RefreshCwIcon className="w-4 h-4" />}
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>

            {/* Second Row */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                icon={<HashIcon className="w-4 h-4" />}
                onClick={() => navigate(`/invoice-receipt/${bookingNumber}`)}
                disabled={!bookingNumber.trim() && !contactData.name.trim()}
              >
                Go to Invoice
              </Button>
              <Button
                variant="primary"
                icon={<HashIcon className="w-4 h-4" />}
                onClick={() => navigate(`/invoice-receipt/${bookingNumber}`)}
                disabled={!bookingNumber.trim() && !contactData.name.trim()}
              >
                Go to Receipt
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
