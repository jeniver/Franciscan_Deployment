const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

/**
 * ItemRepository - read-only access to Item table.
 *
 * This mirrors the ASP.NET MSSQLHelper.GetItems / InvoiceBL.GetAllItems behaviour:
 *   - Reads directly from the [Item] table
 *   - Filters by ChurchId
 *   - Returns ItemId, Name, Code, Price, ChurchId, IsRefType, DocType
 *
 * It is deliberately read-only so it cannot break any existing features.
 */
class ItemRepository {
  constructor() {
    this.tableName = 'Item';
  }

  /**
   * Get an item by its ID.
   * @param {number} itemId
   * @param {number} churchId
   * @returns {Promise<Object|null>}
   */
  async getItemById(itemId, churchId) {
    try {
      const query = `
        SELECT
          ItemId,
          Name,
          Code,
          Price,
          ChurchId,
          IsRefType,
          DocType
        FROM ${this.tableName} WITH(NOLOCK)
        WHERE ItemId = @itemId AND ChurchId = @churchId
      `;

      const result = await executeQuery(query, { itemId: parseInt(itemId), churchId: parseInt(churchId) });
      return result.recordset[0] || null;
    } catch (error) {
      logger.error('ItemRepository: Error getting item by ID', {
        itemId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all items for a given church.
   * Equivalent to ASP.NET InvoiceBL.GetAllItems().
   *
   * @param {number} churchId
   * @returns {Promise<Array>}
   */
  async getAllItems(churchId) {
    try {
      const query = `
        SELECT
          ItemId,
          Name,
          Code,
          Price,
          ChurchId,
          IsRefType,
          DocType
        FROM ${this.tableName} WITH(NOLOCK)
        WHERE ChurchId = @churchId
        ORDER BY LEN(Code), Code
      `;

      const result = await executeQuery(query, { churchId: parseInt(churchId) });
      return result.recordset || [];
    } catch (error) {
      logger.error('ItemRepository: Error getting all items', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get items by logical category.
   *
   * This uses existing columns (Code, DocType, IsRefType) only and does not
   * require any schema changes, so it is safe and non-breaking.
   *
   * @param {string} category - NICHES | URNS | INSCRIPTION | PLAQUE | ROOM | MAINTENANCE | OTHERS
   * @param {number} churchId
   * @returns {Promise<Array>}
   */
  async getItemsByCategory(category, churchId) {
    const upper = (category || '').toUpperCase();

    // Always filter by church
    const whereClauses = ['ChurchId = @churchId'];
    const params = { churchId: parseInt(churchId) };

    switch (upper) {
      case 'NICHES':
        // Niche-related items: niche applications / levels
        // Heuristic: DocType NAPP or Code starting with NICH
        whereClauses.push(`(DocType = 'NAPP' OR Code LIKE 'NICH%')`);
        break;

      case 'URNS':
        // Urn-related items
        whereClauses.push(`(Code LIKE 'URN%' OR DocType = 'URN')`);
        break;

      case 'INSCRIPTION':
      case 'PLAQUE':
        // Niche / Gates of Life inscription & plaque services
        whereClauses.push(`(DocType IN ('INCR','GOLA') OR Code LIKE 'INSC%' OR Code LIKE 'PLAQ%')`);
        break;

      case 'ROOM':
      case 'ROOMS':
        // Wake room bookings
        whereClauses.push(`(DocType = 'WAPP' OR Code LIKE 'ROOM%')`);
        break;

      case 'MAINTENANCE':
        // Maintenance-related fees
        whereClauses.push(`(Code LIKE 'MAINT%' OR Code LIKE 'CLEAN%' OR Code LIKE 'SEAL%')`);
        break;

      case 'OTHERS':
        // Misc items not tied to specific ref-doc types
        whereClauses.push(`(DocType = 'OTHERS' OR IsRefType = 0)`);
        break;

      default:
        // Unknown category -> return empty list without error to avoid breaking callers
        logger.warn(`ItemRepository: Unknown category "${category}", returning empty list`);
        return [];
    }

    const where = whereClauses.join(' AND ');

    try {
      const query = `
        SELECT
          ItemId,
          Name,
          Code,
          Price,
          ChurchId,
          IsRefType,
          DocType
        FROM ${this.tableName} WITH(NOLOCK)
        WHERE ${where}
        ORDER BY LEN(Code), Code
      `;

      const result = await executeQuery(query, params);
      return result.recordset || [];
    } catch (error) {
      logger.error('ItemRepository: Error getting items by category', {
        category,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  /**
   * Create a new item.
   * @param {Object} item - Item data
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Created item
   */
  async create(item, churchId) {
    try {
      // Since ItemId is not an identity column, we must find the next available ID
      const maxIdQuery = `SELECT MAX(ItemId) as MaxId FROM ${this.tableName}`;
      const maxIdResult = await executeQuery(maxIdQuery);
      const nextId = (maxIdResult.recordset[0].MaxId || 0) + 1;

      const query = `
        INSERT INTO ${this.tableName} (
          ItemId, Name, Code, Price, ChurchId, IsRefType, DocType
        )
        OUTPUT INSERTED.*
        VALUES (
          @itemId, @name, @code, @price, @churchId, @isRefType, @docType
        )
      `;

      const params = {
        itemId: parseInt(nextId),
        name: item.name,
        code: item.code,
        price: parseFloat(item.price || 0),
        churchId: parseInt(churchId),
        isRefType: item.isRefType !== undefined ? item.isRefType : true,
        docType: item.docType || 'OTHERS'
      };

      const result = await executeQuery(query, params);
      return result.recordset[0];
    } catch (error) {
      logger.error('ItemRepository: Error creating item', {
        error: error.message,
        item
      });
      throw error;
    }
  }

  /**
   * Update an existing item.
   * @param {number} itemId - Item ID
   * @param {Object} item - Updated item data
   * @param {number} churchId - Church ID
   * @returns {Promise<Object|null>} Updated item or null
   */
  async update(itemId, item, churchId) {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET
          Name = @name,
          Code = @code,
          Price = @price,
          IsRefType = @isRefType,
          DocType = @docType
        OUTPUT INSERTED.*
        WHERE ItemId = @itemId AND ChurchId = @churchId
      `;

      const params = {
        itemId: parseInt(itemId),
        churchId: parseInt(churchId),
        name: item.name,
        code: item.code,
        price: parseFloat(item.price || 0),
        isRefType: item.isRefType !== undefined ? item.isRefType : true,
        docType: item.docType || 'OTHERS'
      };

      const result = await executeQuery(query, params);
      return result.recordset[0] || null;
    } catch (error) {
      logger.error('ItemRepository: Error updating item', {
        itemId,
        error: error.message,
        item
      });
      throw error;
    }
  }

  /**
   * Delete an item.
   * @param {number} itemId - Item ID
   * @param {number} churchId - Church ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(itemId, churchId) {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE ItemId = @itemId AND ChurchId = @churchId
      `;

      const result = await executeQuery(query, { itemId: parseInt(itemId), churchId: parseInt(churchId) });
      return result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('ItemRepository: Error deleting item', {
        itemId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ItemRepository;


