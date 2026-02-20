import { useState, useEffect, useCallback } from 'react';
import { UserCheckIcon, PlusIcon, InfoIcon, Trash2Icon, Loader2, SearchIcon, CheckCircle2, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { FormSelect } from '../components/FormSelect';
import { AddressInput } from '../components/AddressInput';
import { PrintSecondNomineeButton } from '../components/PrintSecondNomineeButton';
import { UpdateApplicationButton } from '../components/UpdateApplicationButton';
import { usePersonLookup } from '../hooks/usePersonLookup';
import { PersonData } from '../services/personService';
interface NomineeDetailsProps {
  formData: any;
  setFormData: (data: any) => void;
  isReadOnly?: boolean;
}
interface Nominee {
  id: number;
  fullName: string;
  nric: string;
  relationship: string;
  dateOfBirth: string;
  contactNumber: string;
  address?: string;
  block?: string;
  blockNo?: string;
  streetName?: string;
  unitNo?: string;
  postalCode?: string;
  country?: string;
  officeTelNo?: string;
  homeTelNo?: string;
  email?: string;
  status: 'Active' | 'Non-Active';
}
export function NomineeDetails({
  formData,
  setFormData,
  isReadOnly = false
}: NomineeDetailsProps) {
  // Get validation errors from Redux store
  const validationErrors = useSelector((state: RootState) => state.application.validationErrors);

  const [nominees, setNominees] = useState<Nominee[]>(formData.nominees || []);
  const { searchPerson, searchResults, isSearching, clearResults } = usePersonLookup();
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const nomineesAreEqual = (a: Nominee[], b: Nominee[]) => {
    if (a.length !== b.length) return false;
    return a.every((item, index) => {
      const other = b[index];
      return other &&
        item.id === other.id &&
        item.fullName === other.fullName &&
        item.nric === other.nric &&
        item.relationship === other.relationship &&
        item.dateOfBirth === other.dateOfBirth &&
        item.contactNumber === other.contactNumber &&
        item.address === other.address &&
        item.officeTelNo === other.officeTelNo &&
        item.homeTelNo === other.homeTelNo &&
        item.email === other.email &&
        item.status === other.status;
    });
  };

  // Sync local state with Redux form data
  useEffect(() => {
    if (formData.nominees && Array.isArray(formData.nominees)) {
      const normalized = formData.nominees.map((nominee: any, index: number) => ({
        id: nominee.id ?? index + 1,
        fullName: nominee.fullName || nominee.name || '',
        nric: nominee.nric || nominee.nomineeIDNo || '',
        relationship: nominee.relationship || nominee.relationshipToApplicant || '',
        dateOfBirth: nominee.dateOfBirth || '',
        contactNumber: nominee.contactNumber || nominee.phone || '',
        address: nominee.address || (index === 0 ? formData.nomineeAddress || '' : formData.nominee2Address || ''),
        block: nominee.block || (index === 0 ? (formData.nomineeBlock || 'Block') : 'Block'),
        blockNo: nominee.blockNo || (index === 0 ? formData.nomineeBlockNo || '' : formData.nomineeBlockNo2 || ''),
        streetName: nominee.streetName || (index === 0 ? formData.nomineeStreetName || '' : formData.nomineeStreetName2 || ''),
        unitNo: nominee.unitNo || (index === 0 ? formData.nomineeUnitNo || '' : formData.nomineeUnitNo2 || ''),
        postalCode: nominee.postalCode || (index === 0 ? formData.nomineePostalCode || '' : formData.nomineePostalCode2 || ''),
        country: nominee.country || (index === 0 ? formData.nomineeCountry || 'Singapore' : formData.nomineeCountry2 || 'Singapore'),
        officeTelNo: nominee.officeTelNo || '',
        homeTelNo: nominee.homeTelNo || '',
        email: nominee.email || '',
        status: nominee.status === 'Non-Active' || nominee.status === 'Inactive' ? 'Non-Active' : 'Active'
      }));
      setNominees(prev => (nomineesAreEqual(normalized, prev) ? prev : normalized));
    }
  }, [JSON.stringify(formData.nominees)]);

  // Helper to build a single-line legacy address from structured fields
  const buildLegacyAddress = (addressData: {
    block?: string;
    blockNo?: string;
    streetName?: string;
    unitNo?: string;
    postalCode?: string;
    country?: string;
  }): string => {
    if (!addressData.blockNo && !addressData.streetName && !addressData.unitNo && !addressData.postalCode) {
      return '';
    }

    const parts: string[] = [];

    if (addressData.blockNo && addressData.streetName) {
      parts.push(
        `${addressData.block ? addressData.block + ' ' : ''}${addressData.blockNo} ${addressData.streetName}`.trim()
      );
    } else if (addressData.streetName) {
      parts.push(addressData.streetName);
    }

    if (addressData.unitNo) {
      parts.push(`#${addressData.unitNo.replace(/^#/, '')}`);
    }

    if (addressData.postalCode) {
      parts.push(
        `${addressData.country || 'Singapore'} ${addressData.postalCode}`.trim()
      );
    }

    return parts.join(', ');
  };

  // Helper to build structured nominee object as requested
  const buildNomineeObject = (nominee: Nominee, index: number) => {
    const isBlock = nominee.block === 'Block' || nominee.block?.toLowerCase() === 'block';
    const unitNoNormalized = nominee.unitNo && nominee.unitNo.trim() !== ''
      ? (nominee.unitNo.trim().startsWith('#') ? nominee.unitNo.trim() : `#${nominee.unitNo.trim()}`)
      : '';

    // Build address string in the exact format requested
    let addressString = '';
    if (isBlock && nominee.blockNo) {
      addressString = `Block ${nominee.blockNo}`;
      if (nominee.streetName) {
        addressString += ` ${nominee.streetName}`;
      }
      if (unitNoNormalized) {
        addressString += `, ${unitNoNormalized}`;
      }
      if (nominee.country && nominee.postalCode) {
        addressString += `, ${nominee.country} ${nominee.postalCode}`;
      }
    } else if (nominee.blockNo) {
      addressString = `No ${nominee.blockNo}`;
      if (nominee.streetName) {
        addressString += ` ${nominee.streetName}`;
      }
      if (unitNoNormalized) {
        addressString += `, ${unitNoNormalized}`;
      }
      if (nominee.country && nominee.postalCode) {
        addressString += `, ${nominee.country} ${nominee.postalCode}`;
      }
    } else {
      // Fallback for cases without block number
      const parts = [];
      if (nominee.streetName) {
        parts.push(nominee.streetName);
      }
      if (unitNoNormalized) {
        parts.push(unitNoNormalized);
      }
      if (nominee.country && nominee.postalCode) {
        parts.push(`${nominee.country} ${nominee.postalCode}`);
      }
      addressString = parts.join(', ');
    }

    return {
      name: nominee.fullName || '',
      address: addressString,
      addressNo: isBlock ? 'Block' : 'No',
      addressLine1: nominee.blockNo || '',
      addressLine2: nominee.streetName || null,
      addressCity: unitNoNormalized || null,
      addressState: nominee.postalCode || null,
      addressCountry: nominee.country || 'Singapore',
      email: nominee.email || '',
      idNo: nominee.nric || '',
      mobileNo: nominee.contactNumber || '',
      homeTelNo: nominee.homeTelNo || '',
      officeTelNo: nominee.officeTelNo || '',
      relationship: nominee.relationship || ''
    };
  };

  // Helper to update form data efficiently with all nominee fields
  const updateNicheFormData = useCallback((updatedNominees: Nominee[]) => {
    const allNomineeData: any = {
      nominees: updatedNominees,
    };

    // Update fields for all nominees (up to 2 for now)
    updatedNominees.forEach((nominee, index) => {
      const nomineeIndex = index + 1;
      allNomineeData[`nominee${nomineeIndex}Name`] = nominee.fullName || '';
      allNomineeData[`nominee${nomineeIndex}IDNo`] = nominee.nric || '';
      allNomineeData[`nominee${nomineeIndex}Relationship`] = nominee.relationship || '';
      allNomineeData[`nominee${nomineeIndex}Address`] = nominee.address || '';
      allNomineeData[`nominee${nomineeIndex}BlockNo`] = nominee.blockNo || '';
      allNomineeData[`nominee${nomineeIndex}StreetName`] = nominee.streetName || '';
      allNomineeData[`nominee${nomineeIndex}UnitNo`] = nominee.unitNo || '';
      allNomineeData[`nominee${nomineeIndex}PostalCode`] = nominee.postalCode || '';
      allNomineeData[`nominee${nomineeIndex}Country`] = nominee.country || 'Singapore';
      allNomineeData[`nominee${nomineeIndex}Phone`] = nominee.contactNumber || '';
      allNomineeData[`nominee${nomineeIndex}Email`] = nominee.email || '';
      allNomineeData[`nominee${nomineeIndex}Status`] = nominee.status || 'Active';

      // Add structured address fields for backend mapping
      const isBlock = nominee.block === 'Block' || nominee.block?.toLowerCase() === 'block';
      const unitNoNormalized = nominee.unitNo && nominee.unitNo.trim() !== ''
        ? (nominee.unitNo.trim().startsWith('#') ? nominee.unitNo.trim() : `#${nominee.unitNo.trim()}`)
        : '';

      // Use backend-appropriate field naming: first nominee uses base names, second uses '2' suffix
      if (nomineeIndex === 1) {
        allNomineeData[`nomineeAddressNo`] = isBlock ? 'Blk' : 'No';
        allNomineeData[`nomineeAddressLine1`] = nominee.blockNo || '';
        allNomineeData[`nomineeAddressLine2`] = nominee.streetName || '';
        allNomineeData[`nomineeAddressCity`] = unitNoNormalized;
        allNomineeData[`nomineeAddressState`] = nominee.postalCode || '';
        allNomineeData[`nomineeAddressCountry`] = nominee.country || 'Singapore';

        // Create structured nominee object
        allNomineeData.nominee = buildNomineeObject(nominee, index);
      } else {
        // For second nominee, use '2' suffix as expected by backend
        allNomineeData[`nomineeAddressNo2`] = isBlock ? 'Blk' : 'No';
        allNomineeData[`nomineeAddressLine12`] = nominee.blockNo || '';
        allNomineeData[`nomineeAddressLine22`] = nominee.streetName || '';
        allNomineeData[`nomineeAddressCity2`] = unitNoNormalized;
        allNomineeData[`nomineeAddressState2`] = nominee.postalCode || '';
        allNomineeData[`nomineeAddressCountry2`] = nominee.country || 'Singapore';

        // Also set the nominee2Address field as fallback for backend
        allNomineeData[`nominee2Address`] = nominee.address || '';

        // Create structured nominee2 object
        allNomineeData.nominee2 = buildNomineeObject(nominee, index);
      }
    });

    // Clear fields for missing nominees (up to 5 to be safe against previous duplications)
    for (let i = updatedNominees.length + 1; i <= 5; i++) {
      allNomineeData[`nominee${i}Name`] = '';
      allNomineeData[`nominee${i}IDNo`] = '';
      allNomineeData[`nominee${i}Relationship`] = '';
      allNomineeData[`nominee${i}Address`] = '';
      allNomineeData[`nominee${i}BlockNo`] = '';
      allNomineeData[`nominee${i}StreetName`] = '';
      allNomineeData[`nominee${i}UnitNo`] = '';
      allNomineeData[`nominee${i}PostalCode`] = '';
      allNomineeData[`nominee${i}Country`] = 'Singapore';
      allNomineeData[`nominee${i}Phone`] = '';
      allNomineeData[`nominee${i}Email`] = '';
      allNomineeData[`nominee${i}Status`] = 'Active';
      // Clear structured address fields
      if (i === 1) {
        allNomineeData[`nomineeAddressNo`] = '';
        allNomineeData[`nomineeAddressLine1`] = '';
        allNomineeData[`nomineeAddressLine2`] = '';
        allNomineeData[`nomineeAddressCity`] = '';
        allNomineeData[`nomineeAddressState`] = '';
        allNomineeData[`nomineeAddressCountry`] = 'Singapore';
        allNomineeData.nominee = null;
      } else if (i === 2) {
        allNomineeData[`nomineeAddressNo2`] = '';
        allNomineeData[`nomineeAddressLine12`] = '';
        allNomineeData[`nomineeAddressLine22`] = '';
        allNomineeData[`nomineeAddressCity2`] = '';
        allNomineeData[`nomineeAddressState2`] = '';
        allNomineeData[`nomineeAddressCountry2`] = 'Singapore';
        allNomineeData[`nominee2Address`] = '';
        allNomineeData.nominee2 = null;
      }
    }

    // Maintain backward compatibility with first nominee fields
    const firstNominee = updatedNominees[0];
    allNomineeData.nomineeName = firstNominee?.fullName || '';
    allNomineeData.nomineeIDNo = firstNominee?.nric || '';
    allNomineeData.nomineeRelationship = firstNominee?.relationship || '';
    allNomineeData.nomineeAddress = firstNominee?.address || '';
    allNomineeData.nomineeBlockNo = firstNominee?.blockNo || '';
    allNomineeData.nomineeStreetName = firstNominee?.streetName || '';
    allNomineeData.nomineeUnitNo = firstNominee?.unitNo || '';
    allNomineeData.nomineePostalCode = firstNominee?.postalCode || '';
    allNomineeData.nomineeCountry = firstNominee?.country || 'Singapore';
    allNomineeData.nomineePhone = firstNominee?.contactNumber || '';
    allNomineeData.nomineeEmail = firstNominee?.email || '';
    allNomineeData.nomineeStatus = firstNominee?.status || 'Active';

    setFormData(allNomineeData);
  }, [setFormData]);

  const handleAddNominee = () => {
    const newNominee: Nominee = {
      id: Date.now(),
      fullName: '',
      nric: '',
      relationship: '',
      dateOfBirth: '',
      contactNumber: '',
      address: '',
      block: 'Block',
      blockNo: '',
      streetName: '',
      unitNo: '',
      postalCode: '',
      country: 'Singapore',
      officeTelNo: '',
      homeTelNo: '',
      email: '',
      status: 'Active'
    };
    const updatedNominees = [...nominees, newNominee];
    setNominees(updatedNominees);
    updateNicheFormData(updatedNominees);
  };

  // NEW: Function to map nominee data from API response to frontend format
  const mapNomineeDataFromAPI = (apiData: any) => {
    // Extract nominee data from API response
    const nominee1 = apiData.nominee;
    const nominee2 = apiData.nominee2;

    // Create nominees array from API data
    const nomineesArray: Nominee[] = [];

    // Process first nominee if exists
    if (nominee1) {
      // Determine if this is a block or number address based on addressNo field
      const isBlockAddress = nominee1.addressNo?.toLowerCase() === 'block';

      nomineesArray.push({
        id: 1,
        fullName: nominee1.name || '',
        nric: nominee1.idNo || '',
        relationship: nominee1.relationship || '',
        dateOfBirth: '', // Assuming date of birth isn't part of nominee data
        contactNumber: nominee1.mobileNo || nominee1.phone || '',
        address: nominee1.address || '',
        block: isBlockAddress ? 'Block' : 'No',
        blockNo: nominee1.addressLine1 || '',
        streetName: nominee1.addressLine2 || '',
        unitNo: nominee1.addressCity || '', // Unit number stored in addressCity field
        postalCode: nominee1.addressState || '',
        country: nominee1.addressCountry || 'Singapore',
        officeTelNo: nominee1.officeTelNo || '',
        homeTelNo: nominee1.homeTelNo || '',
        email: nominee1.email || '',
        status: 'Active' // Default status
      });
    }

    // Process second nominee if exists
    if (nominee2) {
      // Determine if this is a block or number address based on addressNo field
      const isBlockAddress = nominee2.addressNo?.toLowerCase() === 'block';

      nomineesArray.push({
        id: 2,
        fullName: nominee2.name || '',
        nric: nominee2.idNo || '',
        relationship: nominee2.relationship || '',
        dateOfBirth: '',
        contactNumber: nominee2.mobileNo || nominee2.phone || '',
        address: nominee2.address || '',
        block: isBlockAddress ? 'Block' : 'No',
        blockNo: nominee2.addressLine1 || '',
        streetName: nominee2.addressLine2 || '',
        unitNo: nominee2.addressCity || '',
        postalCode: nominee2.addressState || '',
        country: nominee2.addressCountry || 'Singapore',
        officeTelNo: nominee2.officeTelNo || '',
        homeTelNo: nominee2.homeTelNo || '',
        email: nominee2.email || '',
        status: 'Active' // Default status
      });
    }

    setNominees(nomineesArray);
    return nomineesArray;
  };

  const handleUpdateNominee = <K extends keyof Nominee>(id: number, field: K, value: Nominee[K]) => {
    const updated = nominees.map(n => n.id === id ? {
      ...n,
      [field]: value
    } : n);
    setNominees(updated);
    updateNicheFormData(updated);
  };
  const handleRemoveNominee = (id: number) => {
    const updated = nominees.filter(n => n.id !== id);
    setNominees(updated);
    updateNicheFormData(updated);
  };

  const handleSelectPerson = useCallback((person: PersonData, index: number) => {
    const isBlock = person.addressNo?.toLowerCase() === 'block' || person.addressNo?.toLowerCase() === 'blk';

    const updatedNominee: Partial<Nominee> = {
      fullName: person.name,
      nric: person.idNo || '',
      email: person.emailID || '',
      contactNumber: person.mobileNo || '',
      homeTelNo: person.homeTelNo || '',
      officeTelNo: person.officeTelNo || '',
      block: isBlock ? 'Block' : 'No',
      blockNo: person.addressLine1 || '',
      streetName: person.addressLine2 || '',
      unitNo: person.addressCity?.replace('#', '') || '',
      postalCode: person.addressState || '',
      country: person.addressCountry || 'Singapore',
      address: person.address || ''
    };

    const nomineeToUpdate = nominees[index];
    if (nomineeToUpdate) {
      const updatedNominees = nominees.map((n, i) => i === index ? { ...n, ...updatedNominee } : n);
      setNominees(updatedNominees);
      updateNicheFormData(updatedNominees);
    }

    setShowSearchResults(false);
    setActiveSearchIndex(null);
    clearResults();
  }, [nominees, clearResults]);

  return <div>
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 bg-gradient-to-br from-[#8b2828] to-[#7d1f1f] rounded-xl flex items-center justify-center">
        <UserCheckIcon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Nominee Details</h2>
        <p className="text-sm text-gray-600">
          Designate nominees for the niche allocation
        </p>
      </div>
    </div>

    {/* Validation Error Display */}
    {validationErrors.nominees && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <span className="text-red-700 font-medium">Validation Error</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{validationErrors.nominees}</p>
      </div>
    )}



    <div className="space-y-6">
      {nominees.map((nominee, index) => (
        <div key={nominee.id} className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase text-gray-500 tracking-wide">Nominee {index + 1}</p>
              <h3 className="text-lg font-semibold text-gray-900">
                {nominee.fullName || 'Unnamed Nominee'}
              </h3>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => handleRemoveNominee(nominee.id)}
                className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-500 transition-colors"
              >
                <Trash2Icon className="w-4 h-4" />
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nominee.fullName}
                  onChange={e => {
                    const val = e.target.value;
                    handleUpdateNominee(nominee.id, 'fullName', val);
                    if (val.length >= 3) {
                      searchPerson(val);
                      setActiveSearchIndex(index);
                      setShowSearchResults(true);
                    } else if (activeSearchIndex === index) {
                      setShowSearchResults(false);
                    }
                  }}
                  placeholder="Enter full name"
                  disabled={isReadOnly}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    }`}
                />
                {!isReadOnly && isSearching && activeSearchIndex === index && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>

              {showSearchResults && activeSearchIndex === index && searchResults.length > 0 && !isReadOnly && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 flex items-center justify-between">
                    <span>MATCHES FOUND</span>
                    <button onClick={() => setShowSearchResults(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {searchResults.map((person) => (
                    <div
                      key={person.personId}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors group"
                      onClick={() => handleSelectPerson(person, index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 group-hover:text-blue-700">{person.name}</span>
                          <span className="text-xs text-gray-500">{person.idNo} • {person.emailID}</span>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                NRIC/Passport No.
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nominee.nric}
                  onChange={e => {
                    const val = e.target.value;
                    handleUpdateNominee(nominee.id, 'nric', val);
                    if (val.length >= 3) {
                      searchPerson(val);
                      setActiveSearchIndex(index);
                      setShowSearchResults(true);
                    } else if (activeSearchIndex === index) {
                      setShowSearchResults(false);
                    }
                  }}
                  placeholder="Enter NRIC/Passport"
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  disabled={isReadOnly}
                />
                {!isReadOnly && !isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <SearchIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                {!isReadOnly && isSearching && activeSearchIndex === index && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div>
              <AddressInput

                initialValues={{
                  // For both nominees, try to use structured fields from nominee object first, then fall back to formData
                  block: nominee.block || (index === 0 ? (formData.nomineeBlock || 'Block') : 'Block'),
                  blockNo: nominee.blockNo || (index === 0 ? formData.nomineeBlockNo : formData.nomineeBlockNo2) || '',
                  streetName: nominee.streetName || (index === 0 ? formData.nomineeStreetName : formData.nomineeStreetName2) || '',
                  unitNo: nominee.unitNo || (index === 0 ? formData.nomineeUnitNo : formData.nomineeUnitNo2) || '',
                  postalCode: nominee.postalCode || (index === 0 ? formData.nomineePostalCode : formData.nomineePostalCode2) || '',
                  country: nominee.country || (index === 0 ? formData.nomineeCountry : formData.nomineeCountry2) || 'Singapore'
                }}
                initialAddressString={nominee.address || ''}
                onAddressChange={(addressData) => {
                  // Convert structured address to legacy single string
                  const legacyAddress = buildLegacyAddress(addressData);

                  // Update this nominee with all address-related fields at once
                  const updatedNominee = {
                    ...nominee,
                    address: legacyAddress,
                    block: addressData.block,
                    blockNo: addressData.blockNo,
                    streetName: addressData.streetName,
                    unitNo: addressData.unitNo,
                    postalCode: addressData.postalCode,
                    country: addressData.country
                  };

                  // Update all nominee fields for API compatibility
                  const updated = nominees.map(n => n.id === nominee.id ? updatedNominee : n);
                  setNominees(updated);
                  updateNicheFormData(updated);
                }}
                isReadOnly={isReadOnly}
                // Reuse nomineeAddress validation error if present
                error={validationErrors.nomineeAddress}
              />
            </div>

          </div>

          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Email ID
              </label>
              <input
                type="email"
                value={nominee.email || ''}
                onChange={e => handleUpdateNominee(nominee.id, 'email', e.target.value)}
                placeholder="Enter email address"
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  }`}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Mobile No.
              </label>
              <input
                type="tel"
                value={nominee.contactNumber}
                onChange={e => handleUpdateNominee(nominee.id, 'contactNumber', e.target.value)}
                placeholder="+65 1234 5678"
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  }`}
                disabled={isReadOnly}
              />
            </div>

          </div>

          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Home Telephone
              </label>
              <input
                type="tel"
                value={nominee.homeTelNo || ''}
                onChange={e => handleUpdateNominee(nominee.id, 'homeTelNo', e.target.value)}
                placeholder="Enter home telephone"
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  }`}
                disabled={isReadOnly}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Office Telephone
              </label>
              <input
                type="tel"
                value={nominee.officeTelNo || ''}
                onChange={e => handleUpdateNominee(nominee.id, 'officeTelNo', e.target.value)}
                placeholder="Enter office telephone"
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  }`}
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Relationship to applicant
              </label>
              <input
                type="text"
                value={nominee.relationship}
                onChange={e => handleUpdateNominee(nominee.id, 'relationship', e.target.value)}
                placeholder="e.g., Son, Daughter, Sibling"
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  }`}
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="mt-4">

            <FormSelect
              label="Status"
              value={nominee.status || 'Active'}
              onChange={value => handleUpdateNominee(
                nominee.id,
                'status',
                (value === 'Non-Active' ? 'Non-Active' : 'Active') as Nominee['status']
              )}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Non-Active', label: 'Non-Active' }
              ]}
              disabled={isReadOnly}
            />

          </div>
          <>{console.log("hjhjjhjjhjhjhj", formData)}</>
          {/* Second Nominee Agreement Button for second nominee */}
          {index === 1 && (
            <div className="mt-4 flex justify-end">
              <PrintSecondNomineeButton applicationNumber={formData.applicationNumber} />
            </div>
          )}
        </div>
      ))}

      {nominees.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handleAddNominee}
            disabled={isReadOnly}
            className={`flex items-center gap-2 px-4 py-2 bg-[#8b5a2b] text-white rounded-md hover:bg-[#6d4420] transition-colors ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            <PlusIcon className="w-4 h-4" />
            Add Nominee
          </button>

          {/* Update Application Button */}
          <UpdateApplicationButton
            formData={formData}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* Empty State */}
      {nominees.length === 0 && (
        <div className="text-center py-12">
          <UserCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No nominees</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a nominee.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={handleAddNominee}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#8b5a2b] hover:bg-[#6d4420] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5a2b]"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Nominee
            </button>

            {/* Update Application Button for empty state */}
            <UpdateApplicationButton
              formData={formData}
              isReadOnly={isReadOnly}
              variant="outline"
            />
          </div>
        </div>
      )}
    </div>
  </div>;
}