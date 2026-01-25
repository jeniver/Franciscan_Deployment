import api from './api';

// Vite exposes env vars via import.meta.env.VITE_*
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';

// Custom error class for niche operations
export class NicheError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(message: string, type: 'auth' | 'network' | 'server' | 'validation' = 'server', statusCode?: number) {
    super(message);
    this.name = 'NicheError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Types for Niche data based on API response
export interface Niche {
  nicheId: number;
  nicheRowId: number;
  code: string;
  defaultAmount: number;
  appearanceDescription: string;
  status: number;
  statusText: string;
  statusColor: string;
  isAvailable: boolean;
  churchId: number;
}

export interface Row {
  rowId: number;
  rowCode: string;
  level: number;
  nicheCount: number;
  niches: Niche[];
}

export interface Wall {
  wallId: number[];
  wallCode: string;
  wallName: string;
  rowCount: number;
  nicheCount: number;
  rows: Row[];
}

export interface Chapel {
  chapelId: number;
  chapelCode: string;
  chapelName: string;
  churchId: number;
  description: string;
}

export interface NicheStatistics {
  totalWalls: number;
  totalNiches: number;
  vacant: number;
  booked: number;
  occupied: number;
  reserved: number;
  occupancyRate: string;
  availabilityRate: string;
}

export interface NicheResponse {
  success: boolean;
  data: {
    chapel: Chapel;
    walls: Wall[];
    statistics?: NicheStatistics;
  };
}

// Cache for niche data to prevent excessive API calls
const nicheCache = new Map<string, { data: NicheResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const REQUEST_DEBOUNCE_TIME = 1000; // 1 second debounce
const REQUEST_TIMEOUT = 30000; // 30 second timeout

// Debounce function to prevent rapid successive calls
let debounceTimer: NodeJS.Timeout | null = null;

// Track active requests to prevent duplicates
const activeRequests = new Set<string>();

// Niche Service
export const nicheService = {
  // Get niches by chapel ID with caching and debouncing
  getNichesByChapel: async (chapelId: number, churchId: number = 1): Promise<NicheResponse> => {
    try {
      if (!chapelId) {
        throw new NicheError('Chapel ID is required', 'validation');
      }

      // Create cache key
      const cacheKey = `${chapelId}-${churchId}`;
      
      // Check cache first
      const cached = nicheCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`Using cached niche data for chapel ${chapelId}`);
        return cached.data;
      }

      // Check if request is already in progress
      if (activeRequests.has(cacheKey)) {
        console.log(`Request already in progress for chapel ${chapelId}, waiting...`);
        // Wait for the existing request to complete
        return new Promise((resolve, reject) => {
          const checkInterval = setInterval(() => {
            const cached = nicheCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
              clearInterval(checkInterval);
              resolve(cached.data);
            } else if (!activeRequests.has(cacheKey)) {
              clearInterval(checkInterval);
              reject(new NicheError('Request failed', 'network'));
            }
          }, 100);
        });
      }

      // Mark request as active
      activeRequests.add(cacheKey);

      // Clear any existing debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Debounce the request
      return new Promise((resolve, reject) => {
        debounceTimer = setTimeout(async () => {
          try {
            console.log(`Fetching niche data for chapel ${chapelId} from API`);
            
            // Create a timeout promise
            const timeoutPromise = new Promise((_, timeoutReject) => {
              setTimeout(() => timeoutReject(new Error('Request timeout')), REQUEST_TIMEOUT);
            });
            
            // Race between API call and timeout
            const response = await Promise.race([
              api.get(`/api/niches/chapel/${chapelId}/niches?churchId=${churchId}`),
              timeoutPromise
            ]);
            
            if (response.data.success) {
              // Cache the response
              nicheCache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
              });
              
              // Clean up old cache entries
              nicheCache.forEach((value, key) => {
                if ((Date.now() - value.timestamp) > CACHE_DURATION) {
                  nicheCache.delete(key);
                }
              });
              
              resolve(response.data);
            } else {
              reject(new NicheError(response.data.message || 'Failed to retrieve niches'));
            }
          } catch (error: any) {
            reject(error);
          } finally {
            // Remove from active requests
            activeRequests.delete(cacheKey);
          }
        }, REQUEST_DEBOUNCE_TIME);
      });

    } catch (error: any) {
      if (error instanceof NicheError) {
        throw error;
      }
      
      if (error.response?.status === 401) {
        throw new NicheError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new NicheError('Niches not found', 'validation', 404);
      } else if (error.response?.status === 429) {
        throw new NicheError('Too many requests. Please wait a moment and try again.', 'validation', 429);
      } else if (error.response?.status >= 500) {
        throw new NicheError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new NicheError('Network error. Please check your connection.', 'network');
      } else {
        throw new NicheError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Get niche by ID
  getNicheById: async (nicheId: number): Promise<Niche> => {
    try {
      if (!nicheId) {
        throw new NicheError('Niche ID is required', 'validation');
      }

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
      });
      
      // Race between API call and timeout
      const response = await Promise.race([
        api.get(`/api/niches/${nicheId}`),
        timeoutPromise
      ]);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new NicheError(response.data.message || 'Failed to retrieve niche');
      }
    } catch (error: any) {
      if (error instanceof NicheError) {
        throw error;
      }
      
      if (error.message === 'Request timeout') {
        throw new NicheError('Request timed out. Please try again.', 'network');
      } else if (error.response?.status === 401) {
        throw new NicheError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new NicheError('Niche not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new NicheError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new NicheError('Network error. Please check your connection.', 'network');
      } else {
        throw new NicheError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Clear cache function
  clearCache: () => {
    nicheCache.clear();
    activeRequests.clear();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    console.log('Niche cache cleared and active requests cleared');
  },

  // Get cache info for debugging
  getCacheInfo: () => {
    return {
      size: nicheCache.size,
      keys: Array.from(nicheCache.keys()),
      entries: Array.from(nicheCache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    };
  }
};

export default nicheService;
