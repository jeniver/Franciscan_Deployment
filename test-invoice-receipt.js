/**
 * Test script to check /api/invoices/1303-1 endpoint for receipt details
 */

const http = require('http');

async function testInvoiceEndpoint() {
  console.log('🔍 Testing /api/invoices/1303-1 endpoint...\n');
  
  // Step 1: Login to get token
  const loginData = JSON.stringify({ 
    username: 'col_admin', 
    password: 'Bonaventure_13' 
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/login/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };
  
  try {
    const loginResponse = await new Promise((resolve, reject) => {
      const req = http.request(loginOptions, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch (e) {
            reject(new Error(`Failed to parse login response: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });
    
    if (loginResponse.statusCode !== 200 || !loginResponse.data.success || !loginResponse.data.data?.token) {
      console.log('❌ Login failed:', loginResponse);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token obtained');
    
    // Step 2: Test the invoice endpoint
    const invoiceOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/invoices/1303-1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const invoiceResponse = await new Promise((resolve, reject) => {
      const req = http.request(invoiceOptions, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: data }); // Return raw data if JSON parsing fails
          }
        });
      });
      
      req.on('error', reject);
      req.end();
    });
    
    console.log(`📊 Invoice API Response Status: ${invoiceResponse.statusCode}`);
    console.log('📋 Invoice API Response Data:');
    console.log(JSON.stringify(invoiceResponse.data, null, 2));
    
    // Analyze the response
    if (invoiceResponse.data && typeof invoiceResponse.data === 'object') {
      console.log('\n🔍 Analysis:');
      
      if (invoiceResponse.data.receipt) {
        console.log('✅ Receipt data found in response');
        console.log('Receipt Info:', {
          receiptCode: invoiceResponse.data.receipt.receiptCode,
          receiptDate: invoiceResponse.data.receipt.receiptDate,
          payeeName: invoiceResponse.data.receipt.payeeName,
          totalAmount: invoiceResponse.data.receipt.receiptTotalAmount
        });
      } else {
        console.log('❌ No receipt data found in invoice response');
      }
      
      if (invoiceResponse.data.hasInvoice !== undefined) {
        console.log(`Has Invoice: ${invoiceResponse.data.hasInvoice}`);
      }
      
      if (invoiceResponse.data.details) {
        console.log(`Invoice Details Count: ${invoiceResponse.data.details.length}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing invoice endpoint:', error.message);
  }
}

// Run the test
testInvoiceEndpoint();