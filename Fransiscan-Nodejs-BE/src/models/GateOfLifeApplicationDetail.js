/**
 * GateOfLifeApplicationDetail model
 * Represents a single engraved name entry linked to a Gate of Life application.
 */
class GateOfLifeApplicationDetail {
  constructor(data = {}) {
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
  }

  isValid() {
    return Boolean(this.nameToEngrave && this.nameToEngrave.trim());
  }

  toJSON() {
    return {
      detailId: this.detailId,
      applicationId: this.applicationId,
      nameToEngrave: this.nameToEngrave,
      remarks: this.remarks
    };
  }
}

module.exports = GateOfLifeApplicationDetail;


