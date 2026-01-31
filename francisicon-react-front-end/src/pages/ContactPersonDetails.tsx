import { useEffect, useCallback, useRef } from 'react';
import { UserIcon, MailIcon, PhoneIcon } from 'lucide-react';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { useSelector } from 'react-redux';
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
  // Get validation errors from Redux store
  const validationErrors = useSelector((state: RootState) => state.application.validationErrors);
  
  // const isInitializedRef = useRef(false);

  // Handle address change from AddressInput component - memoized to prevent infinite loops
  const handleAddressChange = useCallback((addressData: {
    block?: string;
    blockNo?: string;
    streetName?: string;
    unitNo?: string;
    postalCode?: string;
    country?: string;
  }) => {
    // NOTE: Avoid parsing/converting address strings here. We store structured fields directly.
    // (Old legacy string builder removed/commented out to prevent incorrect formatting like "##14-07".)

    const rawBlock = (addressData.block || '').trim();
    const isBlock = rawBlock.toLowerCase() === 'block' || rawBlock.toLowerCase() === 'blk';
    const addressNo = isBlock ? 'Blk' : 'No';

    const unitNoRaw = (addressData.unitNo || '').trim();
    const unitNoNormalized = unitNoRaw ? (unitNoRaw.startsWith('#') ? unitNoRaw : `#${unitNoRaw}`) : '';
    const country = (addressData.country || 'Singapore').trim() || 'Singapore';
    const postalCode = (addressData.postalCode || '').trim();

    // Build a consistent legacy address string for display/backward compatibility only
    // Format: "Blk 1B Pine Grove #14-07 Singapore 591001"
    const legacyAddress =
      addressData.blockNo && addressData.streetName
        ? `${addressNo !== 'No' ? `${addressNo} ` : ''}${(addressData.blockNo || '').trim()} ${(addressData.streetName || '').trim()}${unitNoNormalized ? ` ${unitNoNormalized}` : ''}${postalCode ? ` ${country} ${postalCode}` : ''}`.trim()
        : (formData.applicantAddress || formData.contactAddress || '');

    // Update formData with address fields - must pass plain object, not function
    setFormData({
      ...formData,
      // UI fields used by AddressInput
      applicantBlock: isBlock ? 'Block' : '',
      applicantBlockNo: addressData.blockNo || '',
      applicantStreetName: addressData.streetName || '',
      applicantUnitNo: unitNoRaw, // store raw; keep user input (may include '#')
      applicantPostalCode: postalCode,
      applicantCountry: country,

      // API-facing structured applicant fields (maps exactly to applicant.addressNo/Line1/Line2/City/State/Country)
      applicantAddressNo: addressNo,
      applicantAddressLine1: (addressData.blockNo || '').trim(),
      applicantAddressLine2: (addressData.streetName || '').trim(),
      applicantAddressCity: unitNoNormalized, // keep with '#', matching backend sample
      applicantAddressState: postalCode,
      applicantAddressCountry: country,

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

    const hasAnyUiAddress =
      !!(formData.applicantBlockNo || formData.applicantStreetName || formData.applicantUnitNo || formData.applicantPostalCode);

    if (!hasAnyUiAddress) return;

    const alreadyHasStructured =
      !!(formData.applicantAddressNo ||
        formData.applicantAddressLine1 ||
        formData.applicantAddressLine2 ||
        formData.applicantAddressCity ||
        formData.applicantAddressState ||
        formData.applicantAddressCountry);

    // If structured fields already exist, don't overwrite (user may be editing in other steps).
    if (alreadyHasStructured) return;

    const rawBlock = String(formData.applicantBlock || '').trim();
    const isBlock = rawBlock.toLowerCase() === 'block' || rawBlock.toLowerCase() === 'blk';
    const applicantAddressNo = isBlock ? 'Blk' : 'No';

    const unitNoRaw = String(formData.applicantUnitNo || '').trim();
    const unitNoNormalized = unitNoRaw ? (unitNoRaw.startsWith('#') ? unitNoRaw : `#${unitNoRaw}`) : '';
    const country = String(formData.applicantCountry || 'Singapore').trim() || 'Singapore';
    const postalCode = String(formData.applicantPostalCode || '').trim();

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
    });
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
              // Prefer structured applicant fields if present; otherwise fallback to UI fields
              block:
                (formData.applicantAddressNo || formData.applicantBlock) &&
                String(formData.applicantAddressNo || formData.applicantBlock).toLowerCase() !== 'no'
                  ? 'Block'
                  : '',
              blockNo: formData.applicantAddressLine1 ?? formData.applicantBlockNo,
              streetName: formData.applicantAddressLine2 ?? formData.applicantStreetName,
              unitNo: formData.applicantAddressCity ?? formData.applicantUnitNo,
              postalCode: formData.applicantAddressState ?? formData.applicantPostalCode,
              country: formData.applicantAddressCountry ?? formData.applicantCountry
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