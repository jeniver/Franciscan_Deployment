require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔧 Database Configuration Fix Tool\n');
console.log('='.repeat(60));

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('💡 Creating .env file from env.example...');
  
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  if (fs.existsSync(envExamplePath)) {
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envPath, exampleContent);
    console.log('✅ Created .env file from env.example');
  } else {
    console.log('❌ env.example not found. Please create .env manually.');
    process.exit(1);
  }
}

// Read current .env
let envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
let modified = false;

console.log('\n📝 Current Configuration:');
console.log('-'.repeat(60));

// Check current DB_SERVER
const dbServerMatch = envContent.match(/^DB_SERVER=(.*)$/m);
const currentDbServer = dbServerMatch ? dbServerMatch[1].trim() : 'not set';

console.log(`  DB_SERVER: ${currentDbServer}`);

// Check if using Windows Auth
const dbPasswordMatch = envContent.match(/^DB_PASSWORD=(.*)$/m);
const hasPassword = dbPasswordMatch && dbPasswordMatch[1].trim() !== '';

console.log(`  Using SQL Auth: ${hasPassword ? 'Yes' : 'No (Windows Auth)'}`);

// Determine the fix needed
console.log('\n🔍 Analysis:');
console.log('-'.repeat(60));

if (currentDbServer === 'localhost' || currentDbServer === '127.0.0.1') {
  console.log('  ⚠️  DB_SERVER is set to localhost');
  console.log('  💡 SQL Server is running as a named instance (SQLEXPRESS)');
  console.log('  💡 Need to change DB_SERVER to use the named instance');
  
  // Update DB_SERVER
  const newDbServer = hasPassword ? 'localhost\\SQLEXPRESS' : '.\\SQLEXPRESS';
  
  envContent = envContent.replace(
    /^DB_SERVER=.*$/m,
    `DB_SERVER=${newDbServer}`
  );
  
  console.log(`\n✅ Updated DB_SERVER to: ${newDbServer}`);
  modified = true;
} else if (currentDbServer.includes('SQLEXPRESS') || currentDbServer.includes('\\')) {
  console.log('  ✅ DB_SERVER already configured for named instance');
} else {
  console.log('  ⚠️  DB_SERVER might need adjustment');
  console.log(`  Current value: ${currentDbServer}`);
}

// Check if SQL Server Browser is needed
if (!hasPassword && (currentDbServer.includes('\\') || envContent.includes('SQLEXPRESS'))) {
  console.log('\n⚠️  Important: For named instances with Windows Auth:');
  console.log('  - SQL Server Browser service must be running');
  console.log('  - Or use the specific port for the named instance');
  console.log('  - To start SQL Server Browser: sc start SQLBrowser');
}

// Write updated .env if modified
if (modified) {
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Configuration updated!');
  console.log('\n📋 Next Steps:');
  console.log('  1. Verify SQL Server Browser service is running (for named instances)');
  console.log('  2. Test connection: npm run diagnose-db');
  console.log('  3. Or test connection: npm run test-db');
} else {
  console.log('\n✅ Configuration looks correct');
  console.log('\n💡 If connection still fails, check:');
  console.log('  1. SQL Server Browser service is running');
  console.log('  2. TCP/IP protocol is enabled in SQL Server Configuration Manager');
  console.log('  3. Windows Firewall allows SQL Server connections');
}

console.log('\n' + '='.repeat(60));

