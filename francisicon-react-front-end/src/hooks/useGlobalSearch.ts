import { useState, useCallback } from 'react';
import api from '../services/api';

interface SearchResult {
  id: number | string;
  code?: string;
  name?: string;
  applicantName?: string;
  nomineeName?: string;
  nameOfDeceased?: string;
  inscriptionPhrase?: string;
  entityType: 'application' | 'person' | 'church' | 'niche' | 'date' | 'inscription' | 'wake-room' | 'invoice' | 'gates-of-life';
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
  dateDied?: string;
  dateOfBirth?: string;
  deathCertificateNo?: string;
  customerName?: string;
  totalAmount?: number;
  paymentMode?: string;
  bookingDate?: string;
  // Additional fields from API response
  [key: string]: any;
}

interface SearchResponse {
  success: boolean;
  message: string;
  data: {
    results: SearchResult[];
    pagination: {
      page: number;
      pageSize: number;
      totalResults: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    executionTime: number;
    searchMethod: string;
    performanceMetrics?: {
      method: string;
      breakdown: {
        applications: number;
        persons: number;
        churches: number;
        niches: number;
        dates: number;
        sorting: number;
      };
      totalExecutionTime: number;
    };
  };
}

interface UseGlobalSearchReturn {
  searchResults: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  searchMetadata: {
    executionTime: number;
    searchMethod: string;
    totalResults: number;
    performanceMetrics?: SearchResponse['data']['performanceMetrics'];
  };
  performSearch: (searchTerm: string, entityTypes: string[]) => Promise<void>;
  clearResults: () => void;
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchMetadata, setSearchMetadata] = useState({
    executionTime: 0,
    searchMethod: '',
    totalResults: 0,
    performanceMetrics: undefined as SearchResponse['data']['performanceMetrics'] | undefined
  });

  const performSearch = useCallback(async (searchTerm: string, entityTypes: string[]) => {
    if (!searchTerm.trim()) {
      clearResults();
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await api.get<SearchResponse>('/api/search/global', {
        params: {
          q: searchTerm.trim(),
          types: entityTypes.join(','),
          page: 1,
          pageSize: 50
        }
      });

      if (response.data.success) {
        // Map the API response to our component structure
        const mappedResults = response.data.data.results.map(result => ({
          ...result,
          // Ensure all required fields are present
          entityType: result.entityType || 'application',
          relevance: result.relevance || 'Medium',
          // Map additional fields that might be in the response
          ...(result as any)
        }));

        setSearchResults(mappedResults);
        
        // Update metadata
        setSearchMetadata({
          executionTime: response.data.data.executionTime || 0,
          searchMethod: response.data.data.searchMethod || 'unknown',
          totalResults: response.data.data.pagination?.totalResults || mappedResults.length,
          performanceMetrics: response.data.data.performanceMetrics
        });
      } else {
        setSearchError(response.data.message || 'Search failed');
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error('Search API error:', error);
      setSearchError(error.response?.data?.message || error.message || 'Failed to perform search');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
    setSearchMetadata({
      executionTime: 0,
      searchMethod: '',
      totalResults: 0,
      performanceMetrics: undefined
    });
  }, []);

  return {
    searchResults,
    isSearching,
    searchError,
    searchMetadata,
    performSearch,
    clearResults
  };
}