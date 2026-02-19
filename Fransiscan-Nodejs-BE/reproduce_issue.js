const http = require('http');
const jwt = require('jsonwebtoken');

const secret = 'very-secure-jwt-secret-key-generated-for-franciscan-app-2024!';
const token = jwt.sign({ userId: 1, churchId: 1, roleId: 1 }, secret, { expiresIn: '1h' });

const payload = JSON.stringify({
    applicationCode: '002-0',
    customerName: 'Test User',
    totalAmount: 100,
    payingAmount: 100,
    paymentMode: 'Cash',
    country: 'Singapore'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/invoices/individual',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
        'Authorization': `Bearer ${token}`
    }
};

console.log(`Sending request to http://localhost:3000/api/invoices/individual with token`);

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`BODY: ${data}`);
        console.log(`BODY LENGTH: ${data.length}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();
