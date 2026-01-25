const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

/**
 * TaskItemMappingRepository
 *
 * Read‑only helper around the legacy TaskItemMapping + Item tables.
 * It is deliberately additive and does not change any existing behaviour.
 *
 * Pattern mirrors ASP.NET InvoiceBL.GetTaskMappedItems:
 *  - Input: taskId + parameter descriptors
 *  - Output: concrete Item rows for the current church
 */
class TaskItemMappingRepository {
  constructor() {
    this.mappingTable = 'TaskItemMapping';
    this.itemTable = 'Item';
  }

  /**
   * Get concrete Item rows for a task based on parameter descriptors.
   *
   * @param {number} taskId
   * @param {Array<{ name: string, value: string }>} parameters
   * @param {number} churchId
   * @returns {Promise<Array>} Array of Item rows
   */
  async getItemsForTask(taskId, parameters, churchId) {
    if (!taskId || !Array.isArray(parameters) || parameters.length === 0) {
      return [];
    }

    try {
      const items = [];

      // Fetch mappings per parameter, then resolve Item rows.
      for (const param of parameters) {
        const { name, value } = param;
        const mappingQuery = `
          SELECT
            TaskItemMappingId,
            TaskId,
            TaskParameterName,
            TaskParameterValue,
            ItemId,
            Remarks
          FROM ${this.mappingTable} WITH (NOLOCK)
          WHERE TaskId = @taskId
            AND TaskParameterName = @taskParameterName
            AND TaskParameterValue = @taskParameterValue
        `;

        const mappingResult = await executeQuery(mappingQuery, {
          taskId,
          taskParameterName: name,
          taskParameterValue: value
        });

        if (!mappingResult.recordset || mappingResult.recordset.length === 0) {
          continue;
        }

        for (const mapping of mappingResult.recordset) {
          const itemQuery = `
            SELECT
              ItemId,
              Name,
              Code,
              Price,
              ChurchId,
              IsRefType,
              DocType
            FROM ${this.itemTable} WITH (NOLOCK)
            WHERE ItemId = @itemId
              AND ChurchId = @churchId
          `;

          const itemResult = await executeQuery(itemQuery, {
            itemId: mapping.ItemId,
            churchId
          });

          if (itemResult.recordset && itemResult.recordset[0]) {
            items.push(itemResult.recordset[0]);
          }
        }
      }

      return items;
    } catch (error) {
      logger.error('TaskItemMappingRepository: Error getting items for task', {
        taskId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = TaskItemMappingRepository;


