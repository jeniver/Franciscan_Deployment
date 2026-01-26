import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { InscriptionRequest } from '../components/InscriptionRequest';
import { useInscription } from '../hooks/useInscription';

export function InscriptionPage() {
  const [formData, setFormData] = useState({});
  const [searchParams] = useSearchParams();
  const { updateNicheApplicationCode, handleFetchInscriptionItems } = useInscription();
  const loadedApplicationCodeRef = useRef<string | null>(null);

  // Read applicationCode from query parameter and load inscription data
  useEffect(() => {
    const applicationCode = searchParams.get('applicationCode');
    
    // Only load if we have an application code and haven't loaded it yet
    if (applicationCode && loadedApplicationCodeRef.current !== applicationCode) {
      loadedApplicationCodeRef.current = applicationCode;
      
      // Set the application code in Redux
      updateNicheApplicationCode(applicationCode);
      
      // Automatically fetch inscription items (will load inscription if exists, or applicant details if not)
      handleFetchInscriptionItems(applicationCode)
        .catch((error) => {
          // Error is already handled by toast in the hook
          console.error('Failed to load inscription data:', error);
          // Reset ref on error so user can retry
          loadedApplicationCodeRef.current = null;
        });
    }
  }, [searchParams, updateNicheApplicationCode, handleFetchInscriptionItems]);

  return (
    <Layout title="Request for Inscription of Plaque">
      <InscriptionRequest formData={formData} setFormData={setFormData} />
    </Layout>
  );
}

