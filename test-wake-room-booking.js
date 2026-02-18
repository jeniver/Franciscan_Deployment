const axios = require('axios');

// Test wake room booking creation
async function testWakeRoomBooking() {
  const baseUrl = 'http://192.168.1.24:3000/api';
  
  // First, let's get a valid wake room ID and church ID
  try {
    console.log('Testing wake room booking creation...\n');
    
    // Get wake rooms to find a valid wakeRoomId
    const wakeRoomsResponse = await axios.get(`${baseUrl}/wake-rooms`, {
      headers: {
        'Authorization': 'Bearer your-jwt-token-here' // Replace with actual token
      }
    });
    
    console.log('Available wake rooms:', wakeRoomsResponse.data);
    
    const wakeRoomId = wakeRoomsResponse.data.data?.[0]?.wakeRoomId;
    const churchId = wakeRoomsResponse.data.data?.[0]?.churchId;
    
    if (!wakeRoomId || !churchId) {
      console.log('Could not find valid wake room or church ID');
      return;
    }
    
    // Test payload that should pass validation
    const validPayload = {
      wakeRoomId: wakeRoomId,
      applicantName: 'John Doe',
      nameOfDeceased: 'Jane Smith',
      usingTimeFrom: new Date().toISOString(),
      usingTimeTo: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
      donationAmount: 100.00,
      applicantMobileNo: '+6591234567',
      churchId: churchId
    };
    
    console.log('Sending valid payload:', validPayload);
    
    try {
      const response = await axios.post(`${baseUrl}/wake-room-bookings`, validPayload, {
        headers: {
          'Authorization': 'Bearer your-jwt-token-here', // Replace with actual token
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Success response:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('Error response:', error.response.data);
        console.log('Status code:', error.response.status);
        console.log('Headers:', error.response.headers);
      } else {
        console.log('Error:', error.message);
      }
    }
    
  } catch (error) {
    console.log('Setup error:', error.message);
  }
}

// Run the test
testWakeRoomBooking();