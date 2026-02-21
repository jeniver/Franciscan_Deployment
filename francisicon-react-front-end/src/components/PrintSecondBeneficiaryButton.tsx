import React, { useState } from 'react';
import { PrinterIcon } from 'lucide-react';
import { AgreementViewerModal } from './AgreementViewerModal';
import { nicheAgreementService } from '../services/nicheAgreementService';

interface PrintSecondBeneficiaryButtonProps {
    applicationNumber: string;
}

export const PrintSecondBeneficiaryButton: React.FC<PrintSecondBeneficiaryButtonProps> = ({
    applicationNumber
}) => {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [beneficiaryData, setBeneficiaryData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleClick = async () => {
        if (!applicationNumber || applicationNumber.trim() === '') {
            setError('Application number is required');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await nicheAgreementService.getNicheAgreement(applicationNumber.trim());

            if (response.success && response.data) {
                const data = response.data;
                // Map data specifically for the 2nd beneficiary insertion agreement
                const mappedData = {
                    applicationNumber: data.applicationCode,
                    application: {
                        applicationNumber: data.applicationCode,
                        agreementDate: data.agreementDate
                    },
                    applicant: data.applicant,
                    beneficiary: data.beneficiaries?.[1] || data.beneficiaries?.[0], // Focus on 2nd if available
                    niche: data.niche
                };
                setBeneficiaryData(mappedData);
                setShowModal(true);
            } else {
                throw new Error(response.message || 'Failed to fetch agreement data');
            }
        } catch (err: any) {
            console.error('Error loading 2nd beneficiary agreement:', err);
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setShowModal(false);
        setBeneficiaryData(null);
        setError(null);
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleClick}
                    disabled={loading || !applicationNumber}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${applicationNumber && !loading
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/20'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    <PrinterIcon className="w-4 h-4" />
                    {loading ? 'Loading...' : 'Print Insertion (2nd Beneficiary)'}
                </button>
                {error && <span className="text-red-500 text-xs">{error}</span>}
            </div>

            <AgreementViewerModal
                isOpen={showModal}
                onClose={handleClose}
                agreementData={null}
                secoundNomineeAgreement={null}
                secoundBeneficiaryAgreement={beneficiaryData}
                applicationNumber={applicationNumber}
                templateType="beneficiary"
                loading={false}
            />
        </>
    );
};
