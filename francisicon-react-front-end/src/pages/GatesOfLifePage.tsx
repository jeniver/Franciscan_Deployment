import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { GateOfLifeApplication } from './GateOfLifeApplication';

export function GatesOfLifePage() {
  const [formData, setFormData] = useState({});

  return (
    <Layout title="Gate of Life New Application">
      <GateOfLifeApplication formData={formData} setFormData={setFormData} />
    </Layout>
  );
}