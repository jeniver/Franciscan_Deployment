const logger = require('./logger');

/**
 * Performance monitoring middleware for API endpoints
 * Tracks request duration and logs slow requests
 */
const apiPerformanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const startHrTime = process.hrtime();

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to measure performance
  res.end = function (...args) {
    // Calculate duration
    const hrDuration = process.hrtime(startHrTime);
    const durationMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;

    // Log performance metrics for slow requests (> 1 second)
    if (durationMs > 1000) {
      logger.warn(`Slow request detected: ${req.method} ${req.path} took ${durationMs.toFixed(2)}ms`);
    }

    // Attach performance header
    res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);

    // Call original end function
    return originalEnd.apply(this, args);
  };

  next();
};

module.exports = {
  apiPerformanceMiddleware
};
