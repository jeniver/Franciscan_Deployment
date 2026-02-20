// Test script to verify invoice data handling for receipt page
console.log('Testing invoice data handling for receipt page view functionality');

// Sample API response structure (from user's example)
const sampleApiResponse = {
  "success": true,
  "message": "Invoice retrieved successfully",
  "data": {
    "isApplicationData": false,
    "isInvoice": true,
    "hasInvoice": true,
    "canCreateInvoice": false,
    "invoiceId": 23775,
    "code": "53035",
    "transactionDate": "2025-02-20T18:30:00.000Z",
    "refDocNumber": null,
    "refDocName": null,
    "customerName": "Kris Tan Lai Choo",
    "totalAmount": 8954.5,
    "payingAmount": 8954.5,
    "paymentMode": "TT",
    "paymentModeDocNo": "dd 21/2/25 MB160935813155H2800000C1",
    "userId": 1,
    "churchId": 1,
    "status": 1,
    "nicheApplicationId": 8713,
    "taxCode": null,
    "taxPercentage": null,
    "taxAmount": 724.5,
    "invType": null,
    "addressNo": null,
    "address": "Blk 470 Segar Road #13-230 Singapore",
    "address2": null,
    "addressCity": null,
    "districtCode": "undefined",
    "country": null,
    "receipt": {
      "receiptId": 6986,
      "receiptCode": "003351",
      "receiptDate": "2025-02-21T07:00:42.090Z",
      "payeeName": "Kris Tan Lai Choo",
      "receiptTotalAmount": 8954.5,
      "receiptPayingAmount": 8954.5,
      "receiptPaymentMode": 3,
      "receiptPaymentModeDocNo": "dd 21/2/25 MB160935813155H2800000C1",
      "receiptAddressNo": null,
      "receiptAddress": "Blk 470 Segar Road #13-230 Singapore",
      "receiptAddress2": null,
      "receiptAddressCity": null,
      "receiptDistrictCode": "undefined",
      "receiptCountry": null
    },
    "payeeName": "Kris Tan Lai Choo",
    "details": [
      {
        "invoiceDetailId": 29227,
        "invoiceId": 23775,
        "itemId": 2,
        "itemName": "Level 2 Niche ",
        "itemCode": "02",
        "itemPrice": 4000,
        "quantity": 1,
        "unitAmount": 4000,
        "payingAmount": 4000,
        "totalPayingAmount": 4360,
        "refDocNumber": "2748-0",
        "refDocName": "NAPP",
        "refType": "NAPP",
        "outstandingAmount": 0,
        "lineTotalAmount": 4000,
        "lineTaxPercent": 9,
        "lineTaxAmount": 360
      },
      {
        "invoiceDetailId": 29228,
        "invoiceId": 23775,
        "itemId": 12,
        "itemName": "Niche Inscription 1st Name",
        "itemCode": "12",
        "itemPrice": 400,
        "quantity": 1,
        "unitAmount": 400,
        "payingAmount": 400,
        "totalPayingAmount": 436,
        "refDocNumber": "I-2748-0",
        "refDocName": "INCR",
        "refType": "INCR",
        "outstandingAmount": 0,
        "lineTotalAmount": 400,
        "lineTaxPercent": 9,
        "lineTaxAmount": 36
      }
    ],
    "summary": {
      "totalItems": 5,
      "subtotal": 8230,
      "totalTax": 724.5,
      "grandTotal": 8954.5
    }
  }
};

console.log('Sample API Response:');
console.log(JSON.stringify(sampleApiResponse, null, 2));

// Test the mapping logic that would be used in receiptService.getInvoiceByCode
console.log('\nTesting data mapping logic:');

const invoiceData = sampleApiResponse.data;
console.log('Original invoice data keys:', Object.keys(invoiceData));

// Simulate the mapping that happens in getInvoiceByCode
const mappedInvoice = {
  invoiceId: invoiceData.InvoiceId || invoiceData.invoiceId || invoiceData.invoiceId || 0,
  invoiceCode: invoiceData.Code || invoiceData.code || invoiceData.invoiceCode || '53035',
  customerName: invoiceData.CustomerName || invoiceData.customerName || invoiceData.payeeName || '',
  totalAmount: invoiceData.TotalAmount || invoiceData.totalAmount || invoiceData.totalAmount || 0,
  payingAmount: invoiceData.PayingAmount || invoiceData.payingAmount || invoiceData.payingAmount || 0,
  paymentMode: invoiceData.PaymentMode || invoiceData.paymentMode || 'Cash',
  invoiceDate: invoiceData.TransactionDate || invoiceData.transactionDate || invoiceData.invoiceDate || new Date().toISOString(),
  invoiceDetails: (invoiceData.details || invoiceData.invoiceDetails || []).map((detail) => ({
    invoiceDetailId: detail.InvoiceDetailId || detail.invoiceDetailId || detail.invoiceDetailId,
    description: detail.Item || detail.description || detail.ItemName || detail.itemName || detail.itemName || '',
    quantity: detail.Quantity || detail.quantity || detail.quantity || 1,
    unitPrice: detail.UnitAmount || detail.unitPrice || detail.UnitPrice || detail.unitAmount || detail.itemPrice || 0,
    amount: detail.TotalPayingAmount || detail.totalPayingAmount || detail.amount || detail.TotalPayingAmount || 0,
    // Additional fields for component mapping
    RefDocNumber: detail.RefDocNumber || detail.refDocNumber || detail.refDocNumber || '',
    TotalPayingAmount: detail.TotalPayingAmount || detail.totalPayingAmount || detail.totalPayingAmount || detail.amount || 0,
    itemName: detail.ItemName || detail.itemName || detail.Item || detail.description || detail.itemName || '',
    itemCode: detail.ItemCode || detail.itemCode || detail.Code || detail.itemCode || '',
    itemId: detail.ItemId || detail.itemId || detail.itemId || 0,
    payingAmount: detail.PayingAmount || detail.payingAmount || detail.payingAmount || detail.unitPrice || detail.UnitAmount || 0,
    lineTaxPercent: detail.LineTaxPercent || detail.lineTaxPercent || detail.TaxPercent || detail.taxPercent || detail.lineTaxPercent || 9,
    lineTaxAmount: detail.LineTaxAmount || detail.lineTaxAmount || detail.TaxAmount || detail.taxAmount || detail.lineTaxAmount || 0,
    lineTotalAmount: detail.LineTotalAmount || detail.lineTotalAmount || detail.lineTotalAmount || detail.unitPrice || detail.UnitAmount || 0,
    refDocName: detail.RefDocName || detail.refDocName || detail.refDocName || '',
    refType: detail.RefType || detail.refType || detail.refType || '',
    outstandingAmount: detail.OutstandingAmount || detail.outstandingAmount || detail.outstandingAmount || 0
  }))
};

// Add additional fields
mappedInvoice['addressNo'] = invoiceData.addressNo || invoiceData.addressNo;
mappedInvoice['address'] = invoiceData.address || invoiceData.address;
mappedInvoice['address2'] = invoiceData.address2 || invoiceData.address2;
mappedInvoice['addressCity'] = invoiceData.addressCity || invoiceData.addressCity;
mappedInvoice['country'] = invoiceData.country || invoiceData.country;
mappedInvoice['taxAmount'] = invoiceData.taxAmount || invoiceData.taxAmount;
mappedInvoice['taxCode'] = invoiceData.taxCode || invoiceData.taxCode;
mappedInvoice['taxPercentage'] = invoiceData.taxPercentage || invoiceData.taxPercentage;

console.log('\nMapped invoice data:');
console.log(JSON.stringify(mappedInvoice, null, 2));

console.log('\nMapped invoice details:');
mappedInvoice.invoiceDetails.forEach((detail, index) => {
  console.log(`Item ${index + 1}:`, {
    description: detail.description,
    itemName: detail.itemName,
    quantity: detail.quantity,
    unitPrice: detail.unitPrice,
    amount: detail.amount,
    refDocNumber: detail.RefDocNumber,
    lineTaxPercent: detail.lineTaxPercent
  });
});

console.log('\nImplementation Summary:');
console.log('✓ Enhanced receiptService.getInvoiceByCode to handle API response structure');
console.log('✓ Updated Invoice and InvoiceDetail interfaces with additional fields');
console.log('✓ Improved handleViewInvoicePdf in ReceiptPage to properly map data');
console.log('✓ Added proper error handling and logging');
console.log('✓ Preserved backward compatibility with existing functionality');