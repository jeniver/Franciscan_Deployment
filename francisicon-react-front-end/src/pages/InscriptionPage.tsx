import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { InscriptionRequest } from '../components/InscriptionRequest';
import { useInscription } from '../hooks/useInscription';

export function InscriptionPage() {
  const [formData, setFormData] = useState({});
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { updateNicheApplicationCode, handleFetchInscriptionItems, handleResetForm } = useInscription();
  const loadedApplicationCodeRef = useRef<string | null>(null);

  // Check if we're on the new inscription route
  const isNewInscriptionRoute = location.pathname === '/inscriptions/new';

  // Read applicationCode from query parameter and load inscription data
  useEffect(() => {
    // Check if we're in edit mode (route has an ID)
    const isEditMode = !!id;
    
    // Get application code from either query param or route param
    let applicationCode: string | null = null;
    
    if (isEditMode) {
      // In edit mode, the ID is the inscription code
      applicationCode = id;
    } else {
      // In new mode, get from query parameter
      applicationCode = searchParams.get('applicationCode');
    }
    
    // Check if we're on the new inscription route
    const isNewRoute = location.pathname === '/inscriptions/new';
    
    // If we're on the new inscription route, reset the form
    if (isNewRoute) {
      handleResetForm();
    }
    
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
  }, [searchParams, id, location.pathname, updateNicheApplicationCode, handleFetchInscriptionItems, handleResetForm]);

  return (
    <Layout title="Request for Inscription of Plaque">
      <InscriptionRequest formData={formData} setFormData={setFormData} />
    </Layout>
  );
}

