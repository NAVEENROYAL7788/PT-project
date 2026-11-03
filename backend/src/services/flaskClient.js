// src/services/flaskClient.js
// Internal client for calling the Flask AI service.
// Only Express calls Flask; Flask is never directly exposed to the browser.
'use strict';

const FormData = require('form-data');
const fetch = require('node-fetch');
const config = require('../config');

const INTERNAL_HEADERS = {
  'X-Internal-Token': config.internalServiceToken,
};

/**
 * Make a JSON request to Flask.
 * Throws an error with .flaskError=true on Flask-level errors.
 */
async function flaskRequest(method, path, body = null, timeoutMs = config.flaskTimeoutMs) {
  const url = `${config.flaskBaseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...INTERNAL_HEADERS,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const json = await res.json();
    if (!json.ok) {
      const error = new Error(json.error?.message || 'Flask returned an error.');
      error.flaskCode = json.error?.code;
      error.status = res.status;
      error.flaskError = true;
      throw error;
    }
    return json.data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`AI service request timed out after ${timeoutMs}ms.`);
      timeoutErr.code = 'ai_timeout';
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    if (err.flaskError) throw err;
    const connErr = new Error('AI service is unavailable.');
    connErr.code = 'ai_unavailable';
    connErr.status = 503;
    throw connErr;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Upload a file to Flask for indexing.
 * Uses multipart/form-data.
 */
async function indexDocument(filePath, documentId, fileType) {
  const fs = require('fs');
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('document_id', documentId);
  form.append('file_type', fileType);

  const url = `${config.flaskBaseUrl}/internal/index`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.flaskTimeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...INTERNAL_HEADERS,
        ...form.getHeaders(),
      },
      body: form,
      signal: controller.signal,
    });

    const json = await res.json();
    if (!json.ok) {
      const error = new Error(json.error?.message || 'Flask indexing failed.');
      error.flaskCode = json.error?.code;
      error.status = res.status;
      error.flaskError = true;
      throw error;
    }
    return json.data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`AI service indexing timed out.`);
      timeoutErr.code = 'ai_timeout';
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    if (err.flaskError) throw err;
    const connErr = new Error('AI service is unavailable.');
    connErr.code = 'ai_unavailable';
    connErr.status = 503;
    throw connErr;
  } finally {
    clearTimeout(timer);
  }
}

async function queryDocument(documentId, question, history) {
  return flaskRequest('POST', '/internal/query', { document_id: documentId, question, history });
}

async function summarizeDocument(documentId, mode) {
  return flaskRequest('POST', '/internal/summarize', { document_id: documentId, mode });
}

async function deleteDocumentIndex(documentId) {
  return flaskRequest('DELETE', `/internal/index/${documentId}`);
}

module.exports = { indexDocument, queryDocument, summarizeDocument, deleteDocumentIndex };
