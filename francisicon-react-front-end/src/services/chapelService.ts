import api from './api';

// Vite exposes env vars via import.meta.env.VITE_*
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://192.168.1.24:3000';

// Custom error class for chapel operations
export class ChapelError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(message: string, type: 'auth' | 'network' | 'server' | 'validation' = 'server', statusCode?: number) {
    super(message);
    this.name = 'ChapelError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Types for Chapel data
export interface Chapel {
  chapelId: number;
  churchId: number;
  code: string;
  name: string;
  description: string;
}

export interface ChapelResponse {
  success: boolean;
  data: {
    churchId: number;
    count: number;
    chapels: Chapel[];
  };
}

// Cache for chapel data to prevent excessive API calls
const chapelCache = new Map<string, { data: ChapelResponse; timestamp: number }>();
const CHAPEL_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache (longer than niche cache since chapels change less frequently)
const CHAPEL_REQUEST_DEBOUNCE_TIME = 500; // 500ms debounce (shorter than niche since chapel data is smaller)

// Debounce function to prevent rapid successive calls
let chapelDebounceTimer: NodeJS.Timeout | null = null;

// Chapel Service
export const chapelService = {
  // Get chapels by church ID with caching and debouncing
  getChapelsByChurch: async (churchId: number = 1): Promise<ChapelResponse> => {
    try {
      if (!churchId) {
        throw new ChapelError('Church ID is required', 'validation');
      }

      // Create cache key
      const cacheKey = `chapels-${churchId}`;
      
      // Check cache first
      const cached = chapelCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CHAPEL_CACHE_DURATION) {
        console.log(`Using cached chapel data for church ${churchId}`);
        return cached.data;
      }

      // Clear any existing debounce timer
      if (chapelDebounceTimer) {
        clearTimeout(chapelDebounceTimer);
      }

      // Debounce the request
      return new Promise((resolve, reject) => {
        chapelDebounceTimer = setTimeout(async () => {
          try {
            console.log(`Fetching chapel data for church ${churchId} from API`);
            const response = await api.get(`/api/niches/chapels/${churchId}`);
            
            if (response.data.success) {
              // Cache the response
              chapelCache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
              });
              
              // Clean up old cache entries
              chapelCache.forEach((value, key) => {
                if ((Date.now() - value.timestamp) > CHAPEL_CACHE_DURATION) {
                  chapelCache.delete(key);
                }
              });
              
              resolve(response.data);
            } else {
              reject(new ChapelError(response.data.message || 'Failed to retrieve chapels'));
            }
          } catch (error: any) {
            reject(error);
          }
        }, CHAPEL_REQUEST_DEBOUNCE_TIME);
      });

    } catch (error: any) {
      if (error instanceof ChapelError) {
        throw error;
      }
      
      if (error.response?.status === 401) {
        throw new ChapelError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new ChapelError('Chapels not found', 'validation', 404);
      } else if (error.response?.status === 429) {
        throw new ChapelError('Too many requests. Please wait a moment and try again.', 'validation', 429);
      } else if (error.response?.status >= 500) {
        throw new ChapelError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new ChapelError('Network error. Please check your connection.', 'network');
      } else {
        throw new ChapelError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Get chapel by ID
  getChapelById: async (chapelId: number): Promise<Chapel> => {
    try {
      if (!chapelId) {
        throw new ChapelError('Chapel ID is required', 'validation');
      }

      const response = await api.get(`/api/niches/chapels/${chapelId}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new ChapelError(response.data.message || 'Failed to retrieve chapel');
      }
    } catch (error: any) {
      if (error instanceof ChapelError) {
        throw error;
      }
      
      if (error.response?.status === 401) {
        throw new ChapelError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new ChapelError('Chapel not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new ChapelError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new ChapelError('Network error. Please check your connection.', 'network');
      } else {
        throw new ChapelError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Clear cache function
  clearCache: () => {
    chapelCache.clear();
    console.log('Chapel cache cleared');
  },

  // Get cache info for debugging
  getCacheInfo: () => {
    return {
      size: chapelCache.size,
      keys: Array.from(chapelCache.keys()),
      entries: Array.from(chapelCache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    };
  }
};

export default chapelService;
