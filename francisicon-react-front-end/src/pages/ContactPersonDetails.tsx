import { useEffect, useCallback, useRef } from 'react';
import { UserIcon, MailIcon, PhoneIcon } from 'lucide-react';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { AddressInput } from '../components/AddressInput';

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
  
  const isInitializedRef = useRef(false);

  // Handle address change from AddressInput component - memoized to prevent infinite loops
  const handleAddressChange = useCallback((addressData: {
    block?: string;
    blockNo?: string;
    streetName?: string;
    unitNo?: string;
    postalCode?: string;
    country?: string;
  }) => {
    // Build legacy address string for backward compatibility
    const legacyAddress = addressData.blockNo && addressData.streetName 
      ? `${addressData.block ? addressData.block + ' ' : ''}${addressData.blockNo} ${addressData.streetName}${addressData.unitNo ? ' #' + addressData.unitNo : ''}${addressData.postalCode ? ', ' + (addressData.country || 'Singapore') + ' ' + addressData.postalCode : ''}`
      : formData.applicantAddress || formData.contactAddress || '';

    // Update formData with address fields - must pass plain object, not function
    setFormData({
      ...formData,
      applicantBlock: addressData.block || '',
      applicantBlockNo: addressData.blockNo || '',
      applicantStreetName: addressData.streetName || '',
      applicantUnitNo: addressData.unitNo || '',
      applicantPostalCode: addressData.postalCode || '',
      applicantCountry: addressData.country || 'Singapore',
      // Also maintain legacy address field for backward compatibility
      applicantAddress: legacyAddress,
      contactAddress: legacyAddress
    });
    console.log("formData", formData)
  }, [formData, setFormData]);

  useEffect(() => {
    if (!formData.contactStatus) {
      setFormData({
        ...formData,
        contactStatus: 'Active'
      });
    }
  }, [formData, setFormData]);

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
          
          {/* Address Component */}
      
          <AddressInput
            fieldPrefix="applicant"
            onAddressChange={handleAddressChange}
            initialValues={{
              block: formData.applicantBlock,
              blockNo: formData.applicantBlockNo,
              streetName: formData.applicantStreetName,
              unitNo: formData.applicantUnitNo,
              postalCode: formData.applicantPostalCode,
              country: formData.applicantCountry
            }}
            initialAddressString={formData.applicantAddress || formData.contactAddress || ''}
            isReadOnly={isReadOnly}
            error={validationErrors.applicantAddress || validationErrors.contactAddress}
          />
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
            <FormSelect
              label="Religion"
              value={
                formData.applicantReligion ||
                (formData.applicantIsCatholic === true
                  ? 'Catholic'
                  : formData.applicantIsCatholic === false
                    ? 'Non Catholic'
                    : '')
              }
              onChange={value => {
                const isCatholic = value === 'Catholic';
                setFormData({
                  ...formData,
                  applicantReligion: value,
                  contactReligion: value,
                  applicantIsCatholic: value ? isCatholic : undefined
                });
              }}
              options={[
                { value: 'Catholic', label: 'Catholic' },
                { value: 'Non Catholic', label: 'Non Catholic' }
              ]}
              placeholder="Select religion"
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
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Remarks
            </label>
            <textarea value={formData.contactRemarks || ''} onChange={e => setFormData({
              ...formData,
              contactRemarks: e.target.value
            })} placeholder="Enter any additional remarks" rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent resize-none" />
          </div>
        </div>
        
     
    </div>;
}