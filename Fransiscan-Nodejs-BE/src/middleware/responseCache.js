const crypto = require('crypto');
const { cache } = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * Response caching middleware
 * Caches GET request responses to improve performance
 * 
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.shouldCache - Function to determine if response should be cached
 * @returns {Function} Express middleware
 */
const responseCache = (options = {}) => {
  const ttl = options.ttl || parseInt(process.env.RESPONSE_CACHE_TTL || '300', 10);
  const enabled = process.env.RESPONSE_CACHE_ENABLED !== 'false';
  
  // Default key generator: method + path + query + user context
  const keyGenerator = options.keyGenerator || ((req) => {
    const userContext = req.user ? `${req.user.userId}:${req.user.churchId}` : 'anonymous';
    const queryString = req.query ? JSON.stringify(req.query) : '';
    const path = req.path || req.url.split('?')[0];
    const key = `${req.method}:${path}:${queryString}:${userContext}`;
    // Hash to keep keys short
    return crypto.createHash('md5').update(key).digest('hex');
  });
  
  // Default shouldCache: only cache successful GET requests
  const shouldCache = options.shouldCache || ((req, res) => {
    return req.method === 'GET' && res.statusCode === 200;
  });
  
  return (req, res, next) => {
    // Skip caching if disabled
    if (!enabled) {
      return next();
    }
    
    // Skip non-GET requests by default
    if (req.method !== 'GET') {
      return next();
    }
    
    // Check if bypass cache header is present
    if (req.headers['x-bypass-cache'] === 'true' || req.query.bypassCache === 'true') {
      return next();
    }
    
    // Generate cache key
    const cacheKey = `response:${keyGenerator(req)}`;
    
    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${req.method} ${req.path}`);
      res.setHeader('X-Cache', 'HIT');
      return res.status(cached.statusCode).json(cached.data);
    }
    
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to cache response
    res.json = function(data) {
      // Only cache if shouldCache returns true
      if (shouldCache(req, res)) {
        try {
          cache.set(cacheKey, {
            statusCode: res.statusCode,
            data: data
          }, ttl);
          res.setHeader('X-Cache', 'MISS');
        } catch (error) {
          logger.warn('Failed to cache response:', error.message);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Cache key pattern to match
 */
const clearCache = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  if (matchingKeys.length > 0) {
    cache.del(matchingKeys);
    logger.info(`Cleared ${matchingKeys.length} cache entries matching pattern: ${pattern}`);
  }
};

module.exports = {
  responseCache,
  clearCache
};

