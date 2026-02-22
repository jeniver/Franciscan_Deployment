const { executeQuery } = require('./src/config/database');

async function viewSP(spName) {
    try {
        const query = `
      SELECT definition
      FROM sys.sql_modules
      WHERE object_id = OBJECT_ID(@spName)
    `;
        const result = await executeQuery(query, { spName });
        if (result.recordset && result.recordset.length > 0) {
            console.log(result.recordset[0].definition);
        } else {
            console.log('SP not found');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

const spName = process.argv[2];
if (!spName) {
    console.error('Please provide an SP name');
    process.exit(1);
}
viewSP(spName);
