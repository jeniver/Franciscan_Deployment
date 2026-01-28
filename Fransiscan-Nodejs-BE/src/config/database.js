const sql = require('mssql');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../utils/logger');

// SQL Server configuration
// Determine if we're using Windows Authentication or SQL Server Authentication
const useWindowsAuth = !process.env.DB_PASSWORD || process.env.DB_PASSWORD === '';

// Get configuration from environment
const rawServer = process.env.DB_SERVER || 'localhost';
let server = rawServer;
// Normalize ".\SQLEXPRESS" → "COLUMBARIUM\SQLEXPRESS" so getaddrinfo doesn't resolve "." (ENOTFOUND)
if (rawServer === '.' || (rawServer.length >= 2 && (rawServer.startsWith('.\\') || rawServer.startsWith('./')))) {
  const hostname = os.hostname();
  server = rawServer === '.' ? hostname : (hostname + rawServer.slice(1));
  logger.info('DB_SERVER normalized "%s" → "%s" to avoid getaddrinfo ENOTFOUND', rawServer, server);
}
// Normalize 0.0.0.0 → 127.0.0.1 for SQL connection (0.0.0.0 is a bind address, not a connect target)
if (server === '0.0.0.0') {
  server = '127.0.0.1';
  logger.info('DB_SERVER normalized "0.0.0.0" → "127.0.0.1" for SQL connection');
}
const instance = process.env.DB_INSTANCE || '';
const database = process.env.DB_DATABASE || 'FransiscanLive';
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

/**
 * Sync discover SQL Server port (Windows): ERRORLOG, then Registry, then TCP probe.
 * Used upfront when named instance + no DB_PORT so we bypass SQL Server Browser from the first connection.
 */
function discoverPortSync() {
  if (os.platform() !== 'win32') return null;
  const bases = ['C:\\Program Files\\Microsoft SQL Server', 'C:\\Program Files (x86)\\Microsoft SQL Server'];
  const preferred = ['MSSQL17.SQLEXPRESS', 'MSSQL16.SQLEXPRESS', 'MSSQL15.SQLEXPRESS', 'MSSQL14.SQLEXPRESS', 'MSSQL13.SQLEXPRESS'];
  const patterns = [
    /Server is listening on \[\s*'any'\s*<ipv4>\s*(\d+)\s*\]/,
    /Server is listening on \[ 'any' <ipv4> (\d+) \]/,
    /listening on \[ .*? (\d{4,5}) \]/,
    /'any'\s*<ipv4>\s*(\d{4,5})/,
    /TCP Dynamic Ports[^\d]*(\d{4,5})/,
    /TCP Port[^\d]*(\d{4,5})/,
    /TCPDynamicPorts[^\d]*(\d+)/i,
    /TCPPort[^\d]*(\d+)/i
  ];
  const parsePort = (m) => { const p = parseInt(m[1], 10); return (p > 1024 && p < 65536) ? p : null; };
  for (const name of preferred) {
    const logPath = path.join('C:\\Program Files\\Microsoft SQL Server', name, 'MSSQL', 'Log', 'ERRORLOG');
    if (fs.existsSync(logPath)) {
      try {
        let c = fs.readFileSync(logPath, 'utf8');
        if (c.length > 100000) c = c.slice(-100000);
        for (const re of patterns) { const m = c.match(re); if (m) { const p = parsePort(m); if (p) return p; } }
      } catch (e) { /* ignore */ }
    }
  }
  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    try {
      for (const d of fs.readdirSync(base)) {
        if (!/^MSSQL\d+\.(SQLEXPRESS|MSSQLSERVER)$/i.test(d)) continue;
        const logPath = path.join(base, d, 'MSSQL', 'Log', 'ERRORLOG');
        if (fs.existsSync(logPath)) {
          try {
            let c = fs.readFileSync(logPath, 'utf8');
            if (c.length > 100000) c = c.slice(-100000);
            for (const re of patterns) { const m = c.match(re); if (m) { const p = parsePort(m); if (p) return p; } }
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
  }
  try {
    const instancePath = 'HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\Instance Names\\SQL';
    const out = execSync(`reg query "${instancePath}"`, { encoding: 'utf8', stdio: 'pipe', windowsHide: true });
    const lines = (out || '').split(/\r?\n/).filter(Boolean);
    let internalName = null;
    for (const line of lines) {
      const m = line.match(/SQLEXPRESS\s+REG_?\w+\s+(MSSQL\d+\.SQLEXPRESS)/i) || line.match(/\s+REG_?\w+\s+(MSSQL\d+\.SQLEXPRESS)/i);
      if (m && m[1]) { internalName = m[1].trim(); break; }
    }
    if (!internalName) {
      for (const line of lines) {
        const m = line.match(/SQLEXPRESS\s+REG_?\w+\s+(.+)/i);
        if (m && m[1]) { internalName = (m[1] || '').trim(); break; }
      }
    }
    if (internalName) {
      const ipAllPath = `HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\${internalName}\\MSSQLServer\\SuperSocketNetLib\\Tcp\\IPAll`;
      for (const v of ['TcpPort', 'TcpDynamicPorts']) {
        try {
          const t = execSync(`reg query "${ipAllPath}" /v ${v}`, { encoding: 'utf8', stdio: 'pipe', windowsHide: true });
          const pm = (t || '').match(new RegExp(`\\b${v}\\s+REG_\\w+\\s+([0-9,]+)`, 'i'));
          if (pm) {
            const first = (pm[1] || '').split(',')[0].trim();
            const p = parseInt(first, 10);
            if (p > 1024 && p < 65536) return p;
          }
        } catch (e) { /* ignore */ }
      }
    }
  } catch (e) { /* ignore */ }
  try {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'discover-port-tcp.js');
    if (fs.existsSync(scriptPath)) {
      const r = execSync(`node "${scriptPath}"`, { encoding: 'utf8', stdio: 'pipe', windowsHide: true, timeout: 20000 });
      const num = parseInt((r || '').trim(), 10);
      if (num > 1024 && num < 65536) return num;
    }
  } catch (e) { /* ignore */ }
  return null;
}

// Upfront: named instance + no DB_PORT on Windows → discover port and set DB_PORT so first connection uses host,port (no 15s Browser timeout)
if (serverString.includes('\\') && !(process.env.DB_PORT && String(process.env.DB_PORT).trim() !== '') && os.platform() === 'win32') {
  const discovered = discoverPortSync();
  if (discovered) {
    process.env.DB_PORT = String(discovered);
    logger.info('Discovered SQL Server port %s; using host,port to bypass SQL Server Browser', discovered);
    try {
      const envPath = path.join(__dirname, '..', '..', '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (/\bDB_PORT\s*=/m.test(envContent)) {
          envContent = envContent.replace(/^DB_PORT\s*=.*$/m, `DB_PORT=${discovered}`);
        } else if (/^DB_SERVER\s*=/m.test(envContent)) {
          envContent = envContent.replace(/^(DB_SERVER\s*=[^\n]*)/m, `$1\nDB_PORT=${discovered}`);
        } else {
          envContent = envContent.trimEnd() + `\nDB_PORT=${discovered}\n`;
        }
        fs.writeFileSync(envPath, envContent);
        logger.info('Updated .env with DB_PORT=%s for future runs', discovered);
      }
    } catch (e) { /* non-fatal */ }
  } else {
    logger.warn('Could not discover SQL Server port (ERRORLOG, Registry, TCP probe). Set DB_PORT in .env or run: npm run find-sql-port');
  }
}

if (useWindowsAuth) {
  // Windows Authentication with msnodesqlv8 driver
  logger.info('Using Windows Authentication with msnodesqlv8 driver');

  // Build connection string for Windows Authentication
  // Note: Connection timeout in connection string is in seconds
  // For named instances, ensure proper format (e.g., .\SQLEXPRESS or localhost\SQLEXPRESS)
  const connectionTimeoutSeconds = Math.ceil(connectionTimeout / 1000);

  // When DB_PORT is set with a named instance, use host,port to bypass SQL Server Browser (avoids 15s ETIMEOUT)
  let connectionServerString = serverString;
  const hasExplicitPortWin = process.env.DB_PORT && String(process.env.DB_PORT).trim() !== '';
  if (serverString.includes('\\') && hasExplicitPortWin) {
    const hostPart = serverString.split('\\')[0];
    connectionServerString = `${hostPart},${String(process.env.DB_PORT).trim()}`;
    logger.info('Windows Auth: using explicit port to bypass SQL Server Browser: Server=%s', connectionServerString);
  }

  const connectionString = `Server=${connectionServerString};Database=${database};Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server};Connection Timeout=${connectionTimeoutSeconds};`;

  config = {
    server: serverString,
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
    database,
    hasInstance: serverString.includes('\\'),
    connectionTimeout: connectionTimeoutSeconds
  });
} else {
  // SQL Server Authentication with tedious driver
  logger.info('Using SQL Server Authentication with tedious driver');

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
    useNamedInstance = true;
  }

  // Check if a specific port is provided - if so, don't use instanceName (bypass SQL Server Browser)
  const hasExplicitPort = process.env.DB_PORT && String(process.env.DB_PORT).trim() !== '';

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
    logger.info(`Config: server=${config.server}, instanceName=${config.options.instanceName}, port=${config.port !== undefined ? config.port : 'OMITTED (correct)'}`);
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
      logger.info(`Named instance with explicit port: ${serverHost}:${config.port} (bypassing SQL Server Browser)`);
    } else {
      logger.info(`Default instance connection: ${serverHost}:${config.port}`);
    }
  }
  
  // Log connection details for debugging
  logger.info('SQL Auth connection config:', {
    serverHost,
    instanceName: useNamedInstance && !hasExplicitPort ? instanceName : 'N/A',
    database,
    port: config.port || 'dynamic (via SQL Server Browser)',
    hasInstance: useNamedInstance,
    usingBrowser: useNamedInstance && !hasExplicitPort
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
      configHasInstanceName: !!(config.options?.instanceName)
    };

    // Add additional context for connection errors
    if (error.code === 'ESOCKET' || error.code === 'ETIMEOUT' || error.message?.includes('Could not connect')) {
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

    logger.error(`❌ Database connection failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, errorDetails);

    // One-time fallback: if configured port failed (e.g. 49152), try default 127.0.0.1:1433
    const isPortFailure = error.code === 'ESOCKET' || error.code === 'ETIMEOUT' || error.message?.includes('Could not connect');
    const triedNonDefaultPort = !useWindowsAuth && config.port != null && config.port !== 1433;
    if (retryCount === 0 && isPortFailure && triedNonDefaultPort) {
      try {
        logger.info('Trying fallback 127.0.0.1:1433...');
        const fallbackConfig = {
          server: '127.0.0.1',
          port: 1433,
          database: config.database,
          user: config.user,
          password: config.password,
          options: {
            encrypt: config.options.encrypt,
            trustServerCertificate: config.options.trustServerCertificate,
            enableArithAbort: true,
            connectionTimeout: config.options.connectionTimeout,
            requestTimeout: config.options.requestTimeout,
            cancelTimeout: config.options.cancelTimeout,
            useUTC: false,
            rowCollectionOnDone: true,
            rowCollectionOnRequestCompletion: true
          },
          pool: config.pool
        };
        pool = await sql.connect(fallbackConfig);
        setupPoolEventHandlers(pool);
        const valid = await validateConnection(pool);
        if (valid) {
          lastValidationTime = Date.now();
          logger.info('✅ Connected via fallback 127.0.0.1:1433');
          return pool;
        }
      } catch (fallbackErr) {
        logger.warn('Fallback 127.0.0.1:1433 failed:', fallbackErr.message);
        pool = null;
      }
    }

    // One-time: named instance + no DB_PORT + ETIMEOUT → discover port from ERRORLOG and retry with host,port
    const isNamedInstanceNoPort = serverString.includes('\\') && !(process.env.DB_PORT && String(process.env.DB_PORT).trim() !== '');
    const isTimeout = error.code === 'ETIMEOUT' || error.code === 'ETIMEDOUT';
    if (retryCount === 0 && isTimeout && isNamedInstanceNoPort && os.platform() === 'win32') {
      const discoveredPort = discoverPortSync();
      if (discoveredPort) {
        logger.info('Discovered SQL Server port %s from ERRORLOG, retrying with host,port', discoveredPort);
        const hostPart = serverString.split('\\')[0];
        try {
          if (useWindowsAuth) {
            const toSec = Math.ceil((config.options.connectionTimeout || 60000) / 1000);
            const connStr = `Server=${hostPart},${discoveredPort};Database=${database};Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server};Connection Timeout=${toSec};`;
            pool = await sql.connect({ server: hostPart, database, driver: 'msnodesqlv8', connectionString: connStr, options: config.options, pool: config.pool });
          } else {
            const fallbackOpts = { ...config.options, instanceName: undefined };
            const fb = { server: hostPart, port: discoveredPort, database, user: process.env.DB_USER, password: process.env.DB_PASSWORD, options: fallbackOpts, pool: config.pool };
            pool = await sql.connect(fb);
          }
          setupPoolEventHandlers(pool);
          const valid = await validateConnection(pool);
          if (valid) {
            lastValidationTime = Date.now();
            logger.info('✅ Connected using discovered port %s', discoveredPort);
            return pool;
          }
        } catch (e) {
          logger.warn('Retry with discovered port %s failed: %s', discoveredPort, e.message);
          pool = null;
        }
      }
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
