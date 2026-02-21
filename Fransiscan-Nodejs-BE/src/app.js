const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: __dirname + '/../.env' });

// App initialization

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler, asyncHandler, validateInput, rateLimit: customRateLimit } = require('./middleware/errorHandler');
const { responseCache } = require('./middleware/responseCache');
const { apiPerformanceMiddleware } = require('./utils/performanceMonitor');
const { connectDatabase } = require('./config/database');
const NicheApplicationService = require('./services/NicheApplicationService');

// Import routes
const authRoutes = require('./routes/auth');
const loginRoutes = require('./routes/login');
const userRoutes = require('./routes/users');
const churchRoutes = require('./routes/churches');
const invoiceRoutes = require('./routes/invoices');
const nicheRoutes = require('./routes/niches');
const personRoutes = require('./routes/persons');
const nicheAgreementRoutes = require('./routes/nicheAgreements');
const wakeRoomRoutes = require('./routes/wakeRooms');
const wakeRoomBookingRoutes = require('./routes/wakeRoomBookings');
const engraveApplicationRoutes = require('./routes/engraveApplications');
const nicheBookingRoutes = require('./routes/nicheBookings');
const nicheApplicationRoutes = require('./routes/nicheApplications');
const gatesOfLifeRoutes = require('./routes/gatesOfLife');
const inscriptionRoutes = require('./routes/inscriptions');
const inscriptionAgreementRoutes = require('./routes/inscriptionAgreements');
const receiptRoutes = require('./routes/receipts');
const receiptItemRoutes = require('./routes/receiptItems');
const itemRoutes = require('./routes/items');
const utilRoutes = require('./routes/utils');
const reportRoutes = require('./routes/reports');
const bibleChoicesRoutes = require('./routes/bibleChoices');
const globalSearchRoutes = require('./routes/globalSearch');

const app = express();
app.set('etag', 'weak');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Security middleware
app.use(helmet());

// CORS configuration - Enhanced for cross-origin requests
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3001',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma', 'Expires', 'X-Bypass-Cache'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
}));

// Cache control: allow brief browser caching for GET, prevent caching for mutations
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'private, max-age=30');
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// Rate limiting
const isRateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
if (isRateLimitEnabled) {
  const limiter = customRateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 1000,
    skip: (req) => {
      const ip = String(req.ip || req.connection?.remoteAddress || '').replace(/^::ffff:/, '');
      const pathName = req.path || '';
      // Keep health/static/options/local requests from consuming global API quota.
      return (
        req.method === 'OPTIONS' ||
        pathName === '/health' ||
        pathName === '/favicon.ico' ||
        pathName.startsWith('/public') ||
        pathName.startsWith('/pdfs') ||
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip === 'localhost'
      );
    }
  });
  app.use(limiter);
}

// Compression middleware
app.use(compression());

// Performance monitoring middleware
app.use(apiPerformanceMiddleware());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware - only patches res.end (json/send call end internally)
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS) || 70000;

app.use((req, res, next) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      req.timedOut = true;
      logger.warn(`Request timeout for ${req.method} ${req.path} after ${REQUEST_TIMEOUT_MS}ms`);
      res.status(504).json({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timeout - The server took too long to respond. Please try again.'
        }
      });
    }
  }, REQUEST_TIMEOUT_MS);

  const originalEnd = res.end;
  res.end = function (...args) {
    clearTimeout(timeoutId);
    return originalEnd.apply(this, args);
  };

  next();
});

// Static assets (PDFs, public files)
const publicDir = path.join(process.cwd(), 'public');
const staticMaxAge = process.env.STATIC_MAX_AGE || '1h';
app.use('/public', express.static(publicDir, { maxAge: staticMaxAge }));
app.use('/pdfs', express.static(path.join(publicDir, 'pdfs'), {
  maxAge: staticMaxAge,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Favicon handler to prevent unnecessary 404/500 errors in logs
// Browsers often request /favicon.ico automatically; we return 204 (No Content)
// so it does not go through the 404/error middleware chain.
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const { healthCheck } = require('./config/database');

  try {
    const dbHealthy = await healthCheck();

    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      database: {
        connected: dbHealthy,
        status: dbHealthy ? 'healthy' : 'unhealthy'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      database: {
        connected: false,
        status: 'error',
        error: error.message
      }
    });
  }
});

// Response caching middleware for GET requests (can be disabled per route)
// Apply to read-only endpoints for better performance
const cacheMiddleware = responseCache({
  ttl: parseInt(process.env.RESPONSE_CACHE_TTL || '300', 10), // 5 minutes default
  shouldCache: (req, res) => {
    // Only cache successful GET requests
    // Skip caching for authenticated endpoints that need fresh data
    const skipCachePaths = [
      '/api/auth',
      '/api/login',
      '/api/utils/cache-stats'
    ];
    return req.method === 'GET' &&
      res.statusCode === 200 &&
      !skipCachePaths.some(path => req.path.startsWith(path));
  }
});

// API routes with optional caching
// Note: Routes can bypass cache by setting X-Bypass-Cache header or bypassCache query param
app.use('/api/auth', authRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/users', cacheMiddleware, userRoutes);
app.use('/api/churches', cacheMiddleware, churchRoutes);
app.use('/api/invoices', invoiceRoutes); // POST/PUT operations, no cache
app.use('/api/niches', cacheMiddleware, nicheRoutes);
app.use('/api/gates-of-life', cacheMiddleware, gatesOfLifeRoutes);
// Inscription APIs (INCR) - mounted under both /api/inscriptions and /inscriptions for backward compatibility
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/inscriptions', inscriptionRoutes);
// Inscription Agreement APIs
app.use('/api/inscription-agreements', inscriptionAgreementRoutes);
app.use('/inscription-agreements', inscriptionAgreementRoutes); // Backward compatibility
app.use('/api/persons', cacheMiddleware, personRoutes);
app.use('/api/niche-agreements', cacheMiddleware, nicheAgreementRoutes);
// Niche Agreements - mounted under both /api/niche-agreements and /niche-agreements for backward compatibility
app.use('/niche-agreements', cacheMiddleware, nicheAgreementRoutes);
app.use('/api/wake-rooms', cacheMiddleware, wakeRoomRoutes);
app.use('/api/wake-room-bookings', wakeRoomBookingRoutes); // POST/PUT operations
app.use('/api/engrave-applications', engraveApplicationRoutes); // POST/PUT operations
app.use('/api/niche-bookings', nicheBookingRoutes); // POST/PUT operations
app.use('/api/niche-applications', cacheMiddleware, nicheApplicationRoutes);
// Niche Applications - mounted under both /api/niche-applications and /niche-applications for backward compatibility
app.use('/niche-applications', cacheMiddleware, nicheApplicationRoutes);
// Also add singular form to handle common typo
app.use('/niche-application', cacheMiddleware, nicheApplicationRoutes);
app.use('/api/receipts', receiptRoutes); // POST/PUT operations
app.use('/api', receiptItemRoutes); // POST/PUT operations
app.use('/api/items', itemRoutes); // Cache removed to prevent stale data after item CRUD operations
app.use('/api/utils', utilRoutes);
app.use('/api/reports', cacheMiddleware, reportRoutes);
// Bible Choices APIs - mounted under both /api/bible-choices and /bible-choices for backward compatibility
app.use('/api/bible-choices', cacheMiddleware, bibleChoicesRoutes);
app.use('/bible-choices', cacheMiddleware, bibleChoicesRoutes);
// Global Search APIs
app.use('/api/search', globalSearchRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Franciscan Backend API',
    version: process.env.APP_VERSION || '1.0.0',
    description: process.env.APP_DESCRIPTION || 'Production-ready Node.js backend for Franciscan application',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      login: '/api/login',
      users: '/api/users',
      churches: '/api/churches',
      invoices: '/api/invoices',
      niches: '/api/niches',
      persons: '/api/persons',
      nicheAgreements: '/api/niche-agreements',
      wakeRooms: '/api/wake-rooms',
      engraveApplications: '/api/engrave-applications',
      nicheBookings: '/api/niche-bookings',
      nicheApplications: '/api/niche-applications',
      inscriptions: '/api/inscriptions',
      inscriptionAgreements: '/api/inscription-agreements',
      receipts: '/api/receipts',
      utils: '/api/utils',
      reports: '/api/reports',
      globalSearch: '/api/search/global',
      autocomplete: '/api/search/autocomplete',
      availableNiches: '/api/search/niches/available'
    }
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Try to connect to database (optional for development)
    try {
      await connectDatabase();
      logger.info('Database connected successfully');

      // Warm cache with common queries for improved performance (optional)
      // Only warm if explicitly enabled via environment variable
      const enableCacheWarming = process.env.ENABLE_CACHE_WARMING === 'true';
      const cacheWarmingChurchIds = process.env.CACHE_WARMING_CHURCH_IDS
        ? process.env.CACHE_WARMING_CHURCH_IDS.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : [];

      if (enableCacheWarming && cacheWarmingChurchIds.length > 0) {
        logger.info(`Cache warming enabled for church IDs: ${cacheWarmingChurchIds.join(', ')}`);
        // Warm cache asynchronously without blocking server startup
        Promise.resolve().then(async () => {
          try {
            const warmResults = await NicheApplicationService.warmCache(cacheWarmingChurchIds);
            logger.info(`Cache warming completed: ${warmResults.warmed} queries warmed, ${warmResults.failed} failed`);
          } catch (warmError) {
            logger.warn('Cache warming failed (non-critical):', warmError.message);
          }
        }).catch(error => {
          logger.warn('Cache warming error (non-critical):', error.message);
        });
      }
    } catch (dbError) {
      logger.warn('Database connection failed, starting server without database:', dbError.message);
      logger.warn('Some API endpoints may not work without database connection');
    }

    // Start the server
    app.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info('API endpoints available at:');
      logger.info('  GET  /health - Health check');
      logger.info('  GET  / - API information');
      logger.info('  POST /api/auth/login - User login');
      logger.info('  POST /api/auth/register - User registration');
      logger.info('  GET  /api/inscription-agreements/:inscriptionCode - Get inscription agreement details');
      logger.info('  GET  /api/inscription-agreements/:inscriptionCode/reports - Get Crystal Reports info');
      logger.info('  GET  /api/inscription-agreements/:inscriptionCode/pdf - Get PDF data for frontend generation');
      logger.info('  GET  /api/inscription-agreements/:inscriptionCode/validate - Validate agreement for generation');
      logger.info('  GET  /api/inscription-agreements/:inscriptionCode/template/:format - Get template data for specific format');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

module.exports = app;
