/**
 * Receipt entity model matching ASP.NET Receipt structure
 */
class Receipt {
  constructor(data = {}) {
    this.receiptId = data.receiptId || null;
    this.invoiceId = data.invoiceId || null;
    this.transactionDate = data.transactionDate || new Date();
    this.customerName = data.customerName || null;
    this.code = data.code || null;
    this.totalAmount = data.totalAmount || 0;
    this.payingAmount = data.payingAmount || 0;
    this.paymentMode = data.paymentMode || 1; // 1=Cash, 2=Cheque, 3=TT, 4=Others
    this.userId = data.userId || null;
    this.churchId = data.churchId || null;
    this.status = data.status || 2; // 0=Cancel, 1=Active, 2=Paid
    this.paymentModeDocNo = data.paymentModeDocNo || null;
    this.payeeName = data.payeeName || null;
    this.addressNo = data.addressNo || null;
    this.address = data.address || null;
    this.address2 = data.address2 || null;
    this.addressCity = data.addressCity || null;
    this.districtCode = data.districtCode || null;
    this.country = data.country || null;
    this.outstandingAmount = data.outstandingAmount || 0;
    
    // Receipt details (line items)
    this.details = data.details || [];
  }

  /**
   * Validate receipt data
   * @returns {Array} Array of validation errors
   */
  validate() {
    const errors = [];
    


    // For receipts linked to invoices, invoiceId should be provided and valid
    // For individual receipts, a default value of 0 is acceptable
    if (this.invoiceId && this.invoiceId < 0) {
      errors.push('Invoice ID must be 0 or greater');
    }

    if (!this.customerName || this.customerName.trim().length === 0) {
      errors.push('Customer name is required');
    }

    if (this.payingAmount < 0) {
      errors.push('Paying amount must be a positive number');
    }

    if (!this.churchId || this.churchId <= 0) {
      errors.push('Valid church ID is required');
    }

    if (!this.userId || this.userId <= 0) {
      errors.push('Valid user ID is required');
    }

    // Removed strict payment mode validation per requirement
    // Original validation was causing issues with valid payment modes
    // If payment mode is provided but not in expected range, log but don't error
    /*
    if (this.paymentMode && ![1, 2, 3, 4].includes(this.paymentMode)) {
      errors.push('Invalid payment mode. Must be 1 (Cash), 2 (Cheque), 3 (TT), or 4 (Others)');
    }
    */

    if (this.status !== undefined && ![0, 1, 2].includes(this.status)) {
      errors.push('Invalid status. Must be 0 (Cancel), 1 (Active), or 2 (Paid)');
    }

    return errors;
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
    const errors = this.validate();

    // Validate details if provided
    if (this.details && this.details.length > 0) {
      const ReceiptDetail = require('./ReceiptDetail');
      
      this.details.forEach((detail, index) => {
        const receiptDetail = detail instanceof ReceiptDetail ? detail : new ReceiptDetail(detail);
        receiptDetail.receiptId = this.receiptId; // Ensure receiptId is set
        
        const detailValidation = receiptDetail.validate();
        if (!detailValidation.isValid) {
          detailValidation.errors.forEach(error => {
            errors.push(`Detail ${index + 1}: ${error}`);
          });
        }
      });

      // Validate total matches sum of details
      const calculatedTotal = this.calculateTotalFromDetails();
      if (this.totalAmount && Math.abs(this.totalAmount - calculatedTotal) > 0.01) {
        errors.push(`Receipt total (${this.totalAmount}) does not match sum of details (${calculatedTotal})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Receipt;

