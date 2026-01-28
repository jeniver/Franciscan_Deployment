require('dotenv').config();
const { execSync } = require('child_process');
const os = require('os');

console.log('🔍 Database Connection Diagnostic Tool\n');
console.log('=' .repeat(60));

// 1. Check environment variables
console.log('\n1. Environment Variables:');
console.log('-'.repeat(60));
const envVars = {
  'DB_SERVER': process.env.DB_SERVER || '(not set - using default: localhost)',
  'DB_INSTANCE': process.env.DB_INSTANCE || '(not set)',
  'DB_DATABASE': process.env.DB_DATABASE || '(not set - using default: FransiscanTest)',
  'DB_PORT': process.env.DB_PORT || '(not set - using default: 1433)',
  'DB_USER': process.env.DB_USER || '(not set)',
  'DB_PASSWORD': process.env.DB_PASSWORD ? '***set***' : '(not set - using Windows Auth)',
  'DB_ENCRYPT': process.env.DB_ENCRYPT || '(not set)',
  'DB_TRUST_SERVER_CERTIFICATE': process.env.DB_TRUST_SERVER_CERTIFICATE || '(not set)'
};

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

// 2. Check if .env file exists
console.log('\n2. Configuration File:');
console.log('-'.repeat(60));
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('  ✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasDbServer = envContent.includes('DB_SERVER');
  const hasDbDatabase = envContent.includes('DB_DATABASE');
  console.log(`  - DB_SERVER configured: ${hasDbServer ? '✅' : '❌'}`);
  console.log(`  - DB_DATABASE configured: ${hasDbDatabase ? '✅' : '❌'}`);
} else {
  console.log('  ❌ .env file NOT FOUND');
  console.log('  💡 Create .env file from env.example:');
  console.log('     cp env.example .env');
}

// 3. Check SQL Server service status (Windows only)
console.log('\n3. SQL Server Service Status:');
console.log('-'.repeat(60));
if (os.platform() === 'win32') {
  try {
    // Check for SQL Server services
    const services = [
      'MSSQLSERVER',
      'MSSQL$SQLEXPRESS',
      'SQLBrowser'
    ];
    
    services.forEach(service => {
      try {
        const result = execSync(`sc query ${service}`, { encoding: 'utf8', stdio: 'pipe' });
        if (result.includes('RUNNING')) {
          console.log(`  ✅ ${service}: RUNNING`);
        } else if (result.includes('STOPPED')) {
          console.log(`  ⚠️  ${service}: STOPPED`);
        } else {
          console.log(`  ❓ ${service}: Not found or unknown status`);
        }
      } catch (error) {
        console.log(`  ❓ ${service}: Not found or not accessible`);
      }
    });
  } catch (error) {
    console.log('  ⚠️  Could not check service status (run as administrator for better results)');
  }
} else {
  console.log('  ℹ️  Service check only available on Windows');
}

// 4. Test network connectivity
console.log('\n4. Network Connectivity:');
console.log('-'.repeat(60));
const server = process.env.DB_SERVER || 'localhost';
const port = process.env.DB_PORT || 1433;

// For named instances, try to resolve
if (server.includes('\\') || server.includes('.')) {
  console.log(`  ℹ️  Named instance detected: ${server}`);
  console.log('  💡 Named instances use dynamic ports and require SQL Server Browser service');
  console.log('  💡 Ensure SQL Server Browser service is running');
}

// 5. Connection string analysis
console.log('\n5. Connection String Analysis:');
console.log('-'.repeat(60));
const useWindowsAuth = !process.env.DB_PASSWORD || process.env.DB_PASSWORD === '';
const instance = process.env.DB_INSTANCE || '';
const database = process.env.DB_DATABASE || 'FransiscanTest';
const serverString = instance && instance !== '' ? `${server}\\${instance}` : server;

console.log(`  Authentication: ${useWindowsAuth ? 'Windows Authentication' : 'SQL Server Authentication'}`);
console.log(`  Server String: ${serverString}`);
console.log(`  Database: ${database}`);
console.log(`  Port: ${port}`);

if (useWindowsAuth) {
  console.log('  Driver: msnodesqlv8 (Windows Auth)');
  console.log(`  Connection String: Server=${serverString};Database=${database};Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server};`);
} else {
  console.log('  Driver: tedious (SQL Auth)');
  console.log(`  Connection: ${server}:${port}`);
}

// 6. Common issues and solutions
console.log('\n6. Common Issues & Solutions:');
console.log('-'.repeat(60));

const issues = [];

if (!fs.existsSync(envPath)) {
  issues.push({
    issue: 'Missing .env file',
    solution: 'Create .env file: cp env.example .env and configure DB_SERVER, DB_DATABASE'
  });
}

if (server === 'localhost' && !process.env.DB_SERVER) {
  issues.push({
    issue: 'Using default localhost (no DB_SERVER configured)',
    solution: 'Set DB_SERVER in .env file (e.g., DB_SERVER=.\\SQLEXPRESS for named instance)'
  });
}

if (server.includes('\\') || server.includes('.')) {
  issues.push({
    issue: 'Named instance requires SQL Server Browser',
    solution: 'Ensure SQL Server Browser service is running: sc start SQLBrowser'
  });
}

if (useWindowsAuth) {
  issues.push({
    issue: 'Windows Authentication requires ODBC Driver',
    solution: 'Install "ODBC Driver 17 for SQL Server" or newer from Microsoft'
  });
}

if (issues.length === 0) {
  console.log('  ✅ No obvious configuration issues detected');
} else {
  issues.forEach((item, index) => {
    console.log(`\n  Issue ${index + 1}: ${item.issue}`);
    console.log(`  Solution: ${item.solution}`);
  });
}

// 7. Test actual connection
console.log('\n7. Testing Database Connection:');
console.log('-'.repeat(60));

const { connectDatabase } = require('../src/config/database');

connectDatabase()
  .then(() => {
    console.log('  ✅ Database connection successful!');
    console.log('\n' + '='.repeat(60));
    console.log('✅ All checks passed. Database is accessible.');
    process.exit(0);
  })
  .catch((error) => {
    console.log('  ❌ Database connection failed');
    console.log(`  Error: ${error.message}`);
    console.log(`  Code: ${error.code || 'UNKNOWN'}`);
    
    if (error.code === 'ESOCKET' || error.message?.includes('Could not connect')) {
      console.log('\n  💡 Connection Error Solutions:');
      console.log('     1. Verify SQL Server is running');
      console.log('     2. Check if SQL Server is accessible at the configured server/port');
      console.log('     3. For named instances, ensure SQL Server Browser service is running');
      console.log('     4. Check Windows Firewall settings');
      console.log('     5. Verify TCP/IP protocol is enabled in SQL Server Configuration Manager');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('❌ Database connection test failed. Please review the issues above.');
    process.exit(1);
  });

