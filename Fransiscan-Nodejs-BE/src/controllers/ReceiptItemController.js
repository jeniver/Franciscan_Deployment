const ReceiptItemService = require('../services/ReceiptItemService');
const BaseController = require('./BaseController');
const logger = require('../utils/logger');

/**
 * ReceiptItemController for receipt item endpoints
 */
class ReceiptItemController extends BaseController {
  constructor() {
    super();
    this.receiptItemService = new ReceiptItemService();
  }

  /**
   * Get all receipt items for a receipt
   * GET /api/receipts/:receiptId/items
   */
  getReceiptItems = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Get Receipt Items');

    try {
      const { receiptId } = req.params;
      const { includeItemInfo, includeRefDoc } = req.query;
      const churchId = req.user?.churchId;

      if (!receiptId) {
        return this.sendError(res, 'Receipt ID is required', 400);
      }

      const options = {
        includeItemInfo: includeItemInfo === 'true',
        includeRefDoc: includeRefDoc === 'true'
      };

      const result = await this.receiptItemService.getReceiptItems(
        parseInt(receiptId),
        churchId,
        options
      );

      if (!result.success) {
        return this.sendError(res, result.error.message, 400, result.error);
      }

      return this.sendSuccess(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller: Failed to get receipt items:', error);
      return this.sendError(res, 'Failed to retrieve receipt items', 500);
    }
  });

  /**
   * Get single receipt item
   * GET /api/receipts/:receiptId/items/:itemId
   */
  getReceiptItem = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Get Receipt Item');

    try {
      const { receiptId, itemId } = req.params;
      const churchId = req.user?.churchId;

      if (!itemId) {
        return this.sendError(res, 'Receipt item ID is required', 400);
      }

      const result = await this.receiptItemService.getReceiptItem(
        parseInt(itemId),
        churchId
      );

      if (!result.success) {
        const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return this.sendError(res, result.error.message, statusCode, result.error);
      }

      return this.sendSuccess(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller: Failed to get receipt item:', error);
      return this.sendError(res, 'Failed to retrieve receipt item', 500);
    }
  });

  /**
   * Create receipt item
   * POST /api/receipts/:receiptId/items
   */
  createReceiptItem = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Create Receipt Item');

    try {
      const { receiptId } = req.params;
      const itemData = req.body;
      const userId = req.user?.userId;
      const churchId = req.user?.churchId;

      if (!receiptId) {
        return this.sendError(res, 'Receipt ID is required', 400);
      }

      if (!userId || !churchId) {
        return this.sendError(res, 'Authentication required', 401);
      }

      const result = await this.receiptItemService.createReceiptItem(
        parseInt(receiptId),
        itemData,
        userId,
        churchId
      );

      if (!result.success) {
        const statusCode = result.error.code === 'VALIDATION_ERROR' ? 400 : 
                          result.error.code === 'INVALID_REF_DOCUMENT' ? 400 : 500;
        return this.sendError(res, result.error.message, statusCode, result.error);
      }

      return this.sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      logger.error('Controller: Failed to create receipt item:', error);
      return this.sendError(res, 'Failed to create receipt item', 500);
    }
  });

  /**
   * Update receipt item
   * PUT /api/receipts/:receiptId/items/:itemId
   */
  updateReceiptItem = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Update Receipt Item');

    try {
      const { receiptId, itemId } = req.params;
      const itemData = req.body;
      const userId = req.user?.userId;
      const churchId = req.user?.churchId;

      if (!itemId) {
        return this.sendError(res, 'Receipt item ID is required', 400);
      }

      if (!userId || !churchId) {
        return this.sendError(res, 'Authentication required', 401);
      }

      const result = await this.receiptItemService.updateReceiptItem(
        parseInt(itemId),
        itemData,
        userId,
        churchId
      );

      if (!result.success) {
        const statusCode = result.error.code === 'NOT_FOUND' ? 404 :
                          result.error.code === 'VALIDATION_ERROR' ? 400 :
                          result.error.code === 'INVALID_REF_DOCUMENT' ? 400 : 500;
        return this.sendError(res, result.error.message, statusCode, result.error);
      }

      return this.sendSuccess(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller: Failed to update receipt item:', error);
      return this.sendError(res, 'Failed to update receipt item', 500);
    }
  });

  /**
   * Delete receipt item
   * DELETE /api/receipts/:receiptId/items/:itemId
   */
  deleteReceiptItem = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Delete Receipt Item');

    try {
      const { receiptId, itemId } = req.params;
      const userId = req.user?.userId;
      const churchId = req.user?.churchId;

      if (!itemId) {
        return this.sendError(res, 'Receipt item ID is required', 400);
      }

      if (!userId || !churchId) {
        return this.sendError(res, 'Authentication required', 401);
      }

      const result = await this.receiptItemService.deleteReceiptItem(
        parseInt(itemId),
        userId,
        churchId
      );

      if (!result.success) {
        const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
        return this.sendError(res, result.error.message, statusCode, result.error);
      }

      return this.sendSuccess(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller: Failed to delete receipt item:', error);
      return this.sendError(res, 'Failed to delete receipt item', 500);
    }
  });

  /**
   * Batch create/update receipt items
   * POST /api/receipts/:receiptId/items/batch
   */
  batchReceiptItems = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Batch Receipt Items');

    try {
      const { receiptId } = req.params;
      const { operation, items } = req.body;
      const userId = req.user?.userId;
      const churchId = req.user?.churchId;

      if (!receiptId) {
        return this.sendError(res, 'Receipt ID is required', 400);
      }

      if (!operation || !['create', 'update'].includes(operation)) {
        return this.sendError(res, 'Operation must be "create" or "update"', 400);
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return this.sendError(res, 'Items array is required and cannot be empty', 400);
      }

      if (!userId || !churchId) {
        return this.sendError(res, 'Authentication required', 401);
      }

      let result;
      if (operation === 'create') {
        result = await this.receiptItemService.createReceiptItemsBatch(
          parseInt(receiptId),
          items,
          userId,
          churchId
        );
      } else {
        result = await this.receiptItemService.updateReceiptItemsBatch(
          parseInt(receiptId),
          items,
          userId,
          churchId
        );
      }

      if (!result.success) {
        const statusCode = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
        return this.sendError(res, result.error.message, statusCode, result.error);
      }

      return this.sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      logger.error('Controller: Failed to batch receipt items:', error);
      return this.sendError(res, 'Failed to batch receipt items', 500);
    }
  });

  /**
   * Get receipt items by reference document
   * GET /api/receipt-items/by-ref-doc
   */
  getReceiptItemsByRefDoc = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Get Receipt Items by Reference Document');

    try {
      const { refDocNumber, refDocName } = req.query;
      const churchId = req.user?.churchId;

      if (!refDocNumber) {
        return this.sendError(res, 'Reference document number is required', 400);
      }

      const result = await this.receiptItemService.getReceiptItemsByRefDoc(
        refDocNumber,
        refDocName,
        churchId
      );

      if (!result.success) {
        return this.sendError(res, result.error.message, 400, result.error);
      }

      return this.sendSuccess(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller: Failed to get receipt items by reference document:', error);
      return this.sendError(res, 'Failed to retrieve receipt items', 500);
    }
  });
}

module.exports = ReceiptItemController;

