// __tests__/auth.test.js - Authentication endpoint tests
'use strict';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Set env before importing app
process.env.JWT_SECRET = 'test-jwt-secret-long-enough-32chars';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';
process.env.NODE_ENV = 'test';

const app = require('../src/app');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('POST /api/auth/register', () => {
  it('creates a new user and returns a cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password1234',
    });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects short passwords (min 10 chars)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'short@example.com',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('validation');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'First',
      email: 'dup@example.com',
      password: 'password1234',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Second',
      email: 'dup@example.com',
      password: 'password1234',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('email_taken');
  });

  it('rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'not-an-email',
      password: 'password1234',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation');
  });

  it('does not leak passwordHash in response', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Hash Test',
      email: 'hashtest@example.com',
      password: 'password1234',
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login Test',
      email: 'login@example.com',
      password: 'password1234',
    });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'password1234',
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_credentials');
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password1234',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_credentials');
  });
});

describe('GET /api/auth/me', () => {
  it('returns user with valid token cookie', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Me Test',
      email: 'me@example.com',
      password: 'password1234',
    });
    const cookie = reg.headers['set-cookie'];
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@example.com');
  });

  it('returns 401 without any token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('returns 401 with invalid Authorization header token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer totally.invalid.token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_token');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Logout Test',
      email: 'logout@example.com',
      password: 'password1234',
    });
    const cookie = reg.headers['set-cookie'];
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Protected routes without token', () => {
  it('GET /api/documents returns 401', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
  });

  it('GET /api/conversations returns 401', async () => {
    const res = await request(app).get('/api/conversations');
    expect(res.status).toBe(401);
  });
});
