import api from './api';

// Custom error class for inscription agreement operations
export class InscriptionAgreementError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation' | 'not_found';
  statusCode?: number;
  code?: string;

  constructor(
    message: string,
    type: 'auth' | 'network' | 'server' | 'validation' | 'not_found' = 'server',
    statusCode?: number,
    code?: string
  ) {
    super(message);
    this.name = 'InscriptionAgreementError';
    this.type = type;
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Types for Inscription Agreement data
export interface InscriptionAgreementDetails {
  NicheInscriptionRequestId: number;
  InscriptionCode: string;
  InscriptionStatus: number;
  InscriptionCreatedOn: string;
  InscriptionModifiedOn: string;
  
  // Applicant information
  ApplicationCode: string;
  ApplicantName: string;
  ApplicantIDNo: string;
  ApplicantEmailID: string;
  ApplicantMobileNo: string;
  ApplicantHomeTelNo: string;
  ApplicantAddressNo: string;
  ApplicantAddressLine1: string;
  ApplicantAddressLine2: string;
  ApplicantAddressCity: string;
  ApplicantAddressState: string;
  ApplicantAddressCountry: string;
  
  // Niche information
  NicheCode: string;
  AppearanceDescription: string;
  RowCode: string;
  WallCode: string;
  WallName: string;
  ChapelCode: string;
  ChapelName: string;
  
  // Booking information
  BookedDate: string;
  BookingStatus: number;
  
  // Contact person information
  ContactPersonName: string;
  ContactPersonIDNo: string;
  ContactPersonMobile: string;
  ContactPersonEmail: string;
  
  // Nominee information
  NomineeName: string;
  NomineeIDNo: string;
  Nominee2Name: string;
  Nominee2IDNo: string;
  
  // Deceased details
  deceasedDetails: Array<{
    name: string;
    dateOfBirth: string;
    dateOfDeath: string;
    internmentDate: string;
    deathCertificateNo: string;
    inscriptionText: string;
  }>;
  
  // Inscription details
  BibleInscriptionChoiceId: number | null;
  BibleInscriptionText: string;
  AdditionalInscriptionPhrase: string;
  InscriptionRemarks: string;
  
  // Bible choice information
  BibleInscriptionChoiceNo: string;
  BibleInscriptionChoiceNoValue: string;
}

export interface CrystalReportsInfo {
  InscriptionCode: string;
  ApplicationCode: string;
  AgreementDate: string;
  
  // Applicant information
  ApplicantName: string;
  ApplicantNRIC: string;
  ApplicantEmail: string;
  ApplicantMobile: string;
  ApplicantPhone: string;
  ApplicantAddress: string;
  
  // Niche information
  NicheCode: string;
  Chapel: string;
  Wall: string;
  Row: string;
  NicheDescription: string;
  
  // Contact person
  ContactPersonName: string;
  ContactPersonNRIC: string;
  ContactPersonMobile: string;
  ContactPersonEmail: string;
  
  // Nominees
  Nominee1Name: string;
  Nominee1NRIC: string;
  Nominee2Name: string;
  Nominee2NRIC: string;
  
  // Inscription details
  BibleInscriptionChoice: string;
  BibleInscriptionText: string;
  AdditionalInscriptionPhrase: string;
  InscriptionRemarks: string;
  
  // Deceased details
  DeceasedCount: number;
  DeceasedDetails: Array<{
    Name: string;
    DateOfBirth: string;
    DateOfDeath: string;
    InternmentDate: string;
    DeathCertificateNo: string;
    InscriptionText: string;
  }>;
}

export interface PdfData {
  // Document metadata
  documentTitle: string;
  inscriptionCode: string;
  applicationCode: string;
  createdDate: string;
  
  // Applicant section
  applicant: {
    name: string;
    nric: string;
    email: string;
    mobile: string;
    phone: string;
    address: string;
    fullContact: string;
  };
  
  // Niche details
  niche: {
    code: string;
    chapel: string;
    wall: string;
    row: string;
    description: string;
    fullLocation: string;
  };
  
  // Contact person
  contactPerson: {
    name: string;
    nric: string;
    mobile: string;
    email: string;
  };
  
  // Nominees
  nominees: Array<{
    name: string;
    nric: string;
  }>;
  
  // Inscription details
  inscription: {
    bibleChoiceId: number | null;
    bibleChoiceText: string;
    bibleText: string;
    additionalPhrase: string;
    remarks: string;
    hasBibleText: boolean;
    hasAdditionalPhrase: boolean;
    fullInscription: string;
  };
  
  // Deceased details
  deceased: Array<{
    index: number;
    name: string;
    fullName: string;
    dateOfBirth: string;
    dateOfDeath: string;
    internmentDate: string;
    deathCertificateNo: string;
    inscriptionText: string;
    formattedDates: {
      birth: string;
      death: string;
      internment: string;
    };
  }>;
  
  // Status information
  status: string;
  formattedDate: string;
  
  // Summary information
  summary: {
    totalDeceased: number;
    hasMultipleDeceased: boolean;
    inscriptionType: string;
    hasRemarks: boolean;
  };
  
  // Document settings
  document: {
    title: string;
    subtitle: string;
    date: string;
    reference: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TemplateDataResponse {
  success: boolean;
  data: PdfData | CrystalReportsInfo;
  message?: string;
}

const inscriptionAgreementService = {
  /**
   * Get inscription agreement details by inscription code
   * GET /api/inscription-agreements/:inscriptionCode
   */
  async getAgreementDetails(inscriptionCode: string): Promise<InscriptionAgreementDetails> {
    try {
      const response = await api.get<TemplateDataResponse>(
        `/api/inscription-agreements/${encodeURIComponent(inscriptionCode)}`
      );

      if (!response.data.success) {
        throw new InscriptionAgreementError(
          response.data.message || 'Failed to fetch inscription agreement details',
          'server',
          response.status
        );
      }

      return response.data.data as unknown as InscriptionAgreementDetails;
    } catch (error: any) {
      if (error instanceof InscriptionAgreementError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        if (status === 404) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Inscription agreement not found',
            'not_found',
            status,
            errorData?.error?.code || 'NOT_FOUND'
          );
        }

        throw new InscriptionAgreementError(
          errorData?.error?.message || errorData?.message || 'Failed to fetch inscription agreement details',
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionAgreementError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionAgreementError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Get crystal reports information for inscription agreement
   * GET /api/inscription-agreements/:inscriptionCode/reports
   */
  async getCrystalReportsInfo(inscriptionCode: string): Promise<CrystalReportsInfo> {
    try {
      const response = await api.get<TemplateDataResponse>(
        `/api/inscription-agreements/${encodeURIComponent(inscriptionCode)}/reports`
      );

      if (!response.data.success) {
        throw new InscriptionAgreementError(
          response.data.message || 'Failed to fetch Crystal Reports information',
          'server',
          response.status
        );
      }

      return response.data.data as CrystalReportsInfo;
    } catch (error: any) {
      if (error instanceof InscriptionAgreementError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        if (status === 404) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Inscription agreement not found',
            'not_found',
            status,
            errorData?.error?.code || 'NOT_FOUND'
          );
        }

        throw new InscriptionAgreementError(
          errorData?.error?.message || errorData?.message || 'Failed to fetch Crystal Reports information',
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionAgreementError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionAgreementError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Get PDF data for inscription agreement generation
   * GET /api/inscription-agreements/:inscriptionCode/pdf
   */
  async getPdfData(inscriptionCode: string): Promise<PdfData> {
    try {
      const response = await api.get<TemplateDataResponse>(
        `/api/inscription-agreements/${encodeURIComponent(inscriptionCode)}/pdf`
      );

      if (!response.data.success) {
        throw new InscriptionAgreementError(
          response.data.message || 'Failed to fetch PDF data',
          'server',
          response.status
        );
      }

      return response.data.data as PdfData;
    } catch (error: any) {
      if (error instanceof InscriptionAgreementError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        if (status === 404) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Inscription agreement not found',
            'not_found',
            status,
            errorData?.error?.code || 'NOT_FOUND'
          );
        }

        throw new InscriptionAgreementError(
          errorData?.error?.message || errorData?.message || 'Failed to fetch PDF data',
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionAgreementError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionAgreementError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Validate inscription agreement for generation
   * GET /api/inscription-agreements/:inscriptionCode/validate
   */
  async validateAgreement(inscriptionCode: string): Promise<ValidationResult> {
    try {
      const response = await api.get<{ success: boolean; data: ValidationResult; message?: string }>(
        `/api/inscription-agreements/${encodeURIComponent(inscriptionCode)}/validate`
      );

      if (!response.data.success) {
        throw new InscriptionAgreementError(
          response.data.message || 'Failed to validate inscription agreement',
          'validation',
          response.status
        );
      }

      return response.data.data;
    } catch (error: any) {
      if (error instanceof InscriptionAgreementError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        if (status === 404) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Inscription agreement not found',
            'not_found',
            status,
            errorData?.error?.code || 'NOT_FOUND'
          );
        }

        throw new InscriptionAgreementError(
          errorData?.error?.message || errorData?.message || 'Failed to validate inscription agreement',
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionAgreementError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionAgreementError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Get template data for specific format
   * GET /api/inscription-agreements/:inscriptionCode/template/:format
   */
  async getTemplateData(inscriptionCode: string, format: 'pdf' | 'crystal' | 'html'): Promise<any> {
    try {
      const response = await api.get<TemplateDataResponse>(
        `/api/inscription-agreements/${encodeURIComponent(inscriptionCode)}/template/${format}`
      );

      if (!response.data.success) {
        throw new InscriptionAgreementError(
          response.data.message || `Failed to fetch ${format} template data`,
          'server',
          response.status
        );
      }

      return response.data.data;
    } catch (error: any) {
      if (error instanceof InscriptionAgreementError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 400) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Invalid format specified',
            'validation',
            status,
            errorData?.error?.code || 'INVALID_FORMAT'
          );
        }

        if (status === 401) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        if (status === 404) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Inscription agreement not found',
            'not_found',
            status,
            errorData?.error?.code || 'NOT_FOUND'
          );
        }

        throw new InscriptionAgreementError(
          errorData?.error?.message || errorData?.message || `Failed to fetch ${format} template data`,
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionAgreementError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionAgreementError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  }
};

export default inscriptionAgreementService;