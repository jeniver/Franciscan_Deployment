// Comprehensive test for wake room booking API
const axios = require('axios');

async function comprehensiveTest() {
  const baseUrl = 'http://192.168.1.24:3000/api';
  
  console.log('=== Wake Room Booking API Test ===\n');
  
  try {
    // Test 1: Check if we can get wake rooms (to verify auth and basic connectivity)
    console.log('1. Testing wake rooms endpoint...');
    try {
      const wakeRoomsResponse = await axios.get(`${baseUrl}/wake-rooms`, {
        headers: {
          'Authorization': 'Bearer your-jwt-token-here'
        }
      });
      console.log('✓ Wake rooms endpoint accessible');
      console.log('Sample wake room:', wakeRoomsResponse.data.data?.[0]);
    } catch (error) {
      console.log('✗ Wake rooms endpoint failed:', error.response?.data || error.message);
      return;
    }
    
    // Test 2: Test validation with various payloads
    console.log('\n2. Testing validation with different payloads...');
    
    const testCases = [
      {
        name: 'Missing required fields',
        payload: {},
        shouldFail: true
      },
      {
        name: 'Invalid wakeRoomId (string instead of number)',
        payload: {
          wakeRoomId: 'invalid',
          applicantName: 'John Doe',
          nameOfDeceased: 'Jane Smith',
          usingTimeFrom: new Date().toISOString(),
          usingTimeTo: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        },
        shouldFail: true
      },
      {
        name: 'Invalid date format',
        payload: {
          wakeRoomId: 1,
          applicantName: 'John Doe',
          nameOfDeceased: 'Jane Smith',
          usingTimeFrom: 'invalid-date',
          usingTimeTo: 'invalid-date'
        },
        shouldFail: true
      },
      {
        name: 'Valid payload',
        payload: {
          wakeRoomId: 1,
          applicantName: 'John Doe',
          nameOfDeceased: 'Jane Smith',
          usingTimeFrom: new Date().toISOString(),
          usingTimeTo: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          donationAmount: 100.00,
          applicantMobileNo: '+6591234567'
        },
        shouldFail: false
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n  Testing: ${testCase.name}`);
      console.log('  Payload:', testCase.payload);
      
      try {
        const response = await axios.post(`${baseUrl}/wake-room-bookings`, testCase.payload, {
          headers: {
            'Authorization': 'Bearer your-jwt-token-here',
            'Content-Type': 'application/json'
          }
        });
        
        if (testCase.shouldFail) {
          console.log('  ✗ Expected failure but got success:', response.data);
        } else {
          console.log('  ✓ Success:', response.data);
        }
      } catch (error) {
        if (error.response) {
          if (testCase.shouldFail) {
            console.log('  ✓ Expected failure:', error.response.status, error.response.data);
          } else {
            console.log('  ✗ Unexpected failure:', error.response.status, error.response.data);
          }
        } else {
          console.log('  ✗ Network error:', error.message);
        }
      }
    }
    
    // Test 3: Check what the actual validation middleware is returning
    console.log('\n3. Testing raw validation response...');
    try {
      const response = await axios.post(`${baseUrl}/wake-room-bookings`, {}, {
        headers: {
          'Authorization': 'Bearer your-jwt-token-here',
          'Content-Type': 'application/json'
        }
      });
      console.log('Unexpected success:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('Validation error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.log('Test setup failed:', error.message);
  }
}

comprehensiveTest();