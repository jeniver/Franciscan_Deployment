const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('🔍 SQL Server Port Finder\n');
console.log('='.repeat(60));

if (os.platform() !== 'win32') {
  console.log('❌ This script is for Windows only');
  process.exit(1);
}

console.log('\nThis script helps you find the port for SQL Server named instances.');
console.log('If SQL Server Browser is not running, you can use the specific port instead.\n');

// Common SQL Server configuration paths
const sqlConfigPaths = [
  'C:\\Program Files\\Microsoft SQL Server\\MSSQL*.MSSQLSERVER\\MSSQL\\Binn\\sqlservr.exe',
  'C:\\Program Files (x86)\\Microsoft SQL Server\\*\\MSSQL\\Binn\\sqlservr.exe'
];

console.log('1. Checking SQL Server Error Logs for port information:');
console.log('-'.repeat(60));

// Try to find SQL Server error logs
const errorLogPaths = [
  'C:\\Program Files\\Microsoft SQL Server\\MSSQL15.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG',
  'C:\\Program Files\\Microsoft SQL Server\\MSSQL14.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG',
  'C:\\Program Files\\Microsoft SQL Server\\MSSQL13.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG',
  'C:\\Program Files (x86)\\Microsoft SQL Server\\MSSQL15.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG',
  'C:\\Program Files (x86)\\Microsoft SQL Server\\MSSQL14.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG',
  'C:\\Program Files (x86)\\Microsoft SQL Server\\MSSQL13.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG'
];

let foundPort = null;

for (const logPath of errorLogPaths) {
  if (fs.existsSync(logPath)) {
    console.log(`  ✅ Found error log: ${logPath}`);
    try {
      const logContent = fs.readFileSync(logPath, 'utf8');
      // Look for port information in the log
      const portMatch = logContent.match(/Server is listening on \[ 'any' <ipv4> (\d+) \]/);
      if (portMatch) {
        foundPort = portMatch[1];
        console.log(`  ✅ Found port: ${foundPort}`);
        break;
      }
    } catch (error) {
      console.log(`  ⚠️  Could not read log file: ${error.message}`);
    }
  }
}

if (!foundPort) {
  console.log('  ⚠️  Could not find port in error logs');
}

console.log('\n2. Alternative: Check SQL Server Configuration Manager:');
console.log('-'.repeat(60));
console.log('  💡 Manual Steps:');
console.log('     1. Open "SQL Server Configuration Manager"');
console.log('     2. Navigate to: SQL Server Network Configuration > Protocols for SQLEXPRESS');
console.log('     3. Right-click "TCP/IP" and select "Properties"');
console.log('     4. Go to "IP Addresses" tab');
console.log('     5. Look for "IPAll" section and find "TCP Dynamic Ports" or "TCP Port"');
console.log('     6. Use that port number in your .env file as DB_PORT');

console.log('\n3. Alternative: Use Windows Authentication (Recommended):');
console.log('-'.repeat(60));
console.log('  💡 If you use Windows Authentication, named instances work better.');
console.log('  💡 Steps:');
console.log('     1. Remove or comment out DB_PASSWORD in .env file');
console.log('     2. Set DB_SERVER=.\\SQLEXPRESS (or localhost\\SQLEXPRESS)');
console.log('     3. Windows Auth handles named instances automatically');

if (foundPort) {
  console.log('\n4. Updating .env file with found port:');
  console.log('-'.repeat(60));
  
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add DB_PORT
    if (envContent.includes('DB_PORT=')) {
      envContent = envContent.replace(/^DB_PORT=.*$/m, `DB_PORT=${foundPort}`);
    } else {
      envContent += `\nDB_PORT=${foundPort}`;
    }
    
    // Also update DB_SERVER to remove instance name if using port
    if (envContent.includes('DB_SERVER=localhost\\SQLEXPRESS')) {
      envContent = envContent.replace(/^DB_SERVER=.*$/m, 'DB_SERVER=localhost');
      console.log('  ✅ Updated DB_SERVER to: localhost');
      console.log(`  ✅ Updated DB_PORT to: ${foundPort}`);
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Configuration updated!');
    console.log('   Test connection: npm run test-db');
  }
} else {
  console.log('\n⚠️  Could not automatically find the port.');
  console.log('   Please use one of the manual methods above.');
}

console.log('\n' + '='.repeat(60));

