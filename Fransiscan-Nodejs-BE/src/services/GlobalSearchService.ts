import axios from 'axios';

// Define TypeScript interfaces matching the backend response
export interface SearchResult {
  id: number | string;
  code?: string;
  applicantName?: string;
  nomineeName?: string;
  name?: string;
  deceasedName?: string;
  customerName?: string;
  applicationDate?: string | Date;
  transactionDate?: string | Date;
  bookingDate?: string | Date;
  usingDate?: string | Date;
  dateDied?: string | Date;
  dateOfBirth?: string | Date;
  deathCertificateNo?: string;
  status?: number | string;
  nicheCode?: string;
  rowCode?: string;
  wallName?: string;
  chapelName?: string;
  churchName?: string;
  deceasedNames?: string;
  deceasedDetails?: Array<{
    Name: string;
    DateDied: string;
    DateOfBirth: string;
    DeathCertificateNo: string;
    InternmentDate: string;
  }>;
  amount?: number;
  totalAmount?: number;
  defaultAmount?: number;
  email?: string;
  mobile?: string;
  idNo?: string;
  description?: string;
  notes?: string;
  refDocNumber?: string;
  refDocName?: string;
  paymentMode?: string;
  inscriptionPhrase?: string;
  nameOfDeceased?: string;
  usingTimeFrom?: string;
  usingTimeTo?: string;
  isAvailable?: boolean;
  statusText?: string;
  location?: {
    nicheId: number;
    rowId: number;
    wallId: number;
    chapelId: number;
  };
  entityType: string;
  relevance: string;
  [key: string]: any; // Allow additional properties
}

export interface SearchResponse {
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
    searchMethod: string; // meilisearch or mssql
    performanceMetrics?: {
      method: string;
      breakdown?: any;
      totalExecutionTime: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface AutocompleteSuggestion {
  text: string;
  type: string;
}

export interface AutocompleteResponse {
  success: boolean;
  data: AutocompleteSuggestion[];
  query: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface SearchParams {
  q: string;
  types?: string[];
  page?: number;
  pageSize?: number;
  includeAvailability?: boolean;
}

export interface AvailableNichesResponse {
  success: boolean;
  data: Array<{
    id: number;
    code: string;
    amount: number;
    status: number;
    rowCode: string;
    wallName: string;
    chapelName: string;
    description: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

class GlobalSearchService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
  }

  /**
   * Perform global search across all entity types
   */
  async globalSearch(params: SearchParams): Promise<SearchResponse> {
    try {
      const searchParams: Record<string, any> = {
        q: params.q,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        includeAvailability: params.includeAvailability !== undefined ? params.includeAvailability : true,
      };

      if (params.types && params.types.length > 0) {
        searchParams.types = params.types.join(',');
      }

      const response = await axios.get<SearchResponse>(`${this.baseUrl}/search/global`, {
        params: searchParams,
        withCredentials: true, // Include cookies for authentication
      });

      // Transform the response to match the expected format
      const transformedResponse: SearchResponse = {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
        error: response.data.error
      };

      return transformedResponse;
    } catch (error: any) {
      // Handle network errors or other issues
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          message: 'Search failed',
          data: {
            results: [],
            pagination: {
              page: params.page || 1,
              pageSize: params.pageSize || 20,
              totalResults: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false
            },
            executionTime: 0,
            searchMethod: 'unknown'
          },
          error: {
            code: 'API_ERROR',
            message: error.response.data?.error?.message || error.response.statusText || 'API request failed'
          }
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          message: 'Network error',
          data: {
            results: [],
            pagination: {
              page: params.page || 1,
              pageSize: params.pageSize || 20,
              totalResults: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false
            },
            executionTime: 0,
            searchMethod: 'unknown'
          },
          error: {
            code: 'NETWORK_ERROR',
            message: 'Network error, please check your connection'
          }
        };
      } else {
        // Other errors
        return {
          success: false,
          message: 'Unknown error',
          data: {
            results: [],
            pagination: {
              page: params.page || 1,
              pageSize: params.pageSize || 20,
              totalResults: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false
            },
            executionTime: 0,
            searchMethod: 'unknown'
          },
          error: {
            code: 'UNKNOWN_ERROR',
            message: error.message || 'An unknown error occurred'
          }
        };
      }
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(query: string): Promise<AutocompleteResponse> {
    try {
      if (query.length < 2) {
        return {
          success: true,
          data: [],
          query: query
        };
      }

      const response = await axios.get<AutocompleteResponse>(`${this.baseUrl}/search/autocomplete`, {
        params: { q: query },
        withCredentials: true, // Include cookies for authentication
      });

      return response.data;
    } catch (error: any) {
      // Handle network errors or other issues
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          data: [],
          query: query,
          error: {
            code: 'API_ERROR',
            message: error.response.data?.error?.message || error.response.statusText || 'Autocomplete API request failed'
          }
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          data: [],
          query: query,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Network error, please check your connection'
          }
        };
      } else {
        // Other errors
        return {
          success: false,
          data: [],
          query: query,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error.message || 'An unknown error occurred during autocomplete'
          }
        };
      }
    }
  }

  /**
   * Search for available niches
   */
  async searchAvailableNiches(params: { q?: string; chapelId?: number; status?: string }): Promise<AvailableNichesResponse> {
    try {
      const response = await axios.get<AvailableNichesResponse>(`${this.baseUrl}/search/niches/available`, {
        params: params,
        withCredentials: true, // Include cookies for authentication
      });

      return response.data;
    } catch (error: any) {
      // Handle network errors or other issues
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          data: [],
          error: {
            code: 'API_ERROR',
            message: error.response.data?.error?.message || error.response.statusText || 'Available niches API request failed'
          }
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          data: [],
          error: {
            code: 'NETWORK_ERROR',
            message: 'Network error, please check your connection'
          }
        };
      } else {
        // Other errors
        return {
          success: false,
          data: [],
          error: {
            code: 'UNKNOWN_ERROR',
            message: error.message || 'An unknown error occurred during available niches search'
          }
        };
      }
    }
  }
}

export default new GlobalSearchService();