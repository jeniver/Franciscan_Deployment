const express = require('express');
const router = express.Router();
const GateOfLifeController = require('../controllers/GateOfLifeController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/gates-of-life
 * @desc    Search Gate of Life applications with filters and pagination
 * @access  Private (JWT required)
 */
router.get(
  '/',
  authenticateToken,
  (req, res) => GateOfLifeController.searchApplications(req, res)
);

/**
 * @route   POST /api/gates-of-life
 * @desc    Create a new Gate of Life application
 * @access  Private (JWT required)
 */
router.post(
  '/',
  authenticateToken,
  (req, res) => GateOfLifeController.createApplication(req, res)
);

/**
 * @route   GET /api/gates-of-life/:code/invoice-pdf
 * @desc    Get structured invoice PDF data for a Gate of Life application
 * @access  Private (JWT required)
 */
router.get(
  '/:code/invoice-pdf',
  authenticateToken,
  (req, res) => GateOfLifeController.getInvoicePdf(req, res)
);

/**
 * @route   GET /api/gates-of-life/:code
 * @desc    Get a Gate of Life application by code
 * @access  Private (JWT required)
 */
router.get(
  '/:code',
  authenticateToken,
  (req, res) => GateOfLifeController.getApplication(req, res)
);

/**
 * @route   PUT /api/gates-of-life/:code
 * @desc    Update a Gate of Life application
 * @access  Private (JWT required)
 */
router.put(
  '/:code',
  authenticateToken,
  (req, res) => GateOfLifeController.updateApplication(req, res)
);

/**
 * @route   DELETE /api/gates-of-life/:code
 * @desc    Delete a Gate of Life application
 * @access  Private (JWT required)
 */
router.delete(
  '/:code',
  authenticateToken,
  (req, res) => GateOfLifeController.deleteApplication(req, res)
);

module.exports = router;


