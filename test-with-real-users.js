/**
 * Test script for /api/items endpoint with actual user credentials
 * Uses the discovered users from the database
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

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

async function testApiWithActualUsers() {
  console.log('🔍 Testing /api/items endpoint with actual database users...\n');
  
  // Test the known users from database
  const knownUsers = [
    { username: 'col_admin', password: 'Bonaventure_13' },
    { username: '1002', password: '1002@1' },
    { username: 'columbariuam1', password: 'columbariuam1' }
  ];
  
  for (const user of knownUsers) {
    console.log(`🔐 Testing user: ${user.username}`);
    
    // Test login
    const loginData = JSON.stringify(user);
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
      console.log(`   Login Status: ${loginResponse.statusCode}`);
      
      if (loginResponse.statusCode === 200) {
        const loginData = JSON.parse(loginResponse.data);
        const token = loginData.data?.token;
        
        if (token) {
          console.log(`   ✅ Login successful! Token: ${token.substring(0, 20)}...`);
          
          // Test /api/items endpoint
          console.log(`   📦 Testing /api/items with token...`);
          const itemsOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/items',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          };
          
          const itemsResponse = await makeRequest(itemsOptions);
          console.log(`   Items Status: ${itemsResponse.statusCode}`);
          console.log(`   Items Response: ${itemsResponse.data.substring(0, 100)}${itemsResponse.data.length > 100 ? '...' : ''}`);
          
          if (itemsResponse.statusCode === 200) {
            console.log(`   ✅ SUCCESS! /api/items is working with user ${user.username}`);
            return { success: true, user: user, token: token };
          }
          
          // Test categories endpoint
          console.log(`   📂 Testing /api/items/categories...`);
          const categoriesOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/items/categories',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          };
          
          const categoriesResponse = await makeRequest(categoriesOptions);
          console.log(`   Categories Status: ${categoriesResponse.statusCode}`);
          console.log(`   Categories Response: ${categoriesResponse.data}`);
        }
      } else {
        console.log(`   Login failed: ${loginResponse.data}`);
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('❌ No working user credentials found');
  return { success: false };
}

// Run the test
testApiWithActualUsers().then(result => {
  console.log('\n📝 Final Summary:');
  console.log(`   API Working: ${result.success ? '✅ Yes' : '❌ No'}`);
  if (result.success) {
    console.log(`   Working User: ${result.user.username}`);
    console.log(`   Token Available: ${result.token ? '✅ Yes' : '❌ No'}`);
  }
});