const BaseService = require('./BaseService');
const Invoice = require('../models/Invoice');
const InvoiceDetail = require('../models/InvoiceDetail');
const ReferenceDocumentValidator = require('./ReferenceDocumentValidator');
const logger = require('../utils/logger');

/**
 * Invoice service for business logic
 */
class InvoiceService extends BaseService {
  constructor(invoiceRepository) {
    super(invoiceRepository);
  }

  /**
   * Validate invoice data
   * @param {Object} data - Invoice data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Array} Array of validation errors
   */
  validateData(data, isUpdate = false) {
    const errors = [];
    const invoice = new Invoice(data);

    // Use model validation
    const modelErrors = invoice.validate();
    errors.push(...modelErrors);

    return errors;
  }

  /**
   * Mark invoice as paid
   * @param {number} invoiceId - Invoice ID
   * @returns {Promise<Invoice|null>} Updated invoice or null
   */
  async markAsPaid(invoiceId) {
    try {
      return await this.repository.markAsPaid(invoiceId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record payment for invoice (with transaction)
   * Updates invoice status and linked entity status
   * @param {string} code - Invoice code
   * @param {Object} paymentData - Payment details
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Payment result
   */
  async recordPayment(code, paymentData, userId, churchId) {
    const { withTransaction, executeRawQuery } = require('../config/knex');
    const logger = require('../utils/logger');

    try {
      // Execute payment within transaction
      const result = await withTransaction(async(trx) => {
        // 1. Get invoice by code
        const getInvoiceQuery = `
          SELECT * FROM Invoice 
          WHERE Code = @code AND Status > 0
        `;
        const invoiceResult = await executeRawQuery(getInvoiceQuery, { code });

        if (!invoiceResult.recordset || invoiceResult.recordset.length === 0) {
          throw new Error('INVOICE_NOT_FOUND');
        }

        const invoice = invoiceResult.recordset[0];

        // 2. Check church ID access
        if (invoice.ChurchId !== churchId) {
          throw new Error('ACCESS_DENIED');
        }

        // 3. Update invoice status to paid
        const updateInvoiceQuery = `
          UPDATE Invoice 
          SET 
            Status = 2,
            PaymentMode = @paymentMode,
            PaymentModeDocNo = @paymentModeDocNo,
            PayingAmount = @payingAmount,
            TransactionDate = GETDATE()
          WHERE Code = @code
        `;

        await executeRawQuery(updateInvoiceQuery, {
          code,
          paymentMode: paymentData.paymentMode || 'Cash',
          paymentModeDocNo: paymentData.paymentModeDocNo || null,
          payingAmount: paymentData.amount || invoice.TotalAmount
        });

        // 4. Get invoice details to find linked entity
        const getDetailsQuery = `
          SELECT RefDocName, RefDocNumber 
          FROM InvoiceDetail 
          WHERE InvoiceId = @invoiceId
        `;
        const detailsResult = await executeRawQuery(getDetailsQuery, {
          invoiceId: invoice.InvoiceId
        });

        // 5. Update linked entity status if exists
        if (detailsResult.recordset && detailsResult.recordset.length > 0) {
          const detail = detailsResult.recordset[0];
          const refDocName = detail.RefDocName;
          const refDocNumber = detail.RefDocNumber;

          logger.info(`Updating linked entity: ${refDocName} - ${refDocNumber}`);

          // Update entity status based on type
          if (refDocName === 'NAPP') {
            // Niche Application
            await executeRawQuery(`
              UPDATE NicheApplication 
              SET Status = 3 
              WHERE Code = @code
            `, { code: refDocNumber });
          } else if (refDocName === 'INCR') {
            // Inscription Request
            await executeRawQuery(`
              UPDATE NicheInscriptionRequest 
              SET Status = 3 
              WHERE Code = @code
            `, { code: refDocNumber });
          } else if (refDocName === 'WAPP') {
            // Wake Room Booking
            await executeRawQuery(`
              UPDATE WakeRoomBooking 
              SET Status = 3 
              WHERE Code = @code
            `, { code: refDocNumber });
          } else if (refDocName === 'GOLA') {
            // Engrave Wall Application
            // Note: EngraveWallApplication table does not have a Status column
            // Status is tracked via the Invoice.Status field (already updated above)
            logger.info(`Gate of Life application ${refDocNumber} payment recorded - status tracked in Invoice`);
          }
        }

        return {
          invoiceCode: code,
          invoiceId: invoice.InvoiceId,
          amount: paymentData.amount || invoice.TotalAmount,
          linkedEntity: detailsResult.recordset && detailsResult.recordset.length > 0
            ? {
              type: detailsResult.recordset[0].RefDocName,
              code: detailsResult.recordset[0].RefDocNumber
            }
            : null
        };
      });

      logger.info(`Payment recorded successfully for invoice: ${code}`);

      return {
        success: true,
        data: result,
        message: 'Payment recorded successfully'
      };
    } catch (error) {
      logger.error('Failed to record payment:', error);

      if (error.message === 'INVOICE_NOT_FOUND') {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Invoice not found'
          }
        };
      }

      if (error.message === 'ACCESS_DENIED') {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      throw error;
    }
  }

  /**
   * Save invoice with validation and duplicate checking (matching ASP.NET InvoiceBL.SaveInvoice)
   * @param {Object} invoiceData - Invoice header data
   * @param {Array} invoiceDetails - Invoice line items
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Result with invoiceId and invoiceCode
   */
  async saveInvoice(invoiceData, invoiceDetails, userId, churchId) {
    try {
      // 1. Validate input data
      if (!invoiceData) {
        throw new Error('Invoice data is required');
      }

      if (!invoiceDetails || invoiceDetails.length === 0) {
        throw new Error('Invoice details are required');
      }

      // 2. Extract ItemId and RefDocNumber from first detail (matching ASP.NET logic)
      const firstDetail = invoiceDetails[0];
      const itemId = firstDetail.itemId;
      const refDocNumber = firstDetail.refDocNumber;

      if (!itemId || itemId <= 0) {
        throw new Error('Item ID is required in invoice details');
      }

      if (!refDocNumber) {
        throw new Error('Reference document number is required in invoice details');
      }

      // CRITICAL: For invoice header RefDocNumber, use the base application code
      // If invoiceData.refDocNumber is provided, use it (it should be the base code like "NAPP-56")
      // Otherwise, extract base code from detail RefDocNumber (handle "I-NAPP-56" -> "NAPP-56")
      let baseRefDocNumber = invoiceData.refDocNumber;
      if (!baseRefDocNumber && refDocNumber) {
        const normalizedDetailRef = String(refDocNumber).trim();
        // If detail RefDocNumber starts with "I-", it's an inscription item - extract base code
        if (normalizedDetailRef.toUpperCase().startsWith('I-')) {
          baseRefDocNumber = normalizedDetailRef.substring(2); // Remove "I-" prefix
        } else {
          baseRefDocNumber = normalizedDetailRef;
        }
      }
      
      // Normalize base RefDocNumber
      baseRefDocNumber = baseRefDocNumber ? String(baseRefDocNumber).trim() : null;

      // 3. Duplicate Check (matching ASP.NET GetDuplicateInvoice)
      const duplicate = await this.repository.getDuplicateInvoice(
        invoiceData.customerName,
        itemId,
        refDocNumber,
        invoiceData.transactionDate || new Date()
      );

      if (duplicate) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_INVOICE',
            message: 'Duplicate Invoice Found'
          }
        };
      }

      // 4. Reference Document Validation (matching ASP.NET ValidateInvoiceDetailsSave)
      // CRITICAL: For newly created applications, validation might fail due to cache/timing
      // We'll be more lenient and retry validation if it fails
      let validationResult = await ReferenceDocumentValidator.validateInvoiceDetails(
        invoiceDetails,
        churchId
      );

      // If validation fails, retry once after a brief delay (handles newly created applications)
      if (!validationResult.isValid) {
        logger.warn(`Initial reference document validation failed, retrying after delay:`, {
          docCode: validationResult.docCode,
          docType: validationResult.docType,
          error: validationResult.error
        });
        
        // Wait 150ms for database consistency
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Retry validation
        validationResult = await ReferenceDocumentValidator.validateInvoiceDetails(
          invoiceDetails,
          churchId
        );
      }

      if (!validationResult.isValid) {
        // Log detailed error for debugging
        logger.error('Reference document validation failed after retry:', {
          docCode: validationResult.docCode,
          docType: validationResult.docType,
          error: validationResult.error,
          invoiceDetails: invoiceDetails.map(d => ({
            itemId: d.itemId,
            refDocNumber: d.refDocNumber,
            refDocName: d.refDocName
          }))
        });
        
        return {
          success: false,
          error: {
            code: 'INVALID_REF_DOCUMENT',
            message: `Wrong Ref Document Number: ${validationResult.docCode || 'Unknown'}`,
            details: {
              docCode: validationResult.docCode,
              docType: validationResult.docType
            }
          }
        };
      }

      // 5. Generate Invoice Code (matching ASP.NET GetLastInvoiceCode)
      const invoiceCode = await this.repository.generateInvoiceCode();

      // 6. Prepare Invoice object
      // CRITICAL: Use baseRefDocNumber for invoice header (not detail RefDocNumber which might be "I-NAPP-XX")
      const invoiceRefDocName = invoiceData.refDocName || firstDetail.refDocName;
      const normalizedInvoiceRefDocName = invoiceRefDocName ? String(invoiceRefDocName).trim().toUpperCase() : null;
      
      const invoice = new Invoice({
        code: invoiceCode,
        transactionDate: invoiceData.transactionDate || new Date(),
        refDocNumber: baseRefDocNumber, // Use base application code (e.g., "NAPP-56", not "I-NAPP-56")
        refDocName: normalizedInvoiceRefDocName,
        customerName: invoiceData.customerName,
        totalAmount: invoiceData.totalAmount || 0,
        payingAmount: invoiceData.payingAmount || null,
        paymentMode: invoiceData.paymentMode || null,
        paymentModeDocNo: invoiceData.paymentModeDocNo || null,
        userId: userId,
        churchId: churchId,
        status: 1, // Active
        nicheApplicationId: invoiceData.nicheApplicationId || null,
        taxCode: invoiceData.taxCode || null,
        taxPercentage: invoiceData.taxPercentage || null,
        taxAmount: invoiceData.taxAmount || null
      });

      // Validate invoice
      const invoiceErrors = invoice.validate();
      if (invoiceErrors.length > 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invoice validation failed',
            details: invoiceErrors
          }
        };
      }

      // Validate invoice details
      for (const detailData of invoiceDetails) {
        const detail = new InvoiceDetail({
          ...detailData,
          invoiceId: 0 // Will be set after invoice is created
        });

        const detailErrors = detail.validate();
        if (detailErrors.length > 0) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invoice detail validation failed',
              details: detailErrors
            }
          };
        }
      }

      // 7. Save Invoice and Details (transaction-based)
      const invoiceId = await this.repository.addInvoiceAndDetail(invoice, invoiceDetails);

      if (!invoiceId || invoiceId <= 0) {
        return {
          success: false,
          error: {
            code: 'SAVE_FAILED',
            message: 'Failed to save invoice'
          }
        };
      }

      logger.info(`Invoice saved successfully. InvoiceId: ${invoiceId}, Code: ${invoiceCode}`, {
        invoiceId,
        invoiceCode,
        refDocNumber: invoice.refDocNumber || invoiceDetails[0]?.refDocNumber,
        refDocName: invoice.refDocName || invoiceDetails[0]?.refDocName,
        churchId: invoice.churchId,
        status: invoice.status
      });

      return {
        success: true,
        data: {
          invoiceId: invoiceId,
          invoiceCode: invoiceCode
        },
        message: 'Invoice created successfully'
      };
    } catch (error) {
      logger.error('Error saving invoice:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to save invoice'
        }
      };
    }
  }

  /**
   * Cancel (soft delete) an invoice by code.
   * Sets Status = 0 on the matching invoice, preserving header and detail rows.
   * @param {string} code - Invoice code
   * @param {number} churchId - Church ID for access control
   * @returns {Promise<Object>} Result object with success flag and optional error
   */
  async cancelInvoiceByCode(code, churchId) {
    try {
      if (!code || !code.trim()) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invoice code is required'
          }
        };
      }

      // Verify invoice exists and belongs to this church
      const existing = await this.repository.getInvoiceByCode(code, churchId, null);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Invoice not found'
          }
        };
      }

      const effectiveCode = existing.code || existing.Code || code.trim();
      const cancelled = await this.repository.cancelInvoiceByCode(effectiveCode, churchId);

      if (!cancelled) {
        return {
          success: false,
          error: {
            code: 'CANCEL_FAILED',
            message: 'Failed to cancel invoice'
          }
        };
      }

      logger.info(`Invoice cancelled (soft delete): Code=${effectiveCode}, ChurchId=${churchId}`);

      return {
        success: true,
        data: {
          invoiceCode: effectiveCode
        }
      };
    } catch (error) {
      logger.error('Error cancelling invoice:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to cancel invoice'
        }
      };
    }
  }
}

module.exports = InvoiceService;
