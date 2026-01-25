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
  const applicant = apiData.applicant || apiData.applicantDetails || {};
  const address = applicant.address || {};
  
  // Handle address mapping - API returns:
  // address.no = "Block" (label, not the block letter - can be ignored)
  // address.line1 = "202" (block number)
  // address.line2 = "Bukit Batok Street 21" (street name)
  // address.city = "#14-102" (unit number)
  // address.state = "650202" (postal code)
  // address.country = "Singapore"
  
  // Map address fields directly - address.no is just a label "Block", not the block letter
  // Block letter (A, B, C) is not in the API response, so we leave it empty
  const applicantData = {
    name: (applicant.name || '').trim(),
    idNo: (applicant.idNo || applicant.idNumber || '').trim(), // ID/NRIC/Passport number
    block: applicant.block || '', // Block letter (A, B, C) - not in API response, leave empty
    blockNo: (address.line1 || applicant.blockNo || '').trim(), // Block number from line1
    streetName: (address.line2 || applicant.streetName || '').trim(), // Street name from line2
    unitNo: (address.city || applicant.unitNo || '').trim(), // Unit number from city
    postalCode: (address.state || applicant.postalCode || '').trim(), // Postal code from state
    country: (address.country || applicant.country || 'Singapore').trim(),
    mobileNo: (applicant.mobileNo || '').trim(),
    homeTelephone: (applicant.homeTelNo || applicant.homeTelephone || '').trim(),
    officeTelephone: (applicant.officeTelNo || applicant.officeTelephone || '').trim(),
    emailAddress: (applicant.email || applicant.emailAddress || '').trim()
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
    donationAmount: apiData.donation?.amount || 0
  };
};

