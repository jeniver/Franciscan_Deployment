/**
 * Niche Model
 * Represents a single niche (columbarium slot) in the system
 */

class Niche {
  constructor(data) {
    this.nicheId = data.NicheId || data.nicheId;
    this.nicheRowId = data.NicheRowlId || data.nicheRowId;
    this.code = data.Code || data.code;
    this.defaultAmount = parseFloat(data.DefaultAmount || data.defaultAmount || 0);
    this.appearanceDescription = data.AppearanceDescription || data.appearanceDescription;
    this.status = parseInt(data.Status || data.status || 0);
    this.churchId = data.ChurchId || data.churchId;

    // Location information (if provided from joins)
    this.wallId = data.NicheWallId || data.wallId;
    this.wallCode = data.WallCode || data.wallCode;
    this.wallName = data.WallName || data.wallName;
    this.rowCode = data.RowCode || data.rowCode;
    this.rowLevel = data.NicheLevel || data.rowLevel;

    // Derived properties
    this.statusText = this.getStatusText();
    this.statusColor = this.getStatusColor();
    this.isAvailable = this.status === 1;
  }

  /**
   * Get human-readable status text
   */
  getStatusText() {
    const statusMap = {
      0: 'Not In Use',
      1: 'Vacant',
      2: 'Reserved',
      3: 'Booked',
      4: 'Occupied',
      5: 'Partially Occupied'
    };
    return statusMap[this.status] || 'Unknown';
  }

  /**
   * Get color code for UI display
   */
  getStatusColor() {
    const colorMap = {
      0: '#62626D', // Grey - NotInUse
      1: '#47B56C', // Green - Vacant
      2: 'transparent', // Transparent - Reserved
      3: '#FFFF98', // Light Yellow - Booked
      4: '#A83030', // Red - Occupied
      5: '#990033' // Dark Red - Partially Occupied
    };
    return colorMap[this.status] || '#CCCCCC';
  }

  /**
   * Convert to JSON for API response
   */
  toJSON() {
    return {
      nicheId: this.nicheId,
      nicheRowId: this.nicheRowId,
      code: this.code,
      defaultAmount: this.defaultAmount,
      appearanceDescription: this.appearanceDescription,
      status: this.status,
      statusText: this.statusText,
      statusColor: this.statusColor,
      isAvailable: this.isAvailable,
      churchId: this.churchId,
      wallId: this.wallId,
      wallCode: this.wallCode,
      wallName: this.wallName,
      rowNumber: this.rowCode,
      rowLevel: this.rowLevel
    };
  }
}

module.exports = Niche;
