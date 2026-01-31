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
   * Diagnostic method to check exact receipt code in database (with all variations)
   * @param {string} code - Receipt code to check
   * @returns {Promise<Object>} Diagnostic information
   */
  async diagnoseReceiptCode(code) {
    try {
      if (!code) return { exists: false, message: 'No code provided' };
      
      const normalizedCode = this.normalizeReceiptCode(code);
      const originalCode = String(code).trim();
      
      // Try exact match
      let query = `SELECT TOP 1 Code, ReceiptId, ChurchId, Status, TransactionDate FROM Receipt WHERE Code = @code`;
      let result = await executeQuery(query, { code: normalizedCode });
      
      if (result.recordset && result.recordset.length > 0) {
        return {
          exists: true,
          matchType: 'exact_normalized',
          receipt: result.recordset[0]
        };
      }
      
      // Try original code
      if (originalCode !== normalizedCode) {
        result = await executeQuery(query, { code: originalCode });
        if (result.recordset && result.recordset.length > 0) {
          return {
            exists: true,
            matchType: 'exact_original',
            receipt: result.recordset[0]
          };
        }
      }
      
      // Try case-insensitive
      query = `SELECT TOP 1 Code, ReceiptId, ChurchId, Status, TransactionDate FROM Receipt WHERE UPPER(LTRIM(RTRIM(Code))) = UPPER(LTRIM(RTRIM(@code)))`;
      result = await executeQuery(query, { code: normalizedCode });
      if (result.recordset && result.recordset.length > 0) {
        return {
          exists: true,
          matchType: 'case_insensitive',
          receipt: result.recordset[0],
          note: `Found with different case. Actual code in DB: "${result.recordset[0].Code}"`
        };
      }
      
      // Check if any receipt with similar code exists
      const similarCodes = await this.findSimilarCodes(code);
      
      return {
        exists: false,
        normalizedCode,
        originalCode,
        similarCodesFound: similarCodes.length,
        similarCodes: similarCodes.slice(0, 3)
      };
    } catch (error) {
      logger.error('Error diagnosing receipt code:', error);
      return {
        exists: false,
        error: error.message
      };
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
      // ⚠️ CRITICAL FIX: Use UPDLOCK + HOLDLOCK to prevent race conditions
      // This ensures exclusive access while generating the next code
      // Matches document recommendation from ASP.NET analysis
      // OPTIMIZED: Use TRY_CAST instead of ISNUMERIC for better performance
      // ISNUMERIC can be very slow on large tables
      const query = `
        SELECT ISNULL(MAX(
          CASE 
            WHEN TRY_CAST(Code AS INT) IS NOT NULL THEN TRY_CAST(Code AS INT)
            ELSE 0
          END
        ), 0) AS LastNumber
        FROM Receipt WITH (UPDLOCK, HOLDLOCK)
        WHERE Code IS NOT NULL AND LEN(LTRIM(RTRIM(Code))) > 0
      `;
      
      // CRITICAL: Add timeout to prevent 60s default timeout
      const result = await executeQuery(query, {}, { timeout: 10000 });
      const lastNumber = result.recordset[0] ? result.recordset[0].LastNumber : 0;
      return (lastNumber + 1).toString().padStart(6, '0');
    } catch (error) {
      // If timeout, provide helpful error message
      if (error.code === 'ETIMEOUT' || error.message?.includes('timeout')) {
        logger.error('Receipt number query timeout - table may be very large. Consider adding index on Code column.');
        // Return a fallback - use current timestamp as base to avoid conflicts
        const fallbackNumber = Date.now().toString().slice(-6);
        logger.warn(`Using fallback receipt number: ${fallbackNumber}`);
        return fallbackNumber;
      }
      logger.error('Error getting last receipt number:', error);
      throw error;
    }
  }

  /**
   * Get last miscellaneous receipt number
   * @returns {Promise<string>} Last miscellaneous receipt number
   */
  async getLastMiscReceiptNumber() {
    try {
      // Optimized query with explicit timeout
      // ISNUMERIC can be slow on large tables, so we add a reasonable timeout
      // Using TRY_CAST instead of ISNUMERIC for better performance
      const query = `
        SELECT ISNULL(MAX(
          CASE 
            WHEN TRY_CAST(Code AS INT) IS NOT NULL THEN TRY_CAST(Code AS INT)
            ELSE 0
          END
        ), 0) AS LastNumber
        FROM Receipt WITH (NOLOCK)
        WHERE Code IS NOT NULL AND LEN(LTRIM(RTRIM(Code))) > 0
      `;
      
      // Use 15s timeout for this query - if it takes longer, there's a problem
      const result = await executeQuery(query, {}, { timeout: 15000 });
      const lastNumber = result.recordset[0] ? result.recordset[0].LastNumber : 0;
      return (lastNumber + 1).toString().padStart(6, '0');
    } catch (error) {
      // If query times out, return a default or handle gracefully
      if (error.code === 'ETIMEOUT' || error.message?.includes('timeout')) {
        logger.warn('Query timeout in getLastMiscReceiptNumber, using fallback logic');
        // Return a reasonable default - could be improved with caching or better query
        // For now, we'll throw to maintain existing behavior but with better context
        throw new Error('Query timeout: Receipt table may be very large. Please add an index on Code column or contact database administrator.');
      }
      logger.error('Error getting last miscellaneous receipt number:', error);
      throw error;
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
        invoiceId: receipt.invoiceId,
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
  async getReceiptWithInvoiceAndDetails(code, churchId = null, allowFallback = false, applicationCode = null) {
    try {
      const normalizedCode = this.normalizeReceiptCode(code);
      const originalCode = String(code).trim();
      const codeVariations = [normalizedCode];
      if (originalCode !== normalizedCode) {
        codeVariations.push(originalCode);
      }

      // Try to get receipt with invoice using JOIN
      for (const codeVar of codeVariations) {
        // First try with churchId if provided
        if (churchId) {
          let query = `
            SELECT 
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
              i.UserId AS Invoice_UserId
            FROM Receipt r
            LEFT JOIN Invoice i ON r.InvoiceId = i.InvoiceId
            WHERE r.Code = @code AND r.ChurchId = @churchId
          `;
          
          let result = await executeQuery(query, { code: codeVar, churchId });
          
          if (result.recordset && result.recordset.length > 0) {
            const row = result.recordset[0];
            const receipt = new Receipt(row);
            
            // Get receipt details
            const detailsQuery = `
              SELECT * FROM MisalaniousReceiptDetail 
              WHERE ReceiptId = @receiptId
            `;
            const detailsResult = await executeQuery(detailsQuery, {
              receiptId: receipt.receiptId
            });
            
            // Build invoice object if exists
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
                UserId: row.Invoice_UserId
              };
              
              // Get invoice details if invoice exists
              try {
                const invoiceDetails = await this.getInvoiceById(row.Invoice_InvoiceId);
                if (invoiceDetails && invoiceDetails.details) {
                  invoice.details = invoiceDetails.details;
                }
              } catch (err) {
                logger.warn(`Could not fetch invoice details for invoiceId=${row.Invoice_InvoiceId}`, err);
              }
            }
            
            return {
              ...receipt,
              invoice,
              details: detailsResult.recordset || []
            };
          }
          
          // Try case-insensitive
          query = `
            SELECT 
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
              i.UserId AS Invoice_UserId
            FROM Receipt r
            LEFT JOIN Invoice i ON r.InvoiceId = i.InvoiceId
            WHERE UPPER(LTRIM(RTRIM(r.Code))) = UPPER(LTRIM(RTRIM(@code))) AND r.ChurchId = @churchId
          `;
          
          result = await executeQuery(query, { code: codeVar, churchId });
          
          if (result.recordset && result.recordset.length > 0) {
            const row = result.recordset[0];
            const receipt = new Receipt(row);
            
            const detailsQuery = `
              SELECT * FROM MisalaniousReceiptDetail 
              WHERE ReceiptId = @receiptId
            `;
            const detailsResult = await executeQuery(detailsQuery, {
              receiptId: receipt.receiptId
            });
            
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
                UserId: row.Invoice_UserId
              };
              
              try {
                const invoiceDetails = await this.getInvoiceById(row.Invoice_InvoiceId);
                if (invoiceDetails && invoiceDetails.details) {
                  invoice.details = invoiceDetails.details;
                }
              } catch (err) {
                logger.warn(`Could not fetch invoice details for invoiceId=${row.Invoice_InvoiceId}`, err);
              }
            }
            
            return {
              ...receipt,
              invoice,
              details: detailsResult.recordset || []
            };
          }
        }
        
        // If not found with churchId and fallback allowed, try without churchId
        if (allowFallback || !churchId) {
          let query = `
            SELECT 
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
              i.UserId AS Invoice_UserId
            FROM Receipt r
            LEFT JOIN Invoice i ON r.InvoiceId = i.InvoiceId
            WHERE r.Code = @code
          `;
          
          let result = await executeQuery(query, { code: codeVar });
          
          if (result.recordset && result.recordset.length > 0) {
            const row = result.recordset[0];
            const receipt = new Receipt(row);
            
            const detailsQuery = `
              SELECT * FROM MisalaniousReceiptDetail 
              WHERE ReceiptId = @receiptId
            `;
            const detailsResult = await executeQuery(detailsQuery, {
              receiptId: receipt.receiptId
            });
            
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
                UserId: row.Invoice_UserId
              };
              
              try {
                const invoiceDetails = await this.getInvoiceById(row.Invoice_InvoiceId);
                if (invoiceDetails && invoiceDetails.details) {
                  invoice.details = invoiceDetails.details;
                }
              } catch (err) {
                logger.warn(`Could not fetch invoice details for invoiceId=${row.Invoice_InvoiceId}`, err);
              }
            }
            
            logger.info(`Receipt found without churchId filter: code=${codeVar}, actual churchId=${receipt.churchId}`);
            return {
              ...receipt,
              invoice,
              details: detailsResult.recordset || []
            };
          }
          
          // Try case-insensitive without churchId
          query = `
            SELECT 
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
              i.UserId AS Invoice_UserId
            FROM Receipt r
            LEFT JOIN Invoice i ON r.InvoiceId = i.InvoiceId
            WHERE UPPER(LTRIM(RTRIM(r.Code))) = UPPER(LTRIM(RTRIM(@code)))
          `;
          
          result = await executeQuery(query, { code: codeVar });
          
          if (result.recordset && result.recordset.length > 0) {
            const row = result.recordset[0];
            const receipt = new Receipt(row);
            
            const detailsQuery = `
              SELECT * FROM MisalaniousReceiptDetail 
              WHERE ReceiptId = @receiptId
            `;
            const detailsResult = await executeQuery(detailsQuery, {
              receiptId: receipt.receiptId
            });
            
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
                UserId: row.Invoice_UserId
              };
              
              try {
                const invoiceDetails = await this.getInvoiceById(row.Invoice_InvoiceId);
                if (invoiceDetails && invoiceDetails.details) {
                  invoice.details = invoiceDetails.details;
                }
              } catch (err) {
                logger.warn(`Could not fetch invoice details for invoiceId=${row.Invoice_InvoiceId}`, err);
              }
            }
            
            logger.info(`Receipt found without churchId filter (case-insensitive): code=${codeVar}`);
            return {
              ...receipt,
              invoice,
              details: detailsResult.recordset || []
            };
          }
        }
      }
      
      // Last resort: Check if the code might be an invoice code instead
      // Some systems might use invoice codes to look up receipts
      // Also filter by applicationCode (RefDocName) if provided
      logger.warn(`Receipt not found by code, trying to find via invoice code: ${code}${applicationCode ? `, applicationCode=${applicationCode}` : ''}`);
      try {
        // Build WHERE clause - include RefDocName filter if applicationCode provided
        const refDocNameFilter = applicationCode 
          ? ` AND (i.RefDocName = @refDocName OR EXISTS (
              SELECT 1 FROM InvoiceDetail id 
              WHERE id.InvoiceId = i.InvoiceId 
              AND id.RefDocName = @refDocName
            ))`
          : '';
        
        const invoiceQuery = `
          SELECT 
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
            i.UserId AS Invoice_UserId
          FROM Invoice i
          INNER JOIN Receipt r ON i.InvoiceId = r.InvoiceId
          WHERE i.Code = @code${refDocNameFilter}
        `;
        
        const queryParams = { code: normalizedCode };
        if (applicationCode) {
          queryParams.refDocName = String(applicationCode).trim().toUpperCase();
        }
        
        let invoiceResult = await executeQuery(invoiceQuery, queryParams);
        
        if (!invoiceResult.recordset || invoiceResult.recordset.length === 0) {
          // Try with original code if different
          if (originalCode !== normalizedCode) {
            queryParams.code = originalCode;
            invoiceResult = await executeQuery(invoiceQuery, queryParams);
          }
          
          // If still no result and applicationCode was provided, try without RefDocName filter as fallback
          if ((!invoiceResult.recordset || invoiceResult.recordset.length === 0) && applicationCode) {
            logger.warn(`Receipt not found with applicationCode filter, trying without filter: code=${code}, applicationCode=${applicationCode}`);
            const fallbackQuery = invoiceQuery.replace(refDocNameFilter, '');
            invoiceResult = await executeQuery(fallbackQuery, { code: normalizedCode });
            if (!invoiceResult.recordset || invoiceResult.recordset.length === 0 && originalCode !== normalizedCode) {
              invoiceResult = await executeQuery(fallbackQuery, { code: originalCode });
            }
          }
        }
        
        if (invoiceResult.recordset && invoiceResult.recordset.length > 0) {
          const row = invoiceResult.recordset[0];
          const receipt = new Receipt(row);
          
          const detailsQuery = `
            SELECT * FROM MisalaniousReceiptDetail 
            WHERE ReceiptId = @receiptId
          `;
          const detailsResult = await executeQuery(detailsQuery, {
            receiptId: receipt.receiptId
          });
          
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
              UserId: row.Invoice_UserId
            };
            
            try {
              const invoiceDetails = await this.getInvoiceById(row.Invoice_InvoiceId);
              if (invoiceDetails && invoiceDetails.details) {
                invoice.details = invoiceDetails.details;
              }
            } catch (err) {
              logger.warn(`Could not fetch invoice details for invoiceId=${row.Invoice_InvoiceId}`, err);
            }
          }
          
          logger.info(`Receipt found via invoice code: invoiceCode=${normalizedCode}, receiptCode=${receipt.code}`);
          return {
            ...receipt,
            invoice,
            details: detailsResult.recordset || []
          };
        }
      } catch (invoiceSearchError) {
        logger.warn('Error searching by invoice code:', invoiceSearchError);
        // Continue to try RefDocNumber lookup
      }
      
      // Final fallback: Check if code might be a RefDocNumber (e.g., NAPP-45, WAPP-123)
      // Detect RefDocName from code pattern or use provided applicationCode
      let refDocName = applicationCode ? String(applicationCode).trim().toUpperCase() : null;
      if (!refDocName) {
        const upperCode = normalizedCode.toUpperCase();
        if (upperCode.startsWith('NAPP-')) {
          refDocName = 'NAPP';
        } else if (upperCode.startsWith('WAPP-')) {
          refDocName = 'WAPP';
        } else if (upperCode.startsWith('INCR-')) {
          refDocName = 'INCR';
        } else if (upperCode.startsWith('GOLA-')) {
          refDocName = 'GOLA';
        }
      }

      // Only try RefDocNumber lookup if code looks like an application code
      if (refDocName || normalizedCode.match(/^(NAPP|WAPP|INCR|GOLA)-/i)) {
        logger.info(`Receipt not found by code, trying RefDocNumber lookup: ${normalizedCode}${refDocName ? ` (RefDocName: ${refDocName})` : ''}`);
        try {
          let refDocQuery = `
            SELECT 
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
              i.UserId AS Invoice_UserId
            FROM InvoiceDetail id
            INNER JOIN Invoice i ON id.InvoiceId = i.InvoiceId
            INNER JOIN Receipt r ON i.InvoiceId = r.InvoiceId
            WHERE (id.RefDocNumber = @refDocNumber OR UPPER(LTRIM(RTRIM(id.RefDocNumber))) = @refDocNumberUpper)
              AND i.Status > 0
          `;

          const refDocParams = {
            refDocNumber: normalizedCode,
            refDocNumberUpper: normalizedCode.toUpperCase().trim()
          };

          // Add RefDocName filter if detected or provided
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
            const row = refDocResult.recordset[0];
            const receipt = new Receipt(row);

            const detailsQuery = `
              SELECT * FROM MisalaniousReceiptDetail 
              WHERE ReceiptId = @receiptId
            `;
            const detailsResult = await executeQuery(detailsQuery, {
              receiptId: receipt.receiptId
            });

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
                UserId: row.Invoice_UserId
              };

              try {
                const invoiceDetails = await this.getInvoiceById(row.Invoice_InvoiceId);
                if (invoiceDetails && invoiceDetails.details) {
                  invoice.details = invoiceDetails.details;
                }
              } catch (err) {
                logger.warn(`Could not fetch invoice details for invoiceId=${row.Invoice_InvoiceId}`, err);
              }
            }

            logger.info(`Receipt found via RefDocNumber: refDocNumber=${normalizedCode}${refDocName ? `, refDocName=${refDocName}` : ''}, receiptCode=${receipt.code}`);
            return {
              ...receipt,
              invoice,
              details: detailsResult.recordset || []
            };
          }
        } catch (refDocError) {
          logger.warn('Error searching by RefDocNumber:', refDocError);
          // Continue to return null
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
    const params = {
      FromDate: fromDate ? new Date(fromDate) : null,
      ToDate: toDate ? new Date(toDate) : null
    };

      const receiptReportTimeout = parseInt(process.env.RECEIPT_REPORT_TIMEOUT_MS || '180000', 10);
    const result = await executeProcedure('ReceiptReport', params, {
      timeout: receiptReportTimeout
    });

    const recordset = result.recordset || [];
    return {
      data: recordset,
      totals: this.buildReceiptReportTotals(recordset)
    };
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

  /**
   * Diagnostic helper for invoice codes, similar to diagnoseReceiptCode
   * Tries exact and case-insensitive matches (with and without churchId),
   * and falls back to listing similar invoice codes.
   * @param {string} code - Invoice code to check
   * @param {number|null} churchId - Optional church ID filter
   * @returns {Promise<Object>} Diagnostic information
   */
  async diagnoseInvoiceCode(code, churchId = null) {
    try {
      if (!code) {
        return { exists: false, message: 'No code provided' };
      }

      const variations = this.buildInvoiceCodeVariations(code);
      if (!variations.length) {
        return { exists: false, message: 'No usable code variations derived' };
      }

      // Try exact matches across all variations
      for (const variant of variations) {
        const params = { code: variant };
        let whereClause = 'Code = @code';

        if (churchId) {
          whereClause += ' AND ChurchId = @churchId';
          params.churchId = churchId;
        }

        let query = `
          SELECT TOP 1 Code, InvoiceId, ChurchId, Status, RefDocName, RefDocNumber
          FROM Invoice
          WHERE ${whereClause}
        `;

        let result = await executeQuery(query, params);
        if (result.recordset && result.recordset.length > 0) {
          return {
            exists: true,
            matchType: 'exact',
            invoice: result.recordset[0],
            usedVariant: variant
          };
        }

        // Case-insensitive check
        query = `
          SELECT TOP 1 Code, InvoiceId, ChurchId, Status, RefDocName, RefDocNumber
          FROM Invoice
          WHERE UPPER(LTRIM(RTRIM(Code))) = UPPER(LTRIM(RTRIM(@code)))
          ${churchId ? ' AND ChurchId = @churchId' : ''}
        `;

        result = await executeQuery(query, params);
        if (result.recordset && result.recordset.length > 0) {
          return {
            exists: true,
            matchType: 'case_insensitive',
            invoice: result.recordset[0],
            usedVariant: variant,
            note: `Found with different case or surrounding whitespace. Actual code in DB: "${result.recordset[0].Code}"`
          };
        }
      }

      // If no exact match, check for similar codes
      const similar = await this.findSimilarInvoiceCodes(code, churchId);
      return {
        exists: false,
        originalCode: String(code).trim(),
        churchId: churchId || null,
        similarCodesFound: similar.length,
        similarCodes: similar.slice(0, 5)
      };
    } catch (error) {
      logger.error('Error diagnosing invoice code:', error);
      return {
        exists: false,
        error: error.message
      };
    }
  }

  async getInvoiceById(invoiceId) {
    try {
      const query = `
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
        WHERE i.InvoiceId = @invoiceId
      `;

      const result = await executeQuery(query, { invoiceId });
      return this.mapInvoiceRecordset(result.recordset);
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
          lineTaxAmount: row.LineTaxAmount
        }));

      return invoice;
  }
}

module.exports = ReceiptRepository;

