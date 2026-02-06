const express = require('express');
const router = express.Router();
const InscriptionInvoiceController = require('../controllers/InscriptionInvoiceController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const controller = new InscriptionInvoiceController();

/**
 * @route   GET /api/inscriptions/:code/items
 * @desc    Get task‑mapped inscription items for an inscription application
 * @access  Private (JWT required)
 */
router.get(
  '/:code/items',
  optionalAuth,
  (req, res) => controller.getInscriptionItems(req, res)
);

/**
 * @route   POST /api/inscriptions/:code/invoice
 * @desc    Create invoice for an inscription application
 * @access  Private (JWT required)
 */
router.post(
  '/:code/invoice',
  authenticateToken,
  (req, res) => controller.createInscriptionInvoice(req, res)
);

/**
 * @route   POST /api/inscriptions
 * @desc    Create a new inscription application
 * @access  Private (JWT required)
 */
router.post(
  '/',
  authenticateToken,
  (req, res) => controller.createInscription(req, res)
);

/**
 * @route   PUT /api/inscriptions/:code
 * @desc    Update an existing inscription application
 * @access  Private (JWT required)
 */
router.put(
  '/:code',
  authenticateToken,
  (req, res) => controller.updateInscription(req, res)
);

/**
 * @route   DELETE /api/inscriptions/:code
 * @desc    Delete an inscription application
 * @access  Private (JWT required)
 */
router.delete(
  '/:code',
  authenticateToken,
  (req, res) => controller.deleteInscription(req, res)
);

/**
 * @route   GET /api/inscriptions
 * @desc    Search inscription applications with filters
 * @access  Private (JWT required)
 * @query   {string} searchTerm - Search term
 * @query   {string} fromDate - Start date (YYYY-MM-DD)
 * @query   {string} toDate - End date (YYYY-MM-DD)
 * @query   {number} page - Page number (default: 1)
 * @query   {number} pageSize - Records per page (default: 20)
 */
router.get(
  '/',
  authenticateToken,
  (req, res) => controller.searchInscriptions(req, res)
);

module.exports = router;


