const NicheAgreementService = require('../services/NicheAgreementService');
const { cache } = require('../utils/cache');

// Mock dependencies
jest.mock('../repositories/NicheAgreementRepository');
jest.mock('../utils/logger'); // Mock logger to avoid console noise

const NicheAgreementRepository = require('../repositories/NicheAgreementRepository');

describe('NicheAgreementService Caching', () => {
    let service;
    let mockRepo;

    beforeEach(() => {
        // Clear cache and mocks before each test
        cache.flushAll();
        jest.clearAllMocks();

        service = new NicheAgreementService();
        mockRepo = NicheAgreementRepository.prototype;
    });

    test('should fetch from repository on first call', async () => {
        const mockData = {
            applicationCode: '3795-1',
            toJSON: () => ({ applicationCode: '3795-1', beneficiaries: [] }) // mock toJSON for processNicheAgreementData
        };

        // Setup repo mock
        mockRepo.getNicheAgreementDetailsCopy.mockResolvedValue(mockData);
        // Mock internal methods to avoid complexity
        service.getConsentFormStatus = jest.fn().mockResolvedValue({ status: 'pending' });
        service.getAgreementStatus = jest.fn().mockResolvedValue({ status: 'completed' });

        const result = await service.getNicheAgreementDetails('3795-1');

        expect(result.applicationCode).toBe('3795-1');
        expect(mockRepo.getNicheAgreementDetailsCopy).toHaveBeenCalledTimes(1);
    });

    test('should return cached data on second call', async () => {
        const mockData = {
            applicationCode: '3795-1',
            toJSON: () => ({ applicationCode: '3795-1', beneficiaries: [] })
        };

        mockRepo.getNicheAgreementDetailsCopy.mockResolvedValue(mockData);
        service.getConsentFormStatus = jest.fn().mockResolvedValue({ status: 'pending' });
        service.getAgreementStatus = jest.fn().mockResolvedValue({ status: 'completed' });

        // First call - hits DB
        await service.getNicheAgreementDetails('3795-1');

        // Second call - hits Cache
        const result = await service.getNicheAgreementDetails('3795-1');

        expect(result.applicationCode).toBe('3795-1');
        // Repo should still only be called ONCE
        expect(mockRepo.getNicheAgreementDetailsCopy).toHaveBeenCalledTimes(1);
    });
});
