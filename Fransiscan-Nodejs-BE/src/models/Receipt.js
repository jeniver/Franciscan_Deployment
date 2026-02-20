/**
 * Receipt entity model matching ASP.NET Receipt structure
 */
class Receipt {
  constructor(data = {}) {
    this.receiptId = data.receiptId || data.ReceiptId || null;
    this.invoiceId = data.invoiceId || data.InvoiceId || null;
    this.transactionDate = data.transactionDate || data.TransactionDate || new Date();
    this.customerName = data.customerName || data.CustomerName || null;
    this.code = data.code || data.Code || null;
    this.receiptCode = this.code; // Alias for frontend compatibility
    this.receiptDate = this.transactionDate; // Alias for frontend compatibility
    this.totalAmount = data.totalAmount || data.TotalAmount || 0;
    this.payingAmount = data.payingAmount || data.PayingAmount || 0;
    this.paymentMode = data.paymentMode || data.PaymentMode || 1; // 1=Cash, 2=Cheque, 3=TT, 4=Others
    this.userId = data.userId || data.UserId || null;
    this.churchId = data.churchId || data.ChurchId || null;
    this.status = data.status || data.Status || 2; // 0=Cancel, 1=Active, 2=Paid
    this.paymentModeDocNo = data.paymentModeDocNo || data.PaymentModeDocNo || null;
    this.payeeName = data.payeeName || data.PayeeName || null;
    this.addressNo = data.addressNo || data.AddressNo || null;
    this.address = data.address || data.Address || null;
    this.address2 = data.address2 || data.Address2 || null;
    this.addressCity = data.addressCity || data.AddressCity || null;
    this.districtCode = data.districtCode || data.DistrictCode || null;
    this.country = data.country || data.Country || null;
    this.outstandingAmount = data.outstandingAmount || data.OutstandingAmount || 0;

    // Receipt details (line items)
    this.details = data.details || data.Details || [];
  }

  /**
   * Validate receipt data
   * @returns {Array} Array of validation errors
   */
  validate() {
    return []; // Validation disabled per user request
  }

  /**
   * Convert payment mode string to number
   * @param {string} mode - Payment mode string
   * @returns {number} Payment mode number
   */
  static paymentModeToNumber(mode) {
    const modeMap = {
      'Cash': 1,
      'cheque': 2,
      'Cheque': 2,
      'TT': 3,
      'tt': 3,
      'CreditCard': 2,
      'creditcard': 2,
      'Others': 4,
      'others': 4
    };
    // Handle case where mode is already a number
    if (typeof mode === 'number') {
      return mode;
    }
    // Handle case where mode is a string representation of a number
    if (typeof mode === 'string' && !isNaN(mode) && !isNaN(parseFloat(mode))) {
      const numValue = parseFloat(mode);
      // Only return if it's a valid payment mode number
      if ([1, 2, 3, 4].includes(numValue)) {
        return numValue;
      }
    }
    // Return mapped value or default to 1 (Cash) if not found
    return modeMap[mode] || modeMap[mode?.toLowerCase()] || 1;
  }

  /**
   * Convert payment mode number to string
   * @param {number} mode - Payment mode number
   * @returns {string} Payment mode string
   */
  static paymentModeToString(mode) {
    const modeMap = {
      1: 'Cash',
      2: 'Cheque',
      3: 'TT',
      4: 'Others'
    };
    return modeMap[mode] || 'Cash';
  }

  /**
   * Calculate total amount from receipt details
   * @returns {number} Total amount from all details
   */
  calculateTotalFromDetails() {
    if (!this.details || this.details.length === 0) {
      return this.totalAmount || 0;
    }

    return this.details.reduce((sum, detail) => {
      const detailTotal = detail.totalPayingAmount ||
        (detail.quantity || 0) * (detail.unitAmount || 0);
      return sum + (detailTotal || 0);
    }, 0);
  }

  /**
   * Validate receipt with details
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validateWithDetails() {
    return {
      isValid: true,
      errors: []
    }; // Validation disabled per user request
  }
}

module.exports = Receipt;

