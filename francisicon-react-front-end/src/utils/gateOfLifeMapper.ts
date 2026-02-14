import { GateOfLifeApplication } from '../services/gateOfLifeService';
import { formatDateForInput } from './dateUtils';

// Map API response to form data structure
export const mapApiApplicationToFormData = (apiData: GateOfLifeApplication) => {
  if (!apiData) {
    return {
      applicationNumber: '',
      bookingDate: '',
      applicantData: {
        name: '',
        idNo: '',
        block: '',
        blockNo: '',
        streetName: '',
        unitNo: '',
        postalCode: '',
        country: 'Singapore',
        mobileNo: '',
        homeTelephone: '',
        officeTelephone: '',
        emailAddress: ''
      },
      engravings: [{
        name: '',
        relationship: '',
        dateOfBirth: '',
        dateOfDeath: '',
        additionalInfo: ''
      }],
      donationAmount: 0
    };
  }

  // Map applicant data - handle both applicant object and applicantDetails
  const applicant: any = apiData.applicant || apiData.applicantDetails || {};
  const address: any = applicant.address || {};

  // Map address fields directly
  const applicantData = {
    name: (applicant.name || '').trim(),
    idNo: (applicant.idNo || applicant.idNumber || '').trim(),
    block: (address.no || applicant.block || '').trim(),
    blockNo: (address.line1 || applicant.blockNo || '').trim(),
    streetName: (address.line2 || applicant.streetName || '').trim(),
    unitNo: (address.city || applicant.unitNo || '').trim(),
    postalCode: (address.state || applicant.postalCode || '').trim(),
    country: (address.country || applicant.country || 'Singapore').trim(),
    mobileNo: (applicant.mobileNo || '').trim(),
    homeTelephone: (applicant.homeTelNo || applicant.homeTelephone || '').trim(),
    officeTelephone: (applicant.officeTelNo || applicant.officeTelephone || '').trim(),
    emailAddress: (applicant.email || applicant.emailAddress || '').trim(),
    // Add structured address fields for AddressInput
    addressNo: (address.no || applicant.applicantAddressNo || '').trim(),
    addressLine1: (address.line1 || applicant.applicantAddressLine1 || '').trim(),
    addressLine2: (address.line2 || applicant.applicantAddressLine2 || '').trim(),
    addressCity: (address.city || applicant.applicantAddressCity || '').trim(),
    addressState: (address.state || applicant.applicantAddressState || '').trim(),
    addressCountry: (address.country || applicant.applicantAddressCountry || 'Singapore').trim()
  };

  // Map engravings/details - handle both details array and engravings array
  const details = apiData.details || apiData.engravings || [];
  const engravings = details.map((detail: any) => ({
    name: detail.nameToEngrave || detail.name || '',
    relationship: detail.remarks || detail.relationship || '',
    dateOfBirth: formatDateForInput(detail.dateOfBirth) || '',
    dateOfDeath: formatDateForInput(detail.dateOfDeath) || '',
    additionalInfo: detail.additionalInfo || ''
  }));

  // If no engravings, add one empty
  const mappedEngravings = engravings.length > 0 ? engravings : [{
    name: '',
    relationship: '',
    dateOfBirth: '',
    dateOfDeath: '',
    additionalInfo: ''
  }];

  return {
    applicationNumber: apiData.code || apiData.applicationNumber || '',
    bookingDate: formatDateForInput(apiData.bookingDate) || '',
    applicantData,
    engravings: mappedEngravings,
    donationAmount: apiData.donation?.amount || 0,
    requestSameBrick: !!(apiData.requestSameBrick || (apiData as any).isHusbandWife)
  };
};

