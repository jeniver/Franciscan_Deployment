import { ColumbariumFormDisceased } from './ColumbariumFormDisceased';
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
      return <ColumbariumFormDisceased data={formData} />;
    case 'living':
      return <ColumbariumFormLiving data={formData} />; // No props needed
    case 'lostCapacity':
      return <ColumbariumFormLostCapacity data={formData} />;
    default:
      return <ColumbariumFormDisceased data={formData} />; // default to deceased form
  }
}