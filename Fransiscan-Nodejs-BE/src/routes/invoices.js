const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/InvoiceController');
const InvoiceService = require('../services/InvoiceService');
const InvoiceRepository = require('../repositories/InvoiceRepository');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, commonValidations } = require('../middleware/validation');

const invoiceController = new InvoiceController();
const invoiceRepository = new InvoiceRepository();
const invoiceService = new InvoiceService(invoiceRepository);

// All routes require authentication
router.use(authenticateToken);

// Get all invoices
router.get('/',
  invoiceController.asyncHandler(async(req, res) => {
    invoiceController.logRequest(req, 'Get All Invoices');

    const pagination = invoiceController.getPaginationParams(req);
    const filters = { ...req.query };
    delete filters.page;
    delete filters.limit;

    try {
      const result = await invoiceService.getAll({ ...pagination, ...filters });
      invoiceController.sendSuccess(res, result, 'Invoices retrieved successfully');
    } catch (error) {
      invoiceController.sendError(res, 'Failed to retrieve invoices', 500);
    }
  })
);

// Get invoices by person
router.get('/person/:personId',
  commonValidations.id,
  validate,
  invoiceController.asyncHandler(async(req, res) => {
    invoiceController.logRequest(req, 'Get Invoices by Person');

    const pagination = invoiceController.getPaginationParams(req);

    try {
      const invoices = await invoiceRepository.findByPerson(req.params.personId, pagination);
      invoiceController.sendSuccess(res, invoices, 'Invoices retrieved successfully');
    } catch (error) {
      invoiceController.sendError(res, 'Failed to retrieve invoices', 500);
    }
  })
);

// Get invoices by church
router.get('/church/:churchId',
  commonValidations.id,
  validate,
  invoiceController.asyncHandler(async(req, res) => {
    invoiceController.logRequest(req, 'Get Invoices by Church');

    const pagination = invoiceController.getPaginationParams(req);

    try {
      const invoices = await invoiceRepository.findByChurch(req.params.churchId, pagination);
      invoiceController.sendSuccess(res, invoices, 'Invoices retrieved successfully');
    } catch (error) {
      invoiceController.sendError(res, 'Failed to retrieve invoices', 500);
    }
  })
);

// Get overdue invoices
router.get('/overdue',
  invoiceController.asyncHandler(async(req, res) => {
    invoiceController.logRequest(req, 'Get Overdue Invoices');

    const pagination = invoiceController.getPaginationParams(req);

    try {
      const invoices = await invoiceRepository.findOverdue(pagination);
      invoiceController.sendSuccess(res, invoices, 'Overdue invoices retrieved successfully');
    } catch (error) {
      invoiceController.sendError(res, 'Failed to retrieve overdue invoices', 500);
    }
  })
);

// Search invoices
router.get('/search',
  authenticateToken,
  invoiceController.searchInvoices
);

// Create individual invoice
router.post('/individual',
  authenticateToken,
  invoiceController.createIndividualInvoice
);

// Create invoice by code (application code)
// POST /api/invoices/:code - Creates invoice for application code (e.g., "4652-0", "NAPP-52")
// This route must come before GET /:code to avoid conflicts
router.post('/:code',
  authenticateToken,
  invoiceController.createInvoiceByCode
);

// Get application items by application code
// GET /api/invoices/application/:code - Retrieves all items linked to an application code
router.get('/application/:code',
  authenticateToken,
  invoiceController.getApplicationItems
);

// Get creation status for a code
// GET /api/invoices/status/:code - Get status of what's been created
router.get('/status/:code',
  authenticateToken,
  invoiceController.getCreationStatus
);

// Get invoice by code
// GET /api/invoices/:code - Retrieves invoice by invoice code or application code
router.get('/:code',
  authenticateToken,
  invoiceController.getInvoiceByCode
);

// Get combined invoice and receipt data
// GET /api/invoices/:code/combined - Returns both invoice and receipt data in a single response
router.get('/:code/combined',
  authenticateToken,
  invoiceController.getCombinedInvoiceReceiptData
);

// Check receipt associations for an invoice
// GET /api/invoices/:code/receipts - Checks if there are any receipts associated with the given invoice code
router.get('/:code/receipts',
  authenticateToken,
  invoiceController.checkReceiptAssociations
);

// Get invoice by ID (legacy endpoint - keep for backward compatibility)
router.get('/id/:id',
  authenticateToken,
  commonValidations.id,
  validate,
  invoiceController.asyncHandler(async(req, res) => {
    invoiceController.logRequest(req, 'Get Invoice by ID');

    try {
      const invoice = await invoiceService.getById(req.params.id);
      if (!invoice) {
        return invoiceController.sendError(res, 'Invoice not found', 404);
      }

      invoiceController.sendSuccess(res, invoice, 'Invoice retrieved successfully');
    } catch (error) {
      invoiceController.sendError(res, 'Failed to retrieve invoice', 500);
    }
  })
);

// Create new invoice (enhanced with ASP.NET logic)
router.post('/',
  authenticateToken,
  invoiceController.createInvoice
);

// Update invoice
router.put('/:id',
  commonValidations.id,
  commonValidations.invoice.update,
  validate,
  invoiceController.asyncHandler(async(req, res) => {
    invoiceController.logRequest(req, 'Update Invoice');

    try {
      const invoice = await invoiceService.update(req.params.id, req.body);
      if (!invoice) {
        return invoiceController.sendError(res, 'Invoice not found', 404);
      }

      invoiceController.sendSuccess(res, invoice, 'Invoice updated successfully');
    } catch (error) {
      invoiceController.sendError(res, error.message, 400);
    }
  })
);

// Record payment for invoice
router.post('/:code/payments',
  validate,
  invoiceController.asyncHandler(async(req, res) => {
    invoiceController.logRequest(req, 'Record Invoice Payment');

    const { code } = req.params;
    const paymentData = req.body;
    const userId = req.user?.userId;
    const churchId = req.user?.churchId;

    try {
      if (!userId) {
        return invoiceController.sendError(res, 'User authentication required', 401);
      }

      const result = await invoiceService.recordPayment(code, paymentData, userId, churchId);

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return invoiceController.sendError(res, result.error.message, 404);
        }
        if (result.error.code === 'ACCESS_DENIED') {
          return invoiceController.sendError(res, result.error.message, 403);
        }
        return invoiceController.sendError(res, result.error.message, 400);
      }

      return res.status(200).json(result);
    } catch (error) {
      invoiceController.sendError(res, 'Failed to record payment', 500);
    }
  })
);

// Cancel invoice by code (soft delete: Status = 0)
// POST /api/invoices/:code/cancel
router.post('/:code/cancel',
  authenticateToken,
  invoiceController.cancelInvoiceByCode
);

// Mark invoice as paid
router.patch('/:id/paid',
  commonValidations.id,
  validate,
  invoiceController.asyncHandler(async(req, res) => {
    invoiceController.logRequest(req, 'Mark Invoice as Paid');

    try {
      const invoice = await invoiceService.markAsPaid(req.params.id);
      if (!invoice) {
        return invoiceController.sendError(res, 'Invoice not found', 404);
      }

      invoiceController.sendSuccess(res, invoice, 'Invoice marked as paid successfully');
    } catch (error) {
      invoiceController.sendError(res, 'Failed to mark invoice as paid', 500);
    }
  })
);

// Delete invoice (admin only)
router.delete('/:id',
  authorize(['admin']),
  commonValidations.id,
  validate,
  invoiceController.asyncHandler(async(req, res) => {
    invoiceController.logRequest(req, 'Delete Invoice');

    try {
      const success = await invoiceService.delete(req.params.id);
      if (!success) {
        return invoiceController.sendError(res, 'Invoice not found', 404);
      }

      invoiceController.sendSuccess(res, null, 'Invoice deleted successfully');
    } catch (error) {
      invoiceController.sendError(res, 'Failed to delete invoice', 500);
    }
  })
);

module.exports = router;
