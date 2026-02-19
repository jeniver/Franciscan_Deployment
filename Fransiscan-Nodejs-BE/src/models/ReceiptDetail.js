/**
 * ReceiptDetail entity model matching ASP.NET MisalaniousReceiptDetail structure
 * Represents line items for a receipt
 */
class ReceiptDetail {
  constructor(data = {}) {
    this.receiptDetailId = data.receiptDetailId || data.ReceiptDetailId || null;
    this.receiptId = data.receiptId || data.ReceiptId || null;
    this.itemId = data.itemId || data.ItemId || null;
    this.quantity = data.quantity || data.Quantity || 0;
    this.unitAmount = data.unitAmount || data.UnitAmount || 0;
    this.payingAmount = data.payingAmount || data.PayingAmount || null;
    this.totalPayingAmount = data.totalPayingAmount || data.TotalPayingAmount || null;
    this.refDocNumber = data.refDocNumber || data.RefDocNumber || null;
    this.refDocName = data.refDocName || data.RefDocName || null;
    this.invoiceId = data.invoiceId || data.InvoiceId || null;
    this.refType = data.refType || data.RefType || null; // "NAPP", "WAPP", "INCR", "GOLA", "DONA", "OTHERS"

    // Additional info from joins
    this.itemName = data.itemName || data.ItemName || null;
    this.itemCode = data.itemCode || data.ItemCode || null;
    this.description = data.description || data.Description || null;
    this.invoiceCode = data.invoiceCode || data.InvoiceCode || null;

    // Fallback for description if it's missing (helps in modal views)
    if (!this.description) {
      if (this.itemName) {
        this.description = this.itemName;
      } else if (this.refDocName || this.refDocNumber) {
        const parts = [];
        if (this.refDocName) parts.push(this.refDocName);
        if (this.refDocNumber) parts.push(`(${this.refDocNumber})`);
        this.description = parts.join(' ');
      } else {
        this.description = 'Service Item';
      }
    }
  }

  /**
   * Calculate total paying amount
   * TotalPayingAmount = Quantity × UnitAmount
   * Only calculates if totalPayingAmount is not already set (to allow for tax-inclusive totals)
   * @returns {number} Calculated total amount
   */
  calculateTotal() {
    if (this.totalPayingAmount !== null && this.totalPayingAmount !== undefined && this.totalPayingAmount !== 0) {
      return this.totalPayingAmount;
    }

    if (this.quantity && this.unitAmount) {
      this.totalPayingAmount = this.quantity * this.unitAmount;
    } else {
      this.totalPayingAmount = 0;
    }
    return this.totalPayingAmount;
  }

  /**
   * Validate receipt detail data
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validate() {
    return {
      isValid: true,
      errors: []
    }; // Validation disabled per user request
  }

  /**
   * Check if reference document is provided
   * @returns {boolean}
   */
  hasReferenceDocument() {
    return !!(this.refDocNumber && (this.refDocName || this.refType));
  }

  /**
   * Check if linked to invoice
   * @returns {boolean}
   */
  isLinkedToInvoice() {
    return !!this.invoiceId;
  }

  /**
   * Check if reference document validation is required
   * @returns {boolean} True if validation required
   */
  requiresReferenceValidation() {
    return this.hasReferenceDocument() &&
      this.refType &&
      this.refType.toUpperCase() !== 'OTHERS';
  }

  /**
   * Convert to JSON for API response
   * @returns {Object}
   */
  toJSON() {
    return {
      receiptDetailId: this.receiptDetailId,
      receiptId: this.receiptId,
      itemId: this.itemId,
      quantity: this.quantity,
      unitAmount: this.unitAmount,
      payingAmount: this.payingAmount,
      totalPayingAmount: this.totalPayingAmount,
      refDocNumber: this.refDocNumber,
      refDocName: this.refDocName,
      invoiceId: this.invoiceId,
      refType: this.refType,
      itemName: this.itemName,
      itemCode: this.itemCode,
      description: this.description,
      invoiceCode: this.invoiceCode
    };
  }
}

module.exports = ReceiptDetail;

