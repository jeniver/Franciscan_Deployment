import api from './api';

// Custom error class for confirm booking operations
export class ConfirmBookingError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(message: string, type: 'auth' | 'network' | 'server' | 'validation' = 'server', statusCode?: number) {
    super(message);
    this.name = 'ConfirmBookingError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Confirm Booking Service
export const confirmBookingService = {
  /**
   * Confirm booking and change application status from Draft to Booked
   * POST /api/niche-applications/:code/confirm-booking
   * 
   * @param applicationCode - The application code (e.g., "NAPP-52")
   * @returns Success response with updated status information
   */
  confirmBooking: async (applicationCode: string) => {
    try {
      if (!applicationCode?.trim()) {
        throw new ConfirmBookingError('Application code is required', 'validation');
      }

      const response = await api.post(`/api/niche-applications/${applicationCode.trim()}/confirm-booking`);
      
      if (response.data?.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Booking confirmed successfully'
        };
      } else {
        throw new ConfirmBookingError(
          response.data?.error?.message || 'Failed to confirm booking',
          'server',
          response.status
        );
      }
    } catch (error: any) {
      console.error('ConfirmBookingService Error:', error);
      
      // Handle different error types
      if (error.response?.status === 401) {
        throw new ConfirmBookingError(
          error.response?.data?.message || 'Authentication required',
          'auth',
          401
        );
      } else if (error.response?.status === 404) {
        throw new ConfirmBookingError(
          error.response?.data?.message || 'Application not found',
          'validation',
          404
        );
      } else if (error.response?.status === 400) {
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'INVALID_STATUS') {
          throw new ConfirmBookingError(
            error.response?.data?.message || 'Cannot confirm booking for this application status',
            'validation',
            400
          );
        } else if (errorCode === 'ALREADY_BOOKED') {
          throw new ConfirmBookingError(
            error.response?.data?.message || 'Application is already booked',
            'validation',
            400
          );
        }
        throw new ConfirmBookingError(
          error.response?.data?.message || 'Validation failed',
          'validation',
          400
        );
      } else if (error.response?.status === 403) {
        throw new ConfirmBookingError(
          error.response?.data?.message || 'Access denied',
          'auth',
          403
        );
      } else if (error.response?.status === 409) {
        throw new ConfirmBookingError(
          error.response?.data?.message || 'Application cannot be modified (already Booked/Completed)',
          'validation',
          409
        );
      } else if (error.response?.status >= 500) {
        throw new ConfirmBookingError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new ConfirmBookingError('Network error - please check your connection', 'network');
      } else {
        throw new ConfirmBookingError(error.response?.data?.message || 'Failed to confirm booking');
      }
    }
  }
};