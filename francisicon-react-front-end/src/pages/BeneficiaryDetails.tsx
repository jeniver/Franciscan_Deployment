import React, { useState, useEffect } from 'react';
import { UsersIcon, PlusIcon, UserIcon, InfoIcon } from 'lucide-react';
import { AddBeneficiaryModal } from '../components/AddBeneficiaryModal';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
interface BeneficiaryDetailsProps {
  formData: any;
  setFormData: (data: any) => void;
  isReadOnly?: boolean;
}
interface Beneficiary {
  id: number;
  fullName: string;
  nric: string;
  relationship: string;
  dateOfBirth: string;
  status: 'Active' | 'Unknown' | 'Inactive';
  religion: string;
}
export function BeneficiaryDetails({
  formData,
  setFormData,
  isReadOnly = false
}: BeneficiaryDetailsProps) {
  // Get validation errors from Redux store
  const validationErrors = useSelector((state: RootState) => state.application.validationErrors);
  
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(formData.beneficiaries || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);

  // Sync local state with Redux form data
  useEffect(() => {
    if (formData.beneficiaries && Array.isArray(formData.beneficiaries)) {
      setBeneficiaries(formData.beneficiaries);
    }
  }, [formData.beneficiaries]);

  // Update Redux whenever local beneficiaries change
  useEffect(() => {
    setFormData({
      ...formData,
      beneficiaries: beneficiaries
    });
  }, [beneficiaries]);
  const handleAddBeneficiary = () => {
    setEditingBeneficiary(null);
    setIsModalOpen(true);
  };

  const handleEditBeneficiary = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setIsModalOpen(true);
  };

  const handleSaveBeneficiary = (beneficiaryData: any) => {
    // Normalize beneficiary data to ensure consistent field names
    const normalizedBeneficiary = {
      id: editingBeneficiary?.id || Date.now(),
      fullName: beneficiaryData.fullName || beneficiaryData.name || '',
      nric: beneficiaryData.nric || '',
      dateOfBirth: beneficiaryData.dateOfBirth || '',
      sex: beneficiaryData.sex || beneficiaryData.gender || '',
      gender: beneficiaryData.gender || beneficiaryData.sex || '',
      relationship: beneficiaryData.relationship || beneficiaryData.relationshipToApp || '',
      relationshipToApp: beneficiaryData.relationshipToApp || beneficiaryData.relationship || '',
      religion: beneficiaryData.religion || beneficiaryData.religiousAffiliation || '',
      religiousAffiliation: beneficiaryData.religiousAffiliation || beneficiaryData.religion || '',
      relationshipToNominee1: beneficiaryData.relationshipToNominee1 || '',
      relationshipToNominee2: beneficiaryData.relationshipToNominee2 || '',
      status: beneficiaryData.status || 'Not Occupied',
      isMale: beneficiaryData.isMale !== undefined ? beneficiaryData.isMale : (beneficiaryData.sex === 'Male' || beneficiaryData.gender === 'Male'),
      isCatholic: beneficiaryData.isCatholic !== undefined ? beneficiaryData.isCatholic : (beneficiaryData.religion === 'Catholic' || beneficiaryData.religiousAffiliation === 'Catholic')
    };

    if (editingBeneficiary) {
      // Update existing beneficiary
      const updated = beneficiaries.map(b => 
        b.id === editingBeneficiary.id ? normalizedBeneficiary : b
      );
      setBeneficiaries(updated);
      
      // Update individual beneficiary fields for the first beneficiary (for API compatibility)
      const firstBeneficiary = updated[0];
      const updatedFormData = {
        ...formData,
        beneficiaries: updated,
        // Update individual fields for first beneficiary
        beneficiary1: firstBeneficiary ? {
          name: firstBeneficiary.fullName || firstBeneficiary.name || '',
          relationshipToApplicant: firstBeneficiary.relationshipToApp || firstBeneficiary.relationship || ''
        } : { name: '', relationshipToApplicant: '' }
      };
      
      setFormData(updatedFormData);
    } else {
      // Add new beneficiary
      const updated = [...beneficiaries, normalizedBeneficiary];
      setBeneficiaries(updated);
      
      // Update individual beneficiary fields for the first beneficiary (for API compatibility)
      const firstBeneficiary = updated[0];
      const updatedFormData = {
        ...formData,
        beneficiaries: updated,
        // Update individual fields for first beneficiary
        beneficiary1: firstBeneficiary ? {
          name: firstBeneficiary.fullName || firstBeneficiary.name || '',
          relationshipToApplicant: firstBeneficiary.relationshipToApp || firstBeneficiary.relationship || ''
        } : { name: '', relationshipToApplicant: '' }
      };
      
      setFormData(updatedFormData);
    }
    setIsModalOpen(false);
    setEditingBeneficiary(null);
  };
  const handleUpdateBeneficiary = (id: number, field: keyof Beneficiary, value: string) => {
    const updated = beneficiaries.map(b => b.id === id ? {
      ...b,
      [field]: value
    } : b);
    setBeneficiaries(updated);
    setFormData({
      ...formData,
      beneficiaries: updated
    });
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-700';
      case 'Inactive':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  return <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-[#8b2828] to-[#7d1f1f] rounded-xl flex items-center justify-center">
          <UsersIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Beneficiary Details
          </h2>
          <p className="text-sm text-gray-600">
            Add and manage beneficiary information
          </p>
        </div>
      </div>
      
      {/* Validation Error Display */}
      {validationErrors.beneficiaries && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <span className="text-red-700 font-medium">Validation Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{validationErrors.beneficiaries}</p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={handleAddBeneficiary}
            disabled={isReadOnly}
            className={`flex items-center gap-2 px-4 py-2 bg-[#8b5a2b] text-white rounded-md hover:bg-[#6d4420] transition-colors ${
              isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <PlusIcon className="w-4 h-4" />
            Add Beneficiary
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
            <InfoIcon className="w-4 h-4" />
            Print Insertion
          </button>
        </div>

        {/* Beneficiaries Table */}
        {beneficiaries.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NRIC/PP # DateofBirth# Birth Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sex</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catholic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship to Applicant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship to Nominee 1</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship to Nominee 2</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {beneficiaries.map((beneficiary, index) => (
                    <tr key={beneficiary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {beneficiary.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {beneficiary.nric} {beneficiary.dateOfBirth}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(beneficiary as any).sex || (beneficiary as any).gender || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(beneficiary as any).religion || (beneficiary as any).religiousAffiliation || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(beneficiary as any).relationship || (beneficiary as any).relationshipToApp || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(beneficiary as any).relationshipToNominee1 || ' '}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(beneficiary as any).relationshipToNominee2 || ' '}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(beneficiary.status)}`}>
                          {beneficiary.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!isReadOnly && (
                          <button 
                            onClick={() => handleEditBeneficiary(beneficiary)}
                            className="text-[#8b5a2b] hover:text-[#6d4420]"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {beneficiaries.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No beneficiaries</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a beneficiary.</p>
            <div className="mt-6">
              <button
                onClick={handleAddBeneficiary}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#8b5a2b] hover:bg-[#6d4420] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5a2b]"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Beneficiary
              </button>
            </div>
          </div>
        )}

        {/* Add Beneficiary Modal */}
        <AddBeneficiaryModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBeneficiary(null);
          }}
          onSave={handleSaveBeneficiary}
          beneficiary={editingBeneficiary}
        />
      </div>
    </div>;
}