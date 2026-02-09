import { useState } from 'react';
import { Search, Filter, SlidersHorizontal, X } from 'lucide-react';
import { GlobalSearch, useGlobalSearch } from '../components/GlobalSearch';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface SearchFilters {
  entityTypes: string[];
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  includeAvailability: boolean;
}

const DEFAULT_FILTERS: SearchFilters = {
  entityTypes: ['application', 'person', 'church', 'niche', 'date'],
  includeAvailability: true
};

export function GlobalSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const {
    searchResults,
    isSearching,
    searchError,
    performSearch,
    clearResults
  } = useGlobalSearch();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      await performSearch(searchQuery, filters.entityTypes);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const toggleEntityType = (type: string) => {
    setFilters(prev => {
      const currentTypes = [...prev.entityTypes];
      const index = currentTypes.indexOf(type);
      
      if (index >= 0) {
        currentTypes.splice(index, 1);
      } else {
        currentTypes.push(type);
      }
      
      return {
        ...prev,
        entityTypes: currentTypes
      };
    });
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    clearResults();
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      application: 'Applications',
      person: 'Persons',
      church: 'Churches',
      niche: 'Niches',
      date: 'Dates'
    };
    return labels[type] || type;
  };

  const getEntityTypeCount = (type: string) => {
    return searchResults.filter(result => result.entityType === type).length;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Global Search</h1>
          <p className="text-gray-600">
            Search across applications, persons, churches, niches, and dates in one place
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <GlobalSearch
                placeholder="Enter search term (application code, person name, church, date, etc.)"
                onResultSelect={(result) => {
                  setSearchQuery(result.code || result.name || '');
                }}
                autoFocus={true}
                showResultsInline={false}
                entityTypes={filters.entityTypes}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="md:w-auto"
            >
              {isSearching ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:w-auto"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Search in:</span>
                  {['application', 'person', 'church', 'niche', 'date'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.entityTypes.includes(type)}
                        onChange={() => toggleEntityType(type)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        {getEntityTypeLabel(type)}
                      </span>
                    </label>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.includeAvailability}
                      onChange={(e) => handleFilterChange('includeAvailability', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Include niche availability
                    </span>
                  </label>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {isSearching ? (
            <div className="p-12 text-center">
              <LoadingSpinner size="lg" text="Searching across all entities..." />
            </div>
          ) : searchError ? (
            <div className="p-12 text-center">
              <div className="text-red-600 mb-4">
                <Search className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-medium mb-2">Search Failed</h3>
                <p className="text-gray-600">{searchError}</p>
              </div>
              <Button variant="primary" onClick={handleSearch}>
                Try Again
              </Button>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              {/* Results Summary */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {filters.entityTypes.map(type => {
                      const count = getEntityTypeCount(type);
                      if (count === 0) return null;
                      return (
                        <span
                          key={type}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {getEntityTypeLabel(type)}: {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Results List */}
              <div className="divide-y divide-gray-200">
                {searchResults.map((result, index) => (
                  <div key={`${result.entityType}-${result.id}-${index}`} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {result.entityType === 'application' && (
                            <span className="text-blue-600 font-semibold">#</span>
                          )}
                          {result.entityType === 'person' && (
                            <span className="text-green-600 font-semibold">👤</span>
                          )}
                          {result.entityType === 'church' && (
                            <span className="text-purple-600 font-semibold">⛪</span>
                          )}
                          {result.entityType === 'niche' && (
                            <span className="text-orange-600 font-semibold">🏠</span>
                          )}
                          {result.entityType === 'date' && (
                            <span className="text-red-600 font-semibold">📅</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {result.code || result.name || result.applicantName || 'Unknown'}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getEntityTypeLabel(result.entityType)}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.relevance === 'Very High' ? 'bg-green-100 text-green-800' :
                            result.relevance === 'High' ? 'bg-blue-100 text-blue-800' :
                            result.relevance === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.relevance} relevance
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          {result.applicantName && result.nomineeName && (
                            <div>
                              <span className="font-medium">Applicant:</span> {result.applicantName}
                              <br />
                              <span className="font-medium">Nominee:</span> {result.nomineeName}
                            </div>
                          )}
                          
                          {result.chapelName && (
                            <div>
                              <span className="font-medium">Location:</span> {result.chapelName}
                              {result.nicheCode && ` • Niche: ${result.nicheCode}`}
                            </div>
                          )}
                          
                          {result.email && (
                            <div>
                              <span className="font-medium">Contact:</span> {result.email}
                              {result.mobile && ` • ${result.mobile}`}
                            </div>
                          )}
                          
                          {result.address && (
                            <div>
                              <span className="font-medium">Address:</span> {result.address}
                            </div>
                          )}
                          
                          {result.amount !== undefined && (
                            <div>
                              <span className="font-medium">Amount:</span> ${result.amount.toLocaleString()}
                            </div>
                          )}
                          
                          {result.description && (
                            <div className="md:col-span-2">
                              <span className="font-medium">Description:</span> {result.description}
                            </div>
                          )}
                          
                          {result.applicationDate && (
                            <div>
                              <span className="font-medium">Date:</span> {
                                new Date(result.applicationDate).toLocaleDateString()
                              }
                            </div>
                          )}
                          
                          <div>
                            <span className="font-medium">Status:</span> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              result.isAvailable ? 'bg-green-100 text-green-800' :
                              result.status === 'Booked' ? 'bg-yellow-100 text-yellow-800' :
                              result.status === 'Occupied' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.statusText || result.status}
                            </span>
                          </div>
                        </div>
                        
                        {result.matchType && (
                          <div className="mt-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Match: {result.matchType}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : searchQuery.trim() ? (
            <div className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search terms or filters
              </p>
              <div className="max-w-md mx-auto text-left text-sm text-gray-500">
                <p className="font-medium mb-2">Search tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Search by application code (e.g., "3795-1", "NAPP-123")</li>
                  <li>Search by person names (full or partial)</li>
                  <li>Search by church names</li>
                  <li>Search by dates (DD/MM/YYYY format)</li>
                  <li>Search by niche codes</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start your search</h3>
              <p className="text-gray-500">
                Enter a search term above to search across all database entities
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}