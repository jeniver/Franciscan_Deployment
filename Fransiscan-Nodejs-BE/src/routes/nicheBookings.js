const express = require('express');
const router = express.Router();
const NicheBookingController = require('../controllers/NicheBookingController');
const { authenticateToken } = require('../middleware/auth');

router.post(
  '/',
  authenticateToken,
  (req, res) => NicheBookingController.createBooking(req, res)
);

/**
 * @route   PUT /api/niche-bookings/:id
 * @desc    Update niche booking metadata (remarks, dated, etc.)
 * @access  Private (JWT required)
 */
router.put(
  '/:id',
  authenticateToken,
  (req, res) => NicheBookingController.updateBooking(req, res)
);

/**
 * @route   GET /api/niche-bookings/:code
 * @desc    Get niche booking by application code
 * @access  Private (JWT required)
 */
router.get(
  '/:code',
  authenticateToken,
  (req, res) => NicheBookingController.getBooking(req, res)
);

/**
 * @route   GET /api/niche-bookings/by-niche/:nicheId
 * @desc    Get booking by niche ID (check if niche is booked)
 * @access  Private (JWT required)
 */
router.get(
  '/by-niche/:nicheId',
  authenticateToken,
  (req, res) => NicheBookingController.getByNicheId(req, res)
);

/**
 * @route   POST /api/niche-bookings/search
 * @desc    Search niche bookings by criteria
 * @access  Private (JWT required)
 * @body    { contactName?, nicheCode?, bookedDate?, nomineeName?, beneficiaryName?, ... }
 */
router.post(
  '/search',
  authenticateToken,
  (req, res) => NicheBookingController.searchBookings(req, res)
);

/**
 * @route   DELETE /api/niche-bookings/:code
 * @desc    Delete niche booking (soft delete + restore niche status)
 * @access  Private (JWT required)
 */
router.delete(
  '/:code',
  authenticateToken,
  (req, res) => NicheBookingController.deleteBooking(req, res)
);

// ============================================================================
// BENEFICIARY MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/niche-bookings/beneficiaries
 * @desc    Add second/additional beneficiary
 * @access  Private (JWT required)
 * @body    { nicheBookingId, name, idNo, isCatholic, isMale, relationshipToApplicant, dateOfBirth }
 */
router.post(
  '/beneficiaries',
  authenticateToken,
  (req, res) => NicheBookingController.addBeneficiary(req, res)
);

/**
 * @route   PUT /api/niche-bookings/beneficiaries/:id
 * @desc    Update beneficiary details
 * @access  Private (JWT required)
 * @body    { name, idNo, isCatholic, isMale, relationshipToApplicant, dateOfBirth }
 */
router.put(
  '/beneficiaries/:id',
  authenticateToken,
  (req, res) => NicheBookingController.updateBeneficiary(req, res)
);

/**
 * @route   POST /api/niche-bookings/beneficiaries/:id/activate
 * @desc    Activate beneficiary (set status to active)
 * @access  Private (JWT required)
 */
router.post(
  '/beneficiaries/:id/activate',
  authenticateToken,
  (req, res) => NicheBookingController.activateBeneficiary(req, res)
);

/**
 * @route   POST /api/niche-bookings/beneficiaries/:id/deactivate
 * @desc    Deactivate beneficiary (set status to inactive)
 * @access  Private (JWT required)
 */
router.post(
  '/beneficiaries/:id/deactivate',
  authenticateToken,
  (req, res) => NicheBookingController.deactivateBeneficiary(req, res)
);

module.exports = router;

