const { executeQuery } = require('./src/config/database');
const fs = require('fs');

async function run() {
    const results = {};

    // 1. Search for anyone with ADELINE and TAN in their name
    results.adelineTanSearch = (await executeQuery(`
    SELECT PersonId, Name, IDNo, EmailID, AddressLine1 FROM Person WHERE Name LIKE '%ADELINE%' AND Name LIKE '%TAN%'
  `)).recordset;

    // 2. Search for anyone with KIM HUAT in their name (Anthony)
    results.kimHuatSearch = (await executeQuery(`
    SELECT PersonId, Name, IDNo, EmailID, AddressLine1 FROM Person WHERE Name LIKE '%KIM%' AND Name LIKE '%HUAT%'
  `)).recordset;

    // 3. Check Invoices for Anthony (Person 6304)
    results.invoicesFor6304 = (await executeQuery(`
    SELECT InvoiceId, Code, CustomerName, RefDocNumber FROM Invoice WHERE CustomerName LIKE '%KIM HUAT%' OR RefDocNumber = '3828-0'
  `)).recordset;

    // 4. Check Niche Applications for 'St Agnes' (the niche code for booking 2239)
    results.nicheAppsForStAgnes = (await executeQuery(`
    SELECT na.NicheApplicationId, na.Code, na.ApplicantName, na.ApplicantIDNo, n.Code as NicheCode
    FROM NicheApplication na
    JOIN Niche n ON na.NicheId = n.NicheId
    WHERE n.Code = 'St Agnes'
  `)).recordset;

    fs.writeFileSync('deep_analysis_2.json', JSON.stringify(results, null, 2));
    console.log('Deep analysis 2 written');
    process.exit();
}

run();
