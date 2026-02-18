const sql = require('mssql');
const logger = require('../utils/logger');

// Load environment variables
require('dotenv').config({ path: __dirname + '/../../.env' });

// SQL Server configuration
// Determine if we're using Windows Authentication or SQL Server Authentication
const useWindowsAuth = !process.env.DB_PASSWORD || process.env.DB_PASSWORD === '';

// Get configuration from environment
const server = process.env.DB_SERVER || 'localhost';
const instance = process.env.DB_INSTANCE || '';
const database = process.env.DB_DATABASE || 'FransiscanTest';
const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433;

// Build server string - handle named instances properly
// Named instances can be in format: .\SQLEXPRESS, localhost\SQLEXPRESS, or just SQLEXPRESS
let serverString = server;
if (instance && instance !== '') {
  // If instance is provided separately, combine with server
  serverString = server.includes('\\') ? server : `${server}\\${instance}`;
} else if (server.includes('\\')) {
  // Server already contains instance (e.g., .\SQLEXPRESS or localhost\SQLEXPRESS)
  serverString = server;
} else {
  // No instance, use server as-is
  serverString = server;
}

// Normalize server string: convert .\INSTANCE to localhost\INSTANCE for Node.js drivers
// The .\ format works in SSMS but Node.js drivers need localhost\INSTANCE
if (serverString.startsWith('.\\')) {
  serverString = 'localhost' + serverString.substring(1); // Replace .\ with localhost\
  logger.info(`Normalized server string: ${server} -> ${serverString}`);
} else if (serverString.startsWith('.') && !serverString.includes('\\')) {
  // Handle edge case where server is just '.' without instance
  serverString = 'localhost';
  logger.info(`Normalized server string: ${server} -> ${serverString}`);
}

let config;

// Helper to ensure timeout is at least 60 seconds
const getTimeout = (envVar, defaultVal = 60000) => {
  const val = parseInt(envVar);
  return (isNaN(val) || val < 60000) ? 60000 : val;
};

const connectionTimeout = getTimeout(process.env.DB_CONNECTION_TIMEOUT);
const requestTimeout = getTimeout(process.env.DB_REQUEST_TIMEOUT);
const cancelTimeout = getTimeout(process.env.DB_CANCEL_TIMEOUT, 180000); // 180s default 
const poolIdleTimeout = parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000;

if (useWindowsAuth) {
  // Windows Authentication with msnodesqlv8 driver
  logger.info('Using Windows Authentication with msnodesqlv8 driver');

  // Build connection string for Windows Authentication
  // Note: Connection timeout in connection string is in seconds
  // For named instances, ensure proper format (e.g., .\SQLEXPRESS or localhost\SQLEXPRESS)
  const connectionTimeoutSeconds = Math.ceil(connectionTimeout / 1000);
  
  // For Windows Auth with msnodesqlv8, if port is specified, use server,port format
  // This bypasses SQL Server Browser and is more reliable
  const hasExplicitPort = process.env.DB_PORT && process.env.DB_PORT !== '';
  const serverHost = serverString.includes('\\') ? serverString.split('\\')[0] : serverString;
  
  let connectionServerString;
  if (hasExplicitPort) {
    // Use server,port format - this is the most reliable for msnodesqlv8
    connectionServerString = `${serverHost},${process.env.DB_PORT}`;
    logger.info(`Using explicit port ${process.env.DB_PORT} (bypasses SQL Server Browser)`);
  } else {
    // Use instance name format (requires SQL Server Browser)
    connectionServerString = serverString;
    if (serverString.includes('\\')) {
      logger.warn('⚠️  Named instance without explicit port - SQL Server Browser must be running');
      logger.warn('💡 Set DB_PORT in .env to bypass SQL Server Browser');
    }
  }
  
  const connectionString = `Server=${connectionServerString};Database=${database};Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server};Connection Timeout=${connectionTimeoutSeconds};`;

  config = {
    server: hasExplicitPort ? serverHost : serverString,
    port: hasExplicitPort ? parseInt(process.env.DB_PORT) : undefined,
    database,
    driver: 'msnodesqlv8',
    connectionString,
    options: {
      trustedConnection: true,
      enableArithAbort: true,
      encrypt: false,
      trustServerCertificate: true,
      connectionTimeout: connectionTimeout, 
      requestTimeout: requestTimeout,
      cancelTimeout: cancelTimeout, 
      useUTC: false
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idleTimeoutMillis: poolIdleTimeout,
      acquireTimeoutMillis: connectionTimeout 
    }
  };
  
  // Log connection details for debugging
  logger.info('Windows Auth connection config:', {
    serverString,
    connectionServerString,
    serverHost,
    database,
    usingPort: hasExplicitPort,
    port: hasExplicitPort ? process.env.DB_PORT : 'dynamic (SQL Server Browser)',
    connectionTimeout: connectionTimeoutSeconds
  });
  } else {
  // SQL Server Authentication with tedious driver
  logger.info('Using SQL Server Authentication with tedious driver');

  // Validate that DB_USER is set when using SQL Auth
  if (!process.env.DB_USER || process.env.DB_USER.trim() === '') {
    logger.error('❌ DB_USER is required when using SQL Server Authentication (DB_PASSWORD is set)');
    logger.error('💡 Either set DB_USER in .env file or remove DB_PASSWORD to use Windows Authentication');
    throw new Error('DB_USER is required for SQL Server Authentication');
  }

  // For named instances with tedious driver, we need to separate server and instance
  // Named instances can be in format: localhost\SQLEXPRESS, .\SQLEXPRESS, or server\instance
  let serverHost = server;
  let instanceName = instance;
  let useNamedInstance = false;
  
  // Check if server contains instance name (e.g., localhost\SQLEXPRESS)
  if (server.includes('\\')) {
    const parts = server.split('\\');
    serverHost = parts[0] === '.' || parts[0] === '' ? 'localhost' : parts[0];
    instanceName = parts[1] || instance;
    useNamedInstance = !!instanceName;
  } else if (server === '.' || server === '') {
    serverHost = 'localhost';
  } else if (instance && instance !== '') {
    instanceName = instance;
    useNamedInstance = true;
  }

  // Check if a specific port is provided - if so, don't use instanceName
  // This allows bypassing SQL Server Browser when port is known
  const hasExplicitPort = process.env.DB_PORT && process.env.DB_PORT !== '1433';
  
  if (useNamedInstance && !hasExplicitPort) {
    // For named instances without explicit port, use instanceName (requires SQL Server Browser)
    // CRITICAL: Do NOT include 'port' property when using instanceName
    // The tedious driver will query SQL Server Browser on UDP 1434 to get the TCP port
    config = {
      server: serverHost,
      // port is intentionally omitted - tedious will use SQL Server Browser
      database,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      driver: 'tedious', // Explicitly set driver for SQL Auth
      options: {
        instanceName: instanceName,
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true,
        connectionTimeout: Math.max(connectionTimeout, 30000), // At least 30s for Browser query
        requestTimeout: requestTimeout,
        cancelTimeout: cancelTimeout,
        useUTC: false,
        rowCollectionOnDone: true,
        rowCollectionOnRequestCompletion: true
      },
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        idleTimeoutMillis: poolIdleTimeout,
        acquireTimeoutMillis: connectionTimeout
      }
    };
    
    // CRITICAL SAFEGUARD: Ensure port is never set when using instanceName
    // The tedious driver will fail if both port and instanceName are set
    if ('port' in config) {
      logger.error('⚠️  CONFIGURATION ERROR: Port property found when using instanceName!');
      logger.error('⚠️  Removing port property - instanceName requires SQL Server Browser');
      delete config.port;
    }
    
    logger.info('Named instance detected - using instanceName option (SQL Server Browser required)');
    logger.info(`Config: server=${config.server}, instanceName=${config.options.instanceName}, port=${config.port !== undefined ? config.port : 'OMITTED (correct)'}, user=${config.user}`);
    logger.warn('⚠️  If connection fails with ~15-20s timeout, SQL Server Browser service is not running');
    logger.warn('💡 Solution 1: Start SQL Server Browser: sc start SQLBrowser (as Administrator)');
    logger.warn('💡 Solution 2: Find port and set DB_PORT in .env (bypasses Browser)');
    logger.warn('💡 Solution 3: Switch to Windows Auth (remove DB_PASSWORD from .env)');
  } else {
    // For default instance OR named instance with explicit port, use port directly
    config = {
      server: serverHost,
      port: hasExplicitPort ? parseInt(process.env.DB_PORT) : port,
      database,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      driver: 'tedious', // Explicitly set driver for SQL Auth
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true,
        connectionTimeout: connectionTimeout,
        requestTimeout: requestTimeout,
        cancelTimeout: cancelTimeout,
        useUTC: false,
        rowCollectionOnDone: true,
        rowCollectionOnRequestCompletion: true
      },
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        idleTimeoutMillis: poolIdleTimeout,
        acquireTimeoutMillis: connectionTimeout
      }
    };
    
    if (useNamedInstance && hasExplicitPort) {
      logger.info(`Named instance with explicit port: ${serverHost}:${config.port} (bypassing SQL Server Browser), user=${config.user}`);
    } else {
      logger.info(`Default instance connection: ${serverHost}:${config.port}, user=${config.user}`);
    }
  }
  
  // Log connection details for debugging
  logger.info('SQL Auth connection config:', {
    serverHost,
    instanceName: useNamedInstance && !hasExplicitPort ? instanceName : 'N/A',
    database,
    port: config.port || 'dynamic (via SQL Server Browser)',
    hasInstance: useNamedInstance,
    usingBrowser: useNamedInstance && !hasExplicitPort,
    user: process.env.DB_USER // Log user for debugging (password is never logged)
  });
}

// Log configuration (without sensitive data)
const logConfig = {
  server: useWindowsAuth ? serverString : (config.server + (config.options.instanceName ? '\\' + config.options.instanceName : '')),
  database,
  driver: config.driver || 'tedious',
  authentication: useWindowsAuth ? 'Windows' : 'SQL Server',
  port: config.port || (config.options.instanceName ? 'dynamic (SQL Server Browser)' : port),
  options: {
    connectionTimeout: config.options.connectionTimeout,
    requestTimeout: config.options.requestTimeout,
    cancelTimeout: config.options.cancelTimeout,
    encrypt: config.options.encrypt,
    instanceName: config.options.instanceName || undefined
  },
  pool: {
    max: config.pool.max,
    min: config.pool.min,
    acquireTimeoutMillis: config.pool.acquireTimeoutMillis
  }
};

logger.info('Database configuration applied:', logConfig);

let pool = null;
let isConnecting = false;
let connectionRetries = 0;
let connectionPromise = null;
const MAX_RETRIES = 5;
const CONNECTION_VALIDATION_INTERVAL = 300000; // 5 minutes
let lastValidationTime = 0;

/**
 * Validate if the connection pool is actually working
 * @returns {Promise<boolean>} True if connection is valid
 */
const validateConnection = async (connectionPool) => {
  try {
    if (!connectionPool) {
      return false;
    }

    // Try a simple query to validate the connection
    const request = connectionPool.request();
    const result = await Promise.race([
      request.query('SELECT 1 AS test'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection validation timeout')), 5000)
      )
    ]);
    
    return result && result.recordset && result.recordset.length > 0;
  } catch (error) {
    logger.warn('Connection validation failed:', error.message);
    return false;
  }
};

/**
 * Setup connection pool event handlers
 */
const setupPoolEventHandlers = (connectionPool) => {
  if (!connectionPool) return;

  connectionPool.on('error', err => {
    logger.error('Database pool error:', {
      message: err.message,
      code: err.code,
      name: err.name
    });
    
    // Mark pool as invalid on connection errors
    if (err.code === 'ECONNRESET' || 
        err.code === 'ETIMEDOUT' || 
        err.code === 'ETIMEOUT' ||
        err.code === 'ESOCKET' ||
        err.code === 'ENOTFOUND' ||
        err.message?.includes('Connection is closed')) {
      logger.warn('Connection lost, will attempt to reconnect on next request');
      pool = null;
      lastValidationTime = 0;
    }
  });

  connectionPool.on('connect', () => {
    logger.info('New connection established to database');
    connectionRetries = 0;
    lastValidationTime = Date.now();
  });

  connectionPool.on('close', () => {
    logger.info('Connection to database closed');
    pool = null;
    lastValidationTime = 0;
  });
};

/**
 * Connect to SQL Server database with retry logic
 */
const connectDatabase = async(retryCount = 0) => {
  // If already connecting, wait for that connection attempt (but with timeout)
  if (isConnecting && connectionPromise) {
    try {
      // Wait for existing connection attempt with a timeout
      const existingConnectionTimeout = config.options.connectionTimeout || 60000;
      return await Promise.race([
        connectionPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Previous connection attempt timed out')), existingConnectionTimeout + 5000)
        )
      ]);
    } catch (error) {
      // If the waiting connection failed or timed out, reset state and continue with new attempt
      logger.warn('Previous connection attempt failed or timed out, starting new attempt:', error.message);
      isConnecting = false;
      connectionPromise = null;
      // Continue to new connection attempt below
    }
  }

  // If pool exists and was recently validated, return it
  const now = Date.now();
  if (pool && (now - lastValidationTime) < CONNECTION_VALIDATION_INTERVAL) {
    // Quick validation check
    try {
      const isValid = await validateConnection(pool);
      if (isValid) {
        return pool;
      }
    } catch (error) {
      logger.warn('Quick validation failed, reconnecting...');
      pool = null;
    }
  }

  isConnecting = true;
  connectionPromise = (async () => {
    try {
      logger.info(`Connecting to database... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

      // Close existing pool if any
      if (pool) {
        try {
          await pool.close();
        } catch (e) {
          logger.warn('Error closing existing pool:', e.message);
        }
        pool = null;
      }

      // Create new connection with timeout wrapper to ensure it respects our timeout
      // The sql.connect() has internal timeouts, so we wrap it to ensure proper timeout handling
      const timeoutMs = config.options.connectionTimeout || 60000;
      let timeoutId = null;
      let connectionResolved = false;
      
      const connectPromise = sql.connect(config).then(result => {
        connectionResolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        return result;
      }).catch(error => {
        connectionResolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        throw error;
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!connectionResolved) {
            connectionResolved = true;
            reject(new Error(`Connection timeout after ${timeoutMs}ms - SQL Server may not be accessible at ${serverString}`));
          }
        }, timeoutMs);
      });
      
      try {
        pool = await Promise.race([connectPromise, timeoutPromise]);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } catch (raceError) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Check if it's our timeout or the connection error
        if (raceError.message && raceError.message.includes('Connection timeout after')) {
          throw raceError;
        }
        // Otherwise it's a connection error from sql.connect()
        throw raceError;
      }
      
      setupPoolEventHandlers(pool);

      // Validate the connection immediately
      const isValid = await validateConnection(pool);
      if (!isValid) {
        throw new Error('Connection established but validation failed');
      }

      lastValidationTime = Date.now();
      logger.info('✅ Connected to SQL Server database successfully');
      connectionRetries = 0;
      
      return pool;
    } catch (error) {
      pool = null;
      lastValidationTime = 0;
      throw error;
    }
  })();

  try {
    const result = await connectionPromise;
    isConnecting = false;
    connectionPromise = null;
    return result;
  } catch (error) {
    // Always reset connection state on error
    isConnecting = false;
    connectionPromise = null;
    pool = null;
    lastValidationTime = 0;
    
    // Enhanced error logging with diagnostic information
    // Use actual config port, not the default port variable
    const actualPort = config.port !== undefined ? config.port : (config.options?.instanceName ? 'dynamic (via SQL Server Browser)' : (port || 1433));
    const errorDetails = {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN',
      name: error.name || 'Error',
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRIES + 1,
      server: serverString,
      database: database,
      port: actualPort,
      driver: config.driver || 'unknown',
      configHasPort: 'port' in config,
      configHasInstanceName: !!(config.options?.instanceName),
      authentication: useWindowsAuth ? 'Windows Authentication' : 'SQL Server Authentication',
      user: useWindowsAuth ? '(Windows user)' : (config.user || process.env.DB_USER || 'NOT SET')
    };

    // Handle ELOGIN errors (authentication failures) specifically
    if (error.code === 'ELOGIN' || error.message?.includes('Login failed') || error.message?.includes('authentication failed')) {
      const attemptedUser = useWindowsAuth ? '(Windows user)' : (config.user || process.env.DB_USER || 'NOT SET');
      const diagnostic = {
        errorType: 'Authentication Failure (ELOGIN)',
        attemptedUser: attemptedUser,
        possibleCauses: [
          `SQL Server user '${attemptedUser}' does not exist`,
          `Password for user '${attemptedUser}' is incorrect`,
          `User '${attemptedUser}' does not have permission to access database '${database}'`,
          'SQL Server authentication mode is not configured correctly'
        ],
        solutions: []
      };

      if (useWindowsAuth) {
        diagnostic.solutions = [
          'Verify your Windows user has SQL Server access',
          'Check SQL Server allows Windows Authentication',
          'Ensure SQL Server is configured for Mixed Mode or Windows Authentication',
          'Try switching to SQL Server Authentication: Set DB_USER and DB_PASSWORD in .env'
        ];
        diagnostic.checkAuth = 'Verify SQL Server authentication mode: Windows Auth or Mixed Mode';
      } else {
        diagnostic.solutions = [
          `Verify user '${attemptedUser}' exists in SQL Server: SELECT name FROM sys.sql_logins WHERE name = '${attemptedUser}'`,
          `Check password is correct for user '${attemptedUser}'`,
          `Grant database access: USE [${database}]; CREATE USER [${attemptedUser}] FOR LOGIN [${attemptedUser}]; ALTER ROLE db_datareader ADD MEMBER [${attemptedUser}]; ALTER ROLE db_datawriter ADD MEMBER [${attemptedUser}];`,
          'Or create the user if it does not exist: CREATE LOGIN [franciscan_api] WITH PASSWORD = \'YourPassword\';',
          'Or switch to Windows Authentication: Remove DB_PASSWORD from .env file'
        ];
        diagnostic.checkUser = `Verify user exists: sqlcmd -S ${serverString} -Q "SELECT name FROM sys.sql_logins WHERE name = '${attemptedUser}'"`;
        diagnostic.checkDatabaseAccess = `Verify user has database access: sqlcmd -S ${serverString} -d ${database} -Q "SELECT dp.name FROM sys.database_principals dp WHERE dp.name = '${attemptedUser}'"`;
      }

      errorDetails.diagnostic = diagnostic;
      // Log ELOGIN errors with specific message
      logger.error(`❌ Authentication failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, errorDetails);
      // Skip the general error logging below for ELOGIN errors since we already logged it
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEOUT' || error.message?.includes('Could not connect')) {
      // Add additional context for connection errors
      const isNamedInstance = !useWindowsAuth && config.options?.instanceName;
      const timeoutMatch = error.message?.match(/(\d+)ms/);
      const timeoutMs = timeoutMatch ? parseInt(timeoutMatch[1]) : null;
      const isBrowserTimeout = timeoutMs && timeoutMs >= 14000 && timeoutMs <= 20000; // 15-20s is typical Browser timeout
      
      const diagnostic = {
        possibleCauses: [
          'SQL Server is not running',
          'SQL Server is not accessible on the specified host/port',
          'Firewall is blocking the connection',
          'Network connectivity issues',
          'SQL Server service is not started'
        ]
      };
      
      if (isNamedInstance || (serverString.includes('\\') && !useWindowsAuth)) {
        diagnostic.possibleCauses.push('SQL Server Browser service is not running (required for named instances)');
        diagnostic.solutions = [
          'Start SQL Server Browser service: sc start SQLBrowser (run as Administrator)',
          'Or use Services.msc: Find "SQL Server Browser" and start it',
          'Or find the instance port and set DB_PORT in .env file (bypasses Browser)',
          'Or switch to Windows Authentication: Remove DB_PASSWORD from .env'
        ];
        diagnostic.checkServer = `Named instance detected: ${serverString}`;
        diagnostic.checkBrowser = 'Verify SQL Server Browser service is running: sc query SQLBrowser';
        
        if (isBrowserTimeout) {
          diagnostic.note = `The ${timeoutMs}ms timeout indicates SQL Server Browser query failed. Browser service must be running for named instances.`;
        }
      } else {
        diagnostic.checkServer = `Verify SQL Server is running and accessible at ${serverString}:${port || 1433}`;
      }
      
      errorDetails.diagnostic = diagnostic;
    }

    // Log error (skip if already logged for ELOGIN)
    if (error.code !== 'ELOGIN' && !error.message?.includes('Login failed') && !error.message?.includes('authentication failed')) {
      logger.error(`❌ Database connection failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, errorDetails);
    }

    // Retry with exponential backoff and jitter
    if (retryCount < MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 10s (capped at 10s)
      const baseDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      // Add jitter (0-500ms) to prevent thundering herd
      const jitter = Math.floor(Math.random() * 500);
      const delay = baseDelay + jitter;
      
      logger.info(`Retrying connection in ${delay}ms (${baseDelay}ms base + ${jitter}ms jitter)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Recursive retry with incremented counter
      return connectDatabase(retryCount + 1);
    }

    // After all retries failed, provide comprehensive error message
    const finalError = new Error(
      `Failed to connect to SQL Server after ${MAX_RETRIES + 1} attempts. ` +
      `Server: ${serverString}, Database: ${database}, Port: ${port || 1433}. ` +
      `Last error: ${error.message || 'Unknown error'} (${error.code || 'UNKNOWN'}). ` +
      `Please verify SQL Server is running and accessible.`
    );
    finalError.code = error.code || 'ECONNFAILED';
    finalError.originalError = error;
    finalError.attempts = MAX_RETRIES + 1;
    finalError.server = serverString;
    finalError.database = database;
    
    throw finalError;
  }
};

/**
 * Get database connection pool with auto-reconnect and validation
 * Ensures pool is always available or throws error
 */
const getPool = async() => {
  // If connection is in progress, wait for it (with timeout protection)
  if (isConnecting && connectionPromise) {
    try {
      const waitTimeout = config.options.connectionTimeout || 60000;
      await Promise.race([
        connectionPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection wait timeout')), waitTimeout + 5000)
        )
      ]);
    } catch (error) {
      // Connection failed or timed out, reset state and try to reconnect below
      logger.warn('Waiting connection failed or timed out, will reconnect:', error.message);
      isConnecting = false;
      connectionPromise = null;
      pool = null;
      lastValidationTime = 0;
    }
  }

  try {
    // Check if pool exists and is valid
    if (pool) {
      const now = Date.now();
      // If validation is recent, do quick sanity check
      if ((now - lastValidationTime) < CONNECTION_VALIDATION_INTERVAL) {
        try {
          if (pool.connected !== false) {
            return pool;
          }
        } catch (e) {
          // Pool might be invalid, continue to validation
          logger.warn('Pool appears invalid, revalidating...');
          pool = null;
          lastValidationTime = 0;
        }
      }
      
      // Otherwise validate it
      if (pool) {
        const isValid = await validateConnection(pool);
        if (isValid) {
          lastValidationTime = Date.now();
          return pool;
        }
        
        // Pool is invalid, reset it
        logger.warn('Pool validation failed, reconnecting...');
        pool = null;
        lastValidationTime = 0;
      }
    }

    // Reconnect if pool doesn't exist or is invalid
    // Ensure we get a valid pool
    await connectDatabase();
    
    // Double-check pool is available
    if (!pool) {
      // Wait a bit and retry once more
      logger.warn('Pool not available after first connection attempt, retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await connectDatabase();
      
      if (!pool) {
        const error = new Error(
          `Failed to establish database connection after retries. ` +
          `Server: ${serverString}, Database: ${database}, Port: ${port || 1433}. ` +
          `Please verify SQL Server is running and accessible.`
        );
        error.code = 'ECONNFAILED';
        throw error;
      }
    }
    
    return pool;
  } catch (error) {
    logger.error('Failed to get database pool:', {
      message: error.message,
      code: error.code,
      server: serverString,
      database: database,
      port: port || 1433
    });
    
    // Try one more time with delay (last resort)
    try {
      logger.info('Attempting final retry to get database pool...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await connectDatabase();
      
      if (!pool) {
        const finalError = new Error(
          `Database connection pool is not available after multiple retry attempts. ` +
          `Server: ${serverString}, Database: ${database}, Port: ${port || 1433}. ` +
          `Original error: ${error.message}. ` +
          `Please verify SQL Server is running and accessible.`
        );
        finalError.code = error.code || 'ECONNFAILED';
        finalError.originalError = error;
        throw finalError;
      }
      
      return pool;
    } catch (retryError) {
      logger.error('Final retry connection also failed:', {
        message: retryError.message,
        code: retryError.code,
        originalError: error.message
      });
      
      const finalError = new Error(
        `Database connection pool is not available. ` +
        `Server: ${serverString}, Database: ${database}, Port: ${port || 1433}. ` +
        `Last error: ${retryError.message || error.message}. ` +
        `Please check: 1) SQL Server is running, 2) SQL Server is accessible at ${serverString}:${port || 1433}, ` +
        `3) Firewall allows connections, 4) Connection string is correct.`
      );
      finalError.code = retryError.code || error.code || 'ECONNFAILED';
      finalError.originalError = retryError;
      throw finalError;
    }
  }
};

/**
 * Execute a SQL query with retry logic and timeout handling
 * @param {string} query - SQL query string
 * @param {Object} params - Query parameters
 * @param {Object} options - Query options (timeout, etc.)
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Query result
 */
const executeQuery = async(query, params = {}, options = {}, retryCount = 0) => {
  try {
    const connectionPool = await getPool();
    
    if (!connectionPool) {
      throw new Error('Database connection pool is not available');
    }

    const request = connectionPool.request();

    // Add parameters to request with proper SQL types for better performance
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else if (value instanceof Date) {
        request.input(key, sql.DateTime, value);
      } else if (typeof value === 'number') {
        // Use Int for integers, Decimal for decimals
        if (Number.isInteger(value)) {
          request.input(key, sql.Int, value);
        } else {
          request.input(key, sql.Decimal(18, 2), value);
        }
      } else if (typeof value === 'boolean') {
        request.input(key, sql.Bit, value);
      } else {
        request.input(key, sql.NVarChar, String(value));
      }
    });

    // Set request timeout - use both properties for compatibility
    if (options.timeout) {
      // For mssql, timeout is set on the request object
      request.timeout = options.timeout;
      // Also set requestTimeout for backward compatibility
      if (request.requestTimeout !== undefined) {
        request.requestTimeout = options.timeout;
      }
    }

    const result = await request.query(query);
    return result;
  } catch (error) {
    // Distinguish between connection establishment errors and query timeout errors
    // Connection errors: pool unavailable, can't connect to database
    // Query timeout errors: pool exists, but query execution is slow
    const isConnectionEstablishmentError = 
      error.code === 'ECONNRESET' ||
      error.code === 'ESOCKET' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('Connection is closed') ||
      error.message?.includes('ConnectionError') ||
      error.message?.includes('Failed to connect') ||
      error.message?.includes('Database connection pool is not available') ||
      (error.code === 'ETIMEOUT' && error.message?.includes('Failed to connect'));

    const isQueryTimeoutError = 
      (error.code === 'ETIMEOUT' || error.code === 'ETIMEDOUT') &&
      !error.message?.includes('Failed to connect') &&
      !error.message?.includes('Connection') &&
      (error.message?.includes('timeout') || error.message?.includes('Timeout') || error.message?.includes('Failed to cancel request'));

    logger.error('Query execution failed:', {
      error: error.message,
      code: error.code,
      name: error.name,
      retryCount,
      isConnectionEstablishmentError,
      isQueryTimeoutError,
      query: query.substring(0, 100) + '...' // Log first 100 chars for debugging
    });

    // Retry on connection establishment errors (including connection timeouts)
    // These indicate the pool is unavailable or connection can't be established
    if (isConnectionEstablishmentError && retryCount < 2) {
      logger.info(`Retrying query due to connection error (attempt ${retryCount + 2}/3)...`);
      // Force reconnection on connection establishment errors
      pool = null;
      lastValidationTime = 0;
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return executeQuery(query, params, options, retryCount + 1);
    }

    // For query timeout errors, don't retry but provide better error context
    // These indicate the query is slow, not that the connection is broken
    if (isQueryTimeoutError) {
      const timeoutError = new Error(`Query timeout: ${error.message}`);
      timeoutError.code = error.code || 'ETIMEOUT';
      timeoutError.originalError = error;
      throw timeoutError;
    }

    throw error;
  }
};

/**
 * Execute a stored procedure with retry logic
 * @param {string} procedureName - Name of the stored procedure
 * @param {Object} params - Procedure parameters
 * @param {Object} options - Procedure options (timeout, etc.)
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Procedure result
 */
const executeProcedure = async(procedureName, params = {}, options = {}, retryCount = 0) => {
  try {
    const connectionPool = await getPool();
    
    if (!connectionPool) {
      throw new Error('Database connection pool is not available');
    }

    const request = connectionPool.request();

    // Add parameters to request with proper SQL types
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else if (value instanceof Date) {
        request.input(key, sql.DateTime, value);
      } else if (typeof value === 'number') {
        // Use Int for integers, Decimal for decimals
        if (Number.isInteger(value)) {
          request.input(key, sql.Int, value);
        } else {
          request.input(key, sql.Decimal(18, 2), value);
        }
      } else if (typeof value === 'boolean') {
        request.input(key, sql.Bit, value);
      } else {
        request.input(key, sql.NVarChar, String(value));
      }
    });

    // Set request timeout - use both properties for compatibility
    // CRITICAL: For long-running stored procedures, the cancelTimeout must be >= request timeout
    // Otherwise, when a request times out, the cancel operation itself will timeout.
    // The cancelTimeout is set at pool level (30s by default), so if request timeout > 30s,
    // we must ensure cancelTimeout is increased OR use a wrapper timeout.
    
    // For now, we'll cap the request timeout at cancelTimeout to prevent cancel timeout errors
    // If a procedure needs longer, increase DB_CANCEL_TIMEOUT in environment variables
    const cancelTimeout = config.options.cancelTimeout || 180000;
    // Allow request timeout to be up to cancelTimeout (they should match for stored procedures)
    const effectiveTimeout = options.timeout || undefined;
    
    // If requested timeout exceeds cancelTimeout, log a warning
    if (options.timeout && options.timeout > cancelTimeout) {
      logger.warn(
        `Stored procedure ${procedureName} requested timeout (${options.timeout}ms) exceeds cancelTimeout (${cancelTimeout}ms). ` +
        `Using effective timeout of ${effectiveTimeout}ms. ` +
        `To support longer timeouts, increase DB_CANCEL_TIMEOUT environment variable.`
      );
    }
    
    if (effectiveTimeout) {
      // For mssql, timeout is set on the request object
      request.timeout = effectiveTimeout;
      // Also set requestTimeout for backward compatibility
      if (request.requestTimeout !== undefined) {
        request.requestTimeout = effectiveTimeout;
      }
    }

    const result = await request.execute(procedureName);
    return result;
  } catch (error) {
    const isConnectionError = 
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ETIMEOUT' ||
      error.code === 'ESOCKET' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('Connection is closed') ||
      error.message?.includes('ConnectionError') ||
      error.message?.includes('RequestError') ||
      error.message?.includes('Failed to connect');

    const isTimeoutError = 
      error.code === 'ETIMEOUT' ||
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('timeout') ||
      error.message?.includes('Timeout');

    // Check if error is "procedure not found" - this is expected and will fallback
    const isProcedureNotFound = 
      error.message?.includes('Could not find stored procedure') ||
      (error.message?.includes('stored procedure') && error.message?.includes('not found')) ||
      (error.originalError?.info?.number === 2812) || // SQL Server error 2812 = object not found
      (error.info?.number === 2812);
    
    if (isProcedureNotFound) {
      // Log as debug since this is expected behavior (fallback will be used)
      logger.debug(`Stored procedure ${procedureName} not found (expected, will use fallback)`);
    } else {
      // Log as error for actual failures
      logger.error('Stored procedure execution failed:', {
        procedure: procedureName,
        error: error.message,
        code: error.code,
        name: error.name,
        retryCount,
        isConnectionError,
        isTimeoutError
      });
    }

    // Retry on connection errors (but not timeout errors)
    // Timeout errors mean the procedure is slow, not that connection is broken
    if (isConnectionError && !isTimeoutError && retryCount < 2) {
      logger.info(`Retrying procedure (attempt ${retryCount + 2}/3)...`);
      // Only invalidate pool for actual connection issues, not timeouts
      if (error.code === 'ECONNRESET' || 
          error.code === 'ESOCKET' || 
          error.message?.includes('Connection is closed')) {
        pool = null; // Force reconnection only for real connection problems
        lastValidationTime = 0;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return executeProcedure(procedureName, params, options, retryCount + 1);
    }

    // For timeout errors, don't retry but provide better error context
    if (isTimeoutError) {
      const timeoutError = new Error(`Stored procedure timeout: ${procedureName} - ${error.message}`);
      timeoutError.code = error.code || 'ETIMEOUT';
      timeoutError.originalError = error;
      throw timeoutError;
    }

    throw error;
  }
};

/**
 * Close database connection
 */
const closeDatabase = async() => {
  try {
    isConnecting = false;
    connectionPromise = null;
    
    if (pool) {
      try {
        await pool.close();
        logger.info('Database connection closed gracefully');
      } catch (error) {
        logger.warn('Error during pool close:', error.message);
      }
      pool = null;
      lastValidationTime = 0;
    }
  } catch (error) {
    logger.error('Error closing database connection:', {
      message: error.message,
      code: error.code
    });
    pool = null;
    lastValidationTime = 0;
    // Don't throw on close errors, just log them
  }
};

/**
 * Health check for database connection
 */
const healthCheck = async() => {
  try {
    // First check if pool exists
    if (!pool) {
      logger.warn('Health check: Pool does not exist, attempting to connect...');
      try {
        await connectDatabase();
      } catch (error) {
        logger.error('Health check: Failed to establish connection:', error.message);
        return false;
      }
    }

    // Validate connection with a simple query
    const isValid = await validateConnection(pool);
    if (!isValid) {
      logger.warn('Health check: Connection validation failed, attempting reconnect...');
      pool = null;
      lastValidationTime = 0;
      try {
        await connectDatabase();
        const retryValid = await validateConnection(pool);
        return retryValid;
      } catch (error) {
        logger.error('Health check: Reconnection failed:', error.message);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Database health check failed:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    return false;
  }
};

module.exports = {
  connectDatabase,
  getPool,
  executeQuery,
  executeProcedure,
  closeDatabase,
  healthCheck,
  sql
};
