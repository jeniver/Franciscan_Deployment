const logger = require('../utils/logger');
const NicheApplicationService = require('./NicheApplicationService');
const WakeRoomService = require('./WakeRoomService');
const EngraveApplicationService = require('./EngraveApplicationService');
const GateOfLifeRepository = require('../repositories/GateOfLifeRepository');
const { executeQuery } = require('../config/database');

/**
 * Reference Document Validator Service
 * Validates that reference documents exist before creating invoices
 * Matching ASP.NET ValidateInvoiceDetailsSave logic
 */
class ReferenceDocumentValidator {
  constructor() {
    this.nicheApplicationService = NicheApplicationService;
    this.wakeRoomService = new WakeRoomService();
    this.engraveApplicationService = EngraveApplicationService;
    // GateOfLifeRepository is exported as an instance, not a class
    this.gateOfLifeRepository = GateOfLifeRepository;
  }

  /**
   * Validate a single reference document
   * @param {string} refDocName - Reference document type (NAPP, WAPP, INCR, GOLA, DONA, OTHERS)
   * @param {string} refDocNumber - Reference document code
   * @param {number} churchId - Church ID for access control
   * @returns {Promise<boolean>} True if document exists, false otherwise
   */
  async validateReferenceDocument(refDocName, refDocNumber, churchId) {
    try {
      // OTHERS type requires no validation
      if (!refDocName || refDocName.toUpperCase() === 'OTHERS') {
        return true;
      }

      if (!refDocNumber || refDocNumber.trim().length === 0) {
        logger.warn(`Empty reference document number for type: ${refDocName}`);
        return false;
      }

      const docType = refDocName.toUpperCase();

      switch (docType) {
        case 'NAPP':
          // Niche Application
          return await this.validateNicheApplication(refDocNumber, churchId);

        case 'WAPP':
          // Wake Room Booking
          return await this.validateWakeRoomBooking(refDocNumber, churchId);

        case 'INCR':
          // Niche Inscription Request
          return await this.validateNicheInscriptionRequest(refDocNumber, churchId);

        case 'GOLA':
          // Gate of Life Application (Engrave Wall Application)
          return await this.validateGateOfLifeApplication(refDocNumber, churchId);

        case 'DONA':
          // Donation (uses Niche Application)
          return await this.validateNicheApplication(refDocNumber, churchId);

        default:
          logger.warn(`Unknown reference document type: ${refDocName}`);
          // Allow unknown types (for backward compatibility)
          return true;
      }
    } catch (error) {
      logger.error(`Error validating reference document ${refDocName}:${refDocNumber}:`, error);
      return false;
    }
  }

  /**
   * Validate niche application (NAPP, DONA)
   * @param {string} code - Application code
   * @param {number} churchId - Church ID
   * @returns {Promise<boolean>} True if exists
   */
  async validateNicheApplication(code, churchId) {
    try {
      if (!code || String(code).trim().length === 0) {
        logger.debug(`Empty code provided for niche application validation`);
        return false;
      }
      
      const normalizedCode = String(code).trim();
      
      // First try via service (may use cache)
      const result = await this.nicheApplicationService.getApplicationByCode(normalizedCode, churchId);
      if (result && result.success !== false) {
        logger.debug(`Niche application validated via service: ${normalizedCode}`);
        return true;
      }

      // If not found via service (might be cache issue), try direct repository query
      // This handles cases where application was just created
      const NicheApplicationRepository = require('../repositories/NicheApplicationRepository');
      let directApplication = await NicheApplicationRepository.getByCode(normalizedCode);
      
      // If not found, try with case-insensitive search
      if (!directApplication) {
        try {
          const { executeQuery } = require('../config/database');
          const caseInsensitiveQuery = `
            SELECT TOP 1 *
            FROM NicheApplication WITH(NOLOCK)
            WHERE UPPER(LTRIM(RTRIM(Code))) = UPPER(LTRIM(RTRIM(@code)))
          `;
          const caseResult = await executeQuery(caseInsensitiveQuery, { code: normalizedCode });
          if (caseResult.recordset && caseResult.recordset.length > 0) {
            directApplication = caseResult.recordset[0];
            logger.debug(`Niche application found via case-insensitive search: ${normalizedCode}`);
          }
        } catch (caseError) {
          logger.debug(`Case-insensitive search failed: ${caseError.message}`);
        }
      }
      
      if (directApplication) {
        // Verify churchId matches if application found
        if (churchId && directApplication.churchId && directApplication.churchId !== churchId) {
          logger.debug(`Niche application found but churchId mismatch: ${normalizedCode}`, {
            applicationChurchId: directApplication.churchId,
            requestedChurchId: churchId
          });
          return false;
        }
        logger.debug(`Niche application validated via direct repository query: ${normalizedCode}`);
        return true;
      }

      logger.debug(`Niche application not found: ${normalizedCode}`);
      return false;
    } catch (error) {
      logger.debug(`Error validating niche application ${code}:`, error.message);
      return false;
    }
  }

  /**
   * Validate wake room booking (WAPP)
   * @param {string} code - Booking code
   * @param {number} churchId - Church ID
   * @returns {Promise<boolean>} True if exists
   */
  async validateWakeRoomBooking(code, churchId) {
    try {
      const booking = await this.wakeRoomService.getWakeRoomBooking(code, churchId);
      return booking !== null && booking !== undefined;
    } catch (error) {
      logger.debug(`Wake room booking not found: ${code}`, error.message);
      return false;
    }
  }

  /**
   * Validate niche inscription request (INCR)
   * @param {string} code - Request code (can be "I-NAPP-XX" format or direct INCR code)
   * @param {number} churchId - Church ID
   * @returns {Promise<boolean>} True if exists or if it's a derived reference (I-NAPP-XX)
   */
  async validateNicheInscriptionRequest(code, churchId) {
    try {
      // Handle "I-NAPP-XX" format - this is a derived reference, not an actual INCR code
      // Extract the base application code and validate that instead
      if (code && code.toUpperCase().startsWith('I-NAPP-')) {
        const baseCode = code.substring(2); // Remove "I-" prefix to get "NAPP-XX"
        logger.debug(`INCR validation: Detected I-NAPP format, validating base application: ${baseCode}`);
        
        // Validate the base niche application instead
        // This is acceptable because inscription items are linked to niche applications
        const baseAppValid = await this.validateNicheApplication(baseCode, churchId);
        if (baseAppValid) {
          logger.debug(`INCR validation: Base application ${baseCode} exists, accepting I-NAPP reference`);
          return true;
        }
        
        // If base application doesn't exist, still try to find actual INCR code
        logger.debug(`INCR validation: Base application ${baseCode} not found, trying direct INCR lookup`);
      }

      // Try to find actual INCR code
      const query = `
        SELECT TOP 1 NicheInscriptionRequestId
        FROM NicheInscriptionRequest WITH(NOLOCK)
        WHERE Code = @code
          AND Status > 0
      `;

      const result = await executeQuery(query, { code });

      if (result.recordset && result.recordset.length > 0) {
        // Optionally check church ID if available in the table
        return true;
      }

      // For "I-NAPP-XX" format, if base application exists, accept it even if INCR doesn't exist yet
      // This allows invoice creation before inscription request is created
      if (code && code.toUpperCase().startsWith('I-NAPP-')) {
        const baseCode = code.substring(2);
        const baseAppValid = await this.validateNicheApplication(baseCode, churchId);
        if (baseAppValid) {
          logger.debug(`INCR validation: Accepting I-NAPP reference ${code} because base application ${baseCode} exists`);
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.debug(`Niche inscription request not found: ${code}`, error.message);
      return false;
    }
  }

  /**
   * Validate gate of life application (GOLA)
   * @param {string} code - Application code
   * @param {number} churchId - Church ID
   * @returns {Promise<boolean>} True if exists
   */
  async validateGateOfLifeApplication(code, churchId) {
    try {
      const application = await this.gateOfLifeRepository.getByCode(code, churchId);
      return application !== null && application !== undefined;
    } catch (error) {
      logger.debug(`Gate of Life application not found: ${code}`, error.message);
      return false;
    }
  }

  /**
   * Validate multiple invoice details
   * @param {Array} invoiceDetails - Array of invoice detail objects
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Validation result with isValid flag and docCode if invalid
   */
  async validateInvoiceDetails(invoiceDetails, churchId) {
    try {
      if (!invoiceDetails || invoiceDetails.length === 0) {
        return {
          isValid: true
        };
      }

      for (const detail of invoiceDetails) {
        const refDocName = detail.refDocName || detail.RefDocName;
        const refDocNumber = detail.refDocNumber || detail.RefDocNumber;
        const refType = detail.refType || detail.RefType;

        // Use refType if refDocName not provided
        const docType = refDocName || refType;

        if (!docType || docType.toUpperCase() === 'OTHERS') {
          continue; // No validation for OTHERS
        }

        const isValid = await this.validateReferenceDocument(
          docType,
          refDocNumber,
          churchId
        );

        if (!isValid) {
          return {
            isValid: false,
            docCode: refDocNumber,
            docType: docType
          };
        }
      }

      return {
        isValid: true
      };
    } catch (error) {
      logger.error('Error validating invoice details:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = new ReferenceDocumentValidator();

