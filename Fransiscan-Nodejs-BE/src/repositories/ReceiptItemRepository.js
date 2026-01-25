const { executeQuery, getPool } = require('../config/database');
const logger = require('../utils/logger');
const ReceiptDetail = require('../models/ReceiptDetail');
const sql = require('mssql');

/**
 * ReceiptItemRepository for database operations on MisalaniousReceiptDetail
 */
class ReceiptItemRepository {
  /**
   * Get all receipt items for a receipt
   * @param {number} receiptId - Receipt ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of receipt details
   */
  async getReceiptItems(receiptId, options = {}) {
    try {
      const { includeItemInfo = false } = options;
      
      let query = `
        SELECT 
          mrd.*
        FROM MisalaniousReceiptDetail mrd WITH(NOLOCK)
        WHERE mrd.ReceiptId = @receiptId
        ORDER BY mrd.ReceiptDetailId
      `;

      if (includeItemInfo) {
        query = `
          SELECT 
            mrd.*,
            i.Name AS ItemName,
            i.Code AS ItemCode
          FROM MisalaniousReceiptDetail mrd WITH(NOLOCK)
          LEFT JOIN Item i WITH(NOLOCK) ON mrd.ItemId = i.ItemId
          WHERE mrd.ReceiptId = @receiptId
          ORDER BY mrd.ReceiptDetailId
        `;
      }

      const result = await executeQuery(query, { receiptId });
      
      return (result.recordset || []).map(row => {
        const detail = new ReceiptDetail(row);
        if (includeItemInfo && row.ItemName) {
          detail.itemName = row.ItemName;
          detail.itemCode = row.ItemCode;
        }
        return detail;
      });
    } catch (error) {
      logger.error('Error getting receipt items:', error);
      throw error;
    }
  }

  /**
   * Get receipt item by ID
   * @param {number} receiptDetailId - Receipt detail ID
   * @returns {Promise<ReceiptDetail|null>} Receipt detail or null
   */
  async getReceiptItemById(receiptDetailId) {
    try {
      const query = `
        SELECT TOP 1 *
        FROM MisalaniousReceiptDetail WITH(NOLOCK)
        WHERE ReceiptDetailId = @receiptDetailId
      `;

      const result = await executeQuery(query, { receiptDetailId });

      if (result.recordset.length === 0) {
        return null;
      }

      return new ReceiptDetail(result.recordset[0]);
    } catch (error) {
      logger.error('Error getting receipt item by ID:', error);
      throw error;
    }
  }

  /**
   * Create a single receipt item
   * @param {ReceiptDetail} receiptItem - Receipt detail to create
   * @param {sql.Transaction} transaction - Optional transaction
   * @returns {Promise<ReceiptDetail>} Created receipt detail with ID
   */
  async createReceiptItem(receiptItem, transaction = null) {
    try {
      const query = `
        INSERT INTO MisalaniousReceiptDetail (
          ReceiptId, ItemId, Quantity, UnitAmount, PayingAmount,
          TotalPayingAmount, RefDocNumber, RefDocName, InvoiceId, RefType
        )
        OUTPUT INSERTED.*
        VALUES (
          @receiptId, @itemId, @quantity, @unitAmount, @payingAmount,
          @totalPayingAmount, @refDocNumber, @refDocName, @invoiceId, @refType
        )
      `;

      const params = {
        receiptId: receiptItem.receiptId,
        itemId: receiptItem.itemId,
        quantity: receiptItem.quantity,
        unitAmount: receiptItem.unitAmount,
        payingAmount: receiptItem.payingAmount || null,
        totalPayingAmount: receiptItem.totalPayingAmount || receiptItem.calculateTotal(),
        refDocNumber: receiptItem.refDocNumber || null,
        refDocName: receiptItem.refDocName || null,
        invoiceId: receiptItem.invoiceId || null,
        refType: receiptItem.refType || null
      };

      let result;
      if (transaction) {
        const request = new sql.Request(transaction);
        Object.keys(params).forEach(key => {
          const value = params[key];
          if (value === null || value === undefined) {
            request.input(key, sql.NVarChar, null);
          } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              request.input(key, sql.Int, value);
            } else {
              request.input(key, sql.Decimal(18, 2), value);
            }
          } else {
            request.input(key, sql.NVarChar, String(value));
          }
        });
        result = await request.query(query);
      } else {
        result = await executeQuery(query, params);
      }

      return new ReceiptDetail(result.recordset[0]);
    } catch (error) {
      logger.error('Error creating receipt item:', error);
      throw error;
    }
  }

  /**
   * Update a receipt item
   * @param {number} receiptDetailId - Receipt detail ID
   * @param {ReceiptDetail} receiptItem - Updated receipt detail data
   * @param {sql.Transaction} transaction - Optional transaction
   * @returns {Promise<ReceiptDetail|null>} Updated receipt detail or null
   */
  async updateReceiptItem(receiptDetailId, receiptItem, transaction = null) {
    try {
      const query = `
        UPDATE MisalaniousReceiptDetail
        SET 
          ItemId = @itemId,
          Quantity = @quantity,
          UnitAmount = @unitAmount,
          PayingAmount = @payingAmount,
          TotalPayingAmount = @totalPayingAmount,
          RefDocNumber = @refDocNumber,
          RefDocName = @refDocName,
          InvoiceId = @invoiceId,
          RefType = @refType
        OUTPUT INSERTED.*
        WHERE ReceiptDetailId = @receiptDetailId
      `;

      const params = {
        receiptDetailId,
        itemId: receiptItem.itemId,
        quantity: receiptItem.quantity,
        unitAmount: receiptItem.unitAmount,
        payingAmount: receiptItem.payingAmount || null,
        totalPayingAmount: receiptItem.totalPayingAmount || receiptItem.calculateTotal(),
        refDocNumber: receiptItem.refDocNumber || null,
        refDocName: receiptItem.refDocName || null,
        invoiceId: receiptItem.invoiceId || null,
        refType: receiptItem.refType || null
      };

      let result;
      if (transaction) {
        const request = new sql.Request(transaction);
        Object.keys(params).forEach(key => {
          const value = params[key];
          if (value === null || value === undefined) {
            request.input(key, sql.NVarChar, null);
          } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              request.input(key, sql.Int, value);
            } else {
              request.input(key, sql.Decimal(18, 2), value);
            }
          } else {
            request.input(key, sql.NVarChar, String(value));
          }
        });
        result = await request.query(query);
      } else {
        result = await executeQuery(query, params);
      }

      if (result.recordset.length === 0) {
        return null;
      }

      return new ReceiptDetail(result.recordset[0]);
    } catch (error) {
      logger.error('Error updating receipt item:', error);
      throw error;
    }
  }

  /**
   * Delete a receipt item
   * @param {number} receiptDetailId - Receipt detail ID
   * @param {sql.Transaction} transaction - Optional transaction
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteReceiptItem(receiptDetailId, transaction = null) {
    try {
      const query = `
        DELETE FROM MisalaniousReceiptDetail
        WHERE ReceiptDetailId = @receiptDetailId
      `;

      const params = { receiptDetailId };

      let result;
      if (transaction) {
        const request = new sql.Request(transaction);
        request.input('receiptDetailId', sql.Int, receiptDetailId);
        result = await request.query(query);
      } else {
        result = await executeQuery(query, params);
      }

      return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
    } catch (error) {
      logger.error('Error deleting receipt item:', error);
      throw error;
    }
  }

  /**
   * Create multiple receipt items in batch (with transaction)
   * @param {number} receiptId - Receipt ID
   * @param {Array<ReceiptDetail>} items - Array of receipt details
   * @param {sql.Transaction} transaction - Optional transaction (if not provided, creates new one)
   * @returns {Promise<Array<ReceiptDetail>>} Array of created receipt details
   */
  async createReceiptItemsBatch(receiptId, items, transaction = null) {
    const pool = await getPool();
    let shouldCommit = false;
    let localTransaction = null;

    try {
      if (!transaction) {
        localTransaction = new sql.Transaction(pool);
        await localTransaction.begin();
        shouldCommit = true;
        transaction = localTransaction;
      }

      const createdItems = [];
      
      for (const item of items) {
        item.receiptId = receiptId;
        const created = await this.createReceiptItem(item, transaction);
        createdItems.push(created);
      }

      if (shouldCommit) {
        await localTransaction.commit();
      }

      return createdItems;
    } catch (error) {
      if (shouldCommit && localTransaction) {
        await localTransaction.rollback();
      }
      logger.error('Error creating receipt items batch:', error);
      throw error;
    }
  }

  /**
   * Update multiple receipt items in batch (with transaction)
   * @param {number} receiptId - Receipt ID
   * @param {Array<ReceiptDetail>} items - Array of receipt details to update
   * @param {sql.Transaction} transaction - Optional transaction
   * @returns {Promise<Array<ReceiptDetail>>} Array of updated receipt details
   */
  async updateReceiptItemsBatch(receiptId, items, transaction = null) {
    const pool = await getPool();
    let shouldCommit = false;
    let localTransaction = null;

    try {
      if (!transaction) {
        localTransaction = new sql.Transaction(pool);
        await localTransaction.begin();
        shouldCommit = true;
        transaction = localTransaction;
      }

      const updatedItems = [];
      
      for (const item of items) {
        if (!item.receiptDetailId) {
          throw new Error('ReceiptDetailId is required for update');
        }
        item.receiptId = receiptId;
        const updated = await this.updateReceiptItem(item.receiptDetailId, item, transaction);
        if (updated) {
          updatedItems.push(updated);
        }
      }

      if (shouldCommit) {
        await localTransaction.commit();
      }

      return updatedItems;
    } catch (error) {
      if (shouldCommit && localTransaction) {
        await localTransaction.rollback();
      }
      logger.error('Error updating receipt items batch:', error);
      throw error;
    }
  }

  /**
   * Get receipt items by reference document
   * @param {string} refDocNumber - Reference document number
   * @param {string} refDocName - Reference document name (optional)
   * @param {number} churchId - Church ID (optional)
   * @returns {Promise<Array>} Array of receipt details
   */
  async getReceiptItemsByRefDoc(refDocNumber, refDocName = null, churchId = null) {
    try {
      let query = `
        SELECT 
          mrd.*,
          r.Code AS ReceiptCode,
          r.TransactionDate AS ReceiptDate,
          i.Name AS ItemName,
          i.Code AS ItemCode
        FROM MisalaniousReceiptDetail mrd WITH(NOLOCK)
        INNER JOIN Receipt r WITH(NOLOCK) ON mrd.ReceiptId = r.ReceiptId
        LEFT JOIN Item i WITH(NOLOCK) ON mrd.ItemId = i.ItemId
        WHERE mrd.RefDocNumber = @refDocNumber
      `;

      const params = { refDocNumber };

      if (refDocName) {
        query += ' AND mrd.RefDocName = @refDocName';
        params.refDocName = refDocName;
      }

      if (churchId) {
        query += ' AND r.ChurchId = @churchId';
        params.churchId = churchId;
      }

      query += ' ORDER BY r.TransactionDate DESC, mrd.ReceiptDetailId DESC';

      const result = await executeQuery(query, params);
      
      return (result.recordset || []).map(row => {
        const detail = new ReceiptDetail(row);
        detail.receiptCode = row.ReceiptCode;
        detail.receiptDate = row.ReceiptDate;
        detail.itemName = row.ItemName;
        detail.itemCode = row.ItemCode;
        return detail;
      });
    } catch (error) {
      logger.error('Error getting receipt items by reference document:', error);
      throw error;
    }
  }

  /**
   * Get receipt items with item information
   * @param {number} receiptId - Receipt ID
   * @returns {Promise<Array>} Array of receipt details with item info
   */
  async getReceiptItemsWithItemInfo(receiptId) {
    return this.getReceiptItems(receiptId, { includeItemInfo: true });
  }

  /**
   * Delete all receipt items for a receipt
   * @param {number} receiptId - Receipt ID
   * @param {sql.Transaction} transaction - Optional transaction
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteReceiptItemsByReceiptId(receiptId, transaction = null) {
    try {
      const query = `
        DELETE FROM MisalaniousReceiptDetail
        WHERE ReceiptId = @receiptId
      `;

      const params = { receiptId };

      let result;
      if (transaction) {
        const request = new sql.Request(transaction);
        request.input('receiptId', sql.Int, receiptId);
        result = await request.query(query);
      } else {
        result = await executeQuery(query, params);
      }

      return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
    } catch (error) {
      logger.error('Error deleting receipt items by receipt ID:', error);
      throw error;
    }
  }
}

module.exports = ReceiptItemRepository;

