const BaseRepository = require('./BaseRepository');
const { executeQuery, executeProcedure } = require('../config/database');
const logger = require('../utils/logger');
const Receipt = require('../models/Receipt');
const ReceiptItemRepository = require('./ReceiptItemRepository');

/**
 * Receipt repository for database operations
 * Implements all receipt-related stored procedures and queries
 */
class ReceiptRepository extends BaseRepository {
  constructor() {
    super('Receipt');
    this.receiptItemRepository = new ReceiptItemRepository();
  }

  getPrimaryKey() {
    return 'ReceiptId';
  }

  /**
   * Normalize receipt code to 6-digit zero-padded format
   * Receipt codes are stored as 6-digit strings (e.g., "053130" not "53130")
   * @param {string} code - Receipt code (can be numeric or already padded)
   * @returns {string} Normalized 6-digit code
   */
  normalizeReceiptCode(code) {
    if (!code) return code;

    // If it's already a string with leading zeros, return as is if it's 6 digits
    const codeStr = String(code).trim();

    // If it's numeric, pad it to 6 digits
    if (/^\d+$/.test(codeStr)) {
      return codeStr.padStart(6, '0');
    }

    // Otherwise return as is (might be non-numeric code)
    return codeStr;
  }

  /**
   * Diagnostic method to check if receipt exists with similar codes
   * @param {string} code - Receipt code to search for
   * @returns {Promise<Array>} Array of similar receipt codes found
   */
  async findSimilarCodes(code) {
    try {
      if (!code) return [];

      const normalizedCode = this.normalizeReceiptCode(code);
      const searchPattern = `%${normalizedCode}%`;

      const query = `
        SELECT TOP 10 Code, ReceiptId, ChurchId, Status, TransactionDate, CustomerName
        FROM Receipt 
        WHERE Code LIKE @pattern OR Code LIKE @pattern2
        ORDER BY ReceiptId DESC
      `;

      const result = await executeQuery(query, {
        pattern: searchPattern,
        pattern2: `%${code.trim()}%`
      });

      return result.recordset || [];
    } catch (error) {
      logger.error('Error finding similar codes:', error);
      return [];
    }
  }

  buildInvoiceCodeVariations(invoiceCode) {
    if (!invoiceCode) {
      return [];
    }

    const variations = new Set();
    const trimmed = String(invoiceCode).trim();
    if (!trimmed) {
      return [];
    }

    const compact = trimmed.replace(/\s+/g, '');
    const upper = compact.toUpperCase();

    variations.add(trimmed);
    variations.add(compact);
    variations.add(upper);

    if (!/^INV[-_]/i.test(compact)) {
      variations.add(`INV-${compact}`);
      variations.add(`INV-${upper}`);
    } else {
      const withoutPrefix = compact.replace(/^INV[-_]/i, '');
      variations.add(withoutPrefix);
      variations.add(withoutPrefix.toUpperCase());
    }

    return Array.from(variations).filter(Boolean);
  }

  async findSimilarInvoiceCodes(code, churchId = null) {
    try {
      if (!code) {
        return [];
      }

      const likeValue = `%${String(code).trim().replace(/[%_]/g, '')}%`;
      let query = `
        SELECT TOP 5 Code, InvoiceId, ChurchId, Status
        FROM Invoice
        WHERE Code LIKE @likeValue
      `;
      const params = { likeValue };

      if (churchId) {
        query += ' AND ChurchId = @churchId';
        params.churchId = churchId;
      }

      query += ' ORDER BY Code';

      const result = await executeQuery(query, params);
      return result.recordset || [];
    } catch (error) {
      logger.error('Error finding similar invoice codes:', error);
      return [];
    }
  }

  /**
   * Get receipt by code with comprehensive search
   * @param {string} code - Receipt code (will be normalized to 6-digit format)
   * @param {number} churchId - Church ID for access control (optional, will try without if not found)
   * @param {boolean} allowFallback - If true, will try without churchId if not found with churchId
   * @returns {Promise<Receipt|null>} Receipt or null
   */
  async findByCode(code, churchId = null, allowFallback = false) {
    try {
      if (!code) {
        return null;
      }

      // Normalize code to 6-digit format (e.g., "53130" -> "053130")
      const normalizedCode = this.normalizeReceiptCode(code);
      const originalCode = String(code).trim();

      if (code !== normalizedCode) {
        logger.info(`Receipt code normalized: "${code}" -> "${normalizedCode}"`);
      }

      // Try multiple code variations to handle edge cases
      const codeVariations = [normalizedCode];
      if (originalCode !== normalizedCode) {
        codeVariations.push(originalCode);
      }
      // Also try with leading/trailing spaces removed
      const trimmedNormalized = normalizedCode.trim();
      if (trimmedNormalized !== normalizedCode) {
        codeVariations.push(trimmedNormalized);
      }

      // First try with churchId if provided
      if (churchId) {
        for (const codeVar of codeVariations) {
          // Try exact match (case-sensitive)
          let query = `
            SELECT * FROM Receipt 
            WHERE Code = @code AND ChurchId = @churchId
          `;
          const params = { code: codeVar, churchId };

          let result = await executeQuery(query, params);
          if (result.recordset && result.recordset.length > 0) {
            logger.info(`Receipt found with churchId filter (exact match): code=${codeVar}, churchId=${churchId}`);
            return new Receipt(result.recordset[0]);
          }

          // Try case-insensitive match with UPPER
          query = `
            SELECT * FROM Receipt 
            WHERE UPPER(LTRIM(RTRIM(Code))) = UPPER(LTRIM(RTRIM(@code))) AND ChurchId = @churchId
          `;
          result = await executeQuery(query, params);
          if (result.recordset && result.recordset.length > 0) {
            logger.info(`Receipt found with churchId filter (case-insensitive): code=${codeVar}, churchId=${churchId}`);
            return new Receipt(result.recordset[0]);
          }
        }

        // If not found and fallback allowed, try without churchId
        if (allowFallback) {
          logger.warn(`Receipt not found with churchId=${churchId}, trying without churchId filter for codes: ${codeVariations.join(', ')}`);
          for (const codeVar of codeVariations) {
            // Try exact match
            let fallbackQuery = `
              SELECT * FROM Receipt 
              WHERE Code = @code
            `;
            let fallbackResult = await executeQuery(fallbackQuery, { code: codeVar });
            if (fallbackResult.recordset && fallbackResult.recordset.length > 0) {
              const receipt = new Receipt(fallbackResult.recordset[0]);
              logger.warn(`Receipt found without churchId filter (exact match): code=${codeVar}, actual churchId=${receipt.churchId}, requested churchId=${churchId}`);
              return receipt;
            }

            // Try case-insensitive match with UPPER
            fallbackQuery = `
              SELECT * FROM Receipt 
              WHERE UPPER(LTRIM(RTRIM(Code))) = UPPER(LTRIM(RTRIM(@code)))
            `;
            fallbackResult = await executeQuery(fallbackQuery, { code: codeVar });
            if (fallbackResult.recordset && fallbackResult.recordset.length > 0) {
              const receipt = new Receipt(fallbackResult.recordset[0]);
              logger.warn(`Receipt found without churchId filter (case-insensitive): code=${codeVar}, actual churchId=${receipt.churchId}, requested churchId=${churchId}`);
              return receipt;
            }
          }

          // Last resort: try to find similar codes for debugging
          const similarCodes = await this.findSimilarCodes(code);
          if (similarCodes.length > 0) {
            logger.warn(`Receipt not found with exact code, but found similar codes:`, similarCodes.map(r => ({
              code: r.Code,
              receiptId: r.ReceiptId,
              churchId: r.ChurchId,
              status: r.Status
            })));
          }
        } else {
          logger.warn(`Receipt not found: codes=${codeVariations.join(', ')}, churchId=${churchId} (fallback disabled)`);
        }
      } else {
        // No churchId provided, search without filter
        for (const codeVar of codeVariations) {
          // Try exact match
          let query = `
        SELECT * FROM Receipt 
        WHERE Code = @code
      `;
          let result = await executeQuery(query, { code: codeVar });
          if (result.recordset && result.recordset.length > 0) {
            logger.info(`Receipt found without churchId filter (exact match): code=${codeVar}`);
            return new Receipt(result.recordset[0]);
          }

          // Try case-insensitive match with UPPER
          query = `
            SELECT * FROM Receipt 
            WHERE UPPER(LTRIM(RTRIM(Code))) = UPPER(LTRIM(RTRIM(@code)))
          `;
          result = await executeQuery(query, { code: codeVar });
          if (result.recordset && result.recordset.length > 0) {
            logger.info(`Receipt found without churchId filter (case-insensitive): code=${codeVar}`);
            return new Receipt(result.recordset[0]);
          }
        }

        // Try to find similar codes for debugging
        const similarCodes = await this.findSimilarCodes(code);
        if (similarCodes.length > 0) {
          logger.warn(`Receipt not found with exact code, but found similar codes:`, similarCodes.map(r => ({
            code: r.Code,
            receiptId: r.ReceiptId,
            churchId: r.ChurchId,
            status: r.Status
          })));
        }

        logger.warn(`Receipt not found: codes=${codeVariations.join(', ')} (no churchId filter)`);
      }

      return null;
    } catch (error) {
      logger.error('Error finding receipt by code:', error);
      logger.error('Error details:', {
        code,
        normalizedCode: this.normalizeReceiptCode(code),
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
   * @returns {Promise<Receipt|null>} Receipt or null
   */
  async findByInvoiceId(invoiceId, churchId = null) {
    try {
      let query = `
        SELECT * FROM Receipt 
        WHERE InvoiceId = @invoiceId
      `;
      const params = { invoiceId };

      if (churchId) {
        query += ` AND ChurchId = @churchId`;
        params.churchId = churchId;
      }

      const result = await executeQuery(query, params);
      return result.recordset[0] ? new Receipt(result.recordset[0]) : null;
    } catch (error) {
      logger.error('Error finding receipt by invoice ID:', error);
      throw error;
    }
  }

  /**
   * Get receipt ID by code
   * @param {string} code - Receipt code (will be normalized to 6-digit format)
   * @returns {Promise<number|null>} Receipt ID or null
   */
  async getReceiptIdByCode(code) {
    try {
      if (!code) {
        return null;
      }

      const normalizedCode = this.normalizeReceiptCode(code);
      let query = `
        SELECT ReceiptId FROM Receipt 
        WHERE Code = @code
      `;

      let result = await executeQuery(query, { code: normalizedCode });
      if (result.recordset && result.recordset.length > 0) {
        return result.recordset[0].ReceiptId;
      }

      query = `
        SELECT ReceiptId FROM Receipt 
        WHERE UPPER(LTRIM(RTRIM(Code))) = UPPER(LTRIM(RTRIM(@code)))
      `;

      result = await executeQuery(query, { code: normalizedCode });
      return result.recordset && result.recordset.length > 0
        ? result.recordset[0].ReceiptId
        : null;
    } catch (error) {
      logger.error('Error getting receipt ID by code:', error);
      throw error;
    }
  }

  /**
   * Check if an active receipt already exists for a given reference document number
   * @param {string} refDocNumber - Reference document number (application code)
   * @param {number} churchId - Church ID
   * @returns {Promise<Object|null>} Receipt info if exists, otherwise null
   */
  async existsByRefDocNumber(refDocNumber, churchId) {
    try {
      const query = `
        SELECT TOP 1 r.ReceiptId, r.Code, r.TransactionDate, r.Status
        FROM Receipt r
        INNER JOIN MisalaniousReceiptDetail rd ON r.ReceiptId = rd.ReceiptId
        WHERE rd.RefDocNumber = @refDocNumber
        AND r.ChurchId = @churchId
        AND r.Status > 0
      `;
      const result = await executeQuery(query, { refDocNumber, churchId });
      return result.recordset?.[0] || null;
    } catch (error) {
      logger.error('Error checking existing receipt by refDocNumber:', error);
      throw error;
    }
  }

  /**
   * Link any existing receipts for an application to a newly created invoice
   * @param {string} refDocNumber - Application code
   * @param {number} invoiceId - Invoice ID to link to
   * @param {number} churchId - Church ID
   * @returns {Promise<number>} Number of receipts updated
   */
  async linkReceiptsToInvoice(refDocNumber, invoiceId, churchId) {
    try {
      if (!refDocNumber || !invoiceId) return 0;

      // Update receipts that are linked to this application via details but don't have an invoice yet
      const query = `
        UPDATE r
        SET r.InvoiceId = @invoiceId
        FROM Receipt r
        INNER JOIN MisalaniousReceiptDetail rd ON r.ReceiptId = rd.ReceiptId
        WHERE rd.RefDocNumber = @refDocNumber
        AND r.ChurchId = @churchId
        AND (r.InvoiceId IS NULL OR r.InvoiceId = 0 OR r.InvoiceId = '')
      `;

      const result = await executeQuery(query, {
        refDocNumber,
        invoiceId,
        churchId
      });

      const rowsAffected = result.rowsAffected?.[0] || 0;
      if (rowsAffected > 0) {
        logger.info(`Linked ${rowsAffected} receipt(s) to invoice ${invoiceId} for application ${refDocNumber}`);
      }

      return rowsAffected;
    } catch (error) {
      logger.error('Error linking receipts to invoice:', error);
      // Don't throw, this is a non-critical side effect
      return 0;
    }
  }

  /**
   * Search receipts by code, customer, invoice code, or generic query
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<{ items: Array, pagination: Object }>}
   */
  async searchReceipts(filters = {}, options = {}) {
    try {
      const {
        receiptCode,
        customerName,
        invoiceCode,
        searchTerm,
        churchId
      } = filters;

      const page = Math.max(parseInt(options.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 200);
      const offset = (page - 1) * limit;

      const sortColumn = options.sortBy || 'r.TransactionDate';
      const sortDirection = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
      const orderClause = `ORDER BY ${sortColumn} ${sortDirection}, r.ReceiptId DESC`;

      const whereClauses = [];
      const params = { offset, limit };

      const includeIsDeletedFilter = (process.env.RECEIPT_TABLE_HAS_ISDELETED || '').toLowerCase() === 'true';
      if (includeIsDeletedFilter) {
        whereClauses.push('(r.IsDeleted = 0 OR r.IsDeleted IS NULL)');
      }

      if (churchId) {
        whereClauses.push('r.ChurchId = @churchId');
        params.churchId = churchId;
      }

      if (receiptCode) {
        whereClauses.push('r.Code LIKE @receiptCode');
        params.receiptCode = `%${receiptCode}%`;
      }

      if (customerName) {
        whereClauses.push('r.CustomerName LIKE @customerName');
        params.customerName = `%${customerName}%`;
      }

      if (invoiceCode) {
        whereClauses.push('i.Code LIKE @invoiceCode');
        params.invoiceCode = `%${invoiceCode}%`;
      }

      if (searchTerm) {
        whereClauses.push(`(
          r.Code LIKE @searchTerm
          OR r.CustomerName LIKE @searchTerm
          OR r.PayeeName LIKE @searchTerm
          OR i.Code LIKE @searchTerm
        )`);
        params.searchTerm = `%${searchTerm}%`;
      }

      const whereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      const baseSelect = `
        FROM Receipt r
        LEFT JOIN Invoice i ON i.InvoiceId = r.InvoiceId
        ${whereClause}
      `;

      const dataQuery = `
        SELECT
          r.ReceiptId,
          r.Code AS ReceiptCode,
          r.CustomerName,
          r.PayeeName,
          r.PayingAmount,
          r.TotalAmount,
          r.TransactionDate,
          r.PaymentMode,
          r.PaymentModeDocNo,
          r.AddressNo,
          r.Address,
          r.Address2,
          r.AddressCity,
          r.DistrictCode,
          r.Country,
          i.InvoiceId,
          i.Code AS InvoiceCode,
          i.TransactionDate AS InvoiceDate
        ${baseSelect}
        ${orderClause}
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) AS Total
        ${baseSelect}
      `;

      const [dataResult, countResult] = await Promise.all([
        executeQuery(dataQuery, params),
        executeQuery(countQuery, params)
      ]);

      const totalRecords = countResult.recordset?.[0]?.Total || 0;
      const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

      return {
        items: dataResult.recordset || [],
        pagination: {
          page,
          limit,
          totalPages,
          totalRecords
        }
      };
    } catch (error) {
      logger.error('Error searching receipts:', error);
      throw error;
    }
  }

  /**
   * Get last receipt number (max code)
   * @returns {Promise<string>} Last receipt number
   */
  async getLastReceiptNumber() {
    try {
      // Optimized: Get top 50 recents to find max number instead of scanning whole table
      // This avoids locks and full table scans. Assumes Code roughly follows ReceiptId order.
      const query = `
        SELECT TOP 50 Code
        FROM Receipt WITH (NOLOCK)
        WHERE Code IS NOT NULL AND LEN(Code) > 0
        ORDER BY ReceiptId DESC
      `;

      const result = await executeQuery(query, {}, { timeout: 5000 });

      let maxNum = 0;
      if (result.recordset && result.recordset.length > 0) {
        for (const row of result.recordset) {
          const cleanCode = String(row.Code).replace(/\D/g, '');
          const num = parseInt(cleanCode, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }

      return (maxNum + 1).toString().padStart(6, '0');
    } catch (error) {
      logger.error('Error getting last receipt number:', error);
      // Fallback to timestamp to prevent blocking
      return Date.now().toString().slice(-6);
    }
  }

  /**
   * Get last miscellaneous receipt number
   * @returns {Promise<string>} Last miscellaneous receipt number
   */
  async getLastMiscReceiptNumber() {
    try {
      // Optimized: Get top 50 recents to find max number instead of scanning whole table
      const query = `
        SELECT TOP 50 Code
        FROM Receipt WITH (NOLOCK)
        WHERE Code IS NOT NULL AND LEN(Code) > 0
        ORDER BY ReceiptId DESC
      `;

      const result = await executeQuery(query, {}, { timeout: 5000 });

      let maxNum = 0;
      if (result.recordset && result.recordset.length > 0) {
        for (const row of result.recordset) {
          const cleanCode = String(row.Code).replace(/\D/g, '');
          const num = parseInt(cleanCode, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }

      return (maxNum + 1).toString().padStart(6, '0');
    } catch (error) {
      logger.error('Error getting last miscellaneous receipt number:', error);
      return Date.now().toString().slice(-6);
    }
  }

  /**
   * Create receipt (matching ASP.NET PaymentBL.SaveReceipt)
   * @param {Receipt} receipt - Receipt entity
   * @returns {Promise<string>} Receipt code
   */
  async createReceipt(receipt) {
    try {
      // Generate receipt code
      const lastNumber = await this.getLastReceiptNumber();
      receipt.code = lastNumber;

      receipt.code = lastNumber;

      const query = `
        INSERT INTO Receipt (
          InvoiceId, TransactionDate, CustomerName, Code, TotalAmount, 
          PayingAmount, PaymentMode, UserId, ChurchId, Status, 
          PaymentModeDocNo, PayeeName, AddressNo, Address, Address2, 
          AddressCity, DistrictCode, Country, OutstandingAmount
        )
        OUTPUT INSERTED.ReceiptId, INSERTED.Code
        VALUES (
          @invoiceId, @transactionDate, @customerName, @code, @totalAmount,
          @payingAmount, @paymentMode, @userId, @churchId, @status,
          @paymentModeDocNo, @payeeName, @addressNo, @address, @address2,
          @addressCity, @districtCode, @country, @outstandingAmount
        )
      `;

      const params = {
        invoiceId: receipt.invoiceId || 0,  // Use 0 as default for individual receipts without invoices
        transactionDate: receipt.transactionDate || new Date(),
        customerName: receipt.customerName,
        code: receipt.code,
        totalAmount: receipt.totalAmount || 0,
        payingAmount: receipt.payingAmount || 0,
        paymentMode: receipt.paymentMode || 1,
        userId: receipt.userId,
        churchId: receipt.churchId,
        status: receipt.status || 2,
        paymentModeDocNo: receipt.paymentModeDocNo || null,
        payeeName: receipt.payeeName || null,
        addressNo: receipt.addressNo || null,
        address: receipt.address || null,
        address2: receipt.address2 || null,
        addressCity: receipt.addressCity || null,
        districtCode: receipt.districtCode || null,
        country: receipt.country || null,
        outstandingAmount: receipt.outstandingAmount || 0
      };



      const result = await executeQuery(query, params);
      return result.recordset[0].Code;
    } catch (error) {
      logger.error('Error creating receipt:', error);
      throw error;
    }
  }

  /**
   * Save receipt details (MisalaniousReceiptDetail)
   * @param {number} receiptId - Receipt ID
   * @param {Array} receiptDetails - Array of receipt detail objects
   * @returns {Promise<boolean>} Success status
   */
  async saveReceiptDetails(receiptId, receiptDetails) {
    try {
      if (!receiptDetails || receiptDetails.length === 0) {
        return true;
      }

      // Delete existing details first
      await this.receiptItemRepository.deleteReceiptItemsByReceiptId(receiptId);

      // Convert to ReceiptDetail models and create in batch
      const ReceiptDetail = require('../models/ReceiptDetail');
      const details = receiptDetails.map(detail => new ReceiptDetail({
        ...detail,
        receiptId
      }));

      await this.receiptItemRepository.createReceiptItemsBatch(receiptId, details);

      return true;
    } catch (error) {
      logger.error('Error saving receipt details:', error);
      throw error;
    }
  }

  /**
   * Get receipt with invoice and details using JOIN (more efficient)
   * @param {string} code - Receipt code
   * @param {number} churchId - Church ID for access control
   * @param {boolean} allowFallback - If true, will try without churchId if not found with churchId
   * @returns {Promise<Object>} Receipt with invoice and details
   */
  /**
   * Get receipt with invoice and details using JOIN (more efficient)
   * Optimized: Uses single query with OR conditions, NOLOCK, and Address fallback
   * @param {string} code - Receipt code
   * @param {number} churchId - Church ID for access control
   * @param {boolean} allowFallback - If true, will try without churchId if not found with churchId
   * @returns {Promise<Object>} Receipt with invoice and details
   */
  async getReceiptWithInvoiceAndDetails(code, churchId = null, allowFallback = false, applicationCode = null) {
    try {
      const normalizedCode = this.normalizeReceiptCode(code);
      const originalCode = String(code).trim();
      // Use Set to ensure uniqueness
      const codeSet = new Set([normalizedCode]);
      if (originalCode !== normalizedCode) {
        codeSet.add(originalCode);
      }
      const codes = Array.from(codeSet);

      const AddressUtils = require('../utils/AddressUtils');

      // Helper to process row and add robust fallback address
      const processRow = async (row) => {
        const fullAddress = AddressUtils.formatAddress(row);

        // Inject the deduplicated address back into the row
        row.CustomerAddress = fullAddress;

        const receipt = new Receipt(row);
        let details = [];
        try {
          details = await this.receiptItemRepository.getReceiptItems(receipt.receiptId, { includeItemInfo: true });
        } catch (e) { logger.warn('Error fetching receipt details', e); }

        let invoice = null;
        if (row.Invoice_InvoiceId) {
          invoice = {
            InvoiceId: row.Invoice_InvoiceId,
            Code: row.Invoice_Code,
            TransactionDate: row.Invoice_TransactionDate,
            CustomerName: row.Invoice_CustomerName,
            TotalAmount: row.Invoice_TotalAmount,
            PayingAmount: row.Invoice_PayingAmount,
            TaxAmount: row.Invoice_TaxAmount,
            PaymentMode: row.Invoice_PaymentMode,
            PaymentModeDocNo: row.Invoice_PaymentModeDocNo,
            RefDocNumber: row.Invoice_RefDocNumber,
            RefDocName: row.Invoice_RefDocName,
            Status: row.Invoice_Status,
            ChurchId: row.Invoice_ChurchId,
            UserId: row.Invoice_UserId,
            AddressNo: row.Invoice_AddressNo,
            Address: row.Invoice_Address,

            Address2: row.Invoice_Address2,
            AddressCity: row.Invoice_AddressCity,
            DistrictCode: row.Invoice_DistrictCode,
            Country: row.Invoice_Country
          };
          try {
            if (this.getInvoiceById) {
              const invoiceDetails = await this.getInvoiceById(row.Invoice_InvoiceId);
              if (invoiceDetails && invoiceDetails.details) {
                invoice.details = invoiceDetails.details;
              }
            }
          } catch (err) {
            logger.warn(`Could not fetch invoice details for invoiceId=${row.Invoice_InvoiceId}`, err);
          }
        }

        // Ensure we have some items - fallback to invoice details if receipt details are empty
        const finalDetails = (details && details.length > 0) ? details : (invoice?.details || []);

        return { ...receipt, invoice, details: finalDetails, invoiceDetails: invoice?.details || [] };
      };

      const selectColumns = `
              r.*,
              i.InvoiceId AS Invoice_InvoiceId,
              i.Code AS Invoice_Code,
              i.TransactionDate AS Invoice_TransactionDate,
              i.CustomerName AS Invoice_CustomerName,
              i.TotalAmount AS Invoice_TotalAmount,
              i.PayingAmount AS Invoice_PayingAmount,
              i.TaxAmount AS Invoice_TaxAmount,
              i.PaymentMode AS Invoice_PaymentMode,
              i.PaymentModeDocNo AS Invoice_PaymentModeDocNo,
              i.RefDocNumber AS Invoice_RefDocNumber,
              i.RefDocName AS Invoice_RefDocName,
              i.Status AS Invoice_Status,
              i.ChurchId AS Invoice_ChurchId,
              i.UserId AS Invoice_UserId,
              i.AddressNo AS Invoice_AddressNo,
              i.Address AS Invoice_Address,
              i.Address2 AS Invoice_Address2,
              i.AddressCity AS Invoice_AddressCity,
              i.DistrictCode AS Invoice_DistrictCode,
              i.Country AS Invoice_Country
      `;

      // Build dynamic WHERE clause for codes
      const params = {};
      const criteria = [];
      codes.forEach((c, idx) => {
        const p = `code${idx}`;
        params[p] = c;
        // Check both exact and likely case-insensitive matches
        criteria.push(`r.Code = @${p}`);
        criteria.push(`UPPER(r.Code) = UPPER(@${p})`);
      });
      const codeCondition = `(${criteria.join(' OR ')})`;

      // 1. Try with ChurchId + Code (Primary)
      if (churchId) {
        params.churchId = churchId;
        const query = `
            SELECT TOP 1 ${selectColumns}
            FROM Receipt r WITH(NOLOCK)
            LEFT JOIN Invoice i WITH(NOLOCK) ON r.InvoiceId = i.InvoiceId
            WHERE ${codeCondition} AND r.ChurchId = @churchId
            ORDER BY r.ReceiptId DESC
         `;
        const result = await executeQuery(query, params);
        if (result.recordset && result.recordset.length > 0) {
          return await processRow(result.recordset[0]);
        }
      }

      // 2. Fallback without ChurchId (if allowed)
      if (allowFallback || !churchId) {
        const query = `
            SELECT TOP 1 ${selectColumns}
            FROM Receipt r WITH(NOLOCK)
            LEFT JOIN Invoice i WITH(NOLOCK) ON r.InvoiceId = i.InvoiceId
            WHERE ${codeCondition}
            ORDER BY r.ReceiptId DESC
         `;
        const result = await executeQuery(query, params);
        if (result.recordset && result.recordset.length > 0) {
          logger.info(`Receipt found without churchId filter: code=${normalizedCode}`);
          return await processRow(result.recordset[0]);
        }
      }

      // 3. Last resort: Check if the code might be an invoice code instead
      logger.warn(`Receipt not found by code, trying to find via invoice code: ${code}`);
      try {
        const refDocNameFilter = applicationCode
          ? ` AND (i.RefDocName = @refDocName OR EXISTS (
              SELECT 1 FROM InvoiceDetail id WITH(NOLOCK)
              WHERE id.InvoiceId = i.InvoiceId 
              AND id.RefDocName = @refDocName
            ))`
          : '';

        const invoiceQuery = `
            SELECT TOP 1 ${selectColumns}
            FROM Invoice i WITH(NOLOCK)
            INNER JOIN Receipt r WITH(NOLOCK) ON i.InvoiceId = r.InvoiceId
            WHERE i.Code = @code${refDocNameFilter}
        `;

        const queryParams = { code: normalizedCode };
        if (applicationCode) {
          queryParams.refDocName = String(applicationCode).trim().toUpperCase();
        }

        let invoiceResult = await executeQuery(invoiceQuery, queryParams);

        if ((!invoiceResult.recordset || invoiceResult.recordset.length === 0) && originalCode !== normalizedCode) {
          queryParams.code = originalCode;
          invoiceResult = await executeQuery(invoiceQuery, queryParams);
        }

        if (invoiceResult.recordset && invoiceResult.recordset.length > 0) {
          logger.info(`Receipt found via invoice code: invoiceCode=${normalizedCode}`);
          return await processRow(invoiceResult.recordset[0]);
        }
      } catch (invoiceSearchError) {
        logger.warn('Error searching by invoice code:', invoiceSearchError);
      }

      // 4. Final fallback: Check if code might be a RefDocNumber
      let refDocName = applicationCode ? String(applicationCode).trim().toUpperCase() : null;
      if (!refDocName) {
        const upperCode = normalizedCode.toUpperCase();
        if (upperCode.startsWith('NAPP-')) refDocName = 'NAPP';
        else if (upperCode.startsWith('WAPP-')) refDocName = 'WAPP';
        else if (upperCode.startsWith('INCR-')) refDocName = 'INCR';
        else if (upperCode.startsWith('GOLA-')) refDocName = 'GOLA';
      }

      if (refDocName || normalizedCode.match(/^(NAPP|WAPP|INCR|GOLA)-/i)) {
        logger.info(`Trying RefDocNumber lookup: ${normalizedCode}`);
        try {
          let refDocQuery = `
            SELECT TOP 1 ${selectColumns}
            FROM InvoiceDetail id WITH(NOLOCK)
            INNER JOIN Invoice i WITH(NOLOCK) ON id.InvoiceId = i.InvoiceId
            INNER JOIN Receipt r WITH(NOLOCK) ON i.InvoiceId = r.InvoiceId
            WHERE (id.RefDocNumber = @refDocNumber OR UPPER(LTRIM(RTRIM(id.RefDocNumber))) = @refDocNumberUpper)
              AND i.Status > 0
          `;

          const refDocParams = {
            refDocNumber: normalizedCode,
            refDocNumberUpper: normalizedCode.toUpperCase().trim()
          };

          if (refDocName) {
            refDocQuery += ' AND id.RefDocName = @refDocName';
            refDocParams.refDocName = refDocName;
          }

          if (churchId) {
            refDocQuery += ' AND i.ChurchId = @churchId';
            refDocParams.churchId = churchId;
          }

          refDocQuery += ' ORDER BY i.TransactionDate DESC, r.ReceiptId DESC';

          const refDocResult = await executeQuery(refDocQuery, refDocParams);

          if (refDocResult.recordset && refDocResult.recordset.length > 0) {
            return await processRow(refDocResult.recordset[0]);
          }
        } catch (refDocError) {
          logger.warn('Error searching by RefDocNumber:', refDocError);
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting receipt with invoice and details:', error);
      throw error;
    }
  }

  /**
   * Get receipt with details
   * @param {string} code - Receipt code
   * @param {number} churchId - Church ID for access control
   * @param {boolean} allowFallback - If true, will try without churchId if not found with churchId
   * @returns {Promise<Object>} Receipt with details
   */
  async getReceiptWithDetails(code, churchId = null, allowFallback = false, applicationCode = null) {
    try {
      // Use the new method that includes invoice and pass applicationCode for filtering
      // applicationCode is already being passed through, so this should work
      return await this.getReceiptWithInvoiceAndDetails(code, churchId, allowFallback, applicationCode);
    } catch (error) {
      logger.error('Error getting receipt with details:', error);
      throw error;
    }
  }

  /**
   * Execute ReceiptReport stored procedure
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Object>} Receipt report data with totals
   */
  async getReceiptReport(fromDate = null, toDate = null) {
    try {
      const normalizedFrom = this.normalizeReportDate(fromDate);
      const normalizedTo = this.normalizeReportDate(toDate);

      const chunkDays = parseInt(process.env.RECEIPT_REPORT_CHUNK_DAYS || '90', 10);
      const chunkConcurrency = Math.max(
        1,
        parseInt(process.env.RECEIPT_REPORT_CHUNK_CONCURRENCY || '2', 10)
      );

      const shouldChunk =
        normalizedFrom &&
        normalizedTo &&
        chunkDays > 0 &&
        this.getDateDiffInDays(normalizedFrom, normalizedTo) > chunkDays;

      if (!shouldChunk) {
        return await this.executeReceiptReportChunk(normalizedFrom, normalizedTo);
      }

      const ranges = this.buildChunkRanges(normalizedFrom, normalizedTo, chunkDays);
      logger.warn(
        `ReceiptReport large range (${this.getDateDiffInDays(normalizedFrom, normalizedTo)} days).` +
        ` Executing in ${ranges.length} chunk(s) of ~${chunkDays} days with concurrency ${chunkConcurrency}.`
      );

      const aggregatedData = [];
      let aggregatedTotals = this.getEmptyReceiptTotals();

      for (let i = 0; i < ranges.length; i += chunkConcurrency) {
        const batch = ranges.slice(i, i + chunkConcurrency);
        logger.info(
          `Processing ReceiptReport chunk batch ${i / chunkConcurrency + 1}/` +
          `${Math.ceil(ranges.length / chunkConcurrency)} ` +
          `(chunks ${i + 1}-${i + batch.length})`
        );

        const batchResults = await Promise.all(
          batch.map(range => this.executeReceiptReportChunk(range.start, range.end))
        );

        for (const result of batchResults) {
          if (result?.data?.length) {
            aggregatedData.push(...result.data);
          }
          aggregatedTotals = this.mergeReceiptReportTotals(aggregatedTotals, result.totals);
        }
      }

      return {
        data: aggregatedData,
        totals: aggregatedTotals
      };
    } catch (error) {
      logger.error('Error executing ReceiptReport stored procedure:', error);
      throw error;
    }
  }

  async executeReceiptReportChunk(fromDate, toDate) {
    try {
      const params = {
        FromDate: fromDate ? new Date(fromDate) : null,
        ToDate: toDate ? new Date(toDate) : null
      };

      // Custom query that bases everything on the Receipt table (ensuring receipt-related dates)
      // while calculating category totals compatible with buildReceiptReportTotals
      const query = `
        WITH ReceiptMetrics AS (
          SELECT
            r.ReceiptId,
            r.TransactionDate,
            r.Code,
            r.CustomerName,
            r.TotalAmount,
            r.PayingAmount,
            r.PaymentMode,
            r.PaymentModeDocNo,
            r.PayeeName,
            r.AddressNo,
            r.Address,
            r.Address2,
            r.AddressCity,
            r.DistrictCode,
            r.Country,
            i.Code AS InvoiceCode,
            i.TransactionDate AS InvoiceDate,
            i.RefDocNumber,
            i.RefDocName,
            i.AddressNo AS Invoice_AddressNo,
            i.Address AS Invoice_Address,
            i.Address2 AS Invoice_Address2,
            i.AddressCity AS Invoice_AddressCity,
            i.DistrictCode AS Invoice_DistrictCode,
            i.Country AS Invoice_Country
          FROM Receipt r WITH (NOLOCK)
          LEFT JOIN Invoice i WITH (NOLOCK) ON r.InvoiceId = i.InvoiceId
          WHERE r.TransactionDate >= @FromDate AND r.TransactionDate <= @ToDate
        ),
        Aggregates AS (
          SELECT
            SUM(CASE WHEN RefDocName = 'NAPP' THEN PayingAmount ELSE 0 END) AS Tot_Niche,
            SUM(CASE WHEN RefDocName = 'WAPP' THEN PayingAmount ELSE 0 END) AS Tot_Wapp,
            SUM(CASE WHEN RefDocName = 'GOA' THEN PayingAmount ELSE 0 END) AS Tot_Goa,
            SUM(CASE WHEN RefDocName = 'INCR' THEN PayingAmount ELSE 0 END) AS Tot_Incr,
            SUM(CASE WHEN RefDocName = 'Donation' THEN PayingAmount ELSE 0 END) AS Tot_Donation,
            SUM(CASE WHEN RefDocName = 'Urn' THEN PayingAmount ELSE 0 END) AS Tot_Urn,
            SUM(CASE WHEN RefDocName = 'Marble' THEN PayingAmount ELSE 0 END) AS Tot_Marble,
            SUM(CASE WHEN RefDocName IS NOT NULL AND RefDocName NOT IN ('NAPP', 'WAPP', 'GOA', 'INCR', 'Donation', 'Urn', 'Marble') THEN PayingAmount ELSE 0 END) AS Tot_Others,
            SUM(PayingAmount) AS Total_val
          FROM ReceiptMetrics
        )
        SELECT 
          m.*,
          a.Tot_Niche, a.Tot_Wapp, a.Tot_Goa, a.Tot_Incr, a.Tot_Donation, a.Tot_Urn, a.Tot_Marble, a.Tot_Others, a.Total_val
        FROM ReceiptMetrics m
        CROSS JOIN Aggregates a
        ORDER BY m.TransactionDate DESC, m.Code DESC
      `;

      const receiptReportTimeout = parseInt(process.env.RECEIPT_REPORT_TIMEOUT_MS || '180000', 10);
      const result = await executeQuery(query, params, {
        timeout: receiptReportTimeout
      });

      const recordset = result.recordset || [];
      return {
        data: recordset,
        totals: this.buildReceiptReportTotals(recordset)
      };
    } catch (error) {
      logger.error('Error executing query-based ReceiptReport:', error);
      throw error;
    }
  }

  buildChunkRanges(startDate, endDate, chunkDays) {
    const ranges = [];
    if (!startDate || !endDate) {
      return ranges;
    }

    let currentStart = new Date(startDate.getTime());
    const msPerDay = 24 * 60 * 60 * 1000;
    while (currentStart <= endDate) {
      const currentEnd = new Date(
        Math.min(endDate.getTime(), currentStart.getTime() + (chunkDays - 1) * msPerDay)
      );
      ranges.push({
        start: new Date(currentStart.getTime()),
        end: new Date(currentEnd.getTime())
      });
      currentStart = new Date(currentEnd.getTime() + msPerDay);
    }
    return ranges;
  }

  normalizeReportDate(value) {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return new Date(value.getTime());
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  getDateDiffInDays(startDate, endDate) {
    if (!startDate || !endDate) {
      return 0;
    }
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((endDate - startDate) / msPerDay) + 1;
  }

  getEmptyReceiptTotals() {
    return {
      totNiche: 0,
      totWapp: 0,
      totGoa: 0,
      totIncr: 0,
      totDonation: 0,
      totUrn: 0,
      totMarble: 0,
      totOthers: 0,
      totalVal: 0
    };
  }

  buildReceiptReportTotals(recordset = []) {
    const totals = this.getEmptyReceiptTotals();

    if (!recordset || recordset.length === 0) {
      return totals;
    }

    const firstRow = recordset[0] || {};
    totals.totNiche = firstRow.Tot_Niche || 0;
    totals.totWapp = firstRow.Tot_Wapp || 0;
    totals.totGoa = firstRow.Tot_Goa || 0;
    totals.totIncr = firstRow.Tot_Incr || 0;
    totals.totDonation = firstRow.Tot_Donation || 0;
    totals.totUrn = firstRow.Tot_Urn || 0;
    totals.totMarble = firstRow.Tot_Marble || 0;
    totals.totOthers = firstRow.Tot_Others || 0;
    totals.totalVal = firstRow.Total_val || 0;

    return totals;
  }

  mergeReceiptReportTotals(baseTotals = {}, additionalTotals = {}) {
    const merged = this.getEmptyReceiptTotals();
    Object.keys(merged).forEach(key => {
      merged[key] = (baseTotals[key] || 0) + (additionalTotals[key] || 0);
    });
    return merged;
  }

  /**
   * Execute GOAMonthlyList stored procedure (Gates of Life Monthly Report)
   * @param {string} fromDate - Start date (nvarchar format)
   * @param {string} toDate - End date (nvarchar format)
   * @returns {Promise<Array>} GOA monthly list
   */
  async getGOAMonthlyList(fromDate = null, toDate = null) {
    try {
      const result = await executeProcedure('GOAMonthlyList', {
        FromDate: fromDate,
        ToDate: toDate
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing GOAMonthlyList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Execute InscriptionMonthlyList stored procedure
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Array>} Inscription monthly list
   */
  async getInscriptionMonthlyList(fromDate = null, toDate = null) {
    try {
      const result = await executeProcedure('InscriptionMonthlyList', {
        FromDate: fromDate,
        ToDate: toDate
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing InscriptionMonthlyList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Execute WakeRoomMonthlyList stored procedure
   * @param {string} fromDate - Start date (nvarchar format)
   * @param {string} toDate - End date (nvarchar format)
   * @returns {Promise<Array>} Wake room monthly list
   */
  async getWakeRoomMonthlyList(fromDate = null, toDate = null) {
    try {
      const result = await executeProcedure('WakeRoomMonthlyList', {
        FromDate: fromDate,
        ToDate: toDate
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing WakeRoomMonthlyList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Find receipts by date range
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @param {number} churchId - Church ID for access control
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of receipts
   */
  async findByDateRange(fromDate, toDate, churchId = null, options = {}) {
    try {
      const { page = 1, limit = 50 } = options;
      const offset = (page - 1) * limit;

      // Use DISTINCT to prevent duplicates, selecting by ReceiptId to ensure uniqueness
      let query = `
        SELECT DISTINCT r.* FROM Receipt r
        WHERE r.TransactionDate BETWEEN @fromDate AND @toDate
      `;
      const params = { fromDate, toDate };

      if (churchId) {
        query += ` AND r.ChurchId = @churchId`;
        params.churchId = churchId;
      }

      query += ` ORDER BY r.TransactionDate DESC, r.ReceiptId DESC`;
      query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

      const result = await executeQuery(query, params);

      // Additional deduplication by ReceiptId as a safety measure
      const seen = new Map();
      const uniqueReceipts = result.recordset
        .map(row => new Receipt(row))
        .filter(receipt => {
          const receiptId = receipt.receiptId;
          if (seen.has(receiptId)) {
            logger.warn(`Duplicate receipt found in date range query: ReceiptId=${receiptId}, Code=${receipt.code}`);
            return false;
          }
          seen.set(receiptId, true);
          return true;
        });

      return uniqueReceipts;
    } catch (error) {
      logger.error('Error finding receipts by date range:', error);
      throw error;
    }
  }

  /**
   * Get invoice by code (for receipt creation)
   * @param {string} invoiceCode - Invoice code
   * @param {number} churchId - Church ID for access control
   * @returns {Promise<Object|null>} Invoice with details or null
   */
  async getInvoiceByCode(invoiceCode, churchId = null, applicationCode = null) {
    try {
      const variations = this.buildInvoiceCodeVariations(invoiceCode);
      if (variations.length === 0) {
        return null;
      }

      const allowStatusFallback = (process.env.INVOICE_STATUS_FALLBACK || '').toLowerCase() === 'true';

      // Build RefDocName filter for applicationCode if provided
      const refDocName = applicationCode ? String(applicationCode).trim().toUpperCase() : null;
      const refDocNameFilter = refDocName
        ? ` AND EXISTS (
            SELECT 1 FROM InvoiceDetail id_check 
            WHERE id_check.InvoiceId = i.InvoiceId 
            AND id_check.RefDocName = @refDocName
          )`
        : '';

      for (const codeVariant of variations) {
        const params = {
          invoiceCode: codeVariant,
          invoiceCodeUpper: codeVariant.toUpperCase()
        };

        if (churchId) {
          params.churchId = churchId;
        }

        if (refDocName) {
          params.refDocName = refDocName;
        }

        const baseWhere = [
          churchId ? 'i.ChurchId = @churchId' : null,
          'i.Status > 0'
        ].filter(Boolean).join(' AND ');

        // First try with applicationCode filter if provided
        const exactQuery = `
          SELECT 
            i.*,
            id.InvoiceDetailId,
            id.ItemId,
            id.Quantity,
            id.UnitAmount,
            id.PayingAmount,
            id.TotalPayingAmount,
            id.RefDocNumber,
            id.RefDocName,
            id.LineTotalAmount,
            id.LineTaxPercent,
            id.LineTaxAmount
          FROM Invoice i
          LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
          WHERE i.Code = @invoiceCode
          ${baseWhere ? `AND ${baseWhere}` : ''}
          ${refDocNameFilter}
        `;

        let result = await executeQuery(exactQuery, params);
        let mapped = this.mapInvoiceRecordset(result.recordset);
        if (mapped) {
          if (codeVariant !== invoiceCode) {
            logger.info(`Invoice code matched using variation "${codeVariant}" (input "${invoiceCode}")${refDocName ? `, applicationCode=${refDocName}` : ''}`);
          } else if (refDocName) {
            logger.info(`Invoice found with applicationCode filter: code=${codeVariant}, applicationCode=${refDocName}`);
          }
          return mapped;
        }

        const caseInsensitiveQuery = `
          SELECT 
            i.*,
            id.InvoiceDetailId,
            id.ItemId,
            id.Quantity,
            id.UnitAmount,
            id.PayingAmount,
            id.TotalPayingAmount,
            id.RefDocNumber,
            id.RefDocName,
            id.LineTotalAmount,
            id.LineTaxPercent,
            id.LineTaxAmount
          FROM Invoice i
          LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
          WHERE UPPER(LTRIM(RTRIM(i.Code))) = @invoiceCodeUpper
          ${baseWhere ? `AND ${baseWhere}` : ''}
          ${refDocNameFilter}
        `;

        result = await executeQuery(caseInsensitiveQuery, params);
        mapped = this.mapInvoiceRecordset(result.recordset);
        if (mapped) {
          if (codeVariant !== invoiceCode) {
            logger.info(`Invoice code matched case-insensitively using variation "${codeVariant}" (input "${invoiceCode}")${refDocName ? `, applicationCode=${refDocName}` : ''}`);
          } else if (refDocName) {
            logger.info(`Invoice found with applicationCode filter (case-insensitive): code=${codeVariant}, applicationCode=${refDocName}`);
          }
          return mapped;
        }

        // If applicationCode filter was applied but no match found, try without the filter as fallback
        if (refDocName) {
          logger.warn(`Invoice not found with applicationCode filter, trying without filter: code=${codeVariant}, applicationCode=${refDocName}`);

          const exactQueryFallback = `
            SELECT 
              i.*,
              id.InvoiceDetailId,
              id.ItemId,
              id.Quantity,
              id.UnitAmount,
              id.PayingAmount,
              id.TotalPayingAmount,
              id.RefDocNumber,
              id.RefDocName,
              id.LineTotalAmount,
              id.LineTaxPercent,
              id.LineTaxAmount
            FROM Invoice i
            LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
            WHERE i.Code = @invoiceCode
            ${baseWhere ? `AND ${baseWhere}` : ''}
          `;

          result = await executeQuery(exactQueryFallback, params);
          mapped = this.mapInvoiceRecordset(result.recordset);
          if (mapped) {
            logger.warn(`Invoice found without applicationCode filter: code=${codeVariant}, requested applicationCode=${refDocName}`);
            return mapped;
          }

          const caseInsensitiveQueryFallback = `
            SELECT 
              i.*,
              id.InvoiceDetailId,
              id.ItemId,
              id.Quantity,
              id.UnitAmount,
              id.PayingAmount,
              id.TotalPayingAmount,
              id.RefDocNumber,
              id.RefDocName,
              id.LineTotalAmount,
              id.LineTaxPercent,
              id.LineTaxAmount
            FROM Invoice i
            LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
            WHERE UPPER(LTRIM(RTRIM(i.Code))) = @invoiceCodeUpper
            ${baseWhere ? `AND ${baseWhere}` : ''}
          `;

          result = await executeQuery(caseInsensitiveQueryFallback, params);
          mapped = this.mapInvoiceRecordset(result.recordset);
          if (mapped) {
            logger.warn(`Invoice found without applicationCode filter (case-insensitive): code=${codeVariant}, requested applicationCode=${refDocName}`);
            return mapped;
          }
        }

        if (allowStatusFallback) {
          const fallbackQuery = `
            SELECT 
              i.*,
              id.InvoiceDetailId,
              id.ItemId,
              id.Quantity,
              id.UnitAmount,
              id.PayingAmount,
              id.TotalPayingAmount,
              id.RefDocNumber,
              id.RefDocName,
              id.LineTotalAmount,
              id.LineTaxPercent,
              id.LineTaxAmount
            FROM Invoice i
            LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
            WHERE UPPER(LTRIM(RTRIM(i.Code))) = @invoiceCodeUpper
            ${churchId ? 'AND i.ChurchId = @churchId' : ''}
          `;

          result = await executeQuery(fallbackQuery, params);
          mapped = this.mapInvoiceRecordset(result.recordset);
          if (mapped) {
            logger.warn(`Invoice found with status fallback (Status <= 0). Code variant="${codeVariant}", requested="${invoiceCode}"`);
            return mapped;
          }
        }
      }

      // Fallback: if an applicationCode/ref doc type is provided (e.g. INCR/WAPP/NAPP/GOLA),
      // try to resolve the invoice using RefDocName/RefDocNumber from InvoiceDetail.
      if (applicationCode) {
        const refDocName = String(applicationCode).trim().toUpperCase();
        const refDocNumber = String(invoiceCode).trim();

        const refParams = {
          refDocName,
          refDocNumber,
          refDocNumberUpper: refDocNumber.toUpperCase()
        };

        if (churchId) {
          refParams.churchId = churchId;
        }

        const baseWhereRef = [
          'id.RefDocName = @refDocName',
          churchId ? 'i.ChurchId = @churchId' : null,
          'i.Status > 0'
        ].filter(Boolean).join(' AND ');

        // Exact ref doc match
        let refQuery = `
          SELECT 
            i.*,
            id.InvoiceDetailId,
            id.ItemId,
            id.Quantity,
            id.UnitAmount,
            id.PayingAmount,
            id.TotalPayingAmount,
            id.RefDocNumber,
            id.RefDocName,
            id.LineTotalAmount,
            id.LineTaxPercent,
            id.LineTaxAmount
          FROM Invoice i
          LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
          WHERE ${baseWhereRef}
            AND id.RefDocNumber = @refDocNumber
        `;

        let refResult = await executeQuery(refQuery, refParams);
        let mappedRef = this.mapInvoiceRecordset(refResult.recordset);
        if (mappedRef) {
          logger.info(`Invoice resolved via RefDocName/RefDocNumber: refDocName=${refDocName}, refDocNumber=${refDocNumber}`);
          return mappedRef;
        }

        // Case-insensitive ref doc number
        refQuery = `
          SELECT 
            i.*,
            id.InvoiceDetailId,
            id.ItemId,
            id.Quantity,
            id.UnitAmount,
            id.PayingAmount,
            id.TotalPayingAmount,
            id.RefDocNumber,
            id.RefDocName,
            id.LineTotalAmount,
            id.LineTaxPercent,
            id.LineTaxAmount
          FROM Invoice i
          LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
          WHERE ${baseWhereRef}
            AND UPPER(LTRIM(RTRIM(id.RefDocNumber))) = @refDocNumberUpper
        `;

        refResult = await executeQuery(refQuery, refParams);
        mappedRef = this.mapInvoiceRecordset(refResult.recordset);
        if (mappedRef) {
          logger.info(`Invoice resolved via case-insensitive RefDocNumber: refDocName=${refDocName}, refDocNumber=${refDocNumber}`);
          return mappedRef;
        }
      }

      const similar = await this.findSimilarInvoiceCodes(invoiceCode, churchId);
      if (similar.length > 0) {
        logger.warn('Invoice not found but similar codes exist:', similar.slice(0, 5));
      }

      return null;
    } catch (error) {
      logger.error('Error getting invoice by code:', error);
      throw error;
    }
  }

  async getInvoiceById(invoiceId) {
    try {
      // First get the invoice header
      const invoiceQuery = `
        SELECT 
          i.*
        FROM Invoice i
        WHERE i.InvoiceId = @invoiceId
      `;

      const invoiceResult = await executeQuery(invoiceQuery, { invoiceId });

      if (!invoiceResult.recordset || invoiceResult.recordset.length === 0) {
        return null;
      }

      const invoice = invoiceResult.recordset[0];

      // Then get invoice details
      const detailsQuery = `
        SELECT 
          id.InvoiceDetailId,
          id.ItemId,
          id.Quantity,
          id.UnitAmount,
          id.PayingAmount,
          id.TotalPayingAmount,
          id.RefDocNumber,
          id.RefDocName,
          id.LineTotalAmount,
          id.LineTaxPercent,
          id.LineTaxAmount
        FROM InvoiceDetail id
        WHERE id.InvoiceId = @invoiceId
        ORDER BY id.InvoiceDetailId
      `;

      const detailsResult = await executeQuery(detailsQuery, { invoiceId });

      // Map the invoice with details
      invoice.details = (detailsResult.recordset || []).map(row => ({
        invoiceDetailId: row.InvoiceDetailId,
        itemId: row.ItemId,
        quantity: row.Quantity,
        unitAmount: row.UnitAmount,
        payingAmount: row.PayingAmount,
        totalPayingAmount: row.TotalPayingAmount,
        refDocNumber: row.RefDocNumber,
        refDocName: row.RefDocName,
        lineTotalAmount: row.LineTotalAmount,
        lineTaxPercent: row.LineTaxPercent,
        lineTaxAmount: row.LineTaxAmount,
        // Create a meaningful description combining available info
        description: this.buildItemDescriptionFromDetail(row)
      }));

      return invoice;
    } catch (error) {
      logger.error('Error getting invoice by ID:', error);
      throw error;
    }
  }

  mapInvoiceRecordset(recordset = []) {
    if (!recordset || recordset.length === 0) {
      return null;
    }

    const invoice = { ...recordset[0] };
    invoice.details = recordset
      .filter(row => row.InvoiceDetailId)
      .map(row => ({
        invoiceDetailId: row.InvoiceDetailId,
        itemId: row.ItemId,
        quantity: row.Quantity,
        unitAmount: row.UnitAmount,
        payingAmount: row.PayingAmount,
        totalPayingAmount: row.TotalPayingAmount,
        refDocNumber: row.RefDocNumber,
        refDocName: row.RefDocName,
        lineTotalAmount: row.LineTotalAmount,
        lineTaxPercent: row.LineTaxPercent,
        lineTaxAmount: row.LineTaxAmount,
        itemName: row.ItemName,
        itemDescription: row.ItemDescription,
        description: this.buildItemDescriptionFromDetail(row)
      }));

    return invoice;
  }

  buildItemDescriptionFromDetail(detailRow) {
    // Create a meaningful description for the item from invoice detail
    const parts = [];

    // Add reference document info if available
    if (detailRow.RefDocNumber) {
      parts.push(`Item (${detailRow.RefDocNumber})`);
    } else if (detailRow.RefDocName) {
      parts.push(`Item (${detailRow.RefDocName})`);
    } else {
      parts.push('Item');
    }

    // Add quantity if greater than 1
    if (detailRow.Quantity && detailRow.Quantity > 1) {
      parts.push(`x${detailRow.Quantity}`);
    }

    return parts.join(' ');
  }
}

module.exports = ReceiptRepository;

