const path = require('path');
const NicheApplicationRepository = require('../repositories/NicheApplicationRepository');
const { NicheApplication, NicheApplicationBeneficiary } = require('../models/NicheApplication');
const logger = require('../utils/logger');
const MailService = require('./MailService');
const PdfService = require('./PdfService');
const NicheConcentForm = require('../models/NicheConcentForm');
const NicheConcentFormRepository = require('../repositories/NicheConcentFormRepository');
// Date parsing utility for beneficiary dates
const parseDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') return null;

    // Handle ISO strings (e.g., "1996-04-24T00:00:00.000Z")
    if (trimmed.includes('T') && trimmed.endsWith('Z')) {
      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    // Handle DD-MM-YYYY format (e.g., "24-04-1996" or "3-4-1996")
    const dmyMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    // Handle DD-MMM-YYYY format (e.g., "16-Feb-2012")
    const dmmmMatch = trimmed.match(/^(\d{1,2})[\s-](\w{3})[\s-](\d{4})$/i);
    if (dmmmMatch) {
      const [, day, monthName, year] = dmmmMatch;
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = months.indexOf(monthName.toLowerCase());
      if (monthIndex !== -1) {
        const date = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10));
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }

    // Default to standard parsing
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const pdfService = new PdfService();
const { cache, deleteByPrefix } = require('../utils/cache');

const transientDbErrorCodes = new Set([
  'ETIMEOUT',
  'ESOCKET',
  'ECONNRESET',
  'ECONNREFUSED',
  'ELOGIN',
  'ENOTOPEN',
  'EPIPE',
  'EHOSTUNREACH',
  'EAI_AGAIN'
]);

const isDatabaseUnavailableError = (error) => {
  if (!error) {
    return false;
  }

  const code = error.code
    || error.number
    || error.originalError?.code
    || error.originalError?.number;

  if (code && transientDbErrorCodes.has(code)) {
    return true;
  }

  const message = (error.message || '').toLowerCase();
  return message.includes('failed to connect')
    || message.includes('timeout')
    || message.includes('pool error')
    || message.includes('invalid object name')
    || message.includes('could not connect to sql server');
};

const NICHE_APPLICATION_CACHE_PREFIX = 'nicheApplications:';
const enableNicheApplicationCache = process.env.NICHE_APPLICATION_CACHE !== 'false';
// Increased cache TTL from 30s to 300s (5 minutes) for better performance on read-heavy operations
// This provides significant performance improvement for repeated queries
const cacheTtlSeconds = parseInt(process.env.NICHE_APPLICATION_CACHE_TTL || process.env.CACHE_TTL_SECONDS || '300', 10);
const attachInvoicePdf = process.env.MAIL_ATTACH_INVOICE === 'true';
const autoSendInvoiceEmail = process.env.AUTO_SEND_INVOICE_EMAIL !== 'false';
const pageSizeDefault = parseInt(process.env.NICHE_APPLICATION_PAGE_SIZE_DEFAULT || '10', 10);
const pageSizeMax = parseInt(process.env.NICHE_APPLICATION_PAGE_SIZE_MAX || '100', 10);
const fetchAllChunkDefault = parseInt(process.env.NICHE_APPLICATION_FETCH_ALL_CHUNK_DEFAULT || '100', 10);
const fetchAllChunkMax = parseInt(process.env.NICHE_APPLICATION_FETCH_ALL_CHUNK_MAX || '2000', 10);
const fetchAllHardLimit = parseInt(process.env.NICHE_APPLICATION_FETCH_ALL_LIMIT || '10000', 10);
const fetchAllMaxIterations = parseInt(process.env.NICHE_APPLICATION_FETCH_ALL_MAX_ITERATIONS || '2000', 10);

const normalizeCacheValue = (input) => {
  if (Array.isArray(input)) {
    return input.map(item => normalizeCacheValue(item));
  }
  if (input && typeof input === 'object') {
    return Object.keys(input).sort().reduce((acc, key) => {
      acc[key] = normalizeCacheValue(input[key]);
      return acc;
    }, {});
  }
  return input;
};

// Optimized cache key generation using hash to reduce key length and improve comparison speed
const crypto = require('crypto');

const buildCacheKey = (churchId, params) => {
  const normalized = normalizeCacheValue(params);
  const paramsJson = JSON.stringify(normalized);
  // Use MD5 hash to reduce key length and improve cache lookup performance
  // Hash prevents long cache keys that can cause memory and comparison issues
  const paramsHash = crypto.createHash('md5').update(paramsJson).digest('hex');
  return `${NICHE_APPLICATION_CACHE_PREFIX}${churchId}:${paramsHash}`;
};

const clampNumber = (value, { min = 1, max = pageSizeMax, fallback = pageSizeDefault } = {}) => {
  const numeric = Number.isFinite(value) ? value : fallback;
  const bounded = Math.min(Math.max(numeric, min), max);
  return bounded;
};

const determineFetchAllChunkSize = (value) => {
  return clampNumber(value, {
    min: 1,
    max: fetchAllChunkMax,
    fallback: fetchAllChunkDefault
  });
};

const fetchAllApplicationsInChunks = async ({
  baseParams,
  chunkSize,
  skipTotalInitial,
  hardLimit = fetchAllHardLimit,
  maxIterations = fetchAllMaxIterations
}) => {
  const aggregated = [];
  let totalRecords = null;
  let iteration = 0;
  let currentPage = baseParams.page || 1;
  let truncated = false;
  let chunksProcessed = 0;

  // Ensure chunkSize is valid
  const validChunkSize = chunkSize && chunkSize > 0 ? chunkSize : fetchAllChunkDefault;

  // Ensure baseParams has required churchId
  if (!baseParams || !baseParams.churchId) {
    logger.error('fetchAllApplicationsInChunks called without churchId in baseParams:', baseParams);
    throw new Error('churchId is required for fetch-all operation');
  }

  while (iteration < maxIterations) {
    try {
      // Build clean params object, ensuring page and pageSize are explicitly set
      // Only include filter params if they have values (don't pass null/undefined)
      const repoParams = {
        churchId: baseParams.churchId,
        page: currentPage,
        pageSize: validChunkSize,
        skipTotal: iteration === 0 ? skipTotalInitial : true
      };

      // Add filter params only if they exist and are not empty
      if (baseParams.applicationCode) {
        repoParams.applicationCode = baseParams.applicationCode;
      }
      if (baseParams.applicantName) {
        repoParams.applicantName = baseParams.applicantName;
      }
      if (baseParams.nomineeName) {
        repoParams.nomineeName = baseParams.nomineeName;
      }
      if (baseParams.searchTerm) {
        repoParams.searchTerm = baseParams.searchTerm;
      }
      if (baseParams.fromDate) {
        repoParams.fromDate = baseParams.fromDate;
      }
      if (baseParams.toDate) {
        repoParams.toDate = baseParams.toDate;
      }
      if (baseParams.status !== undefined && baseParams.status !== null) {
        repoParams.status = baseParams.status;
      }

      logger.debug(`Fetch-all iteration ${iteration}: Querying repository with params`, {
        churchId: repoParams.churchId,
        page: repoParams.page,
        pageSize: repoParams.pageSize,
        skipTotal: repoParams.skipTotal,
        hasFilters: Boolean(repoParams.applicationCode || repoParams.applicantName || repoParams.nomineeName || repoParams.searchTerm)
      });

      const repoResult = await NicheApplicationRepository.searchApplications(repoParams);

      // Validate repoResult
      if (!repoResult) {
        logger.error(`Repository returned null/undefined in fetch-all at iteration ${iteration}`);
        // On first iteration, this is critical - return empty result
        if (iteration === 0) {
          return {
            records: [],
            total: 0,
            skipTotal: true,
            truncated: false,
            iterations: 0,
            chunkSize: validChunkSize
          };
        }
        break;
      }

      if (!Array.isArray(repoResult.records)) {
        logger.error(`Repository returned invalid records array in fetch-all at iteration ${iteration}:`, typeof repoResult.records);
        // On first iteration, this is critical - return empty result
        if (iteration === 0) {
          return {
            records: [],
            total: 0,
            skipTotal: true,
            truncated: false,
            iterations: 0,
            chunkSize: validChunkSize
          };
        }
        break;
      }

      if (iteration === 0) {
        totalRecords = repoResult.total ?? null;
        logger.info(`Fetch-all first iteration result: ${repoResult.records.length} records, total: ${totalRecords}, skipTotal: ${skipTotalInitial}`);

        // On first iteration, if we get no records, return early with empty result
        // This handles the case where there truly are no matching records
        if (repoResult.records.length === 0) {
          logger.info(`Fetch-all returned no records on first iteration (total: ${totalRecords}, skipTotal: ${skipTotalInitial}, page: ${currentPage}, chunkSize: ${validChunkSize})`);
          // Return valid structure even when empty
          return {
            records: [],
            total: totalRecords ?? 0,
            skipTotal: totalRecords === null,
            truncated: false,
            iterations: 0,
            chunkSize: validChunkSize
          };
        }
        // Log successful first chunk
        logger.info(`Fetch-all first chunk successful: ${repoResult.records.length} records found (total: ${totalRecords})`);
      }

      if (repoResult.records.length === 0) {
        logger.info(`Fetch-all: No more records at page ${currentPage}, stopping`);
        break;
      }

      // Filter out any null/undefined records before adding
      const validRecords = repoResult.records.filter(record => record != null);
      if (validRecords.length === 0) {
        logger.warn(`Fetch-all: All records filtered out as invalid at page ${currentPage}, stopping`);
        break;
      }

      aggregated.push(...validRecords);
      chunksProcessed += 1;

      logger.debug(`Fetch-all: Processed chunk ${chunksProcessed}, page ${currentPage}, records: ${repoResult.records.length}, total aggregated: ${aggregated.length}`);

      if (hardLimit && aggregated.length >= hardLimit) {
        truncated = true;
        aggregated.length = hardLimit;
        logger.info(`Fetch-all: Reached hard limit of ${hardLimit} records`);
        break;
      }

      if (repoResult.records.length < validChunkSize) {
        logger.info(`Fetch-all: Last chunk received (${repoResult.records.length} < ${validChunkSize})`);
        break;
      }

      if (totalRecords !== null && aggregated.length >= totalRecords) {
        logger.info(`Fetch-all: Reached total records count (${totalRecords})`);
        break;
      }

      currentPage += 1;
      iteration += 1;
    } catch (error) {
      logger.error(`Error in fetch-all at iteration ${iteration}, page ${currentPage}:`, {
        error: error.message,
        stack: error.stack,
        baseParams: { churchId: baseParams?.churchId, page: currentPage }
      });

      // On first iteration, return empty result instead of throwing
      // This ensures the API always responds, even if there's a database error
      if (iteration === 0) {
        logger.warn('Error on first iteration of fetch-all, returning empty result');
        return {
          records: [],
          total: 0,
          skipTotal: true,
          truncated: false,
          iterations: 0,
          chunkSize: validChunkSize
        };
      }
      // For subsequent iterations, break to stop processing
      break;
    }
  }

  if (iteration >= maxIterations) {
    logger.warn(`Fetch-all aborted after reaching ${maxIterations} iterations. Consider increasing NICHE_APPLICATION_FETCH_ALL_MAX_ITERATIONS.`);
  }

  // Ensure aggregated is always an array
  const finalRecords = Array.isArray(aggregated) ? aggregated : [];

  const derivedTotal = totalRecords !== null
    ? totalRecords
    : finalRecords.length;
  const skipTotalFlag = truncated ? true : (totalRecords === null);

  logger.info(`Fetch-all completed: ${finalRecords.length} records aggregated over ${chunksProcessed} chunks, total: ${derivedTotal}, truncated: ${truncated}, iterations: ${iteration}`);

  // Always return a valid structure
  return {
    records: finalRecords,
    total: derivedTotal,
    skipTotal: skipTotalFlag,
    truncated,
    iterations: chunksProcessed,
    chunkSize: validChunkSize
  };
};

const invalidateNicheApplicationCache = () => {
  if (enableNicheApplicationCache) {
    logger.info('[invalidateNicheApplicationCache] Starting aggressive cache invalidation');

    // First, get all current keys before deletion for logging
    const allKeysBefore = cache.keys();
    const nicheAppKeysBefore = allKeysBefore.filter(key => key.startsWith(NICHE_APPLICATION_CACHE_PREFIX));

    logger.info(`[invalidateNicheApplicationCache] Found ${nicheAppKeysBefore.length} niche application cache entries before invalidation`);

    // Delete all niche application cache entries
    const deletedCount = deleteByPrefix(NICHE_APPLICATION_CACHE_PREFIX);

    // Also flush the entire cache to ensure complete invalidation
    // This is a more aggressive approach to prevent any stale data
    cache.flushAll();

    logger.info(`[invalidateNicheApplicationCache] Cache invalidation completed. Deleted ${deletedCount} cache entries with prefix: ${NICHE_APPLICATION_CACHE_PREFIX}`);
    logger.info('[invalidateNicheApplicationCache] Complete cache flush performed for maximum data freshness');

    // Additional debug logging to confirm cache has been cleared
    if (process.env.NODE_ENV === 'development') {
      const allKeysAfter = cache.keys();
      const nicheAppKeysAfter = allKeysAfter.filter(key => key.startsWith(NICHE_APPLICATION_CACHE_PREFIX));
      logger.debug(`[invalidateNicheApplicationCache] Remaining niche app cache keys after invalidation: ${nicheAppKeysAfter.length}`);
      logger.debug(`[invalidateNicheApplicationCache] Total cache keys after flush: ${allKeysAfter.length}`);
      if (nicheAppKeysAfter.length > 0) {
        logger.debug(`[invalidateNicheApplicationCache] Remaining niche app keys:`, nicheAppKeysAfter.slice(0, 5));
      }
    }
  } else {
    logger.info('[invalidateNicheApplicationCache] Cache is disabled, skipping invalidation');
  }
};

const CONSENT_FORM_TYPES = [
  { key: 'firstBeneficiary', label: '1st Beneficiary' },
  { key: 'secondBeneficiary', label: '2nd Beneficiary' },
  { key: 'twoBeneficiaries', label: '2 Beneficiaries' }
];

const CONSENT_STATUS_OPTIONS = [
  { value: 'living', label: 'Living' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'lostCapacity', label: 'Lost Capacity' }
];

const normalizePhone = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const stringValue = String(value).trim();
  if (!stringValue) {
    return null;
  }
  const cleaned = stringValue.replace(/[^0-9+]/g, '');
  return cleaned || null;
};

const deriveIsCatholic = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (['catholic', 'roman catholic', 'rc', 'yes', 'true', 'y', '1'].includes(normalized)) {
    return true;
  }
  if (['non catholic', 'non-catholic', 'no', 'false', 'n', '0'].includes(normalized)) {
    return false;
  }
  return null;
};

const pickFirst = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }

    return value;
  }
  return undefined;
};

/**
 * Same as pickFirst but includes empty strings as valid values.
 * Used for update operations where clearing a field (setting to empty string) is desired.
 */
const pickFirstIncludeEmpty = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'string') {
        return value.trim();
      }
      return value;
    }
  }
  return undefined;
};

/**
 * Build a de‑duplication key for a person using the strongest identifier
 * available (ID/NRIC > email > phone > name).
 * This is used to detect duplicate nominees/beneficiaries within a single
 * niche application.
 */
const buildPersonKey = (person = {}) => {
  if (!person) {
    return null;
  }

  const rawId = person.idNo || person.nric || person.identificationNumber || person.idNumber;
  if (rawId && String(rawId).trim()) {
    return `ID:${String(rawId).trim().toUpperCase()}`;
  }

  const rawEmail = person.email || person.emailID || person.emailId;
  if (rawEmail && String(rawEmail).trim()) {
    return `EMAIL:${String(rawEmail).trim().toLowerCase()}`;
  }

  const rawPhone =
    person.mobileNo ||
    person.contactNumber ||
    person.phone ||
    person.mobile ||
    person.nomineePhone;
  const normalizedPhone = normalizePhone(rawPhone);
  if (normalizedPhone) {
    return `PHONE:${normalizedPhone}`;
  }

  const rawName = person.name || person.fullName;
  if (rawName && String(rawName).trim()) {
    return `NAME:${String(rawName).trim().toUpperCase()}`;
  }

  return null;
};

const parseDateValue = (value) => {
  return parseDate(value);
};

const parseIntegerLike = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const candidate = String(value).trim();
  if (!candidate) {
    return null;
  }

  const match = candidate.match(/-?\d+/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};

const resolveNicheIdFromPayload = (payload = {}) => {
  const candidates = [
    payload.nicheId,
    payload.niche?.nicheId,
    payload.niche?.id,
    payload.niche?.NicheId,
    payload.nicheDetails?.nicheId,
    payload.nicheDetails?.id,
    payload.nicheDetails?.nicheCode,
    payload.nicheCode
  ];

  for (const candidate of candidates) {
    const parsed = parseIntegerLike(candidate);
    if (parsed && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const parseGender = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (['male', 'm', '1', 'true', 'yes'].includes(normalized)) {
    return true;
  }
  if (['female', 'f', '0', 'false', 'no'].includes(normalized)) {
    return false;
  }
  return null;
};

const buildBeneficiaryEntity = (input = {}) => {
  if (!input) {
    logger.debug('[buildBeneficiaryEntity] Input is null/undefined');
    return null;
  }

  // Log the raw input for debugging
  logger.debug('[buildBeneficiaryEntity] Raw input:', JSON.stringify(input, null, 2));

  const name = pickFirst(input.name, input.fullName);
  if (!name) {
    logger.debug('[buildBeneficiaryEntity] No name found in input');
    return null;
  }

  const relationship = pickFirst(
    input.relationshipToApplicant,
    input.relationship,
    input.relationshipToApp
  );

  // Handle dateOfBirth and birthYear conversion properly
  let dateOfBirth = parseDateValue(pickFirst(input.dateOfBirth, input.dob));
  let birthYear = input.birthYear;

  // If we have a valid date but birthYear is still missing, extract it
  // Removed automatic conversion logic as per user request

  const idNo = pickFirst(input.idNo, input.nric, input.identificationNumber, input.idNumber);
  const isCatholic = deriveIsCatholic(
    input.isCatholic !== undefined && input.isCatholic !== null
      ? input.isCatholic
      : input.religion !== undefined && input.religion !== null
        ? input.religion
        : input.religiousAffiliation
  );
  const isMale = parseGender(
    input.isMale !== undefined
      ? input.isMale
      : input.gender !== undefined
        ? input.gender
        : input.sex
  );

  // Map relationship to nominee fields
  const relationshipToNominee1 = pickFirst(
    input.relationshipToNominee1,
    input.relationshipToNomineeOne
  );

  const relationshipToNominee2 = pickFirst(
    input.relationshipToNominee2,
    input.relationshipToNomineeTwo
  );

  const result = new NicheApplicationBeneficiary({
    name,
    relationshipToApplicant: relationship || null,
    dateOfBirth: dateOfBirth || null,
    birthYear: birthYear || null,
    idNo: idNo || null,
    isCatholic,
    isMale,
    relationshipToNominee1: relationshipToNominee1 || null,
    relationshipToNominee2: relationshipToNominee2 || null
  });

  // Log the processed result
  logger.debug('[buildBeneficiaryEntity] Processed result:', JSON.stringify(result.toJSON(), null, 2));

  return result;
};

const extractBeneficiariesFromPayload = (payload = {}) => {
  logger.debug('[extractBeneficiariesFromPayload] Extracting beneficiaries from payload');
  logger.debug('[extractBeneficiariesFromPayload] Payload keys:', Object.keys(payload));

  const collected = [];

  // Prioritize the beneficiaries array if it exists and has items
  if (Array.isArray(payload.beneficiaries) && payload.beneficiaries.length > 0) {
    logger.debug(`[extractBeneficiariesFromPayload] Found beneficiaries array with ${payload.beneficiaries.length} items`);
    collected.push(...payload.beneficiaries);
  } else {
    logger.debug('[extractBeneficiariesFromPayload] No beneficiaries array, checking individual fields');
    // Fall back to individual beneficiary1/2/3 fields only if array is not present
    ['beneficiary1', 'beneficiary2', 'beneficiary3'].forEach((key) => {
      if (payload[key]) {
        logger.debug(`[extractBeneficiariesFromPayload] Found ${key}:`, JSON.stringify(payload[key], null, 2));
        collected.push(payload[key]);
      }
    });
  }

  logger.debug(`[extractBeneficiariesFromPayload] Total collected: ${collected.length}`);

  const entities = [];
  const seenKeys = new Set(); // Deduplicate based on person key

  for (const item of collected) {
    const entity = buildBeneficiaryEntity(item);
    if (entity) {
      // Create a deduplication key based on name + idNo
      const key = buildPersonKey({
        name: entity.name,
        idNo: entity.idNo
      });

      // Skip if we've already seen this person (duplicate)
      if (key && seenKeys.has(key)) {
        logger.debug(`[extractBeneficiariesFromPayload] Skipping duplicate: ${entity.name}`);
        continue;
      }

      if (key) {
        seenKeys.add(key);
      }

      entities.push(entity);
      logger.debug(`[extractBeneficiariesFromPayload] Added beneficiary: ${entity.name}`);
    }

    if (entities.length === 3) {
      logger.debug('[extractBeneficiariesFromPayload] Reached max of 3 beneficiaries');
      break;
    }
  }

  logger.debug(`[extractBeneficiariesFromPayload] Final entities count: ${entities.length}`);
  return entities;
};

const buildAddressString = ({
  no,
  line1,
  line2,
  city,
  state,
  country
} = {}) => {
  return [no, line1, line2, city, state, country].filter(Boolean).join(', ');
};

const coerceNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? fallback : numeric;
};

const coerceBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const normalizeConsentForms = (input = {}) => {
  const normalized = {
    firstBeneficiary: NicheConcentForm.normalizeConsentValue?.(input.firstBeneficiary) || null,
    secondBeneficiary: NicheConcentForm.normalizeConsentValue?.(input.secondBeneficiary) || null,
    twoBeneficiaries: NicheConcentForm.normalizeConsentValue?.(input.twoBeneficiaries) || null
  };

  return normalized;
};

const hasConsentSelections = (forms = {}) => {
  if (!forms) {
    return false;
  }
  return Boolean(forms.firstBeneficiary || forms.secondBeneficiary || forms.twoBeneficiaries);
};

const buildConsentFormOptions = (selections = {}) => {
  return CONSENT_FORM_TYPES.reduce((acc, type) => {
    acc[type.key] = {
      label: type.label,
      selected: selections[type.key] || null,
      options: CONSENT_STATUS_OPTIONS.map(option => ({
        ...option,
        active: selections[type.key] === option.value
      }))
    };
    return acc;
  }, {});
};

const buildConsentFormsPayload = ({ selections = {}, consentRecord = null }) => {
  const normalizedSelections = normalizeConsentForms(selections);
  const encodedStatus = NicheConcentForm.encodeConsentSelections(normalizedSelections);
  const options = buildConsentFormOptions(normalizedSelections);

  return {
    selections: normalizedSelections,
    options,
    encodedStatus,
    source: consentRecord ? 'database' : (hasConsentSelections(normalizedSelections) ? 'request' : 'default'),
    updatedAt: consentRecord
      ? consentRecord.agreementDate || consentRecord.appliedDate || null
      : null,
    consentFormId: consentRecord ? consentRecord.nicheConcentFormId : null
  };
};

const buildConsentFormEntityFromApplication = ({
  consentSelections = {},
  application,
  userId
}) => {
  if (!application || !application.code || !application.nicheId) {
    return null;
  }

  const selections = normalizeConsentForms(consentSelections);
  if (!hasConsentSelections(selections)) {
    return null;
  }

  const applicationJson = application.toJSON ? application.toJSON() : application;
  const candidates = applicationJson?.beneficiaries || application.beneficiaries || [];
  const beneficiary1 = candidates[0] || {};
  const beneficiary2 = candidates[1] || {};
  const beneficiary3 = candidates[2] || {};

  return new NicheConcentForm({
    consentForms: selections,
    code: application.code,
    appliedDate: application.appliedDate,
    agreementDate: application.agreementDate,
    applicantName: application.applicantName,
    applicantIDNo: application.applicantIDNo,
    applicantRelationship: 'Applicant',
    nicheId: application.nicheId,
    nomineeName: application.nomineeName,
    nomineeIDNo: application.nomineeIDNo,
    nomineeRelationship: application.nomineeRelationship,
    nomineeName2: application.nomineeName2,
    nomineeIDNo2: application.nomineeIDNo2,
    nomineeRelationship2: application.nomineeRelationship2,
    bene1Name: beneficiary1.name || null,
    bene1RelationshipToApplicant: beneficiary1.relationshipToApplicant || null,
    bene1IDNo: beneficiary1.idNo || null,
    bene2Name: beneficiary2.name || null,
    bene2RelationshipToApplicant: beneficiary2.relationshipToApplicant || null,
    bene2IDNo: beneficiary2.idNo || null,
    bene3Name: beneficiary3.name || null,
    bene3RelationshipToApplicant: beneficiary3.relationshipToApplicant || null,
    bene3IDNo: beneficiary3.idNo || null,
    churchId: application.churchId,
    userId: userId || application.userId || null
  });
};

const buildApplicationResponse = (
  application,
  {
    requestPayload = {},
    nomineeArray = []
  } = {}
) => {
  if (!application) {
    return null;
  }

  const applicationJson = application.toJSON ? application.toJSON() : application;

  const applicantAddressFormatted = buildAddressString(applicationJson.applicant?.address || {});
  const nomineeAddressFormatted = applicationJson.nominee
    ? buildAddressString(applicationJson.nominee.address || {})
    : null;
  const nominee2AddressFormatted = applicationJson.nominee2
    ? buildAddressString(applicationJson.nominee2.address || {})
    : null;

  const rawPayloadBeneficiaries = Array.isArray(requestPayload.beneficiaries) ? requestPayload.beneficiaries : [];
  const beneficiariesForResponse = (applicationJson.beneficiaries || []).map((beneficiary, index) => {
    const resolvedStatus = beneficiary.status || rawPayloadBeneficiaries[index]?.status || 'Not Occupied';
    return {
      index: index + 1,
      name: beneficiary.name,
      fullName: beneficiary.name,
      relationship: beneficiary.relationshipToApplicant,
      relationshipToApplicant: beneficiary.relationshipToApplicant,
      idNo: beneficiary.idNo,
      nric: beneficiary.idNo,
      dateOfBirth: beneficiary.dateOfBirth,
      birthYear: beneficiary.birthYear,
      isCatholic: beneficiary.isCatholic,
      isMale: beneficiary.isMale,
      status: resolvedStatus,
      lifeStatus: beneficiary.lifeStatus || resolvedStatus
    };
  });

  const beneficiary1 = beneficiariesForResponse[0] || null;
  const beneficiary2Response = beneficiariesForResponse[1] || null;
  const beneficiary3Response = beneficiariesForResponse[2] || null;

  const requestNicheDetails = requestPayload.nicheDetails || requestPayload.niche || {};

  const nicheDetails = {
    nicheId: applicationJson.niche?.nicheId || application.nicheId || null,
    nicheCode: pickFirst(
      requestNicheDetails.nicheCode,
      requestNicheDetails.code,
      requestPayload.nicheCode,
      applicationJson.niche?.code,
      applicationJson.niche?.nicheId,
      application.nicheId
    ),
    chapel: pickFirst(
      requestNicheDetails.chapel,
      requestNicheDetails.chapelName,
      applicationJson.niche?.chapel
    ),
    chapelId: parseIntegerLike(
      pickFirst(
        requestNicheDetails.chapelId,
        requestNicheDetails.chapel?.id,
        applicationJson.niche?.chapelId
      )
    ),
    chapelCode: pickFirst(
      requestNicheDetails.chapelCode,
      requestNicheDetails.chapel?.code,
      applicationJson.niche?.chapelCode
    ),
    wallName: pickFirst(requestNicheDetails.wallName, applicationJson.niche?.wallName),
    wallCode: pickFirst(requestNicheDetails.wallCode, applicationJson.niche?.wallCode),
    rowNumber: pickFirst(requestNicheDetails.rowNumber, applicationJson.niche?.rowNumber),
    rowLevel: pickFirst(requestNicheDetails.rowLevel, applicationJson.niche?.rowLevel),
    amount: coerceNumber(
      pickFirst(
        requestNicheDetails.amount,
        applicationJson.niche?.amount,
        application.amount
      ),
      0
    ),
    defaultAmount: coerceNumber(
      pickFirst(
        requestNicheDetails.defaultAmount,
        applicationJson.niche?.defaultAmount,
        application.defaultAmount
      ),
      0
    )
  };

  const applicantForResponse = applicationJson.applicant
    ? {
      ...applicationJson.applicant,
      address: {
        ...applicationJson.applicant.address,
        formatted: applicantAddressFormatted || null
      }
    }
    : null;

  const nomineeForResponse = applicationJson.nominee
    ? {
      ...applicationJson.nominee,
      address: {
        ...applicationJson.nominee.address,
        formatted: nomineeAddressFormatted || null
      }
    }
    : null;

  const nominee2ForResponse = applicationJson.nominee2
    ? {
      ...applicationJson.nominee2,
      address: {
        ...applicationJson.nominee2.address,
        formatted: nominee2AddressFormatted || null
      }
    }
    : null;

  // Derive applicant religion string from stored Catholic flag when not provided in request
  const derivedApplicantReligion = (() => {
    const isCatholic = applicationJson.applicant?.isCatholic;
    if (isCatholic === true) {
      return 'Catholic';
    }
    if (isCatholic === false) {
      return 'Non Catholic';
    }
    return null;
  })();

  const nominees = [];
  if (nomineeForResponse) {
    nominees.push({
      id: nomineeArray[0]?.id || nomineeForResponse.personId || null,
      fullName: nomineeForResponse.name,
      name: nomineeForResponse.name,
      nric: nomineeForResponse.idNo,
      idNo: nomineeForResponse.idNo,
      relationship: nomineeForResponse.relationship,
      relationshipToApplicant: nomineeForResponse.relationship,
      email: nomineeForResponse.email,
      contactNumber: nomineeForResponse.mobileNo,
      mobileNo: nomineeForResponse.mobileNo,
      status: pickFirst(requestPayload.nomineeStatus, nomineeArray[0]?.status),
      address: nomineeAddressFormatted || null
    });
  }

  if (nominee2ForResponse) {
    nominees.push({
      id: nomineeArray[1]?.id || nominee2ForResponse.personId || null,
      fullName: nominee2ForResponse.name,
      name: nominee2ForResponse.name,
      nric: nominee2ForResponse.idNo,
      idNo: nominee2ForResponse.idNo,
      relationship: nominee2ForResponse.relationship,
      relationshipToApplicant: nominee2ForResponse.relationship,
      email: nominee2ForResponse.email,
      contactNumber: nominee2ForResponse.mobileNo,
      mobileNo: nominee2ForResponse.mobileNo,
      status: pickFirst(requestPayload.nomineeStatus2, nomineeArray[1]?.status),
      address: nominee2AddressFormatted || null
    });
  }

  return {
    applicationId: applicationJson.nicheApplicationId || application.nicheApplicationId || null,
    code: applicationJson.code || application.code || null,
    applicationNumber: applicationJson.code || application.code || null,
    nicheId: applicationJson.nicheId || application.nicheId || null,
    applicantName: applicationJson.applicant?.name || null,
    applicantIDNo: applicationJson.applicant?.idNo || null,
    applicantEmail: applicantForResponse?.email || null,
    applicantPhone: applicantForResponse?.mobileNo || null,
    applicantAddress: applicantAddressFormatted || null,
    applicantReligion: pickFirst(
      requestPayload.applicantReligion,
      derivedApplicantReligion
    ),
    nomineeName: applicationJson.nominee?.name || null,
    nomineeIDNo: applicationJson.nominee?.idNo || null,
    nomineeEmail: nomineeForResponse?.email || null,
    nomineePhone: nomineeForResponse?.mobileNo || null,
    nomineeRelationship: nomineeForResponse?.relationship || null,
    nomineeAddress: nomineeAddressFormatted || null,
    nomineeStatus: pickFirst(
      requestPayload.nomineeStatus,
      nominees[0]?.status
    ),
    nominee2: nominee2ForResponse,
    status: applicationJson.status,
    statusText: applicationJson.statusText || application.getStatusText?.() || null,
    appliedDate: applicationJson.appliedDate,
    agreementDate: applicationJson.agreementDate,
    beneficiariesCount: beneficiariesForResponse.length,
    beneficiaries: beneficiariesForResponse,
    beneficiary1,
    beneficiary2: beneficiary2Response,
    beneficiary3: beneficiary3Response,
    beneficiarySummary: beneficiariesForResponse.map((beneficiary) => ({
      name: beneficiary.name,
      relationship: beneficiary.relationship,
      idNo: beneficiary.idNo
    })),
    applicant: applicantForResponse,
    nominee: nomineeForResponse,
    nominees,
    relationshipToNominee1: pickFirst(
      requestPayload.relationshipToNominee1,
      nomineeArray[0]?.relationship,
      nomineeForResponse?.relationship
    ),
    relationshipToNominee2: pickFirst(
      requestPayload.relationshipToNominee2,
      nomineeArray[1]?.relationship,
      nominee2ForResponse?.relationship
    ),
    contactStatus: pickFirst(
      requestPayload.contactStatus,
      nominees[0]?.status
    ),
    nicheDetails,
    churchId: applicationJson.churchId || application.churchId || null,
    userId: applicationJson.userId || application.userId || null,
    remarks: applicationJson.remarks || null,
    refDocType: applicationJson.refDocType || application.refDocType || 'NAPP',
    consentForms: {},
    consentFormsOptions: {},
    consentFormsStatusCode: null,
    consentFormsSource: null,
    consentFormsUpdatedAt: null,
    consentFormId: null
  };
};

const collectAutoEmailRecipients = ({
  requestPayload = {},
  responseData = {},
  nomineeArray = []
} = {}) => {
  const emails = [
    pickFirst(
      requestPayload.contactEmail,
      requestPayload.contact?.email,
      requestPayload.contact?.contactEmail,
      requestPayload.contactPerson?.email,
      requestPayload.contactPerson?.contactEmail
    ),
    pickFirst(
      requestPayload.applicantEmail,
      requestPayload.applicant?.email,
      requestPayload.applicant?.emailID,
      responseData.applicant?.email
    ),
    pickFirst(
      requestPayload.nomineeEmail,
      requestPayload.nominees?.[0]?.email,
      nomineeArray[0]?.email,
      responseData.nominee?.email
    ),
    pickFirst(
      requestPayload.nomineeEmail2,
      requestPayload.nominee2?.email,
      requestPayload.nominees?.[1]?.email,
      nomineeArray[1]?.email,
      responseData.nominee2?.email
    )
  ];

  const unique = new Set();
  emails.forEach((email) => {
    if (typeof email === 'string') {
      const trimmed = email.trim();
      if (trimmed) {
        unique.add(trimmed);
      }
    }
  });

  return Array.from(unique);
};

class NicheApplicationService {
  /**
   * Search niche applications with filters and pagination
   * @param {Object} query - Search filters
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Search results
   */
  async searchApplications(query = {}, churchId) {
    let searchParams = null;

    try {
      // Log received parameters for debugging
      logger.info('[Service] Received search query parameters:', {
        query: query,
        churchId: churchId,
        hasApplicationCode: !!query.applicationCode,
        hasApplicantName: !!query.applicantName,
        hasNomineeName: !!query.nomineeName,
        hasFromDate: !!query.fromDate,
        hasToDate: !!query.toDate,
        hasSearchTerm: !!query.searchTerm
      });

      // Log specific parameter values
      if (query.fromDate) {
        logger.info('[Service] From Date value:', query.fromDate, 'Type:', typeof query.fromDate);
      }
      if (query.toDate) {
        logger.info('[Service] To Date value:', query.toDate, 'Type:', typeof query.toDate);
      }
      if (query.applicationCode) {
        logger.info('[Service] Application Code:', query.applicationCode);
      }
      if (query.applicantName) {
        logger.info('[Service] Applicant Name:', query.applicantName);
      }
      if (query.nomineeName) {
        logger.info('[Service] Nominee Name:', query.nomineeName);
      }

      const rawPageValue = parseInt(query.page, 10);
      const rawPageSizeValue = parseInt(query.pageSize, 10);
      const rawFetchAllChunkValue = parseInt(query.fetchAllChunkSize || query.chunkSize, 10);
      const fetchAllRequested = String(query.fetchAll || query.all || '').toLowerCase() === 'true'
        || (typeof query.pageSize === 'string' && query.pageSize.toLowerCase() === 'all');

      // Optional safety optimisation: when explicitly requested, restrict very heavy
      // fetch-all searches to the current month only, to avoid timeouts on large datasets.
      // This is opt‑in via ?currentMonthOnly=true or ?period=currentMonth and does not
      // change behaviour for existing clients.
      const hasExplicitFromDate = Boolean(query.fromDate || query.startDate);
      const hasExplicitToDate = Boolean(query.toDate || query.endDate);
      const hasExplicitDateRange = hasExplicitFromDate || hasExplicitToDate;
      const currentMonthOnlyFlag = String(query.currentMonthOnly || '').toLowerCase() === 'true'
        || String(query.period || '').toLowerCase() === 'currentmonth';

      let effectiveFromDate = query.fromDate || query.startDate || null;
      let effectiveToDate = query.toDate || query.endDate || null;

      if (fetchAllRequested && currentMonthOnlyFlag && !hasExplicitDateRange) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        effectiveFromDate = startOfMonth.toISOString();
        effectiveToDate = endOfMonth.toISOString();
      }

      const requestedPageNumber = Number.isFinite(rawPageValue) ? rawPageValue : null;
      const requestedPageSizeNumber = Number.isFinite(rawPageSizeValue) ? rawPageSizeValue : null;
      const responsePage = Math.max(requestedPageNumber || 1, 1);
      const fetchAllChunkSize = determineFetchAllChunkSize(
        Number.isFinite(rawFetchAllChunkValue) ? rawFetchAllChunkValue : null
      );
      const pagingPageSize = clampNumber(requestedPageSizeNumber);
      const chunkSize = fetchAllRequested ? fetchAllChunkSize : pagingPageSize;
      const queryPageSize = chunkSize;
      const queryPage = fetchAllRequested ? 1 : responsePage;

      // Determine if beneficiaries should be loaded
      // Default: skip for list views (better performance)
      // Load only when explicitly requested (includeBeneficiaries=true) for detail views
      const includeBeneficiaries = query.includeBeneficiaries !== undefined
        ? String(query.includeBeneficiaries).toLowerCase() === 'true'
        : false; // Default: skip for better performance

      searchParams = {
        churchId,
        page: queryPage,
        pageSize: queryPageSize,
        applicationCode: query.applicationCode || query.code || null,
        applicantName: query.applicantName || query.applicant || null,
        nomineeName: query.nomineeName || query.nominee || null,
        searchTerm: query.search || query.searchTerm || query.q || null,
        fromDate: effectiveFromDate,
        toDate: effectiveToDate,
        status: query.status || null,
        lightweight: query.lightweight !== undefined ? String(query.lightweight).toLowerCase() === 'true' : false,
        includeBeneficiaries // Pass to repository
      };

      // Default skipTotal to true for better performance - COUNT queries can be slow on large datasets
      // Users can set skipTotal=false to get pagination information (total, totalPages, etc.)
      const skipTotal = query.skipTotal !== undefined
        ? String(query.skipTotal).toLowerCase() !== 'false'
        : true;
      const bypassCache = String(query.bypassCache || query.forceRefresh || '').toLowerCase() === 'true';
      const allowCache = enableNicheApplicationCache && !fetchAllRequested && !bypassCache;
      const cacheKey = allowCache
        ? buildCacheKey(churchId, { page: responsePage, pageSize: query.pageSize || chunkSize, searchParams, skipTotal })
        : null;

      if (allowCache && cacheKey && !bypassCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
          logger.debug(`[searchApplications] Cache HIT for churchId: ${churchId}, cacheKey: ${cacheKey}`);
          return cached;
        } else {
          logger.debug(`[searchApplications] Cache MISS for churchId: ${churchId}, cacheKey: ${cacheKey}`);
        }
      } else if (bypassCache) {
        logger.info(`[searchApplications] Cache bypass requested for churchId: ${churchId}`);
      }

      let result;
      if (fetchAllRequested) {
        // Validate churchId is present
        if (!churchId) {
          logger.error('fetchAll requested but churchId is missing');
          throw new Error('Church ID is required for search');
        }

        logger.info('Fetching all niche applications with chunking', {
          churchId,
          chunkSize,
          skipTotalInitial: skipTotal,
          basePage: searchParams.page,
          basePageSize: searchParams.pageSize,
          filters: {
            applicationCode: searchParams.applicationCode,
            applicantName: searchParams.applicantName,
            nomineeName: searchParams.nomineeName,
            searchTerm: searchParams.searchTerm,
            fromDate: searchParams.fromDate,
            toDate: searchParams.toDate,
            status: searchParams.status
          }
        });

        try {
          result = await fetchAllApplicationsInChunks({
            baseParams: searchParams,
            chunkSize,
            skipTotalInitial: skipTotal
          });

          // Ensure result has valid structure
          if (!result) {
            logger.warn('fetchAllApplicationsInChunks returned null/undefined, using empty result');
            result = {
              records: [],
              total: 0,
              skipTotal: true,
              truncated: false,
              iterations: 0,
              chunkSize
            };
          } else if (!Array.isArray(result.records)) {
            logger.warn('fetchAllApplicationsInChunks returned invalid records array, using empty array');
            result = {
              ...result,
              records: [],
              total: result.total ?? 0
            };
          }

          logger.info('Completed fetch-all search', {
            churchId,
            records: result.records ? result.records.length : 0,
            truncated: result.truncated || false,
            iterations: result.iterations || 0,
            chunkSize: result.chunkSize || chunkSize,
            total: result.total,
            skipTotal: result.skipTotal !== undefined ? result.skipTotal : true
          });
        } catch (fetchError) {
          logger.error('Error in fetchAllApplicationsInChunks:', fetchError);
          // Return empty result instead of throwing to ensure API always responds
          result = {
            records: [],
            total: 0,
            skipTotal: true,
            truncated: false,
            iterations: 0,
            chunkSize
          };
        }
      } else {
        try {
          result = await NicheApplicationRepository.searchApplications({
            ...searchParams,
            skipTotal
          });

          // Ensure result has valid structure
          if (!result || !Array.isArray(result.records)) {
            logger.warn('Repository returned invalid result, using empty array');
            result = {
              records: [],
              total: 0,
              skipTotal: skipTotal
            };
          }
        } catch (repoError) {
          const isTimeoutError =
            repoError.code === 'ETIMEOUT' ||
            repoError.code === 'ETIMEDOUT' ||
            repoError.message?.includes('timeout') ||
            repoError.message?.includes('Timeout') ||
            repoError.message?.includes('Request timeout') ||
            repoError.message?.includes('Response timeout');

          if (isTimeoutError) {
            logger.warn('Repository search timed out, returning empty result to prevent frontend timeout:', {
              error: repoError.message,
              code: repoError.code,
              suggestion: 'Query took too long. Consider using skipTotal=true or adding date filters.'
            });
          } else {
            logger.error('Error in repository searchApplications:', repoError);
          }

          // Return empty result to ensure API always responds quickly
          // This prevents frontend timeout errors
          result = {
            records: [],
            total: 0,
            skipTotal: skipTotal
          };
        }
      }

      // Ensure result.records is always an array
      const records = result && Array.isArray(result.records) ? result.records : [];

      // Map raw records to response DTOs and de‑duplicate by application code
      // Some legacy data may contain duplicate rows for the same Code; we keep
      // only the first occurrence per code to avoid duplicates in the listing.
      const mappedRecords = records
        .map(record => buildApplicationResponse(record))
        .filter(Boolean);

      const uniqueByCode = [];
      const seenCodes = new Set();
      mappedRecords.forEach((item) => {
        const codeKey = item.code || item.applicationNumber || null;
        if (codeKey && seenCodes.has(codeKey)) {
          return;
        }
        if (codeKey) {
          seenCodes.add(codeKey);
        }
        uniqueByCode.push(item);
      });

      const formattedRecords = uniqueByCode;

      const totalRecords = result.skipTotal ? null : (result.total ?? formattedRecords.length);
      const effectivePageSize = fetchAllRequested
        ? (requestedPageSizeNumber && requestedPageSizeNumber > 0 ? requestedPageSizeNumber : chunkSize)
        : queryPageSize;

      const totalPages = fetchAllRequested
        ? (totalRecords !== null
          ? Math.ceil(totalRecords / effectivePageSize)
          : null)
        : (result.skipTotal || totalRecords === null
          ? null
          : Math.ceil(totalRecords / effectivePageSize));

      // Calculate pagination metadata
      const itemsRetrieved = formattedRecords.length;
      const hasNextPage = totalPages !== null
        ? responsePage < totalPages
        : itemsRetrieved === effectivePageSize; // If we got a full page, there might be more
      const hasPreviousPage = responsePage > 1;
      const remainingPages = totalPages !== null
        ? Math.max(0, totalPages - responsePage)
        : null;
      const remainingRecords = totalRecords !== null
        ? Math.max(0, totalRecords - (responsePage * effectivePageSize))
        : null;
      const currentPageStart = totalRecords !== null
        ? ((responsePage - 1) * effectivePageSize) + 1
        : null;
      const currentPageEnd = totalRecords !== null
        ? Math.min(responsePage * effectivePageSize, totalRecords)
        : itemsRetrieved;

      const responsePayload = {
        success: true,
        data: formattedRecords,
        pagination: {
          page: responsePage,
          currentPage: responsePage,
          pageSize: effectivePageSize,
          mode: fetchAllRequested ? 'all' : 'paged',
          chunkSize: fetchAllRequested ? chunkSize : null,
          itemsRetrieved: formattedRecords.length,
          requestedPage: requestedPageNumber,
          requestedPageSize: requestedPageSizeNumber,
          // Total counts
          total: totalRecords,
          totalPages,
          // Navigation flags
          hasNextPage,
          hasPreviousPage,
          // Remaining information
          remainingPages,
          remainingRecords,
          // Current page range
          currentPageStart,
          currentPageEnd,
          // Legacy fields
          truncated: fetchAllRequested ? Boolean(result.truncated) : false
        },
        filters: {
          applicationCode: searchParams.applicationCode,
          applicantName: searchParams.applicantName,
          nomineeName: searchParams.nomineeName,
          searchTerm: searchParams.searchTerm,
          fromDate: searchParams.fromDate,
          toDate: searchParams.toDate,
          status: searchParams.status,
          skipTotal: result.skipTotal || false,
          fetchAll: fetchAllRequested,
          truncated: fetchAllRequested ? Boolean(result.truncated) : false,
          fetchAllChunkSize
        }
      };

      if (allowCache && cacheKey && !bypassCache) {
        cache.set(cacheKey, responsePayload, cacheTtlSeconds);
        logger.debug(`[searchApplications] Cache SET for churchId: ${churchId}, cacheKey: ${cacheKey}, TTL: ${cacheTtlSeconds}s`);
      }

      return responsePayload;
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        logger.warn('Service: Database unavailable while searching niche applications, returning fallback response');

        // Provide a fast, safe fallback payload without relying on possibly undefined local vars
        const fallbackPage = Number.isFinite(parseInt(query.page, 10))
          ? parseInt(query.page, 10)
          : 1;
        const fallbackPageSize = Number.isFinite(parseInt(query.pageSize, 10))
          ? parseInt(query.pageSize, 10)
          : pageSizeDefault;

        const fallbackFilters = searchParams || {
          churchId,
          page: fallbackPage,
          pageSize: fallbackPageSize,
          applicationCode: query.applicationCode || query.code || null,
          applicantName: query.applicantName || query.applicant || null,
          nomineeName: query.nomineeName || query.nominee || null,
          searchTerm: query.search || query.searchTerm || query.q || null,
          fromDate: query.fromDate || query.startDate || null,
          toDate: query.toDate || query.endDate || null,
          status: query.status || null
        };

        return {
          success: true,
          data: [],
          pagination: {
            page: fallbackFilters.page || fallbackPage,
            pageSize: fallbackFilters.pageSize || fallbackPageSize,
            total: 0,
            totalPages: 0,
            truncated: true
          },
          filters: fallbackFilters,
          message: 'Search temporarily unavailable due to database connectivity. Please try again later.'
        };
      }
      logger.error('Service: Failed to search niche applications:', error);
      throw error;
    }
  }

  /**
   * Create new niche application with optimized payload structure
   * Based on: CaptureNewNicheApplication WebMethod
   * @param {Object} data - Optimized application data structure
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Created application code
   */
  async createApplication(data, userId, churchId) {
    try {
      logger.info('[Service] Starting createApplication with data:', JSON.stringify(data, null, 2));

      // Validate optimized payload structure
      const validation = this.validateOptimizedPayload(data);
      logger.info('[Service] Payload validation result:', validation);

      if (!validation.isValid) {
        logger.warn('[Service] Payload validation failed:', validation.errors);
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid application data structure',
            details: validation.errors
          }
        };
      }

      // Extract and transform data from optimized structure
      const applicantInput = data.applicant || {};
      const nomineesArray = Array.isArray(data.nominees) ? data.nominees : [];
      const nomineeInput = nomineesArray[0] || {};
      const nominee2Input = nomineesArray[1] || null;
      const beneficiariesArray = Array.isArray(data.beneficiaries) ? data.beneficiaries : [];

      // Build application entity
      const application = new NicheApplication({
        nicheId: data.niche?.id || data.nicheId,
        appliedDate: data.appliedDate || new Date(),
        agreementDate: data.agreementDate || new Date(),
        applicantName: applicantInput.name,
        applicantAddressNo: applicantInput.address?.no,
        applicantAddressLine1: applicantInput.address?.line1,
        applicantAddressLine2: applicantInput.address?.line2,
        applicantAddressCity: applicantInput.address?.city,
        applicantAddressState: applicantInput.address?.state,
        applicantAddressCountry: applicantInput.address?.country,
        applicantEmailID: applicantInput.email,
        applicantIDNo: applicantInput.idNo,
        applicantMobileNo: applicantInput.phone,
        applicantHomeTelNo: applicantInput.homeTel,
        applicantOfficeTelNo: applicantInput.officeTel,
        applicantIsCatholic: applicantInput.isCatholic,
        nomineeName: nomineeInput.name,
        nomineeAddressNo: nomineeInput.address?.no,
        nomineeAddressLine1: nomineeInput.address?.line1,
        nomineeAddressLine2: nomineeInput.address?.line2,
        nomineeAddressCity: nomineeInput.address?.city,
        nomineeAddressState: nomineeInput.address?.state,
        nomineeAddressCountry: nomineeInput.address?.country,
        nomineeEmailID: nomineeInput.email,
        nomineeIDNo: nomineeInput.idNo,
        nomineeMobileNo: nomineeInput.phone,
        nomineeHomeTelNo: nomineeInput.homeTel,
        nomineeOfficeTelNo: nomineeInput.officeTel,
        nomineeRelationship: nomineeInput.relationship,
        nomineeName2: nominee2Input?.name || null,
        nomineeAddressNo2: nominee2Input?.address?.no || null,
        nomineeAddressLine12: nominee2Input?.address?.line1 || null,
        nomineeAddressLine22: nominee2Input?.address?.line2 || null,
        nomineeAddressCity2: nominee2Input?.address?.city || null,
        nomineeAddressState2: nominee2Input?.address?.state || null,
        nomineeAddressCountry2: nominee2Input?.address?.country || null,
        nomineeEmailID2: nominee2Input?.email || null,
        nomineeIDNo2: nominee2Input?.idNo || null,
        nomineeMobileNo2: nominee2Input?.phone || null,
        nomineeHomeTelNo2: nominee2Input?.homeTel || null,
        nomineeOfficeTelNo2: nominee2Input?.officeTel || null,
        nomineeRelationship2: nominee2Input?.relationship || null,
        remarks: data.remarks || data.additionalDetails?.remarks || null,
        churchId,
        userId,
        status: 'Draft',
        code: data.code
      });

      // Validate application data
      const validationResult = application.validate();
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Application validation failed',
            details: validationResult.errors
          }
        };
      }

      // Check for duplicate
      const duplicate = await NicheApplicationRepository.checkDuplicate(
        application.nicheId,
        application.agreementDate
      );

      if (duplicate) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE',
            message: 'Duplicate application found for this niche and date'
          },
          data: {
            existingCode: duplicate.code
          }
        };
      }

      // Create beneficiary objects from optimized structure using the buildBeneficiaryEntity function
      const beneficiaries = beneficiariesArray.map(beneficiary => {
        return buildBeneficiaryEntity(beneficiary);
      }).filter(beneficiary => beneficiary !== null); // Remove any null beneficiaries

      // Create in repository
      const code = await NicheApplicationRepository.create(application, beneficiaries);

      logger.info(`Niche application created: ${code}`);

      // AUTO-CONFIRM BOOKING: Move status from Draft (1) to Booked (3) automatically
      try {
        const confirmResult = await this.confirmBooking(code, churchId);
        if (confirmResult.success) {
          logger.info(`[createApplication] Auto-confirmed booking for application: ${code}`);
        } else {
          logger.warn(`[createApplication] Auto-confirmation failed for application: ${code}`, confirmResult.error);
        }
      } catch (confirmError) {
        logger.error(`[createApplication] Error during auto-confirmation for application: ${code}`, confirmError);
      }

      // Fetch the created application to get complete data
      const createdApplication = await NicheApplicationRepository.getByCode(code);

      let responseData;
      let invoiceInfo = null;

      if (createdApplication) {
        const applicationJson = createdApplication.toJSON();
        responseData = this.buildOptimizedApplicationResponse(createdApplication, data);

        if (attachInvoicePdf) {
          try {
            const invoicePayload = {
              applicationCode: code,
              applicantName: applicationJson.applicant?.name,
              nicheNumber: applicationJson.niche?.nicheId,
              amount: applicationJson.niche?.amount,
              refDocType: pickFirst(data.refDocType, 'NAPP')
            };

            const invoiceFileName = await pdfService.generateInvoicePdf(invoicePayload);
            invoiceInfo = {
              fileName: invoiceFileName,
              relativePath: `/pdfs/${invoiceFileName}`
            };
          } catch (invoiceError) {
            logger.warn('Failed to generate invoice for niche application:', invoiceError);
          }
        }

        if (invoiceInfo) {
          responseData.invoice = invoiceInfo;
        }
      } else {
        responseData = {
          code,
          applicationNumber: code
        };
      }

      // Invalidate cache to ensure fresh data on next request
      invalidateNicheApplicationCache();

      logger.info('[createApplication] Cache invalidated after creation, preparing response');

      return {
        success: true,
        code,
        applicationNumber: code,
        data: responseData,
        message: 'Niche application created successfully'
      };
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        logger.warn('Service: Database unavailable while creating niche application, acknowledging request');
        return {
          success: true,
          code: null,
          applicationNumber: null,
          message: 'Request received. Database is temporarily unavailable; please verify later.'
        };
      }
      logger.error('Service: Failed to create niche application:', error);
      throw error;
    }
  }

  /**
   * Build optimized response for update operations
   */
  buildOptimizedResponse(code, message) {
    return {
      success: true,
      code: code,
      message: message
    };
  }

  /**
   * Validate optimized payload structure
   * Enhanced validation for both create and update operations
   */
  validateOptimizedPayload(data) {
    const errors = [];

    // Required fields validation
    if (!data.niche?.id && !data.nicheId) {
      errors.push('Niche ID is required');
    }

    if (data.applicant && !data.applicant.name) {
      errors.push('Applicant name is required');
    }

    if (data.applicant && !data.applicant.idNo) {
      errors.push('Applicant ID/NRIC is required');
    }

    // Validate nominees array structure
    if (Array.isArray(data.nominees)) {
      data.nominees.forEach((nominee, index) => {
        if (!nominee.name) {
          errors.push(`Nominee ${index + 1}: Name is required`);
        }
        // ID is not always required for updates
      });
    }

    // Validate beneficiaries array structure - this is critical for the issue
    if (Array.isArray(data.beneficiaries)) {
      logger.info(`[Service] Validating ${data.beneficiaries.length} beneficiaries`);
      data.beneficiaries.forEach((beneficiary, index) => {
        if (!beneficiary.name) {
          errors.push(`Beneficiary ${index + 1}: Name is required`);
        }
        // Log beneficiary data for debugging
        logger.info(`[Service] Beneficiary ${index + 1}:`, {
          name: beneficiary.name,
          id: beneficiary.id,
          hasRelationship: !!beneficiary.relationship,
          hasDateOfBirth: !!beneficiary.dateOfBirth,
          hasBirthYear: !!beneficiary.birthYear
        });
      });
    } else {
      logger.info('[Service] No beneficiaries array found in payload');
    }

    const isValid = errors.length === 0;
    logger.info(`[Service] Payload validation ${isValid ? 'PASSED' : 'FAILED'} with ${errors.length} errors`);

    return {
      isValid,
      errors
    };
  }

  /**
   * Build optimized response structure matching the desired format
   */
  buildOptimizedApplicationResponse(application, requestData) {
    if (!application) {
      return null;
    }

    const applicationJson = application.toJSON ? application.toJSON() : application;

    // Build address strings
    const buildAddressString = (address) => {
      if (!address) return null;
      return [
        address.no,
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.country
      ].filter(Boolean).join(', ');
    };

    const applicantAddressFormatted = buildAddressString(applicationJson.applicant?.address);
    const nomineeAddressFormatted = applicationJson.nominee
      ? buildAddressString(applicationJson.nominee.address)
      : null;
    const nominee2AddressFormatted = applicationJson.nominee2
      ? buildAddressString(applicationJson.nominee2.address)
      : null;

    // Transform beneficiaries to response format
    // Resolve status from requestData (frontend payload) since NicheApplicationBeneficiary has no status column
    const rawBeneficiaries = Array.isArray(requestData?.beneficiaries) ? requestData.beneficiaries : [];
    const beneficiariesForResponse = (applicationJson.beneficiaries || []).map((beneficiary, index) => {
      const resolvedStatus = beneficiary.status || rawBeneficiaries[index]?.status || 'Not Occupied';
      return {
        name: beneficiary.name,
        idNo: beneficiary.idNo,
        isCatholic: beneficiary.isCatholic,
        isMale: beneficiary.isMale,
        relationshipToApplicant: beneficiary.relationshipToApplicant,
        dateOfBirth: beneficiary.dateOfBirth,
        birthYear: beneficiary.birthYear,
        relationshipToNominee1: beneficiary.relationshipToNominee1,
        relationshipToNominee2: beneficiary.relationshipToNominee2,
        status: resolvedStatus,
        sex: beneficiary.isMale ? 'Male' : 'Female',
        lifeStatus: beneficiary.lifeStatus || resolvedStatus
      };
    });

    // Transform nominees to response format
    const nomineesForResponse = [];
    if (applicationJson.nominee) {
      nomineesForResponse.push({
        name: applicationJson.nominee.name,
        idNo: applicationJson.nominee.idNo,
        email: applicationJson.nominee.email,
        mobileNo: applicationJson.nominee.mobileNo,
        relationship: applicationJson.nominee.relationship,
        address: nomineeAddressFormatted,
        status: 'Active'
      });
    }
    if (applicationJson.nominee2) {
      nomineesForResponse.push({
        name: applicationJson.nominee2.name,
        idNo: applicationJson.nominee2.idNo,
        email: applicationJson.nominee2.email,
        mobileNo: applicationJson.nominee2.mobileNo,
        relationship: applicationJson.nominee2.relationship,
        address: nominee2AddressFormatted,
        status: 'Active'
      });
    }

    return {
      applicationCode: applicationJson.code,
      appliedDate: applicationJson.appliedDate,
      agreementDate: applicationJson.agreementDate,
      applicant: {
        name: applicationJson.applicant?.name,
        address: applicantAddressFormatted,
        addressNo: applicationJson.applicant?.address?.no,
        addressLine1: applicationJson.applicant?.address?.line1,
        addressLine2: applicationJson.applicant?.address?.line2,
        addressCity: applicationJson.applicant?.address?.city,
        addressState: applicationJson.applicant?.address?.state,
        addressCountry: applicationJson.applicant?.address?.country,
        email: applicationJson.applicant?.email,
        idNo: applicationJson.applicant?.idNo,
        mobileNo: applicationJson.applicant?.mobileNo,
        homeTelNo: applicationJson.applicant?.homeTelNo,
        officeTelNo: applicationJson.applicant?.officeTelNo,
        isCatholic: applicationJson.applicant?.isCatholic
      },
      nominees: nomineesForResponse,
      beneficiaries: beneficiariesForResponse,
      niche: {
        number: applicationJson.niche?.nicheId?.toString(),
        code: applicationJson.niche?.code,
        rowNumber: applicationJson.niche?.rowNumber,
        wallName: applicationJson.niche?.wallName,
        chapelName: applicationJson.niche?.chapel,
        totalAmount: applicationJson.niche?.amount || 0,
        lineAmount: applicationJson.niche?.defaultAmount || 0
      },
      status: applicationJson.status,
      remarks: applicationJson.remarks || null,
      metadata: {
        generatedAt: new Date().toISOString(),
        beneficiaryCount: beneficiariesForResponse.length,
        nomineeCount: nomineesForResponse.length
      }
    };
  }

  /**
   * Get niche application by code
   * Based on: ViewNicheApplication WebMethod
   * @param {string} code - Application code
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Application data
   */
  async getApplicationByCode(code, churchId) {
    try {
      const startTime = Date.now();

      // CRITICAL OPTIMIZATION: Add caching for single-record lookups
      // This significantly improves performance for repeated queries
      // Cache key includes code and churchId for proper isolation
      const cacheKey = `${NICHE_APPLICATION_CACHE_PREFIX}single:${churchId}:${code}`;
      const bypassCache = process.env.BYPASS_CACHE === 'true';

      if (enableNicheApplicationCache && !bypassCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
          logger.debug(`[getApplicationByCode] Cache HIT for code: ${code}, churchId: ${churchId}`);
          return cached;
        } else {
          logger.debug(`[getApplicationByCode] Cache MISS for code: ${code}, churchId: ${churchId}`);
        }
      }

      // CRITICAL OPTIMIZATION: Parallel queries for better performance
      // Fetch application and consent form in parallel instead of sequentially
      // This reduces total query time from (query1 + query2) to max(query1, query2)
      const [application, consentFormRecord] = await Promise.allSettled([
        NicheApplicationRepository.getByCode(code),
        NicheConcentFormRepository.getByCode(code)
      ]);

      // Handle application query result
      const applicationValue = application.status === 'fulfilled' ? application.value : null;
      const applicationError = application.status === 'rejected' ? application.reason : null;

      if (applicationError) {
        // Check if it's a connection/timeout error
        if (isDatabaseUnavailableError(applicationError)) {
          logger.error(`Database unavailable error when fetching application ${code}:`, applicationError.message);
          throw new Error(`Database connection failed: ${applicationError.message}`);
        }
        logger.error(`Failed to fetch application ${code}:`, applicationError);
        throw applicationError;
      }

      if (!applicationValue) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        };
      }

      // Check church ACL
      if (applicationValue.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      // Handle consent form query result (non-critical, can fail gracefully)
      const consentFormValue = consentFormRecord.status === 'fulfilled' ? consentFormRecord.value : null;
      if (consentFormRecord.status === 'rejected') {
        logger.warn(`Service: Unable to retrieve consent form for application ${code}:`, consentFormRecord.reason?.message);
      }

      const responseData = buildApplicationResponse(applicationValue);

      // Enrich beneficiaries with BeneficiaryStatus from NicheBookingBeneficiary
      if (responseData && responseData.beneficiaries) {
        try {
          const { executeQuery } = require('../config/database');
          const statusResult = await executeQuery(
            `SELECT TOP 5 nbb.Name, nbb.BeneficiaryStatus
             FROM NicheBooking nb WITH (NOLOCK)
             INNER JOIN NicheBookingBeneficiary nbb WITH (NOLOCK) ON nb.NicheBookingId = nbb.NicheBookingId
             WHERE nb.NicheApplicationId = @appId
               AND nbb.BeneficiaryStatus >= 0
             ORDER BY nbb.NicheBookingBeneficiaryId`,
            { appId: applicationValue.nicheApplicationId },
            { timeout: 10000 }
          );
          const statusRecords = statusResult.recordset || [];
          responseData.beneficiaries.forEach((bene, idx) => {
            const match = statusRecords.find(r =>
              r.Name && bene.name && r.Name.trim().toLowerCase() === bene.name.trim().toLowerCase()
            ) || statusRecords[idx];
            if (match) {
              bene.status = match.BeneficiaryStatus === 1 ? 'Occupied' : 'Not Occupied';
              bene.lifeStatus = match.BeneficiaryStatus === 1 ? 'Occupied' : 'Not Occupied';
            }
          });
        } catch (statusErr) {
          logger.warn('[getApplicationByCode] Could not enrich beneficiary status:', statusErr.message);
        }
      }

      const consentFormsPayload = buildConsentFormsPayload({
        selections: consentFormValue?.consentForms,
        consentRecord: consentFormValue
      });

      if (responseData) {
        responseData.consentForms = consentFormsPayload.selections;
        responseData.consentFormsOptions = consentFormsPayload.options;
        responseData.consentFormsStatusCode = consentFormsPayload.encodedStatus;
        responseData.consentFormsSource = consentFormsPayload.source;
        responseData.consentFormsUpdatedAt = consentFormsPayload.updatedAt;
        responseData.consentFormId = consentFormsPayload.consentFormId;
      }

      const result = {
        success: true,
        data: responseData
      };

      // Cache the result for better performance on repeated queries
      if (enableNicheApplicationCache && !bypassCache && cacheKey) {
        cache.set(cacheKey, result, cacheTtlSeconds);
        logger.debug(`[getApplicationByCode] Cache SET for code: ${code}, churchId: ${churchId}, TTL: ${cacheTtlSeconds}s`);
      }

      const totalTime = Date.now() - startTime;
      logger.debug(`getApplicationByCode completed in ${totalTime}ms for code: ${code}`);

      return result;
    } catch (error) {
      logger.error('Service: Failed to get niche application:', error);
      throw error;
    }
  }

  /**
   * Update niche application
   * Based on: UpdateNewicheApplication WebMethod
   * @param {string} code - Application code
   * @param {Object} data - Updated application data
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Update result
   */
  async updateApplication(code, data, churchId) {
    try {
      // Check existing application
      const existing = await NicheApplicationRepository.getByCode(code);

      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        };
      }

      // Check church ACL
      if (existing.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      // Allow modification of all statuses including Booked (3) and Completed (4)
      // Validation removed to enable updates for all application statuses

      const requestedConsentForms = data.consentForms ? normalizeConsentForms(data.consentForms) : null;
      const shouldPersistConsent = requestedConsentForms ? hasConsentSelections(requestedConsentForms) : false;

      // Create updated application object
      // First, extract nested data from payload and map to flat entity fields
      const applicantData = data.applicant || {};
      const nomineeData = Array.isArray(data.nominees) ? data.nominees[0] : data.nominee || {};
      const nominee2Data = Array.isArray(data.nominees) && data.nominees.length > 1 ? data.nominees[1] : data.nominee2 || {};
      const pickUpdateValue = (incomingValue, currentValue) => (
        incomingValue === undefined ? currentValue : incomingValue
      );

      // Helper to pick the first non-undefined value, allowing null/empty string to be picked
      const pickFirstIncludeEmpty = (...args) => args.find(arg => arg !== undefined);

      // 3. Prepare application update data
      // Use pickFirstIncludeEmpty to allow clearing fields (e.g. removing a second nominee or contact info)
      const applicationData = {
        ...existing, // Preserve existing fields not explicitly updated
        // Applicant
        applicantName: pickUpdateValue(pickFirstIncludeEmpty(applicantData.name, data.applicantName), existing.applicantName),
        applicantIDNo: pickUpdateValue(pickFirstIncludeEmpty(applicantData.idNo, data.applicantIDNo), existing.applicantIDNo),
        applicantEmailID: pickUpdateValue(pickFirstIncludeEmpty(applicantData.email, data.applicantEmailID, data.applicantEmail), existing.applicantEmailID),
        applicantMobileNo: pickUpdateValue(pickFirstIncludeEmpty(applicantData.mobileNo, data.applicantMobileNo), existing.applicantMobileNo),
        applicantHomeTelNo: pickUpdateValue(pickFirstIncludeEmpty(applicantData.homeTelNo, data.applicantHomeTelNo), existing.applicantHomeTelNo),
        applicantOfficeTelNo: pickUpdateValue(pickFirstIncludeEmpty(applicantData.officeTelNo, data.applicantOfficeTelNo), existing.applicantOfficeTelNo),
        applicantIsCatholic: applicantData.isCatholic !== undefined ? applicantData.isCatholic : (data.applicantIsCatholic !== undefined ? data.applicantIsCatholic : existing.applicantIsCatholic),

        // Applicant Address
        applicantAddressNo: pickUpdateValue(pickFirstIncludeEmpty(applicantData.address?.no, data.applicantAddressNo), existing.applicantAddressNo),
        applicantAddressLine1: pickUpdateValue(pickFirstIncludeEmpty(applicantData.address?.line1, data.applicantAddressLine1), existing.applicantAddressLine1),
        applicantAddressLine2: pickUpdateValue(pickFirstIncludeEmpty(applicantData.address?.line2, data.applicantAddressLine2), existing.applicantAddressLine2),
        applicantAddressCity: pickUpdateValue(pickFirstIncludeEmpty(applicantData.address?.city, data.applicantAddressCity), existing.applicantAddressCity),
        applicantAddressState: pickUpdateValue(pickFirstIncludeEmpty(applicantData.address?.state, data.applicantAddressState), existing.applicantAddressState),
        applicantAddressCountry: pickUpdateValue(pickFirstIncludeEmpty(applicantData.address?.country, data.applicantAddressCountry), existing.applicantAddressCountry),

        // Nominee 1
        nomineeName: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.name, data.nomineeName), existing.nomineeName),
        nomineeIDNo: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.idNo, data.nomineeIDNo), existing.nomineeIDNo),
        nomineeRelationship: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.relationship, data.nomineeRelationship), existing.nomineeRelationship),
        nomineeEmailID: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.email, data.nomineeEmailID, data.nomineeEmail), existing.nomineeEmailID),
        nomineeMobileNo: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.mobileNo, data.nomineeMobileNo, data.nomineePhone), existing.nomineeMobileNo),
        nomineeHomeTelNo: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.homeTelNo, data.nomineeHomeTelNo), existing.nomineeHomeTelNo),
        nomineeOfficeTelNo: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.officeTelNo, data.nomineeOfficeTelNo), existing.nomineeOfficeTelNo),
        nomineeIsCatholic: nomineeData.isCatholic !== undefined ? nomineeData.isCatholic : (data.nomineeIsCatholic !== undefined ? data.nomineeIsCatholic : existing.nomineeIsCatholic),

        // Nominee 1 Address
        nomineeAddressNo: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.address?.no, data.nomineeAddressNo), existing.nomineeAddressNo),
        nomineeAddressLine1: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.address?.line1, data.nomineeAddressLine1), existing.nomineeAddressLine1),
        nomineeAddressLine2: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.address?.line2, data.nomineeAddressLine2), existing.nomineeAddressLine2),
        nomineeAddressCity: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.address?.city, data.nomineeAddressCity), existing.nomineeAddressCity),
        nomineeAddressState: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.address?.state, data.nomineeAddressState), existing.nomineeAddressState),
        nomineeAddressCountry: pickUpdateValue(pickFirstIncludeEmpty(nomineeData.address?.country, data.nomineeAddressCountry), existing.nomineeAddressCountry),

        // Nominee 2 (Optional)
        nomineeName2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.name, data.nomineeName2), existing.nomineeName2),
        nomineeIDNo2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.idNo, data.nomineeIDNo2), existing.nomineeIDNo2),
        nomineeRelationship2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.relationship, data.nomineeRelationship2), existing.nomineeRelationship2),
        nomineeEmailID2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.email, data.nomineeEmailID2, data.nomineeEmail2), existing.nomineeEmailID2),
        nomineeMobileNo2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.mobileNo, data.nomineeMobileNo2, data.nomineePhone2), existing.nomineeMobileNo2),
        nomineeHomeTelNo2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.homeTelNo, data.nomineeHomeTelNo2), existing.nomineeHomeTelNo2),
        nomineeOfficeTelNo2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.officeTelNo, data.nomineeOfficeTelNo2), existing.nomineeOfficeTelNo2),
        nomineeIsCatholic2: nominee2Data.isCatholic !== undefined ? nominee2Data.isCatholic : (data.nomineeIsCatholic2 !== undefined ? data.nomineeIsCatholic2 : existing.nomineeIsCatholic2),

        // Nominee 2 Address
        nomineeAddressNo2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.address?.no, data.nomineeAddressNo2), existing.nomineeAddressNo2),
        nomineeAddressLine12: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.address?.line1, data.nomineeAddressLine12), existing.nomineeAddressLine12),
        nomineeAddressLine22: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.address?.line2, data.nomineeAddressLine22), existing.nomineeAddressLine22),
        nomineeAddressCity2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.address?.city, data.nomineeAddressCity2), existing.nomineeAddressCity2),
        nomineeAddressState2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.address?.state, data.nomineeAddressState2), existing.nomineeAddressState2),
        nomineeAddressCountry2: pickUpdateValue(pickFirstIncludeEmpty(nominee2Data.address?.country, data.nomineeAddressCountry2), existing.nomineeAddressCountry2),

        // Remarks
        remarks: pickUpdateValue(pickFirstIncludeEmpty(data.remarks), existing.remarks),

        // Contact info object (for state/UI preservation)
        contact: pickUpdateValue(pickFirstIncludeEmpty(data.contact), existing.contact),

        // Other top-level fields
        status: pickUpdateValue(data.status, existing.status),
        agreementDate: pickUpdateValue(data.agreementDate, existing.agreementDate),

        // Preserve IDs
        nicheApplicationId: existing.nicheApplicationId,
        code: existing.code
      };

      const application = new NicheApplication(applicationData);

      // For booked applications (status 3), preserve the existing niche ID to avoid changing allocations
      // Only allow niche ID changes for draft (1) and pending (2) applications
      let normalizedNicheId;

      if (existing.status === 3) { // Booked application
        // Preserve the existing niche ID, ignore any changes in the payload
        normalizedNicheId = existing.nicheId;
      } else {
        // For draft/pending applications, allow niche ID changes
        normalizedNicheId = parseIntegerLike(
          pickFirst(
            data.nicheId,
            data.niche?.nicheId,
            data.niche?.id,
            data.nicheDetails?.nicheId,
            application.niche?.nicheId,
            application.nicheId,
            existing.nicheId
          )
        );

        if (!normalizedNicheId) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Niche ID is required'
            }
          };
        }
      }

      application.nicheId = normalizedNicheId;
      application.amount = coerceNumber(
        pickFirst(
          data.amount,
          data.nicheDetails?.amount,
          application.amount,
          existing.amount
        ),
        existing.amount || 0
      );
      application.defaultAmount = coerceNumber(
        pickFirst(
          data.defaultAmount,
          data.nicheDetails?.defaultAmount,
          application.defaultAmount,
          existing.defaultAmount
        ),
        existing.defaultAmount || 0
      );

      // Create beneficiary objects
      const hasFlatBeneficiaryFields = ['beneficiary1Name', 'beneficiary2Name', 'beneficiary3Name', 'beneficiary4Name', 'beneficiary5Name']
        .some((field) => Object.prototype.hasOwnProperty.call(data, field));
      const beneficiaries = [];
      if (Array.isArray(data.beneficiaries)) {
        data.beneficiaries.forEach(beneficiary => {
          const entity = buildBeneficiaryEntity(beneficiary);
          if (entity) {
            beneficiaries.push(entity);
          }
        });
      } else if (hasFlatBeneficiaryFields) {
        // Process beneficiaries from old flat structure - unified logic using buildBeneficiaryEntity
        ['beneficiary1', 'beneficiary2', 'beneficiary3', 'beneficiary4', 'beneficiary5'].forEach((fieldPrefix) => {
          let input = {};

          // Case 1: data.beneficiaryX is an object (nested structure in flat payload)
          const beneficiaryData = data[fieldPrefix];
          if (beneficiaryData && typeof beneficiaryData === 'object') {
            input = { ...beneficiaryData };
          }

          // Case 2: Flat properties (override or augment, e.g. beneficiary1Name)
          const name = data[`${fieldPrefix}Name`];
          // Only process if we have a name in the flat property OR we already established an input object with a name
          if (name || input.name) {
            if (name) input.name = name;
            if (data[`${fieldPrefix}Relationship`] !== undefined) input.relationship = data[`${fieldPrefix}Relationship`];
            if (data[`${fieldPrefix}DateOfBirth`] !== undefined) input.dateOfBirth = data[`${fieldPrefix}DateOfBirth`];
            if (data[`${fieldPrefix}BirthYear`] !== undefined) input.birthYear = data[`${fieldPrefix}BirthYear`];

            const idNo = data[`${fieldPrefix}IDNo`] || data[`${fieldPrefix}IdNo`];
            if (idNo !== undefined) input.idNo = idNo;

            const isCatholic = data[`${fieldPrefix}IsCatholic`];
            if (isCatholic !== undefined) input.isCatholic = isCatholic;

            const isMale = data[`${fieldPrefix}IsMale`];
            if (isMale !== undefined) input.isMale = isMale;

            const gender = data[`${fieldPrefix}Gender`];
            if (gender !== undefined) input.gender = gender;

            const rel1 = data[`${fieldPrefix}RelationshipToNominee1`];
            if (rel1 !== undefined) input.relationshipToNominee1 = rel1;

            const rel2 = data[`${fieldPrefix}RelationshipToNominee2`];
            if (rel2 !== undefined) input.relationshipToNominee2 = rel2;

            const entity = buildBeneficiaryEntity(input);
            if (entity) {
              beneficiaries.push(entity);
            }
          }
        });
      } else {
        // If update payload omits beneficiary fields, preserve existing beneficiaries.
        const existingBeneficiaries = Array.isArray(existing.beneficiaries) ? existing.beneficiaries : [];
        existingBeneficiaries.forEach((beneficiary) => {
          const entity = buildBeneficiaryEntity(beneficiary);
          if (entity) {
            beneficiaries.push(entity);
          }
        });
      }

      // NOTE:
      // Duplicate nominee validation is intentionally removed per business request.
      // A person is now allowed to appear as multiple nominee entries.

      const updateBeneficiaryKeys = new Set();
      const updateDuplicateBeneficiaryDescriptions = new Set();
      beneficiaries.forEach((beneficiary) => {
        if (!beneficiary) return;
        const key = buildPersonKey({
          name: beneficiary.name,
          idNo: beneficiary.idNo
        });
        if (!key) return;
        if (updateBeneficiaryKeys.has(key)) {
          updateDuplicateBeneficiaryDescriptions.add(
            pickFirst(beneficiary.name, beneficiary.idNo) || 'Unknown beneficiary'
          );
        } else {
          updateBeneficiaryKeys.add(key);
        }
      });

      /*
      // Duplicate beneficiary validation removed to allow same person as multiple beneficiaries
      if (updateDuplicateBeneficiaryDescriptions.size > 0) {
        const errors = [];
        if (updateDuplicateBeneficiaryDescriptions.size > 0) {
          errors.push(
            `Same person cannot be added as multiple beneficiaries: ${Array.from(updateDuplicateBeneficiaryDescriptions).join(', ')}`
          );
        }

        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: errors.join(' | ')
          }
        };
      }
      */

      // Validate
      const appValidation = application.validate();
      if (!appValidation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: appValidation.errors.join(', ')
          }
        };
      }

      for (const beneficiary of beneficiaries) {
        const beneficiaryValidation = beneficiary.validate();
        if (!beneficiaryValidation.isValid) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: `Beneficiary validation failed: ${beneficiaryValidation.errors.join(', ')}`
            }
          };
        }
      }

      // Update application with beneficiaries
      logger.info('[Service] Calling repository update with beneficiaries...');
      logger.info('[Service] Beneficiaries count being passed:', beneficiaries.length);
      await NicheApplicationRepository.update(
        code,
        application,
        beneficiaries // Pass the actual beneficiaries array
      );

      // Sync beneficiary status to NicheBookingBeneficiary (the only table with a BeneficiaryStatus column)
      await this._syncBeneficiaryStatusToBooking(existing, data, beneficiaries);

      let consentFormsPayload = null;
      if (shouldPersistConsent) {
        try {
          const refreshedApplication = await NicheApplicationRepository.getByCode(code);
          const consentEntity = buildConsentFormEntityFromApplication({
            consentSelections: requestedConsentForms,
            application: refreshedApplication || application,
            userId: refreshedApplication?.userId || application.userId
          });

          if (consentEntity) {
            const consentRecord = await NicheConcentFormRepository.upsert(consentEntity);
            consentFormsPayload = buildConsentFormsPayload({
              selections: consentRecord?.consentForms || requestedConsentForms,
              consentRecord
            });
          }
        } catch (consentError) {
          logger.error('Service: Failed to update consent forms for niche application:', consentError);
        }
      }

      logger.info(`Niche application updated: ${code}`);

      // Re-fetch the updated application so the frontend store can refresh
      let updatedApplication = null;
      try {
        updatedApplication = await NicheApplicationRepository.getByCode(code);
      } catch (fetchErr) {
        logger.warn('[updateApplication] Non-fatal: failed to re-fetch updated application', fetchErr.message);
      }

      const responsePayload = {
        success: true,
        code,
        data: updatedApplication ? updatedApplication.toJSON() : null,
        message: 'Niche application updated successfully'
      };

      if (consentFormsPayload) {
        responsePayload.consentForms = consentFormsPayload.selections;
        responsePayload.consentFormsOptions = consentFormsPayload.options;
        responsePayload.consentFormsStatusCode = consentFormsPayload.encodedStatus;
        responsePayload.consentFormsUpdatedAt = consentFormsPayload.updatedAt;
        responsePayload.consentFormId = consentFormsPayload.consentFormId;
      } else if (requestedConsentForms && shouldPersistConsent) {
        responsePayload.consentForms = requestedConsentForms;
        responsePayload.consentFormsOptions = buildConsentFormOptions(requestedConsentForms);
        responsePayload.consentFormsStatusCode = NicheConcentForm.encodeConsentSelections(requestedConsentForms);
      }

      // Invalidate cache to ensure fresh data on next request
      // Use aggressive invalidation strategy
      invalidateNicheApplicationCache();

      // Log cache invalidation for debugging
      logger.info('[updateApplication] Cache invalidated after update, preparing response');

      // Additional cache verification
      if (process.env.NODE_ENV === 'development') {
        const remainingKeys = cache.keys().filter(key => key.startsWith(NICHE_APPLICATION_CACHE_PREFIX));
        logger.debug(`[updateApplication] Cache verification - remaining niche app keys: ${remainingKeys.length}`);
      }

      return responsePayload;
    } catch (error) {
      logger.error('Service: Failed to update niche application:', error);
      throw error;
    }
  }

  /**
   * Delete niche application
   * Based on: DeleteNicheApplication WebMethod
   * @param {string} code - Application code
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Deletion result
   */
  async deleteApplication(code, churchId) {
    try {
      logger.info(`[deleteApplication] Starting deletion for code: ${code}, churchId: ${churchId}`);

      // Get application to check church access
      const application = await NicheApplicationRepository.getByCode(code);

      if (!application) {
        logger.warn(`[deleteApplication] Application not found: ${code}`);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        };
      }

      if (application.churchId !== churchId) {
        logger.warn(`[deleteApplication] Access denied: churchId ${churchId} tried to delete application ${code} belonging to churchId ${application.churchId}`);
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      // Perform soft delete (sets Status = 0)
      logger.info(`[deleteApplication] Executing soft delete (Status = 0) for code: ${code}, nicheId: ${application.nicheId}`);
      await NicheApplicationRepository.deleteByCode(code);

      logger.info(`[deleteApplication] Successfully deleted application ${code}`);

      // Invalidate cache to ensure fresh data on next request
      // Use aggressive invalidation strategy
      invalidateNicheApplicationCache();
      logger.info('[deleteApplication] Cache invalidated - all niche application cache entries cleared');

      // Additional cache verification
      if (process.env.NODE_ENV === 'development') {
        const remainingKeys = cache.keys().filter(key => key.startsWith(NICHE_APPLICATION_CACHE_PREFIX));
        logger.debug(`[deleteApplication] Cache verification - remaining niche app keys: ${remainingKeys.length}`);
      }

      // Log cache invalidation for debugging
      logger.info('[deleteApplication] Cache invalidated after deletion, preparing response');

      return {
        success: true,
        message: 'Niche application deleted successfully (niche restored to vacant)'
      };
    } catch (error) {
      logger.error('Service: Failed to delete niche application:', error);
      throw error;
    }
  }

  /**
   * Warm cache with common queries for improved performance
   * This pre-loads frequently accessed data into cache
   * @param {Array<number>} churchIds - Church IDs to warm cache for
   * @returns {Promise<Object>} Warming results
   */
  async warmCache(churchIds = []) {
    if (!enableNicheApplicationCache) {
      logger.info('Cache warming skipped: caching is disabled');
      return { success: false, message: 'Caching is disabled' };
    }

    if (!Array.isArray(churchIds) || churchIds.length === 0) {
      logger.warn('Cache warming skipped: no church IDs provided');
      return { success: false, message: 'No church IDs provided' };
    }

    const results = {
      success: true,
      warmed: 0,
      failed: 0,
      errors: []
    };

    // Common query patterns to warm
    const commonQueries = [
      { page: 1, pageSize: 20, skipTotal: true, lightweight: true },
      { page: 1, pageSize: 20, status: 3, skipTotal: true, lightweight: true }, // Booked status
      { page: 1, pageSize: 20, status: 1, skipTotal: true, lightweight: true }, // Draft status
      { page: 1, pageSize: 50, skipTotal: true, lightweight: true } // Larger page size
    ];

    logger.info(`Starting cache warming for ${churchIds.length} church(s)...`);

    for (const churchId of churchIds) {
      for (const query of commonQueries) {
        try {
          // Warm cache by executing search with cache enabled
          await this.searchApplications(query, churchId);
          results.warmed++;
          logger.debug(`Cache warmed for church ${churchId} with query: ${JSON.stringify(query)}`);
        } catch (error) {
          results.failed++;
          results.errors.push({
            churchId,
            query,
            error: error.message
          });
          logger.warn(`Failed to warm cache for church ${churchId}:`, error.message);
        }
      }
    }

    logger.info(`Cache warming completed: ${results.warmed} queries warmed, ${results.failed} failed`);
    return results;
  }

  /**
   * Send invoice email for an existing application
   * @param {string} code - Application code
   * @param {number} churchId - Church ID for ACL
   * @param {Object} options - Additional options (recipient override)
   * @returns {Promise<Object>}
   */
  async sendInvoiceEmail(code, churchId, options = {}) {
    try {
      const application = await NicheApplicationRepository.getByCode(code);

      if (!application) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        };
      }

      if (application.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      const applicationJson = application.toJSON();
      const applicant = applicationJson.applicant || {};
      const nominee = applicationJson.nominee || null;
      const nominee2 = applicationJson.nominee2 || null;

      const applicantAddressFormatted = buildAddressString(applicant.address || {});
      const nomineeAddressFormatted = nominee ? buildAddressString(nominee.address || {}) : null;
      const nominee2AddressFormatted = nominee2 ? buildAddressString(nominee2.address || {}) : null;

      const nicheDetails = {
        nicheId: applicationJson.niche?.nicheId || application.nicheId,
        nicheCode: applicationJson.niche?.code || applicationJson.niche?.nicheId || application.nicheId,
        chapel: applicationJson.niche?.chapelName || applicationJson.niche?.chapel,
        wallName: applicationJson.niche?.wallName || null,
        rowNumber: applicationJson.niche?.rowNumber || null,
        rowLevel: applicationJson.niche?.rowLevel || null,
        amount: coerceNumber(applicationJson.niche?.amount || application.amount, 0),
        defaultAmount: coerceNumber(applicationJson.niche?.defaultAmount || application.defaultAmount, 0)
      };

      let invoiceInfo = null;
      let invoicePathAbsolute = null;
      let invoiceFileNameGenerated = null;

      try {
        const invoicePayload = {
          applicationCode: application.code,
          agreementDate: application.agreementDate,
          applicant: {
            name: applicant.name,
            address: applicantAddressFormatted || '',
            mobileNo: applicant.mobileNo || '',
            email: applicant.email || '',
            nric: applicant.idNo || ''
          },
          niche: {
            chapelName: nicheDetails.chapel || 'Franciscan Columbarium',
            number: nicheDetails.nicheCode || String(nicheDetails.nicheId || ''),
            totalAmount: (coerceNumber(nicheDetails.amount, 0)).toFixed(2)
          },
          invoice: {
            invoiceNo: `${application.code}-INV`,
            invoiceDate: new Date().toLocaleDateString('en-SG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            additionalCharges: null,
            receiptAmount: null
          },
          metadata: {
            applicationNumber: application.code
          }
        };

        const invoiceFileName = await pdfService.generateInvoicePdf(invoicePayload);
        const invoicePath = path.join(process.cwd(), 'public', 'pdfs', invoiceFileName);
        invoiceFileNameGenerated = invoiceFileName;
        invoicePathAbsolute = invoicePath;
        invoiceInfo = {
          fileName: invoiceFileName,
          relativePath: `/pdfs/${invoiceFileName}`
        };
      } catch (invoiceError) {
        logger.warn(`Failed to generate invoice for application ${code}:`, invoiceError);
      }

      const recipientOverride = options.to && typeof options.to === 'string'
        ? options.to.trim()
        : null;

      const recipientEmails = [
        recipientOverride,
        applicant.email,
        nominee?.email,
        nominee2?.email
      ]
        .filter(Boolean)
        .map(email => email.trim())
        .filter(Boolean);

      const uniqueRecipientEmails = [...new Set(recipientEmails)];

      if (uniqueRecipientEmails.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_RECIPIENT',
            message: 'No recipient email available for this application'
          }
        };
      }

      let emailResult;
      try {
        emailResult = await MailService.sendNicheApplicationAcknowledgement({
          recipientEmail: uniqueRecipientEmails.join(', '),
          application: {
            code: application.code,
            applicationNumber: application.code,
            nicheDetails,
            applicant: {
              name: applicant.name,
              email: applicant.email,
              mobileNo: applicant.mobileNo,
              idNo: applicant.idNo,
              address: applicantAddressFormatted || null
            },
            nominee: nominee
              ? {
                ...nominee,
                address: {
                  ...nominee.address,
                  formatted: nomineeAddressFormatted || null
                }
              }
              : null,
            nominee2: nominee2
              ? {
                ...nominee2,
                address: {
                  ...nominee2.address,
                  formatted: nominee2AddressFormatted || null
                }
              }
              : null
          },
          invoicePath: invoicePathAbsolute,
          invoiceFileName: invoiceFileNameGenerated
        });
      } catch (emailError) {
        logger.error(`Failed to send invoice email for application ${code}:`, emailError);
        return {
          success: false,
          error: {
            code: 'MAIL_SEND_FAILED',
            message: emailError.message || 'Failed to send invoice email'
          }
        };
      }

      if (!emailResult.success) {
        return {
          success: false,
          error: {
            code: emailResult.skipped ? 'MAIL_NOT_CONFIGURED' : 'MAIL_SEND_FAILED',
            message: emailResult.message || 'Failed to send invoice email'
          }
        };
      }

      return {
        success: true,
        data: {
          recipients: uniqueRecipientEmails,
          invoiceAttachment: Boolean(invoiceInfo)
        },
        message: `Invoice email sent to ${uniqueRecipientEmails.join(', ')}`
      };
    } catch (error) {
      logger.error('Service: Failed to send invoice email:', error);
      throw error;
    }
  }

  /**
   * Confirm booking and change application status from Draft to Booked
   * @param {string} code - Application code
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Result with success status and updated application data
   */

  /**
   * Sync beneficiary "Occupied/Not Occupied" status from the frontend payload
   * into NicheBookingBeneficiary.BeneficiaryStatus (the only DB column that stores this).
   * Also updates Niche.Status to 4 (Occupied) / 5 (Partially Occupied) / 3 (Booked)
   * when the application has an inscription with deceased data.
   */
  async _syncBeneficiaryStatusToBooking(existingApplication, rawPayload, beneficiaryEntities) {
    try {
      const { executeQuery } = require('../config/database');
      const nicheApplicationId = existingApplication.nicheApplicationId;

      // Extract raw status values from the payload (before buildBeneficiaryEntity dropped them)
      const rawStatuses = [];
      if (Array.isArray(rawPayload.beneficiaries)) {
        rawPayload.beneficiaries.forEach(b => {
          rawStatuses.push(b.status || 'Not Occupied');
        });
      } else {
        ['beneficiary1', 'beneficiary2', 'beneficiary3'].forEach(prefix => {
          const statusField = rawPayload[`${prefix}Status`] || rawPayload[prefix]?.status;
          if (statusField !== undefined) rawStatuses.push(statusField);
        });
      }

      if (rawStatuses.length === 0 && beneficiaryEntities.length === 0) return;

      // Find the NicheBooking for this application
      const bookingResult = await executeQuery(
        `SELECT TOP 1 NicheBookingId FROM NicheBooking WITH (NOLOCK) WHERE NicheApplicationId = @appId`,
        { appId: nicheApplicationId },
        { timeout: 10000 }
      );

      if (!bookingResult.recordset || bookingResult.recordset.length === 0) {
        logger.info('[_syncBeneficiaryStatusToBooking] No NicheBooking found for application, skipping status sync');
        return;
      }

      const bookingId = bookingResult.recordset[0].NicheBookingId;

      // Get existing NicheBookingBeneficiary records (exclude deactivated)
      const nbbResult = await executeQuery(
        `SELECT NicheBookingBeneficiaryId, Name, IDNo, BeneficiaryStatus
         FROM NicheBookingBeneficiary WITH (NOLOCK)
         WHERE NicheBookingId = @bookingId AND BeneficiaryStatus >= 0
         ORDER BY NicheBookingBeneficiaryId`,
        { bookingId },
        { timeout: 10000 }
      );

      const nbbRecords = nbbResult.recordset || [];

      // Parse status string to DB integer using the same logic as NicheBookingService
      const parseStatus = (val) => {
        if (val === undefined || val === null) return 1;
        if (typeof val === 'number') return val;
        const normalized = String(val).trim().toLowerCase();
        if (['active', 'occupied', 'confirmed'].includes(normalized)) return 1;
        if (['inactive', 'not occupied', 'pending', 'available'].includes(normalized)) return 0;
        if (['deceased', 'released', 'closed'].includes(normalized)) return 2;
        return 1;
      };

      // Match beneficiaries by name or IDNo (case-insensitive) and update status
      for (let i = 0; i < beneficiaryEntities.length; i++) {
        const entity = beneficiaryEntities[i];
        // Use raw status from frontend payload, aligned by name match rather than index
        const rawMatch = Array.isArray(rawPayload.beneficiaries)
          ? rawPayload.beneficiaries.find(b =>
            b.name && entity.name &&
            b.name.trim().toLowerCase() === entity.name.trim().toLowerCase()
          )
          : undefined;
        const statusValue = rawMatch?.status ?? (rawStatuses[i] !== undefined ? rawStatuses[i] : 'Not Occupied');
        const dbStatus = parseStatus(statusValue);

        // Find matching NicheBookingBeneficiary by name first, then by IDNo
        let match = nbbRecords.find(r =>
          r.Name && entity.name &&
          r.Name.trim().toLowerCase() === entity.name.trim().toLowerCase()
        );
        if (!match && entity.idNo) {
          match = nbbRecords.find(r =>
            r.IDNo && entity.idNo &&
            r.IDNo.trim().toLowerCase() === entity.idNo.trim().toLowerCase()
          );
        }
        // Fall back to positional matching if only one record
        if (!match && nbbRecords.length === 1 && beneficiaryEntities.length === 1) {
          match = nbbRecords[0];
        }

        if (match && match.BeneficiaryStatus !== dbStatus) {
          await executeQuery(
            `UPDATE NicheBookingBeneficiary SET BeneficiaryStatus = @status WHERE NicheBookingBeneficiaryId = @id`,
            { status: dbStatus, id: match.NicheBookingBeneficiaryId },
            { timeout: 10000 }
          );
          logger.info(`[_syncBeneficiaryStatusToBooking] Updated BeneficiaryStatus to ${dbStatus} for ${entity.name}`);
        } else if (!match) {
          logger.warn(`[_syncBeneficiaryStatusToBooking] No NicheBookingBeneficiary match for "${entity.name}" (idNo: ${entity.idNo})`);
        }
      }

      // Check if niche should transition to Occupied (4) / Partially Occupied (5) / Booked (3)
      await this._checkAndUpdateNicheOccupancy(nicheApplicationId, existingApplication.nicheId, bookingId);
    } catch (error) {
      logger.warn('[_syncBeneficiaryStatusToBooking] Non-fatal error syncing beneficiary status:', error.message);
    }
  }

  /**
   * Check if a niche should be marked Occupied based on:
   * 1) At least one beneficiary with BeneficiaryStatus = 1 (Occupied)
   * 2) An inscription exists with deceased/internment data
   */
  async _checkAndUpdateNicheOccupancy(nicheApplicationId, nicheId, bookingId) {
    try {
      const { executeQuery } = require('../config/database');

      if (!nicheId) return;

      // Count occupied vs total beneficiaries
      const countResult = await executeQuery(
        `SELECT
           COUNT(*) AS totalBeneficiaries,
           SUM(CASE WHEN BeneficiaryStatus = 1 THEN 1 ELSE 0 END) AS occupiedCount
         FROM NicheBookingBeneficiary WITH (NOLOCK)
         WHERE NicheBookingId = @bookingId`,
        { bookingId },
        { timeout: 10000 }
      );

      const { totalBeneficiaries, occupiedCount } = countResult.recordset[0] || {};

      // Check if inscription exists with deceased data (internment has occurred)
      const inscriptionResult = await executeQuery(
        `SELECT TOP 1 nird.InternmentDate
         FROM NicheInscriptionRequest nir WITH (NOLOCK)
         INNER JOIN NicheInscriptionRequestDecesed nird WITH (NOLOCK)
           ON nir.NicheInscriptionRequestId = nird.NicheInscriptionRequestId
         WHERE nir.NicheBookingId = @bookingId
           AND nird.InternmentDate IS NOT NULL`,
        { bookingId },
        { timeout: 10000 }
      );

      const hasInternment = inscriptionResult.recordset && inscriptionResult.recordset.length > 0;

      let newStatus;
      if (occupiedCount > 0 && hasInternment) {
        newStatus = (occupiedCount >= totalBeneficiaries) ? 4 : 5; // 4=Occupied, 5=Partially Occupied
      } else if (occupiedCount > 0) {
        newStatus = (occupiedCount >= totalBeneficiaries) ? 4 : 5;
      } else {
        newStatus = 3; // Revert to Booked
      }

      // Only update if current status is 3, 4, or 5 (don't change other statuses like 0, 1, 2)
      await executeQuery(
        `UPDATE Niche SET Status = @newStatus WHERE NicheId = @nicheId AND Status IN (3, 4, 5)`,
        { newStatus, nicheId },
        { timeout: 10000 }
      );

      logger.info(`[_checkAndUpdateNicheOccupancy] Niche ${nicheId}: occupied=${occupiedCount}/${totalBeneficiaries}, internment=${hasInternment}, newStatus=${newStatus}`);
    } catch (error) {
      logger.warn('[_checkAndUpdateNicheOccupancy] Non-fatal error checking niche occupancy:', error.message);
    }
  }

  async confirmBooking(code, churchId) {
    try {
      // Check existing application
      const existing = await NicheApplicationRepository.getByCode(code);

      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        };
      }

      // Check church ACL
      if (existing.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      // Check current status - must be Draft (1) to confirm booking
      if (existing.status !== 1) {
        if (existing.status === 3) {
          return {
            success: false,
            error: {
              code: 'ALREADY_BOOKED',
              message: 'Application is already booked'
            }
          };
        }

        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot confirm booking for application with status: ${existing.getStatusText()}`
          }
        };
      }

      // Update status from Draft (1) to Booked (3)
      const updateResult = await NicheApplicationRepository.updateStatus(code, 3);

      if (!updateResult) {
        return {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update application status'
          }
        };
      }

      // Invalidate cache to ensure fresh data
      invalidateNicheApplicationCache();

      logger.info(`[confirmBooking] Successfully changed application ${code} status from Draft to Booked`);

      return {
        success: true,
        data: {
          code: existing.code,
          previousStatus: 1,
          newStatus: 3,
          statusText: 'Booked'
        },
        message: 'Application booking confirmed successfully'
      };
    } catch (error) {
      logger.error('Service: Failed to confirm booking:', error);
      throw error;
    }
  }
}

module.exports = new NicheApplicationService();

