import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, EyeIcon, EditIcon, TrashIcon, CalendarIcon, UserIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Input } from './common/Input';
import { DateInput } from './common/DateInput';
import { LoadingSpinner } from './common/LoadingSpinner';
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
  highlightBookingCode?: string | null;
}

export function WakeRoomSearch({ onBookingSelected, onBookingEdit, highlightBookingCode }: WakeRoomSearchProps) {
  const navigate = useNavigate();
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    wakeRoomId: 0,
  });

  // const [currentPage, setCurrentPage] = useState(1);
  // const itemsPerPage = 8;

  const user = useSelector((state: RootState) => state.auth.user);
  const defaultChurchId = user?.churchId || 1;

  const {
    wakeRooms,
    searchResults,
    searchPagination,
    loading,
    error,
    handleSearchBookings,
    handleDeleteBooking,
    handleGetBookingByCode,
    handleLoadAllWakeRooms,
    handleClearError,
  } = useWakeRoom();

  // Load all wake rooms once for the search dropdown
  useEffect(() => {
    if (!Array.isArray(wakeRooms) || wakeRooms.length === 0) {
      handleLoadAllWakeRooms();
    }
  }, [wakeRooms, handleLoadAllWakeRooms]);

  // Initial search if no results (e.g. first load)
  useEffect(() => {
    // Search with defaults (page 1, size 10) to show all bookings
    // Always bypass cache on mount to ensure fresh data
    handleSearchBookings({ page: 1, pageSize: 10, bypassCache: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run on mount

  const handleSearch = async () => {
    const criteria: SearchCriteria = {
      ...searchCriteria,
      wakeRoomId: searchCriteria.wakeRoomId || undefined
    };

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

    await handleSearchBookings({ ...cleanedCriteria, page: 1, pageSize: 10, bypassCache: true });
  };

  // ... (cleanCriteria helper)

  const handlePageChange = (newPage: number) => {
    const totalPages = searchPagination?.totalPages || 1;
    if (newPage >= 1 && newPage <= totalPages) {
      const cleaned = cleanCriteria({
        ...searchCriteria,
        wakeRoomId: searchCriteria.wakeRoomId || undefined
      });
      handleSearchBookings({
        ...cleaned,
        page: newPage,
        pageSize: searchPagination?.pageSize || 10,
        bypassCache: true // Force fresh data on page change
      });
    }
  };

  const currentPage = searchPagination?.page || 1;
  const pageSize = searchPagination?.pageSize || 10;
  const totalItems = searchPagination?.total || 0;
  const totalPages = searchPagination?.totalPages || 1;

  // No client-side slice
  const paginatedResults = searchResults;

  const handleDelete = async (bookingId: number, bookingCode: string) => {
    if (window.confirm(`Are you sure you want to delete booking ${bookingCode}?`)) {
      await handleDeleteBooking(bookingId);

      // Wait a bit for DB propagation then refresh
      setTimeout(() => {
        handleSearchBookings({
          page: currentPage,
          pageSize: pageSize,
          bypassCache: true
        });
      }, 500);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'N/A';
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <span className="px-2.5 py-0.5 text-[9px] font-bold bg-[#ecfdf5] text-[#10b981] border border-[#d1fae5] rounded-full uppercase tracking-tighter shadow-sm">Active</span>;
      case 1:
        return <span className="px-2.5 py-0.5 text-[9px] font-bold bg-[#fffbeb] text-[#f59e0b] border border-[#fef3c7] rounded-full uppercase tracking-tighter shadow-sm">Pending</span>;
      case 2:
        return <span className="px-2.5 py-0.5 text-[9px] font-bold bg-[#fef2f2] text-[#ef4444] border border-[#fee2e2] rounded-full uppercase tracking-tighter shadow-sm">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[9px] font-bold bg-gray-100 text-gray-500 border border-gray-200 rounded-full uppercase tracking-tighter">Unknown</span>;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Search Reservations Card */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] border border-gray-100 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Search Reservations</h2>
            <p className="text-sm text-gray-400 mt-1">Filter bookings by applicant, date, or wake room.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Applicant name
              </label>
              <Input
                type="text"
                value={searchCriteria.applicantName}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, applicantName: e.target.value })}
                className="w-full h-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition-all text-sm"
                placeholder="Search name..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Using date
              </label>
              <DateInput
                value={searchCriteria.usingDate || ''}
                onChange={(apiDate) => setSearchCriteria({ ...searchCriteria, usingDate: apiDate })}
                placeholder="dd/mm/yyyy"
                className="w-full h-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Wake room
              </label>
              <div className="relative">
                <select
                  value={searchCriteria.wakeRoomId}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, wakeRoomId: parseInt(e.target.value) })}
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent bg-gray-50 text-sm appearance-none transition-all pr-10"
                >
                  <option value={0}>All Rooms</option>
                  {Array.isArray(wakeRooms) && wakeRooms.map(room => (
                    <option key={room.wakeRoomId} value={room.wakeRoomId}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ClockIcon className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="flex h-11">
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#8b5a2b] to-[#6d4420] text-white hover:opacity-90 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-md shadow-[#8b5a2b]/20 transition-all disabled:opacity-50"
              >
                {loading ? <LoadingSpinner size="sm" text="" /> : <SearchIcon className="w-4 h-4" />}
                <span>{loading ? 'Searching...' : 'Search'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-red-600 animate-in fade-in zoom-in duration-200">
              <div className="text-xs font-medium flex-1">{error}</div>
              <button
                type="button"
                onClick={handleClearError}
                className="text-[10px] font-bold uppercase tracking-wider hover:opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Search Results Card */}
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_0_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Search Results</h2>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">{searchResults.length} bookings found</p>
          </div>

          <div className="">
            <table className="w-full divide-y divide-gray-100 text-sm table-fixed">
              <thead className="bg-[#fcfcfc]">
                <tr>
                  <th className="w-[80px] px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Code</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Applicant</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Deceased</th>
                  <th className="w-[140px] px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Room</th>
                  <th className="w-[180px] px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Date & Time</th>
                  <th className="w-[100px] px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Status</th>
                  <th className="w-[110px] px-4 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {paginatedResults.map((booking) => (
                  <tr
                    key={booking.wakeRoomBookingId}
                    className={`transition-colors group ${highlightBookingCode === booking.code
                      ? 'bg-yellow-50 border-l-4 border-l-yellow-400 animate-pulse'
                      : 'hover:bg-[#fcfcfc]'
                      }`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap align-top">
                      <div className="text-xs font-bold text-gray-900 tracking-tight">
                        {booking.code}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap align-top">
                      <div className="flex items-start gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors border border-gray-100">
                          <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="truncate min-w-0">
                          <div className="text-sm font-bold text-gray-800 truncate leading-snug">
                            {booking.applicant.name}
                          </div>
                          {booking.applicant.email && (
                            <div className="text-[11px] text-gray-400 truncate mt-0.5" title={booking.applicant.email}>
                              {booking.applicant.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap align-top">
                      <div className="text-sm font-medium text-gray-600 truncate leading-snug" title={booking.booking.nameOfDeceased}>
                        {booking.booking.nameOfDeceased}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap align-top">
                      <div className="text-xs text-gray-500 font-medium truncate leading-snug">
                        {booking.wakeRoom?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap align-top">
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-700 leading-snug">
                            {formatDate(booking.booking.usingTimeFrom)}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                            {formatTime(booking.booking.usingTimeFrom)} - {formatTime(booking.booking.usingTimeTo)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap align-top">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap align-top text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={async () => {
                            const churchId = booking.churchId || defaultChurchId;
                            await handleGetBookingByCode(booking.code, churchId);
                            onBookingSelected?.(booking);
                          }}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                          title="View"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/wake-room/edit/${booking.code}`)}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all border border-transparent hover:border-amber-100"
                          title="Edit"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(booking.wakeRoomBookingId, booking.code)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                          title="Delete"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-8 py-8 border-t border-gray-50 flex items-center justify-between bg-[#fafafa]/30">
            <div className="flex items-center gap-4">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                Showing
                <span className="text-gray-900 mx-1.5">{(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)}</span>
                of {totalItems} results
              </p>
              {totalPages > 1 && (
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-20 hover:bg-white hover:shadow-sm transition-all"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`w-7 h-7 rounded-md text-[11px] font-black transition-all ${currentPage === i + 1
                      ? 'bg-[#8b5a2b] text-white shadow-md'
                      : 'text-gray-400 hover:bg-white hover:text-gray-800'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 ml-2 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-20 hover:bg-white hover:shadow-sm transition-all"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {searchResults.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mx-auto mb-2 border border-dashed border-gray-200">
              <SearchIcon className="w-6 h-6 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No bookings found</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">Try adjusting your filters to find existing wake room reservations.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WakeRoomSearch;

function cleanCriteria(arg0: { wakeRoomId: number | undefined; applicantName?: string; nameOfDeceased?: string; usingDate?: string; }) {
  throw new Error('Function not implemented.');
}
