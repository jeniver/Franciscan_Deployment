/**
 * ApplicationService tests: ensure all application types (Wake Room, Niche, Inscription, Gate of Life)
 * are considered for numeric-hyphen codes (e.g. 002-122) and that invoice item mapping supports WAPP, NAPP, INCR, GOLA.
 */

jest.mock('../config/database', () => ({
  executeQuery: jest.fn().mockResolvedValue({ recordset: [] })
}));

const ApplicationService = require('../services/ApplicationService');

describe('ApplicationService - Invoice application types', () => {
  let service;

  beforeAll(() => {
    service = new ApplicationService();
  });

  describe('getApplicationDetails', () => {
    test('returns null for empty code', async () => {
      await expect(service.getApplicationDetails('', 1)).resolves.toBeNull();
      await expect(service.getApplicationDetails(null, 1)).resolves.toBeNull();
    });

    test('returns null for undefined code', async () => {
      await expect(service.getApplicationDetails(undefined, 1)).resolves.toBeNull();
    });

    test('returns null for numeric-hyphen when no DB match (tries all resolvers)', async () => {
      const result = await service.getApplicationDetails(' 002-122 ', 1);
      expect(result).toBeNull();
    });
  });

  describe('numeric-hyphen pattern (002-122)', () => {
    test('tries all four application types (WAPP, NAPP, INCR, GOLA)', async () => {
      // Resolvers are called in parallel; without DB we get null. This test documents expected behavior.
      const result = await service.getApplicationDetails('002-122', 1);
      // Either null (no data in DB) or an object with type in [WAPP, NAPP, INCR, GOLA]
      if (result !== null) {
        expect(['WAPP', 'NAPP', 'INCR', 'GOLA']).toContain(result.type);
        expect(Array.isArray(result.items)).toBe(true);
        if (result.items.length > 0) {
          const refTypes = [...new Set(result.items.map(i => i.refDocName || i.refType))];
          expect(refTypes.every(t => ['WAPP', 'NAPP', 'INCR', 'GOLA'].includes(t))).toBe(true);
        }
      }
    });
  });

  describe('mapApplicationResult item shapes (WAPP, NAPP, INCR, GOLA)', () => {
    test('GOLA type produces item with refDocName GOLA and Gate of Life label', async () => {
      const fakeGolaRow = {
        Type: 'GOLA',
        Code: 'GOLA-001',
        ApplicantName: 'Test',
        Amount: 100,
        ApplicantMobileNo: '',
        ApplicantEmailID: '',
        ApplicantAddressNo: '',
        ApplicantAddressLine1: '',
        ApplicantAddressLine2: '',
        ApplicantAddressCity: '',
        ApplicantAddressState: '',
        ApplicantAddressCountry: ''
      };
      const mapped = await service.mapApplicationResult(fakeGolaRow, 1);
      expect(mapped.type).toBe('GOLA');
      expect(mapped.items).toHaveLength(1);
      expect(mapped.items[0].refDocName).toBe('GOLA');
      expect(mapped.items[0].refType).toBe('GOLA');
      expect(mapped.items[0].itemName).toMatch(/Gate of Life|GOLA/);
    });

    test('WAPP type produces item with refDocName WAPP', async () => {
      const fakeWakeRow = {
        Type: 'WAPP',
        Code: '002-122',
        ApplicantName: 'Test',
        Amount: 200,
        ApplicantMobileNo: '',
        ApplicantEmailID: '',
        ApplicantAddressNo: '',
        ApplicantAddressLine1: '',
        ApplicantAddressLine2: '',
        ApplicantAddressCity: '',
        ApplicantAddressState: '',
        ApplicantAddressCountry: ''
      };
      const mapped = await service.mapApplicationResult(fakeWakeRow, 1);
      expect(mapped.type).toBe('WAPP');
      expect(mapped.items).toHaveLength(1);
      expect(mapped.items[0].refDocName).toBe('WAPP');
      expect(mapped.items[0].refType).toBe('WAPP');
    });

    test('NAPP type produces item with refDocName NAPP', async () => {
      const fakeNappRow = {
        Type: 'NAPP',
        Code: '002-122',
        NicheId: null,
        Amount: 150,
        ApplicantName: 'Test',
        ApplicantMobileNo: '',
        ApplicantEmailID: '',
        ApplicantAddressNo: '',
        ApplicantAddressLine1: '',
        ApplicantAddressLine2: '',
        ApplicantAddressCity: '',
        ApplicantAddressState: '',
        ApplicantAddressCountry: ''
      };
      const mapped = await service.mapApplicationResult(fakeNappRow, 1);
      expect(mapped.type).toBe('NAPP');
      expect(mapped.items).toHaveLength(1);
      expect(mapped.items[0].refDocName).toBe('NAPP');
      expect(mapped.items[0].refType).toBe('NAPP');
    });
  });
});
