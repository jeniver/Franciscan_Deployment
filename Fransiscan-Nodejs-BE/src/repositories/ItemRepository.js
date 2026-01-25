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
        ORDER BY Name
      `;

      const result = await executeQuery(query, { churchId });
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
    const params = { churchId };

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
        ORDER BY Name
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
}

module.exports = ItemRepository;


