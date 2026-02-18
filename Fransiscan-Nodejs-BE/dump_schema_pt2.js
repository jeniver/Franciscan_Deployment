const { executeQuery } = require('./src/config/database');
const fs = require('fs');

async function listCols(table) {
    try {
        const result = await executeQuery(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table`, { table });
        return result.recordset.map(r => r.COLUMN_NAME);
    } catch (err) {
        return { error: err.message };
    }
}

async function run() {
    const tables = ['Niche', 'NicheRow', 'NicheWall', 'Chapel', 'WakeRoom'];
    const results = {};
    for (const table of tables) {
        results[table] = await listCols(table);
    }
    fs.writeFileSync('schema_dump_part2.json', JSON.stringify(results, null, 2));
    console.log('Schema dumped to schema_dump_part2.json');
    process.exit();
}

run();
