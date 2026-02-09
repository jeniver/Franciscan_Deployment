const { CronJob } = require('cron');
const meilisearchSyncService = require('../services/MeilisearchSyncService');
const logger = require('../utils/logger');

class MeilisearchSyncJob {
  constructor() {
    this.job = null;
    this.lastSyncTime = null;
    this.isEnabled = process.env.MEILISEARCH_ENABLED !== 'false';
  }

  /**
   * Start the hourly sync job
   */
  async start() {
    if (!this.isEnabled) {
      logger.info('Meilisearch sync job is disabled via MEILISEARCH_ENABLED environment variable');
      return;
    }

    try {
      // Initialize the Meilisearch index
      await meilisearchSyncService.initializeIndex();

      // Create cron job that runs every hour at minute 0
      this.job = new CronJob(
        '0 0 * * * *', // Every hour at minute 0 (second, minute, hour, day, month, dayOfWeek)
        async () => {
          try {
            logger.info('Running scheduled Meilisearch sync job');
            
            // Run incremental sync with the last sync time
            await meilisearchSyncService.incrementalSync(this.lastSyncTime);
            
            // Update last sync time to current time
            this.lastSyncTime = new Date();
            
            logger.info('Scheduled Meilisearch sync job completed successfully');
          } catch (error) {
            logger.error('Error in scheduled Meilisearch sync job:', error);
          }
        },
        null, // onComplete callback
        true, // Start the job immediately
        Intl.DateTimeFormat().resolvedOptions().timeZone // Time zone
      );

      logger.info('Meilisearch sync job started successfully', {
        schedule: 'Every hour at minute 0',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      // Run initial sync after a short delay to let the server start properly
      setTimeout(async () => {
        try {
          logger.info('Running initial Meilisearch sync after startup');
          await meilisearchSyncService.incrementalSync(this.lastSyncTime);
          this.lastSyncTime = new Date();
          logger.info('Initial Meilisearch sync completed');
        } catch (error) {
          logger.error('Error in initial Meilisearch sync:', error);
        }
      }, 10000); // 10 seconds after startup

    } catch (error) {
      logger.error('Failed to start Meilisearch sync job:', error);
      throw error;
    }
  }

  /**
   * Stop the sync job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      logger.info('Meilisearch sync job stopped');
    }
  }

  /**
   * Manually trigger a sync (useful for testing or on-demand syncs)
   */
  async manualSync() {
    try {
      logger.info('Manual Meilisearch sync triggered');
      await meilisearchSyncService.incrementalSync(this.lastSyncTime);
      this.lastSyncTime = new Date();
      logger.info('Manual Meilisearch sync completed successfully');
    } catch (error) {
      logger.error('Error in manual Meilisearch sync:', error);
      throw error;
    }
  }

  /**
   * Force a full sync (clear and rebuild entire index)
   */
  async forceFullSync() {
    try {
      logger.info('Force full Meilisearch sync triggered');
      await meilisearchSyncService.fullSync();
      this.lastSyncTime = new Date();
      logger.info('Force full Meilisearch sync completed successfully');
    } catch (error) {
      logger.error('Error in force full Meilisearch sync:', error);
      throw error;
    }
  }

  /**
   * Get the status of the sync job
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      running: this.job ? this.job.running : false,
      lastSyncTime: this.lastSyncTime,
      nextRun: this.job ? this.job.nextDate().toISOString() : null
    };
  }
}

module.exports = new MeilisearchSyncJob();