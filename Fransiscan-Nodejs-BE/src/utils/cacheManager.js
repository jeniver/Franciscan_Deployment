const NodeCache = require('node-cache');
const logger = require('./logger');

/**
 * Multi-layer cache manager
 * Implements L1 (in-memory) and L2 (Redis-ready) caching
 * 
 * Performance:
 * - L1 cache: ~1ms lookup (in-memory)
 * - L2 cache: ~5-10ms lookup (Redis)
 * - Database: ~100-500ms lookup
 */
class CacheManager {
    constructor() {
        // L1: In-memory cache (fastest, 1-minute TTL)
        this.l1Cache = new NodeCache({
            stdTTL: 60, // 1 minute
            checkperiod: 120, // Check for expired keys every 2 minutes
            useClones: false // Don't clone objects for better performance
        });

        // L2: Redis cache (fast, 10-minute TTL)
        // TODO: Initialize Redis client when Redis is available
        this.l2Cache = null;
        this.redisEnabled = false;

        // Statistics
        this.stats = {
            l1Hits: 0,
            l1Misses: 0,
            l2Hits: 0,
            l2Misses: 0,
            totalHits: 0,
            totalMisses: 0
        };

        logger.info('CacheManager initialized (L1: in-memory)');
    }

    /**
     * Enable Redis for L2 caching
     * @param {Object} redisClient - Redis client instance
     */
    enableRedis(redisClient) {
        this.l2Cache = redisClient;
        this.redisEnabled = true;
        logger.info('CacheManager: Redis L2 cache enabled');
    }

    /**
     * Get value from cache (tries L1, then L2, then returns null)
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached value or null
     */
    async get(key) {
        // L1: In-memory cache (fastest)
        const l1Value = this.l1Cache.get(key);
        if (l1Value !== undefined) {
            this.stats.l1Hits++;
            this.stats.totalHits++;
            logger.debug(`Cache L1 HIT: ${key}`);
            return l1Value;
        }

        this.stats.l1Misses++;

        // L2: Redis cache (fast)
        if (this.redisEnabled && this.l2Cache) {
            try {
                const l2Value = await this.l2Cache.get(key);
                if (l2Value) {
                    this.stats.l2Hits++;
                    this.stats.totalHits++;
                    logger.debug(`Cache L2 HIT: ${key}`);

                    // Promote to L1 cache
                    const parsedValue = JSON.parse(l2Value);
                    this.l1Cache.set(key, parsedValue);

                    return parsedValue;
                }
                this.stats.l2Misses++;
            } catch (error) {
                logger.error(`Cache L2 error for key ${key}:`, error);
            }
        }

        this.stats.totalMisses++;
        logger.debug(`Cache MISS: ${key}`);
        return null;
    }

    /**
     * Set value in cache (both L1 and L2)
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds (default: 600 = 10 minutes)
     */
    async set(key, value, ttl = 600) {
        // Set in L1 cache (max 1 minute)
        const l1Ttl = Math.min(ttl, 60);
        this.l1Cache.set(key, value, l1Ttl);

        // Set in L2 cache (Redis)
        if (this.redisEnabled && this.l2Cache) {
            try {
                await this.l2Cache.setex(key, ttl, JSON.stringify(value));
                logger.debug(`Cache SET (L1+L2): ${key} (TTL: ${ttl}s)`);
            } catch (error) {
                logger.error(`Cache L2 SET error for key ${key}:`, error);
                logger.debug(`Cache SET (L1 only): ${key} (TTL: ${l1Ttl}s)`);
            }
        } else {
            logger.debug(`Cache SET (L1 only): ${key} (TTL: ${l1Ttl}s)`);
        }
    }

    /**
     * Delete specific key from cache
     * @param {string} key - Cache key
     */
    async del(key) {
        // Delete from L1
        this.l1Cache.del(key);

        // Delete from L2
        if (this.redisEnabled && this.l2Cache) {
            try {
                await this.l2Cache.del(key);
                logger.debug(`Cache DEL (L1+L2): ${key}`);
            } catch (error) {
                logger.error(`Cache L2 DEL error for key ${key}:`, error);
            }
        } else {
            logger.debug(`Cache DEL (L1 only): ${key}`);
        }
    }

    /**
     * Invalidate cache entries matching pattern
     * @param {string} pattern - Pattern to match (e.g., "invoice:1:*")
     */
    async invalidate(pattern) {
        // Invalidate L1 cache (flush all for simplicity)
        this.l1Cache.flushAll();
        logger.debug(`Cache L1 flushed (pattern: ${pattern})`);

        // Invalidate L2 cache (Redis pattern matching)
        if (this.redisEnabled && this.l2Cache) {
            try {
                const keys = await this.l2Cache.keys(pattern);
                if (keys && keys.length > 0) {
                    await this.l2Cache.del(keys);
                    logger.debug(`Cache L2 invalidated ${keys.length} keys (pattern: ${pattern})`);
                }
            } catch (error) {
                logger.error(`Cache L2 invalidate error for pattern ${pattern}:`, error);
            }
        }
    }

    /**
     * Clear all cache entries
     */
    async clear() {
        // Clear L1
        this.l1Cache.flushAll();

        // Clear L2
        if (this.redisEnabled && this.l2Cache) {
            try {
                await this.l2Cache.flushdb();
                logger.info('Cache cleared (L1+L2)');
            } catch (error) {
                logger.error('Cache L2 clear error:', error);
            }
        } else {
            logger.info('Cache cleared (L1 only)');
        }

        // Reset statistics
        this.stats = {
            l1Hits: 0,
            l1Misses: 0,
            l2Hits: 0,
            l2Misses: 0,
            totalHits: 0,
            totalMisses: 0
        };
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const total = this.stats.totalHits + this.stats.totalMisses;
        const hitRate = total > 0 ? ((this.stats.totalHits / total) * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            l1Size: this.l1Cache.keys().length,
            redisEnabled: this.redisEnabled
        };
    }

    /**
     * Build cache key for invoice
     * Includes type when provided to avoid cache collision between NAPP/INCR/WAPP/GOLA
     * for ambiguous codes (e.g. 7980-0 can resolve to niche or inscription).
     * @param {number} churchId - Church ID
     * @param {string} code - Invoice/application code
     * @param {string|null} type - Optional application type (NAPP, INCR, WAPP, GOLA)
     * @returns {string} Cache key
     */
    buildInvoiceKey(churchId, code, type = null) {
        const normalizedCode = (code || '').toString().trim();
        const normalizedType = type ? String(type).trim().toUpperCase() : '';
        const typeSuffix = normalizedType ? `:${normalizedType}` : '';
        return `invoice:${churchId}:${normalizedCode}${typeSuffix}`;
    }

    /**
     * Get all cache keys to invalidate when an invoice/application is created or updated.
     * Covers code variants (e.g. 7980-0, I-7980-0) and type variants to prevent stale cache.
     * @param {number} churchId - Church ID
     * @param {string} code - Invoice/application code
     * @param {string|null} refDocNumber - Optional ref doc number from invoice
     * @returns {string[]} Array of cache keys to delete
     */
    getInvoiceVariantKeysForInvalidation(churchId, code, refDocNumber = null) {
        const keys = new Set();
        const c = churchId;
        const add = (k) => keys.add(this.buildInvoiceKey(c, k));
        const addWithType = (k, t) => keys.add(this.buildInvoiceKey(c, k, t));

        const baseCode = (code || '').toString().trim();
        const refCode = refDocNumber ? String(refDocNumber).trim() : null;

        if (baseCode) {
            add(baseCode);
            addWithType(baseCode, 'NAPP');
            addWithType(baseCode, 'INCR');
            addWithType(baseCode, 'WAPP');
            addWithType(baseCode, 'GOLA');
            if (baseCode.startsWith('I-')) {
                const withoutI = baseCode.replace(/^I-/i, '');
                if (withoutI) add(withoutI), addWithType(withoutI, 'NAPP'), addWithType(withoutI, 'INCR');
            } else if (/^\d+-\d+$/.test(baseCode)) {
                add(`I-${baseCode}`);
                addWithType(`I-${baseCode}`, 'INCR');
            }
        }
        if (refCode && refCode !== baseCode) {
            add(refCode);
            addWithType(refCode, 'NAPP');
            addWithType(refCode, 'INCR');
            if (refCode.startsWith('I-')) {
                const withoutI = refCode.replace(/^I-/i, '');
                if (withoutI) add(withoutI), addWithType(withoutI, 'NAPP'), addWithType(withoutI, 'INCR');
            } else if (/^\d+-\d+$/.test(refCode)) {
                add(`I-${refCode}`);
                addWithType(`I-${refCode}`, 'INCR');
            }
        }
        return Array.from(keys);
    }

    /**
     * Build cache key for receipt
     * @param {number} churchId - Church ID
     * @param {string} code - Receipt code
     * @returns {string} Cache key
     */
    buildReceiptKey(churchId, code) {
        return `receipt:${churchId}:${code}`;
    }

    /**
     * Build cache key pattern for invalidation
     * @param {string} type - Type (invoice, receipt)
     * @param {number} churchId - Church ID
     * @returns {string} Cache key pattern
     */
    buildInvalidationPattern(type, churchId) {
        return `${type}:${churchId}:*`;
    }
}

// Export singleton instance
module.exports = new CacheManager();
