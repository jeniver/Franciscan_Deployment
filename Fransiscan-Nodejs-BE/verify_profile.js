const { executeQuery } = require('./src/config/database');
const fs = require('fs');

async function run() {
    const NAME = 'ADELINE TAN SUE LIN';
    const ID_NO = '0000000000';
    const PERSON_ID = 6857;

    const results = {};

    // 1. Person
    const persons = await executeQuery('SELECT * FROM Person WHERE PersonId = @id', { id: PERSON_ID });
    results.person = persons.recordset[0];

    // 2. NicheBookings
    const nicheBookings = await executeQuery(`
    SELECT nb.*, na.Code as AppCode 
    FROM NicheBooking nb 
    LEFT JOIN NicheApplication na ON nb.NicheApplicationId = na.NicheApplicationId
    WHERE nb.ContactPersonId = @id OR nb.NomineeId = @id OR nb.NomineeId2 = @id
  `, { id: PERSON_ID });
    results.nicheBookings = nicheBookings.recordset;

    // 3. Beneficiaries (by name)
    const beneficiaries = await executeQuery(`
    SELECT * FROM NicheBookingBeneficiary WHERE Name LIKE @name
  `, { name: `%${NAME}%` });
    results.beneficiaries = beneficiaries.recordset;

    // 4. Applications (by name)
    const apps = await executeQuery(`
    SELECT * FROM NicheApplication WHERE ApplicantName LIKE @name
  `, { name: `%${NAME}%` });
    results.applications = apps.recordset;

    // 5. Invoices (by name)
    const invoices = await executeQuery(`
    SELECT * FROM Invoice WHERE CustomerName LIKE @name
  `, { name: `%${NAME}%` });
    results.invoices = invoices.recordset;

    fs.writeFileSync('verification_results.json', JSON.stringify(results, null, 2));
    console.log('Results written to verification_results.json');
    process.exit();
}

run();
