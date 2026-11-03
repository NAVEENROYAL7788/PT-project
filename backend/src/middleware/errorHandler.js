// src/middleware/errorHandler.js - Global error handler
'use strict';

/**
 * Centralized error handler. Never leaks stack traces to clients.
 * All errors use the standard envelope: { ok: false, error: { code, message } }
 */
function errorHandler(err, req, res, next) {
  // Log the real error server-side (but never send to client)
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'internal';
  const message =
    status < 500 ? (err.message || 'Request error.') : 'An internal error occurred.';

  console.error('[error]', {
    method: req.method,
    path: req.path,
    status,
    code,
    // Never log req.body (may contain passwords) or err.stack in prod
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  return res.status(status).json({
    ok: false,
    error: { code, message },
  });
}

/**
 * 404 handler for unmatched routes.
 */
function notFound(req, res) {
  return res.status(404).json({
    ok: false,
    error: { code: 'not_found', message: 'Route not found.' },
  });
}

module.exports = { errorHandler, notFound };
