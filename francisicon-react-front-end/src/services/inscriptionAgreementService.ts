import api from './api';

export interface InscriptionAgreementData {
  // Document metadata
  inscriptionCode: string;
  applicationCode: string;
  formattedDate: string;
  
  // Document settings
  document?: {
    title: string;
    subtitle: string;
    date: string;
    reference: string;
  };
  
  // Applicant information
  applicant: {
    name: string;
    idNo?: string;
    email?: string;
    mobile?: string;
    phone?: string;
    address: string;
    addressNo?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressState?: string;
    addressCountry?: string;
    fullContact?: string;
  };
  
  // Niche information
  niche: {
    code: string;
    chapel: string;
    wall?: string;
    row?: string;
    description?: string;
    fullLocation?: string;
  };
  
  // Contact person information
  contactPerson?: {
    name: string;
    nric?: string;
    mobile?: string;
    email?: string;
  };
  
  // Nominee information
  nominees?: Array<{
    name: string;
    nric?: string;
  }>;
  
  // Deceased details
  deceased: Array<{
    name: string;
    dateOfBirth?: string;
    dateOfDeath?: string;
    internmentDate?: string;
    deathCertificateNo?: string;
    birthYear?: string;
    inscriptionText?: string;
    index?: number;
    fullName?: string;
    formattedDates?: {
      birth: string;
      death: string;
      internment: string;
    };
  }>;
  
  // Inscription details
  inscription: {
    bibleChoiceId?: number;
    bibleChoiceText?: string;
    bibleText?: string;
    additionalPhrase?: string;
    crossType: string;
    remarks?: string;
    hasBibleText?: boolean;
    hasAdditionalPhrase?: boolean;
    fullInscription?: string;
  };
  
  // Summary information
  summary?: {
    totalDeceased: number;
    hasMultipleDeceased: boolean;
    inscriptionType: string;
    hasRemarks: boolean;
  };
  
  // Payment information (if available)
  payments?: Array<{
    date: string;
    invReceipt: string;
    description: string;
    amount: number;
    gst: string;
    totalAmount: number;
  }>;
}

export interface InscriptionAgreementResponse {
  success: boolean;
  data: InscriptionAgreementData;
  message: string;
}

class InscriptionAgreementService {
  /**
   * Get inscription agreement details by code
   * @param inscriptionCode - Inscription request code (e.g., "I-5674-0")
   * @returns Promise with inscription agreement data
   */
  async getAgreementDetails(inscriptionCode: string): Promise<InscriptionAgreementData> {
    try {
      if (!inscriptionCode || inscriptionCode.trim() === '') {
        throw new InscriptionAgreementError(
          'Inscription code is required',
          'validation'
        );
      }

      const response = await api.get<InscriptionAgreementResponse>(
        `/api/inscription-agreements/${encodeURIComponent(inscriptionCode)}/pdf`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          params: {
            _t: Date.now() // Cache-busting timestamp
          }
        }
      );

      if (!response.data.success) {
        throw new InscriptionAgreementError(
          response.data.message || 'Failed to retrieve inscription agreement',
          'server',
          response.status
        );
      }

      return response.data.data;
    } catch (error: any) {
      if (error instanceof InscriptionAgreementError) {
        throw error;
      }

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status
          );
        }

        if (status === 403) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status
          );
        }

        if (status === 404) {
          throw new InscriptionAgreementError(
            errorData?.error?.message || 'Inscription agreement not found',
            'validation',
            status
          );
        }

        throw new InscriptionAgreementError(
          errorData?.error?.message || 'Server error occurred',
          'server',
          status
        );
      }

      throw new InscriptionAgreementError(
        error.message || 'Network error occurred',
        'network'
      );
    }
  }

  /**
   * Get PDF data for inscription agreement
   * @param inscriptionCode - Inscription request code
   * @returns Promise with PDF generation data
   */
  async getPdfData(inscriptionCode: string): Promise<InscriptionAgreementData> {
    try {
      const response = await api.get<InscriptionAgreementResponse>(
        `/api/inscription-agreements/${encodeURIComponent(inscriptionCode)}/pdf`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          params: {
            _t: Date.now() // Cache-busting timestamp
          }
        }
      );

      if (!response.data.success) {
        throw new InscriptionAgreementError(
          response.data.message || 'Failed to retrieve PDF data',
          'server',
          response.status
        );
      }

      return response.data.data;
    } catch (error: any) {
      if (error instanceof InscriptionAgreementError) {
        throw error;
      }

      throw new InscriptionAgreementError(
        error.message || 'Failed to retrieve PDF data',
        'server'
      );
    }
  }

  /**
   * Validate inscription agreement
   * @param inscriptionCode - Inscription request code
   * @returns Promise with validation result
   */
  async validateAgreement(inscriptionCode: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const response = await api.get<{
        success: boolean;
        data: {
          isValid: boolean;
          errors: string[];
          warnings: string[];
        };
        message: string;
      }>(`/api/inscription-agreements/${encodeURIComponent(inscriptionCode)}/validate`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        params: {
          _t: Date.now() // Cache-busting timestamp
        }
      });
  
      if (!response.data.success) {
        throw new InscriptionAgreementError(
          response.data.message || 'Validation failed',
          'server',
          response.status
        );
      }
  
      return response.data.data;
    } catch (error: any) {
      if (error instanceof InscriptionAgreementError) {
        throw error;
      }
  
      throw new InscriptionAgreementError(
        error.message || 'Validation failed',
        'server'
      );
    }
  }
}

export class InscriptionAgreementError extends Error {
  type: string;
  statusCode?: number;
  code?: string;

  constructor(message: string, type: string, statusCode?: number, code?: string) {
    super(message);
    this.name = 'InscriptionAgreementError';
    this.type = type;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export default new InscriptionAgreementService();