import React, { useEffect, useCallback, useRef } from 'react';
import { UserIcon, MailIcon, PhoneIcon, MapPinIcon, LoaderIcon } from 'lucide-react';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { 
  lookupAddressByPostalCode, 
  lookupAddressByBlockAndStreet,
  setBlock,
  setBlockNo,
  setStreetName,
  setUnitNo,
  setPostalCode,
  setCountry,
  clearLookupError
} from '../store/addressSlice';
import { Input } from '../components/common/Input';

interface ContactPersonDetailsProps {
  formData: any;
  setFormData: (data: any) => void;
  isReadOnly?: boolean;
}

export function ContactPersonDetails({
  formData,
  setFormData,
  isReadOnly = false
}: ContactPersonDetailsProps) {
  const dispatch = useDispatch();
  // Get validation errors from Redux store
  const validationErrors = useSelector((state: RootState) => state.application.validationErrors);
  // Get address state from Redux
  const addressState = useSelector((state: RootState) => state.address);
  
  // Debounce refs for postal code and block/street lookups
  const postalCodeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const blockStreetDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize address fields from formData if they exist
  useEffect(() => {
    if (formData.applicantBlock || formData.applicantBlockNo || formData.applicantStreetName || 
        formData.applicantUnitNo || formData.applicantPostalCode || formData.applicantCountry) {
      // Address fields already exist in formData, sync with Redux
      dispatch(setBlock(formData.applicantBlock || ''));
      dispatch(setBlockNo(formData.applicantBlockNo || ''));
      dispatch(setStreetName(formData.applicantStreetName || ''));
      dispatch(setUnitNo(formData.applicantUnitNo || ''));
      dispatch(setPostalCode(formData.applicantPostalCode || ''));
      dispatch(setCountry(formData.applicantCountry || 'Singapore'));
    } else if (formData.applicantAddress || formData.contactAddress) {
      // Legacy address format - try to parse it
      const address = formData.applicantAddress || formData.contactAddress || '';
      // Simple parsing (can be improved)
      const postalMatch = address.match(/\b\d{6}\b/);
      if (postalMatch) {
        dispatch(setPostalCode(postalMatch[0]));
      }
    }
  }, []); // Only run once on mount

  // Sync Redux address state to formData
  useEffect(() => {
    setFormData({
      ...formData,
      applicantBlock: addressState.block,
      applicantBlockNo: addressState.blockNo,
      applicantStreetName: addressState.streetName,
      applicantUnitNo: addressState.unitNo,
      applicantPostalCode: addressState.postalCode,
      applicantCountry: addressState.country,
      // Also maintain legacy address field for backward compatibility
      applicantAddress: addressState.blockNo && addressState.streetName 
        ? `${addressState.block ? addressState.block + ' ' : ''}${addressState.blockNo} ${addressState.streetName}${addressState.unitNo ? ' #' + addressState.unitNo : ''}${addressState.postalCode ? ', Singapore ' + addressState.postalCode : ''}`
        : formData.applicantAddress || formData.contactAddress || '',
      contactAddress: addressState.blockNo && addressState.streetName 
        ? `${addressState.block ? addressState.block + ' ' : ''}${addressState.blockNo} ${addressState.streetName}${addressState.unitNo ? ' #' + addressState.unitNo : ''}${addressState.postalCode ? ', Singapore ' + addressState.postalCode : ''}`
        : formData.applicantAddress || formData.contactAddress || ''
    });
  }, [addressState.block, addressState.blockNo, addressState.streetName, addressState.unitNo, addressState.postalCode, addressState.country]);

  useEffect(() => {
    if (!formData.contactStatus) {
      setFormData({
        ...formData,
        contactStatus: 'Active'
      });
    }
  }, [formData, setFormData]);

  // Handle postal code change with auto-fill
  const handlePostalCodeChange = useCallback((value: string) => {
    dispatch(setPostalCode(value));
    
    // Clear existing debounce
    if (postalCodeDebounceRef.current) {
      clearTimeout(postalCodeDebounceRef.current);
    }
    
    // Debounce the lookup
    postalCodeDebounceRef.current = setTimeout(() => {
      if (value && value.replace(/\s+/g, '').trim().length >= 4) {
        dispatch(lookupAddressByPostalCode(value));
      }
    }, 800);
  }, [dispatch]);

  // Handle block number and street name change with auto-fill
  const handleBlockStreetChange = useCallback(() => {
    // Clear existing debounce
    if (blockStreetDebounceRef.current) {
      clearTimeout(blockStreetDebounceRef.current);
    }
    
    // Debounce the lookup
    blockStreetDebounceRef.current = setTimeout(() => {
      if (addressState.blockNo && addressState.streetName) {
        dispatch(lookupAddressByBlockAndStreet({
          blockNo: addressState.blockNo,
          streetName: addressState.streetName
        }));
      }
    }, 1000);
  }, [dispatch, addressState.blockNo, addressState.streetName]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (postalCodeDebounceRef.current) {
        clearTimeout(postalCodeDebounceRef.current);
      }
      if (blockStreetDebounceRef.current) {
        clearTimeout(blockStreetDebounceRef.current);
      }
    };
  }, []);

  return <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-[#8b5a2b] to-[#6d4420] rounded-xl flex items-center justify-center">
          <UserIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Contact Person (Applicant) Details
          </h2>
          <p className="text-sm text-gray-600">
            Primary contact information for this application
          </p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormInput 
              label="Name" 
              value={formData.applicantName || formData.contactName || ''} 
              onChange={value => setFormData({
                ...formData,
                applicantName: value,
                contactName: value
              })} 
              placeholder="Enter full name" 
              required 
              icon={<UserIcon className="w-4 h-4" />}
              error={validationErrors.applicantName || validationErrors.contactName}
              disabled={isReadOnly}
            />
            <FormInput 
              label="NRIC/Passport No." 
              value={formData.applicantIDNo || formData.contactNric || ''} 
              onChange={value => setFormData({
                ...formData,
                applicantIDNo: value,
                contactNric: value
              })} 
              placeholder="Enter NRIC/Passport" 
              error={validationErrors.applicantIDNo || validationErrors.contactNric}
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <FormInput 
              label="Email Address" 
              value={formData.applicantEmail || formData.contactEmail || ''} 
              onChange={value => setFormData({
                ...formData,
                applicantEmail: value,
                contactEmail: value
              })} 
              placeholder="email@example.com" 
              type="email" 
              required 
              icon={<MailIcon className="w-4 h-4" />}
              error={validationErrors.applicantEmail || validationErrors.contactEmail}
              disabled={isReadOnly}
            />
            <FormInput 
              label="Mobile No." 
              value={formData.applicantPhone || formData.contactPhone || ''} 
              onChange={value => setFormData({
                ...formData,
                applicantPhone: value,
                contactPhone: value
              })} 
              placeholder="+65 1234 5678" 
              type="tel" 
              required 
              icon={<PhoneIcon className="w-4 h-4" />}
              error={validationErrors.applicantPhone || validationErrors.contactPhone}
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <FormInput 
              label="Home Telephone" 
              value={formData.applicantHomeTel || formData.contactHomeTel || ''} 
              onChange={value => setFormData({
                ...formData,
                applicantHomeTel: value,
                contactHomeTel: value
              })} 
              placeholder="Enter home telephone" 
              type="tel"
              error={validationErrors.applicantHomeTel || validationErrors.contactHomeTel}
              disabled={isReadOnly}
            />
            <FormInput 
              label="Office Telephone" 
              value={formData.applicantOfficeTel || formData.contactOfficeTel || ''} 
              onChange={value => setFormData({
                ...formData,
                applicantOfficeTel: value,
                contactOfficeTel: value
              })} 
              placeholder="Enter office telephone" 
              type="tel"
              error={validationErrors.applicantOfficeTel || validationErrors.contactOfficeTel}
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <FormInput 
              label="Religion" 
              value={formData.applicantReligion || formData.contactReligion || ''} 
              onChange={value => setFormData({
                ...formData,
                applicantReligion: value,
                contactReligion: value
              })} 
              placeholder="Enter religion"
              error={validationErrors.applicantReligion || validationErrors.contactReligion}
              disabled={isReadOnly}
            />
            <FormSelect
              label="Status"
              value={formData.contactStatus || 'Active'}
              onChange={value => setFormData({
                ...formData,
                contactStatus: value || 'Active'
              })}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Non-Active', label: 'Non-Active' }
              ]}
              placeholder="Select status"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-gray-400" />
              Address
            </label>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div>
                <Input
                  label="Block"
                  type="text"
                  value={addressState.block}
                  onChange={(e) => dispatch(setBlock(e.target.value))}
                  placeholder="A, B, C"
                  disabled={isReadOnly}
                  maxLength={5}
                  className="text-sm"
                />
              </div>
              <div>
                <Input
                  label="Block No"
                  type="text"
                  value={addressState.blockNo}
                  onChange={(e) => {
                    dispatch(setBlockNo(e.target.value));
                    handleBlockStreetChange();
                  }}
                  placeholder="Block No"
                  disabled={isReadOnly}
                  className="text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Street Name"
                  type="text"
                  value={addressState.streetName}
                  onChange={(e) => {
                    dispatch(setStreetName(e.target.value));
                    handleBlockStreetChange();
                  }}
                  placeholder="Street Name"
                  disabled={isReadOnly}
                  className="text-sm"
                />
              </div>
              <div>
                <Input
                  label="Unit No"
                  type="text"
                  value={addressState.unitNo}
                  onChange={(e) => dispatch(setUnitNo(e.target.value))}
                  placeholder="Unit No"
                  disabled={isReadOnly}
                  className="text-sm"
                />
              </div>
              <div>
                <Input
                  label="Postal Code"
                  type="text"
                  value={addressState.postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  placeholder="Postal Code"
                  disabled={isReadOnly}
                  maxLength={6}
                  className="text-sm"
                />
                {addressState.isLookingUp && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                    <LoaderIcon className="w-3 h-3 animate-spin" />
                    <span>Looking up...</span>
                  </div>
                )}
                {addressState.lookupError && (
                  <div className="text-xs text-amber-600 mt-1">
                    {addressState.lookupError}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full md:w-1/3">
                <FormSelect
                  label="Country"
                  value={addressState.country || 'Singapore'}
                  onChange={(value) => dispatch(setCountry(value || 'Singapore'))}
                  options={[
                    { value: 'Singapore', label: 'Singapore' },
                    { value: 'Malaysia', label: 'Malaysia' },
                    { value: 'Others', label: 'Others' }
                  ]}
                  placeholder="Select country"
                  disabled={isReadOnly}
                />
              </div>
            </div>
            {(validationErrors.applicantAddress || validationErrors.contactAddress) && (
              <div className="text-sm text-red-600 flex items-center gap-1 mt-2">
                <span className="text-red-500">⚠</span>
                {validationErrors.applicantAddress || validationErrors.contactAddress}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Remarks
            </label>
            <textarea value={formData.contactRemarks || ''} onChange={e => setFormData({
              ...formData,
              contactRemarks: e.target.value
            })} placeholder="Enter any additional remarks" rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent resize-none" />
          </div>
        </div>
        
      </div>
    </div>;
}