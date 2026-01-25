const NodeCache = require('node-cache');
const logger = require('./logger');

const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || '30', 10);
const maxKeys = parseInt(process.env.CACHE_MAX_KEYS || '1000', 10); // Prevent memory issues
const checkPeriod = Math.max(5, Math.floor(ttlSeconds * 0.2));

const cache = new NodeCache({
  stdTTL: ttlSeconds,
  checkperiod: checkPeriod,
  useClones: false,
  maxKeys: maxKeys,
  // Enable automatic deletion of least recently used items when max keys reached
  deleteOnExpire: true,
  enableLegacyCallbacks: false
});

// Cache statistics for monitoring
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  lastReset: Date.now()
};

// Safely truncate cache key for logging to prevent stack overflow
// This prevents issues when logging very long or complex cache keys
// Must be defined before event listeners that use it
const safeKeyForLogging = (key) => {
  if (!key) return '(empty key)';
  try {
    const keyStr = typeof key === 'string' ? key : String(key);
    // Truncate long keys to prevent logger formatting issues
    // 100 chars is safe for most loggers
    if (keyStr.length > 100) {
      return keyStr.substring(0, 97) + '...';
    }
    return keyStr;
  } catch (e) {
    // If string conversion fails, return placeholder
    return '(key conversion error)';
  }
};

// Enhanced cache event listeners for monitoring
cache.on('set', () => {
  cacheStats.sets++;
});

cache.on('del', () => {
  cacheStats.deletes++;
});

cache.on('expired', (key, value) => {
  // Log expired keys for debugging (can be disabled in production)
  // Use safe key formatting to prevent issues with long/complex keys
  if (process.env.NODE_ENV === 'development') {
    const safeKey = safeKeyForLogging(key);
    logger.debug(`Cache key expired: ${safeKey}`);
  }
});

cache.on('error', (error) => {
  cacheStats.errors++;
  // Log error safely without full error object to prevent serialization issues
  // Wrap in try-catch to prevent logger errors from causing additional issues
  try {
    logger.error('Cache error', {
      errorMessage: error?.message || 'Unknown cache error',
      errorName: error?.name || 'Error'
    });
  } catch (logError) {
    // If logging fails, use console.error as fallback
    console.error('Cache error (logger failed):', error?.message || 'Unknown cache error');
  }
});

// Enhanced deleteByPrefix with better error handling
const deleteByPrefix = (prefix) => {
  try {
    const keys = cache.keys();
    const keysToDelete = keys.filter((key) => key.startsWith(prefix));
    if (keysToDelete.length > 0) {
      const deleted = cache.del(keysToDelete);
      logger.info(`Deleted ${deleted} cache keys with prefix: ${prefix}`);
      cacheStats.deletes += deleted;
    }
    return keysToDelete.length;
  } catch (error) {
    cacheStats.errors++;
    logger.warn(`Failed to delete cache keys by prefix ${prefix}:`, error.message);
    return 0;
  }
};

// Store reference to original get method before we override it
// This prevents infinite recursion when our custom get calls cache.get()
const originalGet = cache.get.bind(cache);

// Enhanced get with statistics tracking
const get = (key) => {
  try {
    // Call the original get method, not the overridden one
    const value = originalGet(key);
    if (value !== undefined) {
      cacheStats.hits++;
      return value;
    } else {
      cacheStats.misses++;
      return undefined;
    }
  } catch (error) {
    cacheStats.errors++;
    // Use safe key formatting to prevent stack overflow in logger
    const safeKey = safeKeyForLogging(key);
    // Log error message only, not the full error object which might contain circular references
    // Also prevent logging from causing additional stack overflow
    try {
      logger.error('Cache get error', {
        key: safeKey,
        errorMessage: error?.message || 'Unknown error',
        errorName: error?.name || 'Error'
      });
    } catch (logError) {
      // If logging itself fails (e.g., stack overflow), just increment error count
      // Don't try to log the logging error to prevent infinite loop
      console.error('Cache get error (logger failed):', safeKey, error?.message);
    }
    return undefined;
  }
};

// Get cache statistics
const getStats = () => {
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : 0;
  
  return {
    ...cacheStats,
    totalRequests: total,
    hitRate: `${hitRate}%`,
    currentKeys: cache.keys().length,
    uptime: Date.now() - cacheStats.lastReset
  };
};

// Reset cache statistics
const resetStats = () => {
  cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    lastReset: Date.now()
  };
};

// Flush all cache (with logging)
const flushAll = () => {
  try {
    const keyCount = cache.keys().length;
    cache.flushAll();
    logger.info(`Cache flushed: ${keyCount} keys removed`);
    resetStats();
  } catch (error) {
    cacheStats.errors++;
    // Log error safely to prevent serialization issues
    logger.error('Cache flush error', {
      errorMessage: error?.message || 'Unknown error',
      errorName: error?.name || 'Error'
    });
  }
};

module.exports = {
  cache: Object.assign(cache, { get }), // Extend cache with enhanced get
  deleteByPrefix,
  getStats,
  resetStats,
  flushAll
};

