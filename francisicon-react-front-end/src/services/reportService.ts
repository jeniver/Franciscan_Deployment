import api from './api';

// Custom error class for report operations
export class ReportError extends Error {
  type: 'auth' | 'network' | 'server' | 'validation';
  statusCode?: number;

  constructor(message: string, type: 'auth' | 'network' | 'server' | 'validation' = 'server', statusCode?: number) {
    super(message);
    this.name = 'ReportError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Report types and interfaces
export interface ReportInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  endpoint: string;
}

export interface MonthlyReportParams {
  fromDate: string;
  toDate: string;
}

export interface InvoiceReceiptReportParams {
  invoiceCode: string;
  address?: string;
  districtCode?: string;
}

export interface ChapelReportParams {
  chapel: string;
  level?: number;
  month?: number;
}

export interface ReportResponse {
  success: boolean;
  data?: Blob | string;
  message?: string;
  url?: string;
}

// Report Service
export const reportService = {
  // Get list of all available reports
  getAvailableReports: async (): Promise<ReportInfo[]> => {
    try {
      const response = await api.get('/api/reports');
      return response.data?.reports || response.data || [];
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch available reports',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Invoice & Receipt Reports
  getInvoiceReceiptReport: async (params: InvoiceReceiptReportParams): Promise<Blob> => {
    try {
      if (!params.invoiceCode) {
        throw new ReportError('Invoice code is required', 'validation');
      }

      const queryParams: Record<string, string> = {};
      if (params.address) queryParams.address = params.address;
      if (params.districtCode) queryParams.districtCode = params.districtCode;

      const response = await api.get(`/api/reports/invoices/receipt/${params.invoiceCode}`, {
        params: queryParams,
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 404) {
          throw new ReportError('Invoice not found', 'validation', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate invoice receipt report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Inscription Reports
  getInscriptionReport: async (insCode: string): Promise<Blob> => {
    try {
      if (!insCode) {
        throw new ReportError('Inscription code is required', 'validation');
      }

      const response = await api.get(`/api/reports/inscriptions/${insCode}`, {
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 404) {
          throw new ReportError('Inscription not found', 'validation', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate inscription report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Monthly Reports - Get JSON data
  getMonthlyReceiptsReportData: async (params: MonthlyReportParams): Promise<any> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/monthly/receipts', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch monthly receipts report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Monthly Reports - Get PDF Blob (for backward compatibility)
  getMonthlyReceiptsReport: async (params: MonthlyReportParams): Promise<Blob> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/monthly/receipts', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate monthly receipts report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Monthly Inscriptions - JSON analytics data
  getMonthlyInscriptionsReportData: async (params: MonthlyReportParams): Promise<any> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/monthly/inscriptions', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch monthly inscriptions report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getMonthlyInscriptionsReport: async (params: MonthlyReportParams): Promise<Blob> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/monthly/inscriptions', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate monthly inscriptions report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getMonthlyWakeRoomsReport: async (params: MonthlyReportParams): Promise<Blob> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/monthly/wakerooms', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate monthly wake rooms report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Monthly Wake Rooms - JSON analytics data
  getMonthlyWakeRoomsReportData: async (params: MonthlyReportParams): Promise<any> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/monthly/wakerooms', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch monthly wake rooms report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getMonthlyGOAReportData: async (params: MonthlyReportParams): Promise<any> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/monthly/goa', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch monthly GOA report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getMonthlyGOAReport: async (params: MonthlyReportParams): Promise<Blob> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/monthly/goa', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate monthly GOA report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Niche Reports - JSON Data
  getNichesSoldToBothReportData: async (): Promise<any> => {
    try {
      const response = await api.get('/api/reports/niches/sold-both');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch niches sold to both report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getNichesSoldToCatholicReportData: async (): Promise<any> => {
    try {
      const response = await api.get('/api/reports/niches/sold-catholic');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch niches sold to Catholic report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getNichesSoldToNonCatholicReportData: async (): Promise<any> => {
    try {
      const response = await api.get('/api/reports/niches/sold-noncatholic');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch niches sold to non-Catholic report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getRenewalNichesReportData: async (): Promise<any> => {
    try {
      const response = await api.get('/api/reports/niches/renewal');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch renewal niches report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getSameAddressNichesReportData: async (): Promise<any> => {
    try {
      const response = await api.get('/api/reports/niches/same-address');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch same address niches report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Niche Reports - PDF
  getNichesSoldToBothReport: async (): Promise<Blob> => {
    try {
      const response = await api.get('/api/reports/niches/sold-both', {
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate niches sold to both report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getNichesSoldToCatholicReport: async (): Promise<Blob> => {
    try {
      const response = await api.get('/api/reports/niches/sold-catholic', {
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate niches sold to Catholic report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getNichesSoldToNonCatholicReport: async (): Promise<Blob> => {
    try {
      const response = await api.get('/api/reports/niches/sold-noncatholic', {
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate niches sold to non-Catholic report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getRenewalNichesReport: async (): Promise<Blob> => {
    try {
      const response = await api.get('/api/reports/niches/renewal', {
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate renewal niches report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getSameAddressNichesReport: async (): Promise<Blob> => {
    try {
      const response = await api.get('/api/reports/niches/same-address', {
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate same address niches report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Chapel Reports
  getChapelLevelReport: async (params: ChapelReportParams): Promise<Blob> => {
    try {
      if (!params.chapel || params.level === undefined) {
        throw new ReportError('Chapel code and level are required', 'validation');
      }

      const response = await api.get('/api/reports/chapel/level', {
        params: {
          chapel: params.chapel,
          level: params.level,
        },
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid chapel parameters',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate chapel level report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getChapelMonthReport: async (params: ChapelReportParams): Promise<Blob> => {
    try {
      if (!params.chapel || params.month === undefined) {
        throw new ReportError('Chapel code and month are required', 'validation');
      }

      const response = await api.get('/api/reports/chapel/month', {
        params: {
          chapel: params.chapel,
          month: params.month,
        },
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid chapel parameters',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate chapel month report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getChapelVacancyReport: async (chapel: string): Promise<Blob> => {
    try {
      if (!chapel) {
        throw new ReportError('Chapel code is required', 'validation');
      }

      const response = await api.get('/api/reports/chapel/vacancy', {
        params: { chapel },
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid chapel code',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate chapel vacancy report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Other Reports
  getBeneficiariesListReport: async (): Promise<Blob> => {
    try {
      const response = await api.get('/api/reports/beneficiaries/list', {
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate beneficiaries list report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getGSTReportData: async (params: MonthlyReportParams): Promise<any> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/gst/report', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to fetch GST report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  getGSTReport: async (params: MonthlyReportParams): Promise<Blob> => {
    try {
      if (!params.fromDate || !params.toDate) {
        throw new ReportError('From date and to date are required', 'validation');
      }

      const response = await api.get('/api/reports/gst/report', {
        params: {
          fromDate: params.fromDate,
          toDate: params.toDate,
        },
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new ReportError('Unauthorized access', 'auth', status);
        } else if (status === 400) {
          throw new ReportError(
            error.response.data?.message || 'Invalid date range',
            'validation',
            status
          );
        } else if (status >= 500) {
          throw new ReportError('Server error occurred', 'server', status);
        } else {
          throw new ReportError(
            error.response.data?.message || 'Failed to generate GST report',
            'server',
            status
          );
        }
      } else if (error.request) {
        throw new ReportError('Network error: Unable to connect to server', 'network');
      } else {
        throw new ReportError(error.message || 'An unexpected error occurred', 'server');
      }
    }
  },

  // Helper function to create PDF URL for viewing (returns blob URL)
  createPdfUrl: (blob: Blob): string => {
    return URL.createObjectURL(blob);
  },

  // Helper function to revoke PDF URL (cleanup)
  revokePdfUrl: (url: string): void => {
    URL.revokeObjectURL(url);
  },
};

export default reportService;

