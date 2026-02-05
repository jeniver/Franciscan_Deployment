import React, { useState } from 'react';
import { SecondNomineeAgreementViewer } from './SecondNomineeAgreementViewer';

interface PrintSecondNomineeButtonProps {
  applicationNumber: string;
}

export const PrintSecondNomineeButton: React.FC<PrintSecondNomineeButtonProps> = ({ 
  applicationNumber 
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleClick = () => {
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Print 2nd Nominee Agreement
      </button>
      
      {showModal && (
        <SecondNomineeAgreementViewer
          applicationNumber={applicationNumber}
          isOpen={showModal}
          onClose={handleClose}
        />
      )}
    </>
  );
};