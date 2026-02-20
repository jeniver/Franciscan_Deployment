/**
 * Test script for Gate of Life update API
 * Run: node scripts/test-gate-of-life-update.js
 * Requires: LOGIN_EMAIL, LOGIN_PASSWORD, TEST_APPLICATION_CODE in .env or pass as args
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function getAuthToken() {
  const email = process.env.LOGIN_EMAIL || process.argv[2];
  const password = process.env.LOGIN_PASSWORD || process.argv[3];
  if (!email || !password) {
    console.error('Usage: node test-gate-of-life-update.js [email] [password] [applicationCode]');
    console.error('Or set LOGIN_EMAIL, LOGIN_PASSWORD, TEST_APPLICATION_CODE in .env');
    process.exit(1);
  }
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.token) {
    console.error('Login failed:', data);
    process.exit(1);
  }
  return data.token;
}

async function testUpdate(token, applicationCode) {
  const code = applicationCode || process.env.TEST_APPLICATION_CODE || 'GOL-00106';
  const payload = {
    applicantName: 'Test Applicant Updated',
    applicantMobileNo: '91234567',
    donationAmount: 300,
    details: [{ nameToEngrave: 'Test Name' }],
    requestSameBrick: false
  };

  console.log(`\nPUT ${API_BASE}/api/gates-of-life/${code}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const res = await fetch(`${API_BASE}/api/gates-of-life/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log(`\nStatus: ${res.status}`);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (res.ok && data.success) {
    console.log('\n✓ Gate of Life update test PASSED');
  } else {
    console.log('\n✗ Gate of Life update test FAILED');
    process.exit(1);
  }
}

async function main() {
  const appCode = process.argv[4] || process.env.TEST_APPLICATION_CODE;
  console.log('Gate of Life Update Test');
  console.log('API Base:', API_BASE);
  const token = await getAuthToken();
  console.log('Logged in successfully');
  await testUpdate(token, appCode);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
