/**
 * Diagnostic Script for Niche Booking Invoice Creation
 * 
 * This script helps diagnose why invoices are not being created or found
 * for new niche bookings.
 * 
 * Usage: node scripts/diagnose-niche-booking.js NAPP-52
 */

// Load environment variables from .env file if it exists
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { executeQuery, connectDatabase, closeDatabase } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function diagnoseNicheBooking(applicationCode) {
  if (!applicationCode) {
    console.error('Usage: node scripts/diagnose-niche-booking.js <APPLICATION_CODE>');
    console.error('Example: node scripts/diagnose-niche-booking.js NAPP-52');
    process.exit(1);
  }

  const normalizedCode = String(applicationCode).trim().toUpperCase();

  console.log('\n========================================');
  console.log(`DIAGNOSTIC REPORT FOR: ${normalizedCode}`);
  console.log('========================================\n');

  // Initialize database connection
  console.log('Initializing database connection...');
  console.log('Environment configuration:');
  console.log(`  DB_SERVER: ${process.env.DB_SERVER || 'localhost (default)'}`);
  console.log(`  DB_DATABASE: ${process.env.DB_DATABASE || 'FransiscanTest (default)'}`);
  console.log(`  DB_PORT: ${process.env.DB_PORT || '1433 (default)'}`);
  console.log(`  DB_INSTANCE: ${process.env.DB_INSTANCE || '(not set)'}`);
  console.log(`  DB_USER: ${process.env.DB_USER || '(not set - using Windows Auth)'}`);
  console.log(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '*** (set)' : '(not set - using Windows Auth)'}`);
  console.log('');
  
  try {
    await connectDatabase();
    console.log('✅ Database connection established\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error(`   Error code: ${error.code || 'UNKNOWN'}`);
    console.error(`   Error name: ${error.name || 'Error'}`);
    
    if (error.code === 'ELOGIN' || error.message?.includes('Login failed')) {
      console.error('\n⚠️  LOGIN ERROR DETECTED');
      console.error('This usually means:');
      console.error('  1. Windows Authentication failed (check SQL Server allows Windows Auth)');
      console.error('  2. SQL Server credentials are incorrect (if using SQL Auth)');
      console.error('  3. User account doesn\'t have permission to access the database');
      console.error('\nSolutions:');
      console.error('  - If using Windows Auth: Ensure your Windows user has SQL Server access');
      console.error('  - If using SQL Auth: Set DB_USER and DB_PASSWORD in .env file');
      console.error('  - Check SQL Server authentication mode (Windows Auth or Mixed Mode)');
    }
    
    console.error('\nPlease check:');
    console.error('1. SQL Server is running and accessible');
    console.error('2. Database connection settings in .env file (or environment variables)');
    console.error('3. Network connectivity to SQL Server');
    console.error('4. SQL Server authentication mode matches your configuration');
    console.error('\nTo create a .env file, copy env.example to .env and configure it.');
    process.exit(1);
  }

  try {
    // 1. Check if NicheApplication exists
    console.log('1. CHECKING NICHE APPLICATION...');
    const appQuery = `
      SELECT 
        NicheApplicationId,
        Code,
        Status,
        NicheId,
        ChurchId,
        AppliedDate,
        AgreementDate
      FROM NicheApplication WITH(NOLOCK)
      WHERE Code = @code
    `;
    const appResult = await executeQuery(appQuery, { code: normalizedCode });
    
    if (!appResult.recordset || appResult.recordset.length === 0) {
      console.log('   ❌ NicheApplication NOT FOUND');
      console.log(`   Application code "${normalizedCode}" does not exist in database.`);
      console.log('   This means the application was never created or the code is incorrect.\n');
    } else {
      const app = appResult.recordset[0];
      console.log('   ✅ NicheApplication FOUND');
      console.log(`   - Application ID: ${app.NicheApplicationId}`);
      console.log(`   - Code: ${app.Code}`);
      console.log(`   - Status: ${app.Status} (1=Captured/Draft, 3=Confirmed)`);
      console.log(`   - Niche ID: ${app.NicheId || 'NULL'}`);
      console.log(`   - Church ID: ${app.ChurchId}`);
      console.log(`   - Applied Date: ${app.AppliedDate || 'NULL'}`);
      console.log(`   - Agreement Date: ${app.AgreementDate || 'NULL'}\n`);
    }

    // 2. Check if NicheBooking exists
    console.log('2. CHECKING NICHE BOOKING...');
    const bookingQuery = `
      SELECT 
        nb.NicheBookingId,
        nb.Code AS BookingCode,
        nb.BookedDate,
        nb.BookingStatus,
        nb.NicheApplicationId,
        nb.NicheId,
        nb.ChurchId
      FROM NicheBooking nb WITH(NOLOCK)
      INNER JOIN NicheApplication na ON nb.NicheApplicationId = na.NicheApplicationId
      WHERE na.Code = @code
    `;
    const bookingResult = await executeQuery(bookingQuery, { code: normalizedCode });
    
    if (!bookingResult.recordset || bookingResult.recordset.length === 0) {
      console.log('   ❌ NicheBooking NOT FOUND');
      console.log('   No booking exists for this application.\n');
    } else {
      const booking = bookingResult.recordset[0];
      console.log('   ✅ NicheBooking FOUND');
      console.log(`   - Booking ID: ${booking.NicheBookingId}`);
      console.log(`   - Booking Code: ${booking.BookingCode || 'NULL'}`);
      console.log(`   - Booked Date: ${booking.BookedDate}`);
      console.log(`   - Booking Status: ${booking.BookingStatus} (1=Active/Confirmed)`);
      console.log(`   - Niche ID: ${booking.NicheId}`);
      console.log(`   - Church ID: ${booking.ChurchId}\n`);
    }

    // 3. Check Invoice by RefDocNumber in InvoiceDetail
    console.log('3. CHECKING INVOICE BY REFDOCNUMBER (InvoiceDetail)...');
    const invoiceDetailQuery = `
      SELECT DISTINCT
        i.InvoiceId,
        i.Code AS InvoiceCode,
        i.RefDocNumber AS InvoiceRefDocNumber,
        i.RefDocName AS InvoiceRefDocName,
        i.Status,
        i.TotalAmount,
        i.TransactionDate,
        id.InvoiceDetailId,
        id.RefDocNumber AS DetailRefDocNumber,
        id.RefDocName AS DetailRefDocName,
        id.ItemId,
        id.UnitAmount,
        id.LineTotalAmount,
        id.LineTaxAmount
      FROM Invoice i WITH(NOLOCK)
      INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
      WHERE LTRIM(RTRIM(UPPER(id.RefDocNumber))) = LTRIM(RTRIM(UPPER(@code)))
         OR LTRIM(RTRIM(UPPER(id.RefDocNumber))) = LTRIM(RTRIM(UPPER('I-' + @code)))
         OR LTRIM(RTRIM(UPPER(i.RefDocNumber))) = LTRIM(RTRIM(UPPER(@code)))
    `;
    const invoiceResult = await executeQuery(invoiceDetailQuery, { code: normalizedCode });
    
    if (!invoiceResult.recordset || invoiceResult.recordset.length === 0) {
      console.log('   ❌ INVOICE NOT FOUND by RefDocNumber');
      console.log(`   No invoice found with RefDocNumber="${normalizedCode}" or "I-${normalizedCode}"\n`);
      
      // Check for similar codes (with trailing spaces)
      console.log('   Checking for invoices with similar RefDocNumber (with trailing spaces)...');
      const similarQuery = `
        SELECT DISTINCT
          i.InvoiceId,
          i.Code AS InvoiceCode,
          i.RefDocNumber AS InvoiceRefDocNumber,
          id.RefDocNumber AS DetailRefDocNumber,
          i.TransactionDate
        FROM Invoice i WITH(NOLOCK)
        INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
        WHERE id.RefDocNumber LIKE @codePattern
           OR i.RefDocNumber LIKE @codePattern
        ORDER BY i.TransactionDate DESC
      `;
      const similarResult = await executeQuery(similarQuery, { 
        codePattern: `%${normalizedCode}%` 
      });
      
      if (similarResult.recordset && similarResult.recordset.length > 0) {
        console.log(`   ⚠️  Found ${similarResult.recordset.length} invoice(s) with similar RefDocNumber:`);
        similarResult.recordset.forEach((inv, idx) => {
          console.log(`   ${idx + 1}. Invoice ID: ${inv.InvoiceId}, Code: ${inv.InvoiceCode}`);
          console.log(`      Invoice RefDocNumber: "${inv.InvoiceRefDocNumber || 'NULL'}"`);
          console.log(`      Detail RefDocNumber: "${inv.DetailRefDocNumber || 'NULL'}"`);
        });
        console.log('   ⚠️  These may have trailing spaces or case differences.\n');
      } else {
        console.log('   No similar invoices found.\n');
      }
    } else {
      console.log(`   ✅ INVOICE FOUND (${invoiceResult.recordset.length} detail line(s))`);
      const invoice = invoiceResult.recordset[0];
      console.log(`   - Invoice ID: ${invoice.InvoiceId}`);
      console.log(`   - Invoice Code: ${invoice.InvoiceCode}`);
      console.log(`   - Invoice RefDocNumber: "${invoice.InvoiceRefDocNumber || 'NULL'}"`);
      console.log(`   - Invoice RefDocName: "${invoice.InvoiceRefDocName || 'NULL'}"`);
      console.log(`   - Status: ${invoice.Status} (1=Active, 2=Paid)`);
      console.log(`   - Total Amount: ${invoice.TotalAmount}`);
      console.log(`   - Transaction Date: ${invoice.TransactionDate}`);
      console.log(`   - Detail Lines: ${invoiceResult.recordset.length}`);
      console.log('\n   Invoice Details:');
      invoiceResult.recordset.forEach((detail, idx) => {
        console.log(`   ${idx + 1}. Item ID: ${detail.ItemId}, Amount: ${detail.UnitAmount}`);
        console.log(`      RefDocNumber: "${detail.DetailRefDocNumber || 'NULL'}"`);
        console.log(`      RefDocName: "${detail.DetailRefDocName || 'NULL'}"`);
        console.log(`      Tax: ${detail.LineTaxAmount || 0}`);
      });
      console.log('');
    }

    // 4. Check recent invoices for this church
    console.log('4. CHECKING RECENT INVOICES...');
    const recentQuery = `
      SELECT TOP 10
        i.InvoiceId,
        i.Code AS InvoiceCode,
        i.RefDocNumber AS InvoiceRefDocNumber,
        i.Status,
        i.TransactionDate,
        (SELECT TOP 1 id.RefDocNumber FROM InvoiceDetail id WHERE id.InvoiceId = i.InvoiceId) AS FirstDetailRefDocNumber,
        (SELECT TOP 1 id.RefDocName FROM InvoiceDetail id WHERE id.InvoiceId = i.InvoiceId) AS FirstDetailRefDocName
      FROM Invoice i WITH(NOLOCK)
      WHERE i.ChurchId = (SELECT TOP 1 ChurchId FROM NicheApplication WHERE Code = @code)
      ORDER BY i.TransactionDate DESC, i.InvoiceId DESC
    `;
    const recentResult = await executeQuery(recentQuery, { code: normalizedCode });
    
    if (recentResult.recordset && recentResult.recordset.length > 0) {
      console.log(`   Found ${recentResult.recordset.length} recent invoice(s):`);
      recentResult.recordset.forEach((inv, idx) => {
        console.log(`   ${idx + 1}. Invoice ID: ${inv.InvoiceId}, Code: ${inv.InvoiceCode}`);
        console.log(`      Invoice RefDocNumber: "${inv.InvoiceRefDocNumber || 'NULL'}"`);
        console.log(`      Detail RefDocNumber: "${inv.FirstDetailRefDocNumber || 'NULL'}"`);
        console.log(`      Detail RefDocName: "${inv.FirstDetailRefDocName || 'NULL'}"`);
        console.log(`      Date: ${inv.TransactionDate}`);
      });
      console.log('');
    } else {
      console.log('   No recent invoices found.\n');
    }

    // 5. Check inscription requests
    console.log('5. CHECKING INSCRIPTION REQUESTS...');
    const inscriptionQuery = `
      SELECT 
        nir.NicheInscriptionRequestId,
        nir.Code AS InscriptionCode,
        nir.NicheBookingId,
        nir.ChurchId,
        nir.ApplicationDate
      FROM NicheInscriptionRequest nir WITH(NOLOCK)
      INNER JOIN NicheBooking nb ON nir.NicheBookingId = nb.NicheBookingId
      INNER JOIN NicheApplication na ON nb.NicheApplicationId = na.NicheApplicationId
      WHERE na.Code = @code
    `;
    const inscriptionResult = await executeQuery(inscriptionQuery, { code: normalizedCode });
    
    if (!inscriptionResult.recordset || inscriptionResult.recordset.length === 0) {
      console.log('   ❌ INSCRIPTION REQUEST NOT FOUND');
      console.log('   No inscription request exists for this application.\n');
    } else {
      console.log(`   ✅ INSCRIPTION REQUEST FOUND (${inscriptionResult.recordset.length})`);
      inscriptionResult.recordset.forEach((ins, idx) => {
        console.log(`   ${idx + 1}. Inscription ID: ${ins.NicheInscriptionRequestId}`);
        console.log(`      Code: ${ins.InscriptionCode}`);
        console.log(`      Booking ID: ${ins.NicheBookingId}`);
        console.log(`      Church ID: ${ins.ChurchId}`);
        if (ins.ApplicationDate) {
          console.log(`      Application Date: ${ins.ApplicationDate}`);
        }
      });
      console.log('');
    }

    // 6. Summary and recommendations
    console.log('========================================');
    console.log('SUMMARY & RECOMMENDATIONS');
    console.log('========================================\n');
    
    const hasApplication = appResult.recordset && appResult.recordset.length > 0;
    const hasBooking = bookingResult.recordset && bookingResult.recordset.length > 0;
    const hasInvoice = invoiceResult.recordset && invoiceResult.recordset.length > 0;
    
    if (!hasApplication) {
      console.log('❌ CRITICAL: Application does not exist.');
      console.log('   → The application code may be incorrect or the application was never created.\n');
    } else if (!hasBooking) {
      console.log('❌ CRITICAL: Booking does not exist.');
      console.log('   → The booking creation may have failed. Check application logs.\n');
    } else if (!hasInvoice) {
      console.log('❌ CRITICAL: Invoice does not exist.');
      console.log('   → Invoice creation may have failed during booking creation.');
      console.log('   → Check application logs for "DIAGNOSTIC" entries.');
      console.log('   → Verify that items exist in the Item table for this church.');
      console.log('   → Check if RefDocNumber normalization is working correctly.\n');
    } else {
      console.log('✅ All checks passed! Invoice exists and should be accessible.\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR during diagnostic:', error);
    logger.error('Diagnostic script error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      console.log('\nClosing database connection...');
      await closeDatabase();
      console.log('✅ Database connection closed');
    } catch (closeError) {
      console.error('⚠️  Error closing database connection:', closeError.message);
    }
  }
}

// Run diagnostic
const applicationCode = process.argv[2];
diagnoseNicheBooking(applicationCode)
  .then(() => {
    console.log('Diagnostic complete.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

