import { useState } from 'react';
import { GlobalSearchModal } from './EnhancedGlobalSearchModal';

export function GlobalSearchTestPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sample API response data for testing
  const sampleApiResponse = {
    "success": true,
    "message": "Global search completed successfully",
    "data": {
      "results": [
        {
          "id": 1148,
          "code": "1201-0",
          "applicantName": "Peter Ho Yin Fatt",
          "nomineeName": "Cecilia Ho",
          "applicationDate": "2012-07-15T18:30:00.000Z",
          "status": 3,
          "nicheCode": "1201",
          "chapelName": "St Colette",
          "churchName": "Franciscan Columbariium",
          "entityType": "application",
          "relevance": "High"
        },
        {
          "id": 1149,
          "code": "I-1042-0",
          "customerName": "John Smith",
          "totalAmount": 1500,
          "transactionDate": "2023-05-20T10:30:00.000Z",
          "status": "Completed",
          "paymentMode": "Credit Card",
          "entityType": "invoice",
          "relevance": "High"
        },
        {
          "id": 1150,
          "name": "Mary Johnson",
          "email": "mary.johnson@email.com",
          "mobile": "+1234567890",
          "address": "123 Main St, City, State",
          "entityType": "person",
          "relevance": "Medium"
        },
        {
          "id": 1151,
          "code": "WR001-758",
          "applicantName": "Robert Brown",
          "nameOfDeceased": "Alice Brown",
          "usingDate": "2023-06-15T00:00:00.000Z",
          "usingTimeFrom": "10:00",
          "usingTimeTo": "16:00",
          "amount": 2000,
          "status": "Booked",
          "wakeRoomName": "Room A",
          "entityType": "wake-room",
          "relevance": "High"
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 50,
        "totalResults": 4,
        "totalPages": 1,
        "hasNextPage": false,
        "hasPreviousPage": false
      },
      "executionTime": 914,
      "searchMethod": "mssql",
      "performanceMetrics": {
        "method": "mssql",
        "breakdown": {
          "applications": 452,
          "persons": 117,
          "churches": 24,
          "niches": 96,
          "dates": 0,
          "sorting": 1
        },
        "totalExecutionTime": 914
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Global Search Modal Test</h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">Test Instructions</h2>
              <ul className="list-disc list-inside text-blue-800 space-y-2">
                <li>Click the "Open Search Modal" button below</li>
                <li>Try searching with terms like "Peter", "1201", "John", "WR001"</li>
                <li>Test different entity type filters</li>
                <li>Switch between Grid and List views</li>
                <li>Observe the performance metrics display</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-900 mb-3">Sample Data Included</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-800">
                <div>
                  <h3 className="font-medium">Applications</h3>
                  <ul className="list-disc list-inside text-sm ml-2">
                    <li>Peter Ho Yin Fatt (1201-0)</li>
                    <li>St Colette Chapel</li>
                    <li>Status: 3</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium">Invoices</h3>
                  <ul className="list-disc list-inside text-sm ml-2">
                    <li>John Smith (I-1042-0)</li>
                    <li>Amount: $1,500</li>
                    <li>Payment: Credit Card</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium">Persons</h3>
                  <ul className="list-disc list-inside text-sm ml-2">
                    <li>Mary Johnson</li>
                    <li>mary.johnson@email.com</li>
                    <li>+1234567890</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium">Wake Rooms</h3>
                  <ul className="list-disc list-inside text-sm ml-2">
                    <li>Robert Brown (WR001-758)</li>
                    <li>Deceased: Alice Brown</li>
                    <li>Amount: $2,000</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                Open Search Modal
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">API Response Structure</h2>
              <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(sampleApiResponse, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <GlobalSearchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}