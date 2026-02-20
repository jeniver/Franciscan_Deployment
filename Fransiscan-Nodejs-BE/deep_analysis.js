const { executeQuery } = require('./src/config/database');
const fs = require('fs');

async function run() {
    const NAME = 'ADELINE TAN SUE LIN';
    const TARGET_NAME = 'TAN SUE LIN';

    const results = {};

    // 1. Search for People with this name but DIFFERENT IDNo (if any)
    results.duplicates = (await executeQuery(`
    SELECT PersonId, Name, IDNo, EmailID, MobileNo, AddressLine1, AddressLine2 
    FROM Person 
    WHERE Name LIKE @name AND (IDNo <> '0000000000' AND IDNo IS NOT NULL)
  `, { name: `%${TARGET_NAME}%` })).recordset;

    // 2. Search for ANY record in Person table with her name
    results.allByName = (await executeQuery(`
    SELECT PersonId, Name, IDNo, EmailID 
    FROM Person 
    WHERE Name LIKE @name
  `, { name: `%${TARGET_NAME}%` })).recordset;

    // 3. Search for her name in OTHER tables where it might be a string but not PersonId
    // JOIN with NicheApplication to get the Code
    results.asBeneficiary = (await executeQuery(`
    SELECT nbb.Name, nbb.IDNo, na.Code as AppCode, nb.NicheBookingId
    FROM NicheBookingBeneficiary nbb
    JOIN NicheBooking nb ON nbb.NicheBookingId = nb.NicheBookingId
    LEFT JOIN NicheApplication na ON nb.NicheApplicationId = na.NicheApplicationId
    WHERE nbb.Name LIKE @name
  `, { name: `%${TARGET_NAME}%` })).recordset;

    results.asApplicantInNiche = (await executeQuery(`
    SELECT ApplicantName, ApplicantIDNo, Code, Status
    FROM NicheApplication
    WHERE ApplicantName LIKE @name
  `, { name: `%${TARGET_NAME}%` })).recordset;

    results.asApplicantInWake = (await executeQuery(`
    SELECT ApplicantName, ApplicantIDNo, Code, Status
    FROM WakeRoomBooking
    WHERE ApplicantName LIKE @name
  `, { name: `%${TARGET_NAME}%` })).recordset;

    // 4. Check the "Related" person 6304
    results.relatedPerson6304 = (await executeQuery(`
    SELECT PersonId, Name, IDNo, EmailID, MobileNo FROM Person WHERE PersonId = 6304
  `)).recordset[0];

    fs.writeFileSync('deep_analysis.json', JSON.stringify(results, null, 2));
    console.log('Deep analysis written to deep_analysis.json');
    process.exit();
}

run();
