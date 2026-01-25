const BaseController = require('./BaseController');
const WakeRoomService = require('../services/WakeRoomService');
const logger = require('../utils/logger');

/**
 * WakeRoomController
 * Handles HTTP requests for Wake Room operations
 * Based on ASP.NET WebMethods in Capture.aspx.cs and Search.aspx.cs
 */
class WakeRoomController extends BaseController {
  constructor() {
    super();
    this.wakeRoomService = new WakeRoomService();
  }

  /**
   * Get all wake rooms across all churches
   * GET /api/wake-rooms/all
   */
  getAllWakeRooms = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get All Wake Rooms (All Churches)');

    try {
      const wakeRooms = await this.wakeRoomService.getAllWakeRooms();

      this.sendSuccess(res, wakeRooms, 'All wake rooms retrieved successfully');
    } catch (error) {
      logger.error('Error in getAllWakeRooms:', error);
      this.sendError(res, 'Failed to retrieve all wake rooms', 500);
    }
  });

  /**
   * Get wake rooms (filtered by church query param)
   * GET /api/wake-rooms?church=:churchId
   */
  getWakeRooms = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Wake Rooms');

    const churchId = req.query.church || req.user?.churchId;

    try {
      if (!churchId) {
        return this.sendError(res, 'Church ID is required (provide via query param or user context)', 400);
      }

      const wakeRooms = await this.wakeRoomService.getWakeRoomsByChurch(parseInt(churchId));

      this.sendSuccess(res, wakeRooms, 'Wake rooms retrieved successfully');
    } catch (error) {
      logger.error('Error in getWakeRooms:', error);
      this.sendError(res, 'Failed to retrieve wake rooms', 500);
    }
  });

  /**
   * Get wake rooms for dropdowns (value/label)
   * GET /api/wake-rooms/dropdown?church=:churchId
   * Mirrors ASP.NET LoadWakeRooms web method
   */
  getWakeRoomOptions = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Wake Room Dropdown Options');

    const churchId = req.query.church || req.user?.churchId;

    try {
      if (!churchId) {
        return this.sendError(res, 'Church ID is required (provide via query param or user context)', 400);
      }

      const options = await this.wakeRoomService.getWakeRoomOptions(parseInt(churchId));

      this.sendSuccess(res, options, 'Wake room options retrieved successfully');
    } catch (error) {
      logger.error('Error in getWakeRoomOptions:', error);
      this.sendError(res, 'Failed to retrieve wake room options', 500);
    }
  });

  /**
   * Get all wake rooms for a church
   * GET /api/wake-rooms/church/:churchId
   * Based on: LoadWakeRooms() WebMethod
   */
  getWakeRoomsByChurch = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Wake Rooms by Church');

    const { churchId } = req.params;

    try {
      if (!churchId) {
        return this.sendError(res, 'Church ID is required', 400);
      }

      const wakeRooms = await this.wakeRoomService.getWakeRoomsByChurch(parseInt(churchId));

      this.sendSuccess(res, wakeRooms, 'Wake rooms retrieved successfully');
    } catch (error) {
      logger.error('Error in getWakeRoomsByChurch:', error);
      this.sendError(res, 'Failed to retrieve wake rooms', 500);
    }
  });

  /**
   * Get wake room by ID
   * GET /api/wake-rooms/:id
   */
  getWakeRoomById = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Wake Room by ID');

    const { id } = req.params;

    try {
      if (!id) {
        return this.sendError(res, 'Wake Room ID is required', 400);
      }

      const wakeRoom = await this.wakeRoomService.getWakeRoomById(parseInt(id));

      this.sendSuccess(res, wakeRoom, 'Wake room retrieved successfully');
    } catch (error) {
      logger.error('Error in getWakeRoomById:', error);

      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      }

      this.sendError(res, 'Failed to retrieve wake room', 500);
    }
  });

  /**
   * Get wake room booking by code
   * GET /api/wake-room-bookings/:code
   * Based on: ViewWakeRoomBooking(string wakeRoomBookingCode) WebMethod
   */
  getWakeRoomBooking = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Wake Room Booking');

    const { code } = req.params;
    const churchId = req.user?.churchId || req.query.churchId;

    try {
      if (!code) {
        return this.sendError(res, 'Booking code is required', 400);
      }

      if (!churchId) {
        return this.sendError(res, 'Church ID is required', 400);
      }

      const booking = await this.wakeRoomService.getWakeRoomBooking(code, parseInt(churchId));

      this.sendSuccess(res, booking, 'Wake room booking retrieved successfully');
    } catch (error) {
      logger.error('Error in getWakeRoomBooking:', error);

      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      }

      this.sendError(res, 'Failed to retrieve wake room booking', 500);
    }
  });

  /**
   * Search wake room bookings
   * POST /api/wake-room-bookings/search
   * Based on: SearchWakeBookings(string searchParamsEntity) WebMethod
   */
  searchWakeBookings = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Search Wake Room Bookings');

    const searchParams = req.body || {};
    const churchId = req.user?.churchId || searchParams.churchId || req.query.churchId;

    try {
      if (!churchId) {
        return this.sendError(res, 'Church ID is required', 400);
      }

      // Add church ID to search params
      searchParams.churchId = parseInt(churchId);

      logger.info('Search params:', JSON.stringify(searchParams));

      const bookings = await this.wakeRoomService.searchWakeBookings(searchParams);

      // Always return success, even with empty results
      if (bookings.length === 0) {
        return this.sendSuccess(res, [], 'No bookings found matching the criteria');
      }

      this.sendSuccess(res, bookings, `Found ${bookings.length} booking(s)`);
    } catch (error) {
      logger.error('Error in searchWakeBookings:', error);

      if (error.message.includes('Church ID is required')) {
        return this.sendError(res, error.message, 400);
      }

      this.sendError(res, 'Failed to search wake room bookings', 500);
    }
  });

  /**
   * Create new wake room booking
   * POST /api/wake-room-bookings
   * Based on: CaptureWakeRoomBooking(string entityDescription) WebMethod
   */
  createWakeRoomBooking = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Create Wake Room Booking');

    const bookingData = req.body;
    const userId = req.user?.userId;

    try {
      if (!userId) {
        return this.sendError(res, 'User authentication required', 401);
      }

      if (!bookingData.churchId) {
        bookingData.churchId = req.user.churchId;
      }

      const result = await this.wakeRoomService.saveWakeRoomBooking(bookingData, userId);

      if (!result.success) {
        if (result.isDuplicate) {
          return this.sendSuccess(res, {
            isDuplicate: true,
            existingCode: result.code,
            message: result.message
          }, 'Duplicate booking detected', 200);
        }
        return this.sendError(res, result.message, 400);
      }

      this.sendSuccess(res, {
        code: result.code,
        bookingId: result.bookingId
      }, 'Wake room booking created successfully', 201);
    } catch (error) {
      logger.error('Error in createWakeRoomBooking:', error);

      if (error.message.includes('Validation failed')) {
        return this.sendError(res, error.message, 400);
      }

      this.sendError(res, 'Failed to create wake room booking', 500);
    }
  });

  /**
   * Update wake room booking
   * PUT /api/wake-room-bookings/:id
   * Based on: UpdateWakeRoomBooking(string entityDescription) WebMethod
   */
  updateWakeRoomBooking = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Update Wake Room Booking');

    const { id } = req.params;
    const bookingData = req.body;
    const userId = req.user?.userId;

    try {
      if (!userId) {
        return this.sendError(res, 'User authentication required', 401);
      }

      if (!id) {
        return this.sendError(res, 'Booking ID is required', 400);
      }

      // Set the booking ID from URL parameter
      bookingData.wakeRoomBookingId = parseInt(id);

      if (!bookingData.churchId) {
        bookingData.churchId = req.user.churchId;
      }

      const result = await this.wakeRoomService.saveWakeRoomBooking(bookingData, userId);

      if (!result.success) {
        return this.sendError(res, result.message, 400);
      }

      this.sendSuccess(res, {
        code: result.code,
        bookingId: result.bookingId
      }, 'Wake room booking updated successfully');
    } catch (error) {
      logger.error('Error in updateWakeRoomBooking:', error);

      if (error.message.includes('Validation failed')) {
        return this.sendError(res, error.message, 400);
      }

      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      }

      this.sendError(res, 'Failed to update wake room booking', 500);
    }
  });

  /**
   * Get last booking number
   * GET /api/wake-room-bookings/last-number/:churchId
   * Based on: GetLastBookingNumber() WebMethod
   */
  getLastBookingNumber = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Last Booking Number');

    const { churchId } = req.params;

    try {
      if (!churchId) {
        return this.sendError(res, 'Church ID is required', 400);
      }

      const lastNumber = await this.wakeRoomService.getLastBookingNumber(parseInt(churchId));

      this.sendSuccess(res, { lastNumber }, 'Last booking number retrieved successfully');
    } catch (error) {
      logger.error('Error in getLastBookingNumber:', error);
      this.sendError(res, 'Failed to retrieve last booking number', 500);
    }
  });

  /**
   * Check wake room availability for a specific time slot
   * POST /api/wake-rooms/check-availability
   */
  checkAvailability = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Check Wake Room Availability');

    const { wakeRoomId, fromTime, toTime } = req.body;

    try {
      if (!wakeRoomId || !fromTime || !toTime) {
        return this.sendError(res, 'Wake Room ID, from time, and to time are required', 400);
      }

      const availability = await this.wakeRoomService.checkAvailability(
        parseInt(wakeRoomId),
        new Date(fromTime),
        new Date(toTime)
      );

      this.sendSuccess(res, availability, 'Availability checked successfully');
    } catch (error) {
      logger.error('Error in checkAvailability:', error);
      this.sendError(res, 'Failed to check availability', 500);
    }
  });

  /**
   * Check wake room availability for a date range
   * POST /api/wake-rooms/check-availability-range
   */
  checkAvailabilityByDateRange = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Check Wake Room Availability by Date Range');

    const { wakeRoomId, fromDate, toDate } = req.body;

    try {
      if (!wakeRoomId || !fromDate || !toDate) {
        return this.sendError(res, 'Wake Room ID, from date, and to date are required', 400);
      }

      const availability = await this.wakeRoomService.checkAvailabilityByDateRange(
        parseInt(wakeRoomId),
        new Date(fromDate),
        new Date(toDate)
      );

      this.sendSuccess(res, availability, 'Availability checked successfully');
    } catch (error) {
      logger.error('Error in checkAvailabilityByDateRange:', error);
      this.sendError(res, 'Failed to check availability', 500);
    }
  });

  /**
   * Get availability for multiple specific dates (calendar view)
   * POST /api/wake-rooms/check-availability-dates
   */
  getAvailabilityForDates = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Wake Room Availability for Dates');

    const { wakeRoomId, dates } = req.body;

    try {
      if (!wakeRoomId || !dates || !Array.isArray(dates) || dates.length === 0) {
        return this.sendError(res, 'Wake Room ID and dates array are required', 400);
      }

      const dateObjects = dates.map(d => new Date(d));
      const availability = await this.wakeRoomService.getAvailabilityForDates(
        parseInt(wakeRoomId),
        dateObjects
      );

      this.sendSuccess(res, availability, 'Availability retrieved successfully');
    } catch (error) {
      logger.error('Error in getAvailabilityForDates:', error);
      this.sendError(res, 'Failed to get availability', 500);
    }
  });

  /**
   * Get bookings for a wake room within a date range
   * GET /api/wake-rooms/:id/bookings-range?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
   */
  getBookingsByDateRange = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Bookings by Date Range');

    const { id } = req.params;
    const { fromDate, toDate } = req.query;

    try {
      if (!id || !fromDate || !toDate) {
        return this.sendError(res, 'Wake Room ID, from date, and to date are required', 400);
      }

      const bookings = await this.wakeRoomService.getBookingsByDateRange(
        parseInt(id),
        new Date(fromDate),
        new Date(toDate)
      );

      this.sendSuccess(res, bookings, `Found ${bookings.length} booking(s) in date range`);
    } catch (error) {
      logger.error('Error in getBookingsByDateRange:', error);
      this.sendError(res, 'Failed to retrieve bookings', 500);
    }
  });

  /**
   * Get bookings for a specific date (via query param)
   * GET /api/wake-rooms/:id/bookings?date=YYYY-MM-DD
   */
  getBookingsForDateQuery = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Bookings for Date (Query)');

    const { id } = req.params;
    const { date } = req.query;

    try {
      if (!id || !date) {
        return this.sendError(res, 'Wake Room ID and date are required', 400);
      }

      const bookings = await this.wakeRoomService.getBookingsForDate(
        parseInt(id),
        new Date(date)
      );

      this.sendSuccess(res, bookings, `Found ${bookings.length} booking(s) for the specified date`);
    } catch (error) {
      logger.error('Error in getBookingsForDateQuery:', error);
      this.sendError(res, 'Failed to retrieve bookings', 500);
    }
  });

  /**
   * Get bookings for a specific date
   * GET /api/wake-rooms/:id/bookings/:date
   */
  getBookingsForDate = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Bookings for Date');

    const { id, date } = req.params;

    try {
      if (!id || !date) {
        return this.sendError(res, 'Wake Room ID and date are required', 400);
      }

      const bookings = await this.wakeRoomService.getBookingsForDate(
        parseInt(id),
        new Date(date)
      );

      this.sendSuccess(res, bookings, `Found ${bookings.length} booking(s) for the specified date`);
    } catch (error) {
      logger.error('Error in getBookingsForDate:', error);
      this.sendError(res, 'Failed to retrieve bookings', 500);
    }
  });

  /**
   * Create new wake room booking for specific room
   * POST /api/wake-rooms/:id/bookings
   * Based on stored procedure: sp_add_wake_room_booking
   */
  createWakeRoomBookingForRoom = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Create Wake Room Booking for Room');

    const { id } = req.params;
    const bookingData = req.body;
    const userId = req.user?.userId;
    const churchId = req.user?.churchId;

    try {
      if (!userId) {
        return this.sendError(res, 'User authentication required', 401);
      }

      // Set wake room ID from URL parameter
      bookingData.wakeRoomId = parseInt(id);

      if (!bookingData.churchId) {
        bookingData.churchId = churchId;
      }

      const result = await this.wakeRoomService.saveWakeRoomBooking(bookingData, userId);

      if (!result.success) {
        if (result.isDuplicate) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
              message: result.message
            },
            data: {
              existingCode: result.code
            }
          });
        }
        return this.sendError(res, result.message, 400);
      }

      return res.status(201).json({
        success: true,
        code: result.code,
        data: {
          bookingCode: result.code,
          bookingId: result.bookingId
        },
        message: 'Wake room booking created successfully'
      });
    } catch (error) {
      logger.error('Error in createWakeRoomBookingForRoom:', error);

      if (error.message.includes('Validation failed')) {
        return this.sendError(res, error.message, 400);
      }

      this.sendError(res, 'Failed to create wake room booking', 500);
    }
  });

  /**
   * Delete wake room booking
   * DELETE /api/wake-room-bookings/:id
   */
  deleteWakeRoomBooking = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Delete Wake Room Booking');

    const { id } = req.params;
    const userId = req.user?.userId;

    try {
      if (!userId) {
        return this.sendError(res, 'User authentication required', 401);
      }

      if (!id) {
        return this.sendError(res, 'Booking ID is required', 400);
      }

      await this.wakeRoomService.deleteWakeRoomBooking(parseInt(id));

      this.sendSuccess(res, null, 'Wake room booking deleted successfully');
    } catch (error) {
      logger.error('Error in deleteWakeRoomBooking:', error);

      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      }

      this.sendError(res, 'Failed to delete wake room booking', 500);
    }
  });
}

module.exports = WakeRoomController;

