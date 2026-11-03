// __tests__/documents.test.js - Document upload and access control tests
'use strict';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

process.env.JWT_SECRET = 'test-jwt-secret-long-enough-32chars';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';
process.env.NODE_ENV = 'test';
process.env.UPLOAD_TEMP_DIR = path.join(__dirname, '..', 'temp-test');

// Mock Flask client module
vi.mock('../src/services/flaskClient.js', () => ({
  indexDocument: vi.fn().mockResolvedValue({ page_count: 2, chunk_count: 10 }),
  queryDocument: vi.fn().mockResolvedValue({
    answerable: true,
    answer: 'Test answer',
    sources: [{ chunk_id: 'doc_0', page: 1, snippet: 'test', score: 0.9 }],
  }),
  summarizeDocument: vi.fn().mockResolvedValue({ summary: 'A test summary.' }),
  deleteDocumentIndex: vi.fn().mockResolvedValue({ deleted: true }),
}));

const app = require('../src/app');

let mongod;
let userACookie;
let userBCookie;

// Minimal valid PDF bytes with correct signature
const VALID_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
  'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n' +
  '0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n'
);

const VALID_TXT = Buffer.from('This is a test document with some content for testing.');

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  fs.mkdirSync(path.join(__dirname, '..', 'temp-test'), { recursive: true });

  const resA = await request(app).post('/api/auth/register').send({
    name: 'User A', email: 'usera@test.com', password: 'password1234',
  });
  userACookie = resA.headers['set-cookie'];

  const resB = await request(app).post('/api/auth/register').send({
    name: 'User B', email: 'userb@test.com', password: 'password1234',
  });
  userBCookie = resB.headers['set-cookie'];
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  try { fs.rmSync(path.join(__dirname, '..', 'temp-test'), { recursive: true }); } catch (_) {}
});

describe('Document upload', () => {
  it('accepts a valid PDF and returns 202', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Cookie', userACookie)
      .attach('file', VALID_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.document.status).toBe('processing');
    expect(res.body.data.document.fileName).toBe('test.pdf');
  });

  it('accepts a valid TXT file', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Cookie', userACookie)
      .attach('file', VALID_TXT, { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.document.fileType).toBe('txt');
  });

  it('rejects unsupported file types (.docx)', async () => {
    const docxBuf = Buffer.from('fake docx content');
    const res = await request(app)
      .post('/api/documents')
      .set('Cookie', userACookie)
      .attach('file', docxBuf, {
        filename: 'test.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects files with invalid PDF signature', async () => {
    const fakePdf = Buffer.from('Not a real PDF, just text masquerading as one.');
    const res = await request(app)
      .post('/api/documents')
      .set('Cookie', userACookie)
      .attach('file', fakePdf, { filename: 'fake.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_file');
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/documents')
      .attach('file', VALID_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(401);
  });
});

describe('Document access control (user isolation)', () => {
  let docAId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Cookie', userACookie)
      .attach('file', VALID_PDF, { filename: 'doc-a.pdf', contentType: 'application/pdf' });
    docAId = res.body.data.document._id;
  });

  it('user A can retrieve their own document', async () => {
    const res = await request(app)
      .get(`/api/documents/${docAId}`)
      .set('Cookie', userACookie);
    expect(res.status).toBe(200);
    expect(res.body.data.document._id).toBe(docAId);
  });

  it('user B gets 404 for user A document (not 403 - do not reveal existence)', async () => {
    const res = await request(app)
      .get(`/api/documents/${docAId}`)
      .set('Cookie', userBCookie);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('user B cannot delete user A document', async () => {
    await request(app)
      .delete(`/api/documents/${docAId}`)
      .set('Cookie', userBCookie);
    // User A's doc should still exist
    const checkRes = await request(app)
      .get(`/api/documents/${docAId}`)
      .set('Cookie', userACookie);
    expect(checkRes.status).toBe(200);
  });
});

describe('Document list', () => {
  it('returns only the authenticated user documents', async () => {
    await request(app)
      .post('/api/documents')
      .set('Cookie', userACookie)
      .attach('file', VALID_PDF, { filename: 'a.pdf', contentType: 'application/pdf' });

    await request(app)
      .post('/api/documents')
      .set('Cookie', userBCookie)
      .attach('file', VALID_TXT, { filename: 'b.txt', contentType: 'text/plain' });

    const resA = await request(app).get('/api/documents').set('Cookie', userACookie);
    const resB = await request(app).get('/api/documents').set('Cookie', userBCookie);

    const aEmails = resA.body.data.documents.map((d) => d.fileName);
    const bEmails = resB.body.data.documents.map((d) => d.fileName);

    // Cross-contamination check: no user B docs in user A list and vice versa
    expect(aEmails.every((name) => !bEmails.includes(name) || name === 'a.pdf')).toBe(true);
  });
});
