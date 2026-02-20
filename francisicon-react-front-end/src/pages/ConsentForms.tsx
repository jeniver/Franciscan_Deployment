import { FileTextIcon, CheckCircleIcon, HashIcon } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ConsentFormViewerModal } from '../components/ConsernFormAgreement/ConsentFormViewerModal';
import { useToast } from '../contexts/ToastContext';
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
  const { showError } = useToast();
  const [consentFormModalOpen, setConsentFormModalOpen] = useState(false);
  const [consentFormData, setConsentFormData] = useState<any>(null);

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

  // Function to get beneficiary data by index (handles array or individual fields)
  const getBeneficiaryData = useCallback((index: number) => {
    const beneficiaries = formData.beneficiaries || [];
    if (beneficiaries[index]) {
      const b = beneficiaries[index];
      return {
        name: b.name || b.fullName || b.deceasedName || '',
        idNo: b.idNo || b.nric || b.deathCertNo || '',
        relationshipToApplicant: b.relationshipToApplicant || b.relationship || ''
      };
    }

    // Fallback: try to get individual beneficiary fields
    const name = formData[`beneficiary${index + 1}Name`] || (formData as any)[`beneficiary${index + 1}`]?.name || '';
    if (name) {
      return {
        name: name,
        idNo: formData[`beneficiary${index + 1}IDNo`] || (formData as any)[`beneficiary${index + 1}`]?.idNo || (formData as any)[`beneficiary${index + 1}`]?.nric || '',
        relationshipToApplicant: formData[`beneficiary${index + 1}Relationship`] || (formData as any)[`beneficiary${index + 1}`]?.relationship || ''
      };
    }
    return null;
  }, [formData]);

  // Function to open consent form for a specific beneficiary and form type
  const openConsentForm = useCallback((b1: any, b2: any, formType: 'deceased' | 'living' | 'lostCapacity') => {
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
      beneficiary1: b1 ? {
        name: b1.name,
        nric: b1.idNo,
        relationship: b1.relationshipToApplicant,
        isDeceased: formType === 'deceased',
        isLiving: formType === 'living',
        isLostCapacity: formType === 'lostCapacity'
      } : undefined,
      beneficiary2: b2 ? {
        name: b2.name,
        nric: b2.idNo,
        relationship: b2.relationshipToApplicant,
        isDeceased: formType === 'deceased',
        isLiving: formType === 'living',
        isLostCapacity: formType === 'lostCapacity'
      } : undefined,
      formType,
    };

    console.log('Consent form data being prepared:', consentData);
    setConsentFormData(consentData);
    setConsentFormModalOpen(true);
  }, [formData]);

  // Function to open consent form with a specific beneficiary (first or second)
  const handleOpenForm = useCallback((beneficiaryKey: string, formType: 'deceased' | 'living' | 'lostCapacity') => {
    console.log('Attempting to open consent form for:', beneficiaryKey);

    if (beneficiaryKey === 'twoBeneficiaries') {
      const b1 = getBeneficiaryData(0);
      const b2 = getBeneficiaryData(1);
      if (b1) {
        openConsentForm(b1, b2, formType);
      } else {
        showError('Error', 'No beneficiary data found');
      }
    } else {
      const index = beneficiaryKey === 'firstBeneficiary' ? 0 : 1;
      const b = getBeneficiaryData(index);
      if (b) {
        openConsentForm(b, undefined, formType);
      } else {
        showError('Error', `No data found for ${beneficiaryKey === 'firstBeneficiary' ? '1st' : '2nd'} beneficiary`);
      }
    }
  }, [getBeneficiaryData, openConsentForm, showError]);

  const beneficiaryTypes = [
    {
      key: 'firstBeneficiary',
      label: '1st Beneficiary',
    },
    {
      key: 'secondBeneficiary',
      label: '2nd Beneficiary',
    },
    {
      key: 'twoBeneficiaries',
      label: '2 Beneficiaries (Consolidated)',
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
        <div className="w-12 h-12 bg-gradient-to-br from-[#801818] to-[#9a1f1f] rounded-xl flex items-center justify-center">
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
                        onClick={() => {
                          handleBeneficiaryStatusChange(beneficiary.key, status.key);
                          handleOpenForm(beneficiary.key, status.key as 'deceased' | 'living' | 'lostCapacity');
                        }}
                        disabled={isReadOnly}
                        className={`${isSelected
                          ? 'bg-[#801818] text-white border-[#801818] hover:bg-[#9a1f1f] hover:text-white'
                          : 'bg-white text-[#801818] border-[#801818] hover:bg-[#801818] hover:text-white'
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