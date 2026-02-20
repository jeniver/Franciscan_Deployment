const BaseService = require('./BaseService');
const Receipt = require('../models/Receipt');
const logger = require('../utils/logger');
const { cache } = require('../utils/cache');
const ReceiptPdfService = require('./ReceiptPdfService');
const cacheManager = require('../utils/cacheManager');

/**
 * Receipt service for business logic
 * Implements all receipt operations matching ASP.NET PaymentBL
 */
class ReceiptService extends BaseService {
  constructor(receiptRepository) {
    super(receiptRepository);
    this.repository = receiptRepository;
    this.pdfService = new ReceiptPdfService();
    this.reportCacheTtl = parseInt(process.env.RECEIPT_REPORT_CACHE_TTL || '120', 10);
    this.reportCachePrefix = 'receiptReport';
  }

  /**
   * Validate receipt data
   * @param {Object} data - Receipt data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Array} Array of validation errors
   */
  validateData(data, isUpdate = false) {
    const errors = [];
    const receipt = new Receipt(data);

    logger.debug('ReceiptService.validateData - paymentMode:', receipt.paymentMode, 'type:', typeof receipt.paymentMode);

    // Use model validation
    const modelErrors = receipt.validate();
    logger.debug('Model validation errors:', modelErrors);
    errors.push(...modelErrors);

    return errors;
  }

  /**
   * Get receipt by code
   * @param {string} code - Receipt code
   * @param {number} churchId - Church ID for access control
   * @param {boolean} allowFallback - If true, will try without churchId if not found with churchId (for PDF access)
   * @param {string} applicationCode - Optional application code type (NAPP, WAPP, INCR, GOLA) for filtering
   * @returns {Promise<Object>} Receipt with details
   */
  async getReceiptByCode(code, churchId, allowFallback = false, applicationCode = null) {
    try {
      if (!code || code.trim().length === 0) {
        throw new Error('Receipt code is required');
      }

      // Build cache key
      const cacheKey = cacheManager.buildReceiptKey(churchId, code);

      // Try cache first (only if not using fallback)
      if (!allowFallback) {
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
          logger.debug(`Receipt cache HIT: ${code}`);
          return {
            success: true,
            data: cached
          };
        }
        logger.debug(`Receipt cache MISS: ${code}`);
      }

      logger.info(`Getting receipt by code: ${code}, churchId: ${churchId}, allowFallback: ${allowFallback}${applicationCode ? `, applicationCode: ${applicationCode}` : ''}`);
      const receipt = await this.repository.getReceiptWithInvoiceAndDetails(code, churchId, allowFallback, applicationCode);
      if (!receipt) {
        logger.warn(`Receipt not found: code=${code}, churchId=${churchId}`);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Receipt not found'
          }
        };
      }

      // Log receipt data structure for debugging
      logger.debug(`Receipt data structure:`, {
        receiptId: receipt.receiptId,
        code: receipt.code,
        invoiceId: receipt.invoiceId,
        customerName: receipt.customerName,
        totalAmount: receipt.totalAmount,
        hasInvoice: !!receipt.invoice,
        invoiceDetailsCount: receipt.invoice?.details?.length || 0,
        receiptDetailsCount: receipt.details?.length || 0
      });

      // Cache the receipt (10 minutes)
      if (!allowFallback) {
        await cacheManager.set(cacheKey, receipt, 600);
        logger.debug(`Receipt cached: ${code} (TTL: 600s)`);
      }

      logger.info(`Receipt found: code=${code}, receiptId=${receipt.receiptId}, churchId=${receipt.churchId}`);
      return {
        success: true,
        data: receipt
      };
    } catch (error) {
      logger.error('Error getting receipt by code:', error);
      logger.error('Error details:', {
        code,
        churchId,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get receipt by invoice ID
   * @param {number} invoiceId - Invoice ID
   * @param {number} churchId - Church ID for access control
   * @returns {Promise<Object>} Receipt data or null
   */
  async getReceiptByInvoiceId(invoiceId, churchId) {
    try {
      if (!invoiceId) {
        throw new Error('Invoice ID is required');
      }

      logger.info(`Getting receipt by invoice ID: ${invoiceId}, churchId: ${churchId}`);
      const receipt = await this.repository.findByInvoiceId(invoiceId, churchId);

      if (!receipt) {
        logger.info(`No receipt found for invoice ID: ${invoiceId}`);
        return null;
      }

      logger.info(`Receipt found for invoice ID: ${invoiceId}, receiptId: ${receipt.ReceiptId}`);
      return receipt;
    } catch (error) {
      logger.error('Error getting receipt by invoice ID:', error);
      throw error;
    }
  }

  /**
   * Create receipt (matching ASP.NET PaymentBL.SaveReceipt)
   * @param {Object} receiptData - Receipt data
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Created receipt result
   */
  async createReceipt(receiptData, userId, churchId) {
    try {
      // Create receipt entity (include auth fields BEFORE validating)
      const receipt = new Receipt({
        ...receiptData,
        userId,
        churchId,
        transactionDate: receiptData.transactionDate || new Date(),
        status: receiptData.status || 2 // Default to paid status
      });

      // Normalize payment mode BEFORE validating
      if (typeof receipt.paymentMode === 'string') {
        receipt.paymentMode = Receipt.paymentModeToNumber(receipt.paymentMode);
      } else if (typeof receipt.paymentMode === 'number') {
        // ok
      } else if (receipt.paymentMode != null) {
        // numeric string -> number
        const n = Number(receipt.paymentMode);
        if (!Number.isNaN(n)) receipt.paymentMode = n;
      }

      // Validate final receipt object (header + details)
      const validation = receipt.validateWithDetails();
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Receipt validation failed',
            details: validation.errors
          }
        };
      }

      // Save receipt
      const receiptCode = await this.repository.createReceipt(receipt);

      if (!receiptCode) {
        return {
          success: false,
          error: {
            code: 'SAVE_FAILED',
            message: 'Failed to save receipt'
          }
        };
      }

      // Get the receipt ID for linking details
      const receiptId = await this.repository.getReceiptIdByCode(receiptCode);

      // Save receipt details if provided
      if (receipt.details && receipt.details.length > 0) {
        await this.repository.saveReceiptDetails(receiptId, receipt.details);
      }

      // Invalidate cache for this church's receipts
      await cacheManager.invalidate(cacheManager.buildInvalidationPattern('receipt', churchId));
      logger.debug(`Cache invalidated for church ${churchId} receipts`);

      return {
        success: true,
        data: {
          code: receiptCode,
          message: 'Receipt created successfully'
        }
      };
    } catch (error) {
      logger.error('Error creating receipt:', error);
      throw error;
    }
  }

  /**
   * Create receipt from invoice (matching ASP.NET InduvidualReceiptCapture.CaptureReceipt)
   * @param {Object} invoiceData - Invoice data
   * @param {Array} invoiceDetails - Invoice details array
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Created receipt result
   */
  async createReceiptFromInvoice(invoiceData, invoiceDetails, userId, churchId) {
    try {
      // Get invoice by code if invoiceId not provided
      let invoice = null;
      if (invoiceData.invoiceId) {
        // Invoice ID provided, use it
        invoice = { InvoiceId: invoiceData.invoiceId };
      } else if (invoiceData.code) {
        // Get invoice by code
        invoice = await this.repository.getInvoiceByCode(invoiceData.code, churchId);
        if (!invoice) {
          return {
            success: false,
            error: {
              code: 'INVOICE_NOT_FOUND',
              message: 'Invoice not found'
            }
          };
        }
      } else {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invoice ID or code is required'
          }
        };
      }

      // Check if a receipt already exists for this invoice - DISABLED per user request for flexibility
      /*
      const existingReceipt = await this.repository.findByInvoiceId(invoice.InvoiceId, churchId);
      if (existingReceipt && existingReceipt.status > 0) {
        return {
          success: false,
          error: {
            code: 'RECEIPT_ALREADY_EXISTS',
            message: 'A receipt has already been created for this invoice.',
            receiptCode: existingReceipt.Code || existingReceipt.code
          }
        };
      }
      */

      // Create receipt from invoice data
      const receipt = new Receipt({
        invoiceId: invoice.InvoiceId,
        transactionDate: new Date(),
        customerName: invoiceData.customerName || invoice.CustomerName,
        code: invoiceData.code || null, // Will be generated if not provided
        totalAmount: invoiceData.totalAmount || invoice.TotalAmount || 0,
        payingAmount: invoiceData.payingAmount || invoice.PayingAmount || 0,
        paymentMode: invoiceData.paymentMode || 'Cash',
        userId,
        churchId,
        status: invoiceData.status || 2,
        paymentModeDocNo: invoiceData.paymentModeDocNo || null,
        payeeName: invoiceData.payeeName || invoice.CustomerName,
        addressNo: invoiceData.addressNo || invoice.AddressNo || null,
        address: invoiceData.address || invoice.Address || null,
        address2: invoiceData.address2 || invoice.Address2 || null,
        addressCity: invoiceData.addressCity || invoice.AddressCity || null,
        districtCode: invoiceData.districtCode || invoice.DistrictCode || null,
        country: invoiceData.country || invoice.Country || null,
        outstandingAmount: invoiceData.outstandingAmount || 0
      });

      // Convert payment mode string to number
      if (typeof receipt.paymentMode === 'string') {
        receipt.paymentMode = Receipt.paymentModeToNumber(receipt.paymentMode);
      }

      // Save receipt
      const receiptCode = await this.repository.createReceipt(receipt);
      const receiptId = await this.repository.getReceiptIdByCode(receiptCode);

      // Save receipt details if provided
      if (invoiceDetails && invoiceDetails.length > 0) {
        const receiptDetails = invoiceDetails.map(detail => ({
          itemId: detail.itemId || 0,
          quantity: detail.quantity || 0,
          unitAmount: detail.unitAmount || 0,
          payingAmount: detail.payingAmount || 0,
          totalPayingAmount: detail.totalPayingAmount || 0,
          invoiceId: invoice.InvoiceId,
          refDocName: detail.refDocName || null,
          refDocNumber: detail.refDocNumber || null,
          refType: detail.refType || null,
          itemName: detail.itemName || detail.description || null,
          description: detail.description || detail.itemName || null
        }));

        await this.repository.saveReceiptDetails(receiptId, receiptDetails);
      } else if (invoice.details && invoice.details.length > 0) {
        // Use invoice details if receipt details not provided
        const receiptDetails = invoice.details.map(detail => ({
          itemId: detail.itemId || 0,
          quantity: detail.quantity || 0,
          unitAmount: detail.unitAmount || 0,
          payingAmount: detail.payingAmount || 0,
          totalPayingAmount: detail.totalPayingAmount || 0,
          invoiceId: invoice.InvoiceId,
          refDocName: detail.refDocName || null,
          refDocNumber: detail.refDocNumber || null,
          refType: detail.refType || null,
          itemName: detail.itemName || detail.description || null,
          description: detail.description || detail.itemName || null
        }));

        await this.repository.saveReceiptDetails(receiptId, receiptDetails);
      }

      // ✅ FIX: Update NicheApplication status from Draft (1) to Booked (3) when receipt is created
      // This ensures that once payment is received (receipt printed), the niche moves to booked state
      try {
        const { executeQuery } = require('../config/database');
        const refDocName = invoice.RefDocName || invoice.refDocName;
        const refDocNumber = invoice.RefDocNumber || invoice.refDocNumber;

        if (refDocName && refDocNumber) {
          const normalizedRefDocName = String(refDocName).trim().toUpperCase();
          const normalizedRefDocNumber = String(refDocNumber).trim();

          // Only update status for Niche Applications (NAPP)
          if (normalizedRefDocName === 'NAPP') {
            const updateStatusQuery = `
              UPDATE NicheApplication
              SET Status = 3
              WHERE Code = @code
                AND Status = 1
            `;

            await executeQuery(updateStatusQuery, { code: normalizedRefDocNumber });
            logger.info(`[ReceiptService] Updated NicheApplication status from Draft (1) to Booked (3) for code: ${normalizedRefDocNumber}`);
          }
        }
      } catch (statusUpdateError) {
        // Log but don't fail receipt creation if status update fails
        logger.warn('[ReceiptService] Failed to update NicheApplication status after receipt creation (non-critical):', {
          error: statusUpdateError.message,
          refDocName: invoice.RefDocName || invoice.refDocName,
          refDocNumber: invoice.RefDocNumber || invoice.refDocNumber
        });
      }

      // Invalidate cache for this church's receipts and invoices
      await cacheManager.invalidate(cacheManager.buildInvalidationPattern('receipt', churchId));
      await cacheManager.invalidate(cacheManager.buildInvalidationPattern('invoice', churchId));
      logger.debug(`Cache invalidated for church ${churchId} receipts and invoices`);

      return {
        success: true,
        data: {
          code: receiptCode,
          receiptId,
          message: 'Receipt created successfully from invoice'
        }
      };
    } catch (error) {
      logger.error('Error creating receipt from invoice:', error);
      throw error;
    }
  }

  /**
   * Get last receipt number
   * @returns {Promise<Object>} Last receipt number
   */
  async getLastReceiptNumber() {
    try {
      const lastNumber = await this.repository.getLastReceiptNumber();
      return {
        success: true,
        data: {
          lastReceiptNumber: lastNumber
        }
      };
    } catch (error) {
      logger.error('Error getting last receipt number:', error);
      throw error;
    }
  }

  /**
   * Get last miscellaneous receipt number
   * @returns {Promise<Object>} Last miscellaneous receipt number
   */
  async getLastMiscReceiptNumber() {
    try {
      const lastNumber = await this.repository.getLastMiscReceiptNumber();
      return {
        success: true,
        data: {
          lastMiscReceiptNumber: lastNumber
        }
      };
    } catch (error) {
      logger.error('Error getting last miscellaneous receipt number:', error);
      throw error;
    }
  }

  /**
   * Get receipt report (using ReceiptReport stored procedure)
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Object>} Receipt report with totals
   */
  async getReceiptReport(fromDate = null, toDate = null, options = {}) {
    try {
      const page = Math.max(1, options.page || 1);
      const maxLimit = parseInt(process.env.RECEIPT_REPORT_MAX_PAGE_SIZE || '250', 10);
      const limit = Math.min(Math.max(1, options.limit || 50), maxLimit);
      const sortBy = options.sortBy || null;
      const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';
      const searchTerm = options.searchTerm ? options.searchTerm.trim().toLowerCase() : null;

      const cacheKey = this.buildReportCacheKey(fromDate, toDate);
      let report = await cacheManager.get(cacheKey);

      if (!report) {
        report = await this.repository.getReceiptReport(fromDate, toDate);
        await cacheManager.set(cacheKey, report, this.reportCacheTtl);
      }

      let items = Array.isArray(report.data) ? [...report.data] : [];

      const AddressUtils = require('../utils/AddressUtils');

      // Map PaymentMode to labels, build full CustomerAddress, and ensure Receipt No
      items = items.map(item => {
        // Map Payment Mode to Label (1=Cash, 2=Cheque, 3=TT, 4=Others)
        const rawMode = item.PaymentMode || item.paymentMode;
        const modeLabel = Receipt.paymentModeToString(rawMode);

        const fullAddress = AddressUtils.formatAddress(item);

        // Robust Receipt No handling
        const receiptNo = item.Code || item.code || item.ReceiptCode || item.receiptCode || item.ReceiptNo || item.receiptNo || 'N/A';


        return {
          ...item,
          Code: receiptNo,
          code: receiptNo,
          ReceiptCode: receiptNo,
          receiptCode: receiptNo,
          ReceiptNo: receiptNo,
          receiptNo: receiptNo,
          PaymentMode: modeLabel,
          paymentMode: modeLabel,
          CustomerAddress: fullAddress,
          customerAddress: fullAddress,
          address: fullAddress
        };
      });

      // Deduplicate items based on unique identifier (Code or ReceiptId)
      // The stored procedure might return duplicates due to JOINs
      const seen = new Map();
      items = items.filter((row = {}) => {
        // Use Code as primary key, fallback to ReceiptId if Code doesn't exist
        const uniqueKey = row.Code || row.code || row.ReceiptId || row.receiptId;

        if (!uniqueKey) {
          // If no unique key, keep the row but log a warning
          logger.warn('Receipt row without unique identifier found:', row);
          return true;
        }

        const keyStr = String(uniqueKey);
        if (seen.has(keyStr)) {
          // Duplicate found, skip it
          return false;
        }

        seen.set(keyStr, true);
        return true;
      });

      logger.info(`Receipt report deduplication: ${report.data?.length || 0} rows -> ${items.length} unique rows`);

      if (searchTerm) {
        items = items.filter((row = {}) => Object.values(row).some((value) => {
          if (value === null || value === undefined) {
            return false;
          }
          return String(value).toLowerCase().includes(searchTerm);
        }));
      }

      if (items.length > 0) {
        const resolvedSortKey = sortBy && sortBy in items[0]
          ? sortBy
          : (items[0].TransactionDate
            ? 'TransactionDate'
            : Object.keys(items[0])[0]);

        items.sort((a, b) => {
          const aValue = a[resolvedSortKey];
          const bValue = b[resolvedSortKey];

          if (aValue === undefined || bValue === undefined) {
            return 0;
          }

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
          }

          const aString = String(aValue);
          const bString = String(bValue);
          return sortOrder === 'asc'
            ? aString.localeCompare(bString, undefined, { numeric: true, sensitivity: 'base' })
            : bString.localeCompare(aString, undefined, { numeric: true, sensitivity: 'base' });
        });
      }

      const totalRecords = items.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
      const safePage = Math.min(page, totalPages);
      const offset = (safePage - 1) * limit;
      const pagedItems = items.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          items: pagedItems,
          totals: report.totals,
          pagination: {
            page: safePage,
            limit,
            totalPages,
            totalRecords
          },
          filters: {
            fromDate,
            toDate,
            searchTerm,
            sortBy,
            sortOrder
          }
        }
      };
    } catch (error) {
      logger.error('Error getting receipt report:', error);
      throw error;
    }
  }

  /**
   * Get GOA monthly list (Gates of Life Monthly Report)
   * @param {string} fromDate - Start date (nvarchar format)
   * @param {string} toDate - End date (nvarchar format)
   * @returns {Promise<Object>} GOA monthly list
   */
  async getGOAMonthlyList(fromDate = null, toDate = null) {
    try {
      const list = await this.repository.getGOAMonthlyList(fromDate, toDate);
      return {
        success: true,
        data: list
      };
    } catch (error) {
      logger.error('Error getting GOA monthly list:', error);
      throw error;
    }
  }

  /**
   * Get inscription monthly list
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Object>} Inscription monthly list
   */
  async getInscriptionMonthlyList(fromDate = null, toDate = null) {
    try {
      const list = await this.repository.getInscriptionMonthlyList(fromDate, toDate);
      return {
        success: true,
        data: list
      };
    } catch (error) {
      logger.error('Error getting inscription monthly list:', error);
      throw error;
    }
  }

  /**
   * Get wake room monthly list
   * @param {string} fromDate - Start date (nvarchar format)
   * @param {string} toDate - End date (nvarchar format)
   * @returns {Promise<Object>} Wake room monthly list
   */
  async getWakeRoomMonthlyList(fromDate = null, toDate = null) {
    try {
      const list = await this.repository.getWakeRoomMonthlyList(fromDate, toDate);
      return {
        success: true,
        data: list
      };
    } catch (error) {
      logger.error('Error getting wake room monthly list:', error);
      throw error;
    }
  }

  /**
   * Get receipts by date range
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @param {number} churchId - Church ID for access control
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Receipts list
   */
  async getReceiptsByDateRange(fromDate, toDate, churchId, options = {}) {
    try {
      const receipts = await this.repository.findByDateRange(fromDate, toDate, churchId, options);

      // Additional deduplication by ReceiptId as a safety measure (repository already does this, but double-check)
      const seen = new Map();
      const uniqueReceipts = receipts.filter(receipt => {
        const receiptId = receipt.receiptId;
        if (!receiptId) {
          logger.warn('Receipt without ReceiptId found:', receipt);
          return true; // Keep it but log warning
        }
        if (seen.has(receiptId)) {
          logger.warn(`Duplicate receipt in service layer: ReceiptId=${receiptId}, Code=${receipt.code}`);
          return false;
        }
        seen.set(receiptId, true);
        return true;
      });

      return {
        success: true,
        data: uniqueReceipts
      };
    } catch (error) {
      logger.error('Error getting receipts by date range:', error);
      throw error;
    }
  }

  /**
   * Get invoice by code (for receipt creation)
   * @param {string} invoiceCode - Invoice code
   * @param {number} churchId - Church ID for access control
   * @param {string} [applicationCode] - Optional ref doc type (e.g., NAPP, WAPP, INCR, GOLA)
   * @returns {Promise<Object>} Invoice with details
   */
  async getInvoiceByCode(invoiceCode, churchId, applicationCode = null) {
    try {
      const invoice = await this.repository.getInvoiceByCode(invoiceCode, churchId, applicationCode);
      if (!invoice) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Invoice not found'
          }
        };
      }

      return {
        success: true,
        data: invoice
      };
    } catch (error) {
      logger.error('Error getting invoice by code:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   * @param {number} invoiceId - Invoice ID
   * @returns {Promise<Object>} Invoice with details
   */
  async getInvoiceById(invoiceId) {
    try {
      const invoice = await this.repository.getInvoiceById(invoiceId);
      if (!invoice) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Invoice not found'
          }
        };
      }

      return {
        success: true,
        data: invoice
      };
    } catch (error) {
      logger.error('Error getting invoice by ID:', error);
      throw error;
    }
  }

  buildReportCacheKey(fromDate, toDate) {
    const fromKey = fromDate ? new Date(fromDate).toISOString().split('T')[0] : 'null';
    const toKey = toDate ? new Date(toDate).toISOString().split('T')[0] : 'null';
    return `${this.reportCachePrefix}:${fromKey}:${toKey}`;
  }

  /**
   * Get receipt data with invoice for frontend PDF generation
   * @param {string} code - Receipt code
   * @param {number} churchId - Church ID for access control
   * @param {boolean} allowFallback - If true, will try without churchId if not found with churchId
   * @returns {Promise<Object>} Receipt data with invoice and details
   */
  async getReceiptDataForPdf(code, churchId, allowFallback = false, applicationCode = null) {
    try {
      if (!code || code.trim().length === 0) {
        throw new Error('Receipt code is required');
      }

      logger.info(`Getting receipt data for PDF: ${code}, churchId: ${churchId}, allowFallback: ${allowFallback}, applicationCode: ${applicationCode}`);

      // Get receipt with invoice and details (using JOIN query)
      // Pass applicationCode to filter by RefDocName if provided
      const receipt = await this.repository.getReceiptWithInvoiceAndDetails(code, churchId, allowFallback, applicationCode);
      if (!receipt) {
        logger.warn(`Receipt not found: code=${code}, churchId=${churchId}`);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Receipt not found'
          }
        };
      }

      // Invoice data is already included from the JOIN query
      const invoice = receipt.invoice || null;

      // Format the response data
      const pdfData = {
        receipt: {
          receiptId: receipt.receiptId,
          code: receipt.code,
          invoiceId: receipt.invoiceId,
          transactionDate: receipt.transactionDate,
          customerName: receipt.customerName,
          totalAmount: receipt.totalAmount || 0,
          payingAmount: receipt.payingAmount || 0,
          paymentMode: receipt.paymentMode,
          paymentModeDocNo: receipt.paymentModeDocNo,
          payeeName: receipt.payeeName,
          addressNo: receipt.addressNo,
          address: receipt.address,
          address2: receipt.address2,
          addressCity: receipt.addressCity,
          districtCode: receipt.districtCode,
          country: receipt.country,
          outstandingAmount: receipt.outstandingAmount || 0,
          status: receipt.status,
          churchId: receipt.churchId,
          userId: receipt.userId
        },
        invoice: invoice ? {
          invoiceId: invoice.InvoiceId || invoice.invoiceId,
          code: invoice.Code || invoice.code,
          invoiceNo: invoice.Code || invoice.code,
          transactionDate: invoice.TransactionDate || invoice.transactionDate,
          invoiceDate: invoice.TransactionDate || invoice.transactionDate,
          customerName: invoice.CustomerName || invoice.customerName,
          totalAmount: invoice.TotalAmount || invoice.totalAmount || 0,
          payingAmount: invoice.PayingAmount || invoice.payingAmount || 0,
          taxAmount: invoice.TaxAmount || invoice.taxAmount || 0,
          paymentMode: invoice.PaymentMode || invoice.paymentMode,
          paymentModeDocNo: invoice.PaymentModeDocNo || invoice.paymentModeDocNo,
          refDocNumber: invoice.RefDocNumber || invoice.refDocNumber,
          refDocName: invoice.RefDocName || invoice.refDocName,
          status: invoice.Status || invoice.status,
          churchId: invoice.ChurchId || invoice.churchId,
          userId: invoice.UserId || invoice.userId,
          details: invoice.details || []
        } : null,
        details: receipt.details || []
      };

      logger.info(`Receipt data retrieved successfully: code=${code}, receiptId=${receipt.receiptId}, hasInvoice=${!!invoice}`);
      return {
        success: true,
        data: pdfData
      };
    } catch (error) {
      logger.error('Error getting receipt data for PDF:', error);
      logger.error('Error details:', {
        code,
        churchId,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }

  async generateReceiptPdf(receiptData) {
    try {
      const invoice = receiptData.invoiceId
        ? await this.repository.getInvoiceById(receiptData.invoiceId)
        : null;

      return await this.pdfService.generateReceiptPdf({
        receipt: receiptData,
        invoice,
        details: receiptData.details || []
      });
    } catch (error) {
      logger.error('Error generating receipt PDF:', error);
      throw error;
    }
  }

  /**
   * Search receipts by receipt code, customer name, or invoice code
   * @param {Object} filters - Search filters
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} Search result
   */
  async searchReceipts(filters = {}, options = {}) {
    try {
      const page = Math.max(parseInt(options.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 200);

      const repositoryResult = await this.repository.searchReceipts({
        receiptCode: filters.receiptCode?.trim() || null,
        customerName: filters.customerName?.trim() || null,
        invoiceCode: filters.invoiceCode?.trim() || null,
        searchTerm: filters.query?.trim() || filters.search?.trim() || null,
        churchId: filters.churchId || null
      }, {
        page,
        limit,
        sortBy: options.sortBy || 'r.TransactionDate',
        sortOrder: options.sortOrder
      });

      return {
        success: true,
        data: {
          items: repositoryResult.items,
          pagination: repositoryResult.pagination
        }
      };
    } catch (error) {
      logger.error('Error searching receipts:', error);
      throw error;
    }
  }

  async generateInvoicePdf(invoiceData) {
    try {
      return await this.pdfService.generateInvoicePdf({
        invoice: invoiceData
      });
    } catch (error) {
      logger.error('Error generating invoice PDF:', error);
      throw error;
    }
  }
}

module.exports = ReceiptService;

