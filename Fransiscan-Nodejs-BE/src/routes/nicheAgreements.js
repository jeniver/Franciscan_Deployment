const express = require('express');
const router = express.Router();
const NicheAgreementController = require('../controllers/NicheAgreementController');
const { authenticateToken } = require('../middleware/auth');
const { validate, commonValidations } = require('../middleware/validation');

const nicheAgreementController = new NicheAgreementController();

// Public routes (no authentication required)
/**
 * @route GET /api/niche-agreements/:applicationNumber
 * @desc Get complete niche agreement details by application number
 * @access Public
 * @param {string} applicationNumber - Application number (e.g., "3795-1")
 */
router.get('/:applicationNumber', nicheAgreementController.getNicheAgreementDetails);

/**
 * @route GET /api/niche-agreements/:applicationNumber/summary
 * @desc Get niche agreement summary (lightweight version)
 * @access Public
 * @param {string} applicationNumber - Application number (e.g., "3795-1")
 */
router.get('/:applicationNumber/summary', nicheAgreementController.getNicheAgreementSummary);

/**
 * @route GET /api/niche-agreements/:applicationNumber/reports
 * @desc Get Crystal Reports paths for agreement and invoice
 * @access Public
 * @param {string} applicationNumber - Application number (e.g., "3795-1")
 */
router.get('/:applicationNumber/reports', nicheAgreementController.getCrystalReportsInfo);

/**
 * @route GET /api/niche-agreements/:applicationNumber/pdf
 * @desc Get structured data for Agreement PDF generation (frontend will generate PDF)
 * @access Public
 * @param {string} applicationNumber - Application number (e.g., "3795-1")
 * @returns {Object} JSON data formatted for PDF generation
 */
router.get('/:applicationNumber/pdf', nicheAgreementController.getAgreementPdf);

/**
 * @route GET /api/niche-agreements/:applicationNumber/invoice-pdf
 * @route HEAD /api/niche-agreements/:applicationNumber/invoice-pdf
 * @desc Get structured data for Invoice PDF generation (frontend will generate PDF)
 * @access Public
 * @param {string} applicationNumber - Application number (e.g., "3795-1", "NAPP-41")
 * @returns {Object} JSON data formatted for PDF generation
 */
router.get('/:applicationNumber/invoice-pdf', nicheAgreementController.getInvoicePdf);
router.head('/:applicationNumber/invoice-pdf', nicheAgreementController.getInvoicePdf);

/**
 * @route GET /api/niche-agreements/:applicationNumber/second-nominee-agreement-pdf
 * @desc Get structured data for 2nd Nominee Agreement PDF generation (frontend will generate PDF)
 * @access Public
 * @param {string} applicationNumber - Application number (e.g., "3795-1", "NAPP-41")
 * @returns {Object} JSON data formatted for PDF generation
 */
router.get('/:applicationNumber/second-nominee-agreement-pdf', nicheAgreementController.getSecondNomineeAgreementPdf);

// All other routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/niche-agreements/suggestions/:partialApplicationNumber
 * @desc Get application number suggestions for partial matches
 * @access Private
 * @param {string} partialApplicationNumber - Partial application number
 */
router.get('/suggestions/:partialApplicationNumber', nicheAgreementController.getApplicationNumberSuggestions);

/**
 * @route POST /api/niche-agreements/validate
 * @desc Validate application number format
 * @access Private
 * @body {string} applicationNumber - Application number to validate
 */
router.post('/validate',
  [
    commonValidations.id // Reuse existing validation for required field
  ],
  validate,
  nicheAgreementController.validateApplicationNumber
);

module.exports = router;
