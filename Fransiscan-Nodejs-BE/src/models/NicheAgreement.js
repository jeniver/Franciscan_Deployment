/**
 * Niche Agreement entity model
 * Based on ASP.NET Entity.NicheAgreement structure
 */
class NicheAgreement {
  constructor(data = {}) {
    // Application details
    this.applicationCode = data.applicationCode || null;
    this.appliedDate = data.appliedDate || null;
    this.agreementDate = data.agreementDate || null;

    // Applicant details
    this.applicantName = data.applicantName || null;
    this.applicantAddressNo = data.applicantAddressNo || null;
    this.applicantAddressLine1 = data.applicantAddressLine1 || null;
    this.applicantAddressLine2 = data.applicantAddressLine2 || null;
    this.applicantAddressCity = data.applicantAddressCity || null;
    this.applicantAddressCountry = data.applicantAddressCountry || null;
    this.applicantAddressState = data.applicantAddressState || null;
    this.applicantEmailID = data.applicantEmailID || null;
    this.applicantIDNo = data.applicantIDNo || null;
    this.applicantMobileNo = data.applicantMobileNo || null;
    this.applicantHomeTelNo = data.applicantHomeTelNo || null;
    this.applicantOfficeTelNo = data.applicantOfficeTelNo || null;
    this.applicantIsCatholic = data.applicantIsCatholic || false;

    // Nominee details
    this.nomineeName = data.nomineeName || null;
    this.nomineeAddressNo = data.nomineeAddressNo || null;
    this.nomineeAddressLine1 = data.nomineeAddressLine1 || null;
    this.nomineeAddressLine2 = data.nomineeAddressLine2 || null;
    this.nomineeAddressCity = data.nomineeAddressCity || null;
    this.nomineeAddressCountry = data.nomineeAddressCountry || null;
    this.nomineeAddressState = data.nomineeAddressState || null;
    this.nomineeEmailID = data.nomineeEmailID || null;
    this.nomineeIDNo = data.nomineeIDNo || null;
    this.nomineeMobileNo = data.nomineeMobileNo || null;
    this.nomineeHomeTelNo = data.nomineeHomeTelNo || null;
    this.nomineeOfficeTelNo = data.nomineeOfficeTelNo || null;
    this.nomineeRelationship = data.nomineeRelationship || null;

    // Second Nominee details
    this.nominee2Name = data.nominee2Name || null;
    this.nominee2AddressNo = data.nominee2AddressNo || null;
    this.nominee2AddressLine1 = data.nominee2AddressLine1 || null;
    this.nominee2AddressLine2 = data.nominee2AddressLine2 || null;
    this.nominee2AddressCity = data.nominee2AddressCity || null;
    this.nominee2AddressCountry = data.nominee2AddressCountry || null;
    this.nominee2AddressState = data.nominee2AddressState || null;
    this.nominee2EmailID = data.nominee2EmailID || null;
    this.nominee2IDNo = data.nominee2IDNo || null;
    this.nominee2MobileNo = data.nominee2MobileNo || null;
    this.nominee2HomeTelNo = data.nominee2HomeTelNo || null;
    this.nominee2OfficeTelNo = data.nominee2OfficeTelNo || null;
    this.nominee2Relationship = data.nominee2Relationship || null;

    // Beneficiary 1 details
    this.beneName_1 = data.beneName_1 || null;
    this.beneIDNo_1 = data.beneIDNo_1 || null;
    this.beneIsCatholic_1 = data.beneIsCatholic_1 || false;
    this.beneIsMale_1 = data.beneIsMale_1 || false;
    this.beneRelationshipToApplicant_1 = data.beneRelationshipToApplicant_1 || null;
    this.beneDateOfBirth_1 = data.beneDateOfBirth_1 || null;
    this.beneBirthYear_1 = data.beneBirthYear_1 || null;
    this.ben1_NomineeRelationship = data.ben1_NomineeRelationship || null;
    this.ben1_Nominee2Relationship = data.ben1_Nominee2Relationship || null;

    // Beneficiary 2 details
    this.beneName_2 = data.beneName_2 || null;
    this.beneIDNo_2 = data.beneIDNo_2 || null;
    this.beneIsCatholic_2 = data.beneIsCatholic_2 || false;
    this.beneIsMale_2 = data.beneIsMale_2 || false;
    this.beneRelationshipToApplicant_2 = data.beneRelationshipToApplicant_2 || null;
    this.beneDateOfBirth_2 = data.beneDateOfBirth_2 || null;
    this.beneBirthYear_2 = data.beneBirthYear_2 || null;
    this.ben2_NomineeRelationship = data.ben2_NomineeRelationship || null;
    this.ben2_Nominee2Relationship = data.ben2_Nominee2Relationship || null;

    // Niche details
    this.nicheNumber = data.nicheNumber || null;
    this.nicheCode = data.nicheCode || null;
    this.nicheRowNumber = data.nicheRowNumber || null;
    this.nicheWallName = data.nicheWallName || null;
    this.chapelName = data.chapelName || null;
    this.nicheTotalAmount = data.nicheTotalAmount || 0;
    this.nicheLineAmount = data.nicheLineAmount || 0;

    // Niche location hierarchy (Chapel → Wall → Row → Niche)
    this.nicheLocation = data.nicheLocation || null;

    // Invoice details
    this.invoiceNo = data.invoiceNo || null;
    this.invoiceDate = data.invoiceDate || null;
    this.receiptNo = data.receiptNo || null;
    this.receiptDate = data.receiptDate || null;
    this.receiptAmount = data.receiptAmount || 0;
    this.taxAmount = data.taxAmount || 0;
    this.invoicePayingAmount = data.invoicePayingAmount || 0;
    this.receiptPayingAmount = data.receiptPayingAmount || 0;
    this.totalAmount = data.totalAmount || 0;
    this.paymentMode = data.paymentMode || null;
    this.paymentModeDocNo = data.paymentModeDocNo || null;
    this.refDocNumber = data.refDocNumber || null;

    // Deceased information (from NicheInscriptionRequestDecesed)
    this.nameOfDeceased1 = data.nameOfDeceased1 || null;
    this.dateDied1 = data.dateDied1 || null;
    this.internmentDate1 = data.internmentDate1 || null;
    this.deathCertificateNo1 = data.deathCertificateNo1 || null;
    this.nameOfDeceased2 = data.nameOfDeceased2 || null;
    this.dateDied2 = data.dateDied2 || null;
    this.internmentDate2 = data.internmentDate2 || null;
    this.deathCertificateNo2 = data.deathCertificateNo2 || null;

    // Storage period (from NicheInscriptionRequest)
    this.storageFrom = data.storageFrom || null;
    this.storageTo = data.storageTo || null;

    // Consent form statuses and timestamps
    this.consentFormStatus = data.consentFormStatus || null;
    this.consentFormTimestamp = data.consentFormTimestamp || null;
    this.agreementStatus = data.agreementStatus || null;
    this.agreementTimestamp = data.agreementTimestamp || null;
  }

  // Get formatted applicant address
  getApplicantAddress() {
    const parts = [
      this.applicantAddressNo,
      this.applicantAddressLine1,
      this.applicantAddressLine2,
      this.applicantAddressCity,
      this.applicantAddressCountry,
      this.applicantAddressState
    ].filter(part => part && part.trim() !== '');

    return parts.join(' ');
  }

  // Get formatted nominee address
  getNomineeAddress() {
    const parts = [
      this.nomineeAddressNo,
      this.nomineeAddressLine1,
      this.nomineeAddressLine2,
      this.nomineeAddressCity,
      this.nomineeAddressCountry,
      this.nomineeAddressState
    ].filter(part => part && part.trim() !== '');

    return parts.join(' ');
  }

  // Get formatted nominee2 address
  getNominee2Address() {
    const parts = [
      this.nominee2AddressNo,
      this.nominee2AddressLine1,
      this.nominee2AddressLine2,
      this.nominee2AddressCity,
      this.nominee2AddressCountry,
      this.nominee2AddressState
    ].filter(part => part && part.trim() !== '');

    return parts.join(' ');
  }

  // Convert to JSON (remove sensitive data if needed)
  toJSON() {
    return {
      applicationCode: this.applicationCode,
      appliedDate: this.appliedDate,
      agreementDate: this.agreementDate,

      // Applicant
      applicant: {
        name: this.applicantName,
        address: this.getApplicantAddress(),
        email: this.applicantEmailID,
        idNo: this.applicantIDNo,
        mobileNo: this.applicantMobileNo,
        homeTelNo: this.applicantHomeTelNo,
        officeTelNo: this.applicantOfficeTelNo,
        isCatholic: this.applicantIsCatholic
      },

      // Nominee
      nominee: {
        name: this.nomineeName,
        address: this.getNomineeAddress(),
        email: this.nomineeEmailID,
        idNo: this.nomineeIDNo,
        mobileNo: this.nomineeMobileNo,
        homeTelNo: this.nomineeHomeTelNo,
        officeTelNo: this.nomineeOfficeTelNo,
        relationship: this.nomineeRelationship
      },

      // Second Nominee
      nominee2: {
        name: this.nominee2Name,
        address: this.getNominee2Address(),
        email: this.nominee2EmailID,
        idNo: this.nominee2IDNo,
        mobileNo: this.nominee2MobileNo,
        homeTelNo: this.nominee2HomeTelNo,
        officeTelNo: this.nominee2OfficeTelNo,
        relationship: this.nominee2Relationship
      },

      // Beneficiaries
      beneficiaries: [
        {
          name: this.beneName_1,
          idNo: this.beneIDNo_1,
          isCatholic: this.beneIsCatholic_1,
          isMale: this.beneIsMale_1,
          relationshipToApplicant: this.beneRelationshipToApplicant_1,
          dateOfBirth: this.beneDateOfBirth_1,
          birthYear: this.beneBirthYear_1,
          relationshipToNominee: this.ben1_NomineeRelationship,
          relationshipToNominee2: this.ben1_Nominee2Relationship
        },
        {
          name: this.beneName_2,
          idNo: this.beneIDNo_2,
          isCatholic: this.beneIsCatholic_2,
          isMale: this.beneIsMale_2,
          relationshipToApplicant: this.beneRelationshipToApplicant_2,
          dateOfBirth: this.beneDateOfBirth_2,
          birthYear: this.beneBirthYear_2,
          relationshipToNominee: this.ben2_NomineeRelationship,
          relationshipToNominee2: this.ben2_Nominee2Relationship
        }
      ].filter(bene => bene.name), // Only include beneficiaries with names

      // Niche details with enhanced location
      niche: {
        number: this.nicheNumber,
        code: this.nicheCode,
        rowNumber: this.nicheRowNumber,
        wallName: this.nicheWallName,
        chapelName: this.chapelName,
        totalAmount: this.nicheTotalAmount,
        lineAmount: this.nicheLineAmount,

        // Complete location hierarchy
        location: this.nicheLocation || {
          chapel: {
            chapelId: null,
            chapelCode: this.chapelName,
            chapelName: this.chapelName,
            description: null
          },
          wall: {
            wallId: null,
            wallCode: null,
            wallName: this.nicheWallName
          },
          row: {
            rowId: null,
            rowCode: null,
            level: null
          }
        }
      },

      // Invoice details
      invoice: {
        invoiceNo: this.invoiceNo,
        invoiceDate: this.invoiceDate,
        receiptNo: this.receiptNo,
        receiptDate: this.receiptDate,
        receiptAmount: this.receiptAmount,
        taxAmount: this.taxAmount,
        invoicePayingAmount: this.invoicePayingAmount,
        receiptPayingAmount: this.receiptPayingAmount,
        totalAmount: this.totalAmount,
        paymentMode: this.paymentMode,
        paymentModeDocNo: this.paymentModeDocNo,
        refDocNumber: this.refDocNumber
      },

      // Deceased information
      deceased: {
        deceased1: {
          name: this.nameOfDeceased1,
          dateDied: this.dateDied1,
          internmentDate: this.internmentDate1,
          deathCertificateNo: this.deathCertificateNo1
        },
        deceased2: {
          name: this.nameOfDeceased2,
          dateDied: this.dateDied2,
          internmentDate: this.internmentDate2,
          deathCertificateNo: this.deathCertificateNo2
        }
      },

      // Storage period
      storage: {
        storageFrom: this.storageFrom,
        storageTo: this.storageTo
      },

      // Consent form and agreement status
      consentForm: {
        status: this.consentFormStatus,
        timestamp: this.consentFormTimestamp
      },

      agreement: {
        status: this.agreementStatus,
        timestamp: this.agreementTimestamp
      }
    };
  }
}

module.exports = NicheAgreement;
