import React, { useState } from 'react';
import { FileTextIcon, PrinterIcon, EyeIcon } from 'lucide-react';
import { NomineeConsentForm } from './NomineeConsentForm';
import { ConsentFormData } from './InvoiceData';
import api from '../services/api';
import { Button } from './common';

interface NomineeConsentFormButtonProps {
  applicationNumber: string;
}

export const NomineeConsentFormButton: React.FC<NomineeConsentFormButtonProps> = ({
  applicationNumber
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [consentFormData, setConsentFormData] = useState<ConsentFormData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if application number is valid
  const isApplicationNumberValid = applicationNumber && applicationNumber.trim() !== '';

  const handleClick = async () => {
    // Validate application number before making API call
    if (!isApplicationNumberValid) {
      setError('Application number is required to print nominee consent form');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch application data from the backend
      const response = await api.get(`/niche-application/${applicationNumber}`);
      const applicationData = response.data.data;

      const today = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(/ /g, '-');

      // Map application data to consent form data
      const mappedData: ConsentFormData = {
        nicheNo: applicationData.nicheCode || applicationData.niche?.code || '',
        applicantName: applicationData.applicantName || applicationData.applicant?.name || '',
        applicantNRIC: applicationData.applicantIDNo || applicationData.applicant?.idNo || '',
        nominee1: {
          name: applicationData.nomineeName || applicationData.nominee?.name || '',
          nric: applicationData.nomineeIDNo || applicationData.nominee?.idNo || '',
          relationship: applicationData.nomineeRelationship || applicationData.nominee?.relationship || '',
          date: applicationData.nomineeDate || applicationData.nominee?.date || today
        },
        nominee2: {
          name: applicationData.nomineeName2 || applicationData.nominee2?.name || '',
          nric: applicationData.nomineeIDNo2 || applicationData.nominee2?.idNo || '',
          relationship: applicationData.nomineeRelationship2 || applicationData.nominee2?.relationship || '',
          date: applicationData.nomineeDate2 || applicationData.nominee2?.date || today
        }
      };

      setConsentFormData(mappedData);
      setShowModal(true);
    } catch (err: any) {
      console.error('Error loading nominee consent form:', err);
      setError(err.message || 'Failed to load nominee consent form');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setConsentFormData(null);
    setError(null);
  };

  const handlePrint = () => {
    // Trigger print functionality
    const printContent = document.getElementById('nominee-consent-form-print');
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Restore the page
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleClick}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <FileTextIcon className="w-4 h-4" />
          {loading ? 'Loading...' : 'Print Nominee Consent Form'}
        </button>
        <span className="text-red-500 text-sm">{error}</span>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant="primary"
        icon={<PrinterIcon className="w-4 h-4" />}
        disabled={loading || !isApplicationNumberValid}
      >
        {!isApplicationNumberValid ? 'No App. Number' : loading ? 'Loading...' : 'Print Consent Form'}
      </Button>

      {showModal && consentFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileTextIcon className="w-5 h-5" />
                Nominee Consent Form
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <PrinterIcon className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={handleClose}
                  className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4">
              <div id="nominee-consent-form-print">
                <NomineeConsentForm data={consentFormData} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};