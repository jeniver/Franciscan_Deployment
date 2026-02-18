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
   * Optimized to use a single query with JOINs.
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
      // Build filters for the parameters dynamically
      // We want rows where (Name = p1 AND Value = v1) OR (Name = p2 AND Value = v2) ...
      const paramConditions = parameters
        .map((_, index) => `(tim.TaskParameterName = @name${index} AND tim.TaskParameterValue = @value${index})`)
        .join(' OR ');

      if (!paramConditions) {
        return [];
      }

      const query = `
        SELECT DISTINCT
          i.ItemId,
          i.Name,
          i.Code,
          i.Price,
          i.ChurchId,
          i.IsRefType,
          i.DocType,
          tim.Remarks
        FROM ${this.mappingTable} tim WITH (NOLOCK)
        INNER JOIN ${this.itemTable} i WITH (NOLOCK) ON tim.ItemId = i.ItemId
        WHERE tim.TaskId = @taskId
          AND i.ChurchId = @churchId
          AND (${paramConditions})
      `;

      const queryParams = {
        taskId,
        churchId
      };

      // Add dynamic parameters
      parameters.forEach((param, index) => {
        queryParams[`name${index}`] = param.name;
        queryParams[`value${index}`] = param.value;
      });

      const result = await executeQuery(query, queryParams);

      if (result.recordset) {
        return result.recordset;
      }

      return [];
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


