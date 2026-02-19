const { cache, deleteByPrefix } = require('./cache');
const logger = require('./logger');

/**
 * Cache Manager
 * Provides high-level caching operations with standardized key patterns
 */
class CacheManager {
  constructor() {
    this.cache = cache;
  }

  /**
   * Build a standardized invoice cache key
   * @param {number} churchId - Church ID
   * @param {string} code - Invoice code
   * @returns {string} Cache key
   */
  buildInvoiceKey(churchId, code) {
    return `invoice:${churchId}:${code}`;
  }

  /**
   * Build a standardized receipt cache key
   * @param {number} churchId - Church ID
   * @param {string} code - Receipt code
   * @returns {string} Cache key
   */
  buildReceiptKey(churchId, code) {
    return `receipt:${churchId}:${code}`;
  }

  /**
   * Build invalidation pattern for bulk cache invalidation
   * @param {string} entity - Entity type (e.g., 'invoice', 'receipt')
   * @param {number} churchId - Church ID
   * @returns {string} Invalidation pattern
   */
  buildInvalidationPattern(entity, churchId) {
    return `${entity}:${churchId}:`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or undefined
   */
  async get(key) {
    try {
      return this.cache.get(key);
    } catch (error) {
      logger.warn(`Cache get error for key ${key}:`, error.message);
      return undefined;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = undefined) {
    try {
      if (ttl) {
        return this.cache.set(key, value, ttl);
      }
      return this.cache.set(key, value);
    } catch (error) {
      logger.warn(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<number>} Number of deleted keys
   */
  async del(key) {
    try {
      return this.cache.del(key);
    } catch (error) {
      logger.warn(`Cache delete error for key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern (delete all keys matching prefix)
   * @param {string} pattern - Cache key prefix pattern
   * @returns {Promise<number>} Number of deleted keys
   */
  async invalidate(pattern) {
    try {
      return deleteByPrefix(pattern);
    } catch (error) {
      logger.warn(`Cache invalidate error for pattern ${pattern}:`, error.message);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async has(key) {
    try {
      return this.cache.has(key);
    } catch (error) {
      logger.warn(`Cache has error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} Object with key-value pairs
   */
  async mget(keys) {
    try {
      return this.cache.mget(keys);
    } catch (error) {
      logger.warn(`Cache mget error:`, error.message);
      return {};
    }
  }

  /**
   * Flush all cache
   * @returns {Promise<void>}
   */
  async flushAll() {
    try {
      this.cache.flushAll();
      logger.info('Cache flushed successfully');
    } catch (error) {
      logger.error('Cache flush error:', error.message);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    try {
      const stats = this.cache.getStats();
      return stats || {
        hits: 0,
        misses: 0,
        keys: this.cache.keys().length
      };
    } catch (error) {
      logger.warn('Cache stats error:', error.message);
      return {
        hits: 0,
        misses: 0,
        keys: 0,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new CacheManager();
