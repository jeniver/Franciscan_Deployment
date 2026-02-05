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
      } else if (normalizedCode.startsWith('INCR-') || normalizedCode.startsWith('I-')) {
        // Inscription Request - format: "INCR-XXXX" or "I-XXXX"
        refDocName = 'INCR';
        
        // Query NicheInscriptionRequest table
        const inscrQuery = `
          SELECT TOP 1
            NicheInscriptionRequestId,
            Code,
            ApplicantName,
            ChurchId,
            NicheBookingId
          FROM NicheInscriptionRequest WITH(NOLOCK)
          WHERE Code = @code
        `;
        
        const inscrResult = await executeQuery(inscrQuery, { code });
        if (inscrResult.recordset && inscrResult.recordset.length > 0) {
          application = inscrResult.recordset[0];
          customerName = application.ApplicantName || 'Unknown Applicant';
          
          // Check church access
          if (application.ChurchId !== churchId) {
            return this.sendError(res, 'Access denied - Church ID mismatch', 403);
          }
          
          // Get inscription items for this inscription request
          try {
            const inscriptionData = await this.getInscriptionItems(code, churchId);
            if (inscriptionData && inscriptionData.length > 0) {
              // Use the first item's details as the main application details
              const firstItem = inscriptionData[0];
              application.Amount = firstItem.totalPayingAmount || firstItem.unitAmount;
            } else if (inscriptionData && inscriptionData.items && inscriptionData.items.length > 0) {
              // Handle the new object format from InscriptionInvoiceService
              const firstItem = inscriptionData.items[0];
              application.Amount = firstItem.Price || firstItem.price || 0;
                    
              // Set customer name from applicant details if available
              if (inscriptionData.applicant && inscriptionData.applicant.name) {
                customerName = inscriptionData.applicant.name;
                // Also populate address details from applicant
                if (inscriptionData.applicant.address) {
                  application.ApplicantAddressNo = inscriptionData.applicant.address.block || '';
                  application.ApplicantAddressLine1 = inscriptionData.applicant.address.street || '';
                  application.ApplicantAddressLine2 = inscriptionData.applicant.address.unitNo || '';
                  application.ApplicantAddressCity = inscriptionData.applicant.address.postalCode || '';
                }
                // Populate contact details
                application.ApplicantMobileNo = inscriptionData.applicant.mobile || '';
                application.ApplicantEmailID = inscriptionData.applicant.emailId || '';
              }
            }
          } catch (inscriptionError) {
            logger.warn('Failed to get inscription items for invoice creation:', inscriptionError.message);
          }
        } else {
          return this.sendError(res, `Inscription request not found for code: ${code}`, 404);
        }
      } else if (normalizedCode.startsWith('WAPP-')) {
        refDocName = 'WAPP';
        // TODO: Implement Wake Room Application resolution
        return this.sendError(res, 'Wake Room Application invoice creation not yet implemented', 501);
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

      // For INCR (inscription) requests, get inscription-specific items instead of generic niche items
      if (refDocName === 'INCR' && !item) {
        // Get inscription items from InscriptionInvoiceService
        try {
          const inscriptionItems = await this.getInscriptionItems(code, churchId);
          if (inscriptionItems && inscriptionItems.length > 0) {
            // Use the first inscription item
            const firstInscriptionItem = inscriptionItems[0];
            item = {
              ItemId: firstInscriptionItem.itemId,
              ItemName: firstInscriptionItem.itemName,
              ItemCode: firstInscriptionItem.itemCode,
              ItemPrice: firstInscriptionItem.unitAmount
            };
          } else if (inscriptionItems && inscriptionItems.items && inscriptionItems.items.length > 0) {
            // Handle object format
            const firstInscriptionItem = inscriptionItems.items[0];
            item = {
              ItemId: firstInscriptionItem.ItemId || firstInscriptionItem.itemId,
              ItemName: firstInscriptionItem.Name || firstInscriptionItem.ItemName || 'Inscription Item',
              ItemCode: firstInscriptionItem.Code || firstInscriptionItem.ItemCode,
              ItemPrice: firstInscriptionItem.Price || firstInscriptionItem.unitAmount || 0
            };
          }
        } catch (inscriptionItemError) {
          logger.warn('Failed to get inscription items for item selection:', inscriptionItemError.message);
        }
      }

      // Fallback: Get item by DocType NAPP or IsRefType = 1 (only for non-INCR)
      if (!item && refDocName !== 'INCR') {
        const itemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name AS ItemName,
            i.Code AS ItemCode,
            i.Price AS ItemPrice
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
            AND (i.DocType = 'NAPP' OR i.IsRefType = 1)
          ORDER BY i.ItemId
        `;
        const itemResult = await executeQuery(itemQuery, { churchId });
        if (itemResult.recordset && itemResult.recordset.length > 0) {
          item = itemResult.recordset[0];
        }
      }

      // Last resort: Get any item for the church (different approach for INCR vs NAPP)
      if (!item) {
        let fallbackItemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name AS ItemName,
            i.Code AS ItemCode,
            i.Price AS ItemPrice
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
        `;
        
        // For INCR, prioritize inscription-related items
        if (refDocName === 'INCR') {
          fallbackItemQuery += ` AND (i.DocType = 'INCR' OR i.Code LIKE 'INSC%' OR i.Code LIKE 'PLAQ%')`;
        } else {
          // For NAPP, prioritize niche-related items
          fallbackItemQuery += ` AND (i.DocType = 'NAPP' OR i.IsRefType = 1)`;
        }
        
        fallbackItemQuery += ` ORDER BY i.ItemId`;
        
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
        // Try to get customer details from inscription data if available
        let finalCustomerName = req.body.customerName || customerName || application.ApplicantName || 'Unknown Customer';
        let customerAddress = null;
        let customerAddress2 = null;
        let customerAddressCity = null;
        let customerAddressNo = null;
        let customerDistrictCode = null;
        let customerCountry = null;
        let customerMobile = null;
        let customerEmail = null;
              
        // Try to get address details from inscription data
        if (application && application.ApplicantAddressLine1) {
          customerAddressNo = application.ApplicantAddressNo || null;
          customerAddress = application.ApplicantAddressLine1;
          customerAddress2 = application.ApplicantAddressLine2 || null;
          customerAddressCity = application.ApplicantAddressCity || null;
          customerDistrictCode = application.ApplicantAddressState || null;
          customerCountry = application.ApplicantAddressCountry || null;
          customerMobile = application.ApplicantMobileNo || null;
          customerEmail = application.ApplicantEmailID || null;
        }
              
        invoiceData = {
          transactionDate: req.body.transactionDate || application.AgreementDate || application.AppliedDate || new Date(),
          refDocNumber: code.trim(), // Use the application code
          refDocName: refDocName,
          customerName: finalCustomerName,
          totalAmount: totalAmount,
          payingAmount: req.body.payingAmount !== undefined ? req.body.payingAmount : totalAmount,
          paymentMode: req.body.paymentMode || 'Cash',
          addressNo: customerAddressNo,
          address: customerAddress,
          address2: customerAddress2,
          addressCity: customerAddressCity,
          districtCode: customerDistrictCode,
          country: customerCountry,
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

        // Prepare invoice data with better customer information
        let finalCustomerName = customerName || application.ApplicantName || 'Unknown Customer';
        let customerAddress = null;
        let customerAddress2 = null;
        let customerAddressCity = null;
        let customerAddressNo = null;
        let customerDistrictCode = null;
        let customerCountry = null;
        let customerMobile = null;
        let customerEmail = null;
        
        // Try to get address details from application
        if (application.ApplicantAddressLine1) {
          customerAddressNo = application.ApplicantAddressNo || null;
          customerAddress = application.ApplicantAddressLine1;
          customerAddress2 = application.ApplicantAddressLine2 || null;
          customerAddressCity = application.ApplicantAddressCity || null;
          customerDistrictCode = application.ApplicantAddressState || null;
          customerCountry = application.ApplicantAddressCountry || null;
          customerMobile = application.ApplicantMobileNo || null;
          customerEmail = application.ApplicantEmailID || null;
        }
        
        invoiceData = {
          transactionDate: application.AgreementDate || application.AppliedDate || new Date(),
          refDocNumber: code.trim(), // Use the application code
          refDocName: refDocName,
          customerName: finalCustomerName,
          totalAmount: totalPayingAmount,
          payingAmount: totalPayingAmount,
          paymentMode: req.body.paymentMode || 'Cash',
          paymentModeDocNo: req.body.paymentModeDocNo || null,
          nicheApplicationId: nicheApplicationId,
          taxCode: 'GST',
          taxPercentage: lineTaxPercent,
          taxAmount: lineTaxAmount,
          addressNo: customerAddressNo,
          address: customerAddress,
          address2: customerAddress2,
          addressCity: customerAddressCity,
          districtCode: customerDistrictCode,
          country: customerCountry
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
        // Check if it's an inscription code
        const normalizedCode = code.trim().toUpperCase();
        
        // If it looks like an inscription code (starts with 'I-' followed by digits and hyphens)
        if (normalizedCode.startsWith('I-')) {
          try {
            // Get inscription items for this code using the service
            const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
            const inscriptionData = await InscriptionInvoiceService.getInscriptionItems(normalizedCode, churchId);
            
            if (inscriptionData && inscriptionData.items && inscriptionData.items.length > 0) {
              // Format as application data since no invoice exists yet
              const applicationResponse = {
                isApplicationData: true,
                isInvoice: false,
                hasInvoice: false,
                canCreateInvoice: true,
                applicationCode: normalizedCode,
                customerName: inscriptionData.applicant?.name || '',
                totalAmount: 0,
                payingAmount: 0,
                taxAmount: 0,
                details: inscriptionData.items.map(item => ({
                  itemId: item.ItemId,
                  itemName: item.Name,
                  itemCode: item.Code,
                  unitAmount: item.Price,
                  quantity: 1,
                  lineTotalAmount: item.Price,
                  lineTaxAmount: item.Price * 0.09, // 9% GST
                  totalPayingAmount: item.Price * 1.09,
                  refDocNumber: normalizedCode,
                  refDocName: 'INCR',
                  refType: 'INCR'
                })),
                summary: {
                  totalItems: inscriptionData.items.length,
                  subtotal: inscriptionData.items.reduce((sum, item) => sum + (item.Price || 0), 0),
                  totalTax: inscriptionData.items.reduce((sum, item) => sum + ((item.Price || 0) * 0.09), 0),
                  grandTotal: inscriptionData.items.reduce((sum, item) => sum + ((item.Price || 0) * 1.09), 0)
                },
                // Add inscription-specific data
                inscriptionCode: normalizedCode,
                items: inscriptionData.items,
                applicant: inscriptionData.applicant,
                deceasedDetails: inscriptionData.deceasedDetails
              };
              
              return this.sendSuccess(res, applicationResponse, 'Inscription items retrieved successfully - no invoice exists yet');
            }
          } catch (inscriptionError) {
            logger.warn('Failed to get inscription items from service:', inscriptionError.message);
          }
        }
        
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
   * Get all items linked to an application code
   * GET /api/invoices/application/:code
   * Returns all items (niche, inscription, etc.) linked to the application code
   * Includes automatic calculations for totals and taxes
   * @param {string} code - Application code (e.g., "1405-0", "NAPP-52")
   */
  getApplicationItems = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Application Items');

    try {
      const { code } = req.params;
      const churchId = req.user?.churchId;
      
      if (!code) {
        return this.sendError(res, 'Application code is required', 400);
      }

      if (!churchId) {
        return this.sendError(res, 'Authentication required with church ID', 401);
      }

      // Get all items linked to this application code
      const applicationItems = await this.getApplicationItemsByCode(code, churchId);

      if (!applicationItems || applicationItems.length === 0) {
        return this.sendError(res, `No items found for application code: ${code}`, 404);
      }

      // Calculate totals and taxes
      const calculatedItems = this.calculateItemTotals(applicationItems);
      
      // Build response with summary
      const response = {
        applicationCode: code,
        items: calculatedItems.items,
        summary: calculatedItems.summary,
        references: calculatedItems.references,
        totalItems: calculatedItems.items.length
      };

      return this.sendSuccess(res, response, 'Application items retrieved successfully');
    } catch (error) {
      logger.error('Controller: Failed to get application items:', error);
      return this.sendError(res, 'Failed to retrieve application items', 500);
    }
  });

  /**
   * Get all items linked to an application code
   * @param {string} applicationCode - Application code
   * @param {number} churchId - Church ID
   * @returns {Promise<Array>} Array of items with details
   */
  async getApplicationItemsByCode(applicationCode, churchId) {
    try {
      const { executeQuery } = require('../config/database');
      const normalizedCode = applicationCode.trim().toUpperCase();
      
      logger.info(`Fetching all items for application code: ${applicationCode}, churchId: ${churchId}`);
      
      // Determine application type from code
      let appType = null;
      let baseCode = normalizedCode;
      
      if (normalizedCode.startsWith('NAPP-')) {
        appType = 'NAPP';
        baseCode = normalizedCode.substring(5);
      } else if (normalizedCode.startsWith('INCR-')) {
        appType = 'INCR';
        baseCode = normalizedCode.substring(5);
      } else if (normalizedCode.startsWith('I-NAPP-')) {
        appType = 'INCR'; // Inscription referencing NAPP
        baseCode = normalizedCode.substring(7);
      } else if (/^\d+-\d+$/.test(normalizedCode)) {
        appType = 'NAPP';
      } else {
        throw new Error(`Unsupported application code format: ${applicationCode}`);
      }

      let items = [];
      
      if (appType === 'NAPP') {
        // Get niche application items
        items = await this.getNicheApplicationItems(baseCode, churchId);
      } else if (appType === 'INCR') {
        // Get inscription items
        items = await this.getInscriptionItems(baseCode, churchId);
      }

      return items;
    } catch (error) {
      logger.error('Error getting application items:', error);
      throw error;
    }
  }

  /**
   * Get niche application items (niche wall, inscription, etc.)
   * @param {string} appCode - Niche application code
   * @param {number} churchId - Church ID
   * @returns {Promise<Array>} Array of items
   */
  async getNicheApplicationItems(appCode, churchId) {
    try {
      const { executeQuery } = require('../config/database');
      
      // Get niche application
      const appQuery = `
        SELECT TOP 1
          na.NicheApplicationId,
          na.Code,
          na.NicheId,
          na.ApplicantName,
          na.Amount,
          na.DefaultAmount,
          na.ChurchId
        FROM NicheApplication na WITH(NOLOCK)
        WHERE na.Code = @code
          AND na.ChurchId = @churchId
          AND na.Status > 0
      `;
      
      const appResult = await executeQuery(appQuery, { code: appCode, churchId });
      
      if (!appResult.recordset || appResult.recordset.length === 0) {
        logger.warn(`Niche application not found: ${appCode}`);
        return [];
      }
      
      const application = appResult.recordset[0];
      let items = [];
      
      // Get niche item
      const nicheItem = await this.getNicheItem(application.NicheId, churchId, application);
      if (nicheItem) {
        items.push(nicheItem);
      }
      
      // Get inscription items if they exist
      const inscriptionItems = await this.getInscriptionItemsForNicheApplication(application.NicheApplicationId, churchId);
      items = items.concat(inscriptionItems);
      
      return items;
    } catch (error) {
      logger.error('Error getting niche application items:', error);
      throw error;
    }
  }

  /**
   * Get niche item details
   * @param {number} nicheId - Niche ID
   * @param {number} churchId - Church ID
   * @param {Object} application - Application data
   * @returns {Promise<Object|null>} Niche item or null
   */
  async getNicheItem(nicheId, churchId, application) {
    try {
      const { executeQuery } = require('../config/database');
      
      // Get niche details
      const nicheQuery = `
        SELECT 
          n.NicheId,
          n.Code AS NicheCode,
          n.DefaultAmount AS NichePrice,
          nr.NicheLevel,
          nr.DefaultAmount AS RowPrice,
          w.Name AS WallName,
          c.Name AS ChapelName
        FROM Niche n WITH(NOLOCK)
        INNER JOIN NicheRow nr ON n.NicheRowlId = nr.NicheRowlId
        INNER JOIN NicheWall w ON nr.NicheWallId = w.NicheWallId
        INNER JOIN Chapel c ON w.ChapelId = c.ChapelId
        WHERE n.NicheId = @nicheId
      `;
      
      const nicheResult = await executeQuery(nicheQuery, { nicheId });
      
      if (!nicheResult.recordset || nicheResult.recordset.length === 0) {
        return null;
      }
      
      const niche = nicheResult.recordset[0];
      
      // Get matching item
      let item = null;
      
      // Try to get item by niche level
      if (niche.NicheLevel) {
        const levelItemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name,
            i.Code,
            i.Price,
            i.DocType
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
            AND i.ItemId = @itemId
        `;
        
        const levelItemResult = await executeQuery(levelItemQuery, { 
          churchId, 
          itemId: niche.NicheLevel 
        });
        
        if (levelItemResult.recordset && levelItemResult.recordset.length > 0) {
          item = levelItemResult.recordset[0];
        }
      }
      
      // Fallback to NAPP items
      if (!item) {
        const itemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name,
            i.Code,
            i.Price,
            i.DocType
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
            AND (i.DocType = 'NAPP' OR i.IsRefType = 1)
          ORDER BY i.ItemId
        `;
        
        const itemResult = await executeQuery(itemQuery, { churchId });
        
        if (itemResult.recordset && itemResult.recordset.length > 0) {
          item = itemResult.recordset[0];
        }
      }
      
      if (!item) {
        return null;
      }
      
      // Calculate amount
      const amount = application.Amount || 
                    niche.NichePrice || 
                    niche.RowPrice || 
                    item.Price || 
                    0;
      
      return {
        itemId: item.ItemId,
        itemName: item.Name || 'Niche',
        itemCode: item.Code,
        itemPrice: item.Price,
        quantity: 1,
        unitAmount: amount,
        lineTotalAmount: amount,
        lineTaxPercent: 9, // 9% GST
        lineTaxAmount: amount * 0.09,
        totalPayingAmount: amount * 1.09,
        refDocNumber: application.Code,
        refDocName: 'NAPP',
        refType: 'NAPP',
        description: `${niche.NicheCode} - ${niche.WallName} (${niche.ChapelName})`,
        category: 'Niche',
        nicheId: niche.NicheId,
        nicheCode: niche.NicheCode,
        wallName: niche.WallName,
        chapelName: niche.ChapelName
      };
    } catch (error) {
      logger.error('Error getting niche item:', error);
      return null;
    }
  }

  /**
   * Get inscription items for niche application
   * @param {number} nicheApplicationId - Niche Application ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Array>} Array of inscription items
   */
  async getInscriptionItemsForNicheApplication(nicheApplicationId, churchId) {
    try {
      const { executeQuery } = require('../config/database');
      
      // Get niche booking
      const bookingQuery = `
        SELECT TOP 1
          nb.NicheBookingId,
          nb.NicheApplicationId
        FROM NicheBooking nb WITH(NOLOCK)
        WHERE nb.NicheApplicationId = @nicheApplicationId
          AND nb.BookingStatus > 0
      `;
      
      const bookingResult = await executeQuery(bookingQuery, { nicheApplicationId });
      
      if (!bookingResult.recordset || bookingResult.recordset.length === 0) {
        return [];
      }
      
      const booking = bookingResult.recordset[0];
      
      // Get inscription requests
      const inscrQuery = `
        SELECT 
          nir.NicheInscriptionRequestId,
          nir.Code,
          nir.NicheBookingId
        FROM NicheInscriptionRequest nir WITH(NOLOCK)
        WHERE nir.NicheBookingId = @nicheBookingId
        ORDER BY nir.NicheInscriptionRequestId
      `;
      
      const inscrResult = await executeQuery(inscrQuery, { nicheBookingId: booking.NicheBookingId });
      
      if (!inscrResult.recordset || inscrResult.recordset.length === 0) {
        return [];
      }
      
      let items = [];
      
      // Get items for each inscription
      for (const inscription of inscrResult.recordset) {
        const inscrItems = await this.getInscriptionItems(inscription.Code, churchId);
        items = items.concat(inscrItems);
      }
      
      return items;
    } catch (error) {
      logger.error('Error getting inscription items for niche application:', error);
      return [];
    }
  }

  /**
   * Get inscription items
   * @param {string} inscrCode - Inscription code
   * @param {number} churchId - Church ID
   * @returns {Promise<Array>} Array of inscription items
   */
  async getInscriptionItems(inscrCode, churchId) {
    try {
      const { executeQuery } = require('../config/database');
      
      // Get inscription request
      const inscrQuery = `
        SELECT TOP 1
          nir.NicheInscriptionRequestId,
          nir.Code,
          nir.NicheBookingId,
          nb.NicheApplicationId
        FROM NicheInscriptionRequest nir WITH(NOLOCK)
        INNER JOIN NicheBooking nb ON nir.NicheBookingId = nb.NicheBookingId
        WHERE nir.Code = @code
      `;
      
      const inscrResult = await executeQuery(inscrQuery, { code: inscrCode });
      
      if (!inscrResult.recordset || inscrResult.recordset.length === 0) {
        return [];
      }
      
      const inscription = inscrResult.recordset[0];
      
      // Get inscription items from InscriptionInvoiceService
      try {
        const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
        const inscriptionData = await InscriptionInvoiceService.getInscriptionItems(inscrCode, churchId);
        
        if (inscriptionData && inscriptionData.items && Array.isArray(inscriptionData.items)) {
          // Handle the new object format from InscriptionInvoiceService
          return inscriptionData.items.map(item => ({
            itemId: item.ItemId,
            itemName: item.Name || item.ItemName || 'Inscription Service',
            itemCode: item.Code || item.ItemCode,
            itemPrice: item.Price || 0,
            quantity: 1,
            unitAmount: item.Price || 0,
            lineTotalAmount: item.Price || 0,
            lineTaxPercent: 9, // 9% GST
            lineTaxAmount: (item.Price || 0) * 0.09,
            totalPayingAmount: (item.Price || 0) * 1.09,
            refDocNumber: inscrCode,
            refDocName: 'INCR',
            refType: 'INCR',
            description: item.Name || item.ItemName || 'Inscription Service Item',
            category: 'Inscription',
            inscriptionId: inscription.NicheInscriptionRequestId,
            inscriptionCode: inscrCode
          }));
        } else if (inscriptionData && Array.isArray(inscriptionData)) {
          // Handle legacy array format
          return inscriptionData.map(item => ({
            itemId: item.ItemId,
            itemName: item.Name || item.ItemName || 'Inscription',
            itemCode: item.Code || item.ItemCode,
            itemPrice: item.Price || 0,
            quantity: 1,
            unitAmount: item.Price || 0,
            lineTotalAmount: item.Price || 0,
            lineTaxPercent: 9, // 9% GST
            lineTaxAmount: (item.Price || 0) * 0.09,
            totalPayingAmount: (item.Price || 0) * 1.09,
            refDocNumber: inscrCode,
            refDocName: 'INCR',
            refType: 'INCR',
            description: item.Name || item.ItemName || 'Inscription Item',
            category: 'Inscription',
            inscriptionId: inscription.NicheInscriptionRequestId,
            inscriptionCode: inscrCode
          }));
        }
      } catch (serviceError) {
        logger.warn('Failed to get inscription items from service:', serviceError.message);
      }
      
      // Fallback: Get inscription items from database
      const itemQuery = `
        SELECT 
          i.ItemId,
          i.Name,
          i.Code,
          i.Price,
          i.DocType
        FROM Item i WITH(NOLOCK)
        WHERE i.ChurchId = @churchId
          AND (i.DocType = 'INCR' OR i.Code LIKE 'INSC%' OR i.Code LIKE 'PLAQ%')
        ORDER BY i.ItemId
      `;
      
      const itemResult = await executeQuery(itemQuery, { churchId });
      
      if (!itemResult.recordset || itemResult.recordset.length === 0) {
        // Last resort: Get any item for inscription
        const fallbackItemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name,
            i.Code,
            i.Price,
            i.DocType
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
            AND i.IsRefType = 1
          ORDER BY i.ItemId
        `;
        
        const fallbackResult = await executeQuery(fallbackItemQuery, { churchId });
        
        if (!fallbackResult.recordset || fallbackResult.recordset.length === 0) {
          return [];
        }
        
        const item = fallbackResult.recordset[0];
        const amount = item.Price || 0;
        
        return [{
          itemId: item.ItemId,
          itemName: item.Name || 'Inscription Service',
          itemCode: item.Code,
          itemPrice: item.Price,
          quantity: 1,
          unitAmount: amount,
          lineTotalAmount: amount,
          lineTaxPercent: 9, // 9% GST
          lineTaxAmount: amount * 0.09,
          totalPayingAmount: amount * 1.09,
          refDocNumber: inscrCode,
          refDocName: 'INCR',
          refType: 'INCR',
          description: item.Name || 'Inscription Service Item',
          category: 'Inscription',
          inscriptionId: inscription.NicheInscriptionRequestId,
          inscriptionCode: inscrCode
        }];
      }
      
      // Return all inscription-related items
      return itemResult.recordset.map(item => {
        const amount = item.Price || 0;
        return {
          itemId: item.ItemId,
          itemName: item.Name || 'Inscription Service',
          itemCode: item.Code,
          itemPrice: item.Price,
          quantity: 1,
          unitAmount: amount,
          lineTotalAmount: amount,
          lineTaxPercent: 9, // 9% GST
          lineTaxAmount: amount * 0.09,
          totalPayingAmount: amount * 1.09,
          refDocNumber: inscrCode,
          refDocName: 'INCR',
          refType: 'INCR',
          description: item.Name || 'Inscription Service Item',
          category: 'Inscription',
          inscriptionId: inscription.NicheInscriptionRequestId,
          inscriptionCode: inscrCode
        };
      });
    } catch (error) {
      logger.error('Error getting inscription items:', error);
      return [];
    }
  }

  /**
   * Calculate totals and taxes for items
   * @param {Array} items - Array of items
   * @returns {Object} Items with calculated totals
   */
  calculateItemTotals(items) {
    try {
      // Calculate individual item totals
      const calculatedItems = items.map(item => {
        const quantity = item.quantity || 1;
        const unitAmount = item.unitAmount || 0;
        const lineTotal = quantity * unitAmount;
        const taxPercent = item.lineTaxPercent || 9;
        const taxAmount = lineTotal * (taxPercent / 100);
        const totalPaying = lineTotal + taxAmount;
        
        return {
          ...item,
          lineTotalAmount: lineTotal,
          lineTaxAmount: taxAmount,
          totalPayingAmount: totalPaying
        };
      });
      
      // Calculate summary
      const subtotal = calculatedItems.reduce((sum, item) => sum + (item.lineTotalAmount || 0), 0);
      const totalTax = calculatedItems.reduce((sum, item) => sum + (item.lineTaxAmount || 0), 0);
      const grandTotal = calculatedItems.reduce((sum, item) => sum + (item.totalPayingAmount || 0), 0);
      
      // Extract unique references
      const references = [...new Set(calculatedItems.map(item => 
        `${item.refDocName || 'N/A'}-${item.refDocNumber || 'N/A'}`
      ))].filter(Boolean);
      
      return {
        items: calculatedItems,
        summary: {
          totalItems: calculatedItems.length,
          subtotal: parseFloat(subtotal.toFixed(2)),
          totalTax: parseFloat(totalTax.toFixed(2)),
          grandTotal: parseFloat(grandTotal.toFixed(2)),
          taxPercentage: subtotal > 0 ? parseFloat(((totalTax / subtotal) * 100).toFixed(2)) : 0
        },
        references: references
      };
    } catch (error) {
      logger.error('Error calculating item totals:', error);
      throw error;
    }
  }

  /**
   * Cancel invoice by code (soft delete: Status = 0)
   * POST /api/invoices/:code/cancel
   * Mirrors ASP.NET UpdateInvoice_Status behavior.
   */
  cancelInvoiceByCode = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Cancel Invoice by Code');

    try {
      const { code } = req.params;
      const churchId = req.user?.churchId;

      if (!code) {
        return this.sendError(res, 'Invoice code is required', 400);
      }

      if (!churchId) {
        return this.sendError(res, 'Authentication required with church ID', 401);
      }

      const result = await this.invoiceService.cancelInvoiceByCode(code, churchId);

      if (!result.success) {
        const statusCode =
          result.error.code === 'NOT_FOUND' ? 404 :
          result.error.code === 'VALIDATION_ERROR' ? 400 :
          400;

        return res.status(statusCode).json(result);
      }

      return res.status(200).json({
        success: true,
        data: result.data,
        message: 'Invoice cancelled successfully'
      });
    } catch (error) {
      logger.error('Controller: Failed to cancel invoice:', error);
      return this.sendError(res, 'Failed to cancel invoice', 500);
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
        fromDate,  // Support frontend parameter
        toDate,    // Support frontend parameter
        searchTerm, // Support frontend search term
        invoiceCode, // Support frontend invoice code
        paymentMode, // Support frontend payment mode
        sortBy = 'TransactionDate', // Support frontend sortBy
        sortOrder = 'desc', // Support frontend sortOrder
        page = 1,
        limit = 10
      } = req.query;

      const churchId = req.user?.churchId;

      // Map frontend parameters to backend parameters
      const dateFrom = transactionDateFrom || fromDate;
      const dateTo = transactionDateTo || toDate;

      const params = {};
      const conditions = [];
      
      // Build base WHERE clause conditions (will be used for both main query and count query)
      conditions.push('i.Status > 0');

      if (churchId) {
        conditions.push('i.ChurchId = @churchId');
        params.churchId = churchId;
      }

      // Handle searchTerm - search across multiple fields
      if (searchTerm && searchTerm.trim()) {
        const searchConditions = [];
        const searchValue = `%${searchTerm.trim()}%`;
        
        searchConditions.push('i.CustomerName LIKE @searchTerm');
        searchConditions.push('i.InvoiceCode LIKE @searchTerm');
        searchConditions.push('i.RefDocNumber LIKE @searchTerm');
        
        params.searchTerm = searchValue;
        conditions.push(`(${searchConditions.join(' OR ')})`);
      }

      // Handle individual search fields (for backward compatibility)
      if (customerName && !searchTerm) {
        conditions.push('i.CustomerName LIKE @customerName');
        params.customerName = `%${customerName}%`;
      }

      if (invoiceCode && !searchTerm) {
        conditions.push('i.InvoiceCode LIKE @invoiceCode');
        params.invoiceCode = `%${invoiceCode}%`;
      }

      if (refDocNumber && !searchTerm) {
        conditions.push('i.RefDocNumber = @refDocNumber');
        params.refDocNumber = refDocNumber;
      }

      if (refDocName) {
        conditions.push('i.RefDocName = @refDocName');
        params.refDocName = refDocName;
      }

      if (paymentMode) {
        conditions.push('i.PaymentMode = @paymentMode');
        params.paymentMode = paymentMode;
      }

      if (status !== undefined && status !== null && status !== '') {
        conditions.push('i.Status = @status');
        params.status = parseInt(status);
      }

      if (dateFrom) {
        conditions.push('CAST(i.TransactionDate AS DATE) >= CAST(@transactionDateFrom AS DATE)');
        params.transactionDateFrom = dateFrom;
      }

      if (dateTo) {
        conditions.push('CAST(i.TransactionDate AS DATE) <= CAST(@transactionDateTo AS DATE)');
        params.transactionDateTo = dateTo;
      }

      // Build WHERE clause
      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      // Get total count - build count query separately to avoid issues with subqueries in main query
      const countQuery = `
        SELECT COUNT(*) AS Total 
        FROM Invoice i WITH(NOLOCK)
        ${whereClause}
      `;
      
      const { executeQuery } = require('../config/database');
      const countResult = await executeQuery(countQuery, params);
      const total = countResult.recordset[0]?.Total || 0;

      // Build main query with subquery for DetailCount
      let query = `
        SELECT 
          i.*,
          (SELECT COUNT(*) FROM InvoiceDetail id WHERE id.InvoiceId = i.InvoiceId) AS DetailCount
        FROM Invoice i WITH(NOLOCK)
        ${whereClause}
      `;

      // Handle sorting
      const validSortBy = ['TransactionDate', 'InvoiceId', 'CustomerName', 'InvoiceCode', 'TotalAmount', 'PayingAmount'];
      const validSortOrder = ['asc', 'desc'];
      const sortColumn = validSortBy.includes(sortBy) ? sortBy : 'TransactionDate';
      const sortDirection = validSortOrder.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` ORDER BY i.${sortColumn} ${sortDirection}, i.InvoiceId DESC`;
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
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        query: req.query
      });
      return this.sendError(res, 'Failed to search invoices', 500);
    }
  });
}

module.exports = InvoiceController;

