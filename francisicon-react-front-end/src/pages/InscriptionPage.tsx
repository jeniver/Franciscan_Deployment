import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { InscriptionRequest } from '../components/InscriptionRequest';

export function InscriptionPage() {
  const [formData, setFormData] = useState({});

  return (
    <Layout title="Request for Inscription of Plaque">
      <InscriptionRequest formData={formData} setFormData={setFormData} />
    </Layout>
  );
}

