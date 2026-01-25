const express = require('express');
const router = express.Router();
const ReceiptItemController = require('../controllers/ReceiptItemController');
const { authenticateToken } = require('../middleware/auth');

const receiptItemController = new ReceiptItemController();

/**
 * Receipt Item Routes
 * Base path: /api/receipts/:receiptId/items
 */

// All routes require authentication
router.use(authenticateToken);

// Get all receipt items for a receipt
router.get('/receipts/:receiptId/items', receiptItemController.getReceiptItems);

// Get single receipt item
router.get('/receipts/:receiptId/items/:itemId', receiptItemController.getReceiptItem);

// Create receipt item
router.post('/receipts/:receiptId/items', receiptItemController.createReceiptItem);

// Update receipt item
router.put('/receipts/:receiptId/items/:itemId', receiptItemController.updateReceiptItem);

// Delete receipt item
router.delete('/receipts/:receiptId/items/:itemId', receiptItemController.deleteReceiptItem);

// Batch create/update receipt items
router.post('/receipts/:receiptId/items/batch', receiptItemController.batchReceiptItems);

// Get receipt items by reference document
router.get('/receipt-items/by-ref-doc', receiptItemController.getReceiptItemsByRefDoc);

module.exports = router;

