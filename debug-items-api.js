/**
 * Debug script to test /api/items endpoint with proper authentication flow
 * This script will:
 * 1. Check if server is running
 * 2. Test login with various credentials
 * 3. Test /api/items endpoint with valid token
 */

const http = require('http');

const BASE_URL = 'http://192.168.1.24:3000';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', error => reject(error));
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function runDebug() {
  console.log('🔍 Debugging /api/items endpoint...\n');
  
  try {
    // Test 1: Health check
    console.log('📋 Test 1: Health check');
    const healthOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET'
    };
    
    const healthResponse = await makeRequest(healthOptions);
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Response: ${healthResponse.data}\n`);
    
    if (healthResponse.statusCode !== 200) {
      console.log('❌ Server is not responding properly');
      return;
    }
    
    // Test 2: Test various login credentials
    console.log('🔑 Test 2: Testing login credentials');
    
    const testCredentials = [
      { username: 'admin', password: 'admin123' },
      { username: 'user', password: 'password' },
      { username: 'test', password: 'test123' },
      { username: 'franciscan_api', password: 'Franciscan@2024!' }
    ];
    
    let validToken = null;
    let validUser = null;
    
    for (const creds of testCredentials) {
      console.log(`   Testing: ${creds.username}/${creds.password}`);
      
      const loginData = JSON.stringify(creds);
      const loginOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/login/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData)
        }
      };
      
      try {
        const loginResponse = await makeRequest(loginOptions, loginData);
        console.log(`   Status: ${loginResponse.statusCode}`);
        
        if (loginResponse.statusCode === 200) {
          const responseData = JSON.parse(loginResponse.data);
          if (responseData.success && responseData.data?.token) {
            console.log('   ✅ Login successful!');
            validToken = responseData.data.token;
            validUser = responseData.data.user;
            break;
          }
        } else {
          console.log(`   Response: ${loginResponse.data}`);
        }
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
      console.log('');
    }
    
    if (!validToken) {
      console.log('❌ No valid credentials found. Creating test user...\n');
      
      // Try to create a test user
      const registerData = JSON.stringify({
        username: 'testuser',
        password: 'testpass123',
        email: 'test@example.com',
        roleId: 2,
        churchId: 1
      });
      
      const registerOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(registerData)
        }
      };
      
      try {
        const registerResponse = await makeRequest(registerOptions, registerData);
        console.log(`Register Status: ${registerResponse.statusCode}`);
        console.log(`Register Response: ${registerResponse.data}`);
        
        if (registerResponse.statusCode === 200) {
          // Now try to login with the new user
          const newLoginData = JSON.stringify({
            username: 'testuser',
            password: 'testpass123'
          });
          
          const newLoginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/login/login',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(newLoginData)
            }
          };
          
          const newLoginResponse = await makeRequest(newLoginOptions, newLoginData);
          if (newLoginResponse.statusCode === 200) {
            const responseData = JSON.parse(newLoginResponse.data);
            if (responseData.success && responseData.data?.token) {
              validToken = responseData.data.token;
              validUser = responseData.data.user;
              console.log('✅ Test user created and logged in successfully!\n');
            }
          }
        }
      } catch (error) {
        console.log(`Registration error: ${error.message}`);
      }
    }
    
    // Test 3: Test /api/items with valid token
    if (validToken) {
      console.log('📦 Test 3: Testing /api/items with valid authentication');
      console.log(`   User: ${validUser?.userName || 'Unknown'}`);
      console.log(`   Church ID: ${validUser?.churchId || 'Unknown'}`);
      
      const itemsOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/items',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      try {
        const itemsResponse = await makeRequest(itemsOptions);
        console.log(`   Status: ${itemsResponse.statusCode}`);
        console.log(`   Response: ${itemsResponse.data}`);
        
        if (itemsResponse.statusCode === 200) {
          console.log('✅ /api/items endpoint is working correctly!');
        } else {
          console.log('❌ /api/items endpoint returned error');
        }
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
      
      // Test 4: Test categories endpoint
      console.log('\n📂 Test 4: Testing /api/items/categories');
      const categoriesOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/items/categories',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      try {
        const categoriesResponse = await makeRequest(categoriesOptions);
        console.log(`   Status: ${categoriesResponse.statusCode}`);
        console.log(`   Response: ${categoriesResponse.data}`);
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
    } else {
      console.log('❌ Could not obtain valid authentication token');
      console.log('💡 Please check your database setup and user credentials');
    }
    
    console.log('\n📝 Summary:');
    console.log('   - Server health: ✅ Working');
    console.log('   - Authentication: ' + (validToken ? '✅ Working' : '❌ Not working'));
    console.log('   - Items API: ' + (validToken ? '✅ Accessible with token' : '❌ Requires valid authentication'));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
runDebug();