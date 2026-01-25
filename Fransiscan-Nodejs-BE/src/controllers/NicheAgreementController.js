const BaseController = require('./BaseController');
const NicheAgreementService = require('../services/NicheAgreementService');
const logger = require('../utils/logger');

/**
 * Niche Agreement Controller
 * Handles HTTP requests for niche agreement operations
 */
class NicheAgreementController extends BaseController {
  constructor() {
    super();
    this.nicheAgreementService = new NicheAgreementService();
  }

  /**
   * Get niche agreement details by application number
   * GET /api/niche-agreements/:applicationNumber
   * Supports formats: "3795-1", "3795", or "3795-"
   */
  getNicheAgreementDetails = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Niche Agreement Details');

    const { applicationNumber } = req.params;

    try {
      // Basic validation
      if (!applicationNumber || applicationNumber.trim() === '') {
        return this.sendError(res, 'Application number is required', 400);
      }

      // Get niche agreement details (service will handle flexible format matching)
      const agreementDetails = await this.nicheAgreementService.getNicheAgreementDetails(applicationNumber);

      this.sendSuccess(res, agreementDetails, 'Niche agreement details retrieved successfully');
    } catch (error) {
      logger.error('Error in getNicheAgreementDetails:', error);

      if (error.message.includes('No niche agreement found') || error.message.includes('Multiple applications found')) {
        return this.sendError(res, error.message, 404);
      }

      if (error.message.includes('Application number is required') || error.message.includes('Invalid')) {
        return this.sendError(res, error.message, 400);
      }

      this.sendError(res, 'Failed to retrieve niche agreement details', 500);
    }
  });

  /**
   * Get application number suggestions for partial matches
   * GET /api/niche-agreements/suggestions/:partialApplicationNumber
   */
  getApplicationNumberSuggestions = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Application Number Suggestions');

    const { partialApplicationNumber } = req.params;

    try {
      if (!partialApplicationNumber || partialApplicationNumber.trim() === '') {
        return this.sendSuccess(res, [], 'No suggestions available');
      }

      const suggestions = await this.nicheAgreementService.getApplicationNumberSuggestions(partialApplicationNumber);

      this.sendSuccess(res, suggestions, 'Application number suggestions retrieved successfully');
    } catch (error) {
      logger.error('Error in getApplicationNumberSuggestions:', error);
      this.sendError(res, 'Failed to retrieve application number suggestions', 500);
    }
  });

  /**
   * Validate application number format
   * POST /api/niche-agreements/validate
   */
  validateApplicationNumber = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Validate Application Number');

    const { applicationNumber } = req.body;

    try {
      if (!applicationNumber) {
        return this.sendError(res, 'Application number is required', 400);
      }

      const isValid = this.nicheAgreementService.validateApplicationNumber(applicationNumber);

      this.sendSuccess(res, {
        isValid,
        applicationNumber,
        message: isValid ? 'Valid application number format' : 'Invalid application number format. Expected: number-number (e.g., 3795-1)'
      }, 'Application number validation completed');
    } catch (error) {
      logger.error('Error in validateApplicationNumber:', error);
      this.sendError(res, 'Failed to validate application number', 500);
    }
  });

  /**
   * Get niche agreement summary (lightweight version)
   * GET /api/niche-agreements/:applicationNumber/summary
   * Supports formats: "3795-1", "3795", or "3795-"
   */
  getNicheAgreementSummary = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Niche Agreement Summary');

    const { applicationNumber } = req.params;

    try {
      // Basic validation
      if (!applicationNumber || applicationNumber.trim() === '') {
        return this.sendError(res, 'Application number is required', 400);
      }

      // Get full details first (service will handle flexible format matching)
      const agreementDetails = await this.nicheAgreementService.getNicheAgreementDetails(applicationNumber);

      // Create summary version
      const summary = {
        applicationNumber: agreementDetails.applicationNumber,
        appliedDate: agreementDetails.appliedDate,
        agreementDate: agreementDetails.agreementDate,
        applicant: {
          name: agreementDetails.applicant.name,
          email: agreementDetails.applicant.email,
          mobileNo: agreementDetails.applicant.mobileNo
        },
        niche: {
          number: agreementDetails.niche.number,
          chapelName: agreementDetails.niche.chapelName,
          totalAmount: agreementDetails.niche.totalAmount
        },
        invoice: {
          invoiceNo: agreementDetails.invoice.invoiceNo,
          invoiceDate: agreementDetails.invoice.invoiceDate,
          receiptAmount: agreementDetails.invoice.receiptAmount
        },
        status: {
          agreementReady: agreementDetails.printReady.agreementReady,
          invoiceReady: agreementDetails.printReady.invoiceReady,
          receiptReady: agreementDetails.printReady.receiptReady,
          consentFormReady: agreementDetails.printReady.consentFormReady
        },
        metadata: {
          beneficiaryCount: agreementDetails.metadata.beneficiaryCount,
          nomineeCount: agreementDetails.metadata.nomineeCount,
          hasInvoice: agreementDetails.metadata.hasInvoice,
          hasReceipt: agreementDetails.metadata.hasReceipt
        }
      };

      this.sendSuccess(res, summary, 'Niche agreement summary retrieved successfully');
    } catch (error) {
      logger.error('Error in getNicheAgreementSummary:', error);

      if (error.message.includes('No niche agreement found')) {
        return this.sendError(res, error.message, 404);
      }

      if (error.message.includes('Application number is required')) {
        return this.sendError(res, error.message, 400);
      }

      this.sendError(res, 'Failed to retrieve niche agreement summary', 500);
    }
  });

  /**
   * Get Crystal Reports information for agreement
   * GET /api/niche-agreements/:applicationNumber/reports
   * Supports formats: "3795-1", "3795", or "3795-"
   */
  getCrystalReportsInfo = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Crystal Reports Info');

    const { applicationNumber } = req.params;

    try {
      // Basic validation
      if (!applicationNumber || applicationNumber.trim() === '') {
        return this.sendError(res, 'Application number is required', 400);
      }

      // Get niche agreement details (service will handle flexible format matching)
      const agreementDetails = await this.nicheAgreementService.getNicheAgreementDetails(applicationNumber);

      // Return just the Crystal Reports information
      this.sendSuccess(res, agreementDetails.crystalReports, 'Crystal Reports information retrieved successfully');
    } catch (error) {
      logger.error('Error in getCrystalReportsInfo:', error);

      if (error.message.includes('No niche agreement found')) {
        return this.sendError(res, error.message, 404);
      }

      if (error.message.includes('Application number is required')) {
        return this.sendError(res, error.message, 400);
      }

      this.sendError(res, 'Failed to retrieve Crystal Reports information', 500);
    }
  });

  /**
   * Get Agreement Data for PDF generation (Frontend will generate PDF)
   * GET /api/niche-agreements/:applicationNumber/pdf
   * Supports formats: "3795-1", "3795", or "3795-"
   */
  getAgreementPdf = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Agreement PDF Data');

    const { applicationNumber } = req.params;

    try {
      // Basic validation
      if (!applicationNumber || applicationNumber.trim() === '') {
        return this.sendError(res, 'Application number is required', 400);
      }

      // Get niche agreement details (service will handle flexible format matching)
      logger.info(`Fetching agreement data for PDF: ${applicationNumber}`);
      const agreementDetails = await this.nicheAgreementService.getNicheAgreementDetails(applicationNumber);

      // Structure data specifically for PDF generation
      const pdfData = {
        type: 'agreement',
        documentTitle: 'Niche Agreement',
        applicationNumber: agreementDetails.applicationCode,
        generatedAt: new Date().toISOString(),

        // Application Information
        application: {
          applicationNumber: agreementDetails.applicationCode,
          appliedDate: agreementDetails.appliedDate,
          agreementDate: agreementDetails.agreementDate,
          agreementStatus: agreementDetails.agreement?.status || null
        },

        // Applicant Information
        applicant: {
          name: agreementDetails.applicant.name,
          address: agreementDetails.applicant.address,
          mobileNo: agreementDetails.applicant.mobileNo,
          homeTelNo: agreementDetails.applicant.homeTelNo,
          officeTelNo: agreementDetails.applicant.officeTelNo,
          email: agreementDetails.applicant.email,
          idNo: agreementDetails.applicant.idNo,
          isCatholic: agreementDetails.applicant.isCatholic
        },

        // Niche Information
        niche: {
          number: agreementDetails.niche.number,
          rowNumber: agreementDetails.niche.rowNumber,
          wallName: agreementDetails.niche.wallName,
          chapelName: agreementDetails.niche.chapelName,
          totalAmount: agreementDetails.niche.totalAmount,
          lineAmount: agreementDetails.niche.lineAmount
        },

        // Beneficiaries
        beneficiaries: agreementDetails.beneficiaries || [],

        // Nominees
        nominees: [
          agreementDetails.nominee?.name
            ? {
              name: agreementDetails.nominee.name,
              address: agreementDetails.nominee.address,
              idNo: agreementDetails.nominee.idNo,
              mobileNo: agreementDetails.nominee.mobileNo,
              homeTelNo: agreementDetails.nominee.homeTelNo,
              officeTelNo: agreementDetails.nominee.officeTelNo,
              email: agreementDetails.nominee.email,
              relationship: agreementDetails.nominee.relationship
            }
            : null,
          agreementDetails.nominee2?.name
            ? {
              name: agreementDetails.nominee2.name,
              address: agreementDetails.nominee2.address,
              idNo: agreementDetails.nominee2.idNo,
              mobileNo: agreementDetails.nominee2.mobileNo,
              homeTelNo: agreementDetails.nominee2.homeTelNo,
              officeTelNo: agreementDetails.nominee2.officeTelNo,
              email: agreementDetails.nominee2.email,
              relationship: agreementDetails.nominee2.relationship
            }
            : null
        ].filter(nominee => nominee !== null),

        // Print Ready Status
        printReady: agreementDetails.printReady || {},

        // Metadata
        metadata: agreementDetails.metadata || {}
      };

      this.sendSuccess(res, pdfData, 'Agreement PDF data retrieved successfully');
    } catch (error) {
      logger.error('Error in getAgreementPdf:', error);

      if (error.message.includes('No niche agreement found')) {
        return this.sendError(res, error.message, 404);
      }

      if (error.message.includes('Application number is required')) {
        return this.sendError(res, error.message, 400);
      }

      this.sendError(res, 'Failed to retrieve agreement PDF data', 500);
    }
  });

  /**
   * Get Invoice Data for PDF generation (Frontend will generate PDF)
   * GET /api/niche-agreements/:applicationNumber/invoice-pdf
   * Supports formats: "3795-1", "3795", or "3795-"
   */
  getInvoicePdf = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Invoice PDF Data');

    const { applicationNumber } = req.params;
    const isHeadRequest = req.method === 'HEAD';

    try {
      // Basic validation
      if (!applicationNumber || applicationNumber.trim() === '') {
        if (isHeadRequest) {
          return res.status(400).end();
        }
        return this.sendError(res, 'Application number is required', 400);
      }

      // Get niche agreement details (service will handle flexible format matching)
      logger.info(`Fetching invoice data for PDF: ${applicationNumber}`);
      const agreementDetails = await this.nicheAgreementService.getNicheAgreementDetails(applicationNumber);

      // Check if invoice exists
      if (!agreementDetails.invoice || !agreementDetails.invoice.invoiceNo) {
        if (isHeadRequest) {
          return res.status(404).end();
        }
        return this.sendError(res, 'No invoice found for this application', 404);
      }

      // For HEAD requests, just send headers and end the response
      if (isHeadRequest) {
        return res.status(200).end();
      }

      // Structure data specifically for invoice PDF generation
      const pdfData = {
        type: 'invoice',
        documentTitle: 'Invoice',
        applicationNumber: agreementDetails.applicationCode,
        generatedAt: new Date().toISOString(),

        // Invoice Information
        invoice: {
          invoiceNo: agreementDetails.invoice.invoiceNo,
          invoiceDate: agreementDetails.invoice.invoiceDate,
          receiptAmount: agreementDetails.invoice.receiptAmount || 0,
          taxAmount: agreementDetails.invoice.taxAmount || 0,
          invoicePayingAmount: agreementDetails.invoice.invoicePayingAmount || 0,
          receiptPayingAmount: agreementDetails.invoice.receiptPayingAmount || 0,
          refDocNumber: agreementDetails.invoice.refDocNumber
        },

        // Application Information
        application: {
          applicationNumber: agreementDetails.applicationCode,
          appliedDate: agreementDetails.appliedDate,
          agreementDate: agreementDetails.agreementDate
        },

        // Applicant Information (Bill To)
        applicant: {
          name: agreementDetails.applicant.name,
          address: agreementDetails.applicant.address,
          mobileNo: agreementDetails.applicant.mobileNo,
          homeTelNo: agreementDetails.applicant.homeTelNo,
          officeTelNo: agreementDetails.applicant.officeTelNo,
          email: agreementDetails.applicant.email,
          idNo: agreementDetails.applicant.idNo
        },

        // Niche/Service Details
        niche: {
          number: agreementDetails.niche.number,
          rowNumber: agreementDetails.niche.rowNumber,
          wallName: agreementDetails.niche.wallName,
          chapelName: agreementDetails.niche.chapelName,
          totalAmount: agreementDetails.niche.totalAmount,
          lineAmount: agreementDetails.niche.lineAmount
        },

        // Payment Summary
        payment: {
          subtotal: agreementDetails.niche.totalAmount,
          taxAmount: agreementDetails.invoice.taxAmount || 0,
          totalAmount: agreementDetails.niche.totalAmount,
          paidAmount: agreementDetails.invoice.receiptAmount || 0,
          balanceDue: (agreementDetails.niche.totalAmount - (agreementDetails.invoice.receiptAmount || 0)).toFixed(2),
          isPaid: (agreementDetails.niche.totalAmount - (agreementDetails.invoice.receiptAmount || 0)) <= 0
        },

        // Print Ready Status
        printReady: agreementDetails.printReady || {},

        // Metadata
        metadata: agreementDetails.metadata || {}
      };

      this.sendSuccess(res, pdfData, 'Invoice PDF data retrieved successfully');
    } catch (error) {
      logger.error('Error in getInvoicePdf:', error);

      // Handle HEAD requests - just send status code, no body
      if (isHeadRequest) {
        if (error.message.includes('No niche agreement found') || 
            error.message.includes('No niche agreement found for application number')) {
          return res.status(404).end();
        }
        if (error.message.includes('Application number is required') || 
            error.message.includes('Invalid')) {
          return res.status(400).end();
        }
        return res.status(500).end();
      }

      // Handle GET requests with full error response
      if (error.message.includes('No niche agreement found') || 
          error.message.includes('No niche agreement found for application number')) {
        return this.sendError(res, error.message || 'No niche agreement found for this application number', 404);
      }

      if (error.message.includes('Application number is required') || 
          error.message.includes('Invalid')) {
        return this.sendError(res, error.message, 400);
      }

      this.sendError(res, 'Failed to retrieve invoice PDF data', 500);
    }
  });
}

module.exports = NicheAgreementController;
