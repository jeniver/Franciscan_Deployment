const express = require('express');
const router = express.Router();
const WakeRoomController = require('../controllers/WakeRoomController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body, param } = require('express-validator');

const wakeRoomController = new WakeRoomController();

// ============================================================================
// IMPORTANT: Route order matters! Specific routes must come before parameterized routes
// ============================================================================

/**
 * @route POST /api/wake-room-bookings/search
 * @desc Search wake room bookings
 * @access Private
 */
router.post('/search',
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
 * @route GET /api/wake-room-bookings/last-number/:churchId
 * @desc Get last booking number for church
 * @access Private
 */
router.get('/last-number/:churchId',
  authenticateToken,
  [
    param('churchId').isInt().withMessage('Church ID must be an integer')
  ],
  validate,
  wakeRoomController.getLastBookingNumber
);

/**
 * @route POST /api/wake-room-bookings
 * @desc Create new wake room booking
 * @access Private
 */
router.post('/',
  authenticateToken,
  [
    body('wakeRoomId').isInt().withMessage('Wake Room ID is required'),
    body('applicantName').notEmpty().withMessage('Applicant name is required'),
    body('nameOfDeceased').notEmpty().withMessage('Name of deceased is required'),
    body('usingTimeFrom').isISO8601().withMessage('Using time from is required'),
    body('usingTimeTo').isISO8601().withMessage('Using time to is required'),
    body('donationAmount').optional().isFloat({ min: 0 }).withMessage('Donation amount must be a positive number'),
    body('applicantMobileNo').optional().isMobilePhone().withMessage('Invalid mobile phone number'),
    body('applicantEmailID').optional().isEmail().withMessage('Invalid email address')
  ],
  validate,
  wakeRoomController.createWakeRoomBooking
);

/**
 * @route PUT /api/wake-room-bookings/:id
 * @desc Update wake room booking
 * @access Private
 */
router.put('/:id',
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
 */
router.delete('/:id',
  authenticateToken,
  authorize(['admin']),
  [
    param('id').isInt().withMessage('Booking ID must be an integer')
  ],
  validate,
  wakeRoomController.deleteWakeRoomBooking
);

/**
 * @route GET /api/wake-room-bookings/:code
 * @desc Get wake room booking by code
 * @access Public (with church ID in query)
 * NOTE: This must be LAST because it matches any string, including "search" and "last-number"
 */
router.get('/:code',
  [
    param('code').notEmpty().withMessage('Booking code is required')
  ],
  validate,
  wakeRoomController.getWakeRoomBooking
);

module.exports = router;

