/**
 * BibleInscriptionChoice entity model
 * Represents a Bible verse/phrase choice for niche inscriptions
 */
class BibleInscriptionChoice {
  constructor(data = {}) {
    this.bibleInscriptionChoiceId = data.bibleInscriptionChoiceId || data.BibleInscriptionChoiceId || null;
    this.bibleInscriptionChoiceNo = data.bibleInscriptionChoiceNo || data.BibleInscriptionChoiceNo || '';
    this.bibleInscriptionChoiceNoValue = data.bibleInscriptionChoiceNoValue || data.BibleInscriptionChoiceNoValue || '';
    this.churchId = data.churchId || data.ChurchId || null;
  }

  /**
   * Create BibleInscriptionChoice instance from database row
   * @param {Object} row - Database row object
   * @returns {BibleInscriptionChoice} Instance of BibleInscriptionChoice
   */
  static fromDatabase(row) {
    return new BibleInscriptionChoice({
      bibleInscriptionChoiceId: row.BibleInscriptionChoiceId,
      bibleInscriptionChoiceNo: row.BibleInscriptionChoiceNo,
      bibleInscriptionChoiceNoValue: row.BibleInscriptionChoiceNoValue,
      churchId: row.ChurchId
    });
  }

  /**
   * Convert to JSON format
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      bibleInscriptionChoiceId: this.bibleInscriptionChoiceId,
      bibleInscriptionChoiceNo: this.bibleInscriptionChoiceNo,
      bibleInscriptionChoiceNoValue: this.bibleInscriptionChoiceNoValue,
      churchId: this.churchId
    };
  }

  /**
   * Validate Bible choice data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.bibleInscriptionChoiceNo || this.bibleInscriptionChoiceNo.trim() === '') {
      errors.push('Bible Inscription Choice Number is required');
    }

    if (!this.bibleInscriptionChoiceNoValue || this.bibleInscriptionChoiceNoValue.trim() === '') {
      errors.push('Bible Inscription Choice Value is required');
    }

    if (!this.churchId) {
      errors.push('Church ID is required');
    }

    if (this.bibleInscriptionChoiceNo && this.bibleInscriptionChoiceNo.length > 30) {
      errors.push('Bible Inscription Choice Number must be 30 characters or less');
    }

    if (this.bibleInscriptionChoiceNoValue && this.bibleInscriptionChoiceNoValue.length > 500) {
      errors.push('Bible Inscription Choice Value must be 500 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = BibleInscriptionChoice;

