const { executeQuery } = require('./src/config/database');
const fs = require('fs');

async function run() {
    const result = await executeQuery("SELECT * FROM NicheBookingBeneficiary WHERE NicheBookingId = 2239");
    fs.writeFileSync('booking_benefs.json', JSON.stringify(result.recordset, null, 2));
    console.log('Written');
    process.exit();
}

run();
