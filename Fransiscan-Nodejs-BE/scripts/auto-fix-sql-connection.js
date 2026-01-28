require('dotenv').config();
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('🔧 Auto-Fix SQL Server Connection\n');
console.log('='.repeat(60));

if (os.platform() !== 'win32') {
  console.log('❌ This script is for Windows only');
  process.exit(1);
}

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');
let modified = false;

// Check current configuration
const dbServer = (envContent.match(/^DB_SERVER=(.*)$/m) || [])[1]?.trim() || 'localhost';
const hasPassword = !!(envContent.match(/^DB_PASSWORD=(.*)$/m) || [])[1]?.trim();
const dbPort = (envContent.match(/^DB_PORT=(.*)$/m) || [])[1]?.trim();

console.log('📋 Current Configuration:');
console.log(`  DB_SERVER: ${dbServer}`);
console.log(`  DB_PORT: ${dbPort || '(not set)'}`);
console.log(`  Authentication: ${hasPassword ? 'SQL Server Auth' : 'Windows Auth'}`);

const isNamedInstance = dbServer.includes('\\') || dbServer.includes('SQLEXPRESS');

if (!isNamedInstance) {
  console.log('\n✅ Not a named instance - connection should work if SQL Server is running');
  process.exit(0);
}

console.log('\n🔍 Detected named instance - checking SQL Server Browser...');

// Try to start SQL Server Browser
let browserRunning = false;
try {
  const browserStatus = execSync('sc query SQLBrowser', { encoding: 'utf8', stdio: 'pipe' });
  if (browserStatus.includes('RUNNING')) {
    browserRunning = true;
    console.log('  ✅ SQL Server Browser is RUNNING');
  } else if (browserStatus.includes('STOPPED')) {
    console.log('  ⚠️  SQL Server Browser is STOPPED');
    console.log('  🔄 Attempting to start SQL Server Browser...');
    
    try {
      execSync('sc start SQLBrowser', { encoding: 'utf8', stdio: 'pipe' });
      console.log('  ✅ SQL Server Browser started successfully!');
      browserRunning = true;
    } catch (error) {
      console.log('  ❌ Failed to start SQL Server Browser (may require Administrator)');
      console.log('  💡 Run PowerShell as Administrator and execute: sc start SQLBrowser');
    }
  }
} catch (error) {
  console.log('  ⚠️  Could not check SQL Server Browser status');
}

if (!browserRunning && !dbPort) {
  console.log('\n💡 Since SQL Server Browser is not running, let\'s try to find the port...');
  
  // Discover ERRORLOG paths (MSSQL13–17 + dynamic scan)
  function discoverErrorLogPaths() {
    const basePaths = ['C:\\Program Files\\Microsoft SQL Server', 'C:\\Program Files (x86)\\Microsoft SQL Server'];
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
  const portPatterns = [
    /Server is listening on \[ 'any' <ipv4> (\d+) \]/,
    /Server is listening on \[\s*'any'\s*<ipv4>\s*(\d+)\s*\]/,
    /TCP Dynamic Ports[^\d]*(\d{4,5})/,
    /TCP Port[^\d]*(\d{4,5})/
  ];
  function extractPort(content) {
    for (const re of portPatterns) {
      const m = content.match(re);
      if (m) { const p = parseInt(m[1], 10); if (p > 1024 && p < 65536) return String(p); }
    }
    return null;
  }
  
  let foundPort = null;
  for (const logPath of discoverErrorLogPaths()) {
    if (fs.existsSync(logPath)) {
      try {
        const logContent = fs.readFileSync(logPath, 'utf8');
        foundPort = extractPort(logContent);
        if (foundPort) {
          console.log(`  ✅ Found port in error log: ${foundPort}`);
          break;
        }
      } catch (e) { /* ignore */ }
    }
  }
  
  if (foundPort) {
    // Normalize DB_SERVER to 127.0.0.1 when using explicit port (bypasses Browser)
    envContent = envContent.replace(/^DB_SERVER=.*$/m, 'DB_SERVER=127.0.0.1');
    if (envContent.includes('DB_PORT=')) {
      envContent = envContent.replace(/^DB_PORT=.*$/m, `DB_PORT=${foundPort}`);
    } else {
      envContent += `\nDB_PORT=${foundPort}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    modified = true;
    
    console.log(`\n✅ Updated configuration:`);
    console.log(`  DB_SERVER: 127.0.0.1`);
    console.log(`  DB_PORT: ${foundPort}`);
    console.log('\n💡 This bypasses SQL Server Browser by using the direct port');
  } else {
    console.log('  ⚠️  Could not find port automatically');
    console.log('\n💡 Recommended Solutions:');
    console.log('  1. Start SQL Server Browser: sc start SQLBrowser (as Administrator)');
    console.log('  2. Or find port manually in SQL Server Configuration Manager');
    console.log('  3. Or switch to Windows Authentication (remove DB_PASSWORD from .env)');
  }
} else if (browserRunning) {
  console.log('\n✅ SQL Server Browser is running - connection should work now');
} else if (dbPort) {
  console.log('\n✅ Port is configured - connection should work (bypasses SQL Server Browser)');
}

if (modified) {
  console.log('\n📝 Configuration updated. Test connection: npm run test-db');
} else {
  console.log('\n📝 No changes needed. Test connection: npm run test-db');
}

console.log('\n' + '='.repeat(60));

