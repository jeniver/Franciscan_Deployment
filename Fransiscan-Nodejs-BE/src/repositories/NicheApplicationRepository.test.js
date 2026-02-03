const NicheApplicationRepository = require('./NicheApplicationRepository');
const { NicheApplication } = require('../models/NicheApplication');

// Mock the database executeQuery function
jest.mock('../config/database', () => ({
  executeQuery: jest.fn()
}));

const { executeQuery } = require('../config/database');

describe('NicheApplicationRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('_createWithDirectInsert', () => {
    it('should generate application ID using actual niche identifier instead of sequence', async () => {
      // Mock the niche query to return the actual niche code
      executeQuery
        .mockResolvedValueOnce({
          recordset: [{ Code: '1409-0' }] // Niche code
        })
        .mockResolvedValueOnce({
          recordset: [] // No existing applications with this niche identifier
        })
        .mockResolvedValueOnce({
          recordset: [{ NicheApplicationId: 123 }] // Insert result
        });

      const application = new NicheApplication({
        nicheId: 1,
        churchId: 1,
        applicantName: 'Test Applicant',
        amount: 100
      });

      const beneficiaries = [];

      const result = await NicheApplicationRepository._createWithDirectInsert(application, beneficiaries);

      expect(result).toBe('1409-0'); // Should use niche identifier, not sequence
      expect(executeQuery).toHaveBeenCalledTimes(4);
    });

    it('should increment suffix when multiple applications exist for same niche', async () => {
      // Mock the niche query to return the actual niche code
      executeQuery
        .mockResolvedValueOnce({
          recordset: [{ Code: '1409-0' }] // Niche code
        })
        .mockResolvedValueOnce({
          recordset: [
            { Code: '1409-0' },
            { Code: '1409-1' }
          ] // Existing applications
        })
        .mockResolvedValueOnce({
          recordset: [{ NicheApplicationId: 124 }] // Insert result
        });

      const application = new NicheApplication({
        nicheId: 1,
        churchId: 1,
        applicantName: 'Test Applicant 2',
        amount: 100
      });

      const beneficiaries = [];

      const result = await NicheApplicationRepository._createWithDirectInsert(application, beneficiaries);

      expect(result).toBe('1409-2'); // Should increment to next available suffix
    });

    it('should fallback to sequential numbering when niche identifier cannot be determined', async () => {
      // Mock the niche query to return no results (simulate error)
      executeQuery
        .mockResolvedValueOnce({
          recordset: [] // No niche found
        })
        .mockResolvedValueOnce({
          recordset: [{ Code: '7990-0' }] // Last sequential code
        })
        .mockResolvedValueOnce({
          recordset: [] // No existing applications with this sequential number
        })
        .mockResolvedValueOnce({
          recordset: [{ NicheApplicationId: 125 }] // Insert result
        });

      const application = new NicheApplication({
        nicheId: 999, // Non-existent niche ID
        churchId: 1,
        applicantName: 'Test Applicant 3',
        amount: 100
      });

      const beneficiaries = [];

      const result = await NicheApplicationRepository._createWithDirectInsert(application, beneficiaries);

      expect(result).toBe('7991-0'); // Should fallback to sequential numbering
    });
  });
});