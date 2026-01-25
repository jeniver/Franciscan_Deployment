/**
 * NicheRow Model
 * Represents a horizontal row of niches within a wall
 */

class NicheRow {
  constructor(data) {
    this.nicheRowId = data.NicheRowlId || data.nicheRowId;
    this.nicheWallId = data.NicheWallId || data.nicheWallId;
    this.code = data.Code || data.code;
    this.name = data.Name || data.name;
    this.defaultAmount = parseFloat(data.DefaultAmount || data.defaultAmount || 0);
    this.churchId = data.ChurchId || data.churchId;
    this.nicheLevel = data.NicheLevel || data.nicheLevel;
  }

  /**
   * Convert to JSON for API response
   */
  toJSON() {
    return {
      nicheRowId: this.nicheRowId,
      nicheWallId: this.nicheWallId,
      code: this.code,
      name: this.name,
      defaultAmount: this.defaultAmount,
      churchId: this.churchId,
      nicheLevel: this.nicheLevel
    };
  }
}

module.exports = NicheRow;

