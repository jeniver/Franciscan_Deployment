const { executeQuery, connectDatabase } = require('./src/config/database');
require('dotenv').config();

async function checkDb() {
    try {
        await connectDatabase();
        console.log('Database connected');

        const code = '002-0';
        console.log(`Checking for code: ${code}`);

        // Check NicheApplication
        const nicheQuery = `SELECT * FROM NicheApplication WHERE Code = '${code}'`;
        const nicheResult = await executeQuery(nicheQuery);
        console.log(`NicheApplication found: ${nicheResult.recordset.length}`);
        if (nicheResult.recordset.length > 0) {
            console.log('NicheApplication:', nicheResult.recordset[0]);
        }

        // Check EngraveWallApplication
        const golaQuery = `SELECT * FROM EngraveWallApplication WHERE Code = '${code}'`;
        const golaResult = await executeQuery(golaQuery);
        console.log(`EngraveWallApplication found: ${golaResult.recordset.length}`);
        if (golaResult.recordset.length > 0) {
            console.log('EngraveWallApplication:', golaResult.recordset[0]);
        }

        // Check if it exists with wildcards?
        const wildcardQuery = `SELECT Code, ChurchId FROM NicheApplication WHERE Code LIKE '%002-0%'`;
        const wildcardResult = await executeQuery(wildcardQuery);
        console.log(`Wildcard NicheApplication found: ${wildcardResult.recordset.length}`);
        wildcardResult.recordset.forEach(r => console.log(r));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

checkDb();
