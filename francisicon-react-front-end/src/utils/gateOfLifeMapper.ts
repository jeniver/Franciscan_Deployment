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
        mobileNo: '',
        homeTelephone: '',
        officeTelephone: '',
        emailAddress: '',
        addressNo: ''
      },
      engravings: [{
        name: ''
      }],
      donationAmount: 0
    };
  }

  // Map applicant data - handle both applicant object and applicantDetails
  const applicant: any = apiData.applicant || apiData.applicantDetails || {};
  const address: any = applicant.address || {};

  // Map address fields directly
  // Map address fields directly and for AddressInput
  const applicantData = {
    name: (applicant.name || '').trim(),
    idNo: (applicant.idNo || '').trim(),
    mobileNo: (applicant.mobileNo || '').trim(),
    homeTelephone: (applicant.homeTelNo || applicant.homeTelephone || '').trim(),
    officeTelephone: (applicant.officeTelNo || applicant.officeTelephone || '').trim(),
    emailAddress: (applicant.email || applicant.emailAddress || '').trim(),

    // Flat address fields
    addressNo: (address.no || applicant.applicantAddressNo || '').trim(),
    addressLine1: (address.line1 || '').trim(),
    addressLine2: (address.line2 || '').trim(),
    addressCity: (address.city || '').trim(),
    addressState: (address.state || '').trim(),
    addressCountry: (address.country || 'Singapore').trim(),

    // Field-specific mapping for AddressInput
    block: (address.no || applicant.applicantAddressNo || '').trim(),
    blockNo: (address.line1 || '').trim(),
    streetName: (address.line2 || '').trim(),
    unitNo: (address.city || '').trim(),
    postalCode: (address.state || '').trim(),
    country: (address.country || 'Singapore').trim(),

    fullAddress: [address.no, address.line1, address.line2, address.city, address.state, address.country].filter(Boolean).join(' ')
  };

  // Map engravings/details - handle both details array and engravings array
  const details = apiData.details || apiData.engravings || [];
  const engravings = details.map((detail: any) => ({
    name: detail.nameToEngrave || detail.name || ''
  }));

  // If no engravings, add one empty
  const mappedEngravings = engravings.length > 0 ? engravings : [{
    name: ''
  }];

  return {
    applicationNumber: apiData.code || apiData.applicationNumber || '',
    bookingDate: formatDateForInput(apiData.bookingDate) || '',
    applicantData,
    engravings: mappedEngravings,
    donationAmount: apiData.donation?.amount || apiData.donationAmount || 0,
    requestSameBrick: !!apiData.requestSameBrick
  };
};

