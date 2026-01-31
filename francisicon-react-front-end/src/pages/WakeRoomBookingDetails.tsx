import React from 'react';
import { Input } from '../components/common/Input';
import { DateInput } from '../components/common/DateInput';

interface WakeRoomBookingDetailsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function WakeRoomBookingDetails({ formData, setFormData }: WakeRoomBookingDetailsProps) {
  const bookingDetails = formData.bookingDetails || {};

  const handleFieldChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      bookingDetails: {
        ...bookingDetails,
        [field]: value
      }
    });
  };

  const calculateDaysUsed = () => {
    const fromDate = bookingDetails.fromDate;
    const toDate = bookingDetails.toDate;
    
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const diffTime = Math.abs(to.getTime() - from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
      return diffDays;
    }
    return 0;
  };

  const calculateDefaultAmount = () => {
    const daysUsed = calculateDaysUsed();
    const dailyRate = 100; // Default daily rate
    return daysUsed * dailyRate;
  };

  return (
    <div className="space-y-6">
      {/* Wake Room Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wake Room:
        </label>
        <select 
          value={bookingDetails.wakeRoom || ''}
          onChange={(e) => handleFieldChange('wakeRoom', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
        >
          <option value="">Select Wake Room</option>
          <option value="LaVerna">LaVerna</option>
          <option value="Transistus">Transistus</option>
          <option value="St. Francis">St. Francis</option>
          <option value="St. Clare">St. Clare</option>
        </select>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Date:
          </label>
          <DateInput
            value={bookingDetails.fromDate || ''}
            onChange={(apiDate) => handleFieldChange('fromDate', apiDate)}
            className="w-full"
            placeholder="dd/mm/yyyy"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To Date:
          </label>
          <DateInput
            value={bookingDetails.toDate || ''}
            onChange={(apiDate) => handleFieldChange('toDate', apiDate)}
            className="w-full"
            placeholder="dd/mm/yyyy"
          />
        </div>
      </div>

      {/* Calculated Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            No of Days used:
          </label>
          <Input
            type="text"
            value={calculateDaysUsed()}
            readOnly
            className="w-full bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default amount:
          </label>
          <Input
            type="text"
            value={`$${calculateDefaultAmount().toFixed(2)}`}
            readOnly
            className="w-full bg-gray-100"
          />
        </div>
      </div>

      {/* Donation Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Donation Amount:
        </label>
        <Input
          type="number"
          step="0.01"
          value={bookingDetails.donationAmount || ''}
          onChange={(e) => handleFieldChange('donationAmount', parseFloat(e.target.value) || 0)}
          className="w-full"
          placeholder="0.00"
        />
      </div>

      {/* Deceased Information */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name Of Deceased:
        </label>
        <Input
          type="text"
          value={bookingDetails.nameOfDeceased || ''}
          onChange={(e) => handleFieldChange('nameOfDeceased', e.target.value)}
          className="w-full"
          placeholder="Enter deceased person's name"
        />
      </div>

      {/* Service Dates and Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Funeral Service Date:
          </label>
          <DateInput
            value={bookingDetails.funeralServiceDate || ''}
            onChange={(apiDate) => handleFieldChange('funeralServiceDate', apiDate)}
            className="w-full"
            placeholder="dd/mm/yyyy"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mass Time:
          </label>
          <Input
            type="time"
            value={bookingDetails.massTime || ''}
            onChange={(e) => handleFieldChange('massTime', e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cremation Mass Time:
          </label>
          <Input
            type="time"
            value={bookingDetails.cremationMassTime || ''}
            onChange={(e) => handleFieldChange('cremationMassTime', e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hall No:
          </label>
          <Input
            type="text"
            value={bookingDetails.hallNo || ''}
            onChange={(e) => handleFieldChange('hallNo', e.target.value)}
            className="w-full"
            placeholder="Enter hall number"
          />
        </div>
      </div>

      {/* Service Provider Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Funeral Mass/Service by:
          </label>
          <Input
            type="text"
            value={bookingDetails.funeralMassServiceBy || ''}
            onChange={(e) => handleFieldChange('funeralMassServiceBy', e.target.value)}
            className="w-full"
            placeholder="Enter service provider"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Casket Company:
          </label>
          <Input
            type="text"
            value={bookingDetails.casketCompany || ''}
            onChange={(e) => handleFieldChange('casketCompany', e.target.value)}
            className="w-full"
            placeholder="Enter casket company"
          />
        </div>
      </div>

      {/* Burial Information */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Burial:
        </label>
        <Input
          type="text"
          value={bookingDetails.burial || ''}
          onChange={(e) => handleFieldChange('burial', e.target.value)}
          className="w-full"
          placeholder="Enter burial information"
        />
      </div>
    </div>
  );
}
