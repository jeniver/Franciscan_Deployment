const express = require('express');
const router = express.Router();
const EngraveApplicationController = require('../controllers/EngraveApplicationController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   POST /api/engrave-applications
 * @desc    Create new engrave application
 * @access  Private (JWT required)
 * @body    { applicant: {...}, inscription: {...}, deceasedDetails: [...] }
 */
router.post(
  '/',
  authenticateToken,
  (req, res) => EngraveApplicationController.createApplication(req, res)
);

/**
 * @route   GET /api/engrave-applications/:code
 * @desc    Get engrave application by code
 * @access  Private (JWT required)
 */
router.get(
  '/:code',
  authenticateToken,
  (req, res) => EngraveApplicationController.getApplication(req, res)
);

/**
 * @route   PUT /api/engrave-applications/:code
 * @desc    Update engrave application (only when status is Draft/Pending)
 * @access  Private (JWT required)
 * @body    { applicant: {...}, inscription: {...}, deceasedDetails: [...] }
 */
router.put(
  '/:code',
  authenticateToken,
  (req, res) => EngraveApplicationController.updateApplication(req, res)
);

/**
 * @route   POST /api/engrave-applications/:code/confirm
 * @desc    Confirm engrave application and create invoice
 * @access  Private (JWT required)
 */
router.post(
  '/:code/confirm',
  authenticateToken,
  (req, res) => EngraveApplicationController.confirmApplication(req, res)
);

module.exports = router;

