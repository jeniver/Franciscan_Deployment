
const express = require('express');
const ApplicationService = require('../src/services/ApplicationService');
const InvoiceService = require('../src/services/InvoiceService');
const InvoiceRepository = require('../src/repositories/InvoiceRepository');
const ReceiptService = require('../src/services/ReceiptService');
const ReceiptRepository = require('../src/repositories/ReceiptRepository');
const logger = require('../src/utils/logger');
require('dotenv').config();

async function runTests() {
    console.log('🚀 Starting Verification Tests...');
    const churchId = 1;
    const userId = 1;

    try {
        // Test 1: ApplicationService Resolution
        console.log('\n--- Test 1: ApplicationService Resolution ---');
        const codesToTest = ['001-0', '1', 'NAPP-1', 'I-1'];
        for (const code of codesToTest) {
            const details = await ApplicationService.getApplicationDetails(code, churchId);
            if (details) {
                console.log(`✅ Code ${code} resolved as ${details.Type} (${details.ApplicantName || 'No Name'})`);
            } else {
                console.log(`❌ Code ${code} failed to resolve`);
            }
        }

        // Test 2: Invoice Blocking by Existing Receipt
        console.log('\n--- Test 2: Invoice Blocking by Existing Receipt ---');
        const receiptRepo = new ReceiptRepository();
        const { executeQuery } = require('../src/config/database');
        const existingReceiptQuery = `
    SELECT TOP 1 rd.RefDocNumber, r.Code 
    FROM MisalaniousReceiptDetail rd
    JOIN Receipt r ON rd.ReceiptId = r.ReceiptId
    WHERE r.ChurchId = @churchId AND r.Status > 0
  `;
        const erResult = await executeQuery(existingReceiptQuery, { churchId });

        if (erResult.recordset.length > 0) {
            const { RefDocNumber, Code } = erResult.recordset[0];
            console.log(`Found existing receipt ${Code} for application ${RefDocNumber}`);

            const invoiceService = new InvoiceService(new InvoiceRepository()); // Modified this line
            const result = await invoiceService.saveInvoice(
                { customerName: 'Test Customer', transactionDate: new Date() },
                [{ itemId: 1, refDocNumber: RefDocNumber, refDocName: 'NAPP', refType: 'NAPP', unitAmount: 100, quantity: 1, totalNoTax: 100, payingAmount: 100, totalPayingAmount: 100 }],
                userId,
                churchId
            );

            if (!result.success && result.error.code === 'RECEIPT_ALREADY_EXISTS') {
                console.log(`✅ Successfully blocked invoice creation for ${RefDocNumber} due to existing receipt: ${result.error.message}`);
            } else {
                console.log(`❌ Failed to block invoice creation:`, result);
            }
        } else {
            console.log('⚠️ No existing receipt found in DB to test blocking logic.');
        }

        // Test 3: Receipt One-to-One with Invoice
        console.log('\n--- Test 3: Receipt One-to-One with Invoice ---');
        const existingInvoiceQuery = `
    SELECT TOP 1 i.InvoiceId, i.Code, r.Code as ReceiptCode, r.Status as ReceiptStatus
    FROM Invoice i
    JOIN Receipt r ON i.InvoiceId = r.InvoiceId
    WHERE i.ChurchId = @churchId AND i.Status > 0 AND r.Status > 0
  `;
        const eiResult = await executeQuery(existingInvoiceQuery, { churchId });

        if (eiResult.recordset.length > 0) {
            const { InvoiceId, Code, ReceiptCode, ReceiptStatus } = eiResult.recordset[0];
            console.log(`Found existing invoice ${Code} (ID: ${InvoiceId}) with receipt ${ReceiptCode} (Status: ${ReceiptStatus})`);

            const repo = new ReceiptRepository();
            const checkResult = await repo.findByInvoiceId(InvoiceId, churchId);
            console.log(`Repository check for InvoiceId ${InvoiceId}: ${checkResult ? `Found receipt ${checkResult.code || checkResult.Code} with status ${checkResult.status || checkResult.Status}` : 'NOT FOUND'}`);

            const receiptService = new ReceiptService(repo);
            const result = await receiptService.createReceiptFromInvoice(
                { invoiceId: InvoiceId, code: Code },
                [],
                userId,
                churchId
            );

            if (!result.success && result.error.code === 'RECEIPT_ALREADY_EXISTS') {
                console.log(`✅ Successfully blocked duplicate receipt for invoice ${Code}: ${result.error.message}`);
            } else {
                console.log(`❌ Failed to block duplicate receipt for invoice ${Code}:`, JSON.stringify(result, null, 2));
            }
        } else {
            console.log('⚠️ No invoice with receipt found in DB to test one-to-one logic.');
        }
    } catch (err) {
        console.error('💥 Test execution error:', err);
    }

    process.exit(0);
}

runTests().catch(err => {
    console.error('💥 Test Suite Failed:', err);
    process.exit(1);
});
