/**
 * Chapel Model
 * Represents a chapel/location containing multiple walls of niches
 */

class Chapel {
  constructor(data) {
    this.chapelId = data.ChapelId || data.chapelId;
    this.churchId = data.ChurchId || data.churchId;
    this.code = data.Code || data.code;
    this.name = data.Name || data.name;
    this.description = data.Description || data.description;
  }

  /**
   * Convert to JSON for API response
   */
  toJSON() {
    return {
      chapelId: this.chapelId,
      churchId: this.churchId,
      code: this.code,
      name: this.name,
      description: this.description
    };
  }
}

module.exports = Chapel;

