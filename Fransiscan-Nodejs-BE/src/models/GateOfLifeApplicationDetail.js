/**
 * GateOfLifeApplicationDetail model
 * Represents a single engraved name entry linked to a Gate of Life application.
 */
class GateOfLifeApplicationDetail {
  constructor(data = {}) {
    if (!data) data = {};

    this.detailId = data.detailId
      || data.gateOfLifeApplicationDetailId
      || data.engraveWallApplicationDetailId
      || data.EngraveWallApplicationDetailId
      || null;

    this.applicationId = data.applicationId
      || data.gateOfLifeApplicationId
      || data.EngraveWallApplicationId
      || null;

    this.nameToEngrave = data.nameToEngrave
      || data.NameToEngrave
      || data.name
      || null;

    this.remarks = data.remarks
      || data.Remarks
      || null;

    // Handle dates more robustly - could be Date object or string
    this.dateOfBirth = data.dateOfBirth || data.DateOfBirth || null;
    this.dateOfDeath = data.dateOfDeath || data.DateOfDeath || null;
    this.additionalInfo = data.additionalInfo || data.AdditionalInfo || null;
  }

  isValid() {
    return Boolean(this.nameToEngrave && this.nameToEngrave.trim());
  }

  toJSON() {
    return {
      detailId: this.detailId,
      applicationId: this.applicationId,
      nameToEngrave: this.nameToEngrave,
      remarks: this.remarks,
      dateOfBirth: this.dateOfBirth,
      dateOfDeath: this.dateOfDeath,
      additionalInfo: this.additionalInfo
    };
  }
}

module.exports = GateOfLifeApplicationDetail;


