import React from 'react';
import { NichiWalle } from './NichiWalle';

export function NicheTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Niche Management System</h1>
          <p className="text-gray-600">Integrated with real API endpoint: http://localhost:3000/api/niches/chapel/3/niches?churchId=1</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <NichiWalle />
        </div>
        
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Implementation Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-medium text-blue-800 mb-2">API Integration</h3>
              <ul className="text-blue-700 space-y-1">
                <li>• Fetches real data from API endpoint</li>
                <li>• Maps status codes: 1=Available, 3=Booked, 4=Occupied</li>
                <li>• Handles loading states and errors</li>
                <li>• Implements caching for performance</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-medium text-green-800 mb-2">Features</h3>
              <ul className="text-green-700 space-y-1">
                <li>• Chapel selection dropdown</li>
                <li>• Search functionality by niche code</li>
                <li>• Pagination (8x6 grid per page)</li>
                <li>• Statistics display with occupancy rates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}