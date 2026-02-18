const { executeQuery } = require('./src/config/database');
const fs = require('fs');

async function test(table) {
    try {
        const r = await executeQuery(`SELECT TOP 1 * FROM ${table}`);
        return Object.keys(r.recordset[0]);
    } catch (err) {
        return `FAILED: ${err.message}`;
    }
}

async function run() {
    const result = {
        Person: await test('Person'),
        NicheBooking: await test('NicheBooking'),
        NicheBookingBeneficiary: await test('NicheBookingBeneficiary'),
        NicheApplication: await test('NicheApplication'),
        WakeRoomBooking: await test('WakeRoomBooking')
    };
    fs.writeFileSync('cols_debug.json', JSON.stringify(result, null, 2));
    process.exit();
}

run();
