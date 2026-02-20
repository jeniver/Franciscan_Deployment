import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { WakeRoomBookingForm } from '../components/WakeRoomBookingForm';
import { WakeRoomSearch } from '../components/WakeRoomSearch';
import { TableIcon, PlusIcon, EyeIcon, PrinterIcon } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useWakeRoom } from '../hooks/useWakeRoom';
import { useSelector, useDispatch } from 'react-redux';
import { resetWakeRoomState } from '../store/wakeRoomSlice';
import { WakeRoomAgreementModal } from '../components/WakeRoomAgreementModal';

export function WakeRoomPage() {
  const { bookingCode } = useParams<{ bookingCode?: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'form' | 'table'>('table');
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [newlyCreatedBookingCode, setNewlyCreatedBookingCode] = useState<string | null>(null);
  const { handleGetBookingByCode, selectedBooking, handleSearchBookings } = useWakeRoom();
  const user = useSelector((state: any) => state.auth.user);

  // Effect to sync view mode with route
  useEffect(() => {
    if (bookingCode || location.pathname === '/wake-room/new') {
      setViewMode('form');
    } else if (location.pathname === '/wake-room') {
      setViewMode('table');
    }
  }, [bookingCode, location.pathname]);

  // Effect to load booking data if bookingCode exists
  useEffect(() => {
    if (bookingCode) {
      handleGetBookingByCode(bookingCode, user?.churchId || 1);
    } else if (location.pathname === '/wake-room/new') {
      // Clear selected booking only if we're on the new booking route
      dispatch(resetWakeRoomState());
    }
  }, [bookingCode, handleGetBookingByCode, user?.churchId, location.pathname, dispatch]);

  const handleBookingCreated = (bookingCode: string) => {
    console.log('Booking created:', bookingCode);
    // Set the newly created booking code for highlighting
    // Set the newly created booking code for highlighting
    setNewlyCreatedBookingCode(bookingCode);
    // Refresh the search list with cache bypass
    handleSearchBookings({ page: 1, pageSize: 10, bypassCache: true });
    // Switch to table view to show the created booking
    navigate('/wake-room');
  };

  const handleBookingUpdated = (bookingCode: string) => {
    console.log('Booking updated:', bookingCode);
    // Refresh the search list with cache bypass
    handleSearchBookings({ page: 1, pageSize: 10, bypassCache: true });
    // Switch to table view after update
    navigate('/wake-room');
  };

  return (
    <Layout title="Wake Room Management">
      <div className="min-h-screen bg-[#fcfcfc]">
        {/* Standardized Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            {viewMode === 'form' ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-700">
                    Application Number:
                  </p>
                  <Input
                    type="text"
                    value={bookingCode || ''}
                    readOnly
                    className="text-lg font-bold text-gray-900 w-32 md:w-40 py-2 px-3 border border-gray-300 rounded-md"
                    placeholder="Enter booking code"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    icon={<EyeIcon className="w-4 h-4" />}
                    onClick={() => handleGetBookingByCode(bookingCode!, user?.churchId || 1)}
                    disabled={!bookingCode}
                  >
                    View
                  </Button>

                  <Button
                    variant="secondary"
                    icon={<PrinterIcon className="w-4 h-4" />}
                    onClick={() => setIsAgreementModalOpen(true)}
                    disabled={!bookingCode}
                  >
                    View Wake Room Application
                  </Button>

                  <Button
                    variant="primary"
                    icon={<PrinterIcon className="w-4 h-4" />}
                    onClick={() => navigate(`/create-invoice/${bookingCode}?type=WAPP`)}
                    disabled={!bookingCode}
                  >
                    Invoice
                  </Button>

                  <Button
                    variant="secondary"
                    icon={<TableIcon className="w-4 h-4" />}
                    onClick={() => navigate('/wake-room')}
                  >
                    View Applications
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Wake Room Bookings</h2>
                  <p className="text-sm text-gray-600">
                    Manage and search through all wake room reservation records.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSearchBookings({ page: 1, pageSize: 10, bypassCache: true })}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    icon={<PlusIcon className="w-4 h-4" />}
                    onClick={() => navigate('/wake-room/new')}
                    className="bg-[#8b5a2b] text-white border-[#8b5a2b]"
                  >
                    Create New Booking
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {viewMode === 'table' ? (
              <WakeRoomSearch highlightBookingCode={newlyCreatedBookingCode} />
            ) : (
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <WakeRoomBookingForm
                  onBookingCreated={handleBookingCreated}
                  onBookingUpdated={handleBookingUpdated}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Agreement Modal */}
      <WakeRoomAgreementModal
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        booking={selectedBooking}
      />
    </Layout >
  );
}