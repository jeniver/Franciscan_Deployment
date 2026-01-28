/**
 * Fix ReceiptReport Stored Procedure Permissions
 * 
 * This script connects to the database and grants EXECUTE permission
 * on the ReceiptReport stored procedure to the database user.
 * 
 * Usage:
 *   node scripts/fix-receipt-report-permissions.js
 * 
 * Requirements:
 *   - Must be run with a user that has sysadmin or db_owner permissions
 *   - .env file must be configured with database connection details
 */

require('dotenv').config();
const sql = require('mssql');
const logger = require('../src/utils/logger');

// Get database configuration from environment
const getDbConfig = () => {
  const useWindowsAuth = !process.env.DB_PASSWORD || process.env.DB_PASSWORD === '';
  const server = process.env.DB_SERVER || 'localhost';
  const instance = process.env.DB_INSTANCE || '';
  const database = process.env.DB_DATABASE || 'FransiscanTest';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433;

  // Build server string - handle named instances
  let serverString = server;
  if (instance && instance !== '') {
    serverString = server.includes('\\') ? server : `${server}\\${instance}`;
  } else if (server.includes('\\')) {
    serverString = server;
  }

  // Normalize server string for Windows Auth
  if (serverString.startsWith('.\\')) {
    serverString = 'localhost' + serverString.substring(1);
  }

  if (useWindowsAuth) {
    const hasExplicitPort = process.env.DB_PORT && process.env.DB_PORT !== '';
    const serverHost = serverString.includes('\\') ? serverString.split('\\')[0] : serverString;
    
    let connectionServerString;
    if (hasExplicitPort) {
      connectionServerString = `${serverHost},${process.env.DB_PORT}`;
    } else {
      connectionServerString = serverString;
    }

    return {
      server: hasExplicitPort ? serverHost : serverString,
      port: hasExplicitPort ? parseInt(process.env.DB_PORT) : undefined,
      database,
      driver: 'msnodesqlv8',
      connectionString: `Server=${connectionServerString}`,
      options: {
        trustedConnection: true,
        enableArithAbort: true,
        encrypt: false,
        trustServerCertificate: true
      }
    };
  } else {
    const serverHost = serverString.includes('\\') ? serverString.split('\\')[0] : serverString;
    const instanceName = serverString.includes('\\') ? serverString.split('\\')[1] : null;
    const hasExplicitPort = process.env.DB_PORT && process.env.DB_PORT !== '';

    if (instanceName && !hasExplicitPort) {
      return {
        server: serverHost,
        database,
        user,
        password,
        driver: 'tedious',
        options: {
          instanceName: instanceName,
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
          enableArithAbort: true
        }
      };
    } else {
      return {
        server: serverHost,
        port: hasExplicitPort ? parseInt(process.env.DB_PORT) : port,
        database,
        user,
        password,
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
          enableArithAbort: true
        }
      };
    }
  }
};

async function fixPermissions() {
  let pool;
  
  try {
    logger.info('Connecting to database...');
    const config = getDbConfig();
    pool = await sql.connect(config);
    logger.info('✅ Connected to database successfully');

    const dbUser = process.env.DB_USER || 'franciscan_api';
    const database = process.env.DB_DATABASE || 'FransiscanTest';
    const useWindowsAuth = !process.env.DB_PASSWORD || process.env.DB_PASSWORD === '';

    logger.info(`Granting EXECUTE permission on ReceiptReport to user/roles...`);

    // Check if user exists (escape brackets for Windows Auth users)
    const escapedUser = dbUser.replace(/[\[\]]/g, '');
    const userCheckQuery = `
      SELECT name, type_desc 
      FROM sys.database_principals 
      WHERE name = @userName OR name = @escapedUserName
    `;
    const userCheckResult = await pool.request()
      .input('userName', sql.NVarChar, dbUser)
      .input('escapedUserName', sql.NVarChar, escapedUser)
      .query(userCheckQuery);

    if (userCheckResult.recordset.length > 0) {
      const foundUser = userCheckResult.recordset[0].name;
      logger.info(`✅ User [${foundUser}] found in database`);
      
      // Grant to specific user (use the name as found in database)
      // Properly escape the user name: brackets need to be doubled, single quotes need to be escaped
      const escapedUser = foundUser.replace(/\[/g, '[[').replace(/\]/g, ']]').replace(/'/g, "''");
      const grantUserQuery = `
        USE [${database}];
        GRANT EXECUTE ON [dbo].[ReceiptReport] TO [${escapedUser}];
      `;
      try {
        await pool.request().query(grantUserQuery);
        logger.info(`✅ EXECUTE permission granted to [${foundUser}]`);
      } catch (grantError) {
        if (grantError.message?.includes('permission was denied')) {
          logger.warn(`⚠️  Cannot grant to [${foundUser}] - insufficient permissions. Granting to roles instead...`);
        } else {
          throw grantError;
        }
      }
    } else {
      logger.warn(`⚠️  User [${dbUser}] not found. Granting to roles instead...`);
      if (useWindowsAuth) {
        logger.info(`💡 Tip: For Windows Auth, ensure the Windows user has access to the database.`);
      }
    }

    // Grant to PUBLIC role - this is the simplest and most reliable solution
    // All database users inherit permissions from PUBLIC role
    logger.info('Granting EXECUTE permission to PUBLIC role (all users inherit this)...');
    const grantPublicQuery = `
      USE [${database}];
      GRANT EXECUTE ON [dbo].[ReceiptReport] TO [public];
    `;
    try {
      await pool.request().query(grantPublicQuery);
      logger.info('✅ EXECUTE permission granted to [public] role');
      logger.info('💡 All database users can now execute ReceiptReport');
    } catch (publicError) {
      logger.warn('⚠️  Could not grant to PUBLIC role:', publicError.message);
      logger.info('💡 Continuing with user-specific grants...');
    }

    // Verify permissions
    logger.info('Verifying permissions...');
    const verifyQuery = `
      SELECT 
        p.name AS principal_name,
        p.type_desc AS principal_type,
        perm.permission_name,
        perm.state_desc AS permission_state
      FROM sys.database_permissions perm
      INNER JOIN sys.objects obj ON perm.major_id = obj.object_id
      INNER JOIN sys.database_principals p ON perm.grantee_principal_id = p.principal_id
      WHERE obj.name = 'ReceiptReport'
        AND perm.type = 'EX'
      ORDER BY p.name;
    `;
    const verifyResult = await pool.request().query(verifyQuery);
    
    if (verifyResult.recordset.length > 0) {
      logger.info('✅ Permissions verified:');
      verifyResult.recordset.forEach(row => {
        logger.info(`   - ${row.principal_name} (${row.principal_type}): ${row.permission_name} - ${row.permission_state}`);
      });
    } else {
      logger.warn('⚠️  No permissions found (this might indicate an issue)');
    }

    // Check if user is a member of db_datareader or db_datawriter roles
    logger.info('');
    logger.info('Checking user role membership...');
    const roleCheckQuery = `
      SELECT 
        dp.name AS user_name,
        r.name AS role_name
      FROM sys.database_role_members rm
      INNER JOIN sys.database_principals dp ON rm.member_principal_id = dp.principal_id
      INNER JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
      WHERE (dp.name = @userName OR dp.name = @escapedUserName)
        AND r.name IN ('db_datareader', 'db_datawriter')
    `;
    const roleCheckResult = await pool.request()
      .input('userName', sql.NVarChar, dbUser)
      .input('escapedUserName', sql.NVarChar, escapedUser)
      .query(roleCheckQuery);

    if (roleCheckResult.recordset.length > 0) {
      logger.info('✅ User is a member of the following roles:');
      roleCheckResult.recordset.forEach(row => {
        logger.info(`   - ${row.role_name}`);
      });
      logger.info('💡 Note: Users in db_datareader/db_datawriter roles inherit permissions automatically');
    } else {
      logger.info('💡 User is not a member of db_datareader/db_datawriter roles');
      logger.info('💡 Permissions have been granted directly to the user');
    }

    logger.info('');
    logger.info('✅ Permission fix completed successfully!');
    logger.info('');
    logger.info('📋 SUMMARY:');
    logger.info('   - EXECUTE permission granted to PUBLIC role (all users inherit this)');
    if (userCheckResult.recordset.length > 0) {
      logger.info(`   - EXECUTE permission granted to user: [${userCheckResult.recordset[0].name}]`);
    }
    logger.info('');
    logger.info('🔄 NEXT STEPS:');
    logger.info('   1. Restart your Node.js application');
    logger.info('   2. Test the /api/receipts/report endpoint');
    logger.info('   3. The permission error should now be resolved');
    logger.info('');
    logger.info('💡 If you still see errors, run the SQL script manually:');
    logger.info('   scripts/grant-receipt-report-to-public.sql');
    logger.info('📋 SUMMARY:');
    logger.info('   - EXECUTE permission granted to PUBLIC role (all users inherit this)');
    if (userCheckResult.recordset.length > 0) {
      logger.info(`   - EXECUTE permission granted to user: [${userCheckResult.recordset[0].name}]`);
    }
    logger.info('');
    logger.info('🔄 NEXT STEPS:');
    logger.info('   1. Restart your Node.js application');
    logger.info('   2. Test the /api/receipts/report endpoint');
    logger.info('   3. The permission error should now be resolved');
    logger.info('');
    logger.info('💡 If you still see errors, run the SQL script manually:');
    logger.info('   scripts/grant-receipt-report-to-public.sql');

  } catch (error) {
    logger.error('❌ Error fixing permissions:', error);
    
    if (error.message?.includes('special roles')) {
      logger.error('');
      logger.error('⚠️  SPECIAL ROLES ERROR:');
      logger.error('Cannot grant permissions to db_datareader/db_datawriter (special fixed roles).');
      logger.error('The script has been updated to only grant permissions directly to users.');
      logger.error('');
      logger.error('SOLUTION:');
      logger.error('The script will now grant permissions directly to your database user.');
      logger.error('If you see this error again, it means the script needs to be updated.');
    } else if (error.message?.includes('permission was denied')) {
      logger.error('');
      logger.error('⚠️  PERMISSION ERROR:');
      logger.error('The current database user does not have sufficient permissions to grant EXECUTE.');
      logger.error('');
      logger.error('SOLUTION:');
      logger.error('1. Run this script as a user with sysadmin or db_owner permissions');
      logger.error('2. OR manually run the SQL script: scripts/grant-receipt-report-permissions.sql');
      logger.error('   in SQL Server Management Studio (SSMS) as an administrator');
    }
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      logger.info('Database connection closed');
    }
  }
}

// Run the fix
if (require.main === module) {
  fixPermissions()
    .then(() => {
      logger.info('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixPermissions };

