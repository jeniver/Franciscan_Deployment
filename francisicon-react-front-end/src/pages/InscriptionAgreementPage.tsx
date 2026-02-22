import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { InscriptionAgreementViewerModal } from '../components/InscriptionAgreementViewerModal';
import inscriptionAgreementService from '../services/inscriptionAgreementService';

export function InscriptionAgreementPage() {
  const { inscriptionCode } = useParams<{ inscriptionCode: string }>();
  const [agreementData, setAgreementData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inscriptionCode) return;
    
    const fetchAgreementData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await inscriptionAgreementService.getPdfData(inscriptionCode);
        setAgreementData(data);
      } catch (err: any) {
        console.error('Error fetching inscription agreement:', err);
        setError(err.message || 'Failed to load inscription agreement');
      } finally {
        setLoading(false);
      }
    };

    fetchAgreementData();
  }, [inscriptionCode]);

  const handleCloseModal = () => {
    // Close the modal - you might want to navigate back or to another page
    window.history.back();
  };

  if (!inscriptionCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h1>
          <p className="text-gray-600">No inscription code provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <InscriptionAgreementViewerModal
        isOpen={true}
        onClose={handleCloseModal}
        initialData={agreementData}
        inscriptionCode={inscriptionCode}
      />
      
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}