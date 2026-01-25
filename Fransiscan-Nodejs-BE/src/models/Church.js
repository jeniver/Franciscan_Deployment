/**
 * Church entity model
 */
class Church {
  constructor(data = {}) {
    this.churchId = data.churchId || null;
    this.name = data.name || null;
    this.address = data.address || null;
    this.phone = data.phone || null;
    this.email = data.email || null;
    this.active = data.active !== undefined ? data.active : true;
    this.createdDate = data.createdDate || new Date();
    this.modifiedDate = data.modifiedDate || null;
  }

  // Validate church data
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Church name is required');
    }

    if (this.name && this.name.length > 200) {
      errors.push('Church name must not exceed 200 characters');
    }

    if (this.address && this.address.length > 500) {
      errors.push('Address must not exceed 500 characters');
    }

    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }

    return errors;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = Church;
