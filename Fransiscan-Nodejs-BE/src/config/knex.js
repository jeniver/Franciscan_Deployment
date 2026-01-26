const knex = require('knex');
const logger = require('../utils/logger');

/**
 * Knex configuration for SQL Server
 * Provides transactional support on top of mssql
 */
const knexConfig = {
  client: 'mssql',
  connection: async() => {
    const { getPool } = require('./database');
    const pool = await getPool();
    return {
      pool,
      options: {
        enableArithAbort: true,
        encrypt: false,
        trustServerCertificate: true
      }
    };
  },
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  },
  useNullAsDefault: true,
  debug: process.env.NODE_ENV === 'development'
};

// Create Knex instance
const knexInstance = knex(knexConfig);

/**
 * Execute operation within a transaction
 * @param {Function} callback - Async function that receives transaction object
 * @returns {Promise<any>} Result from callback
 */
async function withTransaction(callback) {
  const trx = await knexInstance.transaction();

  try {
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    logger.error('Transaction rolled back:', error);
    throw error;
  }
}

/**
 * Execute a stored procedure with parameters
 * @param {string} procedureName - Name of the stored procedure
 * @param {Object} params - Parameters for the procedure
 * @param {Object} transaction - Optional transaction object
 * @returns {Promise<Object>} Result from procedure
 */
async function executeStoredProcedure(procedureName, params = {}, transaction = null) {
  const { executeProcedure } = require('./database');

  try {
    logger.info(`Executing stored procedure: ${procedureName}`);
    const result = await executeProcedure(procedureName, params);
    return result;
  } catch (error) {
    // Check if error is "procedure not found" - this is expected and will fallback
    const isProcedureNotFound = 
      error.message?.includes('Could not find stored procedure') ||
      error.message?.includes('stored procedure') && error.message?.includes('not found') ||
      (error.originalError?.info?.number === 2812); // SQL Server error 2812 = object not found
    
    if (isProcedureNotFound) {
      // Log as debug/info since this is expected behavior (fallback will be used)
      logger.debug(`Stored procedure ${procedureName} not found, will use fallback method`);
    } else {
      // Log as error for actual failures
      logger.error(`Stored procedure ${procedureName} failed:`, error);
    }
    throw error;
  }
}

/**
 * Execute a raw query with parameters
 * @param {string} query - SQL query
 * @param {Object} params - Query parameters
 * @param {Object} transaction - Optional transaction object
 * @returns {Promise<Object>} Query result
 */
async function executeRawQuery(query, params = {}, transaction = null) {
  const { executeQuery } = require('./database');

  try {
    const result = await executeQuery(query, params);
    return result;
  } catch (error) {
    logger.error('Raw query failed:', error);
    throw error;
  }
}

module.exports = {
  knex: knexInstance,
  withTransaction,
  executeStoredProcedure,
  executeRawQuery
};

