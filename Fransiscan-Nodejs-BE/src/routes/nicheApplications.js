const express = require('express');
const router = express.Router();
const NicheApplicationController = require('../controllers/NicheApplicationController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/niche-applications
 * @desc    Search niche applications with filters and pagination.
 *          Pass ?fetchAll=true or ?pageSize=all to retrieve every record.
 * @access  Private (JWT required)
 */
router.get(
  '/',
  authenticateToken,
  (req, res) => NicheApplicationController.searchApplications(req, res)
);

/**
 * @route   POST /api/niche-applications
 * @desc    Create new niche application (booking)
 * @access  Private (JWT required)
 * @body    Complete application data with beneficiaries
 */
router.post(
  '/',
  authenticateToken,
  (req, res) => NicheApplicationController.createApplication(req, res)
);

/**
 * @route   GET /api/niche-applications/:code
 * @desc    Get niche application by code
 * @access  Private (JWT required)
 */
router.get(
  '/:code',
  authenticateToken,
  (req, res) => NicheApplicationController.getApplication(req, res)
);

/**
 * @route   PUT /api/niche-applications/:code
 * @desc    Update niche application (only when status is Draft/Pending)
 * @access  Private (JWT required)
 * @body    Updated application data with beneficiaries
 */
router.put(
  '/:code',
  authenticateToken,
  (req, res) => NicheApplicationController.updateApplication(req, res)
);

/**
 * @route   DELETE /api/niche-applications/:code
 * @desc    Delete niche application (soft delete + restore niche to vacant)
 * @access  Private (JWT required)
 */
router.delete(
  '/:code',
  authenticateToken,
  (req, res) => NicheApplicationController.deleteApplication(req, res)
);

/**
 * @route   POST /api/niche-applications/:code/send-invoice
 * @desc    Generate and email invoice to applicant/nominee
 * @access  Private (JWT required)
 * @body    { to?: string } Optional override recipient
 */
router.post(
  '/:code/send-invoice',
  authenticateToken,
  (req, res) => NicheApplicationController.sendInvoiceEmail(req, res)
);

module.exports = router;

