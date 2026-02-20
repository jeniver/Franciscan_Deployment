/**
 * Migration: Add RequestSameBrick column to EngraveWallApplication
 * Run with: node scripts/run-add-request-same-brick.js
 */
require('dotenv').config();
const { executeQuery, connectDatabase, closeDatabase } = require('../src/config/database');

async function run() {
  try {
    await connectDatabase();

    // Check if column exists
    const checkQuery = `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'EngraveWallApplication'
        AND COLUMN_NAME = 'RequestSameBrick'
    `;
    const checkResult = await executeQuery(checkQuery, {});
    const exists = checkResult.recordset && checkResult.recordset.length > 0;

    if (exists) {
      console.log('RequestSameBrick column already exists in EngraveWallApplication.');
      process.exit(0);
      return;
    }

    // Add the column
    const alterQuery = `
      ALTER TABLE EngraveWallApplication
      ADD RequestSameBrick BIT NULL DEFAULT 0
    `;
    await executeQuery(alterQuery, {});
    console.log('Successfully added RequestSameBrick column to EngraveWallApplication.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

run();
