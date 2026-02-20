const { executeQuery } = require('./src/config/database');
const fs = require('fs');

async function run() {
    const result = await executeQuery("SELECT TOP 50 * FROM NicheBookingBeneficiary WHERE Name LIKE '%TAN SUE LIN%'");
    fs.writeFileSync('tan_sue_lin_beneficiaries.json', JSON.stringify(result.recordset, null, 2));
    console.log('Results written');
    process.exit();
}

run();
