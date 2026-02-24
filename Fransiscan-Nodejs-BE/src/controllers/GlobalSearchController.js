const logger = require('../utils/logger');
const { getPool } = require('../config/database');
const { meilisearchClient, GLOBAL_SEARCH_INDEX } = require('../config/meilisearch.config');

class GlobalSearchController {
  constructor() {
    this.meilisearchAvailable = true; // Flag to track Meilisearch availability
    this.lastMeilisearchFailure = null; // Timestamp of last failure
    this.meilisearchRetryDelay = 60000; // 1 minute delay before retrying
  }

  /**
   * Health check function to test Meilisearch connectivity
   */
  async checkMeilisearchHealth() {
    if (!this.meilisearchAvailable && this.lastMeilisearchFailure) {
      const timeSinceFailure = Date.now() - this.lastMeilisearchFailure;
      if (timeSinceFailure < this.meilisearchRetryDelay) {
        // Still in retry delay period, return cached unavailability
        return false;
      }
    }

    try {
      // Attempt a simple health check
      await meilisearchClient.health();
      this.meilisearchAvailable = true;
      return true;
    } catch (error) {
      logger.warn('[Meilisearch] Health check failed:', error.message);
      this.meilisearchAvailable = false;
      this.lastMeilisearchFailure = Date.now();
      return false;
    }
  }

  /**
   * Execute intelligent search across multiple entities
   * This is the core search logic that routes queries appropriately
   * Uses Meilisearch with MSSQL fallback
   */
  async executeIntelligentSearch({ query, types, churchId, page, pageSize, includeAvailability }) {
    const startTime = Date.now();

    // Classify the query type
    const queryType = this.classifyQuery(query);

    logger.info('[GlobalSearch] Query classified as:', queryType);

    // Check Meilisearch availability before attempting to use it
    let meilisearchResults = null;
    let meilisearchError = null;

    // Only try Meilisearch if it's marked as available
    if (this.meilisearchAvailable &&
      (!this.lastMeilisearchFailure || (Date.now() - this.lastMeilisearchFailure) >= this.meilisearchRetryDelay)) {

      try {
        const meilisearchStart = Date.now();
        meilisearchResults = await this.searchWithMeilisearch({
          query,
          types,
          churchId,
          page,
          pageSize
        });
        const meilisearchTime = Date.now() - meilisearchStart;
        logger.info('[GlobalSearch] Meilisearch returned results:', {
          count: meilisearchResults.results.length,
          timeMs: meilisearchTime
        });
      } catch (error) {
        meilisearchError = error;
        logger.warn('[GlobalSearch] Meilisearch failed, falling back to MSSQL:', error.message);
        this.meilisearchAvailable = false;
        this.lastMeilisearchFailure = Date.now();
      }
    } else {
      logger.debug('[GlobalSearch] Skipping Meilisearch due to recent failure');
      meilisearchError = new Error('Meilisearch temporarily unavailable');
    }

    // If Meilisearch worked and returned results, use those
    if (meilisearchResults && meilisearchResults.results.length > 0) {
      const executionTime = Date.now() - startTime;
      logger.info('[GlobalSearch] Used Meilisearch result', {
        resultsCount: meilisearchResults.results.length,
        executionTime: executionTime,
        queryType: queryType
      });
      return {
        results: meilisearchResults.results,
        totalCount: meilisearchResults.totalCount,
        pagination: meilisearchResults.pagination,
        executionTime: executionTime,
        searchMethod: 'meilisearch'
      };
    }

    // Otherwise, fall back to MSSQL search
    logger.info('[GlobalSearch] Falling back to MSSQL search', {
      queryType: queryType,
      fallbackReason: meilisearchError ? 'meilisearch_error' : 'not_attempted'
    });

    let results = [];
    let totalCount = 0;

    // Track MSSQL search performance
    const mssqlPerformance = {};

    // Search applications if requested or if query looks like application code
    if (types.includes('application') || queryType === 'application_code') {
      const appStart = Date.now();
      const appResults = await this.searchApplications(query, churchId, page, pageSize);
      mssqlPerformance.applications = Date.now() - appStart;
      results = [...results, ...appResults.results];
      totalCount += appResults.totalCount;
    }

    // Search invoices if requested or if query looks like invoice code
    if (types.includes('invoice') || queryType === 'invoice_code') {
      const invoiceStart = Date.now();
      const invoiceResults = await this.searchInvoices(query, churchId, page, pageSize);
      mssqlPerformance.invoices = Date.now() - invoiceStart;
      results = [...results, ...invoiceResults.results];
      totalCount += invoiceResults.totalCount;
    }

    // Search wake room bookings if requested or if query looks like wake room code
    if (types.includes('wake-room') || queryType === 'wake_room_code') {
      const wakeRoomStart = Date.now();
      const wakeRoomResults = await this.searchWakeRoomBookings(query, churchId, page, pageSize);
      mssqlPerformance.wakeRooms = Date.now() - wakeRoomStart;
      results = [...results, ...wakeRoomResults.results];
      totalCount += wakeRoomResults.totalCount;
    }

    // Search gates of life applications if requested or if query looks like gates of life code
    if (types.includes('gates-of-life') || queryType === 'gates_of_life_code') {
      const golStart = Date.now();
      const gatesOfLifeResults = await this.searchGatesOfLife(query, churchId, page, pageSize);
      mssqlPerformance.gatesOfLife = Date.now() - golStart;
      results = [...results, ...gatesOfLifeResults.results];
      totalCount += gatesOfLifeResults.totalCount;
    }

    // Search inscriptions if requested or if query looks like inscription code
    if (types.includes('inscription') || queryType === 'inscription_code') {
      const inscriptionStart = Date.now();
      const inscriptionResults = await this.searchInscriptions(query, churchId, page, pageSize);
      mssqlPerformance.inscriptions = Date.now() - inscriptionStart;
      results = [...results, ...inscriptionResults.results];
      totalCount += inscriptionResults.totalCount;
    }

    // Search persons if requested
    if (types.includes('person')) {
      const personStart = Date.now();
      const personResults = await this.searchPersons(query, churchId, page, pageSize);
      mssqlPerformance.persons = Date.now() - personStart;
      results = [...results, ...personResults.results];
      totalCount += personResults.totalCount;
    }

    // Search churches if requested
    if (types.includes('church')) {
      const churchStart = Date.now();
      const churchResults = await this.searchChurches(query, churchId, page, pageSize);
      mssqlPerformance.churches = Date.now() - churchStart;
      results = [...results, ...churchResults.results];
      totalCount += churchResults.totalCount;
    }

    // Search niches if requested
    if (types.includes('niche')) {
      const nicheStart = Date.now();
      const nicheResults = await this.searchNiches(query, churchId, page, pageSize, includeAvailability);
      mssqlPerformance.niches = Date.now() - nicheStart;
      results = [...results, ...nicheResults.results];
      totalCount += nicheResults.totalCount;
    }

    // Search by date if requested or if query looks like date
    if (types.includes('date') || queryType === 'date') {
      const dateStart = Date.now();
      const dateResults = await this.searchByDate(query, churchId, page, pageSize);
      mssqlPerformance.dates = Date.now() - dateStart;
      results = [...results, ...dateResults.results];
      totalCount += dateResults.totalCount;
    }

    // Search inscription deceased if requested
    if (types.includes('inscription-deceased')) {
      const deceasedStart = Date.now();
      const deceasedResults = await this.searchInscriptionDeceased(query, churchId, page, pageSize);
      mssqlPerformance.deceased = Date.now() - deceasedStart;
      results = [...results, ...deceasedResults.results];
      totalCount += deceasedResults.totalCount;
    }

    // Sort results by relevance and apply pagination
    const sortStart = Date.now();
    const sortedResults = this.sortAndPaginateResults(results, page, pageSize);
    mssqlPerformance.sorting = Date.now() - sortStart;

    const executionTime = Date.now() - startTime;

    logger.info('[GlobalSearch] MSSQL fallback completed', {
      resultsCount: sortedResults.data.length,
      executionTime: executionTime,
      performanceBreakdown: mssqlPerformance,
      queryType: queryType
    });

    return {
      results: sortedResults.data,
      totalCount: totalCount,
      pagination: {
        page: page,
        pageSize: pageSize,
        totalResults: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: page < Math.ceil(totalCount / pageSize),
        hasPreviousPage: page > 1
      },
      executionTime: executionTime,
      searchMethod: 'mssql',
      performanceMetrics: {
        method: 'mssql',
        breakdown: mssqlPerformance,
        totalExecutionTime: executionTime
      }
    };
  }

  /**
   * Search using Meilisearch with the given parameters
   */
  async searchWithMeilisearch({ query, types, churchId, page, pageSize }) {
    try {
      const index = meilisearchClient.index(GLOBAL_SEARCH_INDEX);

      // Map entity types to Meilisearch filter format
      const meilisearchFilters = [];

      // Add churchId filter
      meilisearchFilters.push(`churchId = ${churchId}`);

      // Add entity type filters if specific types are requested
      if (types && types.length > 0) {
        const entityTypeFilters = types.map(type => {
          // Map UI types to internal types
          switch (type) {
            case 'application':
              return `'niche-application'`;
            case 'gates-of-life':
              return `'gates-of-life'`;
            case 'inscription':
              return `'inscription'`;
            case 'wake-room':
              return `'wake-room-booking'`;
            default:
              // Direct mapping for other types
              return `'${type}'`;
          }
        });

        if (entityTypeFilters.length > 0) {
          meilisearchFilters.push(`entityType IN [${entityTypeFilters.join(', ')}]`);
        }
      }

      // Build filter string
      const filterString = meilisearchFilters.join(' AND ');

      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;

      // Perform search with Meilisearch
      const searchResponse = await index.search(query, {
        filter: filterString,
        limit: pageSize,
        offset: offset,
        sort: ['updatedAt:desc'], // Sort by most recently updated
        attributesToRetrieve: [
          'id', 'entityType', 'churchId', 'code', 'primaryName', 'names',
          'deceasedNames', 'dates', 'purpose', 'remarks', 'additionalPhrase',
          'contactInfo', 'createdAt', 'updatedAt', 'searchableContent'
        ]
      });

      // Convert Meilisearch results to the expected format
      const results = searchResponse.hits.map(hit => this.convertMeilisearchHitToResult(hit));

      return {
        results: results,
        totalCount: searchResponse.estimatedTotalHits || results.length,
        pagination: {
          page: page,
          pageSize: pageSize,
          totalResults: searchResponse.estimatedTotalHits || results.length,
          totalPages: Math.ceil((searchResponse.estimatedTotalHits || results.length) / pageSize),
          hasNextPage: offset + results.length < (searchResponse.estimatedTotalHits || results.length),
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Meilisearch search failed:', {
        error: error.message,
        stack: error.stack,
        query: query,
        types: types,
        churchId: churchId
      });
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Convert a Meilisearch hit to the expected result format
   */
  convertMeilisearchHitToResult(hit) {
    // Map Meilisearch document to the format expected by the frontend
    // This ensures compatibility with the existing MSSQL result format
    const result = {
      id: this.extractIdFromMeilisearchId(hit.id),
      entityType: hit.entityType,
      code: hit.code || '',
      churchName: hit.churchName || '', // Will be populated if needed from related data
      relevance: 'Medium', // Default relevance, will be calculated based on position
    };

    // Map fields based on entity type
    switch (hit.entityType) {
      case 'niche-application':
        result.applicantName = hit.primaryName || '';
        result.nomineeName = (hit.names && hit.names.length > 1) ? hit.names[1] : '';
        result.nomineeName2 = (hit.names && hit.names.length > 2) ? hit.names[2] : '';
        result.applicationDate = hit.dates && hit.dates.length > 0 ? hit.dates[0] : null;
        result.status = hit.status || 0;
        result.email = hit.contactInfo && hit.contactInfo.length > 0 ? hit.contactInfo[0] : '';
        result.mobile = hit.contactInfo && hit.contactInfo.length > 1 ? hit.contactInfo[1] : '';
        result.nicheCode = hit.nicheCode || '';
        result.chapelName = hit.chapelName || '';
        break;

      case 'gates-of-life':
      case 'engrave-wall-application':
        result.applicantName = hit.primaryName || '';
        result.bookingDate = hit.dates && hit.dates.length > 0 ? hit.dates[0] : null;
        result.email = hit.contactInfo && hit.contactInfo.length > 0 ? hit.contactInfo[0] : '';
        result.mobile = hit.contactInfo && hit.contactInfo.length > 1 ? hit.contactInfo[1] : '';
        break;

      case 'inscription':
        result.applicantName = hit.primaryName || '';
        result.transactionDate = hit.dates && hit.dates.length > 0 ? hit.dates[0] : null;
        result.purpose = hit.purpose || '';
        result.inscriptionPhrase = hit.additionalPhrase || '';
        result.deceasedNames = hit.deceasedNames || [];
        result.email = hit.contactInfo && hit.contactInfo.length > 0 ? hit.contactInfo[0] : '';
        result.mobile = hit.contactInfo && hit.contactInfo.length > 1 ? hit.contactInfo[1] : '';
        break;

      case 'wake-room-booking':
        result.applicantName = hit.primaryName || '';
        result.nameOfDeceased = (hit.names && hit.names.length > 1) ? hit.names[1] : '';
        result.usingDate = hit.dates && hit.dates.length > 0 ? hit.dates[0] : null;
        result.purpose = hit.purpose || '';
        result.remarks = hit.remarks || '';
        result.email = hit.contactInfo && hit.contactInfo.length > 0 ? hit.contactInfo[0] : '';
        result.mobile = hit.contactInfo && hit.contactInfo.length > 1 ? hit.contactInfo[1] : '';
        result.roomName = hit.roomName || '';
        result.chapelName = hit.chapelName || '';
        break;

      case 'person':
        result.name = hit.primaryName || '';
        result.email = hit.contactInfo && hit.contactInfo.length > 0 ? hit.contactInfo[0] : '';
        result.mobile = hit.contactInfo && hit.contactInfo.length > 1 ? hit.contactInfo[1] : '';
        break;

      case 'church':
        result.name = hit.primaryName || '';
        result.email = hit.contactInfo && hit.contactInfo.length > 0 ? hit.contactInfo[0] : '';
        result.mobile = hit.contactInfo && hit.contactInfo.length > 1 ? hit.contactInfo[1] : '';
        result.address = hit.address || '';
        result.city = hit.city || '';
        result.state = hit.state || '';
        result.zipCode = hit.zipCode || '';
        result.country = hit.country || '';
        break;

      case 'niche':
        result.code = hit.code || '';
        result.status = hit.status || 0;
        result.chapelName = hit.chapelName || '';
        result.rowCode = hit.rowCode || '';
        result.wallName = hit.wallName || '';
        result.isAvailable = hit.isAvailable !== undefined ? hit.isAvailable : false;
        break;

      case 'invoice':
        result.code = hit.code || '';
        result.customerName = hit.primaryName || '';
        result.transactionDate = hit.dates && hit.dates.length > 0 ? hit.dates[0] : null;
        result.totalAmount = hit.totalAmount || 0;
        result.status = hit.status || 0;
        break;

      default:
        // Generic mapping for unknown types
        result.applicantName = hit.primaryName || '';
        result.name = hit.primaryName || '';
        result.email = hit.contactInfo && hit.contactInfo.length > 0 ? hit.contactInfo[0] : '';
        result.mobile = hit.contactInfo && hit.contactInfo.length > 1 ? hit.contactInfo[1] : '';
        break;
    }

    return result;
  }

  /**
   * Extract the actual ID from the Meilisearch document ID
   * Meilisearch IDs are in format: entityType-actualId
   */
  extractIdFromMeilisearchId(meilisearchId) {
    const parts = meilisearchId.split('-');
    if (parts.length >= 2) {
      // Return the actual ID part (everything after the first dash)
      return parts.slice(1).join('-');
    }
    return meilisearchId;
  }

  /**
   * Search applications with intelligent matching
   */
  async searchApplications(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    // Optimized search query without non-existent index hint
    const searchQuery = `
      SELECT 
        na.NicheApplicationId,
        na.Code,
        na.ApplicantName,
        na.NomineeName,
        na.NomineeName2,
        na.ApplicantIDNo,
        na.ApplicantEmailID,
        na.ApplicantMobileNo,
        na.AppliedDate,
        na.AgreementDate,
        na.Status,
        na.ChurchId,
        n.Code AS NicheCode,
        c.Name AS ChapelName,
        ch.ChurchName,
        'application' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN na.Code LIKE @exactMatch THEN 1
            WHEN na.Code LIKE @startsWith THEN 2
            WHEN na.ApplicantName LIKE @exactMatch THEN 3
            WHEN na.ApplicantName LIKE @contains THEN 4
            WHEN na.NomineeName LIKE @contains THEN 5
            WHEN na.NomineeName2 LIKE @contains THEN 5
            ELSE 6
          END,
          na.AppliedDate DESC
        ) as relevanceRank
      FROM NicheApplication na
      LEFT JOIN Niche n ON na.NicheId = n.NicheId
      LEFT JOIN NicheRow nr ON n.NicheRowlId = nr.NicheRowlId
      LEFT JOIN NicheWall nw ON nr.NicheWallId = nw.NicheWallId
      LEFT JOIN Chapel c ON nw.ChapelId = c.ChapelId
      LEFT JOIN Church ch ON na.ChurchId = ch.ChurchId
      WHERE na.ChurchId = @churchId
        AND na.Status > 0  -- Not deleted
        AND (
          na.Code LIKE @searchPattern OR
          na.ApplicantName LIKE @searchPattern OR
          na.NomineeName LIKE @searchPattern OR
          na.NomineeName2 LIKE @searchPattern OR
          na.ApplicantIDNo LIKE @searchPattern OR
          na.ApplicantEmailID LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM NicheApplication na
      WHERE na.ChurchId = @churchId
        AND na.Status > 0
        AND (
          na.Code LIKE @searchPattern OR
          na.ApplicantName LIKE @searchPattern OR
          na.NomineeName LIKE @searchPattern OR
          na.ApplicantIDNo LIKE @searchPattern OR
          na.ApplicantEmailID LIKE @searchPattern
        )
    `;

    try {
      // Prepare search patterns
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Set timeout for application queries (15 seconds)
      const countRequest = pool.request();
      countRequest.timeout = 15000; // 15 seconds timeout

      // Get total count
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout

      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Application search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.NicheApplicationId,
          code: record.Code,
          applicantName: record.ApplicantName,
          nomineeName: record.NomineeName,
          nomineeName2: record.NomineeName2,
          applicationDate: record.AppliedDate,
          status: record.Status,
          nicheCode: record.NicheCode,
          chapelName: record.ChapelName,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'application')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Application search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search invoices with intelligent matching
   */
  async searchInvoices(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        i.InvoiceId,
        i.Code,
        i.CustomerName,
        i.TransactionDate,
        i.TotalAmount,
        i.Status,
        i.ChurchId,
        ch.ChurchName,
        'invoice' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN i.Code LIKE @exactMatch THEN 1
            WHEN i.Code LIKE @startsWith THEN 2
            WHEN i.CustomerName LIKE @contains THEN 3
            ELSE 4
          END,
          i.TransactionDate DESC
        ) as relevanceRank
      FROM Invoice i
      LEFT JOIN Church ch WITH(NOLOCK) ON i.ChurchId = ch.ChurchId
      WHERE i.ChurchId = @churchId
        AND i.Status > 0  -- Active invoices
        AND (
          i.Code LIKE @searchPattern OR
          i.CustomerName LIKE @searchPattern OR
          CAST(i.TotalAmount AS VARCHAR) LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Invoice i
      WHERE i.ChurchId = @churchId
        AND i.Status > 0
        AND (
          i.Code LIKE @searchPattern OR
          i.CustomerName LIKE @searchPattern OR
          CAST(i.TotalAmount AS VARCHAR) LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Invoice search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.InvoiceId,
          code: record.Code,
          customerName: record.CustomerName,
          transactionDate: record.TransactionDate,
          totalAmount: record.TotalAmount,
          status: record.Status,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'invoice')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Invoice search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search inscriptions (Deceased) with intelligent matching
   */
  async searchInscriptions(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        id,
        DeceasedName,
        ChurchId,
        'inscription-deceased' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN DeceasedName LIKE @exactMatch THEN 1
            WHEN DeceasedName LIKE @startsWith THEN 2
            ELSE 3
          END,
          DeceasedName DESC
        ) as relevanceRank
      FROM InscriptionDeceased
      WHERE ChurchId = @churchId
        AND (
          DeceasedName LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM InscriptionDeceased
      WHERE ChurchId = @churchId
        AND (
          DeceasedName LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = `${query}`;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Inscription deceased search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.id,
          deceasedName: record.DeceasedName,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'inscription-deceased')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Inscription deceased search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search wake room bookings with intelligent matching
   */
  async searchWakeRoomBookings(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        wrb.WakeRoomBookingId,
        wrb.Code,
        wrb.ApplicantName,
        wrb.NameOfDeceased,
        wrb.UsingDate,
        wrb.Purpose,
        wrb.Remarks,
        wrb.Status,
        wrb.ChurchId,
        wrb.ApplicantEmailID,
        wrb.ApplicantMobileNo,
        wr.Name AS RoomName,
        wrb.HallNo AS ChapelName,
        ch.ChurchName,
        'wake-room' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN wrb.Code LIKE @exactMatch THEN 1
            WHEN wrb.Code LIKE @startsWith THEN 2
            WHEN wrb.ApplicantName LIKE @contains THEN 3
            WHEN wrb.NameOfDeceased LIKE @contains THEN 4
            ELSE 5
          END,
          wrb.UsingDate DESC
        ) as relevanceRank
      FROM WakeRoomBooking wrb
      LEFT JOIN WakeRoom wr ON wrb.WakeRoomId = wr.WakeRoomId
      LEFT JOIN Church ch ON wrb.ChurchId = ch.ChurchId
      WHERE wrb.ChurchId = @churchId
        AND wrb.Status > 0  -- Active bookings
        AND (
          wrb.Code LIKE @searchPattern OR
          wrb.ApplicantName LIKE @searchPattern OR
          wrb.NameOfDeceased LIKE @searchPattern OR
          wrb.ApplicantEmailID LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM WakeRoomBooking wrb
      WHERE wrb.ChurchId = @churchId
        AND wrb.Status > 0
        AND (
          wrb.Code LIKE @searchPattern OR
          wrb.ApplicantName LIKE @searchPattern OR
          wrb.NameOfDeceased LIKE @searchPattern OR
          wrb.ApplicantEmailID LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Wake room booking search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.WakeRoomBookingId,
          code: record.Code,
          applicantName: record.ApplicantName,
          nameOfDeceased: record.NameOfDeceased,
          usingDate: record.UsingDate,
          purpose: record.Purpose,
          remarks: record.Remarks,
          status: record.Status,
          roomName: record.RoomName,
          chapelName: record.ChapelName,
          churchName: record.ChurchName,
          email: record.ApplicantEmailID,
          mobile: record.ApplicantMobileNo,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'wake-room')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Wake room booking search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search gates of life (Engrave Wall Applications) with intelligent matching
   */
  async searchGatesOfLife(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        gol.GatesOfLifeId,
        gol.Code,
        gol.ApplicantName,
        gol.BookingDate,
        gol.Email,
        gol.Mobile,
        gol.Status,
        gol.ChurchId,
        ch.ChurchName,
        'gates-of-life' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN gol.Code LIKE @exactMatch THEN 1
            WHEN gol.Code LIKE @startsWith THEN 2
            WHEN gol.ApplicantName LIKE @contains THEN 3
            ELSE 4
          END,
          gol.BookingDate DESC
        ) as relevanceRank
      FROM GatesOfLife gol
      LEFT JOIN Church ch ON gol.ChurchId = ch.ChurchId
      WHERE gol.ChurchId = @churchId
        AND gol.Status > 0  -- Active bookings
        AND (
          gol.Code LIKE @searchPattern OR
          gol.ApplicantName LIKE @searchPattern OR
          gol.Email LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM GatesOfLife gol
      WHERE gol.ChurchId = @churchId
        AND gol.Status > 0
        AND (
          gol.Code LIKE @searchPattern OR
          gol.ApplicantName LIKE @searchPattern OR
          gol.Email LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Gates of Life search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.GatesOfLifeId,
          code: record.Code,
          applicantName: record.ApplicantName,
          bookingDate: record.BookingDate,
          email: record.Email,
          mobile: record.Mobile,
          status: record.Status,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'gates-of-life')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Gates of Life search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search inscriptions with intelligent matching
   */
  async searchInscriptions(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        i.InscriptionId,
        i.Code,
        i.ApplicantName,
        i.TransactionDate,
        i.Purpose,
        i.InscriptionPhrase,
        i.DeceasedNames,
        i.Email,
        i.Mobile,
        i.Status,
        i.ChurchId,
        ch.ChurchName,
        'inscription' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN i.Code LIKE @exactMatch THEN 1
            WHEN i.Code LIKE @startsWith THEN 2
            WHEN i.ApplicantName LIKE @contains THEN 3
            WHEN i.InscriptionPhrase LIKE @contains THEN 4
            ELSE 5
          END,
          i.TransactionDate DESC
        ) as relevanceRank
      FROM Inscription i
      LEFT JOIN Church ch ON i.ChurchId = ch.ChurchId
      WHERE i.ChurchId = @churchId
        AND i.Status > 0  -- Active inscriptions
        AND (
          i.Code LIKE @searchPattern OR
          i.ApplicantName LIKE @searchPattern OR
          i.InscriptionPhrase LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Inscription i
      WHERE i.ChurchId = @churchId
        AND i.Status > 0
        AND (
          i.Code LIKE @searchPattern OR
          i.ApplicantName LIKE @searchPattern OR
          i.InscriptionPhrase LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Inscription search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.InscriptionId,
          code: record.Code,
          applicantName: record.ApplicantName,
          transactionDate: record.TransactionDate,
          purpose: record.Purpose,
          inscriptionPhrase: record.InscriptionPhrase,
          deceasedNames: record.DeceasedNames,
          email: record.Email,
          mobile: record.Mobile,
          status: record.Status,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'inscription')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Inscription search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search persons with intelligent matching
   */
  async searchPersons(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        p.PersonId,
        p.Name,
        p.EmailID,
        p.MobileNo,
        p.AddressNo,
        p.AddressLine1,
        p.AddressLine2,
        p.AddressCity,
        p.AddressState,
        p.AddressCountry,
        p.ChurchId,
        ch.ChurchName,
        'person' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN p.Name LIKE @exactMatch THEN 1
            WHEN p.Name LIKE @startsWith THEN 2
            WHEN p.EmailID LIKE @contains THEN 3
            ELSE 4
          END,
          p.Name DESC
        ) as relevanceRank
      FROM Person p
      LEFT JOIN Church ch ON p.ChurchId = ch.ChurchId
      WHERE p.ChurchId = @churchId
        AND (
          p.Name LIKE @searchPattern OR
          p.EmailID LIKE @searchPattern
        )
    `;

    // Note: Replaced by fixed mappingQuery above in next replacement chunk if applicable,
    // but ensured SQL includes address fields.

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Person p
      WHERE p.ChurchId = @churchId
        AND (
          p.Name LIKE @searchPattern OR
          p.EmailID LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Person search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.PersonId,
          name: record.Name,
          email: record.EmailID,
          mobile: record.MobileNo,
          addressNo: record.AddressNo,
          addressLine1: record.AddressLine1,
          addressLine2: record.AddressLine2,
          addressCity: record.AddressCity,
          addressState: record.AddressState,
          addressCountry: record.AddressCountry,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'person')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Person search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Calculate relevance score based on rank and entity type
   */
  async searchChurches(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        c.ChurchId,
        c.ChurchName as Name,
        c.EmailID as Email,
        c.Telephone as Mobile,
        c.AddressLine1 as Address,
        c.City,
        c.State,
        c.ZipCode,
        c.Country,
        'church' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN c.ChurchName LIKE @exactMatch THEN 1
            WHEN c.ChurchName LIKE @startsWith THEN 2
            WHEN c.EmailID LIKE @contains THEN 3
            ELSE 4
          END,
          c.ChurchName DESC
        ) as relevanceRank
      FROM Church c
      WHERE c.ChurchId = @churchId
        AND (
          c.ChurchName LIKE @searchPattern OR
          c.EmailID LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Church c
      WHERE c.ChurchId = @churchId
        AND (
          c.ChurchName LIKE @searchPattern OR
          c.EmailID LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Church search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.ChurchId,
          name: record.Name,
          email: record.Email,
          mobile: record.Mobile,
          address: record.Address,
          city: record.City,
          state: record.State,
          zipCode: record.ZipCode,
          country: record.Country,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'church')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Church search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search niches with intelligent matching
   */
  async searchNiches(query, churchId, page, pageSize, includeAvailability) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        n.NicheId,
        n.Code,
        n.Status,
        n.ChurchId,
        c.Name AS ChapelName,
        ch.ChurchName,
        'niche' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN n.Code LIKE @exactMatch THEN 1
            WHEN n.Code LIKE @startsWith THEN 2
            ELSE 3
          END,
          n.Code DESC
        ) as relevanceRank
      FROM Niche n
      LEFT JOIN NicheRow nr ON n.NicheRowlId = nr.NicheRowlId
      LEFT JOIN NicheWall nw ON nr.NicheWallId = nw.NicheWallId
      LEFT JOIN Chapel c ON nw.ChapelId = c.ChapelId
      LEFT JOIN Church ch ON n.ChurchId = ch.ChurchId
      WHERE n.ChurchId = @churchId
        AND (
          n.Code LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Niche n
      WHERE n.ChurchId = @churchId
        AND (
          n.Code LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      const results = await pool.request()
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Niche search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.NicheId,
          code: record.Code,
          status: record.Status,
          churchName: record.ChurchName,
          chapelName: record.ChapelName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'niche')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Niche search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search by date with intelligent matching
   */
  async searchByDate(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        d.DateId,
        d.Date,
        d.Description,
        d.ChurchId,
        ch.ChurchName,
        'date' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN d.Date = @exactMatch THEN 1
            WHEN d.Date LIKE @startsWith THEN 2
            ELSE 3
          END,
          d.Date DESC
        ) as relevanceRank
      FROM Date d
      LEFT JOIN Church ch ON d.ChurchId = ch.ChurchId
      WHERE d.ChurchId = @churchId
        AND (
          d.Date = @exactMatch OR
          d.Date LIKE @startsWith
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Date d
      WHERE d.ChurchId = @churchId
        AND (
          d.Date = @exactMatch OR
          d.Date LIKE @startsWith
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;

      // Get total count
      const countResult = await pool.request()
        .input('churchId', churchId)
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      const results = await pool.request()
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Date search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.DateId,
          date: record.Date,
          description: record.Description,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'date')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Date search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search inscription deceased with intelligent matching
   */
  async searchInscriptionDeceased(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        id,
        DeceasedName,
        ChurchId,
        'inscription-deceased' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN DeceasedName LIKE @exactMatch THEN 1
            WHEN DeceasedName LIKE @startsWith THEN 2
            ELSE 3
          END,
          DeceasedName DESC
        ) as relevanceRank
      FROM InscriptionDeceased
      WHERE ChurchId = @churchId
        AND (
          DeceasedName LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM InscriptionDeceased
      WHERE ChurchId = @churchId
        AND (
          DeceasedName LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = `${query}`;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Inscription deceased search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.id,
          deceasedName: record.DeceasedName,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'inscription-deceased')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Inscription deceased search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search wake room bookings with intelligent matching
   */
  async searchWakeRoomBookings(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    const searchQuery = `
      SELECT 
        wrb.WakeRoomBookingId,
        wrb.Code,
        wrb.ApplicantName,
        wrb.NameOfDeceased,
        wrb.UsingDate,
        wrb.Purpose,
        wrb.Remarks,
        wrb.Status,
        wrb.ChurchId,
        wrb.ApplicantEmailID,
        wrb.ApplicantMobileNo,
        wr.Name AS RoomName,
        wrb.HallNo AS ChapelName,
        ch.ChurchName,
        'wake-room' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN wrb.Code LIKE @exactMatch THEN 1
            WHEN wrb.Code LIKE @startsWith THEN 2
            WHEN wrb.ApplicantName LIKE @contains THEN 3
            WHEN wrb.NameOfDeceased LIKE @contains THEN 4
            ELSE 5
          END,
          wrb.UsingDate DESC
        ) as relevanceRank
      FROM WakeRoomBooking wrb
      LEFT JOIN WakeRoom wr ON wrb.WakeRoomId = wr.WakeRoomId
      LEFT JOIN Church ch ON wrb.ChurchId = ch.ChurchId
      WHERE wrb.ChurchId = @churchId
        AND wrb.Status > 0  -- Active bookings
        AND (
          wrb.Code LIKE @searchPattern OR
          wrb.ApplicantName LIKE @searchPattern OR
          wrb.NameOfDeceased LIKE @searchPattern OR
          wrb.ApplicantEmailID LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM WakeRoomBooking wrb
      WHERE wrb.ChurchId = @churchId
        AND wrb.Status > 0
        AND (
          wrb.Code LIKE @searchPattern OR
          wrb.ApplicantName LIKE @searchPattern OR
          wrb.NameOfDeceased LIKE @searchPattern OR
          wrb.ApplicantEmailID LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Wake room booking search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.WakeRoomBookingId,
          code: record.Code,
          applicantName: record.ApplicantName,
          nameOfDeceased: record.NameOfDeceased,
          usingDate: record.UsingDate,
          purpose: record.Purpose,
          remarks: record.Remarks,
          status: record.Status,
          roomName: record.RoomName,
          chapelName: record.ChapelName,
          churchName: record.ChurchName,
          email: record.ApplicantEmailID,
          mobile: record.ApplicantMobileNo,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'wake-room')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Wake room booking search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Search gates of life (Engrave Wall Applications) with intelligent matching
   */
  async searchGatesOfLife(query, churchId, page, pageSize) {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;

    const searchQuery = `
      SELECT 
        ewa.EngraveWallApplicationId,
        ewa.Code,
        ewa.ApplicantName,
        ewa.ApplicantEmailID,
        ewa.ApplicantMobileNo,
        ewa.ApplicantAddressNo,
        ewa.ApplicantAddressLine1,
        ewa.ApplicantAddressLine2,
        ewa.ApplicantAddressCity,
        ewa.ApplicantAddressState,
        ewa.ApplicantAddressCountry,
        ewa.BookingDate,
        ewa.ChurchId,
        ch.ChurchName,
        'gates-of-life' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN ewa.Code LIKE @exactMatch THEN 1
            WHEN ewa.Code LIKE @startsWith THEN 2
            WHEN ewa.ApplicantName LIKE @contains THEN 3
            ELSE 4
          END,
          ewa.BookingDate DESC
        ) as relevanceRank
      FROM EngraveWallApplication ewa
      LEFT JOIN Church ch ON ewa.ChurchId = ch.ChurchId
      WHERE ewa.ChurchId = @churchId
        AND (
          ewa.Code LIKE @searchPattern OR
          ewa.ApplicantName LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM EngraveWallApplication ewa
      WHERE ewa.ChurchId = @churchId
        AND (
          ewa.Code LIKE @searchPattern OR
          ewa.ApplicantName LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      return {
        results: results.recordset.map(record => ({
          id: record.EngraveWallApplicationId,
          code: record.Code,
          applicantName: record.ApplicantName,
          bookingDate: record.BookingDate,
          churchName: record.ChurchName,
          email: record.ApplicantEmailID,
          mobile: record.ApplicantMobileNo,
          addressNo: record.ApplicantAddressNo,
          addressLine1: record.ApplicantAddressLine1,
          addressLine2: record.ApplicantAddressLine2,
          addressCity: record.ApplicantAddressCity,
          addressState: record.ApplicantAddressState,
          addressCountry: record.ApplicantAddressCountry,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'gates-of-life')
        })),
        totalCount: totalCount
      };

    } catch (error) {
      logger.error('GlobalSearchController: Gates of Life search failed:', error);
      return { results: [], totalCount: 0 };
    }
  }

  /**
   * Search inscriptions with intelligent matching
   */
  async searchInscriptions(query, churchId, page, pageSize) {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;

    const searchQuery = `
      SELECT 
        nir.NicheInscriptionRequestId,
        nir.Code,
        nir.ApplicantName,
        nir.ApplicantEmailID,
        nir.ApplicantMobileNo,
        nir.ApplicantAddressNo,
        nir.ApplicantAddressLine1,
        nir.ApplicantAddressLine2,
        nir.ApplicantAddressCity,
        nir.ApplicantAddressState,
        nir.ApplicantAddressCountry,
        nir.TranscationDate,
        nir.AdditionalInscriptionPhrase,
        nir.ChurchId,
        ch.ChurchName,
        'inscription' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN nir.Code LIKE @exactMatch THEN 1
            WHEN nir.Code LIKE @startsWith THEN 2
            WHEN nir.ApplicantName LIKE @contains THEN 3
            ELSE 4
          END,
          nir.TranscationDate DESC
        ) as relevanceRank
      FROM NicheInscriptionRequest nir
      LEFT JOIN Church ch ON nir.ChurchId = ch.ChurchId
      WHERE nir.ChurchId = @churchId
        AND (
          nir.Code LIKE @searchPattern OR
          nir.ApplicantName LIKE @searchPattern OR
          nir.AdditionalInscriptionPhrase LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM NicheInscriptionRequest nir
      WHERE nir.ChurchId = @churchId
        AND (
          nir.Code LIKE @searchPattern OR
          nir.ApplicantName LIKE @searchPattern OR
          nir.AdditionalInscriptionPhrase LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      // Execute query with timeout
      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout
      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      return {
        results: results.recordset.map(record => ({
          id: record.NicheInscriptionRequestId,
          code: record.Code,
          applicantName: record.ApplicantName,
          transactionDate: record.TranscationDate,
          addressNo: record.ApplicantAddressNo,
          addressLine1: record.ApplicantAddressLine1,
          addressLine2: record.ApplicantAddressLine2,
          addressCity: record.ApplicantAddressCity,
          addressState: record.ApplicantAddressState,
          addressCountry: record.ApplicantAddressCountry,
          email: record.ApplicantEmailID,
          mobile: record.ApplicantMobileNo,
          additionalPhrase: record.AdditionalInscriptionPhrase,
          churchName: record.ChurchName,
          email: record.ApplicantEmailID,
          mobile: record.ApplicantMobileNo,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'inscription')
        })),
        totalCount: totalCount
      };

    } catch (error) {
      logger.error('GlobalSearchController: Inscription search failed:', error);
      return { results: [], totalCount: 0 };
    }
  }

  /**
   * Search inscription deceased records with intelligent matching
   */
  async searchInscriptionDeceased(query, churchId, page, pageSize) {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;

    const searchQuery = `
      SELECT 
        d.NicheInscriptionRequestDecesedId,
        d.NameOfDeceased,
        d.DateDied,
        d.DateOfBirth,
        d.DeathCertificateNo,
        d.InternmentDate,
        ir.Code AS InscriptionCode,
        ir.ApplicantName,
        ir.ChurchId,
        ch.ChurchName,
        'inscription-deceased' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN d.NameOfDeceased LIKE @contains THEN 1
            WHEN d.DeathCertificateNo LIKE @contains THEN 2
            WHEN ir.Code LIKE @contains THEN 3
            ELSE 4
          END,
          d.DateDied DESC
        ) as relevanceRank
      FROM NicheInscriptionRequestDecesed d
      JOIN NicheInscriptionRequest ir ON d.NicheInscriptionRequestId = ir.NicheInscriptionRequestId
      LEFT JOIN Church ch ON ir.ChurchId = ch.ChurchId
      WHERE ir.ChurchId = @churchId
        AND (
          d.NameOfDeceased LIKE @searchPattern OR
          d.DeathCertificateNo LIKE @searchPattern OR
          ir.Code LIKE @searchPattern OR
          ir.ApplicantName LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM NicheInscriptionRequestDecesed d
      JOIN NicheInscriptionRequest ir ON d.NicheInscriptionRequestId = ir.NicheInscriptionRequestId
      WHERE ir.ChurchId = @churchId
        AND (
          d.NameOfDeceased LIKE @searchPattern OR
          d.DeathCertificateNo LIKE @searchPattern OR
          ir.Code LIKE @searchPattern OR
          ir.ApplicantName LIKE @searchPattern
        )
    `;

    try {
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000; // 10 seconds timeout
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      const results = await pool.request()
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      return {
        results: results.recordset.map(record => ({
          id: record.NicheInscriptionRequestDecesedId,
          nameOfDeceased: record.NameOfDeceased,
          dateDied: record.DateDied,
          dateOfBirth: record.DateOfBirth,
          deathCertificateNo: record.DeathCertificateNo,
          internmentDate: record.InternmentDate,
          inscriptionCode: record.InscriptionCode,
          applicantName: record.ApplicantName,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'inscription-deceased')
        })),
        totalCount: totalCount
      };

    } catch (error) {
      logger.error('GlobalSearchController: Inscription deceased search failed:', error);
      return { results: [], totalCount: 0 };
    }
  }

  /**
   * Calculate relevance score based on rank position and entity type
   */
  calculateRelevance(rank, entityType) {
    // Higher ranks (lower numbers) get higher relevance scores
    if (rank <= 1) return 'High';
    if (rank <= 3) return 'Medium-High';
    if (rank <= 10) return 'Medium';
    if (rank <= 20) return 'Medium-Low';
    return 'Low';
  }

  /**
   * Sort and paginate results
   */
  sortAndPaginateResults(results, page, pageSize) {
    // Sort results by relevance (keeping the original order based on the query processing)
    const sortedResults = results.sort((a, b) => {
      // Sort by relevance priority: High > Medium-High > Medium > Medium-Low > Low
      const relevanceOrder = {
        'High': 1,
        'Medium-High': 2,
        'Medium': 3,
        'Medium-Low': 4,
        'Low': 5
      };

      return (relevanceOrder[a.relevance] || 6) - (relevanceOrder[b.relevance] || 6);
    });

    // Apply pagination
    const offset = (page - 1) * pageSize;
    const paginatedResults = sortedResults.slice(offset, offset + pageSize);

    return {
      data: paginatedResults,
      pagination: {
        page: page,
        pageSize: pageSize,
        totalResults: results.length,
        totalPages: Math.ceil(results.length / pageSize),
        hasNextPage: page < Math.ceil(results.length / pageSize),
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Search available niches with filters
   */
  async searchAvailableNiches({ query, churchId, chapelId, status }) {
    const pool = await getPool();

    let searchQuery = `
      SELECT 
        n.NicheId,
        n.Code,
        n.DefaultAmount,
        n.Status,
        n.AppearanceDescription,
        nr.Code AS RowCode,
        nw.Name AS WallName,
        c.Name AS ChapelName,
        ch.ChurchName,
        'niche' AS entityType
      FROM Niche n
      LEFT JOIN NicheRow nr ON n.NicheRowlId = nr.NicheRowlId
      LEFT JOIN NicheWall nw ON nr.NicheWallId = nw.NicheWallId
      LEFT JOIN Chapel c ON nw.ChapelId = c.ChapelId
      LEFT JOIN Church ch ON n.ChurchId = ch.ChurchId
      WHERE n.ChurchId = @churchId
        AND n.Status = @status  -- Filter by status (1 = Vacant, etc.)
    `;

    // Add optional chapel filter
    if (chapelId) {
      searchQuery += ` AND c.ChapelId = @chapelId `;
    }

    // Add optional search query
    if (query) {
      searchQuery += ` AND n.Code LIKE @searchPattern `;
    }

    try {
      const request = pool.request()
        .input('churchId', churchId)
        .input('status', status === 'vacant' ? 1 : status === 'reserved' ? 2 : status === 'booked' ? 3 : status === 'occupied' ? 4 : 1)
        .input('searchPattern', `%${query || ''}%`);

      if (chapelId) {
        request.input('chapelId', chapelId);
      }

      const results = await request.query(searchQuery);

      return results.recordset.map(record => ({
        id: record.NicheId,
        code: record.Code,
        amount: record.DefaultAmount,
        status: record.Status,
        description: record.AppearanceDescription,
        rowCode: record.RowCode,
        wallName: record.WallName,
        chapelName: record.ChapelName,
        churchName: record.ChurchName,
        entityType: record.entityType,
        isAvailable: record.Status === 1 // Only vacant niches are truly available
      }));

    } catch (error) {
      logger.error('GlobalSearchController: Available niches search failed:', error);
      return [];
    }
  }

  /**
   * Classify query type for intelligent routing
   */
  classifyQuery(query) {
    const trimmedQuery = query.trim().toUpperCase();

    // Inscription code patterns (INCR-XXXX, I-XXXX-X)
    if (/^INCR-?\d+$/i.test(trimmedQuery) || /^I-\d+-\d+$/.test(trimmedQuery)) {
      return 'inscription_code';
    }

    // Gates of life code patterns (GOL-XXXX, GAPP-XXXX)
    if (trimmedQuery.startsWith('GOL-') || trimmedQuery.startsWith('GAPP-')) {
      return 'gates_of_life_code';
    }

    // Wake room code patterns (WRB-XXXX, WR-XXXX, etc.)
    if (trimmedQuery.startsWith('WRB-') || trimmedQuery.startsWith('WR-')) {
      return 'wake_room_code';
    }

    // Additional pattern for WR codes like WR001-758
    if (trimmedQuery.startsWith('WR') && trimmedQuery.includes('-')) {
      return 'wake_room_code';
    }

    // Specific pattern for wake room codes like 001-758
    if (/^\d{3}-\d+$/.test(trimmedQuery)) {
      return 'wake_room_code';
    }

    // Application code patterns (NAPP-XXXX, etc.)
    if (/^(NAPP)-?.*$/i.test(trimmedQuery)) {
      return 'application_code';
    }

    // General application pattern (digits-digits) - match common 1409-0 format
    if (/^\d+-\d+$/i.test(trimmedQuery)) {
      return 'application_code';
    }

    // Invoice code patterns (INV-XXXX, etc.)
    if (trimmedQuery.startsWith('INV-') || trimmedQuery.startsWith('INVOICE-') || (trimmedQuery.startsWith('I-') && !trimmedQuery.includes('-', 2))) {
      return 'invoice_code';
    }

    // Date patterns (DD/MM/YYYY, DD-MM-YYYY, etc.)
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(trimmedQuery) ||
      /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(trimmedQuery)) {
      return 'date';
    }

    // Numeric only (could be ID, postal code, etc.)
    if (/^\d+$/.test(trimmedQuery)) {
      return 'numeric';
    }

    // Long text (likely name or description)
    if (trimmedQuery.length > 10) {
      return 'text_long';
    }

    // Default to general text
    return 'text';
  }

  /**
   * Search applications with intelligent matching
   */
  async searchApplications(query, churchId, page, pageSize) {
    const startTime = Date.now();
    const pool = await getPool();
    const offset = (page - 1) * pageSize;



    // Optimized search query with better indexing hints
    const searchQuery = `
      SELECT 
        na.NicheApplicationId,
        na.Code,
        na.ApplicantName,
        na.NomineeName,
        na.NomineeName2,
        na.ApplicantIDNo,
        na.ApplicantEmailID,
        na.ApplicantMobileNo,
        na.AppliedDate,
        na.AgreementDate,
        na.ApplicantAddressNo,
        na.ApplicantAddressLine1,
        na.ApplicantAddressLine2,
        na.ApplicantAddressCity,
        na.ApplicantAddressState,
        na.ApplicantAddressCountry,
        na.Status,
        na.ChurchId,
        n.Code AS NicheCode,
        c.Name AS ChapelName,
        ch.ChurchName,
        'application' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN na.Code LIKE @exactMatch THEN 1
            WHEN na.Code LIKE @startsWith THEN 2
            WHEN na.ApplicantName LIKE @exactMatch THEN 3
            WHEN na.ApplicantName LIKE @contains THEN 4
            WHEN na.NomineeName LIKE @contains THEN 5
            WHEN na.NomineeName2 LIKE @contains THEN 5
            ELSE 6
          END,
          na.AppliedDate DESC
        ) as relevanceRank
      FROM NicheApplication na
      LEFT JOIN Niche n WITH(NOLOCK) ON na.NicheId = n.NicheId
      LEFT JOIN NicheRow nr WITH(NOLOCK) ON n.NicheRowlId = nr.NicheRowlId
      LEFT JOIN NicheWall nw WITH(NOLOCK) ON nr.NicheWallId = nw.NicheWallId
      LEFT JOIN Chapel c WITH(NOLOCK) ON nw.ChapelId = c.ChapelId
      LEFT JOIN Church ch WITH(NOLOCK) ON na.ChurchId = ch.ChurchId
      WHERE na.ChurchId = @churchId
        AND na.Status > 0  -- Not deleted
        AND (
          na.Code LIKE @searchPattern OR
          na.ApplicantName LIKE @searchPattern OR
          na.NomineeName LIKE @searchPattern OR
          na.NomineeName2 LIKE @searchPattern OR
          na.ApplicantIDNo LIKE @searchPattern OR
          na.ApplicantEmailID LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM NicheApplication na
      WHERE na.ChurchId = @churchId
        AND na.Status > 0
        AND (
          na.Code LIKE @searchPattern OR
          na.ApplicantName LIKE @searchPattern OR
          na.NomineeName LIKE @searchPattern OR
          na.NomineeName2 LIKE @searchPattern OR
          na.ApplicantAddressLine1 LIKE @searchPattern OR
          na.ApplicantIDNo LIKE @searchPattern OR
          na.ApplicantEmailID LIKE @searchPattern
        )
    `;

    try {
      // Prepare search patterns
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Set timeout for application queries (15 seconds)
      const countRequest = pool.request();
      countRequest.timeout = 15000; // 15 seconds timeout

      // Get total count
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results
      const fullQuery = `${searchQuery} ORDER BY relevanceRank OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

      const resultsRequest = pool.request();
      resultsRequest.timeout = 15000; // 15 seconds timeout

      const results = await resultsRequest
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      const executionTime = Date.now() - startTime;

      logger.debug('Application search performance', {
        queryLength: query.length,
        resultsCount: results.recordset.length,
        executionTime: executionTime,
        totalCount: totalCount
      });

      return {
        results: results.recordset.map(record => ({
          id: record.NicheApplicationId,
          code: record.Code,
          applicantName: record.ApplicantName,
          nomineeName: record.NomineeName,
          nomineeName2: record.NomineeName2,
          applicationDate: record.AppliedDate,
          status: record.Status,
          nicheCode: record.NicheCode,
          chapelName: record.ChapelName,
          churchName: record.ChurchName,
          entityType: record.entityType,
          // Address fields
          addressNo: record.ApplicantAddressNo,
          addressLine1: record.ApplicantAddressLine1,
          addressLine2: record.ApplicantAddressLine2,
          addressCity: record.ApplicantAddressCity,
          addressState: record.ApplicantAddressState,
          addressCountry: record.ApplicantAddressCountry,
          email: record.ApplicantEmailID,
          mobile: record.ApplicantMobileNo,
          relevance: this.calculateRelevance(record.relevanceRank, 'application')
        })),
        totalCount: totalCount,
        executionTime: executionTime
      };

    } catch (error) {
      logger.error('GlobalSearchController: Application search failed:', error);
      return { results: [], totalCount: 0, executionTime: Date.now() - startTime };
    }
  }



  /**
   * Search churches (fixed version)
   */
  async searchChurches(query, churchId, page, pageSize) {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;

    const searchQuery = `
      SELECT 
        c.ChurchId,
        c.ChurchName as Name,
        c.AddressLine1 as Address,
        c.Telephone as Phone,
        c.EmailID as Email,
        'church' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN c.ChurchName LIKE @exactMatch THEN 1
            WHEN c.ChurchName LIKE @startsWith THEN 2
            WHEN c.EmailID LIKE @contains THEN 3
            ELSE 4
          END,
          c.ChurchName DESC
        ) as relevanceRank
      FROM Church c
      WHERE c.ChurchId = @churchId
        AND (
          c.ChurchName LIKE @searchPattern OR
          c.AddressLine1 LIKE @searchPattern OR
          c.EmailID LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Church c
      WHERE c.ChurchId = @churchId
        AND (
          c.ChurchName LIKE @searchPattern OR
          c.AddressLine1 LIKE @searchPattern OR
          c.EmailID LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000;
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results - Fix the FETCH syntax by removing ORDER BY since we're using ROW_NUMBER()
      const fullQuery = `
        SELECT * FROM (
          ${searchQuery}
        ) AS ranked_results
        WHERE relevanceRank > @offset AND relevanceRank <= @offset + @pageSize
        ORDER BY relevanceRank
      `;

      const results = await pool.request()
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      return {
        results: results.recordset.map(record => ({
          id: record.ChurchId,
          name: record.Name,
          address: record.Address,
          phone: record.Phone,
          email: record.Email,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'church')
        })),
        totalCount: totalCount
      };

    } catch (error) {
      logger.error('GlobalSearchController: Church search failed:', error);
      return { results: [], totalCount: 0 };
    }
  }

  /**
   * Search niches with availability checking (fixed version)
   */
  async searchNiches(query, churchId, page, pageSize, includeAvailability) {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;

    let searchQuery = `
      SELECT 
        n.NicheId,
        n.Code,
        n.DefaultAmount,
        n.Status,
        n.AppearanceDescription,
        nr.Code AS RowCode,
        nw.Name AS WallName,
        c.Name AS ChapelName,
        ch.ChurchName,
        n.NicheRowlId,
        nr.NicheWallId,
        nw.ChapelId,
        'niche' AS entityType,
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN n.Code LIKE @exactMatch THEN 1
            WHEN n.Code LIKE @startsWith THEN 2
            WHEN n.Code LIKE @contains THEN 3
            ELSE 4
          END,
          n.Code
        ) as relevanceRank
    `;

    // Add availability information if requested
    if (includeAvailability) {
      searchQuery += `,
        CASE 
          WHEN n.Status = 1 THEN 1  -- Vacant
          WHEN n.Status = 2 THEN 0  -- Reserved
          WHEN n.Status = 3 THEN 0  -- Booked
          WHEN n.Status = 4 THEN 0  -- Occupied
          WHEN n.Status = 5 THEN 0  -- Partially Occupied
          ELSE 0
        END AS isAvailable,
        CASE n.Status
          WHEN 1 THEN 'Vacant'
          WHEN 2 THEN 'Reserved'
          WHEN 3 THEN 'Booked'
          WHEN 4 THEN 'Occupied'
          WHEN 5 THEN 'Partially Occupied'
          ELSE 'Unknown'
        END AS statusText
      `;
    } else {
      searchQuery += `,
        0 AS isAvailable,
        'Status check disabled' AS statusText
      `;
    }

    searchQuery += `
      FROM Niche n
      LEFT JOIN NicheRow nr ON n.NicheRowlId = nr.NicheRowlId
      LEFT JOIN NicheWall nw ON nr.NicheWallId = nw.NicheWallId
      LEFT JOIN Chapel c ON nw.ChapelId = c.ChapelId
      LEFT JOIN Church ch ON n.ChurchId = ch.ChurchId
      WHERE n.ChurchId = @churchId
        AND (
          n.Code LIKE @searchPattern OR
          nr.Code LIKE @searchPattern OR
          nw.Name LIKE @searchPattern OR
          c.Name LIKE @searchPattern
        )
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Niche n
      LEFT JOIN NicheRow nr ON n.NicheRowlId = nr.NicheRowlId
      LEFT JOIN NicheWall nw ON nr.NicheWallId = nw.NicheWallId
      LEFT JOIN Chapel c ON nw.ChapelId = c.ChapelId
      WHERE n.ChurchId = @churchId
        AND (
          n.Code LIKE @searchPattern OR
          nr.Code LIKE @searchPattern OR
          nw.Name LIKE @searchPattern OR
          c.Name LIKE @searchPattern
        )
    `;

    try {
      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;
      const searchPattern = `%${query}%`;

      // Get total count with timeout
      const countRequest = pool.request();
      countRequest.timeout = 10000;
      const countResult = await countRequest
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .query(countQuery);

      const totalCount = countResult.recordset[0].total;

      // Get paginated results - Fix the FETCH syntax by using subquery approach
      const fullQuery = `
        SELECT * FROM (
          ${searchQuery}
        ) AS ranked_results
        WHERE relevanceRank > @offset AND relevanceRank <= @offset + @pageSize
        ORDER BY relevanceRank
      `;

      const results = await pool.request()
        .input('exactMatch', exactMatch)
        .input('startsWith', startsWith)
        .input('contains', contains)
        .input('searchPattern', searchPattern)
        .input('churchId', churchId)
        .input('offset', offset)
        .input('pageSize', pageSize)
        .query(fullQuery);

      return {
        results: results.recordset.map(record => ({
          id: record.NicheId,
          code: record.Code,
          amount: record.DefaultAmount,
          status: record.Status,
          statusText: record.statusText,
          isAvailable: record.isAvailable === 1,
          description: record.AppearanceDescription,
          rowCode: record.RowCode,
          wallName: record.WallName,
          chapelName: record.ChapelName,
          churchName: record.ChurchName,
          entityType: record.entityType,
          relevance: this.calculateRelevance(record.relevanceRank, 'niche'),
          location: {
            nicheId: record.NicheId,
            rowId: record.NicheRowId,
            wallId: record.NicheWallId,
            chapelId: record.ChapelId
          }
        })),
        totalCount: totalCount
      };

    } catch (error) {
      logger.error('GlobalSearchController: Niche search failed:', error);
      return { results: [], totalCount: 0 };
    }
  }

  /**
   * Search by date across all relevant tables
   */
  async searchByDate(query, churchId, page, pageSize) {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;

    // Try to parse the date
    let searchDate = null;
    try {
      // Handle various date formats
      if (query.includes('/')) {
        const parts = query.split('/');
        if (parts.length === 3) {
          searchDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // DD/MM/YYYY
        }
      } else if (query.includes('-')) {
        const parts = query.split('-');
        if (parts.length === 3) {
          searchDate = new Date(query); // YYYY-MM-DD or DD-MM-YYYY
        }
      }

      if (searchDate && isNaN(searchDate.getTime())) {
        searchDate = null;
      }
    } catch (e) {
      searchDate = null;
    }

    if (!searchDate) {
      return { results: [], totalCount: 0 };
    }

    const formattedDate = searchDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const searchQuery = `
      SELECT 
        na.NicheApplicationId as id,
        na.Code,
        na.ApplicantName,
        na.AppliedDate,
        na.AgreementDate,
        'application' AS entityType,
        'Date match' AS matchType
      FROM NicheApplication na
      WHERE na.ChurchId = @churchId
        AND na.Status > 0
        AND (
          CAST(na.AppliedDate AS DATE) = @searchDate OR
          CAST(na.AgreementDate AS DATE) = @searchDate
        )
      UNION ALL
      
      SELECT 
        ir.NicheInscriptionRequestId as id,
        ir.Code,
        ir.ApplicantName,
        ir.TranscationDate as AppliedDate,
        ir.TranscationDate as AgreementDate,
        'inscription' AS entityType,
        'Date match' AS matchType
      FROM NicheInscriptionRequest ir
      WHERE ir.ChurchId = @churchId
        AND CAST(ir.TranscationDate AS DATE) = @searchDate
      
      UNION ALL
      
      SELECT 
        wrb.WakeRoomBookingId as id,
        wrb.Code,
        wrb.ApplicantName,
        wrb.UsingDate as AppliedDate,
        wrb.UsingDate as AgreementDate,
        'wake-room' AS entityType,
        'Date match' AS matchType
      FROM WakeRoomBooking wrb
      WHERE wrb.ChurchId = @churchId
        AND wrb.Status > 0
        AND CAST(wrb.UsingDate AS DATE) = @searchDate
      
      UNION ALL
      
      SELECT 
        ewa.EngraveWallApplicationId as id,
        ewa.Code,
        ewa.ApplicantName,
        ewa.BookingDate as AppliedDate,
        ewa.BookingDate as AgreementDate,
        'gates-of-life' AS entityType,
        'Date match' AS matchType
      FROM EngraveWallApplication ewa
      WHERE ewa.ChurchId = @churchId
        AND CAST(ewa.BookingDate AS DATE) = @searchDate
      
      UNION ALL
      
      SELECT 
        i.InvoiceId as id,
        i.Code as Code,
        i.CustomerName as ApplicantName,
        i.TransactionDate as AppliedDate,
        i.TransactionDate as AgreementDate,
        'invoice' AS entityType,
        'Date match' AS matchType
      FROM Invoice i
      WHERE i.ChurchId = @churchId
        AND i.Status > 0
        AND CAST(i.TransactionDate AS DATE) = @searchDate
      
      UNION ALL
      
      SELECT 
        d.NicheInscriptionRequestDecesedId as id,
        ir.Code as Code,
        ir.ApplicantName,
        d.DateDied as AppliedDate,
        d.DateDied as AgreementDate,
        'inscription-deceased' AS entityType,
        'Date match' AS matchType
      FROM NicheInscriptionRequestDecesed d
      JOIN NicheInscriptionRequest ir ON d.NicheInscriptionRequestId = ir.NicheInscriptionRequestId
      WHERE ir.ChurchId = @churchId
        AND CAST(d.DateDied AS DATE) = @searchDate
    `;

    try {
      const results = await pool.request()
        .input('churchId', churchId)
        .input('searchDate', formattedDate)
        .query(searchQuery);

      // Add pagination manually since we can't use OFFSET with UNION
      const allResults = results.recordset.map((record, index) => ({
        ...record,
        relevance: this.calculateRelevance(index + 1, 'date')
      }));

      const paginatedResults = allResults.slice(offset, offset + pageSize);
      const totalCount = allResults.length;

      return {
        results: paginatedResults,
        totalCount: totalCount
      };

    } catch (error) {
      logger.error('GlobalSearchController: Date search failed:', error);
      return { results: [], totalCount: 0 };
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions({ query, churchId, limit }) {
    const pool = await getPool();

    const suggestionsQuery = `
      -- Application codes
      SELECT TOP (@limit) Code as suggestion, 'application' as type
      FROM NicheApplication 
      WHERE ChurchId = @churchId AND Status > 0 AND Code LIKE @searchPattern
      
      UNION ALL
      
      -- Applicant names
      SELECT TOP (@limit) ApplicantName as suggestion, 'person' as type
      FROM NicheApplication 
      WHERE ChurchId = @churchId AND Status > 0 AND ApplicantName LIKE @searchPattern
      
      UNION ALL
      
      -- Niche codes
      SELECT TOP (@limit) Code as suggestion, 'niche' as type
      FROM Niche 
      WHERE ChurchId = @churchId AND Code LIKE @searchPattern
      
      UNION ALL
      
      -- Church names
      SELECT TOP (@limit) Name as suggestion, 'church' as type
      FROM Church 
      WHERE ChurchId = @churchId AND Active = 1 AND Name LIKE @searchPattern
      
      UNION ALL
      
      -- Wake room booking codes
      SELECT TOP (@limit) Code as suggestion, 'wake-room' as type
      FROM WakeRoomBooking
      WHERE ChurchId = @churchId AND Status > 0 AND Code LIKE @searchPattern
      
      UNION ALL
      
      -- Inscription codes
      SELECT TOP (@limit) Code as suggestion, 'inscription' as type
      FROM NicheInscriptionRequest
      WHERE ChurchId = @churchId AND Code LIKE @searchPattern
      
      UNION ALL
      
      -- Gates of Life codes
      SELECT TOP (@limit) Code as suggestion, 'gates-of-life' as type
      FROM EngraveWallApplication
      WHERE ChurchId = @churchId AND Code LIKE @searchPattern
      
      UNION ALL
      
      -- Invoice codes
      SELECT TOP (@limit) Code as suggestion, 'invoice' as type
      FROM Invoice
      WHERE ChurchId = @churchId AND Status > 0 AND Code LIKE @searchPattern
      
      UNION ALL
      
      -- Inscription deceased names
      SELECT DISTINCT TOP (@limit) d.NameOfDeceased as suggestion, 'inscription-deceased' as type
      FROM NicheInscriptionRequest ir
      JOIN NicheInscriptionRequestDecesed d ON ir.NicheInscriptionRequestId = d.NicheInscriptionRequestId
      WHERE ir.ChurchId = @churchId AND d.NameOfDeceased LIKE @searchPattern
      
      UNION ALL
      
      -- Inscription codes
      SELECT DISTINCT TOP (@limit) ir.Code as suggestion, 'inscription' as type
      FROM NicheInscriptionRequest ir
      WHERE ir.ChurchId = @churchId AND ir.Code LIKE @searchPattern
    `;

    try {
      const searchPattern = `${query}%`;
      const results = await pool.request()
        .input('churchId', churchId)
        .input('searchPattern', searchPattern)
        .input('limit', limit)
        .query(suggestionsQuery);

      return results.recordset.map(record => ({
        text: record.suggestion,
        type: record.type
      }));

    } catch (error) {
      logger.error('GlobalSearchController: Autocomplete failed:', error);
      return [];
    }
  }

  /**
   * Main global search endpoint method that handles the route request
   */
  async globalSearch(req, res) {
    try {
      const { q: query, types, page = 1, pageSize = 20, includeAvailability = true } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query (q) is required',
          data: null
        });
      }

      // Parse types parameter
      const searchTypes = types ? types.split(',').map(t => t.trim()) : [
        'application', 'person', 'church', 'niche', 'date', 'invoice',
        'wake-room', 'gates-of-life', 'inscription', 'inscription-deceased'
      ];

      // Get user church ID from authenticated request
      const userChurchId = req.user ? req.user.churchId : 1; // Default to 1 if not available

      // Execute intelligent search
      const result = await this.executeIntelligentSearch({
        query: query.trim(),
        types: searchTypes,
        churchId: userChurchId,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        includeAvailability: includeAvailability === 'true'
      });

      // Return successful response
      res.status(200).json({
        success: true,
        message: 'Global search completed successfully',
        data: {
          results: result.results,
          pagination: result.pagination,
          executionTime: result.executionTime,
          searchMethod: result.searchMethod,
          performanceMetrics: result.performanceMetrics
        }
      });

    } catch (error) {
      logger.error('GlobalSearchController.globalSearch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during global search',
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Force sync all data to Meilisearch
   */
  async forceMeilisearchSync(req, res) {
    try {
      const { fullSync = false } = req.query;

      logger.info('Manual Meilisearch sync triggered', { fullSync });

      // Import the sync service dynamically to avoid circular dependencies
      const meilisearchSyncServiceModule = require('../services/MeilisearchSyncService');
      // Ensure we get the service instance, not just the module
      const meilisearchSyncService = typeof meilisearchSyncServiceModule === 'function'
        ? new meilisearchSyncServiceModule()
        : meilisearchSyncServiceModule;

      if (fullSync === 'true') {
        // Perform full sync (rebuild entire index)
        await meilisearchSyncService.fullSync();
        logger.info('Full Meilisearch sync completed');
        return res.status(200).json({
          success: true,
          message: 'Full Meilisearch sync completed successfully',
          data: { syncType: 'full' }
        });
      } else {
        // Perform incremental sync
        await meilisearchSyncService.incrementalSync(null); // null means sync all data
        logger.info('Incremental Meilisearch sync completed');
        return res.status(200).json({
          success: true,
          message: 'Incremental Meilisearch sync completed successfully',
          data: { syncType: 'incremental' }
        });
      }

    } catch (error) {
      logger.error('GlobalSearchController.forceMeilisearchSync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync data to Meilisearch',
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Check Meilisearch health status
   */
  async checkMeilisearchHealthStatus(req, res) {
    try {
      const healthStatus = await this.checkMeilisearchHealth();

      res.status(200).json({
        success: true,
        message: 'Meilisearch health status retrieved',
        data: {
          isHealthy: healthStatus,
          isAvailable: this.meilisearchAvailable,
          lastFailure: this.lastMeilisearchFailure,
          retryDelay: this.meilisearchRetryDelay
        }
      });

    } catch (error) {
      logger.error('GlobalSearchController.checkMeilisearchHealthStatus error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check Meilisearch health status',
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Initialize Meilisearch index
   */
  async initializeMeilisearchIndex(req, res) {
    try {
      // Import the sync service dynamically to avoid circular dependencies
      const meilisearchSyncServiceModule = require('../services/MeilisearchSyncService');
      // Ensure we get the service instance, not just the module
      const meilisearchSyncService = typeof meilisearchSyncServiceModule === 'function'
        ? new meilisearchSyncServiceModule()
        : meilisearchSyncServiceModule;
      await meilisearchSyncService.initializeIndex();

      res.status(200).json({
        success: true,
        message: 'Meilisearch index initialized successfully',
        data: null
      });

    } catch (error) {
      logger.error('GlobalSearchController.initializeMeilisearchIndex error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize Meilisearch index',
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Autocomplete endpoint method
   */
  async autocomplete(req, res) {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query (q) with minimum 2 characters is required',
          data: []
        });
      }

      const suggestions = await this.getAutocompleteSuggestions({
        query: query.trim(),
        churchId: req.user ? req.user.churchId : 1,
        limit: Math.min(parseInt(limit), 20) // Cap at 20
      });

      res.status(200).json({
        success: true,
        message: 'Autocomplete suggestions retrieved successfully',
        data: suggestions
      });

    } catch (error) {
      logger.error('GlobalSearchController.autocomplete error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during autocomplete',
        error: error.message,
        data: []
      });
    }
  }

  /**
   * Available niches search endpoint method
   */
  async availableNiches(req, res) {
    try {
      const { q: query, chapelId, status = 'vacant' } = req.query;

      const niches = await this.searchAvailableNiches({
        query: query ? query.trim() : '',
        churchId: req.user ? req.user.churchId : 1,
        chapelId: chapelId ? parseInt(chapelId) : null,
        status: status
      });

      res.status(200).json({
        success: true,
        message: 'Available niches retrieved successfully',
        data: niches
      });

    } catch (error) {
      logger.error('GlobalSearchController.availableNiches error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during available niches search',
        error: error.message,
        data: []
      });
    }
  }
}

// Export the class itself to allow proper method binding
module.exports = GlobalSearchController;
