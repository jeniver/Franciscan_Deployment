const ReceiptService = require('../services/ReceiptService');
const ReceiptRepository = require('../repositories/ReceiptRepository');
const Receipt = require('../models/Receipt');
const logger = require('../utils/logger');

// Initialize service with repository
const receiptRepository = new ReceiptRepository();
const receiptService = new ReceiptService(receiptRepository);

/**
 * Receipt Controller
 * Implements all receipt endpoints matching ASP.NET WebMethods
 */
class ReceiptController {
  /**
   * Get receipt by code
   * GET /api/receipts/:code
   * Based on: Payment/Receipt.aspx.cs ViewReceipt WebMethod
   */
  async getReceipt(req, res) {
    try {
      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Receipt code is required'
          }
        });
      }

      // Support optional applicationCode query parameter for filtering by document type
      const applicationCode = req.query.applicationCode || null;
      const result = await receiptService.getReceiptByCode(code, user.churchId, false, applicationCode);

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get receipt:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get receipt'
        }
      });
    }
  }

  /**
   * Create receipt
   * POST /api/receipts
   * Based on: Payment/Receipt.aspx.cs CaptureReceipt WebMethod
   */
  async createReceipt(req, res) {
    try {
      const { body, user } = req;

      if (!user || !user.churchId || !user.userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID and user ID'
          }
        });
      }

      const result = await receiptService.createReceipt(
        body,
        user.userId,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'VALIDATION_ERROR') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(201).json({
        success: true,
        code: result.data.code,
        message: result.data.message || 'Receipt created successfully'
      });
    } catch (error) {
      logger.error('Controller: Failed to create receipt:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to create receipt'
        }
      });
    }
  }

  /**
   * Create receipt from invoice
   * POST /api/receipts/from-invoice
   * Based on: Invoice/InduvidualReceiptCapture.aspx.cs CaptureReceipt WebMethod
   */
  async createReceiptFromInvoice(req, res) {
    try {
      const { body, user } = req;
      const { invoice, invoiceDetails } = body;

      if (!user || !user.churchId || !user.userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID and user ID'
          }
        });
      }

      if (!invoice) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invoice data is required'
          }
        });
      }

      const result = await receiptService.createReceiptFromInvoice(
        invoice,
        invoiceDetails || [],
        user.userId,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'INVOICE_NOT_FOUND') {
          return res.status(404).json(result);
        }
        if (result.error.code === 'VALIDATION_ERROR') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(201).json({
        success: true,
        code: result.data.code,
        receiptId: result.data.receiptId,
        message: result.data.message || 'Receipt created successfully from invoice'
      });
    } catch (error) {
      logger.error('Controller: Failed to create receipt from invoice:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to create receipt from invoice'
        }
      });
    }
  }

  /**
   * Create individual receipt for application code
   * POST /api/receipts/individual
   * Creates receipt directly from application data
   */
  async createIndividualReceipt(req, res) {
    try {
      const { body, user } = req;

      if (!user || !user.churchId || !user.userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID and user ID'
          }
        });
      }

      const { applicationCode, customerName, payingAmount, paymentMode, paymentModeDocNo, addressNo, address, address2, addressCity, districtCode, country } = body;

      let application = null;
      let resolvedCustomerName = customerName || 'Unknown Customer';
      let resolvedAmount = payingAmount || 0;
      let hasInvoice = false;
      let resolvedRefDocName = 'NAPP'; // Default reference document name

      // Get application data if applicationCode is provided
      if (applicationCode) {
        const { executeQuery } = require('../config/database');
        
        // Check for duplicate receipt first
        // Since Receipt table doesn't have RefDocNumber column, we check in MisalaniousReceiptDetail table
        const duplicateCheckQuery = `
          SELECT TOP 1 r.ReceiptId, r.Code, r.TransactionDate, r.Status
          FROM Receipt r
          INNER JOIN MisalaniousReceiptDetail rd ON r.ReceiptId = rd.ReceiptId
          WHERE rd.RefDocNumber = @refDocNumber
          AND r.ChurchId = @churchId
          AND r.Status > 0
        `;
        
        const duplicateResult = await executeQuery(duplicateCheckQuery, { 
          refDocNumber: applicationCode, 
          churchId: user.churchId 
        });
        
        if (duplicateResult.recordset && duplicateResult.recordset.length > 0) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'DUPLICATE_RECEIPT',
              message: 'Receipt already created for this application',
              receiptCode: duplicateResult.recordset[0].Code,
              transactionDate: duplicateResult.recordset[0].TransactionDate,
              refDocNumber: duplicateResult.recordset[0].RefDocNumber
            }
          });
        }
        
        const appResult = await executeQuery(
          'SELECT TOP 1 NicheApplicationId, Code, ApplicantName, Amount, Status, ChurchId FROM NicheApplication WITH(NOLOCK) WHERE Code = @code AND ChurchId = @churchId',
          { code: applicationCode, churchId: user.churchId }
        );

        if (!appResult.recordset || appResult.recordset.length === 0) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'APPLICATION_NOT_FOUND',
              message: 'Application not found'
            }
          });
        }

        application = appResult.recordset[0];
        resolvedCustomerName = customerName || application.ApplicantName;
        resolvedAmount = payingAmount || application.Amount || 0;
        // Set resolvedRefDocName based on application RefDocType
        resolvedRefDocName = application.RefDocType || 'NAPP';
      } else {
        // When no application code, use provided payingAmount or default to 0
        resolvedAmount = payingAmount || 0;
              
        // For standalone receipts without application code, set defaults
        if (!applicationCode) {
          hasInvoice = false;
        }
      }
      
      // Use resolved values for receipt creation
      const receipt = new Receipt({
        invoiceId: null, // No invoice for individual receipt
        transactionDate: new Date(),
        customerName: resolvedCustomerName,
        code: null, // Will be generated
        totalAmount: resolvedAmount,
        payingAmount: resolvedAmount,
        paymentMode: paymentMode || 'Cash',
        userId: user.userId,
        churchId: user.churchId,
        status: 2,
        paymentModeDocNo: paymentModeDocNo || null,
        payeeName: resolvedCustomerName,
        addressNo: addressNo || null,
        address: address || null,
        address2: address2 || null,
        addressCity: addressCity || null,
        districtCode: districtCode || null,
        country: country || null,
        outstandingAmount: 0
      });
      
      // Create receipt details with reference document information
      const receiptDetails = [];
      if (applicationCode) {
        // Add receipt detail with reference document information
        receiptDetails.push({
          itemId: 1, // Default item ID
          quantity: 1,
          unitAmount: resolvedAmount,
          payingAmount: resolvedAmount,
          totalPayingAmount: resolvedAmount,
          refDocNumber: applicationCode, // Link to the application code
          refDocName: resolvedRefDocName || 'NAPP' // Default to NAPP if not specified
        });
      } else {
        // For standalone receipts without application code
        receiptDetails.push({
          itemId: 1, // Default item ID
          quantity: 1,
          unitAmount: resolvedAmount,
          payingAmount: resolvedAmount,
          totalPayingAmount: resolvedAmount,
          refDocNumber: null, // No reference document
          refDocName: 'OTHERS'
        });
      }
      
      // Add details to receipt object
      receipt.details = receiptDetails;

      logger.debug('Before conversion - paymentMode:', receipt.paymentMode, 'type:', typeof receipt.paymentMode);

      // Convert payment mode string to number for Receipt (stored as numeric in database)
      if (typeof receipt.paymentMode === 'string') {
        receipt.paymentMode = Receipt.paymentModeToNumber(receipt.paymentMode);
        logger.debug('After conversion - paymentMode:', receipt.paymentMode, 'type:', typeof receipt.paymentMode);
      } else {
        logger.debug('No conversion needed - paymentMode is already:', receipt.paymentMode, 'type:', typeof receipt.paymentMode);
      }

      // Save receipt
      const result = await receiptService.createReceipt(receipt, user.userId, user.churchId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      logger.info(`Individual receipt created successfully: code=${result.data.code}, applicationCode=${applicationCode}`);

      // Check if invoice exists for this application
      hasInvoice = false;
      if (applicationCode) {
        try {
          const { executeQuery } = require('../config/database');
          const invoiceQuery = `
            SELECT TOP 1 InvoiceId 
            FROM Invoice WITH(NOLOCK) 
            WHERE RefDocNumber = @refDocNumber AND ChurchId = @churchId
          `;
          const invoiceResult = await executeQuery(invoiceQuery, { 
            refDocNumber: applicationCode, 
            churchId: user.churchId 
          });
          hasInvoice = invoiceResult.recordset && invoiceResult.recordset.length > 0;
        } catch (invoiceCheckError) {
          logger.warn('Failed to check invoice existence:', invoiceCheckError.message);
          hasInvoice = false;
        }
      }
      
      // Check if receipt exists for this application (should be true since we just created it)
      let hasReceipt = true;
      
      return res.status(201).json({
        success: true,
        code: result.data.code,
        receiptCreated: true,
        receiptCode: result.data.code,
        data: {
          receiptCode: result.data.code,
          hasInvoice: hasInvoice,
          hasReceipt: hasReceipt,
          canCreateInvoice: !hasInvoice, // Can create invoice if none exists
          canCreateReceipt: false, // Can't create receipt since one just got created
          receiptDetails: null // We don't fetch receipt details here
        },
        message: 'Individual receipt created successfully'
      });

    } catch (error) {
      logger.error('Controller: Failed to create individual receipt:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to create individual receipt'
        }
      });
    }
  }

  /**
   * Get last receipt number
   * GET /api/receipts/last-number
   * Based on: Invoice/InduvidualReceiptCapture.aspx.cs LoadLastReceiptNumber WebMethod
   */
  async getLastReceiptNumber(req, res) {
    try {
      const result = await receiptService.getLastReceiptNumber();
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get last receipt number:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get last receipt number'
        }
      });
    }
  }

  /**
   * Get last miscellaneous receipt number
   * GET /api/receipts/last-misc-number
   * Based on: Invoice/InduvidualReceiptCapture.aspx.cs GetLastMiscReceiptNumber WebMethod
   */
  async getLastMiscReceiptNumber(req, res) {
    try {
      const result = await receiptService.getLastMiscReceiptNumber();
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get last miscellaneous receipt number:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get last miscellaneous receipt number'
        }
      });
    }
  }

  /**
   * Extract query parameter value, handling both flat and nested formats
   * @param {Object} query - Request query object
   * @param {string} key - Parameter key
   * @returns {string|undefined} Parameter value
   */
  extractQueryParam(query, key) {
    const value = query[key];

    // Handle nested object format (e.g., fromDate[fromDate]=value)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Return the nested value with the same key name
      return value[key];
    }

    // Return flat value
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Get receipt report
   * GET /api/receipts/report
   * Based on: ReceiptReport stored procedure
   * Supports both flat and nested query parameter formats
   */
  async getReceiptReport(req, res) {
    try {
      // Check if parameters are nested in fromDate object (frontend sends fromDate[fromDate], fromDate[toDate], etc.)
      // When Express parses fromDate[fromDate]=value, it creates req.query.fromDate = { fromDate: 'value' }
      const isNested = req.query.fromDate && typeof req.query.fromDate === 'object' && !Array.isArray(req.query.fromDate);

      let fromDateStr, toDateStr, pageStr, limitStr, sortBy, sortOrder, search;

      if (isNested) {
        // Extract from nested object: req.query.fromDate = { fromDate: '2019-01-03', toDate: '2025-11-29', ... }
        const nested = req.query.fromDate;
        fromDateStr = nested.fromDate;
        toDateStr = nested.toDate;
        pageStr = nested.page || req.query.page || '1';
        limitStr = nested.limit || req.query.limit || '50';
        sortBy = nested.sortBy || req.query.sortBy;
        sortOrder = nested.sortOrder || req.query.sortOrder;
        search = nested.searchTerm || nested.search || req.query.searchTerm || req.query.search;
      } else {
        // Extract from flat format: fromDate=2019-01-03&toDate=2025-11-29
        fromDateStr = req.query.fromDate;
        toDateStr = req.query.toDate;
        pageStr = req.query.page || '1';
        limitStr = req.query.limit || '50';
        sortBy = req.query.sortBy;
        sortOrder = req.query.sortOrder;
        search = req.query.searchTerm || req.query.search;
      }

      // Parse dates safely
      let from = null;
      let to = null;

      if (fromDateStr) {
        const fromDate = new Date(fromDateStr);
        if (!isNaN(fromDate.getTime())) {
          from = fromDate;
        }
      }

      if (toDateStr) {
        const toDate = new Date(toDateStr);
        if (!isNaN(toDate.getTime())) {
          to = toDate;
        }
      }

      const result = await receiptService.getReceiptReport(from, to, {
        page: parseInt(pageStr, 10) || 1,
        limit: parseInt(limitStr, 10) || 50,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        searchTerm: search || undefined
      });

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get receipt report:', error);
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        query: req.query
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get receipt report',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Determine if request expects direct PDF response
   * @param {Object} req - Express request
   * @returns {boolean}
   */
  requestWantsPdf(req) {
    if (!req) {
      return false;
    }

    const downloadParam = req.query?.download;
    if (typeof downloadParam === 'string' && downloadParam.toLowerCase() === 'true') {
      return true;
    }

    const acceptHeader = req.headers['accept'];
    if (!acceptHeader) {
      return false;
    }

    // If client explicitly asks for PDF and not JSON, stream PDF
    const acceptsPdf = acceptHeader.includes('application/pdf');
    const acceptsJson = acceptHeader.includes('application/json');
    return acceptsPdf && !acceptsJson;
  }

  /**
   * Send PDF response either as JSON payload with URL or direct file stream
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Object} pdfResult - Result from PDF service
   * @param {string} pdfResult.filePath - Absolute file path
   * @param {string} pdfResult.fileName - File name
   * @param {string} pdfResult.publicPath - Public URL path
   * @param {string} pdfResult.generatedAt - ISO timestamp
   * @returns {Response}
   */
  sendPdfResponse(req, res, pdfResult) {
    if (this.requestWantsPdf(req)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${pdfResult.fileName}"`);
      return res.sendFile(pdfResult.filePath);
    }

    const pdfUrl = `${req.protocol}://${req.get('host')}${pdfResult.publicPath}`;
    return res.status(200).json({
      success: true,
      data: {
        pdfUrl,
        fileName: pdfResult.fileName,
        generatedAt: pdfResult.generatedAt,
        downloadUrl: pdfUrl
      }
    });
  }

  /**
   * Get GOA monthly list
   * GET /api/receipts/goa-monthly
   * Based on: GOAMonthlyList stored procedure
   */
  async getGOAMonthlyList(req, res) {
    try {
      const { fromDate, toDate } = req.query;
      const result = await receiptService.getGOAMonthlyList(fromDate, toDate);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get GOA monthly list:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get GOA monthly list'
        }
      });
    }
  }

  /**
   * Get inscription monthly list
   * GET /api/receipts/inscription-monthly
   * Based on: InscriptionMonthlyList stored procedure
   */
  async getInscriptionMonthlyList(req, res) {
    try {
      const { fromDate, toDate } = req.query;
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;

      const result = await receiptService.getInscriptionMonthlyList(from, to);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get inscription monthly list:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get inscription monthly list'
        }
      });
    }
  }

  /**
   * Get wake room monthly list
   * GET /api/receipts/wake-room-monthly
   * Based on: WakeRoomMonthlyList stored procedure
   */
  async getWakeRoomMonthlyList(req, res) {
    try {
      const { fromDate, toDate } = req.query;
      const result = await receiptService.getWakeRoomMonthlyList(fromDate, toDate);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get wake room monthly list:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get wake room monthly list'
        }
      });
    }
  }

  /**
   * Get receipts by date range
   * GET /api/receipts
   * Query params: fromDate, toDate, page, limit
   */
  async getReceipts(req, res) {
    try {
      const { fromDate, toDate, page, limit } = req.query;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'fromDate and toDate are required'
          }
        });
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);

      const result = await receiptService.getReceiptsByDateRange(
        from,
        to,
        user.churchId,
        { page: parseInt(page) || 1, limit: parseInt(limit) || 50 }
      );

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get receipts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get receipts'
        }
      });
    }
  }

  /**
   * Search receipts by code, customer, or invoice
   * GET /api/receipts/search
   */
  async searchReceipts(req, res) {
    try {
      const { user } = req;
      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const {
        receiptCode,
        customerName,
        invoiceCode,
        query,
        search,
        page = '1',
        limit = '20',
        sortBy,
        sortOrder
      } = req.query;

      const result = await receiptService.searchReceipts({
        receiptCode,
        customerName,
        invoiceCode,
        query: query || search,
        churchId: user.churchId
      }, {
        page,
        limit,
        sortBy,
        sortOrder
      });

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to search receipts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search receipts'
        }
      });
    }
  }

  /**
   * Get invoice by code (for receipt creation)
   * GET /api/receipts/invoice/:code
   * Based on: Payment/Receipt.aspx.cs LoadRefDocument WebMethod
   */
  async getInvoiceByCode(req, res) {
    try {
      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invoice code is required'
          }
        });
      }

      const result = await receiptService.getInvoiceByCode(code, user.churchId, req.query.applicationCode);

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json({
        success: true,
        docPrefix: 'INV',
        document: result.data
      });
    } catch (error) {
      logger.error('Controller: Failed to get invoice by code:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get invoice by code'
        }
      });
    }
  }

  /**
   * Generate receipt PDF and return public link
   * GET /api/receipts/:code/pdf
   */
  async getReceiptPdf(req, res) {
    try {
      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Receipt code is required'
          }
        });
      }

      logger.info(`Getting receipt PDF for code: ${code} (churchId: ${user.churchId})`);

      // Check if client explicitly wants JSON data (for frontend PDF generation)
      const wantsData = req.query.data === 'true' || req.query.format === 'json' || req.query.json === 'true';
      const wantsPdf = req.query.download === 'true' || req.query.pdf === 'true';

      // Get applicationCode from query string if provided (e.g., INCR, NAPP, WAPP, GOLA)
      // This is used to filter receipts by the invoice's RefDocName field
      const { applicationCode } = req.query;

      // Default behavior: return PDF so existing clients are not broken.
      // If frontend needs JSON to build PDF, they must send ?data=true (or format=json/json=true).
      if (wantsData && !wantsPdf) {
        // Return JSON data for frontend PDF generation
        logger.info(`Returning receipt data as JSON for frontend PDF generation: code=${code}${applicationCode ? `, applicationCode=${applicationCode}` : ''}`);
        const receiptDataResult = await receiptService.getReceiptDataForPdf(code, user.churchId, true, applicationCode);

        if (!receiptDataResult.success) {
          logger.warn(`Receipt data not found: code=${code}, churchId=${user.churchId}, error=${receiptDataResult.error?.code}`);

          // Enhanced diagnostic: Check if receipt exists at all and find similar codes
          let diagnosticInfo = null;
          try {
            const diagnosis = await receiptRepository.diagnoseReceiptCode(code);

            if (diagnosis.exists) {
              logger.warn(`Receipt exists (${diagnosis.matchType}): code=${code}, receipt churchId=${diagnosis.receipt?.ChurchId}, user churchId=${user.churchId}`);
              diagnosticInfo = {
                receiptExists: true,
                matchType: diagnosis.matchType,
                actualChurchId: diagnosis.receipt?.ChurchId,
                requestedChurchId: user.churchId,
                receiptStatus: diagnosis.receipt?.Status,
                receiptId: diagnosis.receipt?.ReceiptId,
                actualCode: diagnosis.receipt?.Code,
                note: diagnosis.note
              };
            } else {
              logger.warn(`Receipt does not exist in database: code=${code}, normalized=${diagnosis.normalizedCode}`);
              diagnosticInfo = {
                receiptExists: false,
                normalizedCode: diagnosis.normalizedCode,
                originalCode: diagnosis.originalCode,
                similarCodesFound: diagnosis.similarCodesFound || 0,
                similarCodes: diagnosis.similarCodes || []
              };
            }
          } catch (checkError) {
            logger.error('Error checking receipt existence:', checkError);
            diagnosticInfo = { diagnosticError: checkError.message };
          }

          const statusCode = receiptDataResult.error?.code === 'NOT_FOUND' ? 404 : 400;
          const errorResponse = {
            ...receiptDataResult,
            diagnostic: diagnosticInfo
          };
          return res.status(statusCode).json(errorResponse);
        }

        return res.status(200).json(receiptDataResult);
      }

      // PDF generation requested (default path) - get receipt first
      const receiptResult = await receiptService.getReceiptByCode(code, user.churchId, true);
      if (!receiptResult.success) {
        logger.warn(`Receipt not found for PDF generation: code=${code}, churchId=${user.churchId}, error=${receiptResult.error?.code}`);

        // Enhanced diagnostic
        let diagnosticInfo = null;
        try {
          const diagnosis = await receiptRepository.diagnoseReceiptCode(code);

          if (diagnosis.exists) {
            diagnosticInfo = {
              receiptExists: true,
              matchType: diagnosis.matchType,
              actualChurchId: diagnosis.receipt?.ChurchId,
              requestedChurchId: user.churchId,
              receiptStatus: diagnosis.receipt?.Status,
              receiptId: diagnosis.receipt?.ReceiptId,
              actualCode: diagnosis.receipt?.Code,
              note: diagnosis.note
            };
          } else {
            diagnosticInfo = {
              receiptExists: false,
              normalizedCode: diagnosis.normalizedCode,
              originalCode: diagnosis.originalCode,
              similarCodesFound: diagnosis.similarCodesFound || 0,
              similarCodes: diagnosis.similarCodes || []
            };
          }
        } catch (checkError) {
          logger.error('Error checking receipt existence:', checkError);
          diagnosticInfo = { diagnosticError: checkError.message };
        }

        const statusCode = receiptResult.error?.code === 'NOT_FOUND' ? 404 : 400;
        const errorResponse = {
          ...receiptResult,
          diagnostic: diagnosticInfo
        };
        return res.status(statusCode).json(errorResponse);
      }

      logger.info(`Receipt found, generating PDF for code: ${code}, receiptId: ${receiptResult.data?.receiptId}`);

      // Generate PDF file
      try {
        const pdfResult = await receiptService.generateReceiptPdf(receiptResult.data);
        if (this.sendPdfResponse && typeof this.sendPdfResponse === 'function') {
          return this.sendPdfResponse(req, res, pdfResult);
        } else {
          // Fallback: return JSON with PDF URL if sendPdfResponse is not available
          logger.warn('sendPdfResponse method not available, returning JSON response');
          const pdfUrl = `${req.protocol}://${req.get('host')}${pdfResult.publicPath}`;
          return res.status(200).json({
            success: true,
            data: {
              pdfUrl,
              fileName: pdfResult.fileName,
              generatedAt: pdfResult.generatedAt,
              downloadUrl: pdfUrl
            }
          });
        }
      } catch (pdfError) {
        logger.error('Error generating PDF:', pdfError);
        // Return receipt data as JSON if PDF generation fails
        const receiptDataResult = await receiptService.getReceiptDataForPdf(code, user.churchId, true);
        if (receiptDataResult.success) {
          return res.status(200).json(receiptDataResult);
        }
        throw pdfError;
      }
    } catch (error) {
      logger.error('Controller: Failed to generate receipt PDF:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate receipt PDF'
        }
      });
    }
  }

  /**
   * Generate invoice PDF and return public link
   * GET /api/receipts/invoice/:code/pdf
   */
  async getInvoicePdf(req, res) {
    try {
      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invoice code is required'
          }
        });
      }

      // Optional query parameters to mimic receipt PDF behavior
      // Example: /api/receipts/invoice/INV-123456/pdf?data=true&applicationCode=WAPP
      const wantsData = req.query.data === 'true' ||
        req.query.format === 'json' ||
        req.query.json === 'true';
      const wantsPdfFlag = req.query.download === 'true' || req.query.pdf === 'true';

      // Note: applicationCode (e.g., NAPP/WAPP/INCR/GOLA) is accepted for
      // compatibility with existing clients but is not required to locate
      // the invoice – the underlying query already returns all ref doc types.
      const { applicationCode } = req.query;
      if (applicationCode) {
        logger.info(
          `Invoice PDF requested with applicationCode filter (informational only): ` +
          `code=${code}, applicationCode=${applicationCode}`
        );
      }

      const invoiceResult = await receiptService.getInvoiceByCode(code, user.churchId, applicationCode);

      if (req.timedOut || res.headersSent) {
        logger.warn('Response already sent or timed out, skipping invoice PDF response.');
        return;
      }

      if (!invoiceResult.success) {
        // Attach diagnostic information similar to receipt PDF diagnostics
        let diagnostic = null;
        try {
          diagnostic = await receiptRepository.diagnoseInvoiceCode(code, user.churchId);
        } catch (diagError) {
          logger.error('Error diagnosing invoice code:', diagError);
          diagnostic = { diagnosticError: diagError.message };
        }

        const statusCode = invoiceResult.error?.code === 'NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json({
          ...invoiceResult,
          diagnostic
        });
      }

      // If the caller explicitly asks for JSON data (similar to receipt PDF ?data=true),
      // return the invoice payload instead of generating a PDF. This does not change
      // the default behavior for existing clients.
      if (wantsData && !wantsPdfFlag) {
        return res.status(200).json(invoiceResult);
      }

      const pdfResult = await receiptService.generateInvoicePdf(invoiceResult.data);
      return this.sendPdfResponse(req, res, pdfResult);
    } catch (error) {
      logger.error('Controller: Failed to generate invoice PDF:', error);
      if (req.timedOut || res.headersSent) {
        logger.warn('Response already sent or timed out, skipping error response.');
        return;
      }
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate invoice PDF'
        }
      });
    }
  }
}

module.exports = new ReceiptController();

