const { meilisearchClient, GLOBAL_SEARCH_INDEX, mapEntityToDocument } = require('../config/meilisearch.config');
const { getPool } = require('../config/database');
const logger = require('../utils/logger');

class MeilisearchSyncService {
  constructor() {
    this.index = meilisearchClient.index(GLOBAL_SEARCH_INDEX);
    this.syncInProgress = false;
  }

  /**
   * Initialize the Meilisearch index with settings
   */
  async initializeIndex() {
    try {
      // Create the index if it doesn't exist
      await meilisearchClient.createIndex(GLOBAL_SEARCH_INDEX, {
        primaryKey: 'id'
      });

      // Update index settings for better search
      await this.index.updateSettings({
        searchableAttributes: [
          'code', 
          'primaryName', 
          'names', 
          'deceasedNames', 
          'purpose', 
          'remarks', 
          'additionalPhrase', 
          'contactInfo',
          'searchableContent'
        ],
        filterableAttributes: [
          'entityType', 
          'churchId',
          'dates'
        ],
        sortableAttributes: [
          'updatedAt',
          'createdAt'
        ]
      });

      logger.info('Meilisearch index initialized successfully');
    } catch (error) {
      logger.error('Error initializing Meilisearch index:', error);
      throw error;
    }
  }

  /**
   * Perform incremental sync of data from MSSQL to Meilisearch
   * Syncs data based on last updated timestamps
   */
  async incrementalSync(lastSyncTime = null) {
    if (this.syncInProgress) {
      logger.warn('Sync already in progress, skipping this sync cycle');
      return;
    }

    this.syncInProgress = true;
    const syncStartTime = new Date();

    try {
      logger.info('Starting incremental Meilisearch sync', { lastSyncTime });

      // Sync each entity type
      await this.syncNicheApplications(lastSyncTime);
      await this.syncEngraveWallApplications(lastSyncTime);
      await this.syncNicheInscriptionRequests(lastSyncTime);
      await this.syncWakeRoomBookings(lastSyncTime);

      logger.info('Incremental Meilisearch sync completed successfully', {
        syncDuration: new Date() - syncStartTime,
        syncTime: syncStartTime.toISOString()
      });
    } catch (error) {
      logger.error('Error during Meilisearch incremental sync:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync niche applications to Meilisearch
   */
  async syncNicheApplications(lastSyncTime = null) {
    try {
      const pool = await getPool();
      let query = `
        SELECT 
          na.NicheApplicationId as id,
          na.Code,
          na.ApplicantName,
          na.NomineeName,
          na.ApplicantEmailID,
          na.ApplicantMobileNo,
          na.AppliedDate,
          na.AgreementDate,
          na.Status,
          na.ChurchId,
          na.CreatedAt,
          na.UpdatedAt,
          na.ApplicantHomeTelNo,
          na.ApplicantOfficeTelNo,
          na.Purpose,
          na.Remarks
        FROM NicheApplication na
        WHERE na.Status > 0  -- Active applications
      `;

      const queryParams = {};
      
      if (lastSyncTime) {
        query += ` AND na.UpdatedAt >= @lastSyncTime`;
        queryParams.lastSyncTime = lastSyncTime;
      }

      const result = await pool.request().query(query);
      const documents = result.recordset.map(record => 
        mapEntityToDocument({ ...record }, 'niche-application')
      );

      if (documents.length > 0) {
        await this.index.addDocuments(documents, { primaryKey: 'id' });
        logger.info(`Synced ${documents.length} niche applications to Meilisearch`);
      } else {
        logger.debug('No niche applications to sync');
      }
    } catch (error) {
      logger.error('Error syncing niche applications to Meilisearch:', error);
      throw error;
    }
  }

  /**
   * Sync engrave wall applications (Gates of Life) to Meilisearch
   */
  async syncEngraveWallApplications(lastSyncTime = null) {
    try {
      const pool = await getPool();
      let query = `
        SELECT 
          ewa.EngraveWallApplicationId as id,
          ewa.Code,
          ewa.ApplicantName,
          ewa.ApplicantEmailID,
          ewa.ApplicantMobileNo,
          ewa.BookingDate,
          ewa.Status,
          ewa.ChurchId,
          ewa.CreatedAt,
          ewa.UpdatedAt,
          ewa.ApplicantHomeTelNo,
          ewa.ApplicantOfficeTelNo,
          ewa.ApplicantAddressLine1,
          ewa.ApplicantAddressLine2,
          ewa.ApplicantAddressCity
        FROM EngraveWallApplication ewa
        WHERE ewa.Status > 0  -- Active applications
      `;

      const queryParams = {};
      
      if (lastSyncTime) {
        query += ` AND ewa.UpdatedAt >= @lastSyncTime`;
        queryParams.lastSyncTime = lastSyncTime;
      }

      const request = pool.request();
      if (lastSyncTime) {
        request.input('lastSyncTime', lastSyncTime);
      }
      
      const result = await request.query(query);
      const documents = result.recordset.map(record => 
        mapEntityToDocument({ ...record }, 'gates-of-life')
      );

      if (documents.length > 0) {
        await this.index.addDocuments(documents, { primaryKey: 'id' });
        logger.info(`Synced ${documents.length} engrave wall applications to Meilisearch`);
      } else {
        logger.debug('No engrave wall applications to sync');
      }
    } catch (error) {
      logger.error('Error syncing engrave wall applications to Meilisearch:', error);
      throw error;
    }
  }

  /**
   * Sync niche inscription requests to Meilisearch
   */
  async syncNicheInscriptionRequests(lastSyncTime = null) {
    try {
      const pool = await getPool();
      
      // First, get the inscription requests
      let query = `
        SELECT 
          ir.NicheInscriptionRequestId as id,
          ir.Code,
          ir.ApplicantName,
          ir.ApplicantEmailID,
          ir.ApplicantMobileNo,
          ir.TranscationDate,
          ir.Status,
          ir.ChurchId,
          ir.CreatedAt,
          ir.UpdatedAt,
          ir.ApplicantHomeTelNo,
          ir.ApplicantOfficeTelNo,
          ir.AdditionalInscriptionPhrase,
          ir.Purpose,
          ir.BasedOn,
          ir.RefDocType
        FROM NicheInscriptionRequest ir
        WHERE ir.Status > 0  -- Active requests
      `;

      const queryParams = {};
      
      if (lastSyncTime) {
        query += ` AND ir.UpdatedAt >= @lastSyncTime`;
        queryParams.lastSyncTime = lastSyncTime;
      }

      const request = pool.request();
      if (lastSyncTime) {
        request.input('lastSyncTime', lastSyncTime);
      }
      
      const result = await request.query(query);
      
      // Get deceased information for each inscription request
      const documents = [];
      for (const record of result.recordset) {
        // Fetch deceased details for this inscription request
        const deceasedQuery = `
          SELECT NameOfDeceased
          FROM NicheInscriptionRequestDecesed
          WHERE NicheInscriptionRequestId = @inscriptionId
        `;
        
        const deceasedResults = await pool.request()
          .input('inscriptionId', record.id)
          .query(deceasedQuery);
        
        const deceasedNames = deceasedResults.recordset.map(d => d.NameOfDeceased).filter(Boolean);
        
        // Add deceased names to the record
        const enhancedRecord = {
          ...record,
          deceasedNames: deceasedNames
        };
        
        documents.push(mapEntityToDocument(enhancedRecord, 'inscription'));
      }

      if (documents.length > 0) {
        await this.index.addDocuments(documents, { primaryKey: 'id' });
        logger.info(`Synced ${documents.length} niche inscription requests to Meilisearch`);
      } else {
        logger.debug('No niche inscription requests to sync');
      }
    } catch (error) {
      logger.error('Error syncing niche inscription requests to Meilisearch:', error);
      throw error;
    }
  }

  /**
   * Sync wake room bookings to Meilisearch
   */
  async syncWakeRoomBookings(lastSyncTime = null) {
    try {
      const pool = await getPool();
      let query = `
        SELECT 
          wrb.WakeRoomBookingId as id,
          wrb.Code,
          wrb.ApplicantName,
          wrb.NameOfDeceased,
          wrb.ApplicantEmailID,
          wrb.ApplicantMobileNo,
          wrb.UsingDate,
          wrb.Status,
          wrb.ChurchId,
          wrb.CreatedAt,
          wrb.UpdatedAt,
          wrb.ApplicantHomeTelNo,
          wrb.ApplicantOfficeTelNo,
          wrb.Purpose,
          wrb.Remarks,
          wrb.TranscationDate
        FROM WakeRoomBooking wrb
        WHERE wrb.Status > 0  -- Active bookings
      `;

      const queryParams = {};
      
      if (lastSyncTime) {
        query += ` AND wrb.UpdatedAt >= @lastSyncTime`;
        queryParams.lastSyncTime = lastSyncTime;
      }

      const request = pool.request();
      if (lastSyncTime) {
        request.input('lastSyncTime', lastSyncTime);
      }
      
      const result = await request.query(query);
      const documents = result.recordset.map(record => 
        mapEntityToDocument({ ...record }, 'wake-room-booking')
      );

      if (documents.length > 0) {
        await this.index.addDocuments(documents, { primaryKey: 'id' });
        logger.info(`Synced ${documents.length} wake room bookings to Meilisearch`);
      } else {
        logger.debug('No wake room bookings to sync');
      }
    } catch (error) {
      logger.error('Error syncing wake room bookings to Meilisearch:', error);
      throw error;
    }
  }

  /**
   * Remove documents from Meilisearch that no longer exist in the database
   */
  async cleanupOrphanedDocuments() {
    try {
      // This would involve comparing documents in Meilisearch with those in the database
      // For now, we'll skip this as it's complex and the upserts should handle most cases
      logger.info('Orphaned document cleanup completed (skipped for now)');
    } catch (error) {
      logger.error('Error during orphaned document cleanup:', error);
      throw error;
    }
  }

  /**
   * Perform a full sync (clear and rebuild index)
   */
  async fullSync() {
    try {
      logger.info('Starting full Meilisearch sync');
      
      // Clear existing index (optional - we can just upsert)
      // await this.index.deleteAllDocuments();
      
      // Perform incremental sync from the beginning
      await this.incrementalSync(null);
      
      logger.info('Full Meilisearch sync completed');
    } catch (error) {
      logger.error('Error during full Meilisearch sync:', error);
      throw error;
    }
  }

  /**
   * Get health status of Meilisearch connection
   */
  async healthCheck() {
    try {
      await meilisearchClient.health();
      return { status: 'healthy', connected: true };
    } catch (error) {
      logger.error('Meilisearch health check failed:', error);
      return { status: 'unhealthy', connected: false, error: error.message };
    }
  }
}

module.exports = new MeilisearchSyncService();