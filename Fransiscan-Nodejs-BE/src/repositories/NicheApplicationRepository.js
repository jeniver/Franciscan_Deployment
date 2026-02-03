const { executeQuery } = require('../config/database');
const { executeStoredProcedure } = require('../config/knex');
const { NicheApplication, NicheApplicationBeneficiary } = require('../models/NicheApplication');
const logger = require('../utils/logger');

let isCreateStoredProcedureAvailable = null;

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const parseStatusValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const statusMap = {
    deleted: 0,
    draft: 1,
    pending: 2,
    booked: 3,
    completed: 4
  };

  if (Object.prototype.hasOwnProperty.call(statusMap, normalized)) {
    return statusMap[normalized];
  }

  const numeric = Number(normalized);
  if (Number.isNaN(numeric)) {
    return null;
  }

  return numeric;
};

async function ensureCreateStoredProcedureAvailability(spName) {
  if (isCreateStoredProcedureAvailable !== null) {
    return isCreateStoredProcedureAvailable;
  }

  try {
    const result = await executeQuery(`
      SELECT 1 AS HasProcedure
      FROM sys.objects
      WHERE object_id = OBJECT_ID(@spName)
        AND type IN ('P', 'PC')
    `, { spName });

    isCreateStoredProcedureAvailable = Boolean(result.recordset && result.recordset.length > 0);
    if (!isCreateStoredProcedureAvailable) {
      logger.info(`Stored procedure ${spName} not found. Falling back to direct insert.`);
    }
  } catch (error) {
    logger.warn(`Unable to determine availability of stored procedure ${spName}. Falling back to direct insert.`, error.message);
    isCreateStoredProcedureAvailable = false;
  }

  return isCreateStoredProcedureAvailable;
}

class NicheApplicationRepository {
  /**
   * Search applications with filters and pagination
   * @param {Object} params - Search parameters
   * @returns {Promise<{records: Array<NicheApplication>, total: number}>}
   */
  async searchApplications(params) {
    try {
      const {
        churchId,
        page,
        pageSize,
        applicationCode,
        applicantName,
        nomineeName,
        searchTerm,
        fromDate,
        toDate,
        status,
        skipTotal,
        includeBeneficiaries // New parameter to optionally skip beneficiary loading
      } = params;

      // Validate required parameters
      if (!churchId) {
        throw new Error('churchId is required');
      }
      if (!page || page < 1) {
        throw new Error('page must be >= 1');
      }
      if (!pageSize || pageSize < 1) {
        throw new Error('pageSize must be >= 1');
      }

      // Build WHERE clauses with optimized SQL (no UPPER() to allow index usage)
      // Use COLLATE SQL_Latin1_General_CP1_CI_AS for case-insensitive comparison
      const whereClauses = ['ChurchId = @churchId', 'Status > 0'];
      const queryParams = { churchId };

      // Application Code search - optimized for index usage
      if (applicationCode) {
        const trimmedCode = String(applicationCode).trim();
        if (trimmedCode) {
          // Use LIKE with COLLATE for case-insensitive search that can use indexes
          whereClauses.push('Code COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @applicationCode');
          queryParams.applicationCode = `${trimmedCode}%`;
        }
      }

      // Applicant Name search - optimized with prefix preference
      if (applicantName) {
        const trimmedName = String(applicantName).trim();
        if (trimmedName) {
          // Prefer prefix search for better index usage (if name starts with letter)
          // Fallback to contains search if prefix doesn't make sense
          const isPrefixSearch = /^[A-Za-z0-9]/.test(trimmedName);
          queryParams.applicantName = isPrefixSearch ? `${trimmedName}%` : `%${trimmedName}%`;
          whereClauses.push('ApplicantName COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @applicantName');
        }
      }

      // Nominee Name search - optimized with URL decoding and prefix preference
      if (nomineeName) {
        // Decode URL-encoded characters (e.g., + becomes space)
        const decodedName = decodeURIComponent(String(nomineeName).replace(/\+/g, ' '));
        const trimmedName = decodedName.trim();
        if (trimmedName) {
          // Prefer prefix search for better index usage
          const isPrefixSearch = /^[A-Za-z0-9]/.test(trimmedName);
          queryParams.nomineeName = isPrefixSearch ? `${trimmedName}%` : `%${trimmedName}%`;
          whereClauses.push('NomineeName COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @nomineeName');
        }
      }

      // General search term - optimized with scope limiting for wildcard searches
      if (searchTerm) {
        const decodedTerm = decodeURIComponent(String(searchTerm).replace(/\+/g, ' '));
        const trimmedTerm = decodedTerm.trim();
        if (trimmedTerm) {
          // Prefer prefix search when possible (starts with letter/number)
          const isPrefixSearch = /^[A-Za-z0-9]/.test(trimmedTerm);
          const searchPattern = isPrefixSearch ? `${trimmedTerm}%` : `%${trimmedTerm}%`;
          queryParams.searchTerm = searchPattern;
          
          whereClauses.push(`(
            Code COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @searchTerm
            OR ApplicantName COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @searchTerm
            OR NomineeName COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @searchTerm
            OR ApplicantIDNo COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @searchTerm
            OR NomineeIDNo COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @searchTerm
          )`);
          
          // For wildcard searches (contains pattern with leading %), add default date range filter 
          // to limit scope if no date range is provided. This significantly improves performance 
          // on large datasets by limiting the search to recent records
          if (!isPrefixSearch && !fromDate && !toDate) {
            // Limit to last 12 months for wildcard searches without date range
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            oneYearAgo.setHours(0, 0, 0, 0);
            whereClauses.push('AgreementDate >= @minSearchDate');
            queryParams.minSearchDate = oneYearAgo;
            logger.debug('Added default date range filter (last 12 months) for wildcard search without date range');
          }
        }
      }

      // Status filter
      const parsedStatus = parseStatusValue(status);
      if (parsedStatus !== null) {
        whereClauses.push('Status = @status');
        queryParams.status = parsedStatus;
      }

      // Date range filters - optimized for index usage
      const parsedFromDate = parseDateValue(fromDate);
      if (parsedFromDate) {
        // Ensure fromDate starts at beginning of day (00:00:00.000) for proper comparison
        const fromDateStart = new Date(parsedFromDate);
        fromDateStart.setHours(0, 0, 0, 0);
        whereClauses.push('AgreementDate >= @fromDate');
        queryParams.fromDate = fromDateStart;
      }

      const parsedToDate = parseDateValue(toDate);
      if (parsedToDate) {
        // Ensure toDate ends at end of day (23:59:59.999) to include the full day
        const toDateEnd = new Date(parsedToDate);
        toDateEnd.setHours(23, 59, 59, 999);
        whereClauses.push('AgreementDate <= @toDate');
        queryParams.toDate = toDateEnd;
      }

      // CRITICAL OPTIMIZATION: Add default date range filter when no filters are provided
      // This prevents full table scans on large datasets and significantly improves performance
      // Only applies when no explicit date filters, search filters, or code filters are provided
      const hasAnyFilter = applicationCode || applicantName || nomineeName || searchTerm || 
                           parsedFromDate || parsedToDate || parsedStatus !== null;
      
      if (!hasAnyFilter) {
        // Default to last 24 months for better performance on large datasets
        // This ensures queries use the index on AgreementDate instead of scanning entire table
        // This is a critical optimization that prevents 60+ second queries on large tables
        const defaultMonths = parseInt(process.env.NICHE_APPLICATION_DEFAULT_DATE_MONTHS) || 24;
        const defaultDateStart = new Date();
        defaultDateStart.setMonth(defaultDateStart.getMonth() - defaultMonths);
        defaultDateStart.setHours(0, 0, 0, 0);
        whereClauses.push('AgreementDate >= @defaultFromDate');
        queryParams.defaultFromDate = defaultDateStart;
        logger.info(`Added default date range filter (last ${defaultMonths} months) for query without filters to prevent full table scan`);
      }

      // For wildcard searches (contains), add date range filter to limit scope if no date range specified
      // This significantly improves performance on large datasets
      if (searchTerm && !parsedFromDate && !parsedToDate) {
        const decodedTerm = decodeURIComponent(String(searchTerm).replace(/\+/g, ' '));
        const trimmedTerm = decodedTerm.trim();
        if (trimmedTerm && queryParams.searchTerm && queryParams.searchTerm.startsWith('%')) {
          // This is a wildcard search (contains), add default date range to limit scope
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          oneYearAgo.setHours(0, 0, 0, 0);
          whereClauses.push('AgreementDate >= @minDateForWildcard');
          queryParams.minDateForWildcard = oneYearAgo;
          logger.debug('Added date filter for wildcard search to improve performance');
        }
      }

      const whereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      const offset = (page - 1) * pageSize;

      let total = null;
      let totalRecords = null;

      // Default skipTotal to true for better performance - COUNT queries can be slow on large datasets
      // Users can set skipTotal=false to get pagination information (total, totalPages, etc.)
      const shouldSkipTotal = skipTotal !== undefined ? Boolean(skipTotal) : true;

      // Run COUNT query to get total records for pagination
      // Optimized with proper indexing and timeout handling
      if (!shouldSkipTotal) {
        try {
          // Optimized COUNT query - uses same WHERE clause for consistency
          // WITH (NOLOCK) for better performance, and proper indexing should be in place
          const countQuery = `
            SELECT COUNT(*) AS Total
            FROM NicheApplication WITH (NOLOCK)
            ${whereClause}
          `;

          // Use shorter timeout for COUNT query (15 seconds) to ensure fast response
          // If it times out, we'll continue without total count - this is acceptable
          // Frontend timeout is typically 30-60s, so we need COUNT to complete quickly
          const totalResult = await executeQuery(countQuery, queryParams, { timeout: 15000 });
          totalRecords = totalResult.recordset && totalResult.recordset.length > 0
            ? totalResult.recordset[0].Total
            : 0;

          if (totalRecords === 0) {
            return {
              total: 0,
              records: [],
              skipTotal: false
            };
          }

          total = totalRecords;
        } catch (countError) {
          const isTimeoutError = 
            countError.code === 'ETIMEOUT' ||
            countError.code === 'ETIMEDOUT' ||
            countError.message?.includes('timeout') ||
            countError.message?.includes('Timeout') ||
            countError.message?.includes('Failed to cancel request');

          if (isTimeoutError) {
            logger.warn('COUNT query timed out, continuing without total count for better performance:', {
              error: countError.message,
              code: countError.code,
              suggestion: 'Consider using skipTotal=true or adding date filters to improve performance'
            });
          } else {
            logger.warn('COUNT query failed, continuing without total count:', {
              error: countError.message,
              code: countError.code,
              name: countError.name
            });
          }
          // Continue without total count rather than failing the entire request
          // This allows the API to still return data even if COUNT is slow
          total = null;
        }
      }

      // Optimized data query - select columns based on lightweight flag for better performance
      // Lightweight mode reduces data transfer by 50-70% for list views
      // Using explicit column list instead of SELECT * for better index usage
      const lightweightMode = params.lightweight !== undefined ? Boolean(params.lightweight) : false;
      
      let columnsList;
      if (lightweightMode) {
        // Lightweight columns for list views - only essential fields
        columnsList = `
          NicheApplicationId, Code, NicheId, AppliedDate, AgreementDate, Status,
          ApplicantName, NomineeName, Amount, DefaultAmount, ChurchId, RefDocType
        `;
      } else {
        // Full columns for detail views - all fields
        columnsList = `
          NicheApplicationId, Code, NicheId, AppliedDate, AgreementDate, Status,
          ApplicantName, ApplicantIDNo, ApplicantEmailID, ApplicantMobileNo,
          ApplicantHomeTelNo, ApplicantOfficeTelNo, ApplicantIsCatholic,
          ApplicantAddressNo, ApplicantAddressLine1, ApplicantAddressLine2,
          ApplicantAddressCity, ApplicantAddressState, ApplicantAddressCountry,
          NomineeName, NomineeIDNo, NomineeEmailID, NomineeMobileNo,
          NomineeHomeTelNo, NomineeOfficeTelNo, NomineeRelationship, NomineeIsCatholic,
          NomineeAddressNo, NomineeAddressLine1, NomineeAddressLine2,
          NomineeAddressCity, NomineeAddressState, NomineeAddressCountry,
          NomineeName2, NomineeIDNo2, NomineeEmailID2, NomineeMobileNo2,
          NomineeHomeTelNo2, NomineeOfficeTelNo2, NomineeRelationship2, NomineeIsCatholic2,
          NomineeAddressNo2, NomineeAddressLine12, NomineeAddressLine22,
          NomineeAddressCity2, NomineeAddressState2, NomineeAddressCountry2,
          Amount, DefaultAmount, ChurchId, UserId, Remarks, RefDocType
        `;
      }
      
      // CRITICAL OPTIMIZATION: Use index hint for better query performance
      // This forces SQL Server to use the composite index we created
      // Only use hint if we're filtering by ChurchId and Status (index covers these)
      // IMPORTANT: Index hints are DISABLED by default until indexes are created
      // Enable via USE_INDEX_HINTS=true ONLY after running DATABASE_OPTIMIZATION.sql
      const hasIndexFilters = whereClauses.some(clause => 
        clause.includes('ChurchId = @churchId')
      ) && whereClauses.some(clause => 
        clause.includes('Status > 0') || clause.includes('Status = @status')
      );
      
      // Index hints are OPT-IN (disabled by default) to prevent errors if index doesn't exist
      // Only enable if you've confirmed the index exists in the database
      // To enable: Set USE_INDEX_HINTS=true in environment variables
      // Index must be created first: Run DATABASE_OPTIMIZATION.sql
      const useIndexHints = process.env.USE_INDEX_HINTS === 'true';
      const indexHint = hasIndexFilters && useIndexHints
        ? 'WITH (NOLOCK, INDEX(IX_NicheApplication_ChurchId_Status_AgreementDate))'
        : 'WITH (NOLOCK)';
      
      const dataQuery = `
        SELECT ${columnsList}
        FROM NicheApplication ${indexHint}
        ${whereClause}
        ORDER BY AgreementDate DESC, NicheApplicationId DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;
      
      if (useIndexHints && hasIndexFilters) {
        logger.debug('Using index hint for optimal query performance (index must exist in database)');
      }

      const dataParams = {
        ...queryParams,
        offset,
        pageSize
      };

      // CRITICAL OPTIMIZATION: Dynamic timeout based on page size
      // Smaller page sizes should respond faster, larger pages can take more time
      // This ensures small queries complete quickly even without indexes
      const dynamicTimeout = pageSize <= 10 
        ? 10000  // 10s for small pages (should complete in < 2s with indexes)
        : pageSize <= 50
        ? 15000  // 15s for medium pages
        : 20000; // 20s for large pages
      
      const startTime = Date.now();
      logger.debug(`Executing data query with ${dynamicTimeout}ms timeout, pageSize: ${pageSize}, offset: ${offset}`);
      
      // Execute data query with dynamic timeout handling
      // Frontend typically times out at 30-60s, so we need to respond within timeout window
      // Add error handling for index hint errors (index may not exist)
      let dataResult;
      try {
        dataResult = await executeQuery(dataQuery, dataParams, { timeout: dynamicTimeout });
      } catch (queryError) {
        // If query fails due to missing index hint, retry without the hint
        if (useIndexHints && hasIndexFilters && 
            (queryError.message?.includes('does not exist') || 
             queryError.message?.includes('Index') ||
             queryError.code === 'EREQUEST')) {
          logger.warn('Query failed with index hint (index may not exist), retrying without hint:', {
            error: queryError.message,
            suggestion: 'Either create the index by running DATABASE_OPTIMIZATION.sql, or disable index hints with USE_INDEX_HINTS=false'
          });
          
          // Retry query without index hint
          const fallbackQuery = `
            SELECT ${columnsList}
            FROM NicheApplication WITH (NOLOCK)
            ${whereClause}
            ORDER BY AgreementDate DESC, NicheApplicationId DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
          `;
          dataResult = await executeQuery(fallbackQuery, dataParams, { timeout: dynamicTimeout });
        } else {
          // Re-throw other errors
          throw queryError;
        }
      }
      
      const queryTime = Date.now() - startTime;
      logger.debug(`Data query completed in ${queryTime}ms, returned ${dataResult?.recordset?.length || 0} records`);

      // Ensure records is always an array, even if query fails or returns nothing
      const rawRecords = dataResult && dataResult.recordset ? dataResult.recordset : [];
      const records = Array.isArray(rawRecords) && rawRecords.length > 0
        ? rawRecords.map(row => {
          try {
            return new NicheApplication(row);
          } catch (err) {
            logger.warn('Failed to create NicheApplication from row:', err.message);
            return null;
          }
        }).filter(Boolean)
        : [];

      // Initialize beneficiaries array for all records
      records.forEach(record => {
        if (!record.beneficiaries) {
          record.beneficiaries = [];
        }
      });

      // CRITICAL OPTIMIZATION: Skip beneficiary loading if not needed
      // Beneficiary loading adds significant overhead (additional query + processing)
      // For list views, beneficiaries can be loaded on-demand via detail endpoint
      // Default: skip beneficiaries for list views (includeBeneficiaries=false)
      // Set includeBeneficiaries=true to load beneficiaries (for detail views)
      const shouldLoadBeneficiaries = includeBeneficiaries === true && records.length > 0;
      
      if (!shouldLoadBeneficiaries) {
        // Skip beneficiary loading for better performance on list views
        // This saves 5-15 seconds per request
        logger.debug(`Skipping beneficiary loading for ${records.length} records (includeBeneficiaries=false)`);
      } else {
        // Fetch beneficiaries in batches for better performance and security
        // Use shorter timeout to ensure fast response to frontend
        const applicationIds = records
          .map(record => record.nicheApplicationId)
          .filter(id => typeof id === 'number' && id > 0);
        try {
          const beneficiariesByApplication = {};
          
          // Batch processing for large result sets (max 500 IDs per query for faster performance)
          const batchSize = 500;
          
          for (let i = 0; i < applicationIds.length; i += batchSize) {
            const batchIds = applicationIds.slice(i, i + batchSize);
            
            // Validate all IDs are safe integers (already filtered, but extra safety)
            const safeIds = batchIds.filter(id => Number.isInteger(id) && id > 0);
            
            if (safeIds.length === 0) {
              continue;
            }
            
            // Use parameterized query with table-valued parameter or multiple IN clauses
            // For better performance and security, batch IDs using IN clause
            // IDs are validated as safe integers, so direct IN is acceptable here
            // Alternative: Use table-valued parameter for even better performance
            const idList = safeIds.join(',');
            
            const beneficiaryQuery = `
              SELECT 
                NicheApplicationBeneficiaryId,
                NicheApplicationId,
                Name,
                RelationshipToApplicant,
                DateOfBirth,
                BirthYear,
                IDNo,
                IsCatholic,
                IsMale
              FROM NicheApplicationBeneficiary WITH (NOLOCK)
              WHERE NicheApplicationId IN (${idList})
              ORDER BY NicheApplicationId, NicheApplicationBeneficiaryId
            `;

            // Use shorter timeout for beneficiary queries (8s for small batches, 10s for large)
            // With proper indexes, this should complete in < 1 second
            const beneficiaryTimeout = safeIds.length <= 10 ? 8000 : 10000;
            const beneficiaryStartTime = Date.now();
            const beneficiaryResult = await executeQuery(beneficiaryQuery, {}, { timeout: beneficiaryTimeout });
            const beneficiaryTime = Date.now() - beneficiaryStartTime;
            logger.debug(`Beneficiary query completed in ${beneficiaryTime}ms for ${safeIds.length} application IDs`);

            const beneficiaryRows = beneficiaryResult && beneficiaryResult.recordset 
              ? beneficiaryResult.recordset 
              : [];

            beneficiaryRows.forEach(row => {
              if (!row || !row.NicheApplicationId) {
                return;
              }
              const appId = row.NicheApplicationId;
              if (!beneficiariesByApplication[appId]) {
                beneficiariesByApplication[appId] = [];
              }
              try {
                beneficiariesByApplication[appId].push(
                  new NicheApplicationBeneficiary(row)
                );
              } catch (err) {
                logger.warn(`Failed to create beneficiary for application ${appId}:`, err.message);
              }
            });
          }

          // Attach beneficiaries to records
          records.forEach(record => {
            if (record.nicheApplicationId && beneficiariesByApplication[record.nicheApplicationId]) {
              record.beneficiaries = beneficiariesByApplication[record.nicheApplicationId];
            } else {
              record.beneficiaries = [];
            }
          });
        } catch (beneficiaryError) {
          logger.error('Error fetching beneficiaries for niche applications:', beneficiaryError);
          // Don't fail the entire query if beneficiaries fail - just log and continue
          // Records will have empty beneficiaries array
          records.forEach(record => {
            if (!record.beneficiaries) {
              record.beneficiaries = [];
            }
          });
        }
      }

      // Always return a valid structure
      return {
        total: shouldSkipTotal ? null : (total !== null ? total : records.length),
        records: Array.isArray(records) ? records : [],
        skipTotal: shouldSkipTotal
      };
    } catch (error) {
      logger.error('Failed to search niche applications:', error);
      throw error;
    }
  }

  /**
   * Create niche application with beneficiaries
   * @param {NicheApplication} application - Application data
   * @param {Array<NicheApplicationBeneficiary>} beneficiaries - Beneficiaries (up to 3)
   * @returns {Promise<string>} Application code
   */
  async create(application, beneficiaries) {
    try {
      const spName = 'sp_create_niche_application_and_beneficiaries';

      const canUseStoredProcedure = await ensureCreateStoredProcedureAvailability(spName);

      if (canUseStoredProcedure) {
        try {
          const params = {
            NicheId: application.nicheId,
            AppliedDate: application.appliedDate,
            AgreementDate: application.agreementDate,
            ApplicantName: application.applicantName,
            ApplicantIDNo: application.applicantIDNo,
            ApplicantEmailID: application.applicantEmailID,
            ApplicantMobileNo: application.applicantMobileNo,
            ApplicantHomeTelNo: application.applicantHomeTelNo,
            ApplicantOfficeTelNo: application.applicantOfficeTelNo,
            ApplicantIsCatholic: application.applicantIsCatholic,
            ApplicantAddressNo: application.applicantAddressNo,
            ApplicantAddressLine1: application.applicantAddressLine1,
            ApplicantAddressLine2: application.applicantAddressLine2,
            ApplicantAddressCity: application.applicantAddressCity,
            ApplicantAddressState: application.applicantAddressState,
            ApplicantAddressCountry: application.applicantAddressCountry,
            NomineeName: application.nomineeName,
            NomineeIDNo: application.nomineeIDNo,
            NomineeEmailID: application.nomineeEmailID,
            NomineeMobileNo: application.nomineeMobileNo,
            NomineeHomeTelNo: application.nomineeHomeTelNo,
            NomineeOfficeTelNo: application.nomineeOfficeTelNo,
            NomineeRelationship: application.nomineeRelationship,
            NomineeIsCatholic: application.nomineeIsCatholic,
            NomineeAddressNo: application.nomineeAddressNo,
            NomineeAddressLine1: application.nomineeAddressLine1,
            NomineeAddressLine2: application.nomineeAddressLine2,
            NomineeAddressCity: application.nomineeAddressCity,
            NomineeAddressState: application.nomineeAddressState,
            NomineeAddressCountry: application.nomineeAddressCountry,
            NomineeName2: application.nomineeName2,
            NomineeIDNo2: application.nomineeIDNo2,
            Amount: application.amount,
            ChurchId: application.churchId,
            UserId: application.userId,
            Remarks: application.remarks,
            BeneficiariesJson: JSON.stringify(beneficiaries.map(b => b.toJSON()))
          };

          const result = await executeStoredProcedure(spName, params);

          if (result.recordset && result.recordset[0]) {
            return result.recordset[0].Code || result.recordset[0].code;
          }
        } catch (spError) {
          isCreateStoredProcedureAvailable = false;
          logger.warn(`Stored procedure ${spName} unavailable, using direct insert:`, spError.message);
        }
      }

      // Fallback to direct insert
      return await this._createWithDirectInsert(application, beneficiaries);
    } catch (error) {
      logger.error('Failed to create niche application:', error);
      throw error;
    }
  }

  /**
   * Direct insert method (fallback if SP doesn't exist)
   * @private
   */
  async _createWithDirectInsert(application, beneficiaries) {
    try {
      // Get the actual niche identifier from the niche data
      const nicheId = application.nicheId;
      let nicheIdentifier = null;
      
      if (nicheId) {
        // Query to get the actual niche code/identifier
        const nicheQuery = `
          SELECT Code
          FROM Niche WITH (NOLOCK)
          WHERE NicheId = @nicheId
        `;
        
        const nicheResult = await executeQuery(nicheQuery, { nicheId });
        if (nicheResult.recordset && nicheResult.recordset.length > 0) {
          // Extract the numeric part from the niche code (e.g., from "1409-0" extract "1409")
          const nicheCode = nicheResult.recordset[0].Code;
          if (nicheCode) {
            // Extract numeric part before any non-numeric characters
            const match = nicheCode.match(/^\d+/);
            if (match) {
              nicheIdentifier = match[0];
              logger.info(`[createWithDirectInsert] Extracted niche identifier ${nicheIdentifier} from niche code: ${nicheCode}`);
            }
          }
        }
      }
      
      if (!nicheIdentifier) {
        // Fallback to incremental numbering if we can't get the niche identifier
        logger.warn('[createWithDirectInsert] Could not get niche identifier, using fallback sequential numbering');
        
        const lastCodeQuery = `
          SELECT TOP 1 Code
          FROM NicheApplication WITH (NOLOCK)
          WHERE ChurchId = @churchId
            AND Code LIKE '[0-9]%-0'
          ORDER BY
            TRY_CAST(LEFT(Code, NULLIF(CHARINDEX('-', Code), 0) - 1) AS INT) DESC,
            NicheApplicationId DESC
        `;

        const lastCodeResult = await executeQuery(lastCodeQuery, { churchId: application.churchId });
        let nextNumber = 1;

        if (lastCodeResult.recordset && lastCodeResult.recordset.length > 0) {
          const lastCode = lastCodeResult.recordset[0].Code;
          const numericPart = lastCode && lastCode.includes('-')
            ? lastCode.split('-')[0]
            : lastCode;
          const parsedNumber = parseInt(numericPart, 10);
          if (!Number.isNaN(parsedNumber)) {
            nextNumber = parsedNumber + 1;
          }
        }
        
        nicheIdentifier = nextNumber.toString();
      }

      // Generate code using the actual niche identifier
      // Check if there are existing applications with the same niche identifier
      const existingQuery = `
        SELECT Code
        FROM NicheApplication WITH (NOLOCK)
        WHERE ChurchId = @churchId
          AND Code LIKE @nichePattern
        ORDER BY Code DESC
      `;
      
      const existingResult = await executeQuery(existingQuery, { 
        churchId: application.churchId, 
        nichePattern: `${nicheIdentifier}-%` 
      });
      
      let suffix = 0;
      if (existingResult.recordset && existingResult.recordset.length > 0) {
        // Find the highest suffix number and increment it
        const existingCodes = existingResult.recordset
          .map(row => row.Code)
          .filter(code => code != null);
        
        const suffixNumbers = existingCodes
          .map(code => {
            const parts = code.split('-');
            return parts.length > 1 ? parseInt(parts[1], 10) : 0;
          })
          .filter(num => !Number.isNaN(num));
        
        if (suffixNumbers.length > 0) {
          suffix = Math.max(...suffixNumbers) + 1;
        } else {
          suffix = 0;
        }
      }
      
      const code = `${nicheIdentifier}-${suffix}`;
      logger.info(`[createWithDirectInsert] Generated application code: ${code} using niche identifier: ${nicheIdentifier}`);

      // Insert main application
      const insertQuery = `
        INSERT INTO NicheApplication (
          Code, NicheId, AppliedDate, AgreementDate, Status,
          ApplicantName, ApplicantIDNo, ApplicantEmailID, 
          ApplicantMobileNo, ApplicantHomeTelNo, ApplicantOfficeTelNo, ApplicantIsCatholic,
          ApplicantAddressNo, ApplicantAddressLine1, ApplicantAddressLine2,
          ApplicantAddressCity, ApplicantAddressState, ApplicantAddressCountry,
          NomineeName, NomineeIDNo, NomineeEmailID,
          NomineeMobileNo, NomineeHomeTelNo, NomineeOfficeTelNo, NomineeRelationship, NomineeIsCatholic,
          NomineeAddressNo, NomineeAddressLine1, NomineeAddressLine2,
          NomineeAddressCity, NomineeAddressState, NomineeAddressCountry,
          NomineeName2, NomineeIDNo2, NomineeEmailID2,
          NomineeMobileNo2, NomineeHomeTelNo2, NomineeOfficeTelNo2, NomineeRelationship2, NomineeIsCatholic2,
          NomineeAddressNo2, NomineeAddressLine12, NomineeAddressLine22,
          NomineeAddressCity2, NomineeAddressState2, NomineeAddressCountry2,
          Amount, DefaultAmount, ChurchId, UserId, Remarks, RefDocType
        )
        VALUES (
          @code, @nicheId, @appliedDate, @agreementDate, 1,
          @applicantName, @applicantIDNo, @applicantEmailID,
          @applicantMobileNo, @applicantHomeTelNo, @applicantOfficeTelNo, @applicantIsCatholic,
          @applicantAddressNo, @applicantAddressLine1, @applicantAddressLine2,
          @applicantAddressCity, @applicantAddressState, @applicantAddressCountry,
          @nomineeName, @nomineeIDNo, @nomineeEmailID,
          @nomineeMobileNo, @nomineeHomeTelNo, @nomineeOfficeTelNo, @nomineeRelationship, @nomineeIsCatholic,
          @nomineeAddressNo, @nomineeAddressLine1, @nomineeAddressLine2,
          @nomineeAddressCity, @nomineeAddressState, @nomineeAddressCountry,
          @nomineeName2, @nomineeIDNo2, @nomineeEmailID2,
          @nomineeMobileNo2, @nomineeHomeTelNo2, @nomineeOfficeTelNo2, @nomineeRelationship2, @nomineeIsCatholic2,
          @nomineeAddressNo2, @nomineeAddressLine12, @nomineeAddressLine22,
          @nomineeAddressCity2, @nomineeAddressState2, @nomineeAddressCountry2,
          @amount, @defaultAmount, @churchId, @userId, @remarks, 'NAPP'
        );
        SELECT SCOPE_IDENTITY() AS NicheApplicationId;
      `;

      const insertParams = {
        code,
        nicheId: application.nicheId,
        appliedDate: application.appliedDate,
        agreementDate: application.agreementDate,
        applicantName: application.applicantName,
        applicantIDNo: application.applicantIDNo,
        applicantEmailID: application.applicantEmailID,
        applicantMobileNo: application.applicantMobileNo,
        applicantHomeTelNo: application.applicantHomeTelNo,
        applicantOfficeTelNo: application.applicantOfficeTelNo,
        applicantIsCatholic: application.applicantIsCatholic,
        applicantAddressNo: application.applicantAddressNo,
        applicantAddressLine1: application.applicantAddressLine1,
        applicantAddressLine2: application.applicantAddressLine2,
        applicantAddressCity: application.applicantAddressCity,
        applicantAddressState: application.applicantAddressState,
        applicantAddressCountry: application.applicantAddressCountry,
        nomineeName: application.nomineeName,
        nomineeIDNo: application.nomineeIDNo,
        nomineeEmailID: application.nomineeEmailID,
        nomineeMobileNo: application.nomineeMobileNo,
        nomineeHomeTelNo: application.nomineeHomeTelNo,
        nomineeOfficeTelNo: application.nomineeOfficeTelNo,
        nomineeRelationship: application.nomineeRelationship,
        nomineeIsCatholic: application.nomineeIsCatholic,
        nomineeAddressNo: application.nomineeAddressNo,
        nomineeAddressLine1: application.nomineeAddressLine1,
        nomineeAddressLine2: application.nomineeAddressLine2,
        nomineeAddressCity: application.nomineeAddressCity,
        nomineeAddressState: application.nomineeAddressState,
        nomineeAddressCountry: application.nomineeAddressCountry,
        nomineeName2: application.nomineeName2,
        nomineeIDNo2: application.nomineeIDNo2,
        nomineeEmailID2: application.nomineeEmailID2,
        nomineeMobileNo2: application.nomineeMobileNo2,
        nomineeHomeTelNo2: application.nomineeHomeTelNo2,
        nomineeOfficeTelNo2: application.nomineeOfficeTelNo2,
        nomineeRelationship2: application.nomineeRelationship2,
        nomineeIsCatholic2: application.nomineeIsCatholic2,
        nomineeAddressNo2: application.nomineeAddressNo2,
        nomineeAddressLine12: application.nomineeAddressLine12,
        nomineeAddressLine22: application.nomineeAddressLine22,
        nomineeAddressCity2: application.nomineeAddressCity2,
        nomineeAddressState2: application.nomineeAddressState2,
        nomineeAddressCountry2: application.nomineeAddressCountry2,
        amount: application.amount,
        defaultAmount: application.defaultAmount,
        churchId: application.churchId,
        userId: application.userId,
        remarks: application.remarks
      };

      const insertResult = await executeQuery(insertQuery, insertParams);
      const applicationId = insertResult.recordset[0].NicheApplicationId;

      // Insert beneficiaries (only non-empty ones)
      const validBeneficiaries = beneficiaries.filter(b => b.name && b.name.trim() !== '');

      for (const beneficiary of validBeneficiaries) {
        const beneficiaryQuery = `
          INSERT INTO NicheApplicationBeneficiary (
            NicheApplicationId, Name, RelationshipToApplicant, 
            DateOfBirth, BirthYear, IDNo, IsCatholic, IsMale
          )
          VALUES (
            @applicationId, @name, @relationshipToApplicant,
            @dateOfBirth, @birthYear, @idNo, @isCatholic, @isMale
          )
        `;

        await executeQuery(beneficiaryQuery, {
          applicationId,
          name: beneficiary.name,
          relationshipToApplicant: beneficiary.relationshipToApplicant,
          dateOfBirth: beneficiary.dateOfBirth,
          birthYear: beneficiary.birthYear,
          idNo: beneficiary.idNo,
          isCatholic: beneficiary.isCatholic,
          isMale: beneficiary.isMale
        });
      }

      // Update niche status to Booked (3)
      const updateNicheQuery = `
        UPDATE Niche 
        SET Status = 3 
        WHERE NicheId = @nicheId
      `;

      await executeQuery(updateNicheQuery, { nicheId: application.nicheId });

      return code;
    } catch (error) {
      logger.error('Direct insert failed:', error);
      throw error;
    }
  }

  /**
   * Get niche application by code
   * @param {string} code - Application code
   * @returns {Promise<NicheApplication>} Application with beneficiaries
   */
  async getByCode(code) {
    try {
      const startTime = Date.now();
      
      // CRITICAL OPTIMIZATION: Separate queries for better performance
      // Instead of LEFT JOIN (which can be slow), fetch application first, then beneficiaries
      // This allows SQL Server to use indexes better and reduces lock contention
      
      // Step 1: Get application with niche info (optimized with WITH (NOLOCK) and index hint)
      // Use index hint for Code lookup if index exists (IX_NicheApplication_Code)
      const useIndexHints = process.env.USE_INDEX_HINTS === 'true';
      const indexHint = useIndexHints
        ? 'WITH (NOLOCK, INDEX(IX_NicheApplication_Code))'
        : 'WITH (NOLOCK)';
      
      const applicationQuery = `
        SELECT 
          na.*,
          n.Code AS NicheCode
        FROM NicheApplication na ${indexHint}
        LEFT JOIN Niche n WITH (NOLOCK) ON na.NicheId = n.NicheId
        WHERE na.Code = @code AND na.Status > 0
      `;

      // Use shorter timeout for single-record query (10s should be more than enough)
      // With proper index, this should complete in < 0.1 seconds
      const applicationStartTime = Date.now();
      const applicationResult = await executeQuery(applicationQuery, { code }, { timeout: 10000 });

      if (!applicationResult.recordset || applicationResult.recordset.length === 0) {
        return null;
      }

      const application = new NicheApplication(applicationResult.recordset[0]);
      const applicationTime = Date.now() - applicationStartTime;
      logger.debug(`Application query completed in ${applicationTime}ms for code: ${code}`);

      // Step 2: Get beneficiaries separately (optimized with index and timeout)
      // This is faster than LEFT JOIN and allows better index usage
      if (application.nicheApplicationId) {
        try {
          const beneficiaryQuery = `
            SELECT 
              NicheApplicationBeneficiaryId,
              NicheApplicationId,
              Name,
              RelationshipToApplicant,
              DateOfBirth,
              BirthYear,
              IDNo,
              IsCatholic,
              IsMale
            FROM NicheApplicationBeneficiary WITH (NOLOCK)
            WHERE NicheApplicationId = @applicationId
            ORDER BY NicheApplicationBeneficiaryId
          `;

          // Use shorter timeout for beneficiary query (5s should be enough with index)
          const beneficiaryStartTime = Date.now();
          const beneficiaryResult = await executeQuery(
            beneficiaryQuery, 
            { applicationId: application.nicheApplicationId }, 
            { timeout: 5000 }
          );

          const beneficiaryTime = Date.now() - beneficiaryStartTime;
          logger.debug(`Beneficiary query completed in ${beneficiaryTime}ms for applicationId: ${application.nicheApplicationId}`);

          // Map beneficiaries with proper date formatting
          application.beneficiaries = (beneficiaryResult.recordset || [])
            .map(row => {
              // ✅ FIX: Format DateOfBirth (handles NVARCHAR string from database)
              let formattedDateOfBirth = null;
              if (row.DateOfBirth) {
                if (row.DateOfBirth instanceof Date) {
                  formattedDateOfBirth = row.DateOfBirth.toISOString();
                } else if (typeof row.DateOfBirth === 'string') {
                  const trimmed = row.DateOfBirth.trim();
                  if (trimmed) {
                    const parsed = new Date(trimmed);
                    formattedDateOfBirth = !isNaN(parsed.getTime()) ? parsed.toISOString() : trimmed;
                  }
                } else {
                  try {
                    const date = new Date(row.DateOfBirth);
                    formattedDateOfBirth = !isNaN(date.getTime()) ? date.toISOString() : null;
                  } catch (e) {
                    formattedDateOfBirth = null;
                  }
                }
              }
              
              // ✅ FIX: Format BirthYear (handles NVARCHAR string from database)
              let formattedBirthYear = null;
              if (row.BirthYear !== null && row.BirthYear !== undefined) {
                if (typeof row.BirthYear === 'number') {
                  formattedBirthYear = row.BirthYear;
                } else if (typeof row.BirthYear === 'string') {
                  const trimmed = String(row.BirthYear).trim();
                  if (trimmed) {
                    const parsed = parseInt(trimmed, 10);
                    formattedBirthYear = !isNaN(parsed) ? parsed : trimmed;
                  }
                }
              }
              
              logger.debug(`[getByCode] Beneficiary mapping:`, {
                name: row.Name,
                rawDateOfBirth: row.DateOfBirth,
                formattedDateOfBirth,
                rawBirthYear: row.BirthYear,
                formattedBirthYear
              });
              
              return new NicheApplicationBeneficiary({
                nicheApplicationBeneficiaryId: row.NicheApplicationBeneficiaryId,
                nicheApplicationId: row.NicheApplicationId,
                name: row.Name,
                relationshipToApplicant: row.RelationshipToApplicant,
                dateOfBirth: formattedDateOfBirth,
                birthYear: formattedBirthYear,
                idNo: row.IDNo,
                isCatholic: row.IsCatholic,
                isMale: row.IsMale
              });
            });
        } catch (beneficiaryError) {
          // Don't fail entire query if beneficiaries fail - just log and continue
          logger.warn(`Failed to fetch beneficiaries for application ${code}:`, beneficiaryError.message);
          application.beneficiaries = [];
        }
      } else {
        application.beneficiaries = [];
      }

      const totalTime = Date.now() - startTime;
      logger.debug(`getByCode completed in ${totalTime}ms for code: ${code}`);

      return application;
    } catch (error) {
      logger.error('Failed to get niche application:', error);
      throw error;
    }
  }

  /**
   * Update niche application
   * @param {string} code - Application code
   * @param {NicheApplication} application - Updated application data
   * @param {Array<NicheApplicationBeneficiary>} beneficiaries - Updated beneficiaries
   * @returns {Promise<boolean>} Success status
   */
  async update(code, application, beneficiaries) {
    try {
      // Check if exists and can be modified
      const existing = await this.getByCode(code);
      if (!existing) {
        throw new Error('Application not found');
      }

      if (!existing.canModify()) {
        throw new Error('Application cannot be modified (status is Booked or Completed)');
      }

      // Update main application
      const updateQuery = `
        UPDATE NicheApplication
        SET 
          NicheId = @nicheId,
          AgreementDate = @agreementDate,
          ApplicantName = @applicantName,
          ApplicantIDNo = @applicantIDNo,
          ApplicantEmailID = @applicantEmailID,
          ApplicantMobileNo = @applicantMobileNo,
          ApplicantHomeTelNo = @applicantHomeTelNo,
          ApplicantOfficeTelNo = @applicantOfficeTelNo,
          ApplicantIsCatholic = @applicantIsCatholic,
          ApplicantAddressNo = @applicantAddressNo,
          ApplicantAddressLine1 = @applicantAddressLine1,
          ApplicantAddressLine2 = @applicantAddressLine2,
          ApplicantAddressCity = @applicantAddressCity,
          ApplicantAddressState = @applicantAddressState,
          ApplicantAddressCountry = @applicantAddressCountry,
          NomineeName = @nomineeName,
          NomineeIDNo = @nomineeIDNo,
          NomineeEmailID = @nomineeEmailID,
          NomineeMobileNo = @nomineeMobileNo,
          NomineeHomeTelNo = @nomineeHomeTelNo,
          NomineeOfficeTelNo = @nomineeOfficeTelNo,
          NomineeRelationship = @nomineeRelationship,
          NomineeIsCatholic = @nomineeIsCatholic,
          NomineeAddressNo = @nomineeAddressNo,
          NomineeAddressLine1 = @nomineeAddressLine1,
          NomineeAddressLine2 = @nomineeAddressLine2,
          NomineeAddressCity = @nomineeAddressCity,
          NomineeAddressState = @nomineeAddressState,
          NomineeAddressCountry = @nomineeAddressCountry,
          NomineeName2 = @nomineeName2,
          NomineeIDNo2 = @nomineeIDNo2,
          NomineeEmailID2 = @nomineeEmailID2,
          NomineeMobileNo2 = @nomineeMobileNo2,
          NomineeHomeTelNo2 = @nomineeHomeTelNo2,
          NomineeOfficeTelNo2 = @nomineeOfficeTelNo2,
          NomineeRelationship2 = @nomineeRelationship2,
          NomineeIsCatholic2 = @nomineeIsCatholic2,
          NomineeAddressNo2 = @nomineeAddressNo2,
          NomineeAddressLine12 = @nomineeAddressLine12,
          NomineeAddressLine22 = @nomineeAddressLine22,
          NomineeAddressCity2 = @nomineeAddressCity2,
          NomineeAddressState2 = @nomineeAddressState2,
          NomineeAddressCountry2 = @nomineeAddressCountry2,
          Amount = @amount,
          Remarks = @remarks
        WHERE Code = @code
      `;

      await executeQuery(updateQuery, {
        code,
        nicheId: application.nicheId,
        agreementDate: application.agreementDate,
        applicantName: application.applicantName,
        applicantIDNo: application.applicantIDNo,
        applicantEmailID: application.applicantEmailID,
        applicantMobileNo: application.applicantMobileNo,
        applicantHomeTelNo: application.applicantHomeTelNo,
        applicantOfficeTelNo: application.applicantOfficeTelNo,
        applicantIsCatholic: application.applicantIsCatholic,
        applicantAddressNo: application.applicantAddressNo,
        applicantAddressLine1: application.applicantAddressLine1,
        applicantAddressLine2: application.applicantAddressLine2,
        applicantAddressCity: application.applicantAddressCity,
        applicantAddressState: application.applicantAddressState,
        applicantAddressCountry: application.applicantAddressCountry,
        nomineeName: application.nomineeName,
        nomineeIDNo: application.nomineeIDNo,
        nomineeEmailID: application.nomineeEmailID,
        nomineeMobileNo: application.nomineeMobileNo,
        nomineeHomeTelNo: application.nomineeHomeTelNo,
        nomineeOfficeTelNo: application.nomineeOfficeTelNo,
        nomineeRelationship: application.nomineeRelationship,
        nomineeIsCatholic: application.nomineeIsCatholic,
        nomineeAddressNo: application.nomineeAddressNo,
        nomineeAddressLine1: application.nomineeAddressLine1,
        nomineeAddressLine2: application.nomineeAddressLine2,
        nomineeAddressCity: application.nomineeAddressCity,
        nomineeAddressState: application.nomineeAddressState,
        nomineeAddressCountry: application.nomineeAddressCountry,
        nomineeName2: application.nomineeName2,
        nomineeIDNo2: application.nomineeIDNo2,
        nomineeEmailID2: application.nomineeEmailID2,
        nomineeMobileNo2: application.nomineeMobileNo2,
        nomineeHomeTelNo2: application.nomineeHomeTelNo2,
        nomineeOfficeTelNo2: application.nomineeOfficeTelNo2,
        nomineeRelationship2: application.nomineeRelationship2,
        nomineeIsCatholic2: application.nomineeIsCatholic2,
        nomineeAddressNo2: application.nomineeAddressNo2,
        nomineeAddressLine12: application.nomineeAddressLine12,
        nomineeAddressLine22: application.nomineeAddressLine22,
        nomineeAddressCity2: application.nomineeAddressCity2,
        nomineeAddressState2: application.nomineeAddressState2,
        nomineeAddressCountry2: application.nomineeAddressCountry2,
        amount: application.amount,
        remarks: application.remarks
      });

      // Delete existing beneficiaries and re-insert
      const deleteQuery = `
        DELETE FROM NicheApplicationBeneficiary 
        WHERE NicheApplicationId = @applicationId
      `;

      await executeQuery(deleteQuery, { applicationId: existing.nicheApplicationId });

      // Insert updated beneficiaries (only non-empty)
      const validBeneficiaries = beneficiaries.filter(b => b.name && b.name.trim() !== '');

      for (const beneficiary of validBeneficiaries) {
        const beneficiaryQuery = `
          INSERT INTO NicheApplicationBeneficiary (
            NicheApplicationId, Name, RelationshipToApplicant,
            DateOfBirth, BirthYear, IDNo, IsCatholic, IsMale
          )
          VALUES (
            @applicationId, @name, @relationshipToApplicant,
            @dateOfBirth, @birthYear, @idNo, @isCatholic, @isMale
          )
        `;

        await executeQuery(beneficiaryQuery, {
          applicationId: existing.nicheApplicationId,
          name: beneficiary.name,
          relationshipToApplicant: beneficiary.relationshipToApplicant,
          dateOfBirth: beneficiary.dateOfBirth,
          birthYear: beneficiary.birthYear,
          idNo: beneficiary.idNo,
          isCatholic: beneficiary.isCatholic,
          isMale: beneficiary.isMale
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to update niche application:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate application (same niche and agreement date)
   * @param {number} nicheId - Niche ID
   * @param {Date} agreementDate - Agreement date
   * @returns {Promise<NicheApplication|null>} Existing application or null
   */
  async checkDuplicate(nicheId, agreementDate) {
    try {
      const query = `
        SELECT Code, NicheApplicationId 
        FROM NicheApplication 
        WHERE NicheId = @nicheId 
        AND CAST(AgreementDate AS DATE) = CAST(@agreementDate AS DATE)
        AND Status > 0
      `;

      const result = await executeQuery(query, { nicheId, agreementDate });

      if (!result.recordset || result.recordset.length === 0) {
        return null;
      }

      return new NicheApplication(result.recordset[0]);
    } catch (error) {
      logger.error('Failed to check duplicate:', error);
      throw error;
    }
  }

  /**
   * Delete niche application (soft delete)
   * @param {string} code - Application code
   * @returns {Promise<boolean>} Success status
   */
  async deleteByCode(code) {
    try {
      logger.info(`[NicheApplicationRepository.deleteByCode] Starting delete for code: ${code}`);
      
      // Get application first
      const application = await this.getByCode(code);

      if (!application) {
        logger.warn(`[NicheApplicationRepository.deleteByCode] Application not found: ${code}`);
        return false;
      }

      logger.info(`[NicheApplicationRepository.deleteByCode] Found application: ${code}, nicheId: ${application.nicheId}, current Status: ${application.status}`);

      // Update application status to deleted
      const updateAppQuery = `
        UPDATE NicheApplication 
        SET Status = 0 
        WHERE Code = @code
      `;

      await executeQuery(updateAppQuery, { code });
      logger.info(`[NicheApplicationRepository.deleteByCode] Set Status = 0 for code: ${code}`);

      // Update niche status back to vacant
      // Ensure nicheId is a valid integer (parseInt handles string conversion and stops at non-numeric chars)
      const nicheId = application.nicheId != null ? parseInt(application.nicheId, 10) : null;
      if (nicheId == null || isNaN(nicheId) || nicheId <= 0) {
        logger.error(`[NicheApplicationRepository.deleteByCode] Invalid nicheId: ${application.nicheId} for application ${code}`);
        throw new Error(`Invalid nicheId: ${application.nicheId}`);
      }

      const updateNicheQuery = `
        UPDATE Niche 
        SET Status = 1 
        WHERE NicheId = @nicheId
      `;

      await executeQuery(updateNicheQuery, { nicheId });
      logger.info(`[NicheApplicationRepository.deleteByCode] Set niche Status = 1 (vacant) for nicheId: ${nicheId}`);
      logger.info(`[NicheApplicationRepository.deleteByCode] Successfully completed delete for code: ${code}`);

      return true;
    } catch (error) {
      logger.error('Failed to delete niche application:', error);
      throw error;
    }
  }
  /**
   * Get application by Niche Code
   * @param {string} nicheCode - Niche Code (e.g., "7980-0")
   * @param {number} churchId - Church ID (optional)
   * @returns {Promise<NicheApplication|null>} Application or null
   */
  async getByNicheCode(nicheCode, churchId = null) {
    try {
      if (!nicheCode || nicheCode.trim().length === 0) {
        logger.warn('getByNicheCode called with empty niche code');
        return null;
      }

      const searchCode = nicheCode.trim();
      logger.info(`Fetching application for niche code: ${searchCode}, churchId: ${churchId}`);

      // Query to get application by joining with Niche table
      let query = `
        SELECT 
          na.*,
          n.Code AS NicheCode
        FROM NicheApplication na WITH (NOLOCK)
        INNER JOIN Niche n WITH (NOLOCK) ON na.NicheId = n.NicheId
        WHERE n.Code = @nicheCode AND na.Status > 0
      `;

      const params = { nicheCode: searchCode };

      if (churchId) {
        query += ' AND na.ChurchId = @churchId';
        params.churchId = churchId;
      }

      const result = await executeQuery(query, params, { timeout: 10000 });

      if (!result.recordset || result.recordset.length === 0) {
        logger.info(`No application found for niche code: ${searchCode}`);
        return null;
      }

      return new NicheApplication(result.recordset[0]);
    } catch (error) {
      logger.error('Failed to get application by niche code:', error);
      throw error;
    }
  }

  /**
   * Get Niche Code for given Application Code
   * @param {string} applicationCode - Application Code
   * @param {number} churchId - Church ID (optional)
   * @returns {Promise<string|null>} Niche Code or null
   */
  async getNicheCodeByApplicationCode(applicationCode, churchId = null) {
    try {
      if (!applicationCode || applicationCode.trim().length === 0) {
        logger.warn('getNicheCodeByApplicationCode called with empty application code');
        return null;
      }

      const searchCode = applicationCode.trim();
      logger.info(`Fetching niche code for application: ${searchCode}, churchId: ${churchId}`);

      let query = `
        SELECT 
          n.Code AS NicheCode
        FROM NicheApplication na WITH (NOLOCK)
        INNER JOIN Niche n WITH (NOLOCK) ON na.NicheId = n.NicheId
        WHERE na.Code = @applicationCode AND na.Status > 0
      `;

      const params = { applicationCode: searchCode };

      if (churchId) {
        query += ' AND na.ChurchId = @churchId';
        params.churchId = churchId;
      }

      const result = await executeQuery(query, params, { timeout: 5000 });

      if (!result.recordset || result.recordset.length === 0) {
        logger.info(`No niche found for application code: ${searchCode}`);
        return null;
      }

      return result.recordset[0].NicheCode;
    } catch (error) {
      logger.error('Failed to get niche code by application code:', error);
      throw error;
    }
  }
}

module.exports = new NicheApplicationRepository();

