const BaseController = require('./BaseController');
const ItemService = require('../services/ItemService');
const logger = require('../utils/logger');

/**
 * ItemController - exposes read-only /api/items endpoints.
 *
 * This is analogous to the ASP.NET LoadItems WebMethod, but implemented
 * as REST endpoints. It does not modify any data, so existing features
 * remain unchanged.
 */
class ItemController extends BaseController {
  constructor() {
    super();
    this.itemService = new ItemService();
  }

  /**
   * GET /api/items/categories
   * Returns the list of logical item categories.
   */
  getCategories = this.asyncHandler(async (req, res) => {
    const categories = this.itemService.getCategories();
    return this.sendSuccess(res, categories, 'Item categories retrieved successfully');
  });

  /**
   * GET /api/items?category=NICHES
   * Returns items for the current church, optionally filtered by category.
   */
  listItems = this.asyncHandler(async (req, res) => {
    try {
      const { category } = req.query;
      const churchId = req.user && req.user.churchId;

      if (!churchId) {
        return this.sendError(res, 'Church ID is required', 400);
      }

      // Add cache-busting headers to prevent caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const items = await this.itemService.listByCategory(category, churchId);

      logger.info(`ItemController: Found ${items?.length || 0} items for churchId: ${churchId}, category: ${category || 'ALL'}`);

      if (items?.length === 0) {
        logger.warn(`ItemController: No items found for church ${churchId}. This might be due to missing data in the Item table or incorrect churchId.`);
      }

      return this.sendSuccess(res, items, 'Items retrieved successfully');
    } catch (error) {
      logger.error('ItemController: Failed to list items', {
        error: error.message,
        stack: error.stack
      });
      return this.sendError(res, 'Failed to retrieve items', 500);
    }
  });

  /**
   * GET /api/items/:id
   */
  getItem = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const churchId = req.user?.churchId;

    if (!churchId) return this.sendError(res, 'Church ID is required', 400);

    // Add cache-busting headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const item = await this.itemService.getItemById(id, churchId);
    if (!item) return this.sendError(res, 'Item not found', 404);

    return this.sendSuccess(res, item, 'Item retrieved successfully');
  });

  /**
   * POST /api/items
   */
  createItem = this.asyncHandler(async (req, res) => {
    const churchId = req.user?.churchId;
    if (!churchId) return this.sendError(res, 'Church ID is required', 400);

    const item = await this.itemService.createItem(req.body, churchId);
    return this.sendSuccess(res, item, 'Item created successfully', 201);
  });

  /**
   * PUT /api/items/:id
   */
  updateItem = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const churchId = req.user?.churchId;
    if (!churchId) return this.sendError(res, 'Church ID is required', 400);

    const item = await this.itemService.updateItem(id, req.body, churchId);
    if (!item) return this.sendError(res, 'Item not found or update failed', 404);

    return this.sendSuccess(res, item, 'Item updated successfully');
  });

  /**
   * DELETE /api/items/:id
   */
  deleteItem = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const churchId = req.user?.churchId;
    if (!churchId) return this.sendError(res, 'Church ID is required', 400);

    const success = await this.itemService.deleteItem(id, churchId);
    if (!success) return this.sendError(res, 'Item not found or delete failed', 404);

    return this.sendSuccess(res, null, 'Item deleted successfully');
  });
}

module.exports = ItemController;


