import React from 'react';
import { useParams } from 'react-router-dom';
import { InscriptionAgreementViewer } from '../components/InscriptionAgreementViewer';

export function InscriptionAgreementPage() {
  const { inscriptionCode } = useParams<{ inscriptionCode: string }>();

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

  return <InscriptionAgreementViewer inscriptionCode={inscriptionCode} />;
}