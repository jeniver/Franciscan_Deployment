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

    console.log('Nomine 2 location', data.nominee2AddressLine1, data.nominee2AddressLine2, data.nominee2AddressCity, data.nominee2AddressCountry, data.nominee2AddressState)

    // Beneficiary 1 details
    this.beneName_1 = data.beneName_1 || null;
    this.beneIDNo_1 = data.beneIDNo_1 || null;
    this.beneIsCatholic_1 = data.beneIsCatholic_1 || false;
    this.beneIsMale_1 = data.beneIsMale_1 || false;
    this.beneRelationshipToApplicant_1 = data.beneRelationshipToApplicant_1 || null;
    this.beneDateOfBirth_1 = "12212122";
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

    // Status
    this.status = parseInt(data.Status || data.status || 0);

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

  // Get formatted nominee address - FIXED to prevent duplication
  getNomineeAddress() {
    // Check if addressLine1 already contains a complete formatted address
    const line1 = this.nomineeAddressLine1 ? this.nomineeAddressLine1.trim() : '';

    if (line1 && this.isCompleteAddress(line1)) {
      // If it's already a complete address, return it as-is with addressNo prefix
      const parts = [this.nomineeAddressNo, line1].filter(part => part && part.trim() !== '');
      return parts.join(' ').trim();
    }

    // Otherwise, build address from individual components
    const parts = [];

    // Add address type (No/Block)
    if (this.nomineeAddressNo && this.nomineeAddressNo.trim() !== '') {
      parts.push(this.nomineeAddressNo.trim());
    }

    // Add block/number - handle both cases: full address or just block number
    if (line1) {
      // If line1 is just a number, treat it as block number and add "Block" prefix
      if (/^\d+$/.test(line1)) {
        parts.push(`Block ${line1}`);
      } else {
        // If it's not just a number, try to extract block number or use as-is
        const blockNumber = this.extractBlockNumber(line1);
        if (blockNumber) {
          parts.push(`Block ${blockNumber}`);
        } else {
          parts.push(line1);
        }
      }
    }

    // Add street name - only if it's different from line1 and not already included
    if (this.nomineeAddressLine2 && this.nomineeAddressLine2.trim() !== '' &&
      (!line1 || !line1.includes(this.nomineeAddressLine2.trim()))) {
      parts.push(this.nomineeAddressLine2.trim());
    }

    // Add unit number
    if (this.nomineeAddressCity && this.nomineeAddressCity.trim() !== '') {
      parts.push(this.nomineeAddressCity.trim());
    }

    // Add country and postal code
    const locationParts = [];
    if (this.nomineeAddressCountry && this.nomineeAddressCountry.trim() !== '') {
      locationParts.push(this.nomineeAddressCountry.trim());
    }
    if (this.nomineeAddressState && this.nomineeAddressState.trim() !== '') {
      locationParts.push(this.nomineeAddressState.trim());
    }

    if (locationParts.length > 0) {
      parts.push(locationParts.join(' '));
    }

    return parts.join(' ');
  }

  // Get formatted nominee2 address - FIXED to prevent duplication
  getNominee2Address() {
    // Check if addressLine1 already contains a complete formatted address
    const line1 = this.nominee2AddressLine1 ? this.nominee2AddressLine1.trim() : '';

    // If addressLine1 contains key address components, treat it as a complete address
    if (line1 && this.isCompleteAddress(line1)) {
      // Use addressLine1 as the complete address, with addressNo prefix
      const parts = [this.nominee2AddressNo, line1].filter(part => part && part.trim() !== '');
      return parts.join(' ').trim();
    }

    // Otherwise, build address from individual components
    const parts = [];

    // Add address type (No/Block)
    if (this.nominee2AddressNo && this.nominee2AddressNo.trim() !== '') {
      parts.push(this.nominee2AddressNo.trim());
    }

    // Add block/number - handle both cases: full address or just block number
    if (line1) {
      // If line1 is just a number, treat it as block number and add "Block" prefix
      if (/^\d+$/.test(line1)) {
        parts.push(`Block ${line1}`);
      } else {
        // If it's not just a number, try to extract block number or use as-is
        const blockNumber = this.extractBlockNumber(line1);
        if (blockNumber) {
          parts.push(`Block ${blockNumber}`);
        } else {
          parts.push(line1);
        }
      }
    }

    // Add street name - only if it's different from line1 and not already included
    if (this.nominee2AddressLine2 && this.nominee2AddressLine2.trim() !== '' &&
      (!line1 || !line1.includes(this.nominee2AddressLine2.trim()))) {
      parts.push(this.nominee2AddressLine2.trim());
    }

    // Add unit number
    if (this.nominee2AddressCity && this.nominee2AddressCity.trim() !== '') {
      parts.push(this.nominee2AddressCity.trim());
    }

    // Add country and postal code
    const locationParts = [];
    if (this.nominee2AddressCountry && this.nominee2AddressCountry.trim() !== '') {
      locationParts.push(this.nominee2AddressCountry.trim());
    }
    if (this.nominee2AddressState && this.nominee2AddressState.trim() !== '') {
      locationParts.push(this.nominee2AddressState.trim());
    }

    if (locationParts.length > 0) {
      parts.push(locationParts.join(' '));
    }

    return parts.join(' ');
  }

  // Helper function to detect if a string contains complete address components
  isCompleteAddress(address) {
    if (!address || typeof address !== 'string') return false;

    // Check if the address contains typical Singapore address patterns
    const singaporePatterns = [
      /#\d+/,           // Unit number pattern
      /Singapore\s+\d{6}/, // Singapore with postal code
      /,\s*Singapore/,   // Comma followed by Singapore
      /\d{6}\s*Singapore/  // Postal code followed by Singapore
    ];

    return singaporePatterns.some(pattern => pattern.test(address));
  }

  // Helper function to extract block number from a full address string
  extractBlockNumber(fullAddress) {
    if (!fullAddress || typeof fullAddress !== 'string') return null;

    // Extract block number (typically at the beginning) with better edge case handling
    const blockPatterns = [
      /Bl\[iao]?[sc(kv]?\s+(\d+[A-Z]*)/i,  // Block/Blk/Bik/Blc variations followed by number
      /^(\d+[A-Z]*)\s+/i,                  // Number at the beginning followed by space
      /(?:^|\s)(\d+[A-Z]*)(?:\s|$)/i       // Number with word boundaries
    ];

    for (const pattern of blockPatterns) {
      const match = fullAddress.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get human-readable status text
   */
  getStatusText() {
    const statusMap = {
      0: 'Deleted',
      1: 'Draft',
      2: 'Pending',
      3: 'Booked',
      4: 'Completed'
    };
    return statusMap[this.status] || 'Unknown';
  }

  // Convert to JSON (remove sensitive data if needed)
  toJSON() {
    const jsonOutput = {
      applicationCode: this.applicationCode,
      appliedDate: this.appliedDate,
      agreementDate: this.agreementDate,
      status: this.status,
      statusText: this.getStatusText(),

      // Applicant
      applicant: {
        name: this.applicantName,
        address: this.getApplicantAddress(),
        addressNo: this.applicantAddressNo,
        addressLine1: this.applicantAddressLine1,
        addressLine2: this.applicantAddressLine2,
        addressCity: this.applicantAddressCity,
        addressState: this.applicantAddressState,
        addressCountry: this.applicantAddressCountry,
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
        addressNo: this.nomineeAddressNo,
        addressLine1: this.nomineeAddressLine1,
        addressLine2: this.nomineeAddressLine2,
        addressCity: this.nomineeAddressCity,
        addressState: this.nomineeAddressState,
        addressCountry: this.nomineeAddressCountry,
        email: this.nomineeEmailID,
        idNo: this.nomineeIDNo,
        mobileNo: this.nomineeMobileNo,
        homeTelNo: this.nomineeHomeTelNo,
        officeTelNo: this.nomineeOfficeTelNo,
        relationship: this.nomineeRelationship
      },

      // Second Nominee
      nominee2: this.nominee2Name || this.nominee2IDNo || this.nominee2MobileNo || this.getNominee2Address()
        ? {
          name: this.nominee2Name,
          address: this.getNominee2Address(),
          addressNo: this.nominee2AddressNo,
          addressLine1: this.nominee2AddressLine1,
          addressLine2: this.nominee2AddressLine2,
          addressCity: this.nominee2AddressCity,
          addressState: this.nominee2AddressState,
          addressCountry: this.nominee2AddressCountry,
          email: this.nominee2EmailID,
          idNo: this.nominee2IDNo,
          mobileNo: this.nominee2MobileNo,
          homeTelNo: this.nominee2HomeTelNo,
          officeTelNo: this.nominee2OfficeTelNo,
          relationship: this.nominee2Relationship
        }
        : null,

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
        rowPrice: this.nicheLocation?.row?.rowPrice || 0,

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
            level: null,
            rowPrice: this.nicheLocation?.row?.rowPrice || 0
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

    // Add inscription data if available
    if (this.inscription) {
      jsonOutput.inscription = {
        code: this.inscription.code,
        status: this.inscription.status,
        bibleInscriptionChoiceId: this.inscription.bibleInscriptionChoiceId,
        bibleInscriptionChoiceNo: this.inscription.bibleInscriptionChoiceNo,
        additionalInscriptionPhrase: this.inscription.additionalInscriptionPhrase,
        createdDate: this.inscription.createdDate
      };

      // Add inscription items if available
      if (this.inscriptionItems && Array.isArray(this.inscriptionItems)) {
        jsonOutput.inscriptionItems = this.inscriptionItems;
      }
    }

    return jsonOutput;
  }

  // Add inscription data to JSON output
  addInscriptionData(jsonOutput, inscriptionData, inscriptionItems) {
    if (inscriptionData) {
      jsonOutput.inscription = {
        code: inscriptionData.code,
        status: inscriptionData.status,
        bibleInscriptionChoiceId: inscriptionData.bibleInscriptionChoiceId,
        bibleInscriptionChoiceNo: inscriptionData.bibleInscriptionChoiceNo,
        additionalInscriptionPhrase: inscriptionData.additionalInscriptionPhrase,
        createdDate: inscriptionData.createdDate
      };

      // Add inscription items if available
      if (inscriptionItems && Array.isArray(inscriptionItems)) {
        jsonOutput.inscriptionItems = inscriptionItems;
      }
    }

    return jsonOutput;
  }
}

module.exports = NicheAgreement;
