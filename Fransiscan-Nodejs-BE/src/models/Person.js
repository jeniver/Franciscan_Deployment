/**
 * Person entity model
 */
class Person {
  constructor(data = {}) {
    const value = (primary, fallback, defaultValue = null) => {
      if (primary !== undefined && primary !== null) return primary;
      if (fallback !== undefined && fallback !== null) return fallback;
      return defaultValue;
    };

    this.personId = value(data.personId, data.PersonId);
    this.status = value(data.status, data.Status, 1);
    this.name = value(data.name, data.Name);
    this.addressNo = value(data.addressNo, data.AddressNo);
    this.addressLine1 = value(data.addressLine1, data.AddressLine1);
    this.addressLine2 = value(data.addressLine2, data.AddressLine2);
    this.addressCity = value(data.addressCity, data.AddressCity);
    this.addressState = value(data.addressState, data.AddressState);
    this.addressCountry = value(data.addressCountry, data.AddressCountry);
    this.emailID = value(data.emailID, data.EmailID);
    this.idNo = value(data.idNo, data.IDNo);
    this.mobileNo = value(data.mobileNo, data.MobileNo);
    this.homeTelNo = value(data.homeTelNo, data.HomeTelNo);
    this.officeTelNo = value(data.officeTelNo, data.OfficeTelNo);
    this.isCatholic = value(data.isCatholic, data.IsCatholic);
    this.churchId = value(data.churchId, data.ChurchId);
    this.relationshipToApplicant = value(data.relationshipToApplicant, data.RelationshipToApplicant);
    this.remarks = value(data.remarks, data.Remarks);
    this.createdDate = value(data.createdDate, data.CreatedDate, new Date());
    this.modifiedDate = value(data.modifiedDate, data.ModifiedDate);
  }

  // Validate person data
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (this.name && this.name.length > 250) {
      errors.push('Name must not exceed 250 characters');
    }

    if (this.emailID && !this.isValidEmail(this.emailID)) {
      errors.push('Valid email is required');
    }

    if (!this.churchId || this.churchId <= 0) {
      errors.push('Valid church ID is required');
    }

    if (this.addressLine1 && this.addressLine1.length > 100) {
      errors.push('Address line 1 must not exceed 100 characters');
    }

    if (this.addressLine2 && this.addressLine2.length > 100) {
      errors.push('Address line 2 must not exceed 100 characters');
    }

    if (this.addressCity && this.addressCity.length > 100) {
      errors.push('City must not exceed 100 characters');
    }

    if (this.addressState && this.addressState.length > 100) {
      errors.push('State must not exceed 100 characters');
    }

    if (this.addressCountry && this.addressCountry.length > 100) {
      errors.push('Country must not exceed 100 characters');
    }

    if (this.remarks && this.remarks.length > 500) {
      errors.push('Remarks must not exceed 500 characters');
    }

    return errors;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get full address
  getFullAddress() {
    const parts = [];
    if (this.addressNo) parts.push(this.addressNo);
    if (this.addressLine1) parts.push(this.addressLine1);
    if (this.addressLine2) parts.push(this.addressLine2);
    if (this.addressCity) parts.push(this.addressCity);
    if (this.addressState) parts.push(this.addressState);
    if (this.addressCountry) parts.push(this.addressCountry);
    return parts.join(', ');
  }
}

module.exports = Person;
