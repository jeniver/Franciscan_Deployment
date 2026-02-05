import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { SearchIcon, EyeIcon, EditIcon, TrashIcon, CalendarIcon, UserIcon, ClockIcon } from 'lucide-react';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { DateInput } from './common/DateInput';
import { LoadingSpinner } from './common/LoadingSpinner';
import { Card } from './common/Card';
import { useWakeRoom } from '../hooks/useWakeRoom';
import { RootState } from '../store';

interface SearchCriteria {
  applicantName?: string;
  nameOfDeceased?: string;
  usingDate?: string;
  wakeRoomId?: number;
}

interface WakeRoomSearchProps {
  onBookingSelected?: (booking: any) => void;
  onBookingEdit?: (booking: any) => void;
}

export function WakeRoomSearch({ onBookingSelected, onBookingEdit }: WakeRoomSearchProps) {
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    applicantName: '',
    nameOfDeceased: '',
    usingDate: '',
    wakeRoomId: 0,
  });

  const user = useSelector((state: RootState) => state.auth.user);
  const defaultChurchId = user?.churchId || 1;

  const {
    wakeRooms,
    searchResults,
    loading,
    error,
    // lastErrorType,
    handleSearchBookings,
    handleDeleteBooking,
    handleGetBookingByCode,
    // handleSetSearchCriteria,
    handleLoadAllWakeRooms,
    handleClearError,
    // handleSetSelectedBooking
  } = useWakeRoom();

  // Load all wake rooms once for the search dropdown
  useEffect(() => {
    if (!Array.isArray(wakeRooms) || wakeRooms.length === 0) {
      handleLoadAllWakeRooms();
    }
  }, [wakeRooms, handleLoadAllWakeRooms]);

  const handleSearch = async () => {
    const criteria: SearchCriteria = {
      ...searchCriteria,
      wakeRoomId: searchCriteria.wakeRoomId || undefined
    };

    // Remove empty values in a type-safe way
    const cleanedCriteria: SearchCriteria = {};
    (Object.entries(criteria) as [keyof SearchCriteria, any][])
      .forEach(([key, value]) => {
        if (value !== '' && value !== 0 && value !== undefined) {
          cleanedCriteria[key] = value;
        }
      });

    if (Object.keys(cleanedCriteria).length === 0) {
      alert('Please enter at least one search criteria');
      return;
    }

    await handleSearchBookings(cleanedCriteria);
  };

  const handleDelete = async (bookingId: number, bookingCode: string) => {
    if (window.confirm(`Are you sure you want to delete booking ${bookingCode}?`)) {
      await handleDeleteBooking(bookingId);
    }
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
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
      case 1:
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
      case 2:
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Cancelled</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Unknown</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Search Form */}
        <Card
          gradient
          hover
          title="Search criteria"
          subtitle="Use one or more filters to narrow down bookings. At least one field is required."
          className="animate-in fade-in"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-end">
            {/* Applicant Name */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Applicant name
              </label>
              <Input
                type="text"
                value={searchCriteria.applicantName}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, applicantName: e.target.value })}
                className="w-full"
                placeholder="e.g. John Tan"
              />
            </div>

            {/* Using Date */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Using date
              </label>
              <DateInput
                value={searchCriteria.usingDate || ''}
                onChange={(apiDate) => setSearchCriteria({ ...searchCriteria, usingDate: apiDate })}
                placeholder="dd/mm/yyyy"
                className="w-full"
              />
            </div>

            {/* Wake Room */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Wake room
              </label>
              <select 
                value={searchCriteria.wakeRoomId}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, wakeRoomId: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] bg-white text-sm"
              >
                <option value={0}>All wake rooms</option>
                {Array.isArray(wakeRooms) && wakeRooms.map(room => (
                  <option key={room.wakeRoomId} value={room.wakeRoomId}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <div className="flex items-end h-full md:justify-end">
              <Button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="w-full md:w-auto bg-[#8b5a2b] text-white hover:bg-[#6d4420] border-[#8b5a2b] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" text="" />
                ) : (
                  <SearchIcon className="w-4 h-4" />
                )}
                <span>{loading ? 'Searching...' : 'Search'}</span>
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              <div className="text-sm flex-1">{error}</div>
              <button 
                type="button"
                onClick={handleClearError}
                className="text-xs font-medium underline underline-offset-2 hover:opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Search Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        {loading ? (
          <Card className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Searching bookings..." />
          </Card>
        ) : searchResults.length > 0 ? (
          <Card
            gradient
            hover
            title="Search results"
            subtitle={`${searchResults.length} booking${searchResults.length > 1 ? 's' : ''} found`}
            className="animate-in slide-in-from-bottom"
          >
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Booking code
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Deceased
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Wake room
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date &amp; time
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Amount
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {searchResults.map((booking) => (
                    <tr
                      key={booking.wakeRoomBookingId}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top">
                        <div className="text-sm font-semibold text-gray-900">
                          {booking.code}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 lg:hidden">
                          {booking.wakeRoom?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top">
                        <div className="flex items-start">
                          <UserIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {booking.applicant.name}
                            </div>
                            {booking.applicant.email && (
                              <div className="text-xs text-gray-500 break-all">
                                {booking.applicant.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top">
                        <div className="text-sm text-gray-900">
                          {booking.booking.nameOfDeceased}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top hidden lg:table-cell">
                        <div className="text-sm text-gray-900">
                          {booking.wakeRoom?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top">
                        <div className="flex items-start">
                          <CalendarIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {formatDate(booking.booking.usingTimeFrom)}
                            </div>
                            <div className="flex items-center text-xs text-gray-500 mt-0.5">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {formatTime(booking.booking.usingTimeFrom)} – {formatTime(booking.booking.usingTimeTo)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top hidden md:table-cell">
                        <div className="text-sm font-semibold text-gray-900">
                          ${typeof booking.financial.donationAmount === 'number' ? booking.financial.donationAmount.toFixed(2) : '0.00'}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top hidden md:table-cell">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top text-right text-sm font-medium">
                        <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<EyeIcon className="w-4 h-4" />}
                            onClick={async () => {
                              const churchId = booking.churchId || defaultChurchId;
                              await handleGetBookingByCode(booking.code, churchId);
                              onBookingSelected?.(booking);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<EditIcon className="w-4 h-4" />}
                            onClick={async () => {
                              const churchId = booking.churchId || defaultChurchId;
                              await handleGetBookingByCode(booking.code, churchId);
                              onBookingEdit?.(booking);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<TrashIcon className="w-4 h-4" />}
                            onClick={() => handleDelete(booking.wakeRoomBookingId, booking.code)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : searchResults.length === 0 && !loading ? (
          <Card
            gradient
            hover
            className="flex flex-col items-center justify-center py-12 text-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-1">
              <SearchIcon className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              No bookings found
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Try adjusting your date, applicant name, or wake room filters and search again.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

export default WakeRoomSearch;
