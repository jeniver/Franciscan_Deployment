const BaseService = require('./BaseService');
const Invoice = require('../models/Invoice');
const InvoiceDetail = require('../models/InvoiceDetail');
const ReferenceDocumentValidator = require('./ReferenceDocumentValidator');
const logger = require('../utils/logger');
const cacheManager = require('../utils/cacheManager');

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

  async syncApplicationStatusAfterInvoiceCreate(refDocName, refDocNumber, churchId) {
    const normalizedRefName = refDocName ? String(refDocName).trim().toUpperCase() : '';
    const normalizedRefCode = refDocNumber ? String(refDocNumber).trim() : '';

    if (!normalizedRefName || !normalizedRefCode || !churchId) {
      return;
    }

    if (normalizedRefName !== 'NAPP') {
      return;
    }

    const { executeRawQuery } = require('../config/knex');

    await executeRawQuery(`
      UPDATE NicheApplication
      SET Status = 3
      WHERE Code = @code
        AND ChurchId = @churchId
        AND Status <> 3
    `, {
      code: normalizedRefCode,
      churchId
    });

    await executeRawQuery(`
      UPDATE nb
      SET
        nb.BookingStatus = 3,
        nb.BookedDate = COALESCE(nb.BookedDate, GETDATE())
      FROM NicheBooking nb
      INNER JOIN NicheApplication na ON na.NicheApplicationId = nb.NicheApplicationId
      WHERE na.Code = @code
        AND nb.ChurchId = @churchId
        AND nb.BookingStatus > 0
        AND nb.BookingStatus <> 3
    `, {
      code: normalizedRefCode,
      churchId
    });
  }

  /**
   * Get invoice by code with caching
   * @param {string} code - Invoice code
   * @param {number} churchId - Church ID
   * @param {string} applicationCode - Optional application code
   * @returns {Promise<Object|null>} Invoice data or null
   */
  async getInvoiceByCode(code, churchId, applicationCode = null) {
    try {
      // Build cache key
      // If applicationCode/type is provided, we might want to include it or just rely on code
      // logic: code is usually unique enough, but for safety let's stick to code
      const cacheKey = cacheManager.buildInvoiceKey(churchId, code);

      // Try cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        logger.debug(`Invoice cache HIT: ${code}`);
        return cached;
      }

      // Cache miss - fetch from repository
      logger.debug(`Invoice cache MISS: ${code}`);
      const invoice = await this.repository.getInvoiceByCode(code, churchId, applicationCode);

      if (invoice) {
        // Cache for 10 minutes
        await cacheManager.set(cacheKey, invoice, 600);
        logger.debug(`Invoice cached: ${code} (TTL: 600s)`);
      }

      return invoice;
    } catch (error) {
      logger.error(`Error getting invoice by code: ${code}`, error);
      throw error;
    }
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
      const result = await withTransaction(async (trx) => {
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
            // Inscription Request - Note: NicheInscriptionRequest table does not have a Status column
            logger.info(`Inscription request ${refDocNumber} payment recorded - status tracked in Invoice`);
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

      // Invalidate cache for this specific invoice and its reference document
      try {
        const cacheKey = cacheManager.buildInvoiceKey(churchId, code);
        await cacheManager.del(cacheKey);

        // Also invalidate by refDoc if applicable
        if (result.linkedEntity?.code) {
          const refCacheKey = cacheManager.buildInvoiceKey(churchId, result.linkedEntity.code);
          await cacheManager.del(refCacheKey);
        }

        logger.debug(`Cache invalidated for invoice ${code} and linked entities`);
      } catch (cacheError) {
        logger.warn('Non-critical cache invalidation failure:', cacheError.message);
      }

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

      // 4. Check for existing receipt (Requirement: Invoices cannot be created if a receipt exists for an application)
      // DISABLED per user request to allow more flexibility in invoice/receipt creation flow
      /*
      const ReceiptRepository = require('../repositories/ReceiptRepository');
      const receiptRepo = new ReceiptRepository();
      const existingReceipt = await receiptRepo.existsByRefDocNumber(baseRefDocNumber, churchId);
 
      if (existingReceipt) {
        return {
          success: false,
          error: {
            code: 'RECEIPT_ALREADY_EXISTS',
            message: `An active receipt already exists for this application code: ${baseRefDocNumber}. No invoice can be created.`,
            receiptCode: existingReceipt.Code || existingReceipt.code
          }
        };
      }
      */

      // 5. Reference Document Validation - SKIPPED per requirement
      // Original validation was causing issues with valid Ref Document Numbers
      // The validation step has been removed to allow invoice creation
      logger.debug('Reference document validation skipped per requirement');

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
        taxAmount: invoiceData.taxAmount || null,
        // Add address fields
        addressNo: invoiceData.addressNo || null,
        address: invoiceData.address || null,
        address2: invoiceData.address2 || null,
        addressCity: invoiceData.addressCity || null,
        districtCode: invoiceData.districtCode || null,
        country: invoiceData.country || null
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
          // InvoiceId is not known yet during validation; use a temporary positive value
          // so InvoiceDetail.validate() can still validate other fields.
          invoiceId: 1
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

      try {
        await this.syncApplicationStatusAfterInvoiceCreate(
          normalizedInvoiceRefDocName,
          invoice.refDocNumber,
          churchId
        );
      } catch (statusSyncError) {
        logger.warn('Non-critical status sync after invoice creation failed:', statusSyncError.message);
      }

      // Invalidate cache for this specific invoice and its reference document
      try {
        await cacheManager.del(cacheManager.buildInvoiceKey(churchId, invoiceCode));
        if (invoice.refDocNumber) {
          await cacheManager.del(cacheManager.buildInvoiceKey(churchId, invoice.refDocNumber));
        }
        logger.debug(`Cache invalidated for invoice ${invoiceCode} and refDoc ${invoice.refDocNumber}`);

        // ✅ NEW: Link any existing receipts for this application to the new invoice
        const ReceiptRepository = require('../repositories/ReceiptRepository');
        const receiptRepo = new ReceiptRepository();
        await receiptRepo.linkReceiptsToInvoice(invoice.refDocNumber, invoiceId, churchId);
      } catch (cacheError) {
        logger.warn('Non-critical post-save failure (cache or receipt linking):', cacheError.message);
      }

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

      // Invalidate cache for this invoice and church
      await cacheManager.del(cacheManager.buildInvoiceKey(churchId, effectiveCode));
      await cacheManager.invalidate(cacheManager.buildInvalidationPattern('invoice', churchId));
      logger.debug(`Cache invalidated for invoice ${effectiveCode}`);

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

  /**
   * Save invoice without reference document validation
   * Used for standalone invoice creation where no application reference is required
   * @param {Object} invoiceData - Invoice header data
   * @param {Array} invoiceDetails - Invoice detail items
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Result object with success flag and data
   */
  async saveInvoiceWithoutValidation(invoiceData, invoiceDetails, userId, churchId) {
    try {
      // 1. Validate input data
      if (!invoiceData) {
        throw new Error('Invoice data is required');
      }

      if (!invoiceDetails || invoiceDetails.length === 0) {
        throw new Error('Invoice details are required');
      }

      // Skip reference document validation and duplicate check for standalone invoices

      // 2. Generate Invoice Code
      const invoiceCode = await this.repository.generateInvoiceCode();

      // 3. Prepare Invoice object
      const firstDetail = invoiceDetails[0];
      const invoiceRefDocName = invoiceData.refDocName || firstDetail.refDocName;
      const normalizedInvoiceRefDocName = invoiceRefDocName ? String(invoiceRefDocName).trim().toUpperCase() : null;

      // Use the provided refDocNumber or create a default one for standalone invoices
      let baseRefDocNumber = invoiceData.refDocNumber || '';
      if (!baseRefDocNumber && firstDetail?.refDocNumber) {
        baseRefDocNumber = String(firstDetail.refDocNumber).trim();
      }

      const invoice = new Invoice({
        code: invoiceCode,
        transactionDate: invoiceData.transactionDate || new Date(),
        refDocNumber: baseRefDocNumber, // May be empty for standalone invoices
        refDocName: normalizedInvoiceRefDocName || 'OTHERS',
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
        taxAmount: invoiceData.taxAmount || null,
        // Add address fields
        addressNo: invoiceData.addressNo || null,
        address: invoiceData.address || null,
        address2: invoiceData.address2 || null,
        addressCity: invoiceData.addressCity || null,
        districtCode: invoiceData.districtCode || null,
        country: invoiceData.country || null
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
          // InvoiceId is not known yet during validation; use a temporary positive value
          // so InvoiceDetail.validate() can still validate other fields.
          invoiceId: 1
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

      // 4. Save Invoice and Details (transaction-based)
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

      logger.info(`Standalone invoice saved successfully. InvoiceId: ${invoiceId}, Code: ${invoiceCode}`, {
        invoiceId,
        invoiceCode,
        refDocNumber: invoice.refDocNumber,
        refDocName: invoice.refDocName,
        churchId: invoice.churchId,
        status: invoice.status
      });

      // Invalidate cache for this specific invoice
      try {
        await cacheManager.del(cacheManager.buildInvoiceKey(churchId, invoiceCode));
        if (invoice.refDocNumber) {
          await cacheManager.del(cacheManager.buildInvoiceKey(churchId, invoice.refDocNumber));
        }
        logger.debug(`Cache invalidated for standalone invoice ${invoiceCode}`);
      } catch (cacheError) {
        logger.warn('Non-critical cache invalidation failure:', cacheError.message);
      }

      return {
        success: true,
        data: {
          invoiceId: invoiceId,
          invoiceCode: invoiceCode
        },
        message: 'Standalone invoice created successfully'
      };
    } catch (error) {
      logger.error('Error saving standalone invoice:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to save standalone invoice'
        }
      };
    }
  }
}

module.exports = InvoiceService;
