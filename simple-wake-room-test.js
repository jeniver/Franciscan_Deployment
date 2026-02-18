// Simple test to check wake room booking endpoint
const axios = require('axios');

async function simpleTest() {
  const baseUrl = 'http://192.168.1.24:3000/api';
  
  console.log('Testing wake room booking with minimal valid data...\n');
  
  // Test with the most basic valid payload
  const testData = {
    wakeRoomId: 1,
    applicantName: 'Test Applicant',
    nameOfDeceased: 'Test Deceased',
    usingTimeFrom: '2024-01-15T10:00:00.000Z',
    usingTimeTo: '2024-01-15T12:00:00.000Z'
  };
  
  console.log('Sending test data:', testData);
  
  try {
    const response = await axios.post(`${baseUrl}/wake-room-bookings`, testData, {
      headers: {
        'Authorization': 'Bearer your-jwt-token-here',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Error Status:', error.response.status);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Network Error:', error.message);
    }
  }
}

simpleTest();