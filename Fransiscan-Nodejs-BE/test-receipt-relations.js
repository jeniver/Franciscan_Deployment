/**
 * Test script to check for any receipts related to application code 1303-1
 */

const { connectDatabase, executeQuery } = require('./src/config/database');

async function checkRelatedReceipts() {
  try {
    await connectDatabase();
    console.log('Checking for any receipts related to application code 1303-1...\n');
    
    // Check for receipts that might be related to this application in various ways
    const query = `
      SELECT 
        r.ReceiptId,
        r.Code,
        r.CustomerName,
        r.PayeeName,
        r.InvoiceId,
        r.TransactionDate
      FROM Receipt r WITH(NOLOCK)
      WHERE r.Code LIKE '%1303-1%'
        OR r.CustomerName LIKE '%1303-1%'
        OR r.PayeeName LIKE '%1303-1%'
      ORDER BY r.ReceiptId DESC
    `;
    
    const result = await executeQuery(query);
    console.log('Related receipts found:', result.recordset.length);
    
    if (result.recordset.length > 0) {
      result.recordset.forEach(rec => {
        console.log('Receipt:', {
          ReceiptId: rec.ReceiptId,
          Code: rec.Code,
          CustomerName: rec.CustomerName,
          PayeeName: rec.PayeeName,
          InvoiceId: rec.InvoiceId,
          TransactionDate: rec.TransactionDate
        });
      });
    } else {
      console.log('No receipts found related to "1303-1"');
    }
    
    // Also check if there are any invoices linked to receipt records that might match
    console.log('\nChecking if any invoices exist with RefDocNumber "1303-1"...');
    const invoiceQuery = `
      SELECT 
        InvoiceId,
        Code,
        RefDocNumber,
        CustomerName,
        TransactionDate
      FROM Invoice WITH(NOLOCK)
      WHERE RefDocNumber = '1303-1'
      ORDER BY InvoiceId DESC
    `;
    
    const invoiceResult = await executeQuery(invoiceQuery);
    console.log('Invoices with RefDocNumber "1303-1":', invoiceResult.recordset.length);
    
    if (invoiceResult.recordset.length > 0) {
      invoiceResult.recordset.forEach(inv => {
        console.log('Invoice:', {
          InvoiceId: inv.InvoiceId,
          Code: inv.Code,
          RefDocNumber: inv.RefDocNumber,
          CustomerName: inv.CustomerName,
          TransactionDate: inv.TransactionDate
        });
      });
    } else {
      console.log('No invoices found with RefDocNumber "1303-1"');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRelatedReceipts();