import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { WakeRoomBookingForm } from '../components/WakeRoomBookingForm';
import { WakeRoomSearch } from '../components/WakeRoomSearch';
import { PlusIcon, SearchIcon, TableIcon, FileEditIcon } from 'lucide-react';
import { Button } from '../components/common/Button';

export function WakeRoomPage() {
  const [viewMode, setViewMode] = useState<'form' | 'table'>('table');

  const handleBookingCreated = (bookingCode: string) => {
    console.log('Booking created:', bookingCode);
    // Switch to table view to show the created booking
    setViewMode('table');
  };

  const handleBookingUpdated = (bookingCode: string) => {
    console.log('Booking updated:', bookingCode);
    // Switch to table view after update
    setViewMode('table');
  };

  return (
    <Layout title="Wake Room Management">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {/* Page header with view mode toggle */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#8b5a2b] to-[#6d4420] rounded-xl flex items-center justify-center shadow-md">
                  {viewMode === 'table' ? (
                    <TableIcon className="w-6 h-6 text-white" />
                  ) : (
                    <FileEditIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {viewMode === 'table' ? 'Wake Room Bookings' : 'Wake Room Booking Form'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {viewMode === 'form'
                      ? 'Create or edit a wake room booking using the guided steps.'
                      : 'View and manage existing wake room bookings.'}
                  </p>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'form' ? 'primary' : 'outline'}
                  icon={<FileEditIcon className="w-4 h-4" />}
                  onClick={() => setViewMode('form')}
                >
                  Form View
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'outline'}
                  icon={<TableIcon className="w-4 h-4" />}
                  onClick={() => setViewMode('table')}
                >
                  Table View
                </Button>
              </div>
            </div>
          </div>

          {/* View Content */}
          <div className="flex-1">
            {viewMode === 'table' ? (
              <WakeRoomSearch />
            ) : (
              <WakeRoomBookingForm 
                onBookingCreated={handleBookingCreated}
                onBookingUpdated={handleBookingUpdated}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}