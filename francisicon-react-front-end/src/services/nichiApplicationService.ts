import api from './api';

// Custom error class for Nichi application operations
export class NichiApplicationError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(
    message: string,
    type: 'auth' | 'network' | 'server' | 'validation' = 'server',
    statusCode?: number
  ) {
    super(message);
    this.name = 'NichiApplicationError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Types for Nichi Application data matching the response structure
export interface NichiApplicant {
  name: string;
  address: string;
  // Optional structured fields (mirroring agreement API)
  addressNo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  email: string;
  idNo: string;
  mobileNo: string;
  homeTelNo?: string;
  officeTelNo?: string;
  isCatholic?: boolean;
}

export interface NichiNominee {
  name: string;
  address: string;
  // Optional structured fields (mirroring agreement API)
  addressNo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  email: string;
  idNo: string;
  mobileNo: string;
  homeTelNo?: string;
  officeTelNo?: string;
  relationship: string;
}

export interface NichiBeneficiary {
  name: string;
  idNo: string;
  isCatholic?: boolean;
  isMale?: boolean;
  relationshipToApplicant: string;
  dateOfBirth?: string;
  birthYear?: string;
  relationshipToNominee1?: string;
  relationshipToNominee2?: string;
  status?: string;
  sex?: string;
}

export interface NichiNicheLocation {
  chapel: {
    chapelId: number;
    chapelCode: string;
    chapelName: string;
    description?: string;
  };
  wall: {
    wallId: number;
    wallCode: string;
    wallName: string;
  };
  row: {
    rowId: number;
    rowCode: string;
    level: number;
  };
}

export interface NichiNiche {
  number: string;
  code: string;
  rowNumber?: number | null;
  wallName?: string | null;
  chapelName?: string | null;
  totalAmount: number;
  lineAmount: number;
  location: NichiNicheLocation;
}

export interface NichiInvoice {
  invoiceNo: string;
  invoiceDate: string;
  receiptNo?: string;
  receiptDate?: string;
  receiptAmount?: number;
  taxAmount: number;
  invoicePayingAmount: number;
  receiptPayingAmount?: number;
  totalAmount: number;
  paymentMode: number | string;
  paymentModeDocNo?: string;
  refDocNumber: string;
}

export interface NichiDeceased {
  deceased1: {
    name: string | null;
    dateDied: string | null;
    internmentDate: string | null;
    deathCertificateNo: string | null;
  };
  deceased2?: {
    name: string | null;
    dateDied: string | null;
    internmentDate: string | null;
    deathCertificateNo: string | null;
  };
}

export interface NichiStorage {
  storageFrom?: string;
  storageTo?: string;
}

export interface NichiConsentForm {
  status: string;
  timestamp?: string | null;
  submittedBy?: string | null;
  notes?: string | null;
}

export interface NichiAgreement {
  status: string;
  timestamp?: string | null;
  signedBy?: string | null;
  notes?: string | null;
}

export interface NichiMetadata {
  generatedAt: string;
  applicationNumber: string;
  hasInvoice?: boolean;
  hasReceipt?: boolean;
  beneficiaryCount?: number;
  nomineeCount?: number;
}

export interface NichiAdditionalDetails {
  bibleInscriptionChoiceId?: number | null;
  bibleInscriptionText?: string;
  additionalInscriptionPhrase?: string;
  crossType?: string;
  remarks?: string;
}

// Request body structure for creating Nichi application
export interface NichiNicheDetails {
  chapel?: string;
  chapelId?: number;
  chapelCode?: string;
  nicheCode?: string;
  nicheNumber?: string;
  nicheId?: number;
  wallName?: string;
  wallCode?: string;
  rowNumber?: string;
  rowLevel?: string;
}

export interface CreateNichiApplicationRequest {
  applicationCode?: string;
  appliedDate?: string;
  agreementDate?: string;
  applicant: NichiApplicant;
  nominee?: NichiNominee;
  nominee2?: NichiNominee;
  beneficiaries?: NichiBeneficiary[];
  niche: NichiNiche;
  nicheDetails?: NichiNicheDetails;
  invoice: NichiInvoice;
  deceased?: NichiDeceased;
  storage?: NichiStorage;
  consentForm?: NichiConsentForm;
  agreement?: NichiAgreement;
  additionalDetails?: NichiAdditionalDetails;
  remarks?: string;
}

// Response structure (excluding crystalReports)
export interface NichiApplicationResponse {
  success: boolean;
  message: string;
  data: {
    applicationCode: string;
    appliedDate: string;
    agreementDate: string;
    applicant: NichiApplicant;
    nominee?: NichiNominee;
    nominee2?: NichiNominee;
    beneficiaries: NichiBeneficiary[];
    niche: NichiNiche;
    invoice: NichiInvoice;
    deceased?: NichiDeceased;
    storage?: NichiStorage;
    consentForm?: NichiConsentForm;
    agreement?: NichiAgreement;
    remarks?: string;
    metadata: NichiMetadata;
    printReady?: {
      agreementReady?: boolean;
      invoiceReady?: boolean;
      receiptReady?: boolean;
      consentFormReady?: boolean;
    };
  };
}

// Nichi Application Service
export const nichiApplicationService = {
  /**
   * Create a new Nichi application
   * POST /api/nichi-applications (or appropriate endpoint)
   * 
   * @param applicationData - The Nichi application data
   * @returns Created application response
   */
  createNichiApplication: async (
    applicationData: CreateNichiApplicationRequest
  ): Promise<NichiApplicationResponse> => {
    try {
      // Remove crystalReports if present (shouldn't be in request, but just in case)
      const { crystalReports, ...cleanData } = applicationData as any;
      
      const response = await api.post<NichiApplicationResponse>(
        '/api/nichi-applications',
        cleanData
      );

      if (!response.data.success) {
        throw new NichiApplicationError(
          response.data.message || 'Failed to create Nichi application',
          'server',
          response.status
        );
      }

      // Remove crystalReports from response if present
      if (response.data.data && (response.data.data as any).crystalReports) {
        const { crystalReports: _, ...cleanResponseData } = response.data.data as any;
        response.data.data = cleanResponseData;
      }

      return response.data;
    } catch (error: any) {
      if (error instanceof NichiApplicationError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Unauthorized',
            'auth',
            status
          );
        }

        if (status === 403) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Access denied',
            'auth',
            status
          );
        }

        if (status === 400) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Invalid application data',
            'validation',
            status
          );
        }

        if (status === 404) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Resource not found',
            'server',
            status
          );
        }

        if (status === 409) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Application already exists',
            'validation',
            status
          );
        }

        if (status >= 500) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Server error occurred',
            'server',
            status
          );
        }

        throw new NichiApplicationError(
          errorData?.error?.message || errorData?.message || 'Failed to create Nichi application',
          'server',
          status
        );
      }

      if (error.request) {
        throw new NichiApplicationError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new NichiApplicationError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Get a Nichi application by application code/number
   * GET /api/nichi-applications/:code (or appropriate endpoint)
   * 
   * @param applicationCode - The application code/number
   * @returns Application response
   */
  getNichiApplication: async (
    applicationCode: string
  ): Promise<NichiApplicationResponse> => {
    try {
      if (!applicationCode || !applicationCode.trim()) {
        throw new NichiApplicationError(
          'Application code is required',
          'validation',
          400
        );
      }

      const response = await api.get<NichiApplicationResponse>(
        `/api/nichi-applications/${encodeURIComponent(applicationCode.trim())}`
      );

      if (!response.data.success) {
        throw new NichiApplicationError(
          response.data.message || 'Failed to retrieve Nichi application',
          'server',
          response.status
        );
      }

      // Remove crystalReports from response if present
      if (response.data.data && (response.data.data as any).crystalReports) {
        const { crystalReports: _, ...cleanResponseData } = response.data.data as any;
        response.data.data = cleanResponseData;
      }

      return response.data;
    } catch (error: any) {
      if (error instanceof NichiApplicationError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Unauthorized',
            'auth',
            status
          );
        }

        if (status === 403) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Access denied',
            'auth',
            status
          );
        }

        if (status === 404) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Application not found',
            'server',
            status
          );
        }

        if (status >= 500) {
          throw new NichiApplicationError(
            errorData?.error?.message || errorData?.message || 'Server error occurred',
            'server',
            status
          );
        }

        throw new NichiApplicationError(
          errorData?.error?.message || errorData?.message || 'Failed to retrieve Nichi application',
          'server',
          status
        );
      }

      if (error.request) {
        throw new NichiApplicationError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new NichiApplicationError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },
};

export default nichiApplicationService;

