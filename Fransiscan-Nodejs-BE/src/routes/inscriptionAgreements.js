const express = require('express');
const router = express.Router();
const InscriptionAgreementController = require('../controllers/InscriptionAgreementController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(optionalAuth);

/**
 * @route GET /api/inscription-agreements/:inscriptionCode
 * @desc Get inscription agreement details
 * @access Private
 */
router.get('/:inscriptionCode', InscriptionAgreementController.getAgreementDetails);

/**
 * @route GET /api/inscription-agreements/:inscriptionCode/reports
 * @desc Get crystal reports information for inscription agreement
 * @access Private
 */
router.get('/:inscriptionCode/reports', InscriptionAgreementController.getCrystalReportsInfo);

/**
 * @route GET /api/inscription-agreements/:inscriptionCode/pdf
 * @desc Get PDF data for inscription agreement generation
 * @access Private
 */
router.get('/:inscriptionCode/pdf', InscriptionAgreementController.getPdfData);

/**
 * @route GET /api/inscription-agreements/:inscriptionCode/validate
 * @desc Validate inscription agreement for generation
 * @access Private
 */
router.get('/:inscriptionCode/validate', InscriptionAgreementController.validateAgreement);

/**
 * @route GET /api/inscription-agreements/:inscriptionCode/template/:format
 * @desc Get template data for specific format
 * @access Private
 */
router.get('/:inscriptionCode/template/:format', InscriptionAgreementController.getTemplateData);

module.exports = router;