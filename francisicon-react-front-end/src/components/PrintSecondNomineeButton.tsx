import React, { useState } from 'react';
import { AgreementViewerModal } from './AgreementViewerModal';
import { PrinterIcon } from 'lucide-react';
import { fetchSecondNomineeAgreementDataForViewer } from '../utils/secondNomineeAgreementHandler';

interface PrintSecondNomineeButtonProps {
  applicationNumber: string;
}

export const PrintSecondNomineeButton: React.FC<PrintSecondNomineeButtonProps> = ({
  applicationNumber
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [secondNomineeData, setSecondNomineeData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if application number is valid
  const isApplicationNumberValid = applicationNumber && applicationNumber.trim() !== '';

  const handleClick = async () => {
    // Validate application number before making API call
    if (!isApplicationNumberValid) {
      setError('Application number is required to print 2nd nominee agreement');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchSecondNomineeAgreementDataForViewer(applicationNumber.trim());
      setSecondNomineeData(data);
      setShowModal(true);
    } catch (err: any) {
      console.error('Error loading 2nd nominee agreement:', err);
      setError(err.message || 'Failed to load 2nd nominee agreement');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setSecondNomineeData(null);
    setError(null);
  };

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleClick}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Print 2nd Nominee Agreement'}
        </button>
        <span className="text-red-500 text-sm">{error}</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading || !isApplicationNumberValid}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded transition-colors disabled:opacity-50 ${isApplicationNumberValid && !loading ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
      >
        <PrinterIcon className="w-4 h-4" />
        {!isApplicationNumberValid ? 'No App. Number' : loading ? 'Loading...' : 'Print Insertion (2nd Nominee)'}
      </button>

      <AgreementViewerModal
        isOpen={showModal}
        onClose={handleClose}
        agreementData={null}
        secoundNomineeAgreement={secondNomineeData}
        applicationNumber={applicationNumber}
        loading={false}
      />
    </>
  );
};