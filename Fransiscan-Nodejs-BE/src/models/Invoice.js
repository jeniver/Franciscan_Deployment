/**
 * Invoice entity model matching ASP.NET Invoice structure
 * Supports both legacy fields and ASP.NET fields for backward compatibility
 */
class Invoice {
  constructor(data = {}) {
    // Legacy fields (for backward compatibility)
    this.invoiceId = data.invoiceId || null;
    this.invoiceNumber = data.invoiceNumber || null;
    this.amount = data.amount || 0;
    this.personId = data.personId || null;
    this.dueDate = data.dueDate || null;
    this.paidDate = data.paidDate || null;
    this.createdDate = data.createdDate || new Date();
    this.modifiedDate = data.modifiedDate || null;
    this.description = data.description || null;
    this.notes = data.notes || null;

    // ASP.NET fields
    this.code = data.code || data.invoiceNumber || null; // Invoice code (e.g., "00001")
    this.transactionDate = data.transactionDate || data.createdDate || new Date();
    this.refDocNumber = data.refDocNumber || null; // Reference document code
    this.refDocName = data.refDocName || null; // Reference document type (NAPP, WAPP, etc.)
    this.customerName = data.customerName || null;
    this.totalAmount = data.totalAmount !== undefined ? data.totalAmount : (data.amount || 0);
    this.payingAmount = data.payingAmount || null;
    this.paymentMode = data.paymentMode || null; // String: "Cash", "Cheque", "TT", etc.
    this.paymentModeDocNo = data.paymentModeDocNo || null; // Cheque number, TT reference, etc.
    this.userId = data.userId || null;
    this.churchId = data.churchId || null;
    this.nicheApplicationId = data.nicheApplicationId || null;
    this.taxCode = data.taxCode || null;
    this.taxPercentage = data.taxPercentage || null;
    this.taxAmount = data.taxAmount || null;
    
    // Address fields
    this.addressNo = data.addressNo || null;
    this.address = data.address || null;
    this.address2 = data.address2 || null;
    this.addressCity = data.addressCity || null;
    this.districtCode = data.districtCode || null;
    this.country = data.country || null;

    // Status: 0=Deleted, 1=Active, 2=Paid (ASP.NET format)
    // Also support legacy string format: 'pending', 'paid', 'cancelled', 'overdue'
    if (data.status !== undefined) {
      if (typeof data.status === 'number') {
        this.status = data.status; // 0, 1, or 2
      } else if (typeof data.status === 'string') {
        // Convert legacy string format to number
        const statusMap = {
          'pending': 1,
          'paid': 2,
          'cancelled': 0,
          'overdue': 1
        };
        this.status = statusMap[data.status.toLowerCase()] !== undefined 
          ? statusMap[data.status.toLowerCase()] 
          : 1; // Default to Active
      } else {
        this.status = 1; // Default to Active
      }
    } else {
      this.status = 1; // Default to Active
    }
  }

  // Validate invoice data
  validate() {
    const errors = [];

    // Code is required (either code or invoiceNumber for backward compatibility)
    if ((!this.code || this.code.trim().length === 0) && 
        (!this.invoiceNumber || this.invoiceNumber.trim().length === 0)) {
      errors.push('Invoice code is required');
    }

    // Amount validation (check both totalAmount and amount for backward compatibility)
    const amount = this.totalAmount !== undefined ? this.totalAmount : this.amount;
    if (amount < 0) {
      errors.push('Amount must be a positive number');
    }

    // Church ID is required
    if (!this.churchId || this.churchId <= 0) {
      errors.push('Valid church ID is required');
    }

    // Status validation (accept both number and legacy string format)
    if (this.status !== undefined) {
      if (typeof this.status === 'number' && ![0, 1, 2].includes(this.status)) {
        errors.push('Invalid status. Must be 0 (Deleted), 1 (Active), or 2 (Paid)');
      } else if (typeof this.status === 'string' && 
                 !['pending', 'paid', 'cancelled', 'overdue', '0', '1', '2'].includes(this.status.toLowerCase())) {
        errors.push('Invalid status. Must be pending, paid, cancelled, overdue, or 0/1/2');
      }
    }

    // Payment mode validation (if provided as string)
    if (this.paymentMode && typeof this.paymentMode === 'string') {
      const validModes = ['Cash', 'Cheque', 'TT', 'Credit Card', 'Others'];
      if (!validModes.includes(this.paymentMode)) {
        errors.push(`Invalid payment mode. Must be one of: ${validModes.join(', ')}`);
      }
    }

    // Address field validation (if provided)
    if (this.addressNo && typeof this.addressNo !== 'string') {
      errors.push('Address number must be a string');
    }
    if (this.address && typeof this.address !== 'string') {
      errors.push('Address must be a string');
    }
    if (this.address2 && typeof this.address2 !== 'string') {
      errors.push('Address line 2 must be a string');
    }
    if (this.addressCity && typeof this.addressCity !== 'string') {
      errors.push('Address city must be a string');
    }
    if (this.districtCode && typeof this.districtCode !== 'string') {
      errors.push('District code must be a string');
    }
    if (this.country && typeof this.country !== 'string') {
      errors.push('Country must be a string');
    }

    return errors;
  }

  // Check if invoice is overdue
  isOverdue() {
    if (!this.dueDate) return false;
    const status = typeof this.status === 'number' ? this.status : 
                   (this.status === 'paid' ? 2 : 1);
    return new Date() > new Date(this.dueDate) && status !== 2;
  }

  // Calculate days until due
  getDaysUntilDue() {
    if (!this.dueDate) return null;
    const today = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get status as string (for backward compatibility)
   * @returns {string} Status string
   */
  getStatusString() {
    const statusMap = {
      0: 'cancelled',
      1: 'pending',
      2: 'paid'
    };
    return statusMap[this.status] || 'pending';
  }

  /**
   * Check if invoice is active
   * @returns {boolean} True if status is 1 (Active)
   */
  isActive() {
    return this.status === 1;
  }

  /**
   * Check if invoice is paid
   * @returns {boolean} True if status is 2 (Paid)
   */
  isPaid() {
    return this.status === 2;
  }

  /**
   * Check if invoice is deleted
   * @returns {boolean} True if status is 0 (Deleted)
   */
  isDeleted() {
    return this.status === 0;
  }
}

module.exports = Invoice;

