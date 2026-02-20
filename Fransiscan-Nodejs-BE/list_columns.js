const { executeQuery } = require('./src/config/database');

async function listCols(table) {
    try {
        const result = await executeQuery(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table`, { table });
        const cols = result.recordset.map(r => r.COLUMN_NAME);
        process.stdout.write(`${table}: ${cols.join(', ')}\n`);
    } catch (err) {
        process.stdout.write(`Failed ${table}: ${err.message}\n`);
    }
}

async function run() {
    await listCols('Person');
    await listCols('NicheBooking');
    await listCols('NicheBookingBeneficiary');
    await listCols('NicheApplication');
    await listCols('WakeRoomBooking');
    await listCols('Invoice');
    await listCols('Receipt');
    process.exit();
}

run();
