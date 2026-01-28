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

// Discover ERRORLOG paths (including MSSQL16/17 and dynamic scan under Program Files)
function discoverErrorLogPaths() {
  const basePaths = [
    'C:\\Program Files\\Microsoft SQL Server',
    'C:\\Program Files (x86)\\Microsoft SQL Server'
  ];
  const preferred = [
    'C:\\Program Files\\Microsoft SQL Server\\MSSQL17.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG',
    'C:\\Program Files\\Microsoft SQL Server\\MSSQL16.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG',
    'C:\\Program Files\\Microsoft SQL Server\\MSSQL15.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG',
    'C:\\Program Files\\Microsoft SQL Server\\MSSQL14.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG',
    'C:\\Program Files\\Microsoft SQL Server\\MSSQL13.SQLEXPRESS\\MSSQL\\Log\\ERRORLOG'
  ];
  const paths = [];
  for (const p of preferred) {
    if (fs.existsSync(p)) paths.push(p);
  }
  for (const base of basePaths) {
    if (!fs.existsSync(base)) continue;
    try {
      const dirs = fs.readdirSync(base);
      for (const d of dirs) {
        if (!/^MSSQL\d+\.(SQLEXPRESS|MSSQLSERVER)$/i.test(d)) continue;
        const logPath = path.join(base, d, 'MSSQL', 'Log', 'ERRORLOG');
        if (fs.existsSync(logPath) && !paths.includes(logPath)) paths.push(logPath);
      }
    } catch (e) { /* ignore */ }
  }
  return paths;
}

const PORT_PATTERNS = [
  /Server is listening on \[ 'any' <ipv4> (\d+) \]/,
  /Server is listening on \[\s*'any'\s*<ipv4>\s*(\d+)\s*\]/,
  /TCP Dynamic Ports[^\d]*(\d{4,5})/,
  /TCP Port[^\d]*(\d{4,5})/
];

function extractPort(content) {
  for (const re of PORT_PATTERNS) {
    const m = content.match(re);
    if (m) {
      const p = parseInt(m[1], 10);
      if (p > 1024 && p < 65536) return String(p);
    }
  }
  return null;
}

const errorLogPaths = discoverErrorLogPaths();
let foundPort = null;

for (const logPath of errorLogPaths) {
  if (fs.existsSync(logPath)) {
    console.log(`  ✅ Found error log: ${logPath}`);
    try {
      const logContent = fs.readFileSync(logPath, 'utf8');
      foundPort = extractPort(logContent);
      if (foundPort) {
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
    
    // Normalize DB_SERVER to host when using port (no instance name)
    if (/\bDB_SERVER=.*[\\]/.test(envContent) || /DB_SERVER=\.\\SQLEXPRESS/.test(envContent)) {
      envContent = envContent.replace(/^DB_SERVER=.*$/m, 'DB_SERVER=127.0.0.1');
      console.log('  ✅ Updated DB_SERVER to: 127.0.0.1');
    }
    console.log(`  ✅ Updated DB_PORT to: ${foundPort}`);
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Configuration updated!');
    console.log('   Test connection: npm run test-db');
  }
} else {
  console.log('\n⚠️  Could not automatically find the port.');
  console.log('   Please use one of the manual methods above.');
}

console.log('\n' + '='.repeat(60));

