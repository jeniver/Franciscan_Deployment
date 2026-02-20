const { executeQuery, connectDatabase } = require('./src/config/database');
require('dotenv').config();

async function checkDb() {
    try {
        await connectDatabase();
        console.log('Database connected');

        const code = '002-0';
        console.log(`Checking WakeRoomBooking for code: ${code}`);

        // Check WakeRoomBooking with 'Code' column
        const wrQuery = `SELECT * FROM WakeRoomBooking WHERE Code = '${code}'`;
        const wrResult = await executeQuery(wrQuery);
        console.log(`WakeRoomBooking found: ${wrResult.recordset.length}`);
        if (wrResult.recordset.length > 0) {
            console.log('WakeRoomBooking:', wrResult.recordset[0]);
        } else {
            // Try searching by ID if the code is actually an ID-like string
            const wrQueryAll = `SELECT TOP 5 WakeRoomBookingId, Code FROM WakeRoomBooking ORDER BY WakeRoomBookingId DESC`;
            const wrResultAll = await executeQuery(wrQueryAll);
            console.log('Recent WakeRoomBookings:', wrResultAll.recordset);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

checkDb();
