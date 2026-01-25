const request = require('supertest');
const app = require('../src/app');

describe('Health Check', () => {
  test('GET /health should return 200', async() => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('OK');
    expect(response.body.environment).toBeDefined();
    expect(response.body.version).toBeDefined();
  });
});

describe('Root Endpoint', () => {
  test('GET / should return API information', async() => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body.message).toBe('Franciscan Backend API');
    expect(response.body.endpoints).toBeDefined();
  });
});

describe('Authentication Endpoints', () => {
  test('POST /api/auth/login should require username and password', async() => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('POST /api/auth/register should require valid data', async() => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});

describe('Protected Routes', () => {
  test('GET /api/users should require authentication', async() => {
    const response = await request(app)
      .get('/api/users')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Access token required');
  });
});
