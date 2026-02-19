const { executeQuery } = require('./src/config/database');

async function testQuery(name, query, params) {
    try {
        console.log(`\n--- Testing ${name} ---`);
        const result = await executeQuery(query, params);
        if (result.recordset.length > 0) {
            console.table(result.recordset);
        } else {
            console.log('No records found.');
        }
    } catch (err) {
        console.error(`ERROR in ${name}:`, err.message);
    }
}

async function run() {
    const NAME = 'ADELINE TAN SUE LIN';
    const ID_NO = '0000000000';
    const PERSON_ID = 6857;
    const nameParams = { personId: PERSON_ID, personName: NAME, personIdNo: ID_NO };

    // Niche Booking - Removed Code
    await testQuery('Niche Bookings', `
      SELECT TOP 5
        nb.NicheBookingId, nb.BookedDate, nb.BookingStatus,
        nb.NicheId, nb.NicheApplicationId, nb.ContactPersonId, nb.NomineeId, nb.NomineeId2,
        n.Code as NicheCode, nw.Name as WallName, nr.Name as RowName,
        ch.Name as ChapelName
      FROM NicheBooking nb
      LEFT JOIN Niche n ON nb.NicheId = n.NicheId
      LEFT JOIN NicheRow nr ON n.NicheRowlId = nr.NicheRowlId
      LEFT JOIN NicheWall nw ON nr.NicheWallId = nw.NicheWallId
      LEFT JOIN Chapel ch ON nw.ChapelId = ch.ChapelId
      WHERE nb.ContactPersonId = @personId
         OR nb.NomineeId = @personId
         OR nb.NomineeId2 = @personId
  `, nameParams);

    // Niche Application
    await testQuery('Niche Applications', `
      SELECT TOP 5
        na.NicheApplicationId, na.Code, na.AppliedDate, na.Status,
        na.ApplicantName, na.ApplicantIDNo, na.NicheId
      FROM NicheApplication na
      WHERE na.ApplicantName = @personName OR na.ApplicantIDNo = @personIdNo
  `, nameParams);

    // Wake Room Booking
    await testQuery('Wake Room Bookings', `
      SELECT TOP 5
        wrb.WakeRoomBookingId, wrb.Code, wrb.UsingDate, wrb.Status,
        wrb.ApplicantName, wrb.ApplicantIDNo, wrb.NameOfDeceased
      FROM WakeRoomBooking wrb
      WHERE wrb.ApplicantName = @personName OR wrb.ApplicantIDNo = @personIdNo OR wrb.NameOfDeceased = @personName
  `, nameParams);

    // Invoices
    await testQuery('Invoices', `
      SELECT TOP 5
        i.InvoiceId, i.Code, i.TransactionDate, i.CustomerName, i.RefDocNumber
      FROM Invoice i
      WHERE i.CustomerName = @personName
  `, nameParams);

    // Receipts
    await testQuery('Receipts', `
    SELECT TOP 5
      r.ReceiptId, r.Code, r.TransactionDate, r.CustomerName, r.RefDocNumber
    FROM Receipt r
    WHERE r.CustomerName = @personName
  `, nameParams);

    process.exit();
}

run();
