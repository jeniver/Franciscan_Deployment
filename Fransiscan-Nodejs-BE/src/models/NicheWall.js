/**
 * NicheWall Model
 * Represents a wall/section containing multiple rows of niches
 */

class NicheWall {
  constructor(data) {
    this.nicheWallId = data.NicheWallId || data.nicheWallId;
    this.chapelId = data.ChapelId || data.chapelId;
    this.code = data.Code || data.code;
    this.name = data.Name || data.name;
    this.churchId = data.ChurchId || data.churchId;
  }

  /**
   * Convert to JSON for API response
   */
  toJSON() {
    return {
      nicheWallId: this.nicheWallId,
      chapelId: this.chapelId,
      code: this.code,
      name: this.name,
      churchId: this.churchId
    };
  }
}

module.exports = NicheWall;

