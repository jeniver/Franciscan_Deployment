const express = require('express');
const router = express.Router();
const InscriptionInvoiceController = require('../controllers/InscriptionInvoiceController');
const { authenticateToken } = require('../middleware/auth');

const controller = new InscriptionInvoiceController();

/**
 * @route   GET /api/inscriptions/:code/items
 * @desc    Get task‑mapped inscription items for an inscription application
 * @access  Private (JWT required)
 */
router.get(
  '/:code/items',
  authenticateToken,
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

module.exports = router;


