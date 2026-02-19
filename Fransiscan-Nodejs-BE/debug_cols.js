const { executeQuery } = require('./src/config/database');

async function test(table, nameCol) {
    try {
        const r = await executeQuery(`SELECT TOP 1 * FROM ${table}`);
        console.log(`${table} OK. Columns:`, Object.keys(r.recordset[0]).join(', '));
    } catch (err) {
        console.log(`${table} FAILED:`, err.message);
    }
}

async function run() {
    await test('Person');
    await test('NicheBooking');
    await test('NicheBookingBeneficiary');
    await test('NicheApplication');
    await test('WakeRoomBooking');
    process.exit();
}

run();
