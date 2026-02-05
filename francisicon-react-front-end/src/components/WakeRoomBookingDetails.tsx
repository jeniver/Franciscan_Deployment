import React from 'react';
import { useSelector } from 'react-redux';
import { EyeIcon, PrinterIcon, EditIcon, TrashIcon, CalendarIcon, UserIcon, ClockIcon, MapPinIcon, DollarSignIcon } from 'lucide-react';
import { Button } from './common/Button';
import { useWakeRoom } from '../hooks/useWakeRoom';
import { RootState } from '../store';

interface WakeRoomBookingDetailsProps {
  booking: any;
  onEdit?: (booking: any) => void;
  onDelete?: (bookingId: number) => void;
  onPrint?: (bookingCode: string, type: 'booking' | 'invoice' | 'receipt') => void;
}

export function WakeRoomBookingDetails({ booking, onEdit, onDelete, onPrint }: WakeRoomBookingDetailsProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const defaultChurchId = user?.churchId || 1;
  const { handleDeleteBooking, handleGetBookingByCode } = useWakeRoom();

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
      case 1:
        return <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
      case 2:
        return <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">Cancelled</span>;
      default:
        return <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">Unknown</span>;
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete booking ${booking.code}?`)) {
      await handleDeleteBooking(booking.wakeRoomBookingId);
      onDelete?.(booking.wakeRoomBookingId);
    }
  };

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No booking selected</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8b5a2b] to-[#6d4420] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Booking Details - {booking.code}
            </h3>
            <p className="text-[#f3f4f6] text-sm">
              {booking.wakeRoom?.name || 'Wake Room'} • {formatDate(booking.booking.usingTimeFrom)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(booking.status)}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            variant="secondary"
            icon={<EditIcon className="w-4 h-4" />}
            onClick={async () => {
              // Fetch full booking details from API before editing
              const churchId = booking.churchId || defaultChurchId;
              await handleGetBookingByCode(booking.code, churchId);
              onEdit?.(booking);
            }}
            className="!bg-blue-50 !text-blue-700 !border-blue-300 hover:!bg-blue-100 hover:!border-blue-400"
          >
            Edit Booking
          </Button>
          <Button
            variant="secondary"
            icon={<PrinterIcon className="w-4 h-4" />}
            onClick={() => onPrint?.(booking.code, 'booking')}
            className="!bg-green-50 !text-green-700 !border-green-300 hover:!bg-green-100 hover:!border-green-400"
          >
            Print Booking
          </Button>
          <Button
            variant="secondary"
            icon={<PrinterIcon className="w-4 h-4" />}
            onClick={() => onPrint?.(booking.code, 'invoice')}
            className="!bg-purple-50 !text-purple-700 !border-purple-300 hover:!bg-purple-100 hover:!border-purple-400"
          >
            Print Invoice
          </Button>
          <Button
            variant="secondary"
            icon={<PrinterIcon className="w-4 h-4" />}
            onClick={() => onPrint?.(booking.code, 'receipt')}
            className="!bg-orange-50 !text-orange-700 !border-orange-300 hover:!bg-orange-100 hover:!border-orange-400"
          >
            Print Receipt
          </Button>
          <Button
            variant="danger"
            icon={<TrashIcon className="w-4 h-4" />}
            onClick={handleDelete}
          >
            Delete Booking
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Applicant Information */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <UserIcon className="w-6 h-6 text-[#8b5a2b] mr-3" />
                <h4 className="text-lg font-semibold text-gray-900">Applicant Information</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{booking.applicant.name}</p>
                </div>
                {booking.applicant.idNo && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">ID Number</label>
                    <p className="text-gray-900">{booking.applicant.idNo}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{booking.applicant.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Mobile Number</label>
                  <p className="text-gray-900">{booking.applicant.mobileNo}</p>
                </div>
                {booking.applicant.homeTelNo && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Home Telephone</label>
                    <p className="text-gray-900">{booking.applicant.homeTelNo}</p>
                  </div>
                )}
                {booking.applicant.officeTelNo && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Office Telephone</label>
                    <p className="text-gray-900">{booking.applicant.officeTelNo}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-gray-900">{booking.applicant.address}</p>
                </div>
              </div>
            </div>

            {/* Booking Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <CalendarIcon className="w-6 h-6 text-[#8b5a2b] mr-3" />
                <h4 className="text-lg font-semibold text-gray-900">Booking Information</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Purpose</label>
                  <p className="text-gray-900">{booking.booking.purpose}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Name of Deceased</label>
                  <p className="text-gray-900">{booking.booking.nameOfDeceased}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Using Date</label>
                  <p className="text-gray-900">{formatDate(booking.booking.usingDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Time Period</label>
                  <div className="flex items-center text-gray-900">
                    <ClockIcon className="w-4 h-4 mr-2" />
                    <span>{formatTime(booking.booking.usingTimeFrom)} - {formatTime(booking.booking.usingTimeTo)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Number of Days</label>
                  <p className="text-gray-900">{booking.booking.noOfDays}</p>
                </div>
                {booking.booking.remarks && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Remarks</label>
                    <p className="text-gray-900">{booking.booking.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wake Room & Financial Information */}
          <div className="space-y-6">
            {/* Wake Room Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <MapPinIcon className="w-6 h-6 text-[#8b5a2b] mr-3" />
                <h4 className="text-lg font-semibold text-gray-900">Wake Room Information</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Wake Room</label>
                  <p className="text-gray-900">{booking.wakeRoom?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Code</label>
                  <p className="text-gray-900">{booking.wakeRoom?.code || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Renting Amount</label>
                  <p className="text-gray-900">${booking.wakeRoom?.rentingAmount?.toFixed(2) || '0.00'}</p>
                </div>
                {booking.wakeRoom?.remarks && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Remarks</label>
                    <p className="text-gray-900">{booking.wakeRoom.remarks}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <DollarSignIcon className="w-6 h-6 text-[#8b5a2b] mr-3" />
                <h4 className="text-lg font-semibold text-gray-900">Financial Information</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Default Donation Amount</label>
                  <p className="text-gray-900">${typeof booking.financial.defaultDonationAmount === 'number' ? booking.financial.defaultDonationAmount.toFixed(2) : '0.00'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Donation Amount</label>
                  <p className="text-lg font-semibold text-[#8b5a2b]">${typeof booking.financial.donationAmount === 'number' ? booking.financial.donationAmount.toFixed(2) : '0.00'}</p>
                </div>
              </div>
            </div>

            {/* Service Information */}
            {(booking.service.serviceby || booking.service.casketCompany || booking.service.hallNo || booking.service.timeOfCremation) && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <ClockIcon className="w-6 h-6 text-[#8b5a2b] mr-3" />
                  <h4 className="text-lg font-semibold text-gray-900">Service Information</h4>
                </div>
                <div className="space-y-3">
                  {booking.service.serviceby && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Service By</label>
                      <p className="text-gray-900">{booking.service.serviceby}</p>
                    </div>
                  )}
                  {booking.service.casketCompany && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Casket Company</label>
                      <p className="text-gray-900">{booking.service.casketCompany}</p>
                    </div>
                  )}
                  {booking.service.hallNo && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Hall Number</label>
                      <p className="text-gray-900">{booking.service.hallNo}</p>
                    </div>
                  )}
                  {booking.service.timeOfCremation && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Time of Cremation</label>
                      <p className="text-gray-900">{formatDateTime(booking.service.timeOfCremation)}</p>
                    </div>
                  )}
                  {booking.booking.massTime && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mass Time</label>
                      <p className="text-gray-900">{formatTime(booking.booking.massTime)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WakeRoomBookingDetails;
