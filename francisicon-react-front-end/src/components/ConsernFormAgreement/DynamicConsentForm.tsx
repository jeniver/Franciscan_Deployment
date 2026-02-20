import React from 'react';
import { ColumbariumFormDeceased } from './ColumbariumFormDisceased';
import { ColumbariumFormLiving } from './ColumbariumFormLiving';
import { ColumbariumFormLostCapacity } from './ColumbariumFormLostCapacity';

interface BeneficiaryData {
  name: string;
  nric: string;
  relationship?: string;
  isDeceased?: boolean;
  isLiving?: boolean;
  isLostCapacity?: boolean;
}

interface FormData {
  applicantName: string;
  applicantNric: string;
  nominee1Name: string;
  nominee1Nric: string;
  nominee2Name?: string;
  nominee2Nric?: string;
  chapelName: string;
  nicheNumber: string;
  beneficiary1: BeneficiaryData;
  beneficiary2?: BeneficiaryData;
  formType: 'deceased' | 'living' | 'lostCapacity';
}

export function DynamicConsentForm({ formData }: { formData: FormData }) {
  const { formType } = formData;

  switch (formType) {
    case 'deceased':
      return <ColumbariumFormDeceased formData={{
        date: new Date().toLocaleDateString('en-GB'),
        nicheNumber: formData.nicheNumber,
        applicantName: formData.applicantName,
        applicantNric: formData.applicantNric,
        beneficiaries: [
          {
            name: formData.beneficiary1.name,
            relationship: formData.beneficiary1.relationship || 'NA'
          },
          ...(formData.beneficiary2 ? [{
            name: formData.beneficiary2.name,
            relationship: formData.beneficiary2.relationship || 'NA'
          }] : [])
        ],
        nominees: [
          {
            name: formData.nominee1Name,
            nric: formData.nominee1Nric
          },
          ...(formData.nominee2Name && formData.nominee2Nric ? [{
            name: formData.nominee2Name,
            nric: formData.nominee2Nric
          }] : [])
        ]
      }} />;
    case 'living':
      return <ColumbariumFormLiving data={formData} />; // No props needed
    case 'lostCapacity':
      return <ColumbariumFormLostCapacity data={formData} />;
    default:
      return <ColumbariumFormDeceased formData={{
        date: new Date().toLocaleDateString('en-GB'),
        nicheNumber: formData.nicheNumber,
        applicantName: formData.applicantName,
        applicantNric: formData.applicantNric,
        beneficiaries: [
          {
            name: formData.beneficiary1.name,
            relationship: formData.beneficiary1.relationship || 'NA'
          },
          ...(formData.beneficiary2 ? [{
            name: formData.beneficiary2.name,
            relationship: formData.beneficiary2.relationship || 'NA'
          }] : [])
        ],
        nominees: [
          {
            name: formData.nominee1Name,
            nric: formData.nominee1Nric
          },
          ...(formData.nominee2Name && formData.nominee2Nric ? [{
            name: formData.nominee2Name,
            nric: formData.nominee2Nric
          }] : [])
        ]
      }} />; // default to deceased form
  }
}