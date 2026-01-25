/**
 * InvoiceDetail entity model matching ASP.NET InvoiceDetail structure
 * Represents line items for an invoice
 */
class InvoiceDetail {
  constructor(data = {}) {
    this.invoiceDetailId = data.invoiceDetailId || null;
    this.invoiceId = data.invoiceId || null;
    this.itemId = data.itemId || null;
    this.quantity = data.quantity || 0;
    this.unitAmount = data.unitAmount || 0;
    this.payingAmount = data.payingAmount || null;
    this.totalPayingAmount = data.totalPayingAmount || null;
    this.refDocNumber = data.refDocNumber || null;
    this.refDocName = data.refDocName || null;
    this.refType = data.refType || null; // "NAPP", "WAPP", "INCR", "GOLA", "DONA", "OTHERS"
    this.outstandingAmount = data.outstandingAmount || 0;
    this.lineTotalAmount = data.lineTotalAmount || null;
    this.lineTaxPercent = data.lineTaxPercent || null;
    this.lineTaxAmount = data.lineTaxAmount || null;
  }

  /**
   * Validate invoice detail data
   * @returns {Array} Array of validation errors
   */
  validate() {
    const errors = [];

    if (!this.invoiceId || this.invoiceId <= 0) {
      errors.push('Invoice ID is required');
    }

    if (!this.itemId || this.itemId <= 0) {
      errors.push('Item ID is required');
    }

    if (this.quantity === null || this.quantity === undefined || this.quantity < 0) {
      errors.push('Quantity must be a non-negative number');
    }

    if (this.unitAmount === null || this.unitAmount === undefined || this.unitAmount < 0) {
      errors.push('Unit amount must be a non-negative number');
    }

    // Validate refType if provided
    if (this.refType && !['NAPP', 'WAPP', 'INCR', 'GOLA', 'DONA', 'OTHERS'].includes(this.refType.toUpperCase())) {
      errors.push('Invalid refType. Must be NAPP, WAPP, INCR, GOLA, DONA, or OTHERS');
    }

    return errors;
  }

  /**
   * Calculate total amount if not provided
   * @returns {number} Calculated total amount
   */
  calculateTotalAmount() {
    if (this.totalPayingAmount !== null && this.totalPayingAmount !== undefined) {
      return this.totalPayingAmount;
    }
    return (this.quantity || 0) * (this.unitAmount || 0);
  }

  /**
   * Check if reference document validation is required
   * @returns {boolean} True if validation required
   */
  requiresReferenceValidation() {
    return this.refType && this.refType.toUpperCase() !== 'OTHERS';
  }
}

module.exports = InvoiceDetail;

