// Enhanced form data interface for niche application
export interface NicheApplicationFormData {
  // Application metadata
  applicationNumber?: string;
  
  // Step 1: Consent Forms
  consentForms?: Record<string, any>;
  
  // Step 2: Niche Details
  nicheId?: number | null;
  selectedNiches?: number[];
  chapel?: string;
  chapelId?: number;
  chapelCode?: string;
  nicheCode?: string;
  nicheNumber?: string;
  wallName?: string;
  wallCode?: string;
  rowNumber?: string;
  rowLevel?: number;
  
  // Step 3: Contact Person (Applicant) Details
  applicantName?: string;
  applicantIDNo?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantAddress?: string; // Legacy field for backward compatibility
  // Structured address fields
  applicantBlock?: string;
  applicantBlockNo?: string;
  applicantStreetName?: string;
  applicantUnitNo?: string;
  applicantPostalCode?: string;
  applicantCountry?: string;
  applicantReligion?: string;
  applicantIsCatholic?: boolean;
  applicantHomeTel?: string;
  applicantOfficeTel?: string;
  contactStatus?: string;
  contactRemarks?: string;
  remarks?: string;
  bookedDate?: string;
  
  // Step 4: Beneficiary Details
  beneficiaries?: Array<{
    name: string;
    relationshipToApplicant: string;
    idNo?: string;
    dateOfBirth?: string;
    isCatholic?: boolean;
  }>;
  beneficiary1?: {
    name: string;
    relationshipToApplicant: string;
  };
  
  // Step 5: Nominee Details
  nominees?: Array<{
    id?: number;
    name: string;
    fullName?: string;
    nric: string;
    relationship: string;
    address?: string;
    phone?: string;
    contactNumber?: string;
    email?: string;
    dateOfBirth?: string;
    officeTelNo?: string;
    homeTelNo?: string;
    status?: string;
  }>;
  nomineeName?: string;
  nomineeIDNo?: string;
  nomineeRelationship?: string;
  nomineeAddress?: string;
  nomineePhone?: string;
  nomineeEmail?: string;
  nomineeStatus?: string;
  // Structured nominee address fields (primary nominee)
  nomineeBlock?: string;
  nomineeBlockNo?: string;
  nomineeStreetName?: string;
  nomineeUnitNo?: string;
  nomineePostalCode?: string;
  nomineeCountry?: string;
  nomineeHomeTel?: string;
  nomineeOfficeTel?: string;
  // Structured nominee address fields (second nominee)
  nomineeBlock2?: string;
  nomineeBlockNo2?: string;
  nomineeStreetName2?: string;
  nomineeUnitNo2?: string;
  nomineePostalCode2?: string;
  nomineeCountry2?: string;
  nomineeAddressNo2?: string;
  nomineeAddressLine12?: string;
  nomineeAddressLine22?: string;
  nomineeAddressCity2?: string;
  nomineeAddressState2?: string;
  nomineeAddressCountry2?: string;
  nomineePhone2?: string;
  nomineeEmail2?: string;
  nomineeName2?: string;
  nomineeIDNo2?: string;
  nomineeRelationship2?: string;
  nomineeAddress2?: string;
  nomineeStatus2?: string;
  nomineeHomeTel2?: string;
  nomineeOfficeTel2?: string;
  
  // Step 6: Invoice & Receipt
  invoice?: {
    invoiceNo?: string;
    invoiceDate?: string;
    dueDate?: string;
    totalAmount?: number;
    nicheAmount?: number;
    serviceAmount?: number;
    taxAmount?: number;
    status?: string;
  };
  
  // Legacy fields for backward compatibility
  contactName?: string;
  contactNric?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactReligion?: string;
  contactHomeTel?: string;
  contactOfficeTel?: string;
  contactCountry?: string;
}

// Helper function to normalize form data structure
export const normalizeFormData = (formData: Record<string, any>): NicheApplicationFormData => {
  return {
    // Application metadata
    applicationNumber: formData.applicationNumber,
    
    // Step 1: Consent Forms
    consentForms: formData.consentForms || {},
    
    // Step 2: Niche Details
    nicheId: formData.nicheId || formData.selectedNiches?.[0] || null,
    selectedNiches: formData.selectedNiches || (formData.nicheId ? [formData.nicheId] : []),
    chapel: formData.chapel,
    chapelId: formData.chapelId,
    chapelCode: formData.chapelCode,
    nicheCode: formData.nicheCode,
    nicheNumber: formData.nicheNumber,
    wallName: formData.wallName,
    wallCode: formData.wallCode,
    rowNumber: formData.rowNumber,
    rowLevel: formData.rowLevel,
    
    // Step 3: Contact Person (Applicant) Details - normalize both old and new field names
    applicantName: formData.applicantName || formData.contactName || '',
    applicantIDNo: formData.applicantIDNo || formData.contactNric || '',
    applicantEmail: formData.applicantEmail || formData.contactEmail || '',
    applicantPhone: formData.applicantPhone || formData.contactPhone || '',
    applicantAddress: formData.applicantAddress || formData.contactAddress || '',
    // Structured address fields
    applicantBlock: formData.applicantBlock || '',
    applicantBlockNo: formData.applicantBlockNo || '',
    applicantStreetName: formData.applicantStreetName || '',
    applicantUnitNo: formData.applicantUnitNo || '',
    applicantPostalCode: formData.applicantPostalCode || '',
    applicantReligion: formData.applicantReligion || formData.contactReligion || '',
    applicantIsCatholic:
      typeof formData.applicantIsCatholic === 'boolean'
        ? formData.applicantIsCatholic
        : (() => {
            const rel = (formData.applicantReligion || formData.contactReligion || '').toString().toLowerCase();
            if (!rel) return undefined;
            if (rel.includes('catholic')) return true;
            return false;
          })(),
    applicantHomeTel: formData.applicantHomeTel || formData.contactHomeTel || '',
    applicantOfficeTel: formData.applicantOfficeTel || formData.contactOfficeTel || '',
    applicantCountry: formData.applicantCountry || formData.contactCountry || 'Singapore',
    contactStatus: formData.contactStatus || 'Active',
    contactRemarks: formData.contactRemarks || '',
    remarks: formData.remarks || '',
    bookedDate: formData.bookedDate || '',
    
    // Legacy fields for backward compatibility
    contactName: formData.applicantName || formData.contactName || '',
    contactNric: formData.applicantIDNo || formData.contactNric || '',
    contactEmail: formData.applicantEmail || formData.contactEmail || '',
    contactPhone: formData.applicantPhone || formData.contactPhone || '',
    contactAddress: formData.applicantAddress || formData.contactAddress || '',
    contactReligion: formData.applicantReligion || formData.contactReligion || '',
    contactHomeTel: formData.applicantHomeTel || formData.contactHomeTel || '',
    contactOfficeTel: formData.applicantOfficeTel || formData.contactOfficeTel || '',
    contactCountry: formData.applicantCountry || formData.contactCountry || 'Singapore',
    
    // Step 4: Beneficiary Details
    beneficiaries: formData.beneficiaries || [],
    beneficiary1: formData.beneficiary1 || (formData.beneficiaries?.[0] ? {
      name: formData.beneficiaries[0].fullName || formData.beneficiaries[0].name || '',
      relationshipToApplicant: formData.beneficiaries[0].relationshipToApplicant || formData.beneficiaries[0].relationship || ''
    } : { name: '', relationshipToApplicant: '' }),
    
    // Step 5: Nominee Details
    nominees: formData.nominees || [],
    nomineeName: formData.nomineeName || formData.nominees?.[0]?.fullName || formData.nominees?.[0]?.name || '',
    nomineeIDNo: formData.nomineeIDNo || formData.nominees?.[0]?.nric || '',
    nomineeRelationship: formData.nomineeRelationship || formData.nominees?.[0]?.relationship || '',
    nomineeAddress: formData.nomineeAddress || formData.nominees?.[0]?.address || '',
    nomineePhone: formData.nomineePhone || formData.nominees?.[0]?.contactNumber || formData.nominees?.[0]?.phone || '',
    nomineeEmail: formData.nomineeEmail || formData.nominees?.[0]?.email || '',
    nomineeStatus: formData.nomineeStatus || formData.nominees?.[0]?.status || 'Active',
    nomineeHomeTel: formData.nomineeHomeTel || formData.nominees?.[0]?.homeTelNo || '',
    nomineeOfficeTel: formData.nomineeOfficeTel || formData.nominees?.[0]?.officeTelNo || '',
    nomineeBlock: formData.nomineeBlock || '',
    nomineeBlockNo: formData.nomineeBlockNo || '',
    nomineeStreetName: formData.nomineeStreetName || '',
    nomineeUnitNo: formData.nomineeUnitNo || '',
    nomineePostalCode: formData.nomineePostalCode || '',
    nomineeCountry: formData.nomineeCountry || formData.applicantCountry || 'Singapore',
    nomineeName2: formData.nomineeName2 || formData.nominees?.[1]?.fullName || formData.nominees?.[1]?.name || '',
    nomineeIDNo2: formData.nomineeIDNo2 || formData.nominees?.[1]?.nric || '',
    nomineeRelationship2: formData.nomineeRelationship2 || formData.nominees?.[1]?.relationship || '',
    nomineeAddress2: formData.nomineeAddress2 || formData.nominees?.[1]?.address || '',
    nomineePhone2: formData.nomineePhone2 || formData.nominees?.[1]?.contactNumber || formData.nominees?.[1]?.phone || '',
    nomineeEmail2: formData.nomineeEmail2 || formData.nominees?.[1]?.email || '',
    nomineeStatus2: formData.nomineeStatus2 || formData.nominees?.[1]?.status || 'Active',
    nomineeHomeTel2: formData.nomineeHomeTel2 || formData.nominees?.[1]?.homeTelNo || '',
    nomineeOfficeTel2: formData.nomineeOfficeTel2 || formData.nominees?.[1]?.officeTelNo || '',
    nomineeBlock2: formData.nomineeBlock2 || '',
    nomineeBlockNo2: formData.nomineeBlockNo2 || '',
    nomineeStreetName2: formData.nomineeStreetName2 || '',
    nomineeUnitNo2: formData.nomineeUnitNo2 || '',
    nomineePostalCode2: formData.nomineePostalCode2 || '',
    nomineeCountry2: formData.nomineeCountry2 || formData.applicantCountry || 'Singapore',
    
    // Step 6: Invoice & Receipt
    invoice: formData.invoice || {}
  };
};

// Helper function to create API request from normalized form data
export const createNicheApplicationRequest = (formData: NicheApplicationFormData) => {
  const normalizedData = normalizeFormData(formData);
  console.log('Normalized Data:', normalizedData)
  
  return {
    nicheId: normalizedData.nicheId,
    applicantName: normalizedData.applicantName,
    applicantIDNo: normalizedData.applicantIDNo,
    applicantEmail: normalizedData.applicantEmail,
    applicantPhone: normalizedData.applicantPhone,
    applicantAddress: normalizedData.applicantAddress,
    applicantHomeTel: normalizedData.applicantHomeTel,
    applicantOfficeTel: normalizedData.applicantOfficeTel,
    // Map structured applicant address fields to DB layout
    applicantAddressNo: normalizedData.applicantBlock && normalizedData.applicantBlock !== '' ? normalizedData.applicantBlock : 'No',
    applicantAddressLine1: normalizedData.applicantBlockNo,
    applicantAddressLine2: normalizedData.applicantStreetName,
    applicantAddressCity: normalizedData.applicantUnitNo,
    applicantAddressState: normalizedData.applicantPostalCode,
    applicantAddressCountry: normalizedData.applicantCountry,
    applicantReligion: normalizedData.applicantReligion,
    applicantIsCatholic: normalizedData.applicantIsCatholic,
    contactStatus: normalizedData.contactStatus || 'Active',
    nomineeName: normalizedData.nomineeName,
    nomineeIDNo: normalizedData.nomineeIDNo,
    nomineeRelationship: normalizedData.nomineeRelationship,
    nomineeAddress: normalizedData.nomineeAddress,
    // Map structured nominee address fields (primary nominee) to DB layout
    nomineeAddressNo: normalizedData.nomineeBlock && normalizedData.nomineeBlock !== '' ? normalizedData.nomineeBlock : 'No',
    nomineeAddressLine1: normalizedData.nomineeBlockNo,
    nomineeAddressLine2: normalizedData.nomineeStreetName,
    nomineeAddressCity: normalizedData.nomineeUnitNo,
    nomineeAddressState: normalizedData.nomineePostalCode,
    nomineeAddressCountry: normalizedData.nomineeCountry || normalizedData.applicantCountry,
    nomineePhone: normalizedData.nomineePhone,
    nomineeEmail: normalizedData.nomineeEmail,
    nomineeStatus: normalizedData.nomineeStatus || 'Active',
    nomineeHomeTel: normalizedData.nomineeHomeTel,
    nomineeOfficeTel: normalizedData.nomineeOfficeTel,
    nomineeAddressNo2: normalizedData.nomineeBlock2 && normalizedData.nomineeBlock2 !== '' ? normalizedData.nomineeBlock2 : 'No',
    nomineeAddressLine12: normalizedData.nomineeBlockNo2,
    nomineeAddressLine22: normalizedData.nomineeStreetName2,
    nomineeAddressCity2: normalizedData.nomineeUnitNo2,
    nomineeAddressState2: normalizedData.nomineePostalCode2,
    nomineeAddressCountry2: normalizedData.nomineeCountry2 || normalizedData.applicantCountry,
    nomineePhone2: normalizedData.nomineePhone2,
    nomineeEmail2: normalizedData.nomineeEmail2,
    nomineeStatus2: normalizedData.nomineeStatus2 || 'Active',
    nomineeHomeTel2: normalizedData.nomineeHomeTel2,
    nomineeOfficeTel2: normalizedData.nomineeOfficeTel2,
    beneficiary1: normalizedData.beneficiary1,
    beneficiaries: (normalizedData.beneficiaries || []).map((beneficiary: any, index: number) => ({
      id: beneficiary.id || index + 1,
      fullName: beneficiary.fullName || beneficiary.name || '',
      nric: beneficiary.nric || beneficiary.idNo || '',
      relationship: beneficiary.relationship || beneficiary.relationshipToApplicant || '',
      status: beneficiary.status || 'Active',
      religion: beneficiary.religion || '',
      dateOfBirth: beneficiary.dateOfBirth || '',
      relationshipToNominee1: beneficiary.relationshipToNominee1 || '',
      relationshipToNominee2: beneficiary.relationshipToNominee2 || ''
    })),
    nominees: (normalizedData.nominees || []).map((nominee: any, index: number) => ({
      id: nominee.id || index + 1,
      fullName: nominee.fullName || nominee.name || '',
      nric: nominee.nric || nominee.nomineeIDNo || '',
      relationship: nominee.relationship || nominee.relationshipToApplicant || '',
      address: nominee.address || '',
      contactNumber: nominee.contactNumber || nominee.phone || nominee.nomineePhone || '',
      email: nominee.email || nominee.nomineeEmail || '',
      dateOfBirth: nominee.dateOfBirth || '',
      officeTelNo: nominee.officeTelNo || '',
      homeTelNo: nominee.homeTelNo || '',
      status: nominee.status || normalizedData.nomineeStatus || 'Active'
    })),
    consentForms: normalizedData.consentForms,
    // Add niche details for invoice
    nicheDetails: {
      chapel: normalizedData.chapel,
      chapelId: normalizedData.chapelId,
      chapelCode: normalizedData.chapelCode,
      nicheCode: normalizedData.nicheCode,
      nicheNumber: normalizedData.nicheNumber,
      wallName: normalizedData.wallName,
      wallCode: normalizedData.wallCode,
      rowNumber: normalizedData.rowNumber,
      rowLevel: normalizedData.rowLevel
    }
  };
};

export interface PreviewField {
  label: string;
  value: string | number | null | undefined;
}

export interface PreviewListItem {
  key: string;
  value: string;
  meta?: Record<string, string>;
}

export interface PreviewSection {
  title: string;
  fields?: PreviewField[];
  list?: PreviewListItem[];
}

export interface NicheApplicationPreview {
  request: ReturnType<typeof createNicheApplicationRequest>;
  sections: PreviewSection[];
}

const defaultPreviewValues = {
  nicheId: 1001,
  applicantName: 'John Tan',
  applicantIDNo: 'S1234567A',
  applicantEmail: 'john.tan@example.com',
  applicantPhone: '+65 9123 4567',
  applicantAddress: '123 Orchard Road, #08-09, Singapore 238888',
  applicantReligion: 'Catholic',
  contactStatus: 'Active',
  nomineeName: 'Mary Tan',
  nomineeIDNo: 'S7654321B',
  nomineeRelationship: 'Spouse',
  nomineeAddress: '123 Orchard Road, #08-09, Singapore 238888',
  nomineePhone: '+65 9234 5678',
  nomineeEmail: 'mary.tan@example.com',
  nomineeStatus: 'Active'
};

const ensureValue = (value: any, fallback: any) => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return fallback;
  }
  return value;
};

export const createNicheApplicationPreview = (formData: NicheApplicationFormData): NicheApplicationPreview => {
  const request = createNicheApplicationRequest(formData);

  const enrichedRequest = {
    ...defaultPreviewValues,
    ...request,
    beneficiary1: {
      name: ensureValue(request.beneficiary1?.name, 'Peter Tan'),
      relationshipToApplicant: ensureValue(request.beneficiary1?.relationshipToApplicant, 'Son')
    },
    beneficiaries: (request.beneficiaries && request.beneficiaries.length > 0
      ? request.beneficiaries
      : [
          {
            id: 1,
            fullName: 'Peter Tan',
            nric: 'S1122334C',
            relationship: 'Son',
            status: 'Active',
            religion: 'Catholic',
            dateOfBirth: '1998-04-17',
            relationshipToNominee1: 'Son',
            relationshipToNominee2: ''
          },
          {
            id: 2,
            fullName: 'Patricia Tan',
            nric: 'S3344556D',
            relationship: 'Daughter',
            status: 'Active',
            religion: 'Catholic',
            dateOfBirth: '2001-09-03',
            relationshipToNominee1: 'Daughter',
            relationshipToNominee2: ''
          }
        ]) as any[],
    nominees: (request.nominees && request.nominees.length > 0
      ? request.nominees
      : [
          {
            id: 1,
            fullName: 'Mary Tan',
            nric: 'S7654321B',
            relationship: 'Spouse',
            address: '123 Orchard Road, #08-09, Singapore 238888',
            contactNumber: '+65 9234 5678',
            email: 'mary.tan@example.com',
            dateOfBirth: '1975-06-12',
            officeTelNo: '+65 6000 7890',
            homeTelNo: '+65 6123 4567',
            status: 'Active'
          },
          {
            id: 2,
            fullName: 'Michael Tan',
            nric: 'S5566778E',
            relationship: 'Brother',
            address: '55 Ang Mo Kio Ave 8, Singapore 569841',
            contactNumber: '+65 9345 6789',
            email: 'michael.tan@example.com',
            dateOfBirth: '1970-02-02',
            officeTelNo: '+65 6111 2222',
            homeTelNo: '+65 6122 3344',
            status: 'Non-Active'
          }
        ]) as any[],
    nicheDetails: {
      chapel: ensureValue(request.nicheDetails?.chapel, 'St. Francis Chapel'),
      chapelId: ensureValue(request.nicheDetails?.chapelId, 21),
      chapelCode: ensureValue(request.nicheDetails?.chapelCode, 'SFC'),
      nicheCode: ensureValue(request.nicheDetails?.nicheCode, 'SFC-A1-01'),
      nicheNumber: ensureValue(request.nicheDetails?.nicheNumber, 'A1-01'),
      wallName: ensureValue(request.nicheDetails?.wallName, 'Annunciation Wall'),
      wallCode: ensureValue(request.nicheDetails?.wallCode, 'AW-01'),
      rowNumber: ensureValue(request.nicheDetails?.rowNumber, '1'),
      rowLevel: ensureValue(request.nicheDetails?.rowLevel, 1)
    }
  } as ReturnType<typeof createNicheApplicationRequest>;

  const sections: PreviewSection[] = [
    {
      title: 'Applicant',
      fields: [
        { label: 'Name', value: enrichedRequest.applicantName },
        { label: 'ID / Passport', value: enrichedRequest.applicantIDNo },
        { label: 'Email', value: enrichedRequest.applicantEmail },
        { label: 'Mobile', value: enrichedRequest.applicantPhone },
        { label: 'Address', value: enrichedRequest.applicantAddress },
        { label: 'Religion', value: enrichedRequest.applicantReligion },
        { label: 'Status', value: enrichedRequest.contactStatus || 'Active' }
      ]
    },
    {
      title: 'Primary Nominee',
      fields: [
        { label: 'Name', value: enrichedRequest.nomineeName },
        { label: 'ID / Passport', value: enrichedRequest.nomineeIDNo },
        { label: 'Relationship', value: enrichedRequest.nomineeRelationship || 'Spouse' },
        { label: 'Email', value: enrichedRequest.nomineeEmail },
        { label: 'Mobile', value: enrichedRequest.nomineePhone },
        { label: 'Address', value: enrichedRequest.nomineeAddress },
        { label: 'Status', value: enrichedRequest.nomineeStatus || 'Active' }
      ]
    },
    {
      title: 'Nominees',
      list: enrichedRequest.nominees?.map((nominee: any, index: number) => ({
        key: `Nominee ${index + 1}`,
        value: `${ensureValue(nominee.fullName, 'Name Missing')} (${ensureValue(nominee.relationship, 'Relationship')}) - ${ensureValue(nominee.nric, 'NRIC')} - ${ensureValue(nominee.status, 'Active')}`,
        meta: {
          contact: ensureValue(nominee.contactNumber || nominee.phone, 'N/A'),
          email: ensureValue(nominee.email, 'N/A'),
          address: ensureValue(nominee.address, 'N/A')
        }
      })) || []
    },
    {
      title: 'Beneficiaries',
      list: enrichedRequest.beneficiaries?.map((beneficiary: any, index: number) => ({
        key: `Beneficiary ${index + 1}`,
        value: `${ensureValue(beneficiary.fullName, 'Name Missing')} (${ensureValue(beneficiary.relationship, 'Relationship')}) - ${ensureValue(beneficiary.nric, 'NRIC')}`,
        meta: {
          status: ensureValue(beneficiary.status, 'Active'),
          religion: ensureValue(beneficiary.religion, 'N/A'),
          dob: ensureValue(beneficiary.dateOfBirth, 'N/A')
        }
      })) || []
    },
    {
      title: 'Niche Allocation',
      fields: [
        { label: 'Chapel', value: enrichedRequest.nicheDetails?.chapel || 'N/A' },
        { label: 'Chapel Code', value: enrichedRequest.nicheDetails?.chapelCode || 'N/A' },
        { label: 'Niche Code', value: enrichedRequest.nicheDetails?.nicheCode || 'N/A' },
        { label: 'Niche Number', value: enrichedRequest.nicheDetails?.nicheNumber || 'N/A' },
        { label: 'Wall', value: enrichedRequest.nicheDetails?.wallName || 'N/A' },
        { label: 'Row Number', value: enrichedRequest.nicheDetails?.rowNumber || 'N/A' },
        { label: 'Row Level', value: `${enrichedRequest.nicheDetails?.rowLevel ?? 'N/A'}` }
      ]
    }
  ];

  return {
    request: enrichedRequest,
    sections
  };
};
