import { useState, useEffect, useCallback } from 'react';
import { XIcon } from 'lucide-react';
import { formatDateForInput } from '../utils/dateUtils';
import { EnhancedBeneficiaryDatePicker } from './EnhancedBeneficiaryDatePicker';

interface AddBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (beneficiary: any) => void;
  beneficiary?: any;
}

export function AddBeneficiaryModal({ isOpen, onClose, onSave, beneficiary }: AddBeneficiaryModalProps) {
  const [formData, setFormData] = useState({
    name: beneficiary?.fullName || beneficiary?.name || '',
    nric: beneficiary?.nric || beneficiary?.idNo || '',
    dateOfBirth: beneficiary?.dateOfBirth || '',
    birthYear: beneficiary?.birthYear || '',
    gender: beneficiary?.sex === 'Male' || beneficiary?.isMale ? 'Male' : beneficiary?.sex === 'Female' || beneficiary?.isMale === false ? 'Female' : 'Male',
    relationshipToApp: beneficiary?.relationship || beneficiary?.relationshipToApplicant || '',
    religiousAffiliation: beneficiary?.religion === 'Non Catholic' || beneficiary?.isCatholic === false ? 'Non Catholic' : 'Catholic',
    relationshipToNominee1: beneficiary?.relationshipToNominee1 || '',
    relationshipToNominee2: beneficiary?.relationshipToNominee2 || '',
    status: beneficiary?.status === 'Occupied' ? 'Occupied' : 'Not Occupied'
  });

  // Update form data when beneficiary prop changes
  useEffect(() => {
    if (beneficiary) {
      setFormData({
        name: beneficiary.fullName || beneficiary.name || '',
        nric: beneficiary.nric || beneficiary.idNo || '',
        dateOfBirth: beneficiary.dateOfBirth || '',
        birthYear: beneficiary.birthYear || '',
        gender: beneficiary.sex === 'Male' || beneficiary.isMale ? 'Male' : beneficiary.sex === 'Female' || beneficiary.isMale === false ? 'Female' : 'Male',
        relationshipToApp: beneficiary.relationship || beneficiary.relationshipToApplicant || '',
        religiousAffiliation: beneficiary.religion === 'Non Catholic' || beneficiary.isCatholic === false ? 'Non Catholic' : 'Catholic',
        relationshipToNominee1: beneficiary.relationshipToNominee1 || '',
        relationshipToNominee2: beneficiary.relationshipToNominee2 || '',
        status: beneficiary.status === 'Occupied' ? 'Occupied' : 'Not Occupied'
      });
    }
  }, [beneficiary]);

  const handleSave = () => {
    const newBeneficiary = {
      id: beneficiary?.id || Date.now(),
      fullName: formData.name,
      nric: formData.nric,
      dateOfBirth: formData.dateOfBirth,
      birthYear: formData.birthYear,
      sex: formData.gender,
      relationship: formData.relationshipToApp,
      relationshipToApplicant: formData.relationshipToApp,
      religion: formData.religiousAffiliation,
      relationshipToNominee1: formData.relationshipToNominee1,
      relationshipToNominee2: formData.relationshipToNominee2,
      status: formData.status,
      isMale: formData.gender === 'Male',
      isCatholic: formData.religiousAffiliation === 'Catholic'
    };

    onSave(newBeneficiary);

    // Reset form after saving (only if not editing)
    if (!beneficiary) {
      setFormData({
        name: '',
        nric: '',
        dateOfBirth: '',
        birthYear: '',
        gender: 'Male',
        relationshipToApp: '',
        religiousAffiliation: 'Catholic',
        relationshipToNominee1: '',
        relationshipToNominee2: '',
        status: 'Not Occupied'
      });
    }

    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleDateChange = useCallback((dateOfBirth: string | null, birthYear: number | null) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      dateOfBirth: dateOfBirth || '',
      birthYear: birthYear ? String(birthYear) : ''
    }));
  }, [setFormData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {beneficiary ? 'Edit Beneficiary' : 'Add Beneficiary'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent"
              placeholder="Enter beneficiary name"
            />
          </div>

          {/* NRIC/Passport No. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NRIC/Passport No.
            </label>
            <input
              type="text"
              value={formData.nric}
              onChange={(e) => setFormData(prev => ({ ...prev, nric: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent"
              placeholder="Enter NRIC/Passport number"
            />
          </div>

          {/* Date Of Birth */}
          <div>
            <EnhancedBeneficiaryDatePicker
              label="Date Of Birth"
              dateOfBirth={formData.dateOfBirth}
              birthYear={formData.birthYear}
              onChange={handleDateChange}
              minYear={1900}
              maxYear={new Date().getFullYear()}
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={formData.gender === 'Male'}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="mr-2 text-[#8b5a2b] focus:ring-[#8b5a2b]"
                />
                <span className="text-sm text-gray-700">Male</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={formData.gender === 'Female'}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="mr-2 text-[#8b5a2b] focus:ring-[#8b5a2b]"
                />
                <span className="text-sm text-gray-700">Female</span>
              </label>
            </div>
          </div>

          {/* Relationship to App */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship to App
            </label>
            <input
              type="text"
              value={formData.relationshipToApp}
              onChange={(e) => setFormData(prev => ({ ...prev, relationshipToApp: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent"
              placeholder="Enter relationship to applicant"
            />
          </div>

          {/* Religious Affiliation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Religious Affiliation
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="religion"
                  value="Catholic"
                  checked={formData.religiousAffiliation === 'Catholic'}
                  onChange={(e) => setFormData(prev => ({ ...prev, religiousAffiliation: e.target.value }))}
                  className="mr-2 text-[#8b5a2b] focus:ring-[#8b5a2b]"
                />
                <span className="text-sm text-gray-700">Catholic</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="religion"
                  value="Non Catholic"
                  checked={formData.religiousAffiliation === 'Non Catholic'}
                  onChange={(e) => setFormData(prev => ({ ...prev, religiousAffiliation: e.target.value }))}
                  className="mr-2 text-[#8b5a2b] focus:ring-[#8b5a2b]"
                />
                <span className="text-sm text-gray-700">Non Catholic</span>
              </label>
            </div>
          </div>

          {/* Relationship to Nominee 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship to Nominee 1
            </label>
            <input
              type="text"
              value={formData.relationshipToNominee1}
              onChange={(e) => setFormData(prev => ({ ...prev, relationshipToNominee1: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent"
              placeholder="Enter relationship to nominee 1"
            />
          </div>

          {/* Relationship to Nominee 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship to Nominee 2
            </label>
            <input
              type="text"
              value={formData.relationshipToNominee2}
              onChange={(e) => setFormData(prev => ({ ...prev, relationshipToNominee2: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent"
              placeholder="Enter relationship to nominee 2"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => setFormData(prev => ({ ...prev, status: 'Occupied' }))}
              className={`px-4 py-2 rounded-md text-sm font-medium ${formData.status === 'Occupied'
                  ? 'bg-[#8b5a2b] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Occupied
            </button>
            <button
              onClick={() => setFormData(prev => ({ ...prev, status: 'Not Occupied' }))}
              className={`px-4 py-2 rounded-md text-sm font-medium ${formData.status === 'Not Occupied'
                  ? 'bg-[#8b5a2b] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Not Occupied
            </button>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#8b5a2b] text-white rounded-md text-sm font-medium hover:bg-[#6d4420]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
