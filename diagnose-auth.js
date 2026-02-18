const { connectDatabase, executeQuery } = require('./Fransiscan-Nodejs-BE/src/config/database');

async function diagnoseAuth() {
  console.log('🔍 Diagnosing authentication issues...\n');
  
  try {
    await connectDatabase();
    console.log('✅ Database connected\n');
    
    // Check existing users
    console.log('📋 Checking existing users:');
    const users = await executeQuery('SELECT UserId, UserName, Email, RoleId, ChurchId, IsActive FROM [User]');
    
    if (users.recordset.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    users.recordset.forEach(user => {
      console.log(`  ID: ${user.UserId}, Username: ${user.UserName}, Email: ${user.Email}, Role: ${user.RoleId}, Church: ${user.ChurchId}, Active: ${user.IsActive}`);
    });
    
    console.log(`\n📊 Total users: ${users.recordset.length}\n`);
    
    // Try to login with existing users
    console.log('🔑 Testing login with existing users:');
    
    for (const user of users.recordset) {
      console.log(`   Testing user: ${user.UserName}`);
      
      // Try common passwords
      const passwords = ['password', '123456', user.UserName, 'admin123'];
      
      for (const password of passwords) {
        try {
          const loginData = JSON.stringify({ username: user.UserName, password: password });
          
          const http = require('http');
          const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/login/login',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(loginData)
            }
          };
          
          const result = await new Promise((resolve, reject) => {
            const req = http.request(options, res => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => resolve({ statusCode: res.statusCode, data: data }));
            });
            req.on('error', error => reject(error));
            req.write(loginData);
            req.end();
          });
          
          console.log(`     Password '${password}': Status ${result.statusCode}`);
          if (result.statusCode === 200) {
            console.log(`     ✅ SUCCESS! Valid credentials found:`);
            console.log(`        Username: ${user.UserName}`);
            console.log(`        Password: ${password}`);
            const response = JSON.parse(result.data);
            console.log(`        Token: ${response.data?.token ? response.data.token.substring(0, 20) + '...' : 'No token'}`);
            return; // Found working credentials
          }
        } catch (error) {
          console.log(`     Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n❌ No working credentials found');
    console.log('💡 You may need to reset passwords or create a new user');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

diagnoseAuth();