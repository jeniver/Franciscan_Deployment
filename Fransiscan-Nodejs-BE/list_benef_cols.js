const { executeQuery } = require('./src/config/database');
const fs = require('fs');

async function run() {
    const r = await executeQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'NicheBookingBeneficiary'");
    fs.writeFileSync('benef_cols.json', JSON.stringify(r.recordset.map(c => c.COLUMN_NAME), null, 2));
    process.exit();
}

run();
