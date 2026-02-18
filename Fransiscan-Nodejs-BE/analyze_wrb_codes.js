const { executeQuery, getPool } = require('./src/config/database');
const logger = require('./src/utils/logger');

async function checkCodes() {
    try {
        // Get last 10 bookings
        const query = `
      SELECT TOP 20 WakeRoomBookingId, Code, ChurchId, WakeRoomId, ApplicantName
      FROM WakeRoomBooking
      ORDER BY WakeRoomBookingId DESC
    `;
        const result = await executeQuery(query);
        console.table(result.recordset);

        // Check if 001 corresponds to ChurchId or WakeRoomId
        if (result.recordset.length > 0) {
            const sample = result.recordset[0];
            console.log(`Sample: Code=${sample.Code}, ChurchId=${sample.ChurchId}, WakeRoomId=${sample.WakeRoomId}`);
            // Check Wake Room Code for this ID
            const wrQuery = `SELECT Code FROM WakeRoom WHERE WakeRoomId = ${sample.WakeRoomId}`;
            const wrResult = await executeQuery(wrQuery);
            console.log('Wake Room Code:', wrResult.recordset[0]?.Code);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkCodes();
