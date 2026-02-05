import api from './api';

// Custom error class for inscription operations
export class InscriptionError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;
  code?: string;

  constructor(
    message: string,
    type: 'auth' | 'network' | 'server' | 'validation' = 'server',
    statusCode?: number,
    code?: string
  ) {
    super(message);
    this.name = 'InscriptionError';
    this.type = type;
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Types for Inscription data
export interface InscriptionItem {
  ItemId: number;
  Name: string;
  Code: string;
  Price: number;
  ChurchId: number;
  IsRefType: number;
  DocType: string;
}

// Beneficiary type
export interface Beneficiary {
  name: string;
  dateOfBirth: string;
  birthYear: string;
  idNo: string;
  isCatholic: boolean;
  isMale: boolean;
  relationshipToApplicant: string;
  relationshipToNominee1: string;
  relationshipToNominee2: string;
}

export interface InscriptionItemsResponse {
  success: boolean;
  message?: string;
  data: {
    inscriptionRequestNo: string | null; // null when inscription doesn't exist yet
    items: InscriptionItem[];
    applicant: {
      name: string;
      nricPassportNo: string;
      address: {
        block: string;
        blockNo: string;
        street: string;
        streetName: string;
        unitNo: string;
        postalCode: string;
      };
      mobile: string;
      homeTel: string;
      emailId: string;
    };
    deceasedDetails: Array<{
      name: string;
      dateOfDeath: string;
      dateOfBirth: string;
      internmentDate: string;
      deathCertificateNo: string;
      birthYear: string;
      inscriptionText: string;
    }>;
    beneficiaries: Beneficiary[];
    additionalDetails: {
      bibleInscriptionChoiceId: number | null;
      bibleInscriptionText: string;
      additionalInscriptionPhrase: string;
      remarks: string;
      nicheApplicationCode: string;
      nicheBookingId: number | null;
    };
  };
}

export interface CreateInvoiceResponse {
  success: boolean;
  data: {
    invoiceId: number;
    invoiceCode: string;
  };
  message?: string;
}

export interface CreateInvoiceRequest {
  lines?: Array<{
    itemId: number;
    quantity: number;
    unitAmount: number;
    taxPercent?: number;
  }>;
}

// Bible Choice types
export interface BibleChoice {
  bibleInscriptionChoiceId: number;
  bibleInscriptionChoiceNo: string;
  bibleInscriptionChoiceNoValue: string;
  churchId: number;
}

export interface BibleChoicesResponse {
  success: boolean;
  message?: string;
  data: {
    choices: BibleChoice[];
    count: number;
  };
}

export interface InscriptionSearchResponse {
  success: boolean;
  message?: string;
  data: {
    records: Array<{
      code: string;
      applicantName: string;
      nicheApplicationCode: string;
      deceasedNames: string[];
      status: string;
      createdOn: string;
      deceasedCount: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

const inscriptionService = {
  /**
   * Get task-mapped inscription items for a document
   * GET /api/inscriptions/:code/items
   * Returns full response including items, applicant, deceased details, and additional details
   */
  async getInscriptionItems(code: string): Promise<InscriptionItemsResponse['data']> {
    try {
      const response = await api.get<InscriptionItemsResponse>(
        `/api/inscriptions/${encodeURIComponent(code)}/items`
      );

      if (!response.data.success) {
        throw new InscriptionError(
          response.data.message || 'Failed to fetch inscription items',
          'server',
          response.status
        );
      }

      return response.data.data;
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        if (status === 404) {
          throw new InscriptionError(
            errorData?.error?.message || 'Inscription application not found',
            'server',
            status,
            errorData?.error?.code || 'NOT_FOUND'
          );
        }

        throw new InscriptionError(
          errorData?.error?.message || errorData?.message || 'Failed to fetch inscription items',
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Create invoice for an inscription application
   * POST /api/inscriptions/:code/invoice
   */
  async createInscriptionInvoice(
    code: string,
    body: CreateInvoiceRequest = {}
  ): Promise<{ invoiceId: number; invoiceCode: string }> {
    try {
      const response = await api.post<CreateInvoiceResponse>(
        `/api/invoices/${encodeURIComponent(code)}`,
        body
      );

      if (!response.data.success) {
        throw new InscriptionError(
          response.data.message || 'Failed to create invoice',
          'server',
          response.status
        );
      }

      return response.data.data;
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionError(
            errorData?.error?.message || 'Access denied - Church ID mismatch',
            'auth',
            status,
            errorData?.error?.code || 'ACCESS_DENIED'
          );
        }

        if (status === 404) {
          throw new InscriptionError(
            errorData?.error?.message || 'Inscription application not found',
            'server',
            status,
            errorData?.error?.code || 'NOT_FOUND'
          );
        }

        // Handle business error codes
        const errorCode = errorData?.error?.code;
        if (errorCode === 'NO_MAPPED_ITEMS') {
          throw new InscriptionError(
            errorData?.error?.message || 'No inscription items configured for this application',
            'validation',
            status,
            errorCode
          );
        }

        if (errorCode === 'DUPLICATE_INVOICE') {
          throw new InscriptionError(
            errorData?.error?.message || 'Duplicate Invoice Found',
            'validation',
            status,
            errorCode
          );
        }

        if (errorCode === 'INVALID_REF_DOCUMENT') {
          throw new InscriptionError(
            errorData?.error?.message || `Wrong Ref Document Number: ${code}`,
            'validation',
            status,
            errorCode
          );
        }

        if (errorCode === 'VALIDATION_ERROR') {
          throw new InscriptionError(
            errorData?.error?.message || 'Invoice validation failed',
            'validation',
            status,
            errorCode
          );
        }

        throw new InscriptionError(
          errorData?.error?.message || errorData?.message || 'Failed to create invoice',
          'server',
          status,
          errorCode
        );
      }

      if (error.request) {
        throw new InscriptionError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Get Bible inscription choices
   * GET /bible-choices (no /api prefix based on user's endpoint)
   */
  async getBibleChoices(): Promise<BibleChoice[]> {
    try {
      const response = await api.get<BibleChoicesResponse>('/bible-choices');

      if (!response.data.success) {
        throw new InscriptionError(
          response.data.message || 'Failed to fetch bible choices',
          'server',
          response.status
        );
      }

      return response.data.data.choices;
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        throw error;
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        throw new InscriptionError(
          errorData?.error?.message || errorData?.message || 'Failed to fetch bible choices',
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Create a new inscription application
   * POST /api/inscriptions
   */
  async createInscription(data: {
    applicant: {
      name: string;
      nricPassportNo: string;
      address: {
        block: string;
        blockNo: string;
        street: string;
        streetName: string;
        unitNo: string;
        postalCode: string;
      };
      mobile: string;
      homeTel: string;
      emailId: string;
    };
    deceasedDetails?: Array<{
      name: string;
      dateOfDeath: string;
      dateOfBirth: string;
      internmentDate: string;
      deathCertificateNo: string;
      birthYear: string;
      inscriptionText: string;
    }>;
    inscription?: {
      bibleInscriptionChoiceId: number | null;
      bibleInscriptionText: string;
      additionalInscriptionPhrase: string;
      remarks: string;
      nicheApplicationCode: string;
      nicheBookingId: number | null;
    };
  }): Promise<{ code: string; message: string }> {
    try {
      // Transform address components back to database format
      const applicantData = {
        applicantName: data.applicant.name,
        applicantIDNo: data.applicant.nricPassportNo,
        applicantEmailID: data.applicant.emailId,
        applicantMobileNo: data.applicant.mobile,
        applicantHomeTelNo: data.applicant.homeTel,
        applicantOfficeTelNo: '',
        applicantAddressNo: data.applicant.address.block || '',
        applicantAddressLine1: data.applicant.address.street || '',
        applicantAddressLine2: data.applicant.address.unitNo || '',
        applicantAddressCity: `${data.applicant.address.postalCode || ''}`.trim() || '',
        applicantAddressState: '',
        applicantAddressCountry: ''
      };

      const requestBody = {
        applicant: applicantData,
        deceasedDetails: data.deceasedDetails || [],
        inscription: data.inscription || {}
      };

      const response = await api.post<{
        success: boolean;
        code: string;
        message: string;
      }>('/api/inscriptions', requestBody);

      if (!response.data.success) {
        throw new InscriptionError(
          response.data.message || 'Failed to create inscription',
          'server',
          response.status
        );
      }

      return {
        code: response.data.code,
        message: response.data.message || 'Inscription created successfully'
      };
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        throw error;
      }

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        if (status === 400) {
          throw new InscriptionError(
            errorData?.error?.message || errorData?.message || 'Validation failed',
            'validation',
            status,
            errorData?.error?.code
          );
        }

        throw new InscriptionError(
          errorData?.error?.message || errorData?.message || 'Failed to create inscription',
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Update an existing inscription application
   * PUT /api/inscriptions/:code
   */
  async updateInscription(
    code: string,
    data: {
      applicant: {
        name: string;
        nricPassportNo: string;
        address: {
          block: string;
          blockNo: string;
          street: string;
          streetName: string;
          unitNo: string;
          postalCode: string;
        };
        mobile: string;
        homeTel: string;
        emailId: string;
      };
      deceasedDetails?: Array<{
        name: string;
        dateOfDeath: string;
        dateOfBirth: string;
        internmentDate: string;
        deathCertificateNo: string;
        birthYear: string;
        inscriptionText: string;
      }>;
      inscription?: {
        bibleInscriptionChoiceId: number | null;
        bibleInscriptionText: string;
        additionalInscriptionPhrase: string;
        remarks: string;
      };
    }
  ): Promise<{ code: string; message: string }> {
    try {
      // Transform address components back to database format
      const applicantData = {
        applicantName: data.applicant.name,
        applicantIDNo: data.applicant.nricPassportNo,
        applicantEmailID: data.applicant.emailId,
        applicantMobileNo: data.applicant.mobile,
        applicantHomeTelNo: data.applicant.homeTel,
        applicantOfficeTelNo: '',
        applicantAddressNo: data.applicant.address.block || '',
        applicantAddressLine1: data.applicant.address.street || '',
        applicantAddressLine2: data.applicant.address.unitNo || '',
        applicantAddressCity: `${data.applicant.address.postalCode || ''}`.trim() || '',
        applicantAddressState: '',
        applicantAddressCountry: ''
      };

      const requestBody = {
        applicant: applicantData,
        deceasedDetails: data.deceasedDetails || [],
        inscription: data.inscription || {}
      };

      const response = await api.put<{
        success: boolean;
        code: string;
        message: string;
      }>(`/api/inscriptions/${encodeURIComponent(code)}`, requestBody);

      if (!response.data.success) {
        throw new InscriptionError(
          response.data.message || 'Failed to update inscription',
          'server',
          response.status
        );
      }

      return {
        code: response.data.code,
        message: response.data.message || 'Inscription updated successfully'
      };
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        throw error;
      }

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        if (status === 404) {
          throw new InscriptionError(
            errorData?.error?.message || 'Inscription not found',
            'server',
            status,
            errorData?.error?.code || 'NOT_FOUND'
          );
        }

        if (status === 400) {
          throw new InscriptionError(
            errorData?.error?.message || errorData?.message || 'Validation failed',
            'validation',
            status,
            errorData?.error?.code
          );
        }

        throw new InscriptionError(
          errorData?.error?.message || errorData?.message || 'Failed to update inscription',
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  },

  /**
   * Search inscription applications
   * GET /api/inscriptions
   */
  async searchInscriptions(filters: {
    searchTerm?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<InscriptionSearchResponse['data']> {
    try {
      const params = new URLSearchParams();
      
      if (filters.searchTerm) {
        params.append('searchTerm', filters.searchTerm);
      }
      if (filters.fromDate) {
        params.append('fromDate', filters.fromDate);
      }
      if (filters.toDate) {
        params.append('toDate', filters.toDate);
      }
      if (filters.page) {
        params.append('page', filters.page.toString());
      }
      if (filters.pageSize) {
        params.append('pageSize', filters.pageSize.toString());
      }

      const queryString = params.toString();
      const url = `/api/inscriptions${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get<InscriptionSearchResponse>(url);

      if (!response.data.success) {
        throw new InscriptionError(
          response.data.message || 'Failed to search inscriptions',
          'server',
          response.status
        );
      }

      return response.data.data;
    } catch (error: any) {
      if (error instanceof InscriptionError) {
        throw error;
      }

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new InscriptionError(
            errorData?.error?.message || 'Unauthorized',
            'auth',
            status,
            errorData?.error?.code
          );
        }

        if (status === 403) {
          throw new InscriptionError(
            errorData?.error?.message || 'Access denied',
            'auth',
            status,
            errorData?.error?.code || 'FORBIDDEN'
          );
        }

        throw new InscriptionError(
          errorData?.error?.message || errorData?.message || 'Failed to search inscriptions',
          'server',
          status,
          errorData?.error?.code
        );
      }

      if (error.request) {
        throw new InscriptionError(
          'Network error: Unable to connect to server',
          'network'
        );
      }

      throw new InscriptionError(
        error.message || 'An unexpected error occurred',
        'server'
      );
    }
  }
};

export default inscriptionService;

