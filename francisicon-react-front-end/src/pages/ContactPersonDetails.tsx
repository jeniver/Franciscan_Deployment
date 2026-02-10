import { useEffect, useCallback, useRef } from 'react';
import { UserIcon, MailIcon, PhoneIcon } from 'lucide-react';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { AddressInput } from '../components/AddressInput';
import { useBatchedUpdates } from '../hooks/useBatchedUpdates';
import { UpdateApplicationButton } from '../components/UpdateApplicationButton';

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
  // Get validation errors from Redux store
  const validationErrors = useSelector((state: RootState) => state.application.validationErrors);
  
  const { addMultipleChanges, isDirty } = useBatchedUpdates({
    applicationCode: formData.applicationNumber || formData.applicationCode || formData.code || formData.refDocNumber,
    isEnabled: true
  });
  
  // const isInitializedRef = useRef(false);

  // Handle address change from AddressInput component - memoized to prevent infinite loops
  const handleAddressChange = useCallback((addressData: {
    block?: string;
    blockNo?: string;
    streetName?: string;
    unitNo?: string;
    postalCode?: string;
    country?: string;
    // Backend-compatible fields (mapped automatically)
    addressNo?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressState?: string;
    addressCountry?: string;
  }) => {
    console.log('ContactPersonDetails: handleAddressChange called with:', addressData);
    
    // NOTE: Avoid parsing/converting address strings here. We store structured fields directly.
    // (Old legacy string builder removed/commented out to prevent incorrect formatting like "##14-07".)

    // Use the complete address data that includes both component and backend fields
    const updatedFormData = {
      ...formData,
      // UI fields used by AddressInput
      applicantBlock: addressData.block || '',
      applicantBlockNo: addressData.blockNo || '',
      applicantStreetName: addressData.streetName || '',
      applicantUnitNo: addressData.unitNo || '', // store raw; keep user input (may include '#')
      applicantPostalCode: addressData.postalCode || '',
      applicantCountry: addressData.country || 'Singapore',

      // API-facing structured applicant fields (maps exactly to applicant.addressNo/Line1/Line2/City/State/Country)
      applicantAddressNo: addressData.addressNo || '',
      applicantAddressLine1: addressData.addressLine1 || '',
      applicantAddressLine2: addressData.addressLine2 || '',
      applicantAddressCity: addressData.addressCity || '',
      applicantAddressState: addressData.addressState || '',
      applicantAddressCountry: addressData.addressCountry || 'Singapore',

      // Also maintain legacy address field for backward compatibility
      applicantAddress: formData.applicantAddress || formData.contactAddress || ''
    };
    
    console.log('ContactPersonDetails: Updating formData with:', updatedFormData);
    setFormData(updatedFormData);
    
    // Add changes to batch instead of immediate update
    addMultipleChanges({
      applicantBlock: addressData.block || '',
      applicantBlockNo: addressData.blockNo || '',
      applicantStreetName: addressData.streetName || '',
      applicantUnitNo: addressData.unitNo || '',
      applicantPostalCode: addressData.postalCode || '',
      applicantCountry: addressData.country || 'Singapore',
      applicantAddressNo: addressData.addressNo || '',
      applicantAddressLine1: addressData.addressLine1 || '',
      applicantAddressLine2: addressData.addressLine2 || '',
      applicantAddressCity: addressData.addressCity || '',
      applicantAddressState: addressData.addressState || '',
      applicantAddressCountry: addressData.addressCountry || 'Singapore',
      applicantAddress: formData.applicantAddress || formData.contactAddress || ''
    });
    
    console.log("Address data updated in formData:", {
      uiFields: {
        applicantBlock: addressData.block,
        applicantBlockNo: addressData.blockNo,
        applicantStreetName: addressData.streetName,
        applicantUnitNo: addressData.unitNo,
        applicantPostalCode: addressData.postalCode,
        applicantCountry: addressData.country,
      },
      backendFields: {
        applicantAddressNo: addressData.addressNo,
        applicantAddressLine1: addressData.addressLine1,
        applicantAddressLine2: addressData.addressLine2,
        applicantAddressCity: addressData.addressCity,
        applicantAddressState: addressData.addressState,
        applicantAddressCountry: addressData.addressCountry,
      },
      legacyAddressField: formData.applicantAddress || formData.contactAddress || ''
    });
  }, [formData, setFormData, addMultipleChanges]);

  useEffect(() => {
    if (!formData.contactStatus) {
      setFormData({
        ...formData,
        contactStatus: 'Active'
      });
    }
  }, [formData, setFormData]);

  // ✅ FIX: Default Contact Person religion to Catholic if not set
  useEffect(() => {
    if (!formData.applicantReligion && formData.applicantIsCatholic === undefined) {
      setFormData({
        ...formData,
        applicantReligion: 'Catholic',
        contactReligion: 'Catholic',
        applicantIsCatholic: true
      });
    }
  }, [formData, setFormData]);

  // Sync structured applicant address fields for API (addressNo/Line1/Line2/City/State/Country)
  // Some mappers only hydrate UI fields (applicantBlock/applicantBlockNo/applicantStreetName/...)
  // so we derive the structured fields once to ensure downstream templates/API payloads have them.
  const lastAddressSyncKeyRef = useRef<string>('');
  useEffect(() => {
    const key = JSON.stringify({
      applicantBlock: formData.applicantBlock ?? '',
      applicantBlockNo: formData.applicantBlockNo ?? '',
      applicantStreetName: formData.applicantStreetName ?? '',
      applicantUnitNo: formData.applicantUnitNo ?? '',
      applicantPostalCode: formData.applicantPostalCode ?? '',
      applicantCountry: formData.applicantCountry ?? '',
      applicantAddressNo: formData.applicantAddressNo ?? '',
      applicantAddressLine1: formData.applicantAddressLine1 ?? '',
      applicantAddressLine2: formData.applicantAddressLine2 ?? '',
      applicantAddressCity: formData.applicantAddressCity ?? '',
      applicantAddressState: formData.applicantAddressState ?? '',
      applicantAddressCountry: formData.applicantAddressCountry ?? '',
    });

    if (key === lastAddressSyncKeyRef.current) return;
    lastAddressSyncKeyRef.current = key;

    console.log('Address sync triggered with formData:', {
      hasStructuredData: !!(formData.applicantAddressNo && formData.applicantAddressNo.trim()) ||
                        !!(formData.applicantAddressLine1 && formData.applicantAddressLine1.trim()) ||
                        !!(formData.applicantAddressLine2 && formData.applicantAddressLine2.trim()) ||
                        !!(formData.applicantAddressCity && formData.applicantAddressCity.trim()) ||
                        !!(formData.applicantAddressState && formData.applicantAddressState.trim()) ||
                        !!(formData.applicantAddressCountry && formData.applicantAddressCountry.trim()),
      hasUiAddress: !!(formData.applicantBlockNo || formData.applicantStreetName || formData.applicantUnitNo || formData.applicantPostalCode),
      structuredFields: {
        applicantAddressNo: formData.applicantAddressNo,
        applicantAddressLine1: formData.applicantAddressLine1,
        applicantAddressLine2: formData.applicantAddressLine2,
        applicantAddressCity: formData.applicantAddressCity,
        applicantAddressState: formData.applicantAddressState,
        applicantAddressCountry: formData.applicantAddressCountry,
      },
      uiFields: {
        applicantBlock: formData.applicantBlock,
        applicantBlockNo: formData.applicantBlockNo,
        applicantStreetName: formData.applicantStreetName,
        applicantUnitNo: formData.applicantUnitNo,
        applicantPostalCode: formData.applicantPostalCode,
        applicantCountry: formData.applicantCountry,
      }
    });

    // Check if we have structured data that should populate UI fields
    const hasStructuredData =
      !!(formData.applicantAddressNo && formData.applicantAddressNo.trim()) ||
      !!(formData.applicantAddressLine1 && formData.applicantAddressLine1.trim()) ||
      !!(formData.applicantAddressLine2 && formData.applicantAddressLine2.trim()) ||
      !!(formData.applicantAddressCity && formData.applicantAddressCity.trim()) ||
      !!(formData.applicantAddressState && formData.applicantAddressState.trim()) ||
      !!(formData.applicantAddressCountry && formData.applicantAddressCountry.trim());

    // Check if we have UI data that should populate structured fields
    const hasUiAddress =
      !!(formData.applicantBlockNo || formData.applicantStreetName || formData.applicantUnitNo || formData.applicantPostalCode);

    // If we have structured data but no UI data, populate UI fields
    if (hasStructuredData && !hasUiAddress) {
      // Convert structured fields to UI fields
      const isBlock = formData.applicantAddressNo === 'Blk';
      const unitNoRaw = formData.applicantAddressCity?.replace('#', '') || '';
      const country = formData.applicantAddressCountry || 'Singapore';
      const postalCode = formData.applicantAddressState || '';

      setFormData({
        ...formData,
        // Populate UI fields from structured data
        applicantBlock: isBlock ? 'Block' : '',
        applicantBlockNo: formData.applicantAddressLine1 || '',
        applicantStreetName: formData.applicantAddressLine2 || '',
        applicantUnitNo: unitNoRaw,
        applicantPostalCode: postalCode,
        applicantCountry: country,
      });
      return;
    }

    // If we have UI data but no meaningful structured data, populate structured fields
    if (hasUiAddress) {
      // Check if structured fields have meaningful values (not just empty strings)
      const hasMeaningfulStructuredData =
        !!(formData.applicantAddressNo && formData.applicantAddressNo.trim()) ||
        !!(formData.applicantAddressLine1 && formData.applicantAddressLine1.trim()) ||
        !!(formData.applicantAddressLine2 && formData.applicantAddressLine2.trim()) ||
        !!(formData.applicantAddressCity && formData.applicantAddressCity.trim()) ||
        !!(formData.applicantAddressState && formData.applicantAddressState.trim()) ||
        !!(formData.applicantAddressCountry && formData.applicantAddressCountry.trim());

      // Only skip if we have meaningful structured data
      // Empty strings should be overwritten with proper values
      if (hasMeaningfulStructuredData) return;

      const rawBlock = String(formData.applicantBlock || '').trim();
      const isBlock = rawBlock.toLowerCase() === 'block' || rawBlock.toLowerCase() === 'blk';
      const applicantAddressNo = isBlock ? 'Blk' : 'No';

      const unitNoRaw = String(formData.applicantUnitNo || '').trim();
      const unitNoNormalized = unitNoRaw ? (unitNoRaw.startsWith('#') ? unitNoRaw : `#${unitNoRaw}`) : '';
      const country = String(formData.applicantCountry || 'Singapore').trim() || 'Singapore';
      const postalCode = String(formData.applicantPostalCode || '').trim();

      // Create properly formatted address string for legacy purposes
      const addressParts = [];
      if (isBlock) addressParts.push('Blk');
      if (formData.applicantBlockNo) addressParts.push(String(formData.applicantBlockNo));
      if (formData.applicantStreetName) addressParts.push(String(formData.applicantStreetName));
      if (unitNoNormalized) addressParts.push(unitNoNormalized);
      if (country && postalCode) {
        addressParts.push(`${country} ${postalCode}`);
      } else {
        if (country) addressParts.push(country);
        if (postalCode) addressParts.push(postalCode);
      }
      
      const formattedAddress = addressParts.filter(Boolean).join(' ');

      setFormData({
        ...formData,
        // Normalize UI dropdown value if older mapper stored "Blk"
        applicantBlock: isBlock ? 'Block' : '',

        // API-facing structured fields
        applicantAddressNo,
        applicantAddressLine1: String(formData.applicantBlockNo || '').trim(),
        applicantAddressLine2: String(formData.applicantStreetName || '').trim(),
        applicantAddressCity: unitNoNormalized,
        applicantAddressState: postalCode,
        applicantAddressCountry: country,
        
        // Update the legacy address field with properly formatted string
        applicantAddress: formattedAddress,
      });
    }
  }, [formData, setFormData]);

  // Ensure Religion dropdown reflects applicantIsCatholic when loading existing data
  useEffect(() => {
    if (typeof formData.applicantIsCatholic !== 'boolean') return;
    if (formData.applicantReligion) return;

    const religion = formData.applicantIsCatholic ? 'Catholic' : 'Non Catholic';
    setFormData({
      ...formData,
      applicantReligion: religion,
      contactReligion: religion,
    });
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
              onChange={async (value) => {
                const updatedFormData = {
                  ...formData,
                  applicantName: value,
                  contactName: value
                };
                
                setFormData(updatedFormData);
                
                // Add change to batch
                addMultipleChanges({
                  applicantName: value,
                  contactName: value
                });
              }} 
              placeholder="Enter full name" 
              icon={<UserIcon className="w-4 h-4" />}
              error={validationErrors.applicantName || validationErrors.contactName}
              disabled={isReadOnly}
            />
            <FormInput 
              label="NRIC/Passport No." 
              value={formData.applicantIDNo || formData.contactNric || ''} 
              onChange={async (value) => {
                const updatedFormData = {
                  ...formData,
                  applicantIDNo: value,
                  contactNric: value
                };
                
                setFormData(updatedFormData);
                
                // Add change to batch
                addMultipleChanges({
                  applicantIDNo: value,
                  contactNric: value
                });
              }} 
              placeholder="Enter NRIC/Passport" 
              error={validationErrors.applicantIDNo || validationErrors.contactNric}
              disabled={isReadOnly}
            />
            
          </div>
           
          {/* Address Component */}
       
          <AddressInput
            fieldPrefix="applicant"
            onAddressChange={handleAddressChange}
            autoSync={false}
            initialValues={{
              // Provide backend-style fields for proper conversion
              addressNo: formData.applicantAddressNo || '',
              addressLine1: formData.applicantAddressLine1 || '',
              addressLine2: formData.applicantAddressLine2 || '',
              addressCity: formData.applicantAddressCity || '',
              addressState: formData.applicantAddressState || '',
              addressCountry: formData.applicantAddressCountry || 'Singapore'
            }}
            initialAddressString={formData.applicantAddress || formData.contactAddress || ''}
            isReadOnly={isReadOnly}
            error={validationErrors.applicantAddress || validationErrors.contactAddress}
          />
          <div className="grid grid-cols-2 gap-6">
            <FormInput 
              label="Email Address" 
              value={formData.applicantEmail || formData.contactEmail || ''} 
              onChange={async (value) => {
                const updatedFormData = {
                  ...formData,
                  applicantEmail: value,
                  contactEmail: value
                };
                
                setFormData(updatedFormData);
                
                // Add change to batch
                addMultipleChanges({
                  applicantEmail: value,
                  contactEmail: value
                });
              }} 
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
              onChange={async (value) => {
                const updatedFormData = {
                  ...formData,
                  applicantPhone: value,
                  contactPhone: value
                };
                
                setFormData(updatedFormData);
                
                // Add change to batch
                addMultipleChanges({
                  applicantPhone: value,
                  contactPhone: value
                });
              }} 
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
              onChange={async (value) => {
                const updatedFormData = {
                  ...formData,
                  applicantHomeTel: value,
                  contactHomeTel: value
                };
                
                setFormData(updatedFormData);
                
                // Add change to batch
                addMultipleChanges({
                  applicantHomeTel: value,
                  contactHomeTel: value
                });
              }} 
              placeholder="Enter home telephone" 
              type="tel"
              error={validationErrors.applicantHomeTel || validationErrors.contactHomeTel}
              disabled={isReadOnly}
            />
            <FormInput 
              label="Office Telephone" 
              value={formData.applicantOfficeTel || formData.contactOfficeTel || ''} 
              onChange={async (value) => {
                const updatedFormData = {
                  ...formData,
                  applicantOfficeTel: value,
                  contactOfficeTel: value
                };
                
                setFormData(updatedFormData);
                
                // Add change to batch
                addMultipleChanges({
                  applicantOfficeTel: value,
                  contactOfficeTel: value
                });
              }} 
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
                    : 'Catholic') // ✅ FIX: Default to Catholic
              }
              onChange={async (value) => {
                const isCatholic = value === 'Catholic';
                const updatedFormData = {
                  ...formData,
                  applicantReligion: value,
                  contactReligion: value,
                  applicantIsCatholic: value ? isCatholic : undefined
                };
                
                setFormData(updatedFormData);
                
                // Add change to batch
                addMultipleChanges({
                  applicantReligion: value,
                  contactReligion: value,
                  applicantIsCatholic: value ? isCatholic : undefined
                });
              }}
              options={[
                { value: 'Catholic', label: 'Catholic' },
                { value: 'Non Catholic', label: 'Non Catholic' }
              ]}
              disabled={isReadOnly}
            />
            <FormSelect
              label="Status"
              value={formData.contactStatus || 'Active'}
              onChange={async (value) => {
                const updatedFormData = {
                  ...formData,
                  contactStatus: value || 'Active'
                };
                
                setFormData(updatedFormData);
                
                // Add change to batch
                addMultipleChanges({
                  contactStatus: value || 'Active'
                });
              }}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Non-Active', label: 'Non-Active' }
              ]}
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
        
        {/* Update Application Button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <UpdateApplicationButton 
            formData={formData} 
            isReadOnly={isReadOnly}
            className="w-full sm:w-auto"
          />
        </div>
      </div>;
}