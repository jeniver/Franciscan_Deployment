import api from './api';

export interface MailTestRequest {
  to: string;
  subject: string;
  message: string;
}

export interface MailTestResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export class MailTestError extends Error {
  public statusCode: number;
  public isAuthError: boolean;
  public isNetworkError: boolean;

  constructor(message: string, statusCode: number = 500, isAuthError: boolean = false, isNetworkError: boolean = false) {
    super(message);
    this.name = 'MailTestError';
    this.statusCode = statusCode;
    this.isAuthError = isAuthError;
    this.isNetworkError = isNetworkError;
  }
}

export const mailTestService = {
  /**
   * Send a test email
   */
  sendTestEmail: async (request: MailTestRequest): Promise<MailTestResponse> => {
    try {
      // Validate input
      if (!request.to || !request.to.trim()) {
        throw new MailTestError('Recipient email is required', 400);
      }

      if (!request.subject || !request.subject.trim()) {
        throw new MailTestError('Email subject is required', 400);
      }

      if (!request.message || !request.message.trim()) {
        throw new MailTestError('Email message is required', 400);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.to.trim())) {
        throw new MailTestError('Invalid email format', 400);
      }

      // Make API request - token will be automatically added by interceptor
      const response = await api.post<MailTestResponse>('/api/utils/mail-test', {
        to: request.to.trim(),
        subject: request.subject.trim(),
        message: request.message.trim()
      });

      if (!response.data.success) {
        throw new MailTestError(response.data.message || 'Failed to send test email', 400);
      }

      return response.data;
    } catch (error: any) {
      // Handle different types of errors
      if (error instanceof MailTestError) {
        throw error;
      }

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.error || 'Server error';
        
        if (status === 401) {
          throw new MailTestError('Session expired. Please login again.', status, true);
        } else if (status === 403) {
          throw new MailTestError('Access denied. You do not have permission to send test emails.', status, true);
        } else if (status === 400) {
          throw new MailTestError(message, status);
        } else if (status >= 500) {
          throw new MailTestError('Server error. Please try again later.', status);
        } else {
          throw new MailTestError(message, status);
        }
      } else if (error.request) {
        // Network error
        throw new MailTestError('Network error. Please check your internet connection and try again.', 0, false, true);
      } else {
        // Other error
        throw new MailTestError(error.message || 'An unexpected error occurred. Please try again.', 500);
      }
    }
  }
};

export default mailTestService;

