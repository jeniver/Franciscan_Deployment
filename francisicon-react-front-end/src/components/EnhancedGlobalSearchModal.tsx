import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Grid, List, Filter, Hash, User, Home, MapPin, Calendar, Church, Clock, Database, BarChart3 } from 'lucide-react';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { Button } from './common/Button';
import { LoadingSpinner } from './common/LoadingSpinner';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: number | string;
  code?: string;
  name?: string;
  applicantName?: string;
  nomineeName?: string;
  nameOfDeceased?: string;
  entityType: 'application' | 'person' | 'church' | 'niche' | 'date' | 'inscription' | 'wake-room' | 'invoice' | 'gates-of-life';
  relevance: string;
  applicationDate?: string;
  transactionDate?: string;
  usingDate?: string;
  status?: number | string;
  statusText?: string;
  isAvailable?: boolean;
  nicheCode?: string;
  chapelName?: string;
  churchName?: string;
  wakeRoomName?: string;
  email?: string;
  mobile?: string;
  address?: string;
  amount?: number;
  totalAmount?: number;
  description?: string;
  matchType?: string;
  dateDied?: string;
  dateOfBirth?: string;
  deathCertificateNo?: string;
  customerName?: string;
  paymentMode?: string;
  bookingDate?: string;
  [key: string]: any;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([
    'application', 'person', 'church', 'niche', 'date',
    'inscription', 'wake-room', 'invoice', 'gates-of-life'
  ]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    searchResults,
    isSearching,
    searchError,
    searchMetadata,
    performSearch,
    clearResults
  } = useGlobalSearch();

  // Auto-clear when modal closes or opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      clearResults();
    }
  }, [isOpen]); // Remove clearResults from dependencies to prevent infinite loop

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      await performSearch(searchTerm, selectedEntityTypes);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      handleSearch();
    }
  };

  const toggleEntityType = (type: string) => {
    setSelectedEntityTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      application: 'Applications',
      person: 'Persons',
      church: 'Churches',
      niche: 'Niches',
      date: 'Dates',
      inscription: 'Inscriptions',
      'wake-room': 'Wake Rooms',
      invoice: 'Invoices',
      'gates-of-life': 'Gates of Life'
    };
    return labels[type] || type;
  };

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'application': return <Hash className="w-4 h-4" />;
      case 'person': return <User className="w-4 h-4" />;
      case 'church': return <Church className="w-4 h-4" />;
      case 'niche': return <Home className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'inscription': return <Search className="w-4 h-4" />;
      case 'wake-room': return <Home className="w-4 h-4" />;
      case 'invoice': return <Hash className="w-4 h-4" />;
      case 'gates-of-life': return <Church className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getEntityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      application: 'bg-blue-100 text-blue-800',
      person: 'bg-green-100 text-green-800',
      church: 'bg-purple-100 text-purple-800',
      niche: 'bg-orange-100 text-orange-800',
      date: 'bg-red-100 text-red-800',
      inscription: 'bg-indigo-100 text-indigo-800',
      'wake-room': 'bg-amber-100 text-amber-800',
      invoice: 'bg-emerald-100 text-emerald-800',
      'gates-of-life': 'bg-violet-100 text-violet-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string | number, isAvailable?: boolean) => {
    if (isAvailable === true) return 'bg-green-100 text-green-800';
    if (isAvailable === false) return 'bg-red-100 text-red-800';

    const statusStr = String(status).toLowerCase();
    if (statusStr.includes('draft') || statusStr.includes('pending')) return 'bg-yellow-100 text-yellow-800';
    if (statusStr.includes('booked') || statusStr.includes('completed')) return 'bg-green-100 text-green-800';
    if (statusStr.includes('deleted') || statusStr.includes('cancelled')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const resolveResultId = (result: SearchResult): string | null => {
    const candidate = result.id ?? result.personId ?? result.PersonId ?? result.code ?? null;
    if (candidate === null || candidate === undefined) {
      return null;
    }
    const value = String(candidate).trim();
    return value.length > 0 ? value : null;
  };

  // Handle navigation when grid item is clicked
  const handleResultClick = (result: SearchResult) => {
    // Close the modal first
    onClose();

    // Navigate to the appropriate page based on entity type
    switch (result.entityType) {
      case 'application':
        // Navigate to view application page
        if (result.code) {
          navigate(`/niche/view/${result.code}`);
        }
        break;

      case 'inscription':
        // Navigate to edit inscription page
        if (result.code) {
          navigate(`/inscriptions/${result.code}/edit`);
        } else if (result.id) {
          navigate(`/inscriptions/${result.id}/edit`);
        }
        break;

      case 'wake-room':
        // Navigate to edit wake room booking
        if (result.code) {
          navigate(`/wake-room/edit/${result.code}`);
        } else if (result.id) {
          navigate(`/wake-room/edit/${result.id}`);
        }
        break;

      case 'person':
        // Navigate to person profile detail page.
        // Global search can return id under different keys depending on source.
        {
          const personId = resolveResultId(result);
          if (personId) {
            navigate(`/person/${personId}`);
          } else {
            console.log('Person selected without resolvable id:', result);
          }
        }
        break;

      case 'church':
        // Navigate to create new niche application
        navigate('/niche/new');
        break;

      case 'niche':
        // Navigate to create new niche application
        navigate('/niche/new');
        break;

      case 'date':
        // For date entities, log selection
        console.log('Date selected:', result);
        break;

      case 'invoice':
        // For invoice entities, navigate to invoice page if code exists
        if (result.code) {
          navigate(`/create-invoice/${result.code}`);
        }
        break;

      case 'gates-of-life':
        // For gates-of-life entities, navigate to gates of life page
        if (result.code) {
          navigate(`/gate-of-life/edit/${result.code}`);
        } else {
          navigate('/gates-of-life');
        }
        break;

      default:
        console.log('Unknown entity type:', result.entityType);
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Global Search</h2>
              <p className="text-sm text-gray-600">Search across all database entities</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Grid view"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
              title="List view"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search applications, persons, churches, niches, dates..."
                className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    clearResults();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="px-6"
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
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters {filtersOpen ? '↑' : '↓'}
            </button>
            {searchResults.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
                {searchMetadata.executionTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {searchMetadata.executionTime}ms
                  </span>
                )}
                {searchMetadata.searchMethod && (
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {searchMetadata.searchMethod}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-auto">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center h-full p-12">
              <LoadingSpinner size="lg" text="Searching database..." />
            </div>
          ) : searchError ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search Failed</h3>
              <p className="text-gray-600 mb-6">{searchError}</p>
              <Button variant="primary" onClick={handleSearch}>
                Try Again
              </Button>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-6">
              {viewMode === 'grid' ? (
                // Grid View
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.entityType}-${result.id}-${index}`}
                      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEntityTypeColor(result.entityType)}`}>
                            {getEntityTypeIcon(result.entityType)}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getEntityTypeColor(result.entityType)}`}>
                            {getEntityTypeLabel(result.entityType)}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${result.relevance === 'Very High' ? 'bg-green-100 text-green-800' :
                            result.relevance === 'High' ? 'bg-blue-100 text-blue-800' :
                              result.relevance === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {result.relevance}
                        </span>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-2 truncate">
                        {result.code || result.name || result.applicantName || 'Unknown'}
                      </h3>

                      <div className="space-y-2 text-sm text-gray-600">
                        {result.applicantName && (
                          <div className="flex flex-wrap gap-1">
                            <span className="font-medium">Applicant:</span>
                            <span className="truncate">{result.applicantName}</span>
                            {result.nomineeName && (
                              <>
                                <span>•</span>
                                <span className="font-medium">Nominee:</span>
                                <span className="truncate">{result.nomineeName}</span>
                              </>
                            )}
                          </div>
                        )}

                        {result.customerName && (
                          <div className="flex flex-wrap gap-1">
                            <span className="font-medium">Customer:</span>
                            <span className="truncate">{result.customerName}</span>
                          </div>
                        )}

                        {result.nameOfDeceased && (
                          <div className="flex flex-wrap gap-1">
                            <span className="font-medium">Deceased:</span>
                            <span className="truncate">{result.nameOfDeceased}</span>
                          </div>
                        )}

                        {result.chapelName && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{result.chapelName}</span>
                            {result.nicheCode && (
                              <>
                                <span>•</span>
                                <span>Niche: {result.nicheCode}</span>
                              </>
                            )}
                          </div>
                        )}

                        {result.email && (
                          <div className="truncate">
                            {result.email} {result.mobile && `• ${result.mobile}`}
                          </div>
                        )}

                        {result.paymentMode && (
                          <div className="truncate">
                            <span className="font-medium">Payment:</span> {result.paymentMode}
                          </div>
                        )}

                        {result.deathCertificateNo && (
                          <div className="truncate">
                            <span className="font-medium">Certificate:</span> {result.deathCertificateNo}
                          </div>
                        )}

                        {result.address && (
                          <div className="truncate">{result.address}</div>
                        )}

                        {result.description && (
                          <div className="text-gray-500 truncate">{result.description}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(result.status || result.statusText || '', result.isAvailable)}`}>
                          {result.statusText || result.status || (result.isAvailable ? 'Available' : 'Unavailable')}
                        </span>

                        {(result.applicationDate || result.transactionDate || result.usingDate || result.bookingDate || result.dateDied) && (
                          <span className="text-xs text-gray-500">
                            {result.applicationDate && new Date(result.applicationDate).toLocaleDateString()}
                            {result.transactionDate && new Date(result.transactionDate).toLocaleDateString()}
                            {result.usingDate && new Date(result.usingDate).toLocaleDateString()}
                            {result.bookingDate && new Date(result.bookingDate).toLocaleDateString()}
                            {result.dateDied && new Date(result.dateDied).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // List View
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.entityType}-${result.id}-${index}`}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer hover:border-blue-300"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getEntityTypeColor(result.entityType)}`}>
                          {getEntityTypeIcon(result.entityType)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {result.code || result.name || result.applicantName || 'Unknown'}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityTypeColor(result.entityType)}`}>
                              {getEntityTypeLabel(result.entityType)}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${result.relevance === 'Very High' ? 'bg-green-100 text-green-800' :
                                result.relevance === 'High' ? 'bg-blue-100 text-blue-800' :
                                  result.relevance === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                              }`}>
                              {result.relevance} relevance
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                            {result.applicantName && (
                              <div>
                                <span className="font-medium">Applicant:</span> {result.applicantName}
                                {result.nomineeName && (
                                  <>
                                    <br />
                                    <span className="font-medium">Nominee:</span> {result.nomineeName}
                                  </>
                                )}
                              </div>
                            )}

                            {result.customerName && (
                              <div>
                                <span className="font-medium">Customer:</span> {result.customerName}
                              </div>
                            )}

                            {result.nameOfDeceased && (
                              <div>
                                <span className="font-medium">Deceased:</span> {result.nameOfDeceased}
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

                            {result.paymentMode && (
                              <div>
                                <span className="font-medium">Payment:</span> {result.paymentMode}
                              </div>
                            )}

                            {result.deathCertificateNo && (
                              <div>
                                <span className="font-medium">Certificate:</span> {result.deathCertificateNo}
                              </div>
                            )}

                            {result.address && (
                              <div>
                                <span className="font-medium">Address:</span> {result.address}
                              </div>
                            )}

                            {(result.amount !== undefined || result.totalAmount !== undefined) && (
                              <div>
                                <span className="font-medium">Amount:</span> ${(result.amount || result.totalAmount || 0).toLocaleString()}
                              </div>
                            )}

                            {result.description && (
                              <div className="md:col-span-2">
                                <span className="font-medium">Description:</span> {result.description}
                              </div>
                            )}

                            {(result.applicationDate || result.transactionDate || result.usingDate || result.bookingDate || result.dateDied || result.dateOfBirth) && (
                              <div>
                                <span className="font-medium">Date:</span>
                                {result.applicationDate && ` Applied: ${new Date(result.applicationDate).toLocaleDateString()}`}
                                {result.transactionDate && ` Transaction: ${new Date(result.transactionDate).toLocaleDateString()}`}
                                {result.usingDate && ` Using: ${new Date(result.usingDate).toLocaleDateString()}`}
                                {result.bookingDate && ` Booking: ${new Date(result.bookingDate).toLocaleDateString()}`}
                                {result.dateDied && ` Died: ${new Date(result.dateDied).toLocaleDateString()}`}
                                {result.dateOfBirth && ` Born: ${new Date(result.dateOfBirth).toLocaleDateString()}`}
                              </div>
                            )}

                            <div>
                              <span className="font-medium">Status:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(result.status || result.statusText || '', result.isAvailable)}`}>
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
              )}
            </div>
          ) : searchTerm.trim() ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <Search className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search terms or filters
              </p>
              <div className="max-w-md text-left text-sm text-gray-500">
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
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <Search className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start your search</h3>
              <p className="text-gray-600">
                Enter a search term above to search across all database entities
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {searchResults.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'application', 'person', 'church', 'niche', 'date',
                'inscription', 'wake-room', 'invoice', 'gates-of-life'
              ].map(type => {
                const count = searchResults.filter(r => r.entityType === type).length;
                if (count === 0) return null;
                return (
                  <span
                    key={type}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEntityTypeColor(type)}`}
                  >
                    {getEntityTypeLabel(type)}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}