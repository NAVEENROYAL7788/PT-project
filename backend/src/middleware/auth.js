// src/middleware/auth.js - JWT authentication middleware
'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Authenticate requests using JWT from httpOnly cookie or Authorization header.
 * Sets req.userId on success. Returns 401 on failure.
 */
function authenticate(req, res, next) {
  let token = null;

  // Prefer httpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization) {
    // Fallback: Authorization: Bearer <token>
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: { code: 'unauthorized', message: 'Authentication required.' },
    });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        error: { code: 'token_expired', message: 'Session expired. Please log in again.' },
      });
    }
    return res.status(401).json({
      ok: false,
      error: { code: 'invalid_token', message: 'Invalid authentication token.' },
    });
  }
}

module.exports = { authenticate };
