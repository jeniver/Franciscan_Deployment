const logger = require('./logger');

/**
 * Performance monitoring utility
 * Tracks API response times and database query performance
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: new Map(),
      dbQueries: new Map(),
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // Start periodic reporting
    this.startReporting();
  }

  /**
   * Track API endpoint performance
   * @param {string} endpoint - API endpoint path
   * @param {number} duration - Response time in milliseconds
   * @param {number} statusCode - HTTP status code
   */
  trackApiCall(endpoint, duration, statusCode) {
    if (!this.metrics.apiCalls.has(endpoint)) {
      this.metrics.apiCalls.set(endpoint, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        statusCodes: new Map()
      });
    }

    const stats = this.metrics.apiCalls.get(endpoint);
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);

    // Track status code distribution
    if (!stats.statusCodes.has(statusCode)) {
      stats.statusCodes.set(statusCode, 0);
    }
    stats.statusCodes.set(statusCode, stats.statusCodes.get(statusCode) + 1);

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn(`Slow API call: ${endpoint} took ${duration}ms`, {
        endpoint,
        duration,
        statusCode
      });
    }
  }

  /**
   * Track database query performance
   * @param {string} queryType - Type of query (SELECT, INSERT, UPDATE, DELETE)
   * @param {string} tableName - Table name
   * @param {number} duration - Query execution time in milliseconds
   */
  trackDbQuery(queryType, tableName, duration) {
    const key = `${queryType}:${tableName}`;
    
    if (!this.metrics.dbQueries.has(key)) {
      this.metrics.dbQueries.set(key, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0
      });
    }

    const stats = this.metrics.dbQueries.get(key);
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);

    // Log slow queries (> 500ms)
    if (duration > 500) {
      logger.warn(`Slow database query: ${queryType} on ${tableName} took ${duration}ms`);
    }
  }

  /**
   * Track cache hit/miss
   * @param {boolean} hit - True for cache hit, false for miss
   */
  trackCache(hit) {
    if (hit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  /**
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const apiMetrics = {};
    for (const [endpoint, stats] of this.metrics.apiCalls) {
      apiMetrics[endpoint] = {
        ...stats,
        statusCodes: Object.fromEntries(stats.statusCodes)
      };
    }

    const dbMetrics = {};
    for (const [key, stats] of this.metrics.dbQueries) {
      dbMetrics[key] = stats;
    }

    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? 
      ((this.metrics.cacheHits / totalRequests) * 100).toFixed(2) : 0;

    return {
      api: apiMetrics,
      database: dbMetrics,
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: `${cacheHitRate}%`
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset metrics (for testing or periodic resets)
   */
  reset() {
    this.metrics = {
      apiCalls: new Map(),
      dbQueries: new Map(),
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Start periodic reporting of metrics
   */
  startReporting() {
    // Report every 5 minutes
    setInterval(() => {
      const metrics = this.getMetrics();
      
      // Log summary statistics
      const totalApiCalls = Object.values(metrics.api).reduce((sum, endpoint) => sum + endpoint.count, 0);
      const avgApiTime = totalApiCalls > 0 ? 
        (Object.values(metrics.api).reduce((sum, endpoint) => sum + endpoint.totalTime, 0) / totalApiCalls).toFixed(2) : 0;
      
      const totalDbQueries = Object.values(metrics.database).reduce((sum, query) => sum + query.count, 0);
      const avgDbTime = totalDbQueries > 0 ? 
        (Object.values(metrics.database).reduce((sum, query) => sum + query.totalTime, 0) / totalDbQueries).toFixed(2) : 0;

      logger.info('Performance Metrics Summary:', {
        totalApiCalls,
        avgApiResponseTime: `${avgApiTime}ms`,
        totalDbQueries,
        avgDbQueryTime: `${avgDbTime}ms`,
        cacheHitRate: metrics.cache.hitRate
      });

      // Log slow endpoints (> 500ms average)
      const slowEndpoints = Object.entries(metrics.api)
        .filter(([_, stats]) => stats.avgTime > 500)
        .map(([endpoint, stats]) => ({ endpoint, avgTime: stats.avgTime }));
      
      if (slowEndpoints.length > 0) {
        logger.warn('Slow API endpoints detected:', slowEndpoints);
      }

    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Middleware to track API performance
   */
  apiPerformanceMiddleware() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();
      
      // Capture original end method
      const originalEnd = res.end;
      
      // Override end method to capture response time
      res.end = function(chunk, encoding) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        // Track the API call
        performanceMonitor.trackApiCall(req.path, duration, res.statusCode);
        
        // Call original end method
        originalEnd.call(this, chunk, encoding);
      };
      
      next();
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export middleware and instance
module.exports = {
  performanceMonitor,
  apiPerformanceMiddleware: () => performanceMonitor.apiPerformanceMiddleware()
};