import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { WakeRoomBookingForm } from '../components/WakeRoomBookingForm';
import { WakeRoomSearch } from '../components/WakeRoomSearch';
import { PlusIcon, SearchIcon } from 'lucide-react';

export function WakeRoomPage() {
  const [activeTab, setActiveTab] = useState<'booking' | 'search'>('booking');

  const handleBookingCreated = (bookingCode: string) => {
    console.log('Booking created:', bookingCode);
    // Optionally switch to search tab to show the created booking
    setActiveTab('search');
  };

  const handleBookingUpdated = (bookingCode: string) => {
    console.log('Booking updated:', bookingCode);
  };

  const handleBookingSelected = (booking: any) => {
    console.log('Booking selected:', booking);
    // Switch to booking tab and populate form with selected booking data
    setActiveTab('booking');
    // The form will automatically populate when selectedBooking changes in Redux
  };

  const handleBookingEdit = (booking: any) => {
    console.log('Booking edit:', booking);
    // Handle booking edit (e.g., switch to booking form with pre-filled data)
    setActiveTab('booking');
  };

  return (
    <Layout title="Wake Room Management">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {/* Page header with tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#8b5a2b] to-[#6d4420] rounded-xl flex items-center justify-center shadow-md">
                  {activeTab === 'booking' ? (
                    <PlusIcon className="w-6 h-6 text-white" />
                  ) : (
                    <SearchIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {activeTab === 'booking' ? 'New wake room booking' : 'Wake room booking search'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'booking'
                      ? 'Create or edit a wake room booking using the guided steps.'
                      : 'Quickly find and manage existing wake room bookings.'}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="inline-flex items-center rounded-xl bg-gray-50 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('booking')}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    activeTab === 'booking'
                      ? 'bg-white text-[#8b2828] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>New booking</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    activeTab === 'search'
                      ? 'bg-white text-[#8b2828] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <SearchIcon className="w-4 h-4" />
                  <span>Search bookings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab === 'booking' ? (
              <WakeRoomBookingForm 
                onBookingCreated={handleBookingCreated}
                onBookingUpdated={handleBookingUpdated}
              />
            ) : (
              <WakeRoomSearch 
                onBookingSelected={handleBookingSelected}
                onBookingEdit={handleBookingEdit}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}