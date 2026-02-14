const express = require('express');
const router = express.Router();
const WakeRoomController = require('../controllers/WakeRoomController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body, param } = require('express-validator');

const wakeRoomController = new WakeRoomController();

// ============================================================================
// WAKE ROOM ENDPOINTS
// ============================================================================

/**
 * @route GET /api/wake-rooms
 * @desc Get all wake rooms (filter by church via query param)
 * @access Private
 * @query {number} church - Church ID (optional, uses user's church if not provided)
 */
router.get('/',
  authenticateToken,
  wakeRoomController.getWakeRooms
);

/**
 * @route GET /api/wake-rooms/all
 * @desc Get all wake rooms across all churches (no church filter)
 * @access Private
 */
router.get('/all',
  authenticateToken,
  wakeRoomController.getAllWakeRooms
);

/**
 * @route GET /api/wake-rooms/dropdown
 * @desc Get wake rooms formatted for dropdowns
 * @access Private
 * @query {number} church - Church ID (optional, uses user's church if not provided)
 */
router.get('/dropdown',
  authenticateToken,
  wakeRoomController.getWakeRoomOptions
);

/**
 * @route GET /api/wake-rooms/church/:churchId
 * @desc Get all wake rooms for a church
 * @access Private
 * @param {number} churchId - Church ID
 */
router.get('/church/:churchId',
  authenticateToken,
  [
    param('churchId').isInt().withMessage('Church ID must be an integer')
  ],
  validate,
  wakeRoomController.getWakeRoomsByChurch
);

/**
 * @route GET /api/wake-rooms/:id
 * @desc Get wake room by ID
 * @access Private
 * @param {number} id - Wake Room ID
 */
router.get('/:id',
  authenticateToken,
  [
    param('id').isInt().withMessage('Wake Room ID must be an integer')
  ],
  validate,
  wakeRoomController.getWakeRoomById
);

/**
 * @route GET /api/wake-rooms/:id/bookings
 * @desc Get all bookings for a wake room on a specific date (via query param)
 * @access Private
 * @param {number} id - Wake Room ID
 * @query {string} date - Date (YYYY-MM-DD)
 */
router.get('/:id/bookings',
  authenticateToken,
  [
    param('id').isInt().withMessage('Wake Room ID must be an integer')
  ],
  validate,
  wakeRoomController.getBookingsForDateQuery
);

/**
 * @route GET /api/wake-rooms/:id/bookings/:date
 * @desc Get all bookings for a wake room on a specific date
 * @access Private
 * @param {number} id - Wake Room ID
 * @param {string} date - Date (YYYY-MM-DD)
 */
router.get('/:id/bookings/:date',
  authenticateToken,
  [
    param('id').isInt().withMessage('Wake Room ID must be an integer'),
    param('date').isISO8601().withMessage('Date must be in ISO 8601 format')
  ],
  validate,
  wakeRoomController.getBookingsForDate
);

/**
 * @route POST /api/wake-rooms/:id/bookings
 * @desc Create new wake room booking for specific room
 * @access Private
 * @param {number} id - Wake Room ID
 * @body {Object} bookingData - Booking information
 */
router.post('/:id/bookings',
  authenticateToken,
  [
    param('id').isInt().withMessage('Wake Room ID must be an integer'),
    body('applicantName').notEmpty().withMessage('Applicant name is required'),
    body('nameOfDeceased').notEmpty().withMessage('Name of deceased is required'),
    body('usingTimeFrom').isISO8601().withMessage('Using time from is required'),
    body('usingTimeTo').isISO8601().withMessage('Using time to is required')
  ],
  validate,
  wakeRoomController.createWakeRoomBookingForRoom
);

/**
 * @route POST /api/wake-rooms/check-availability
 * @desc Check if wake room is available for a specific time slot
 * @access Private
 * @body {Object} { wakeRoomId, fromTime, toTime }
 */
router.post('/check-availability',
  authenticateToken,
  [
    body('wakeRoomId').isInt().withMessage('Wake Room ID must be an integer'),
    body('fromTime').isISO8601().withMessage('From time must be in ISO 8601 format'),
    body('toTime').isISO8601().withMessage('To time must be in ISO 8601 format')
  ],
  validate,
  wakeRoomController.checkAvailability
);

/**
 * @route POST /api/wake-rooms/check-availability-range
 * @desc Check wake room availability for a date range
 * @access Private
 * @body {Object} { wakeRoomId, fromDate, toDate }
 */
router.post('/check-availability-range',
  authenticateToken,
  [
    body('wakeRoomId').isInt().withMessage('Wake Room ID must be an integer'),
    body('fromDate').isISO8601().withMessage('From date must be in ISO 8601 format'),
    body('toDate').isISO8601().withMessage('To date must be in ISO 8601 format')
  ],
  validate,
  wakeRoomController.checkAvailabilityByDateRange
);

/**
 * @route POST /api/wake-rooms/check-availability-dates
 * @desc Get availability for multiple specific dates (calendar view)
 * @access Private
 * @body {Object} { wakeRoomId, dates: [date1, date2, ...] }
 */
router.post('/check-availability-dates',
  authenticateToken,
  [
    body('wakeRoomId').isInt().withMessage('Wake Room ID must be an integer'),
    body('dates').isArray().withMessage('Dates must be an array'),
    body('dates.*').isISO8601().withMessage('Each date must be in ISO 8601 format')
  ],
  validate,
  wakeRoomController.getAvailabilityForDates
);

/**
 * @route GET /api/wake-rooms/:id/bookings-range
 * @desc Get bookings for a wake room within a date range
 * @access Private
 * @param {number} id - Wake Room ID
 * @query {string} fromDate - Start date (YYYY-MM-DD)
 * @query {string} toDate - End date (YYYY-MM-DD)
 */
router.get('/:id/bookings-range',
  authenticateToken,
  [
    param('id').isInt().withMessage('Wake Room ID must be an integer')
  ],
  validate,
  wakeRoomController.getBookingsByDateRange
);

// ============================================================================
// WAKE ROOM BOOKING ENDPOINTS
// ============================================================================

/**
 * @route GET /api/wake-room-bookings/:code
 * @desc Get wake room booking by code
 * @access Public (with church ID)
 * @param {string} code - Booking code
 */
router.get('/bookings/:code',
  [
    param('code').notEmpty().withMessage('Booking code is required')
  ],
  validate,
  wakeRoomController.getWakeRoomBooking
);

/**
 * @route GET /api/wake-room-bookings/last-number/:churchId
 * @desc Get last booking number for a church
 * @access Private
 * @param {number} churchId - Church ID
 */
router.get('/bookings/last-number/:churchId',
  authenticateToken,
  [
    param('churchId').isInt().withMessage('Church ID must be an integer')
  ],
  validate,
  wakeRoomController.getLastBookingNumber
);

/**
 * @route POST /api/wake-room-bookings/search
 * @desc Search wake room bookings
 * @access Private
 * @body {Object} searchParams - Search parameters (all optional except churchId)
 */
router.post('/bookings/search',
  authenticateToken,
  [
    body('churchId').optional().isInt().withMessage('Church ID must be an integer'),
    body('code').optional().trim(),
    body('applicantName').optional().trim(),
    body('nameOfDeceased').optional().trim(),
    body('usingDate').optional().trim(),
    body('wakeRoomId').optional().isInt().withMessage('Wake Room ID must be an integer')
  ],
  validate,
  wakeRoomController.searchWakeBookings
);

/**
 * @route POST /api/wake-room-bookings
 * @desc Create new wake room booking
 * @access Private
 * @body {Object} bookingData - Booking information
 */
router.post('/bookings',
  authenticateToken,
  [
    body('wakeRoomId').isInt().withMessage('Wake Room ID is required'),
    body('applicantName').notEmpty().withMessage('Applicant name is required'),
    body('nameOfDeceased').notEmpty().withMessage('Name of deceased is required'),
    body('usingTimeFrom').isISO8601().withMessage('Using time from is required'),
    body('usingTimeTo').isISO8601().withMessage('Using time to is required'),
    body('donationAmount').optional().isFloat({ min: 0 }).withMessage('Donation amount must be a positive number'),
    body('applicantMobileNo').optional().isMobilePhone().withMessage('Invalid mobile phone number')
  ],
  validate,
  wakeRoomController.createWakeRoomBooking
);

/**
 * @route PUT /api/wake-room-bookings/:id
 * @desc Update wake room booking
 * @access Private
 * @param {number} id - Booking ID
 * @body {Object} bookingData - Updated booking information
 */
router.put('/bookings/:id',
  authenticateToken,
  [
    param('id').isInt().withMessage('Booking ID must be an integer'),
    body('wakeRoomId').isInt().withMessage('Wake Room ID is required'),
    body('applicantName').notEmpty().withMessage('Applicant name is required'),
    body('nameOfDeceased').notEmpty().withMessage('Name of deceased is required'),
    body('usingTimeFrom').isISO8601().withMessage('Using time from is required'),
    body('usingTimeTo').isISO8601().withMessage('Using time to is required')
  ],
  validate,
  wakeRoomController.updateWakeRoomBooking
);

/**
 * @route DELETE /api/wake-room-bookings/:id
 * @desc Delete wake room booking (soft delete)
 * @access Private (Admin only)
 * @param {number} id - Booking ID
 */
router.delete('/bookings/:id',
  authenticateToken,
  authorize(['admin']),
  [
    param('id').isInt().withMessage('Booking ID must be an integer')
  ],
  validate,
  wakeRoomController.deleteWakeRoomBooking
);

module.exports = router;

