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

      const items = await this.itemService.listByCategory(category, churchId);

      return this.sendSuccess(res, items, 'Items retrieved successfully');
    } catch (error) {
      logger.error('ItemController: Failed to list items', {
        error: error.message,
        stack: error.stack
      });
      return this.sendError(res, 'Failed to retrieve items', 500);
    }
  });
}

module.exports = ItemController;


