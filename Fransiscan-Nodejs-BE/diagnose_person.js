const { executeQuery } = require('./src/config/database');
const fs = require('fs');

async function q(name, query, params) {
  try {
    const result = await executeQuery(query, params);
    return result.recordset;
  } catch (err) {
    return { error: err.message };
  }
}

async function diagnose() {
  const NAME = 'ADELINE TAN SUE LIN';
  const ID_NO = '0000000000';
  const PERSON_ID = 6857;

  const results = {};

  results.person = await q('Person Table', `
    SELECT PersonId, Name, IDNo, EmailID FROM Person 
    WHERE Name LIKE @name OR IDNo = @idNo OR PersonId = @personId
  `, { name: `%${NAME}%`, idNo: ID_NO, personId: PERSON_ID });

  results.nicheBookings = await q('NicheBooking Table', `
    SELECT NicheBookingId, Code, BookedDate, ContactPersonId, NomineeId, NomineeId2
    FROM NicheBooking
    WHERE ContactPersonId = @personId 
       OR NomineeId = @personId 
       OR NomineeId2 = @personId
  `, { personId: PERSON_ID });

  results.beneficiaries = await q('NicheBookingBeneficiary Table', `
    SELECT nbb.NicheBookingBeneficiaryId, nbb.NicheBookingId, nbb.Name, nbb.IDNo, nbb.BeneficiaryId, nb.Code as BookingCode
    FROM NicheBookingBeneficiary nbb
    JOIN NicheBooking nb ON nbb.NicheBookingId = nb.NicheBookingId
    WHERE nbb.Name LIKE @name OR (nbb.IDNo = @idNo AND nbb.IDNo <> '0000000000')
  `, { name: `%${NAME}%`, idNo: ID_NO });

  results.nicheApps = await q('NicheApplication Table', `
    SELECT NicheApplicationId, Code, AppliedDate, ApplicantName, ApplicantIDNo
    FROM NicheApplication
    WHERE ApplicantName LIKE @name OR (ApplicantIDNo = @idNo AND ApplicantIDNo <> '0000000000')
  `, { name: `%${NAME}%`, idNo: ID_NO });

  results.wakeRoom = await q('WakeRoomBooking Table', `
    SELECT WakeRoomBookingId, Code, UsingDate, ApplicantName, ApplicantIDNo, NameOfDeceased
    FROM WakeRoomBooking
    WHERE ApplicantName LIKE @name OR (ApplicantIDNo = @idNo AND ApplicantIDNo <> '0000000000')
       OR NameOfDeceased LIKE @name
  `, { name: `%${NAME}%`, idNo: ID_NO });

  results.invoices = await q('Invoice Table', `
    SELECT InvoiceId, Code, TransactionDate, CustomerName, RefDocNumber
    FROM Invoice
    WHERE CustomerName LIKE @name
  `, { name: `%${NAME}%` });

  results.receipts = await q('Receipt Table', `
    SELECT ReceiptId, Code, TransactionDate, CustomerName, RefDocNumber
    FROM Receipt
    WHERE CustomerName LIKE @name
  `, { name: `%${NAME}%` });

  fs.writeFileSync('diagnosis_output.json', JSON.stringify(results, null, 2));
  console.log('Diagnosis written to diagnosis_output.json');
  process.exit();
}

diagnose();
