require('dotenv').config();
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const net = require('net');

async function findPort() {
  // Helper to test port with timeout
  function testPort(host, port, timeout = 1000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let connected = false;
      
      socket.setTimeout(timeout);
      socket.once('connect', () => {
        connected = true;
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, host);
    });
  }
console.log('🔍 Advanced SQL Server Port Finder\n');
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
const dbServer = (envContent.match(/^DB_SERVER=(.*)$/m) || [])[1]?.trim() || 'localhost';

console.log(`📋 Current DB_SERVER: ${dbServer}\n`);

// Method 1: Check SQL Server Error Logs
console.log('Method 1: Checking SQL Server Error Logs...');
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
    console.log(`  ✅ Found log: ${logPath}`);
    try {
      // Read last 1000 lines (most recent)
      const logContent = fs.readFileSync(logPath, 'utf8');
      const lines = logContent.split('\n').slice(-1000).join('\n');
      
      // Look for port information
      const portMatches = [
        ...lines.matchAll(/Server is listening on \[ 'any' <ipv4> (\d+) \]/g),
        ...lines.matchAll(/TCP Dynamic Ports.*?(\d+)/g),
        ...lines.matchAll(/TCP Port.*?(\d+)/g)
      ];
      
      if (portMatches.length > 0) {
        // Get the most recent port
        const ports = portMatches.map(m => parseInt(m[1])).filter(p => p > 1024 && p < 65535);
        if (ports.length > 0) {
          foundPort = ports[ports.length - 1];
          console.log(`  ✅ Found port in log: ${foundPort}`);
          break;
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Could not read log: ${error.message}`);
    }
  }
}

// Method 2: Check SQL Server Configuration via Registry
if (!foundPort) {
  console.log('\nMethod 2: Checking Windows Registry...');
  try {
    // Try to read SQL Server instance port from registry
    const regPath = 'HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\Instance Names\\SQL';
    try {
      const instances = execSync(`reg query "${regPath}"`, { encoding: 'utf8', stdio: 'pipe' });
      if (instances.includes('SQLEXPRESS')) {
        console.log('  ✅ Found SQLEXPRESS instance in registry');
        // Try to get the port from TCP/IP settings
        const tcpPath = 'HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\MSSQL*.SQLEXPRESS\\MSSQLServer\\SuperSocketNetLib\\Tcp\\IPAll';
        // This is complex, so we'll skip for now
      }
    } catch (e) {
      // Registry access might require admin
    }
  } catch (error) {
    console.log('  ⚠️  Registry check failed (may require admin)');
  }
}

// Method 3: Try common SQL Server Express ports
if (!foundPort) {
  console.log('\nMethod 3: Testing common SQL Server Express ports...');
  const commonPorts = [1433, 1434, 49200, 49201, 49202, 49203, 49204, 49205];
  const serverHost = dbServer.includes('\\') ? dbServer.split('\\')[0] : 'localhost';
  
  // Test ports
  for (const portToTest of commonPorts) {
    const isOpen = await testPort(serverHost, portToTest);
    if (isOpen) {
      console.log(`  ✅ Port ${portToTest} is open and accepting connections`);
      foundPort = portToTest;
      break;
    }
  }
}

// Method 4: Use SQLCMD or PowerShell to query
if (!foundPort) {
  console.log('\nMethod 4: Querying via SQLCMD/PowerShell...');
  try {
    // Try to use sqlcmd to get connection info
    const sqlcmdTest = execSync('sqlcmd -L', { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
    console.log('  ℹ️  SQLCMD available');
  } catch (error) {
    console.log('  ⚠️  SQLCMD not available or failed');
  }
}

// Update .env if port found
if (foundPort) {
  console.log(`\n✅ Found SQL Server port: ${foundPort}`);
  console.log('\n📝 Updating .env file...');
  
  const serverHost = dbServer.includes('\\') ? dbServer.split('\\')[0] : 'localhost';
  const instanceName = dbServer.includes('\\') ? dbServer.split('\\')[1] : '';
  
  // Update DB_SERVER to remove instance
  envContent = envContent.replace(/^DB_SERVER=.*$/m, `DB_SERVER=${serverHost}`);
  
  // Update or add DB_PORT
  if (envContent.includes('DB_PORT=')) {
    envContent = envContent.replace(/^DB_PORT=.*$/m, `DB_PORT=${foundPort}`);
  } else {
    envContent += `\nDB_PORT=${foundPort}`;
  }
  
  // Add instance name if needed
  if (instanceName && !envContent.includes('DB_INSTANCE=')) {
    envContent += `\nDB_INSTANCE=${instanceName}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Configuration updated:');
  console.log(`   DB_SERVER: ${serverHost}`);
  console.log(`   DB_PORT: ${foundPort}`);
  if (instanceName) {
    console.log(`   DB_INSTANCE: ${instanceName}`);
  }
  console.log('\n💡 This bypasses SQL Server Browser by using the direct port');
  console.log('   Test connection: npm run test-db');
} else {
  console.log('\n❌ Could not automatically find the port');
  console.log('\n💡 Manual Steps:');
  console.log('   1. Open SQL Server Configuration Manager');
  console.log('   2. Navigate to: SQL Server Network Configuration > Protocols for SQLEXPRESS');
  console.log('   3. Right-click "TCP/IP" > Properties > IP Addresses tab');
  console.log('   4. Find "TCP Dynamic Ports" or "TCP Port" under "IPAll"');
  console.log('   5. Add to .env: DB_PORT=<port_number>');
  console.log('   6. Change DB_SERVER to: localhost (remove \\SQLEXPRESS)');
  console.log('\n   OR');
  console.log('   1. Start SQL Server Browser: sc start SQLBrowser (as Administrator)');
  console.log('   2. Set it to auto-start: sc config SQLBrowser start= auto');
}

console.log('\n' + '='.repeat(60));
}

// Run the async function
findPort().catch(console.error);

