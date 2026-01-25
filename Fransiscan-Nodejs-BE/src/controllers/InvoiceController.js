const BaseController = require('./BaseController');
const InvoiceService = require('../services/InvoiceService');
const InvoiceRepository = require('../repositories/InvoiceRepository');
const ReceiptService = require('../services/ReceiptService');
const logger = require('../utils/logger');

/**
 * Invoice Controller
 * Handles HTTP requests for invoice operations
 */
class InvoiceController extends BaseController {
  constructor() {
    super();
    this.invoiceRepository = new InvoiceRepository();
    this.invoiceService = new InvoiceService(this.invoiceRepository);
    this.receiptService = new ReceiptService(require('../repositories/ReceiptRepository'));
  }

  /**
   * Create new invoice
   * POST /api/invoices
   * Matching ASP.NET Capture.aspx.cs SaveInvoice
   */
  createInvoice = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Create Invoice');

    try {
      const { invoice, invoiceDetails, createReceipt } = req.body;
      const userId = req.user?.userId;
      const churchId = req.user?.churchId;

      // Validate authentication
      if (!userId || !churchId) {
        return this.sendError(res, 'Authentication required with user ID and church ID', 401);
      }

      // Validate input
      if (!invoice) {
        return this.sendError(res, 'Invoice data is required', 400);
      }

      if (!invoiceDetails || invoiceDetails.length === 0) {
        return this.sendError(res, 'Invoice details are required', 400);
      }

      // Save invoice
      const result = await this.invoiceService.saveInvoice(
        invoice,
        invoiceDetails,
        userId,
        churchId
      );

      if (!result.success) {
        const statusCode = result.error.code === 'DUPLICATE_INVOICE' ? 409 :
                          result.error.code === 'INVALID_REF_DOCUMENT' ? 400 :
                          result.error.code === 'VALIDATION_ERROR' ? 400 : 400;

        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      // Create receipt if requested
      let receiptResult = null;
      if (createReceipt === true && invoice.payingAmount > 0) {
        try {
          receiptResult = await this.receiptService.createReceiptFromInvoice(
            {
              code: result.data.invoiceCode,
              invoiceId: result.data.invoiceId,
              ...invoice
            },
            invoiceDetails,
            userId,
            churchId
          );

          if (receiptResult.success) {
            return res.status(201).json({
              success: true,
              data: {
                invoiceId: result.data.invoiceId,
                invoiceCode: result.data.invoiceCode,
                receiptId: receiptResult.data?.receiptId || null,
                receiptCode: receiptResult.data?.code || result.data.invoiceCode
              },
              message: 'Invoice and receipt created successfully'
            });
          }
        } catch (receiptError) {
          logger.warn('Failed to create receipt from invoice:', receiptError);
          // Continue without receipt - invoice was created successfully
        }
      }

      return res.status(201).json({
        success: true,
        data: {
          invoiceId: result.data.invoiceId,
          invoiceCode: result.data.invoiceCode
        },
        message: result.message || 'Invoice created successfully'
      });
    } catch (error) {
      logger.error('Controller: Failed to create invoice:', error);
      return this.sendError(res, error.message || 'Failed to create invoice', 500);
    }
  });

  /**
   * Create or retrieve invoice by code
   * POST /api/invoices/:code
   * Creates an invoice for the given application code (e.g., "4652-0", "NAPP-52")
   * If invoice already exists, returns the existing invoice
   * Request body is optional - if provided, will be used to override defaults
   */
  createInvoiceByCode = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Create Invoice by Code');

    try {
      const { code } = req.params;
      const userId = req.user?.userId;
      const churchId = req.user?.churchId;
      const applicationCode = req.query.applicationCode || null;

      if (!code) {
        return this.sendError(res, 'Invoice code is required', 400);
      }

      if (!userId || !churchId) {
        return this.sendError(res, 'Authentication required with user ID and church ID', 401);
      }

      // First, check if invoice already exists
      const existingInvoice = await this.invoiceRepository.getInvoiceByCode(code, churchId, applicationCode);
      
      if (existingInvoice) {
        // Invoice already exists, return it
        logger.info(`Invoice already exists for code: ${code}, returning existing invoice`);
        return this.sendSuccess(res, existingInvoice, 'Invoice retrieved successfully');
      }

      // Invoice doesn't exist, need to create it
      // The code parameter is the application code (e.g., "4652-0", "NAPP-52")
      // We need to resolve the application and create invoice items from it
      
      // Try to resolve the application based on code format
      const { executeQuery } = require('../config/database');
      let application = null;
      let refDocName = null;
      let customerName = null;
      let nicheApplicationId = null;

      // Determine RefDocName from code pattern
      const normalizedCode = code.trim().toUpperCase();
      if (normalizedCode.startsWith('NAPP-') || /^\d+-\d+$/.test(code)) {
        // Niche Application - format: "NAPP-XXXX" or "XXXX-0"
        refDocName = 'NAPP';
        
        // Query NicheApplication table
        const appQuery = `
          SELECT TOP 1
            NicheApplicationId,
            Code,
            ApplicantName,
            Status,
            ChurchId,
            Amount,
            AppliedDate,
            AgreementDate
          FROM NicheApplication WITH(NOLOCK)
          WHERE Code = @code
        `;
        
        const appResult = await executeQuery(appQuery, { code });
        if (appResult.recordset && appResult.recordset.length > 0) {
          application = appResult.recordset[0];
          customerName = application.ApplicantName;
          nicheApplicationId = application.NicheApplicationId;
          
          // Check church access
          if (application.ChurchId !== churchId) {
            return this.sendError(res, 'Access denied - Church ID mismatch', 403);
          }
        } else {
          return this.sendError(res, `Niche application not found for code: ${code}`, 404);
        }
      } else if (normalizedCode.startsWith('WAPP-')) {
        refDocName = 'WAPP';
        // TODO: Implement Wake Room Application resolution
        return this.sendError(res, 'Wake Room Application invoice creation not yet implemented', 501);
      } else if (normalizedCode.startsWith('INCR-')) {
        refDocName = 'INCR';
        // TODO: Implement Inscription Request resolution
        return this.sendError(res, 'Inscription Request invoice creation not yet implemented', 501);
      } else if (normalizedCode.startsWith('GOLA-')) {
        refDocName = 'GOLA';
        // TODO: Implement Gate of Life Application resolution
        return this.sendError(res, 'Gate of Life Application invoice creation not yet implemented', 501);
      } else {
        return this.sendError(res, `Unable to determine application type for code: ${code}`, 400);
      }

      // Get niche information to determine the correct item
      let nicheInfo = null;
      if (application.NicheId) {
        const nicheQuery = `
          SELECT TOP 1
            n.NicheId,
            n.NicheCode,
            n.NicheRowId,
            nr.NicheLevel,
            nr.DefaultAmount
          FROM Niche n WITH(NOLOCK)
          LEFT JOIN NicheRow nr ON n.NicheRowId = nr.NicheRowId
          WHERE n.NicheId = @nicheId
        `;
        const nicheResult = await executeQuery(nicheQuery, { nicheId: application.NicheId });
        if (nicheResult.recordset && nicheResult.recordset.length > 0) {
          nicheInfo = nicheResult.recordset[0];
        }
      }

      // Determine invoice item - try to match by niche level first
      let item = null;
      if (nicheInfo && nicheInfo.NicheLevel) {
        // Try to get item by niche level (e.g., Level 6 -> ItemId 6)
        const levelItemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name AS ItemName,
            i.Code AS ItemCode,
            i.Price AS ItemPrice
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
            AND i.Status = 1
            AND i.ItemId = @itemId
        `;
        const levelItemResult = await executeQuery(levelItemQuery, { 
          churchId, 
          itemId: nicheInfo.NicheLevel 
        });
        if (levelItemResult.recordset && levelItemResult.recordset.length > 0) {
          item = levelItemResult.recordset[0];
        }
      }

      // Fallback: Get item from NICHES category
      if (!item) {
        const itemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name AS ItemName,
            i.Code AS ItemCode,
            i.Price AS ItemPrice
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
            AND i.Status = 1
            AND i.Category = 'NICHES'
          ORDER BY i.ItemId
        `;
        const itemResult = await executeQuery(itemQuery, { churchId });
        if (itemResult.recordset && itemResult.recordset.length > 0) {
          item = itemResult.recordset[0];
        }
      }

      // Last resort: Get any active item for the church
      if (!item) {
        const fallbackItemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name AS ItemName,
            i.Code AS ItemCode,
            i.Price AS ItemPrice
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
            AND i.Status = 1
          ORDER BY i.ItemId
        `;
        const fallbackItemResult = await executeQuery(fallbackItemQuery, { churchId });
        if (fallbackItemResult.recordset && fallbackItemResult.recordset.length > 0) {
          item = fallbackItemResult.recordset[0];
        }
      }

      if (!item) {
        return this.sendError(res, 'No items found for invoice creation', 404);
      }

      // Check if invoice details are provided in request body
      let invoiceDetails = [];
      let invoiceData = null;

      if (req.body.details && Array.isArray(req.body.details) && req.body.details.length > 0) {
        // Use provided invoice details from request body
        logger.info(`Using provided invoice details from request body: ${req.body.details.length} items`);
        
        // Calculate totals from provided details
        const totalAmount = req.body.details.reduce((sum, detail) => {
          return sum + (detail.totalPayingAmount || detail.lineTotalAmount + (detail.lineTaxAmount || 0) || 0);
        }, 0);
        
        const totalTaxAmount = req.body.details.reduce((sum, detail) => {
          return sum + (detail.lineTaxAmount || 0);
        }, 0);

        // Prepare invoice data from request body or use defaults
        invoiceData = {
          transactionDate: req.body.transactionDate || application.AgreementDate || application.AppliedDate || new Date(),
          refDocNumber: code.trim(), // Use the application code
          refDocName: refDocName,
          customerName: req.body.customerName || customerName,
          totalAmount: totalAmount,
          payingAmount: req.body.payingAmount !== undefined ? req.body.payingAmount : totalAmount,
          paymentMode: req.body.paymentMode || null,
          paymentModeDocNo: req.body.paymentModeDocNo || null,
          nicheApplicationId: nicheApplicationId,
          taxCode: req.body.taxCode || 'GST',
          taxPercentage: req.body.taxPercentage || 9,
          taxAmount: totalTaxAmount
        };

        // Map provided details to invoice details format
        invoiceDetails = req.body.details.map(detail => {
          // Normalize RefDocNumber - use provided or default to application code
          const normalizedRefDocNumber = detail.refDocNumber 
            ? String(detail.refDocNumber).trim() 
            : code.trim();
          
          // Normalize RefDocName - use provided or default
          const normalizedRefDocName = detail.refDocName 
            ? String(detail.refDocName).trim().toUpperCase() 
            : refDocName;

          // Calculate values if not provided
          const quantity = detail.quantity || 1;
          const unitAmount = detail.unitAmount || 0;
          const lineTotalAmount = detail.lineTotalAmount || (unitAmount * quantity);
          const lineTaxPercent = detail.lineTaxPercent || 9;
          const lineTaxAmount = detail.lineTaxAmount || (lineTotalAmount * (lineTaxPercent / 100));
          const totalPayingAmount = detail.totalPayingAmount || (lineTotalAmount + lineTaxAmount);

          return {
            itemId: detail.itemId,
            quantity: quantity,
            unitAmount: unitAmount,
            payingAmount: detail.payingAmount !== undefined ? detail.payingAmount : unitAmount,
            totalPayingAmount: totalPayingAmount,
            refDocNumber: normalizedRefDocNumber,
            refDocName: normalizedRefDocName,
            refType: detail.refType || normalizedRefDocName,
            outstandingAmount: detail.outstandingAmount || 0,
            lineTotalAmount: lineTotalAmount,
            lineTaxPercent: lineTaxPercent,
            lineTaxAmount: lineTaxAmount
          };
        });
      } else {
        // Auto-determine invoice items from application (existing logic)
        // Determine unit amount: use application amount, niche default amount, or item price
        const unitAmount = application.Amount || 
                          (nicheInfo && nicheInfo.DefaultAmount) || 
                          item.ItemPrice || 
                          0;
        const quantity = 1;
        const lineTotalAmount = unitAmount * quantity;
        const lineTaxPercent = 9; // 9% GST
        const lineTaxAmount = lineTotalAmount * (lineTaxPercent / 100);
        const totalPayingAmount = lineTotalAmount + lineTaxAmount;

        // Prepare invoice data
        invoiceData = {
          transactionDate: application.AgreementDate || application.AppliedDate || new Date(),
          refDocNumber: code.trim(), // Use the application code
          refDocName: refDocName,
          customerName: customerName,
          totalAmount: totalPayingAmount,
          payingAmount: totalPayingAmount,
          paymentMode: req.body.paymentMode || null,
          paymentModeDocNo: req.body.paymentModeDocNo || null,
          nicheApplicationId: nicheApplicationId,
          taxCode: 'GST',
          taxPercentage: lineTaxPercent,
          taxAmount: lineTaxAmount
        };

        // Prepare invoice details
        invoiceDetails = [{
          itemId: item.ItemId,
          quantity: quantity,
          unitAmount: unitAmount,
          payingAmount: unitAmount,
          totalPayingAmount: totalPayingAmount,
          refDocNumber: code.trim(), // Use the application code
          refDocName: refDocName,
          refType: refDocName,
          outstandingAmount: 0,
          lineTotalAmount: lineTotalAmount,
          lineTaxPercent: lineTaxPercent,
          lineTaxAmount: lineTaxAmount
        }];
      }

      // Create invoice using InvoiceService
      const invoiceResult = await this.invoiceService.saveInvoice(
        invoiceData,
        invoiceDetails,
        userId,
        churchId
      );

      if (!invoiceResult.success) {
        const statusCode = invoiceResult.error.code === 'DUPLICATE_INVOICE' ? 409 :
                          invoiceResult.error.code === 'INVALID_REF_DOCUMENT' ? 400 :
                          invoiceResult.error.code === 'VALIDATION_ERROR' ? 400 : 400;

        return res.status(statusCode).json({
          success: false,
          error: invoiceResult.error
        });
      }

      // Retrieve the created invoice to return in the same format as GET
      const createdInvoice = await this.invoiceRepository.getInvoiceByCode(
        invoiceResult.data.invoiceCode,
        churchId,
        applicationCode
      );

      if (!createdInvoice) {
        // Fallback: try to get by application code
        const fallbackInvoice = await this.invoiceRepository.getInvoiceByCode(code, churchId, applicationCode);
        if (fallbackInvoice) {
          return this.sendSuccess(res, fallbackInvoice, 'Invoice created and retrieved successfully');
        }
        
        // If still not found, return basic info
        return res.status(201).json({
          success: true,
          data: {
            invoiceId: invoiceResult.data.invoiceId,
            invoiceCode: invoiceResult.data.invoiceCode,
            message: 'Invoice created successfully but could not be retrieved immediately'
          },
          message: 'Invoice created successfully'
        });
      }

      return this.sendSuccess(res, createdInvoice, 'Invoice created and retrieved successfully');
    } catch (error) {
      logger.error('Controller: Failed to create invoice by code:', error);
      return this.sendError(res, error.message || 'Failed to create invoice', 500);
    }
  });

  /**
   * Get invoice by code
   * GET /api/invoices/:code
   * Supports both invoice codes and application codes (NAPP-*, WAPP-*, INCR-*, GOLA-*)
   * Optional query parameter: ?applicationCode=NAPP to explicitly filter by document type
   */
  getInvoiceByCode = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Invoice by Code');

    try {
      const { code } = req.params;
      const churchId = req.user?.churchId;
      const applicationCode = req.query.applicationCode || null;

      if (!code) {
        return this.sendError(res, 'Invoice code is required', 400);
      }

      const invoice = await this.invoiceRepository.getInvoiceByCode(code, churchId, applicationCode);

      if (!invoice) {
        // Enhanced error message with diagnostic info
        logger.warn(`Invoice lookup failed: code=${code}, churchId=${churchId}, applicationCode=${applicationCode}`);
        
        // Try to provide helpful diagnostic information
        let diagnosticInfo = null;
        try {
          // Check if invoice exists without churchId filter (for debugging)
          const invoiceWithoutChurch = await this.invoiceRepository.getInvoiceByCode(code, null, applicationCode);
          if (invoiceWithoutChurch) {
            diagnosticInfo = {
              message: 'Invoice exists but belongs to a different church',
              foundChurchId: invoiceWithoutChurch.churchId,
              requestedChurchId: churchId
            };
          } else {
            // Run comprehensive diagnostic query
            const { executeQuery } = require('../config/database');
            try {
              const diagQuery = `
                SELECT TOP 10
                  i.InvoiceId,
                  i.Code AS InvoiceCode,
                  i.Status,
                  i.ChurchId,
                  i.TransactionDate,
                  id.RefDocNumber,
                  id.RefDocName,
                  id.ItemId
                FROM Invoice i WITH(NOLOCK)
                LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
                WHERE id.RefDocNumber = @code
                   OR UPPER(LTRIM(RTRIM(id.RefDocNumber))) = @codeUpper
                   OR i.RefDocNumber = @code
                   OR UPPER(LTRIM(RTRIM(i.RefDocNumber))) = @codeUpper
                ORDER BY i.TransactionDate DESC
              `;
              const diagResult = await executeQuery(diagQuery, {
                code: code,
                codeUpper: code.toUpperCase().trim()
              });
              
              if (diagResult.recordset && diagResult.recordset.length > 0) {
                diagnosticInfo = {
                  message: 'Invoices found in database but not matching lookup criteria',
                  foundInvoices: diagResult.recordset.map(r => ({
                    invoiceId: r.InvoiceId,
                    invoiceCode: r.InvoiceCode,
                    status: r.Status,
                    churchId: r.ChurchId,
                    refDocNumber: r.RefDocNumber,
                    refDocName: r.RefDocName,
                    itemId: r.ItemId,
                    transactionDate: r.TransactionDate,
                    issues: [
                      r.Status === 0 ? 'Status is 0 (deleted)' : null,
                      churchId && r.ChurchId !== churchId ? `ChurchId mismatch: expected ${churchId}, found ${r.ChurchId}` : null
                    ].filter(Boolean)
                  }))
                };
              } else {
                diagnosticInfo = {
                  message: 'No invoices found in database with this RefDocNumber',
                  searchedCode: code
                };
              }
            } catch (diagQueryError) {
              logger.warn('Failed to run diagnostic query in controller:', diagQueryError);
            }
          }
        } catch (diagError) {
          logger.warn('Failed to run diagnostic check:', diagError);
        }
        
        const errorResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Invoice not found'
          }
        };
        
        if (diagnosticInfo) {
          errorResponse.diagnostic = diagnosticInfo;
        }
        
        return res.status(404).json(errorResponse);
      }

      return this.sendSuccess(res, invoice, 'Invoice retrieved successfully');
    } catch (error) {
      logger.error('Controller: Failed to get invoice:', error);
      return this.sendError(res, 'Failed to retrieve invoice', 500);
    }
  });

  /**
   * Search invoices
   * GET /api/invoices/search
   */
  searchInvoices = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Search Invoices');

    try {
      const {
        customerName,
        refDocNumber,
        refDocName,
        status,
        transactionDateFrom,
        transactionDateTo,
        page = 1,
        limit = 10
      } = req.query;

      const churchId = req.user?.churchId;

      // Build query
      let query = `
        SELECT 
          i.*,
          (SELECT COUNT(*) FROM InvoiceDetail id WHERE id.InvoiceId = i.InvoiceId) AS DetailCount
        FROM Invoice i WITH(NOLOCK)
        WHERE i.Status > 0
      `;

      const params = {};
      const conditions = [];

      if (churchId) {
        conditions.push('i.ChurchId = @churchId');
        params.churchId = churchId;
      }

      if (customerName) {
        conditions.push('i.CustomerName LIKE @customerName');
        params.customerName = `%${customerName}%`;
      }

      if (refDocNumber) {
        conditions.push('i.RefDocNumber = @refDocNumber');
        params.refDocNumber = refDocNumber;
      }

      if (refDocName) {
        conditions.push('i.RefDocName = @refDocName');
        params.refDocName = refDocName;
      }

      if (status !== undefined) {
        conditions.push('i.Status = @status');
        params.status = parseInt(status);
      }

      if (transactionDateFrom) {
        conditions.push('CAST(i.TransactionDate AS DATE) >= CAST(@transactionDateFrom AS DATE)');
        params.transactionDateFrom = transactionDateFrom;
      }

      if (transactionDateTo) {
        conditions.push('CAST(i.TransactionDate AS DATE) <= CAST(@transactionDateTo AS DATE)');
        params.transactionDateTo = transactionDateTo;
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      // Get total count
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) AS Total FROM');
      const { executeQuery } = require('../config/database');
      const countResult = await executeQuery(countQuery, params);
      const total = countResult.recordset[0]?.Total || 0;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` ORDER BY i.TransactionDate DESC, i.InvoiceId DESC`;
      query += ` OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;

      const result = await executeQuery(query, params);

      return this.sendSuccess(res, {
        invoices: result.recordset || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }, 'Invoices retrieved successfully');
    } catch (error) {
      logger.error('Controller: Failed to search invoices:', error);
      return this.sendError(res, 'Failed to search invoices', 500);
    }
  });
}

module.exports = InvoiceController;

