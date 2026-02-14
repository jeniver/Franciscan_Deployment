const ItemRepository = require('../repositories/ItemRepository');
const logger = require('../utils/logger');

/**
 * ItemService - business logic for item catalog.
 *
 * This is read-only and mirrors ASP.NET InvoiceBL.GetAllItems / GetTaskMappedItems
 * at a high level, but without changing any existing invoice/receipt logic.
 */
class ItemService {
  constructor() {
    this.repository = new ItemRepository();
  }

  /**
   * List all items for the current church.
   * @param {number} churchId
   * @returns {Promise<Array>}
   */
  async listAllItems(churchId) {
    if (!churchId) {
      throw new Error('ChurchId is required');
    }
    return this.repository.getAllItems(churchId);
  }

  /**
   * List items for a given category and church.
   * If category is not provided, falls back to all items.
   * @param {string} category
   * @param {number} churchId
   * @returns {Promise<Array>}
   */
  async listByCategory(category, churchId) {
    if (!churchId) {
      throw new Error('ChurchId is required');
    }

    if (!category) {
      return this.repository.getAllItems(churchId);
    }

    try {
      return await this.repository.getItemsByCategory(category, churchId);
    } catch (error) {
      logger.error('ItemService: Failed to list items by category', {
        category,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Supported logical categories.
   * Static list so it is safe and non-breaking.
   * @returns {string[]}
   */
  getCategories() {
    return [
      'NICHES',
      'URNS',
      'INSCRIPTION',
      'PLAQUE',
      'ROOM',
      'MAINTENANCE',
      'OTHERS'
    ];
  }

  /**
   * Get an item by ID.
   * @param {number} itemId
   * @param {number} churchId
   * @returns {Promise<Object|null>}
   */
  async getItemById(itemId, churchId) {
    return this.repository.getItemById(itemId, churchId);
  }

  /**
   * Create a new item.
   * @param {Object} item - Item data
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>}
   */
  async createItem(item, churchId) {
    if (!churchId) throw new Error('ChurchId is required');
    if (!item.name) throw new Error('Item name is required');
    return this.repository.create(item, churchId);
  }

  /**
   * Update an existing item.
   * @param {number} itemId
   * @param {Object} item
   * @param {number} churchId
   * @returns {Promise<Object|null>}
   */
  async updateItem(itemId, item, churchId) {
    if (!churchId) throw new Error('ChurchId is required');
    return this.repository.update(itemId, item, churchId);
  }

  /**
   * Delete an item.
   * @param {number} itemId
   * @param {number} churchId
   * @returns {Promise<boolean>}
   */
  async deleteItem(itemId, churchId) {
    if (!churchId) throw new Error('ChurchId is required');
    return this.repository.delete(itemId, churchId);
  }
}

module.exports = ItemService;


