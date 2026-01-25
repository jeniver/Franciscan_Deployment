const { execSync } = require('child_process');
const os = require('os');

console.log('🔧 SQL Server Browser Service Helper\n');
console.log('='.repeat(60));

if (os.platform() !== 'win32') {
  console.log('❌ This script is for Windows only');
  process.exit(1);
}

console.log('\n1. Checking SQL Server Browser Service Status:');
console.log('-'.repeat(60));

try {
  const result = execSync('sc query SQLBrowser', { encoding: 'utf8', stdio: 'pipe' });
  
  if (result.includes('RUNNING')) {
    console.log('  ✅ SQL Server Browser is RUNNING');
    console.log('\n✅ No action needed. The service is already running.');
    process.exit(0);
  } else if (result.includes('STOPPED')) {
    console.log('  ⚠️  SQL Server Browser is STOPPED');
    console.log('\n2. Attempting to start SQL Server Browser:');
    console.log('-'.repeat(60));
    
    try {
      execSync('sc start SQLBrowser', { encoding: 'utf8', stdio: 'pipe' });
      console.log('  ✅ SQL Server Browser service started successfully!');
      console.log('\n✅ Service started. You can now test the database connection.');
      console.log('   Run: npm run test-db');
    } catch (error) {
      console.log('  ❌ Failed to start service automatically');
      console.log('\n💡 Manual Steps:');
      console.log('   1. Open PowerShell as Administrator');
      console.log('   2. Run: sc start SQLBrowser');
      console.log('   3. Or use Services.msc to start "SQL Server Browser" service');
      process.exit(1);
    }
  } else {
    console.log('  ❓ SQL Server Browser service status unknown');
    console.log('\n💡 Try starting it manually:');
    console.log('   sc start SQLBrowser');
  }
} catch (error) {
  console.log('  ❓ Could not check SQL Server Browser service');
  console.log('  💡 This might require administrator privileges');
  console.log('\n💡 Manual Steps:');
  console.log('   1. Open PowerShell as Administrator');
  console.log('   2. Run: sc query SQLBrowser');
  console.log('   3. If stopped, run: sc start SQLBrowser');
  console.log('   4. Or use Services.msc:');
  console.log('      - Press Win+R, type "services.msc"');
  console.log('      - Find "SQL Server Browser"');
  console.log('      - Right-click and select "Start"');
  process.exit(1);
}

