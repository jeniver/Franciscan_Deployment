const express = require('express');
const router = express.Router();
const ReceiptController = require('../controllers/ReceiptController');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticateToken);

/**
 * Receipt Routes
 * All endpoints match ASP.NET WebMethods functionality
 * IMPORTANT: Specific routes must come BEFORE generic routes like /:code
 */

// Create receipt
// POST /api/receipts
// Based on: Payment/Receipt.aspx.cs CaptureReceipt
router.post('/', asyncHandler((req, res) => ReceiptController.createReceipt(req, res)));

// Create receipt from invoice
// POST /api/receipts/from-invoice
// Based on: Invoice/InduvidualReceiptCapture.aspx.cs CaptureReceipt
router.post('/from-invoice', asyncHandler((req, res) => ReceiptController.createReceiptFromInvoice(req, res)));

// Create individual receipt
// POST /api/receipts/individual
// Create receipt for application code directly
router.post('/individual', asyncHandler((req, res) => ReceiptController.createIndividualReceipt(req, res)));

// Get last receipt number
// GET /api/receipts/last-number
// Based on: Invoice/InduvidualReceiptCapture.aspx.cs LoadLastReceiptNumber
router.get('/last-number', asyncHandler((req, res) => ReceiptController.getLastReceiptNumber(req, res)));

// Get last miscellaneous receipt number
// GET /api/receipts/last-misc-number
// Based on: Invoice/InduvidualReceiptCapture.aspx.cs GetLastMiscReceiptNumber
router.get('/last-misc-number', asyncHandler((req, res) => ReceiptController.getLastMiscReceiptNumber(req, res)));

// Get receipt report (using ReceiptReport stored procedure)
// GET /api/receipts/report?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
// Based on: ReceiptReport stored procedure
router.get('/report', asyncHandler((req, res) => ReceiptController.getReceiptReport(req, res)));

// Get GOA monthly list (Gates of Life Monthly Report)
// GET /api/receipts/goa-monthly?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
// Based on: GOAMonthlyList stored procedure
router.get('/goa-monthly', asyncHandler((req, res) => ReceiptController.getGOAMonthlyList(req, res)));

// Get inscription monthly list
// GET /api/receipts/inscription-monthly?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
// Based on: InscriptionMonthlyList stored procedure
router.get('/inscription-monthly', asyncHandler((req, res) => ReceiptController.getInscriptionMonthlyList(req, res)));

// Search receipts by code/customer/invoice
// GET /api/receipts/search?query=ABC&receiptCode=...&customerName=...
router.get('/search', asyncHandler((req, res) => ReceiptController.searchReceipts(req, res)));

// Get wake room monthly list
// GET /api/receipts/wake-room-monthly?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
// Based on: WakeRoomMonthlyList stored procedure
router.get('/wake-room-monthly', asyncHandler((req, res) => ReceiptController.getWakeRoomMonthlyList(req, res)));

// Get invoice PDF by invoice code
// GET /api/receipts/invoice/:code/pdf
router.get('/invoice/:code/pdf', asyncHandler((req, res) => ReceiptController.getInvoicePdf(req, res)));

// Get invoice by code (for receipt creation)
// GET /api/receipts/invoice/:code
// Based on: Payment/Receipt.aspx.cs LoadRefDocument
router.get('/invoice/:code', asyncHandler((req, res) => ReceiptController.getInvoiceByCode(req, res)));

// Get receipts by date range
// GET /api/receipts?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&page=1&limit=50
// This must come before /:code to avoid conflicts
router.get('/', asyncHandler((req, res) => ReceiptController.getReceipts(req, res)));

// Get receipt PDF by receipt code
// GET /api/receipts/:code/pdf
router.get('/:code/pdf', asyncHandler((req, res) => ReceiptController.getReceiptPdf(req, res)));

// Get receipt by code
// GET /api/receipts/:code
// Based on: Payment/Receipt.aspx.cs ViewReceipt
// MUST BE LAST - catches all other GET requests with a code parameter
router.get('/:code', asyncHandler((req, res) => ReceiptController.getReceipt(req, res)));

module.exports = router;

