import api from './api';

// Vite exposes env vars via import.meta.env.VITE_*
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://192.168.1.24:3000';

// Custom error class for wake room operations
export class WakeRoomError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(message: string, type: 'auth' | 'network' | 'server' | 'validation' = 'server', statusCode?: number) {
    super(message);
    this.name = 'WakeRoomError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Types for Wake Room data based on API documentation
export interface WakeRoom {
  wakeRoomId: number;
  code: string;
  name: string;
  remarks?: string | null;
  openingTime: string;
  clossingTime: string;
  rentingAmount: number;
  churchId?: number | null;
}

export interface WakeRoomApplicant {
  name: string;
  idNo?: string | null;
  email?: string | null;
  mobileNo: string;
  homeTelNo?: string | null;
  officeTelNo?: string | null;
  address: string;
  addressDetails?: {
    no: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
  };
}

export interface WakeRoomBookingDetails {
  purpose?: string | null;
  nameOfDeceased: string;
  usingDate: string;
  massTime?: string;
  massTimeStr?: string | null;
  usingTimeFrom: string;
  usingTimeTo: string;
  noOfDays: number;
  remarks?: string | null;
}

export interface WakeRoomFinancial {
  donationAmount: number;
  defaultDonationAmount: number;
}

export interface WakeRoomService {
  serviceby?: string;
  casketCompany?: string;
  hallNo?: string;
  timeOfCremation?: string;
}

export interface WakeRoomBooking {
  wakeRoomBookingId: number;
  wakeRoomId: number;
  code: string;
  applicant: WakeRoomApplicant;
  booking: WakeRoomBookingDetails;
  financial: WakeRoomFinancial;
  service: WakeRoomService;
  status: number;
  refDocType?: string;
  churchId: number;
  userId: number;
  wakeRoom?: WakeRoom;
}

export interface WakeRoomAvailabilityCheck {
  isAvailable: boolean;
  conflicts: any[];
  message: string;
}

export interface DailyAvailability {
  date: string;
  isAvailable: boolean;
  conflictCount: number;
  conflicts: Array<{
    wakeRoomBookingId: number;
    code: string;
    booking: {
      usingTimeFrom: string;
      usingTimeTo: string;
    };
  }>;
}

export interface AvailabilityRangeCheck {
  isAvailable: boolean;
  fromDate: string;
  toDate: string;
  dailyAvailability: DailyAvailability[];
  totalConflicts: number;
  message: string;
}

export interface DateAvailability {
  date: string;
  isAvailable: boolean;
  bookingCount: number;
  bookings: Array<{
    wakeRoomBookingId: number;
    code: string;
    booking: {
      usingTimeFrom: string;
      usingTimeTo: string;
    };
  }>;
}

export interface AvailabilityDatesCheck {
  wakeRoomId: number;
  availability: DateAvailability[];
  totalDates: number;
  availableDates: number;
  bookedDates: number;
}

export interface WakeRoomBookingCreateResponse {
  code: string;
  bookingId: number;
  isDuplicate?: boolean;
  existingCode?: string;
}

export interface WakeRoomBookingSearchResponse {
  bookings: WakeRoomBooking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WakeRoomResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

// Dropdown option interface for wake rooms
export interface WakeRoomDropdownOption {
  value: number;
  label: string;
  code: string;
  rentingAmount: number;
  openingTime: string;
  clossingTime: string;
}

// Wake Room Service
export const wakeRoomService = {
  // Get all wake rooms (no church filter)
  getAllWakeRooms: async (): Promise<WakeRoomResponse<WakeRoom[]>> => {
    try {
      const response = await api.get('/api/wake-rooms/all');

      if (response.data?.success) {
        return response.data;
      } else if (Array.isArray(response.data)) {
        // In case backend returns a bare array without wrapper
        return {
          success: true,
          message: 'All wake rooms retrieved successfully',
          data: response.data,
        };
      } else {
        throw new WakeRoomError(response.data?.message || 'Failed to retrieve wake rooms');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new WakeRoomError('Wake rooms not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Get all wake rooms by church ID
  getWakeRoomsByChurch: async (churchId: number): Promise<WakeRoomResponse<WakeRoom[]>> => {
    try {
      if (!churchId) {
        throw new WakeRoomError('Church ID is required', 'validation');
      }

      const response = await api.get(`/api/wake-rooms/church/${churchId}`);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to retrieve wake rooms');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new WakeRoomError('Wake rooms not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Check wake room availability
  checkAvailability: async (wakeRoomId: number, fromTime: string, toTime: string): Promise<WakeRoomResponse<WakeRoomAvailabilityCheck>> => {
    try {
      if (!wakeRoomId || !fromTime || !toTime) {
        throw new WakeRoomError('Wake Room ID, from time, and to time are required', 'validation');
      }

      const response = await api.post('/api/wake-rooms/check-availability', {
        wakeRoomId,
        fromTime,
        toTime
      });

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to check availability');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Get wake room by ID
  getWakeRoomById: async (id: number): Promise<WakeRoomResponse<WakeRoom>> => {
    try {
      if (!id) {
        throw new WakeRoomError('Wake Room ID is required', 'validation');
      }

      const response = await api.get(`/api/wake-rooms/${id}`);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to retrieve wake room');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new WakeRoomError('Wake room not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Check availability by date range
  checkAvailabilityRange: async (wakeRoomId: number, fromDate: string, toDate: string): Promise<WakeRoomResponse<AvailabilityRangeCheck>> => {
    try {
      if (!wakeRoomId || !fromDate || !toDate) {
        throw new WakeRoomError('Wake Room ID, from date, and to date are required', 'validation');
      }

      const response = await api.post('/api/wake-rooms/check-availability-range', {
        wakeRoomId,
        fromDate,
        toDate
      });

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to check availability range');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 400) {
        throw new WakeRoomError(error.response.data?.error?.message || 'Validation failed', 'validation', 400);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Check availability for multiple dates (calendar view)
  checkAvailabilityDates: async (wakeRoomId: number, dates: string[]): Promise<WakeRoomResponse<AvailabilityDatesCheck>> => {
    try {
      if (!wakeRoomId || !dates || dates.length === 0) {
        throw new WakeRoomError('Wake Room ID and dates array are required', 'validation');
      }

      const response = await api.post('/api/wake-rooms/check-availability-dates', {
        wakeRoomId,
        dates
      });

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to check availability for dates');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 400) {
        throw new WakeRoomError(error.response.data?.error?.message || 'Validation failed', 'validation', 400);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Create new wake room booking
  createBooking: async (bookingData: any): Promise<WakeRoomResponse<WakeRoomBookingCreateResponse>> => {
    try {
      const response = await api.post('/api/wake-room-bookings', bookingData);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to create booking');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 400) {
        throw new WakeRoomError('Validation failed. Please check your input.', 'validation', 400);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Get wake room booking by code
  getBookingByCode: async (code: string, churchId: number): Promise<WakeRoomResponse<WakeRoomBooking>> => {
    try {
      if (!code || !code.trim()) {
        throw new WakeRoomError('Booking code is required', 'validation');
      }

      const response = await api.get(`/api/wake-room-bookings/${code.trim()}?churchId=${churchId}`);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to retrieve wake room booking');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new WakeRoomError('Wake room booking not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Search wake room bookings
  searchBookings: async (searchCriteria: any): Promise<WakeRoomResponse<WakeRoomBookingSearchResponse | WakeRoomBooking[]>> => {
    try {
      const response = await api.post('/api/wake-room-bookings/search', searchCriteria);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to search bookings');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Update wake room booking
  updateBooking: async (bookingId: number, bookingData: any): Promise<WakeRoomResponse<WakeRoomBookingCreateResponse>> => {
    try {
      const response = await api.put(`/api/wake-room-bookings/${bookingId}`, bookingData);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to update booking');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 400) {
        throw new WakeRoomError('Validation failed. Please check your input.', 'validation', 400);
      } else if (error.response?.status === 404) {
        throw new WakeRoomError('Booking not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Delete wake room booking
  deleteBooking: async (bookingId: number): Promise<WakeRoomResponse<null>> => {
    try {
      const response = await api.delete(`/api/wake-room-bookings/${bookingId}`);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to delete booking');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new WakeRoomError('Booking not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Get bookings for a specific date
  getBookingsForDate: async (wakeRoomId: number, date: string): Promise<WakeRoomResponse<WakeRoomBooking[]>> => {
    try {
      // Format date as YYYY-MM-DD
      const dateStr = date.includes('T') ? date.split('T')[0] : date;
      const response = await api.get(`/api/wake-rooms/${wakeRoomId}/bookings?date=${dateStr}`);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to retrieve bookings for date');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new WakeRoomError('Bookings not found for the specified date', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Get bookings by date range
  getBookingsByDateRange: async (wakeRoomId: number, fromDate: string, toDate: string): Promise<WakeRoomResponse<WakeRoomBooking[]>> => {
    try {
      // Format dates as YYYY-MM-DD
      const fromDateStr = fromDate.includes('T') ? fromDate.split('T')[0] : fromDate;
      const toDateStr = toDate.includes('T') ? toDate.split('T')[0] : toDate;
      const response = await api.get(`/api/wake-rooms/${wakeRoomId}/bookings-range?fromDate=${fromDateStr}&toDate=${toDateStr}`);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to retrieve bookings for date range');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 400) {
        throw new WakeRoomError(error.response.data?.error?.message || 'Invalid date range', 'validation', 400);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Get last booking number for a church
  getLastBookingNumber: async (churchId: number): Promise<WakeRoomResponse<{ lastNumber: string }>> => {
    try {
      if (!churchId) {
        throw new WakeRoomError('Church ID is required', 'validation');
      }

      const response = await api.get(`/api/wake-room-bookings/last-number/${churchId}`);

      if (response.data.success) {
        return response.data;
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to retrieve last booking number');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new WakeRoomError('No bookings found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  },

  // Generate PDF for wake room booking
  generateWakeRoomPDF: async (bookingCode: string, type: 'booking' | 'invoice' | 'receipt' = 'booking'): Promise<void> => {
    try {
      if (!bookingCode || !bookingCode.trim()) {
        throw new WakeRoomError('Booking code is required for PDF generation', 'validation');
      }

      // Determine the correct endpoint based on type
      let endpoint = '';
      switch (type) {
        case 'booking':
          endpoint = `/api/wake-room-bookings/${bookingCode.trim()}/pdf`;
          break;
        case 'invoice':
          endpoint = `/api/wake-room-bookings/${bookingCode.trim()}/invoice-pdf`;
          break;
        case 'receipt':
          endpoint = `/api/wake-room-bookings/${bookingCode.trim()}/receipt-pdf`;
          break;
        default:
          endpoint = `/api/wake-room-bookings/${bookingCode.trim()}/pdf`;
      }

      // Open PDF in new tab
      const pdfUrl = `${API_BASE}${endpoint}`;
      const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');

      if (!newWindow) {
        throw new WakeRoomError('Popup blocked. Please allow popups for this site.');
      }

      console.log(`Opening ${type} PDF in new tab:`, pdfUrl);
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.data?.message) {
        throw new WakeRoomError(error.response.data.message);
      } else {
        throw new WakeRoomError('Failed to generate PDF');
      }
    }
  },

  // Generate PDF from form data (actual PDF generation, not template)
  generatePDFFromData: async (formData: any, type: 'booking' | 'invoice' | 'receipt' = 'booking'): Promise<void> => {
    try {
      // This would integrate with a PDF generation library like jsPDF or html2pdf.js
      // For now, we'll just log the data that would be used for PDF generation
      console.log(`Generating ${type} PDF from form data:`, formData);

      // In a real implementation, you would:
      // 1. Create a PDF template
      // 2. Fill it with the form data
      // 3. Generate and download the PDF

      // Example using html2pdf.js (would need to install the package):
      // const element = document.getElementById('pdf-content');
      // const opt = {
      //   margin: 1,
      //   filename: `${formData.bookingNumber || 'wake-room-booking'}_${type}.pdf`,
      //   image: { type: 'jpeg', quality: 0.98 },
      //   html2canvas: { scale: 2 },
      //   jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      // };
      // html2pdf().set(opt).from(element).save();

      alert(`PDF generation for ${type} would be implemented here`);
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      } else {
        throw new WakeRoomError('Failed to generate PDF from form data');
      }
    }
  },

  // Get wake rooms dropdown options for a church
  getWakeRoomsDropdown: async (churchId: number): Promise<WakeRoomResponse<WakeRoomDropdownOption[]>> => {
    try {
      if (!churchId) {
        throw new WakeRoomError('Church ID is required', 'validation');
      }

      const response = await api.get(`/api/wake-rooms/dropdown`, {
        params: { church: churchId }
      });

      if (response.data.success || Array.isArray(response.data)) {
        // Handle both { success: true, data: [...] } and direct array responses
        const data = response.data.success ? response.data.data : response.data;
        return {
          success: true,
          message: 'Wake rooms dropdown retrieved successfully',
          data: Array.isArray(data) ? data : []
        };
      } else {
        throw new WakeRoomError(response.data.message || 'Failed to retrieve wake rooms dropdown');
      }
    } catch (error: any) {
      if (error instanceof WakeRoomError) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new WakeRoomError('Authentication required', 'auth', 401);
      } else if (error.response?.status === 404) {
        throw new WakeRoomError('Wake rooms not found', 'validation', 404);
      } else if (error.response?.status >= 500) {
        throw new WakeRoomError('Server error occurred', 'server', error.response.status);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new WakeRoomError('Network error. Please check your connection.', 'network');
      } else {
        throw new WakeRoomError('An unexpected error occurred. Please try again.', 'server');
      }
    }
  }
};

export default wakeRoomService;