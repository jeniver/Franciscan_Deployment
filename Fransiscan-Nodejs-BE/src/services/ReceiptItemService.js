const ReceiptItemRepository = require('../repositories/ReceiptItemRepository');
const ReceiptDetail = require('../models/ReceiptDetail');
const ReferenceDocumentValidator = require('./ReferenceDocumentValidator');
const logger = require('../utils/logger');

/**
 * ReceiptItemService for business logic on receipt items
 */
class ReceiptItemService {
  constructor() {
    this.repository = new ReceiptItemRepository();
    this.referenceDocumentValidator = ReferenceDocumentValidator;
  }

  /**
   * Get all receipt items for a receipt
   * @param {number} receiptId - Receipt ID
   * @param {number} churchId - Church ID for access control
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Receipt items result
   */
  async getReceiptItems(receiptId, churchId, options = {}) {
    try {
      if (!receiptId) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Receipt ID is required'
          }
        };
      }

      const items = await this.repository.getReceiptItems(receiptId, options);

      return {
        success: true,
        data: items.map(item => item.toJSON()),
        message: 'Receipt items retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting receipt items:', error);
      throw error;
    }
  }

  /**
   * Get single receipt item
   * @param {number} receiptDetailId - Receipt detail ID
   * @param {number} churchId - Church ID for access control
   * @returns {Promise<Object>} Receipt item result
   */
  async getReceiptItem(receiptDetailId, churchId) {
    try {
      if (!receiptDetailId) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Receipt detail ID is required'
          }
        };
      }

      const item = await this.repository.getReceiptItemById(receiptDetailId);

      if (!item) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Receipt item not found'
          }
        };
      }

      return {
        success: true,
        data: item.toJSON(),
        message: 'Receipt item retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting receipt item:', error);
      throw error;
    }
  }

  /**
   * Create a receipt item
   * @param {number} receiptId - Receipt ID
   * @param {Object} itemData - Receipt item data
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Created receipt item result
   */
  async createReceiptItem(receiptId, itemData, userId, churchId) {
    try {
      // Create ReceiptDetail model
      const receiptItem = new ReceiptDetail({
        ...itemData,
        receiptId
      });

      // Validate
      const validation = receiptItem.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        };
      }

      // Validate reference document if provided
      if (receiptItem.requiresReferenceValidation()) {
        const isValid = await this.referenceDocumentValidator.validateReferenceDocument(
          receiptItem.refDocName || receiptItem.refType,
          receiptItem.refDocNumber,
          churchId
        );

        if (!isValid) {
          return {
            success: false,
            error: {
              code: 'INVALID_REF_DOCUMENT',
              message: 'Reference document not found',
              details: {
                refDocNumber: receiptItem.refDocNumber,
                refDocName: receiptItem.refDocName || receiptItem.refType
              }
            }
          };
        }
      }

      // Create receipt item
      const created = await this.repository.createReceiptItem(receiptItem);

      return {
        success: true,
        data: created.toJSON(),
        message: 'Receipt item created successfully'
      };
    } catch (error) {
      logger.error('Error creating receipt item:', error);
      throw error;
    }
  }

  /**
   * Update a receipt item
   * @param {number} receiptDetailId - Receipt detail ID
   * @param {Object} itemData - Updated receipt item data
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Updated receipt item result
   */
  async updateReceiptItem(receiptDetailId, itemData, userId, churchId) {
    try {
      // Get existing item
      const existing = await this.repository.getReceiptItemById(receiptDetailId);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Receipt item not found'
          }
        };
      }

      // Merge with existing data
      const receiptItem = new ReceiptDetail({
        ...existing.toJSON(),
        ...itemData,
        receiptDetailId,
        receiptId: existing.receiptId
      });

      // Validate
      const validation = receiptItem.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        };
      }

      // Validate reference document if provided
      if (receiptItem.requiresReferenceValidation()) {
        const isValid = await this.referenceDocumentValidator.validateReferenceDocument(
          receiptItem.refDocName || receiptItem.refType,
          receiptItem.refDocNumber,
          churchId
        );

        if (!isValid) {
          return {
            success: false,
            error: {
              code: 'INVALID_REF_DOCUMENT',
              message: 'Reference document not found',
              details: {
                refDocNumber: receiptItem.refDocNumber,
                refDocName: receiptItem.refDocName || receiptItem.refType
              }
            }
          };
        }
      }

      // Update receipt item
      const updated = await this.repository.updateReceiptItem(receiptDetailId, receiptItem);

      if (!updated) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Receipt item not found for update'
          }
        };
      }

      return {
        success: true,
        data: updated.toJSON(),
        message: 'Receipt item updated successfully'
      };
    } catch (error) {
      logger.error('Error updating receipt item:', error);
      throw error;
    }
  }

  /**
   * Delete a receipt item
   * @param {number} receiptDetailId - Receipt detail ID
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteReceiptItem(receiptDetailId, userId, churchId) {
    try {
      // Check if item exists
      const existing = await this.repository.getReceiptItemById(receiptDetailId);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Receipt item not found'
          }
        };
      }

      // Delete receipt item
      const deleted = await this.repository.deleteReceiptItem(receiptDetailId);

      if (!deleted) {
        return {
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete receipt item'
          }
        };
      }

      return {
        success: true,
        data: {
          receiptDetailId
        },
        message: 'Receipt item deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting receipt item:', error);
      throw error;
    }
  }

  /**
   * Create receipt items in batch
   * @param {number} receiptId - Receipt ID
   * @param {Array} items - Array of receipt item data
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Batch creation result
   */
  async createReceiptItemsBatch(receiptId, items, userId, churchId) {
    try {
      if (!items || items.length === 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Items array is required and cannot be empty'
          }
        };
      }

      // Validate all items
      const validationResult = await this.validateReceiptItems(items, churchId);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validationResult.errors
          }
        };
      }

      // Create ReceiptDetail models
      const receiptItems = items.map(itemData => new ReceiptDetail({
        ...itemData,
        receiptId
      }));

      // Create in batch
      const created = await this.repository.createReceiptItemsBatch(receiptId, receiptItems);

      return {
        success: true,
        data: {
          created: created.length,
          items: created.map(item => item.toJSON())
        },
        message: 'Receipt items created successfully'
      };
    } catch (error) {
      logger.error('Error creating receipt items batch:', error);
      throw error;
    }
  }

  /**
   * Update receipt items in batch
   * @param {number} receiptId - Receipt ID
   * @param {Array} items - Array of receipt item data (must include receiptDetailId)
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Batch update result
   */
  async updateReceiptItemsBatch(receiptId, items, userId, churchId) {
    try {
      if (!items || items.length === 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Items array is required and cannot be empty'
          }
        };
      }

      // Validate all items have receiptDetailId
      const missingIds = items.filter(item => !item.receiptDetailId);
      if (missingIds.length > 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All items must have receiptDetailId for update',
            details: [`${missingIds.length} item(s) missing receiptDetailId`]
          }
        };
      }

      // Validate all items
      const validationResult = await this.validateReceiptItems(items, churchId);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validationResult.errors
          }
        };
      }

      // Create ReceiptDetail models
      const receiptItems = items.map(itemData => new ReceiptDetail({
        ...itemData,
        receiptId
      }));

      // Update in batch
      const updated = await this.repository.updateReceiptItemsBatch(receiptId, receiptItems);

      return {
        success: true,
        data: {
          updated: updated.length,
          items: updated.map(item => item.toJSON())
        },
        message: 'Receipt items updated successfully'
      };
    } catch (error) {
      logger.error('Error updating receipt items batch:', error);
      throw error;
    }
  }

  /**
   * Validate receipt items
   * @param {Array} items - Array of receipt item data
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Validation result
   */
  async validateReceiptItems(items, churchId) {
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const itemData = items[i];
      const receiptItem = new ReceiptDetail(itemData);

      // Model validation
      const validation = receiptItem.validate();
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          errors.push(`Item ${i + 1}: ${error}`);
        });
      }

      // Reference document validation
      if (receiptItem.requiresReferenceValidation()) {
        const isValid = await this.referenceDocumentValidator.validateReferenceDocument(
          receiptItem.refDocName || receiptItem.refType,
          receiptItem.refDocNumber,
          churchId
        );

        if (!isValid) {
          errors.push(`Item ${i + 1}: Reference document not found (${receiptItem.refDocNumber})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate receipt total from items
   * @param {Array} items - Array of receipt items
   * @returns {number} Total amount
   */
  calculateReceiptTotal(items) {
    if (!items || items.length === 0) {
      return 0;
    }

    return items.reduce((sum, item) => {
      const itemTotal = item.totalPayingAmount || 
                       (item.quantity || 0) * (item.unitAmount || 0);
      return sum + (itemTotal || 0);
    }, 0);
  }

  /**
   * Get receipt items by reference document
   * @param {string} refDocNumber - Reference document number
   * @param {string} refDocName - Reference document name (optional)
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Receipt items result
   */
  async getReceiptItemsByRefDoc(refDocNumber, refDocName, churchId) {
    try {
      if (!refDocNumber) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Reference document number is required'
          }
        };
      }

      const items = await this.repository.getReceiptItemsByRefDoc(refDocNumber, refDocName, churchId);

      return {
        success: true,
        data: items.map(item => item.toJSON()),
        message: 'Receipt items retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting receipt items by reference document:', error);
      throw error;
    }
  }
}

module.exports = ReceiptItemService;

