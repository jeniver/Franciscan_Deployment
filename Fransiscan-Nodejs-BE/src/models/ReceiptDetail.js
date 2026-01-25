/**
 * ReceiptDetail entity model matching ASP.NET MisalaniousReceiptDetail structure
 * Represents line items for a receipt
 */
class ReceiptDetail {
  constructor(data = {}) {
    this.receiptDetailId = data.receiptDetailId || null;
    this.receiptId = data.receiptId || null;
    this.itemId = data.itemId || null;
    this.quantity = data.quantity || 0;
    this.unitAmount = data.unitAmount || 0;
    this.payingAmount = data.payingAmount || null;
    this.totalPayingAmount = data.totalPayingAmount || null;
    this.refDocNumber = data.refDocNumber || null;
    this.refDocName = data.refDocName || null;
    this.invoiceId = data.invoiceId || null;
    this.refType = data.refType || null; // "NAPP", "WAPP", "INCR", "GOLA", "DONA", "OTHERS"
    
    // Calculated fields
    this.calculateTotal();
  }

  /**
   * Calculate total paying amount
   * TotalPayingAmount = Quantity × UnitAmount
   * @returns {number} Calculated total amount
   */
  calculateTotal() {
    if (this.quantity && this.unitAmount) {
      this.totalPayingAmount = this.quantity * this.unitAmount;
    } else if (this.totalPayingAmount === null || this.totalPayingAmount === undefined) {
      this.totalPayingAmount = 0;
    }
    return this.totalPayingAmount;
  }

  /**
   * Validate receipt detail data
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validate() {
    const errors = [];

    if (!this.receiptId) {
      errors.push('Receipt ID is required');
    }

    if (!this.itemId) {
      errors.push('Item ID is required');
    }

    if (!this.quantity || this.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (this.unitAmount === null || this.unitAmount === undefined || this.unitAmount < 0) {
      errors.push('Unit amount must be non-negative');
    }

    // Validate total calculation
    const calculatedTotal = this.calculateTotal();
    if (this.totalPayingAmount !== null && 
        this.totalPayingAmount !== undefined &&
        Math.abs(this.totalPayingAmount - calculatedTotal) > 0.01) {
      errors.push(`Total paying amount (${this.totalPayingAmount}) does not match calculated total (${calculatedTotal})`);
    }

    // Validate reference document
    if (this.refDocNumber && !this.refDocName && !this.refType) {
      errors.push('Reference document name or type is required when reference document number is provided');
    }

    // Validate refType if provided
    if (this.refType && !['NAPP', 'WAPP', 'INCR', 'GOLA', 'DONA', 'OTHERS'].includes(this.refType.toUpperCase())) {
      errors.push('Invalid refType. Must be NAPP, WAPP, INCR, GOLA, DONA, or OTHERS');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
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
      refType: this.refType
    };
  }
}

module.exports = ReceiptDetail;

