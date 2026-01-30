import { useState, useEffect } from 'react';
import { UserCheckIcon, PlusIcon, InfoIcon, Trash2Icon } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { FormSelect } from '../components/FormSelect';
import { AddressInput } from '../components/AddressInput';
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
        address: nominee.address || '',
        officeTelNo: nominee.officeTelNo || '',
        homeTelNo: nominee.homeTelNo || '',
        email: nominee.email || '',
        status: nominee.status === 'Non-Active' || nominee.status === 'Inactive' ? 'Non-Active' : 'Active'
      }));
      setNominees(prev => (nomineesAreEqual(normalized, prev) ? prev : normalized));
    }
  }, [formData.nominees]);

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

  const handleAddNominee = () => {
    const newNominee: Nominee = {
      id: Date.now(),
      fullName: '',
      nric: '',
      relationship: '',
      dateOfBirth: '',
      contactNumber: '',
      address: '',
      officeTelNo: '',
      homeTelNo: '',
      email: '',
      status: 'Active'
    };
    const updatedNominees = [...nominees, newNominee];
    setNominees(updatedNominees);
    
    // Update individual nominee fields for the first nominee (for API compatibility)
    const firstNominee = updatedNominees[0];
    setFormData({
      nominees: updatedNominees,
      nomineeName: firstNominee?.fullName || '',
      nomineeIDNo: firstNominee?.nric || '',
      nomineeRelationship: firstNominee?.relationship || '',
      nomineeAddress: firstNominee?.address || '',
      nomineePhone: firstNominee?.contactNumber || '',
      nomineeEmail: firstNominee?.email || '',
      nomineeStatus: firstNominee?.status || 'Active'
    });
  };
  const handleUpdateNominee = <K extends keyof Nominee>(id: number, field: K, value: Nominee[K]) => {
    const updated = nominees.map(n => n.id === id ? {
      ...n,
      [field]: value
    } : n);
    setNominees(updated);
    
    // Update individual nominee fields for the first nominee (for API compatibility)
    const firstNominee = updated[0];
    setFormData({
      nominees: updated,
      nomineeName: firstNominee?.fullName || '',
      nomineeIDNo: firstNominee?.nric || '',
      nomineeRelationship: firstNominee?.relationship || '',
      nomineeAddress: firstNominee?.address || '',
      nomineePhone: firstNominee?.contactNumber || '',
      nomineeEmail: firstNominee?.email || '',
      nomineeStatus: firstNominee?.status || 'Active'
    });
  };
  const handleRemoveNominee = (id: number) => {
    const updated = nominees.filter(n => n.id !== id);
    setNominees(updated);

    const firstNominee = updated[0];
    setFormData({
      nominees: updated,
      nomineeName: firstNominee?.fullName || '',
      nomineeIDNo: firstNominee?.nric || '',
      nomineeRelationship: firstNominee?.relationship || '',
      nomineeAddress: firstNominee?.address || '',
      nomineePhone: firstNominee?.contactNumber || '',
      nomineeEmail: firstNominee?.email || '',
      nomineeStatus: firstNominee?.status || 'Active'
    });
  };
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
      
      {nominees.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleAddNominee}
            disabled={isReadOnly}
            className={`flex items-center gap-2 px-4 py-2 bg-[#8b5a2b] text-white rounded-md hover:bg-[#6d4420] transition-colors ${
              isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <PlusIcon className="w-4 h-4" />
            Add Nominee
          </button>
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
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Name
                </label>
                <input 
                  type="text" 
                  value={nominee.fullName} 
                  onChange={e => handleUpdateNominee(nominee.id, 'fullName', e.target.value)} 
                  placeholder="Enter full name" 
                  disabled={isReadOnly}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  }`}
                />
              </div>
              <div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Mobile No.
                </label>
                <input 
                  type="tel" 
                  value={nominee.contactNumber} 
                  onChange={e => handleUpdateNominee(nominee.id, 'contactNumber', e.target.value)} 
                  placeholder="+65 1234 5678" 
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  }`}
                  disabled={isReadOnly} 
                />
              </div>
  
              </div>
            </div>
            
            <div className="mt-4">
            <div>
                    <AddressInput
                      fieldPrefix="nominee"
                      initialAddressString={nominee.address || ''}
                      onAddressChange={(addressData) => {
                        // Convert structured address to legacy single string
                        const legacyAddress = buildLegacyAddress(addressData);
                        // Update only this nominee's address; other fields handled by existing logic
                        handleUpdateNominee(nominee.id, 'address', legacyAddress as Nominee['address']);

                        // For the primary nominee (index 0), also update top-level structured fields
                        // so the API request can map them to NomineeAddress* columns.
                        if (index === 0) {
                          setFormData({
                            ...formData,
                            nomineeAddress: legacyAddress,
                            nomineeBlock: addressData.block || '',
                            nomineeBlockNo: addressData.blockNo || '',
                            nomineeStreetName: addressData.streetName || '',
                            nomineeUnitNo: addressData.unitNo || '',
                            nomineePostalCode: addressData.postalCode || '',
                            nomineeCountry: addressData.country || 'Singapore'
                          });
                        }
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
                  NRIC/Passport No.
                </label>
                <input 
                  type="text" 
                  value={nominee.nric} 
                  onChange={e => handleUpdateNominee(nominee.id, 'nric', e.target.value)} 
                  placeholder="Enter NRIC/Passport" 
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  }`}
                  disabled={isReadOnly} 
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Home Telephone
                </label>
                <input 
                  type="tel" 
                  value={nominee.homeTelNo || ''} 
                  onChange={e => handleUpdateNominee(nominee.id, 'homeTelNo', e.target.value)} 
                  placeholder="Enter home telephone" 
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  }`}
                  disabled={isReadOnly} 
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
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
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
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
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
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
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
                placeholder="Select status"
                disabled={isReadOnly}
              />
              
            </div>

            {/* Second Nominee Agreement Button for second nominee */}
            {index === 1 && (
              <div className="mt-4 flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#8b5a2b] text-white rounded-md hover:bg-[#6d4420] transition-colors">
                  <InfoIcon className="w-4 h-4" />
                  Print 2nd Nominee Agreement
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {nominees.length === 0 && (
          <div className="text-center py-12">
            <UserCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No nominees</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a nominee.</p>
            <div className="mt-6">
              <button
                onClick={handleAddNominee}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#8b5a2b] hover:bg-[#6d4420] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5a2b]"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Nominee
              </button>
            </div>
          </div>
        )}
      </div>
    </div>;
}