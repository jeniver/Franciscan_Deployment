import axios, { AxiosRequestConfig } from 'axios';
import authService from './authService';

// Extend AxiosRequestConfig to include metadata for logging
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}

// Create axios instance with default config
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE || 'http://192.168.1.24:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable credentials to be sent with requests
  withCredentials: false,
});

// Request interceptor to add auth token and logging
api.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for logging
    config.metadata = { startTime: new Date() };
    
    // Handle cache bypass
    if (config.params?.bypassCache) {
      config.headers['X-Bypass-Cache'] = 'true';
      // Remove bypassCache from params to avoid sending it to backend
      delete config.params.bypassCache;
    }
    
    // Log request details
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      timeout: config.timeout,
      baseURL: config.baseURL,
      bypassCache: config.headers['X-Bypass-Cache'] === 'true'
    });
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and logging
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = response.config.metadata?.startTime 
      ? new Date().getTime() - response.config.metadata.startTime.getTime()
      : 0;
    
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      duration: `${duration}ms`,
      dataSize: JSON.stringify(response.data).length
    });
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Calculate request duration
    const duration = originalRequest?.metadata?.startTime 
      ? new Date().getTime() - originalRequest.metadata.startTime.getTime()
      : 0;
    
    // Log error details
    console.error(`[API Error] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      code: error.code,
      message: error.message,
      duration: `${duration}ms`,
      timeout: originalRequest?.timeout,
      isTimeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
      responseData: error.response?.data
    });

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        await authService.refreshAccessToken();
        
        // Retry the original request with new token
        const newToken = authService.getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        authService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
