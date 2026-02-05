import React, { useState, useEffect } from 'react';
import { AgreementViewerModal } from './AgreementViewerModal';
import { fetchSecondNomineeAgreementData } from '../utils/secondNomineeAgreementHandler';

interface SecondNomineeAgreementViewerProps {
  applicationNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SecondNomineeAgreementViewer: React.FC<SecondNomineeAgreementViewerProps> = ({
  applicationNumber,
  isOpen,
  onClose
}) => {
  const [agreementData, setAgreementData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && applicationNumber) {
      loadSecondNomineeAgreement();
    } else {
      // Reset state when modal is closed or application number changes
      setAgreementData(null);
      setError(null);
      setLoading(true); // Set to true initially when opening
    }
  }, [isOpen, applicationNumber]);

  const loadSecondNomineeAgreement = async () => {
    try {
      console.log('Starting to load 2nd nominee agreement for application:', applicationNumber);
      setLoading(true);
      setError(null);
      setAgreementData(null); // Clear previous data
      
      const data = await fetchSecondNomineeAgreementData(applicationNumber);
      console.log('Successfully loaded 2nd nominee agreement data:', data);
      setAgreementData(data);
    } catch (err: any) {
      console.error('Error loading 2nd nominee agreement:', err);
      setError(err.message || 'An unknown error occurred');
      // Still set agreementData to null in case of error
      setAgreementData(null);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAgreementData(null);
    setError(null);
    onClose();
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Agreement</h3>
          <p className="text-gray-700">{error}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => loadSecondNomineeAgreement()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AgreementViewerModal
      isOpen={isOpen}
      onClose={handleClose}
      agreementData={agreementData}
      applicationNumber={applicationNumber}
      loading={loading}
      agreementType="secondNominee"
    />
  );
};