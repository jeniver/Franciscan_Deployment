import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, User, Home, MapPin, Calendar, Church, Hash, BookOpen, Bed } from 'lucide-react';
import api from '../services/api';
import { debounce } from '../utils/debounce';

interface GlobalSearchResult {
  id: number | string;
  code?: string;
  name?: string;
  applicantName?: string;
  nomineeName?: string;
  nameOfDeceased?: string;
  inscriptionPhrase?: string;
  entityType: 'application' | 'person' | 'church' | 'niche' | 'date' | 'inscription' | 'wake-room';
  relevance: string;
  applicationDate?: string;
  transactionDate?: string;
  usingDate?: string;
  usingTimeFrom?: string;
  usingTimeTo?: string;
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
  description?: string;
  matchType?: string;
}

interface GlobalSearchProps {
  onResultSelect?: (result: GlobalSearchResult) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showResultsInline?: boolean;
  entityTypes?: string[]; // application,person,church,niche,date
}

export function GlobalSearch({
  onResultSelect,
  placeholder = "Search applications, inscriptions, wake rooms, persons, churches, niches...",
  className = "",
  autoFocus = false,
  showResultsInline = true,
  entityTypes = ['application', 'inscription', 'wake-room', 'person', 'church', 'niche', 'date']
}: GlobalSearchProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [suggestions, setSuggestions] = useState<{ text: string; type: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchMetadata, setSearchMetadata] = useState({
    executionTime: 0,
    searchMethod: '',
    totalMatches: 0
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.trim().length < 2) {
        setResults([]);
        setSuggestions([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        // Fetch search results
        const searchResponse = await api.get('/api/search/global', {
          params: {
            q: term,
            types: entityTypes.join(','),
            page: 1,
            pageSize: 15
          },
          signal: abortControllerRef.current.signal
        });

        // Extract metadata from response
        const searchMetadata = {
          executionTime: searchResponse.data.executionTime || 0,
          searchMethod: searchResponse.data.searchMethod || 'unknown',
          totalMatches: searchResponse.data.totalMatches || 0
        };

        // Fetch autocomplete suggestions
        const suggestionsResponse = await api.get('/api/search/autocomplete', {
          params: {
            q: term,
            limit: 8
          },
          signal: abortControllerRef.current.signal
        });

        if (searchResponse.data.success) {
          setResults(searchResponse.data.data || []);
          setSearchMetadata(searchMetadata); // Store search metadata
        }

        if (suggestionsResponse.data.success) {
          setSuggestions(suggestionsResponse.data.data || []);
        }

        setShowResults(true);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError('Failed to perform search. Please try again.');
          console.error('Search error:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [entityTypes]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim().length >= 2) {
      debouncedSearch(value);
    } else {
      setResults([]);
      setSuggestions([]);
      setShowResults(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    debouncedSearch(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle result selection with proper routing
  const handleResultSelect = (result: GlobalSearchResult) => {

    setSearchTerm(result.code || result.name || '');
    setShowResults(false);

    if (onResultSelect) {
      onResultSelect(result);
    }

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
        // Navigate to person profile page
        if (result.id) {
          navigate(`/person/${result.id}`);
        }
        break;

      case 'church':
        // Navigate to create new niche application (as per your specification)
        navigate('/niche/new');
        break;

      case 'niche':
        // Navigate to create new niche application
        navigate('/niche/new');
        break;

      case 'date':
        // For date entities, navigate to relevant section
        // Could be reports or date-specific search
        console.log('Date selected:', result);
        // Could navigate to reports or date search functionality
        break;

      default:
        console.log('Unknown entity type:', result.entityType);
        break;
    }
  };

  // Handle clear search
  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setSuggestions([]);
    setShowResults(false);
    setError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Get icon for entity type
  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'application': // /niche/view/:id
        return <Hash className="w-4 h-4" />;
      case 'inscription': // /inscriptions/:id/edit
        return <BookOpen className="w-4 h-4" />;
      case 'wake-room': // /wake-room/edit/:id
        return <Bed className="w-4 h-4" />;
      case 'person': // No specific route - could go to person management
        return <User className="w-4 h-4" />;
      case 'church': // /niche/new
        return <Church className="w-4 h-4" />;
      case 'niche': // /niche/new
        return <Home className="w-4 h-4" />;
      case 'date': // No specific route - could go to reports or date search
        return <Calendar className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  // Get status color for results
  const getStatusColor = (status: string | number, isAvailable?: boolean) => {
    if (isAvailable === true) return 'text-green-600';
    if (isAvailable === false) return 'text-red-600';

    const statusStr = String(status).toLowerCase();
    if (statusStr.includes('draft') || statusStr.includes('pending')) return 'text-yellow-600';
    if (statusStr.includes('booked') || statusStr.includes('completed')) return 'text-green-600';
    if (statusStr.includes('deleted') || statusStr.includes('cancelled')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          autoComplete="off"
        />

        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResultsInline && showResults && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {error ? (
            <div className="p-4 text-center text-red-600">
              {error}
            </div>
          ) : results.length > 0 ? (
            <>
              {/* Results List */}
              <div className="max-h-80 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={`${result.entityType}-${result.id}-${index}`}
                    className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleResultSelect(result)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getEntityIcon(result.entityType)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {result.code || result.name || result.applicantName || 'Unknown'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(result.status || result.statusText || '', result.isAvailable)}`}>
                            {result.statusText || result.status || (result.isAvailable ? 'Available' : 'Unavailable')}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {result.entityType}hjhjghgjg
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          {result.applicantName && (
                            <div>
                              <span className="font-medium">Applicant:</span> {result.applicantName}
                              {result.nomineeName && (
                                <span> | <span className="font-medium">Nominee:</span> {result.nomineeName}</span>
                              )}
                              {result.nameOfDeceased && (
                                <span> | <span className="font-medium">Deceased:</span> {result.nameOfDeceased}</span>
                              )}
                            </div>
                          )}

                          {result.inscriptionPhrase && (
                            <div className="text-gray-700 italic">
                              "{result.inscriptionPhrase}"
                            </div>
                          )}

                          {result.chapelName && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {result.chapelName}
                              {result.nicheCode && ` • Niche: ${result.nicheCode}`}
                            </div>
                          )}

                          {result.email && (
                            <div>{result.email} • {result.mobile}</div>
                          )}

                          {result.address && (
                            <div className="truncate">{result.address}</div>
                          )}

                          {result.description && (
                            <div className="truncate text-gray-500">{result.description}</div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${result.relevance === 'Very High' ? 'bg-green-100 text-green-800' :
                              result.relevance === 'High' ? 'bg-blue-100 text-blue-800' :
                                result.relevance === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            Relevance: {result.relevance}
                          </span>

                          {(result.applicationDate || result.transactionDate || result.usingDate) && (
                            <span className="text-xs text-gray-500">
                              {result.applicationDate && new Date(result.applicationDate).toLocaleDateString()}
                              {result.transactionDate && new Date(result.transactionDate).toLocaleDateString()}
                              {result.usingDate && new Date(result.usingDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                Found {results.length} of {searchMetadata.totalMatches} results •
                Search took {searchMetadata.executionTime}ms •
                Method: {searchMetadata.searchMethod || 'N/A'} •
                Search across applications, inscriptions, wake rooms, persons, churches, niches, and dates
              </div>
            </>
          ) : searchTerm.trim().length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              No results found for "{searchTerm}"
            </div>
          ) : null}
        </div>
      )}

      {/* Suggestions (if not showing inline results) */}
      {!showResultsInline && suggestions.length > 0 && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2">Suggestions:</div>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-3 py-2 text-sm hover:bg-gray-100 rounded cursor-pointer"
                onClick={() => handleSuggestionClick(suggestion.text)}
              >
                {suggestion.text}
                <span className="text-xs text-gray-400 ml-2">({suggestion.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export the hook separately to avoid HMR issues
const useGlobalSearchHook = () => {
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Memoize clearResults to prevent recreation on every render
  const clearResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  const performSearch = async (query: string, types: string[] = ['application', 'inscription', 'wake-room', 'person', 'church', 'niche', 'date']) => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await api.get('/api/search/global', {
        params: {
          q: query,
          types: types.join(','),
          page: 1,
          pageSize: 50
        }
      });

      if (response.data.success) {
        setSearchResults(response.data.data || []);
        return response.data.data || [];
      } else {
        throw new Error(response.data.error?.message || 'Search failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Search failed';
      setSearchError(errorMessage);
      setSearchResults([]);
      throw new Error(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const searchAvailableNiches = async (query?: string, chapelId?: number) => {
    try {
      const response = await api.get('/api/niches/available', {
        params: {
          q: query,
          chapelId: chapelId
        }
      });

      if (response.data.success) {
        return response.data.data || [];
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch available niches');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to fetch available niches');
    }
  };

  return {
    searchResults,
    isSearching,
    searchError,
    performSearch,
    searchAvailableNiches,
    clearResults
  };
};

export { useGlobalSearchHook as useGlobalSearch };