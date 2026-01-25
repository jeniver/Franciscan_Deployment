/**
 * WakeRoom entity model
 * Based on ASP.NET Entity.WakeRoom structure
 */
class WakeRoom {
  constructor(data = {}) {
    // Primary key
    this.wakeRoomId = data.wakeRoomId || data.WakeRoomId || null;

    // Basic information
    this.code = data.code || data.Code || null;
    this.name = data.name || data.Name || null;
    this.remarks = data.remarks || data.Remarks || null;

    // Operating hours
    this.openingTime = data.openingTime || data.OpeningTime || null;
    this.clossingTime = data.clossingTime || data.ClossingTime || null;

    // Financial information
    this.rentingAmount = data.rentingAmount || data.RentingAmount || 0;

    // Church relationship
    this.churchId = data.churchId || data.ChurchId || null;
  }

  /**
   * Convert to JSON format
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      wakeRoomId: this.wakeRoomId,
      code: this.code,
      name: this.name,
      remarks: this.remarks,
      openingTime: this.openingTime,
      clossingTime: this.clossingTime,
      rentingAmount: this.rentingAmount,
      churchId: this.churchId
    };
  }

  /**
   * Validate wake room data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.code || this.code.trim() === '') {
      errors.push('Code is required');
    }

    if (!this.name || this.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!this.churchId) {
      errors.push('Church ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = WakeRoom;

