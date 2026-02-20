const { executeQuery } = require('./src/config/database');
const logger = require('./src/utils/logger');

async function checkLatestWakeRoomCodes() {
    try {
        const query = `
      SELECT TOP 10 WakeRoomBookingId, Code, ChurchId, CreatedDate
      FROM WakeRoomBooking
      ORDER BY WakeRoomBookingId DESC
    `;

        const result = await executeQuery(query);
        console.log('Latest Wake Room Bookings:');
        console.table(result.recordset);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkLatestWakeRoomCodes();
