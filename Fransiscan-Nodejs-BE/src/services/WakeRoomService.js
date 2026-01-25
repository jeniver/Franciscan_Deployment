const WakeRoomRepository = require('../repositories/WakeRoomRepository');
const logger = require('../utils/logger');

/**
 * WakeRoomService - Business logic for Wake Room operations
 * Based on ASP.NET WakeRoomBL.cs
 */
class WakeRoomService {
  constructor() {
    this.wakeRoomRepository = new WakeRoomRepository();
  }

  /**
   * Get all wake rooms across all churches
   * New helper for cross-church analysis
   * @returns {Promise<Array>} List of wake rooms
   */
  async getAllWakeRooms() {
    try {
      logger.info('Getting all wake rooms across all churches');

      const wakeRooms = await this.wakeRoomRepository.getAllWakeRooms();

      logger.info(`Retrieved ${wakeRooms.length} wake room(s) across all churches`);
      return wakeRooms.map(wr => wr.toJSON());
    } catch (error) {
      logger.error('Error in getAllWakeRooms:', error);
      throw error;
    }
  }

  /**
   * Get all wake rooms for a church
   * Based on: GetWakeRooms(int _ChurchId)
   * @param {number} churchId - Church ID
   * @returns {Promise<Array>} List of wake rooms
   */
  async getWakeRoomsByChurch(churchId) {
    try {
      logger.info(`Getting wake rooms for church: ${churchId}`);

      if (!churchId) {
        throw new Error('Church ID is required');
      }

      const wakeRooms = await this.wakeRoomRepository.getWakeRoomsByChurch(churchId);

      logger.info(`Retrieved ${wakeRooms.length} wake room(s)`);
      return wakeRooms.map(wr => wr.toJSON());
    } catch (error) {
      logger.error('Error in getWakeRoomsByChurch:', error);
      throw error;
    }
  }

  /**
   * Get wake rooms formatted for dropdowns
   * Mirrors ASP.NET LoadWakeRooms WebMethod
   * @param {number} churchId - Church ID
   * @returns {Promise<Array>} Options for dropdown (value/label/rentingAmount)
   */
  async getWakeRoomOptions(churchId) {
    try {
      const rooms = await this.getWakeRoomsByChurch(churchId);

      return rooms.map(room => ({
        value: room.wakeRoomId,
        label: room.name,
        code: room.code,
        rentingAmount: room.rentingAmount,
        openingTime: room.openingTime,
        clossingTime: room.clossingTime
      }));
    } catch (error) {
      logger.error('Error in getWakeRoomOptions:', error);
      throw error;
    }
  }

  /**
   * Get wake room by ID
   * @param {number} wakeRoomId - Wake Room ID
   * @returns {Promise<Object>} Wake room details
   */
  async getWakeRoomById(wakeRoomId) {
    try {
      logger.info(`Getting wake room by ID: ${wakeRoomId}`);

      if (!wakeRoomId) {
        throw new Error('Wake Room ID is required');
      }

      const wakeRoom = await this.wakeRoomRepository.getWakeRoomById(wakeRoomId);

      if (!wakeRoom) {
        throw new Error(`Wake room not found: ${wakeRoomId}`);
      }

      return wakeRoom.toJSON();
    } catch (error) {
      logger.error('Error in getWakeRoomById:', error);
      throw error;
    }
  }

  /**
   * Get wake room booking by code
   * Based on: GetWakeRoomBooking(string _WakeRoomBookingCode)
   * @param {string} bookingCode - Booking code
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Booking details
   */
  async getWakeRoomBooking(bookingCode, churchId) {
    try {
      logger.info(`Getting wake room booking: ${bookingCode}`);

      if (!bookingCode) {
        throw new Error('Booking code is required');
      }

      if (!churchId) {
        throw new Error('Church ID is required');
      }

      const booking = await this.wakeRoomRepository.getWakeRoomBookingByCode(bookingCode, churchId);

      if (!booking) {
        throw new Error(`Wake room booking not found: ${bookingCode}`);
      }

      return booking.toJSON();
    } catch (error) {
      logger.error('Error in getWakeRoomBooking:', error);
      throw error;
    }
  }

  /**
   * Search wake room bookings
   * Based on: SearchWakeBookings(Entity.WakeBookingSearchParams)
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} List of bookings
   */
  async searchWakeBookings(searchParams) {
    try {
      logger.info('Searching wake room bookings', searchParams);

      if (!searchParams.churchId) {
        throw new Error('Church ID is required');
      }

      // Check if at least one search parameter is provided (excluding churchId)
      const hasSearchCriteria = searchParams.code ||
                                searchParams.applicantName ||
                                searchParams.nameOfDeceased ||
                                searchParams.usingDate ||
                                searchParams.wakeRoomId;

      // If no search criteria, return empty array instead of error (matches ASP.NET behavior)
      if (!hasSearchCriteria) {
        logger.info('No search criteria provided, returning empty results');
        return [];
      }

      const bookings = await this.wakeRoomRepository.searchWakeBookings(searchParams);

      logger.info(`Found ${bookings.length} booking(s)`);
      return bookings.map(b => b.toJSON());
    } catch (error) {
      logger.error('Error in searchWakeBookings:', error);
      throw error;
    }
  }

  /**
   * Save wake room booking (Create or Update)
   * Based on: SaveWakeRoomBooking(Entity.WakeRoomBooking)
   * @param {Object} bookingData - Booking data
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Result with booking code
   */
  async saveWakeRoomBooking(bookingData, userId) {
    try {
      logger.info(`Saving wake room booking: ${bookingData.code || 'new'}`);

      // Set user ID
      bookingData.userId = userId;

      // Helper function to parse dates flexibly
      const parseDate = (value) => {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          // Date-only format (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return new Date(trimmed + 'T00:00:00.000Z');
          }
          // ISO-like without timezone (YYYY-MM-DDTHH:MM)
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
            let normalized = trimmed;
            if (!normalized.includes(':', 11)) normalized = normalized + ':00';
            if (normalized.split(':').length === 3 && !normalized.includes('.')) {
              normalized = normalized + '.000';
            }
            let date = new Date(normalized + 'Z');
            if (Number.isNaN(date.getTime())) date = new Date(normalized);
            return Number.isNaN(date.getTime()) ? null : date;
          }
          return new Date(trimmed);
        }
        return null;
      };

      // Parse and normalize dates
      const usingTimeFromDate = parseDate(bookingData.usingTimeFrom);
      const usingTimeToDate = parseDate(bookingData.usingTimeTo);
      
      // Ensure usingDate is set from usingTimeFrom if not provided
      if (!bookingData.usingDate && usingTimeFromDate) {
        const usingDateObj = new Date(usingTimeFromDate);
        usingDateObj.setHours(0, 0, 0, 0);
        bookingData.usingDate = usingDateObj.toISOString();
      } else if (bookingData.usingDate) {
        // Normalize usingDate to ensure it's a proper date string
        const usingDateObj = parseDate(bookingData.usingDate);
        if (usingDateObj) {
          usingDateObj.setHours(0, 0, 0, 0);
          bookingData.usingDate = usingDateObj.toISOString();
        }
      }

      // Handle massTime - if it's time-only (HH:MM), combine with usingDate
      if (bookingData.massTime && /^\d{1,2}:\d{2}(:\d{2})?$/.test(bookingData.massTime.trim())) {
        const usingDateObj = parseDate(bookingData.usingDate || bookingData.usingTimeFrom);
        if (usingDateObj) {
          const [hours, minutes, seconds = '0'] = bookingData.massTime.trim().split(':');
          const massTimeDate = new Date(usingDateObj);
          massTimeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds, 10), 0);
          bookingData.massTime = massTimeDate.toISOString();
        }
      } else if (bookingData.massTime) {
        // Try to parse as full date
        const massTimeDate = parseDate(bookingData.massTime);
        if (massTimeDate) {
          bookingData.massTime = massTimeDate.toISOString();
        }
      }

      // Normalize usingTimeFrom and usingTimeTo to ISO format
      if (usingTimeFromDate && !Number.isNaN(usingTimeFromDate.getTime())) {
        bookingData.usingTimeFrom = usingTimeFromDate.toISOString();
      }
      if (usingTimeToDate && !Number.isNaN(usingTimeToDate.getTime())) {
        bookingData.usingTimeTo = usingTimeToDate.toISOString();
      }

      const WakeRoomBooking = require('../models/WakeRoomBooking');
      const booking = new WakeRoomBooking(bookingData);

      // Validate booking data
      const validation = booking.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if this is a new booking or update
      const isNew = !booking.wakeRoomBookingId || booking.wakeRoomBookingId === 0;

      if (isNew) {
        // Check for duplicate booking
        const duplicate = await this.wakeRoomRepository.getDuplicateBooking(
          booking.nameOfDeceased,
          booking.usingTimeFrom,
          booking.applicantName,
          booking.churchId
        );

        if (duplicate) {
          return {
            success: false,
            isDuplicate: true,
            code: duplicate.code,
            message: `Duplicate booking found: ${duplicate.code}`
          };
        }

        // Generate booking code
        const code = await this.generateBookingCode(booking);
        booking.code = code;

        // Add new booking
        const bookingId = await this.wakeRoomRepository.addWakeRoomBooking(booking);

        logger.info(`Successfully created booking: ${code}`);
        return {
          success: true,
          code,
          bookingId,
          message: 'Booking created successfully'
        };
      } else {
        // Update existing booking
        await this.wakeRoomRepository.updateWakeRoomBooking(booking);

        logger.info(`Successfully updated booking: ${booking.code}`);
        return {
          success: true,
          code: booking.code,
          bookingId: booking.wakeRoomBookingId,
          message: 'Booking updated successfully'
        };
      }
    } catch (error) {
      logger.error('Error in saveWakeRoomBooking:', error);
      throw error;
    }
  }

  /**
   * Generate booking code
   * Based on ASP.NET code generation logic
   * @param {WakeRoomBooking} booking - Booking object
   * @returns {Promise<string>} Generated code
   */
  async generateBookingCode(booking) {
    try {
      // Get wake room details
      const wakeRoom = await this.wakeRoomRepository.getWakeRoomById(booking.wakeRoomId);

      if (!wakeRoom) {
        throw new Error(`Wake room not found: ${booking.wakeRoomId}`);
      }

      // Get existing bookings count for this wake room and date
      const existingBookings = await this.wakeRoomRepository.getWakeRoomBookings(
        booking.wakeRoomId,
        booking.usingDate
      );

      const bookingCount = existingBookings.length;

      // Generate code: WakeRoomCode-BookingCount
      // Example: WR1-0, WR1-1, WR1-2, etc.
      let code = wakeRoom.code;

      if (bookingCount === 0) {
        code += '-0';
      } else {
        code += `-${bookingCount}`;
      }

      logger.info(`Generated booking code: ${code}`);
      return code;
    } catch (error) {
      logger.error('Error generating booking code:', error);
      throw error;
    }
  }

  /**
   * Get last booking number
   * Based on: GetLastBookingNumber()
   * @param {number} churchId - Church ID
   * @returns {Promise<string>} Last booking number
   */
  async getLastBookingNumber(churchId) {
    try {
      logger.info(`Getting last booking number for church: ${churchId}`);

      if (!churchId) {
        throw new Error('Church ID is required');
      }

      const lastNumber = await this.wakeRoomRepository.getLastBookingNumber(churchId);

      logger.info(`Last booking number: ${lastNumber}`);
      return lastNumber;
    } catch (error) {
      logger.error('Error in getLastBookingNumber:', error);
      throw error;
    }
  }

  /**
   * Get bookings for a wake room on a specific date
   * @param {number} wakeRoomId - Wake Room ID
   * @param {Date} date - Date to check
   * @returns {Promise<Array>} List of bookings
   */
  async getBookingsForDate(wakeRoomId, date) {
    try {
      logger.info(`Getting bookings for wake room ${wakeRoomId} on ${date}`);

      if (!wakeRoomId) {
        throw new Error('Wake Room ID is required');
      }

      if (!date) {
        throw new Error('Date is required');
      }

      const bookings = await this.wakeRoomRepository.getWakeRoomBookings(wakeRoomId, date);

      return bookings.map(b => b.toJSON());
    } catch (error) {
      logger.error('Error in getBookingsForDate:', error);
      throw error;
    }
  }

  /**
   * Check wake room availability for a specific time slot
   * @param {number} wakeRoomId - Wake Room ID
   * @param {Date} fromTime - Start time
   * @param {Date} toTime - End time
   * @returns {Promise<Object>} Availability status
   */
  async checkAvailability(wakeRoomId, fromTime, toTime) {
    try {
      logger.info(`Checking availability for wake room ${wakeRoomId}`);

      if (!wakeRoomId || !fromTime || !toTime) {
        throw new Error('Wake Room ID, from time, and to time are required');
      }

      const requestFrom = new Date(fromTime);
      const requestTo = new Date(toTime);
      const requestDate = new Date(requestFrom);
      requestDate.setHours(0, 0, 0, 0);

      // Get all bookings for the wake room on that date
      const bookings = await this.wakeRoomRepository.getWakeRoomBookings(wakeRoomId, requestDate);

      // Check for time conflicts
      const conflicts = bookings.filter(booking => {
        const bookingFrom = new Date(booking.usingTimeFrom);
        const bookingTo = new Date(booking.usingTimeTo);

        // Check if times overlap
        return (requestFrom < bookingTo && requestTo > bookingFrom);
      });

      const isAvailable = conflicts.length === 0;

      return {
        isAvailable,
        conflicts: conflicts.map(c => c.toJSON()),
        message: isAvailable
          ? 'Wake room is available for the requested time'
          : `Wake room has ${conflicts.length} conflicting booking(s)`
      };
    } catch (error) {
      logger.error('Error in checkAvailability:', error);
      throw error;
    }
  }

  /**
   * Check wake room availability for a date range
   * @param {number} wakeRoomId - Wake Room ID
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Object>} Availability status with daily breakdown
   */
  async checkAvailabilityByDateRange(wakeRoomId, fromDate, toDate) {
    try {
      logger.info(`Checking availability for wake room ${wakeRoomId} from ${fromDate} to ${toDate}`);

      if (!wakeRoomId || !fromDate || !toDate) {
        throw new Error('Wake Room ID, from date, and to date are required');
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);

      // Get all bookings in the date range
      const bookings = await this.wakeRoomRepository.getWakeRoomBookingsByDateRange(wakeRoomId, from, to);

      // Group conflicts by date
      const conflictsByDate = new Map();
      const allDates = [];

      // Generate all dates in range
      const currentDate = new Date(from);
      while (currentDate <= to) {
        const dateStr = currentDate.toISOString().split('T')[0];
        allDates.push(dateStr);
        conflictsByDate.set(dateStr, []);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Check each booking against each date in range
      bookings.forEach(booking => {
        const bookingFrom = new Date(booking.usingTimeFrom);
        const bookingTo = new Date(booking.usingTimeTo);

        allDates.forEach(dateStr => {
          const checkDate = new Date(dateStr);
          checkDate.setHours(0, 0, 0, 0);
          const checkDateEnd = new Date(checkDate);
          checkDateEnd.setHours(23, 59, 59, 999);

          // Check if booking overlaps with this date
          if (bookingFrom <= checkDateEnd && bookingTo >= checkDate) {
            const existing = conflictsByDate.get(dateStr) || [];
            existing.push(booking.toJSON());
            conflictsByDate.set(dateStr, existing);
          }
        });
      });

      // Build daily availability summary
      const dailyAvailability = allDates.map(dateStr => ({
        date: dateStr,
        isAvailable: conflictsByDate.get(dateStr).length === 0,
        conflictCount: conflictsByDate.get(dateStr).length,
        conflicts: conflictsByDate.get(dateStr)
      }));

      const overallAvailable = dailyAvailability.every(day => day.isAvailable);

      return {
        isAvailable: overallAvailable,
        fromDate: from.toISOString().split('T')[0],
        toDate: to.toISOString().split('T')[0],
        dailyAvailability,
        totalConflicts: bookings.length,
        message: overallAvailable
          ? `Wake room is available for the entire date range`
          : `Wake room has conflicts on ${dailyAvailability.filter(d => !d.isAvailable).length} day(s)`
      };
    } catch (error) {
      logger.error('Error in checkAvailabilityByDateRange:', error);
      throw error;
    }
  }

  /**
   * Get availability for multiple specific dates (calendar view)
   * @param {number} wakeRoomId - Wake Room ID
   * @param {Array<Date>} dates - Array of dates to check
   * @returns {Promise<Object>} Availability status for each date
   */
  async getAvailabilityForDates(wakeRoomId, dates) {
    try {
      logger.info(`Getting availability for wake room ${wakeRoomId} for ${dates.length} date(s)`);

      if (!wakeRoomId || !dates || dates.length === 0) {
        throw new Error('Wake Room ID and dates array are required');
      }

      // Get bookings for all requested dates
      const bookingsByDate = await this.wakeRoomRepository.getWakeRoomBookingsForDates(wakeRoomId, dates);

      // Build availability response
      const availability = dates.map(date => {
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);
        const dateStr = dateObj.toISOString().split('T')[0];
        const bookings = bookingsByDate.get(dateStr) || [];

        return {
          date: dateStr,
          isAvailable: bookings.length === 0,
          bookingCount: bookings.length,
          bookings: bookings.map(b => b.toJSON())
        };
      });

      return {
        wakeRoomId,
        availability,
        totalDates: dates.length,
        availableDates: availability.filter(a => a.isAvailable).length,
        bookedDates: availability.filter(a => !a.isAvailable).length
      };
    } catch (error) {
      logger.error('Error in getAvailabilityForDates:', error);
      throw error;
    }
  }

  /**
   * Get bookings for a wake room within a date range
   * @param {number} wakeRoomId - Wake Room ID
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Array>} List of bookings
   */
  async getBookingsByDateRange(wakeRoomId, fromDate, toDate) {
    try {
      logger.info(`Getting bookings for wake room ${wakeRoomId} from ${fromDate} to ${toDate}`);

      if (!wakeRoomId || !fromDate || !toDate) {
        throw new Error('Wake Room ID, from date, and to date are required');
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);

      const bookings = await this.wakeRoomRepository.getWakeRoomBookingsByDateRange(wakeRoomId, from, to);

      return bookings.map(b => b.toJSON());
    } catch (error) {
      logger.error('Error in getBookingsByDateRange:', error);
      throw error;
    }
  }

  /**
   * Delete wake room booking
   * @param {number} bookingId - Booking ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteWakeRoomBooking(bookingId) {
    try {
      logger.info(`Deleting wake room booking: ${bookingId}`);

      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      // For now, we'll update status instead of hard delete (soft delete)
      // This is safer and allows for data recovery

      const query = `
        UPDATE WakeRoomBooking
        SET Status = -1
        WHERE WakeRoomBookingId = @bookingId
      `;

      const { executeQuery } = require('../config/database');
      await executeQuery(query, { bookingId });

      logger.info(`Successfully deleted booking: ${bookingId}`);
      return true;
    } catch (error) {
      logger.error('Error in deleteWakeRoomBooking:', error);
      throw error;
    }
  }
}

module.exports = WakeRoomService;

