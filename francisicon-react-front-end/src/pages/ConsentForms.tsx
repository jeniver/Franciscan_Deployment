import { FileTextIcon, CheckCircleIcon, HashIcon, UserIcon } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ConsentFormViewerModal } from '../components/ConsernFormAgreement/ConsentFormViewerModal';
import React, { useState, useCallback } from 'react';

interface Beneficiary {
  id: number;
  name: string;
  idNo: string;
  relationshipToApplicant?: string;
}

interface ConsentFormsProps {
  formData: any;
  setFormData: (data: any) => void;
  isReadOnly?: boolean;
}

export function ConsentForms({
  formData,
  setFormData,
  isReadOnly = false
}: ConsentFormsProps) {
  const [consentFormModalOpen, setConsentFormModalOpen] = useState(false);
  const [consentFormData, setConsentFormData] = useState<any>(null);

  // Debug: Log formData structure on component mount
  React.useEffect(() => {
    console.log('ConsentForms component mounted with formData keys:', Object.keys(formData || {}));
    console.log('FormData applicant info:', {
      applicantName: formData?.applicantName,
      contactName: formData?.contactName,
      applicantIDNo: formData?.applicantIDNo,
      contactNric: formData?.contactNric
    });
    console.log('FormData nominee info:', {
      nomineeName: formData?.nomineeName,
      nomineeIDNo: formData?.nomineeIDNo,
      nomineeName2: formData?.nomineeName2,
      nomineeIDNo2: formData?.nomineeIDNo2
    });
    console.log('FormData niche info:', {
      chapelName: formData?.chapelName,
      chapel: formData?.chapel,
      nicheNumber: formData?.nicheNumber,
      nicheCode: formData?.nicheCode
    });
    console.log('FormData beneficiaries:', formData?.beneficiaries);
  }, [formData]);

  const handleBeneficiaryStatusChange = (beneficiaryType: string, status: string) => {
    if (isReadOnly) return;
    const updated = {
      ...formData,
      consentForms: {
        ...formData.consentForms,
        [beneficiaryType]: status
      }
    };
    setFormData(updated);
  };

  // Function to open consent form for a specific beneficiary and form type
  const openConsentForm = useCallback((beneficiary: Beneficiary, formType: 'deceased' | 'living' | 'lostCapacity') => {
    // Extract applicant data from formData - using correct field names
    const applicantName = formData.applicantName || formData.contactName || '';
    const applicantNric = formData.applicantIDNo || formData.contactNric || '';
    
    // Extract nominee data from formData - using correct field names
    const nominee1Name = formData.nomineeName || '';
    const nominee1Nric = formData.nomineeIDNo || '';
    const nominee2Name = formData.nomineeName2 || '';
    const nominee2Nric = formData.nomineeIDNo2 || '';
    
    // Extract niche/chapel data
    const chapelName = formData.chapelName || formData.chapel || 'Chapel';
    const nicheNumber = formData.nicheNumber || formData.nicheCode || 'XXXX';
    
    // Properly map beneficiary data - handle different field name conventions
    const mappedBeneficiary = {
      name: beneficiary.name || (beneficiary as any).fullName || '',
      nric: beneficiary.idNo || (beneficiary as any).nric || '',
      relationship: beneficiary.relationshipToApplicant || (beneficiary as any).relationship || '',
      isDeceased: formType === 'deceased',
      isLiving: formType === 'living',
      isLostCapacity: formType === 'lostCapacity'
    };
    
    // Prepare the consent form data
    const consentData = {
      applicantName,
      applicantNric,
      nominee1Name,
      nominee1Nric,
      nominee2Name,
      nominee2Nric,
      chapelName,
      nicheNumber,
      beneficiary1: mappedBeneficiary,
      beneficiary2: undefined,
      formType,
    };
    
    console.log('Consent form data being prepared:', consentData);
    console.log('Original beneficiary data:', beneficiary);
    
    setConsentFormData(consentData);
    setConsentFormModalOpen(true);
  }, [formData]);

  // Function to open consent form with a specific beneficiary (first or second)
  const openConsentFormForBeneficiary = useCallback((beneficiaryIndex: number, formType: 'deceased' | 'living' | 'lostCapacity') => {
    console.log('Attempting to open consent form for beneficiary index:', beneficiaryIndex);
    console.log('Available beneficiaries:', formData.beneficiaries);
    
    const beneficiaries = formData.beneficiaries || [];
    const beneficiary = beneficiaries[beneficiaryIndex];
    
    if (beneficiary) {
      console.log('Found beneficiary:', beneficiary);
      openConsentForm(beneficiary, formType);
    } else {
      console.warn('No beneficiary found at index:', beneficiaryIndex);
      // Fallback: try to get individual beneficiary fields
      const individualBeneficiary = {
        name: formData[`beneficiary${beneficiaryIndex + 1}Name`] || (formData as any)[`beneficiary${beneficiaryIndex + 1}`]?.name || '',
        idNo: formData[`beneficiary${beneficiaryIndex + 1}IDNo`] || (formData as any)[`beneficiary${beneficiaryIndex + 1}`]?.idNo || (formData as any)[`beneficiary${beneficiaryIndex + 1}`]?.nric || '',
        relationshipToApplicant: formData[`beneficiary${beneficiaryIndex + 1}Relationship`] || (formData as any)[`beneficiary${beneficiaryIndex + 1}`]?.relationship || ''
      };
      
      if (individualBeneficiary.name) {
        console.log('Using individual beneficiary fields:', individualBeneficiary);
        openConsentForm(individualBeneficiary as Beneficiary, formType);
      } else {
        console.error('No beneficiary data found at all for index:', beneficiaryIndex);
      }
    }
  }, [formData, openConsentForm]);

  const beneficiaryTypes = [
    {
      key: 'firstBeneficiary',
      label: '1st Beneficiary',
      index: 0
    },
    {
      key: 'secondBeneficiary', 
      label: '2nd Beneficiary',
      index: 1
    },
    {
      key: 'twoBeneficiaries',
      label: '2 Beneficiaries',
      index: 0  // For two beneficiaries, we'll show the first one
    }
  ];

  const statusOptions = [
    {
      key: 'living',
      label: 'Living',
      icon: HashIcon
    },
    {
      key: 'deceased',
      label: 'Deceased', 
      icon: HashIcon
    },
    {
      key: 'lostCapacity',
      label: 'Lost Capacity',
      icon: HashIcon
    }
  ];

  const allConsented = beneficiaryTypes.every(beneficiary => 
    formData.consentForms?.[beneficiary.key]
  );

  return (
    <div>
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-[#8b2828] to-[#7d1f1f] rounded-xl flex items-center justify-center">
          <FileTextIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Consent Forms</h2>
          <p className="text-sm text-gray-600">
            Please select the beneficiary status for each type to proceed
          </p>
        </div>
      </div>

      {/* Consent Forms Section */}
      <div>
        <div className="p-6 space-y-6">
          {beneficiaryTypes.map((beneficiary) => (
            <div key={beneficiary.key} className="border-b border-gray-100 pb-6 last:border-b-0">
              <h4 className="text-base font-semibold text-gray-900 mb-4">
                {beneficiary.label}
                {beneficiary.key === 'twoBeneficiaries' && (
                  <span className="text-sm text-gray-500 ml-2">(for first beneficiary)</span>
                )}
              </h4>
              
              <div className="flex flex-wrap gap-3">
                {statusOptions.map((status) => {
                  const IconComponent = status.icon;
                  const isSelected = formData.consentForms?.[beneficiary.key] === status.key;
                  
                  return (
                    <React.Fragment key={status.key}>
                      <Button
                        variant={isSelected ? "primary" : "outline"}
                        size="sm"
                        icon={<IconComponent className="w-4 h-4" />}
                        onClick={() => openConsentFormForBeneficiary(beneficiary.index, status.key as 'deceased' | 'living' | 'lostCapacity')}
                        disabled={isReadOnly}
                        className={`${
                          isSelected
                            ? 'bg-[#8b2828] text-white border-[#8b2828] hover:bg-[#7d1f1f] hover:text-white'
                            : 'bg-white text-[#8b2828] border-[#8b2828] hover:bg-[#8b2828] hover:text-white'
                        } transition-all duration-200 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {status.label}
                      </Button> 
                    </React.Fragment>
                  );
                })}
              </div>
              
              {formData.consentForms?.[beneficiary.key] && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Status selected: {statusOptions.find(s => s.key === formData.consentForms[beneficiary.key])?.label}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      {allConsented && (
        <Card className="bg-emerald-50 border-emerald-200 mt-6">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-900">
                All Consents Provided
              </h4>
              <p className="text-sm text-emerald-800">
                All beneficiary statuses have been selected. You may now proceed to the next step of the application.
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {!allConsented && (
        <Card className="bg-amber-50 border-amber-200 mt-6">
          <div className="flex items-center gap-3">
            <FileTextIcon className="w-6 h-6 text-amber-600" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                Consent Required
              </h4>
              <p className="text-sm text-amber-800">
                Please select the beneficiary status for all types before proceeding to the next step.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Consent Form Viewer Modal */}
      <ConsentFormViewerModal
        isOpen={consentFormModalOpen}
        onClose={() => setConsentFormModalOpen(false)}
        formData={consentFormData}
      />
    </div>
  );
}