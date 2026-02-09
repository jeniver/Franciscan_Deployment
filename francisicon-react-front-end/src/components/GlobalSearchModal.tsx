import { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { GlobalSearch } from '../components/GlobalSearch';
import { Button } from '../components/common/Button';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Global Search</h2>
              <p className="text-sm text-gray-500">Search across all database entities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Content */}
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search anything in the database
            </label>
            <GlobalSearch
              placeholder="Enter application code, person name, church, date, niche code..."
              onResultSelect={(result) => {
                setSearchQuery(result.code || result.name || '');
                // Optional: Navigate to the result
                if (result.entityType === 'application' && result.code) {
                  window.open(`/niche/view/${result.code}`, '_blank');
                }
              }}
              autoFocus={true}
              showResultsInline={true}
              className="w-full"
            />
          </div>

          {/* Search Tips */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Search Tips</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Application codes: "3795-1", "NAPP-123"</li>
              <li>• Person names: Full or partial names</li>
              <li>• Church names: Search by church location</li>
              <li>• Dates: DD/MM/YYYY or YYYY-MM-DD format</li>
              <li>• Niche codes: Search by location codes</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}