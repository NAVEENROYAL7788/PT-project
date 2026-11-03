// src/routes/auth.js - Authentication routes
'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const config = require('../config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_COST = 12;
const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24h in ms
  path: '/',
};

// Rate limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      ok: false,
      error: { code: 'rate_limited', message: 'Too many attempts. Try again later.' },
    });
  },
});

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'validation',
          message: parsed.error.errors.map((e) => e.message).join('; '),
        },
      });
    }

    const { name, email, password } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        ok: false,
        error: { code: 'email_taken', message: 'An account with this email already exists.' },
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await User.create({ name, email, passwordHash });

    const token = jwt.sign({ sub: user._id.toString() }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    res.cookie('token', token, COOKIE_OPTS);
    return res.status(201).json({ ok: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'validation',
          message: parsed.error.errors.map((e) => e.message).join('; '),
        },
      });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) {
      // Use timing-safe compare to prevent user enumeration
      await bcrypt.compare(password, '$2b$12$invalidhashforenumeration12345678901234567');
      return res.status(401).json({
        ok: false,
        error: { code: 'invalid_credentials', message: 'Invalid email or password.' },
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        ok: false,
        error: { code: 'invalid_credentials', message: 'Invalid email or password.' },
      });
    }

    const token = jwt.sign({ sub: user._id.toString() }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    res.cookie('token', token, COOKIE_OPTS);
    return res.json({ ok: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ ok: true, data: { message: 'Logged out.' } });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: { code: 'unauthorized', message: 'User not found.' },
      });
    }
    return res.json({ ok: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/me - update name or change password
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: { code: 'not_found', message: 'User not found.' },
      });
    }

    const { name, currentPassword, newPassword } = req.body;

    if (name) {
      const nameVal = z.string().min(1).max(100).safeParse(name);
      if (!nameVal.success) {
        return res.status(400).json({
          ok: false,
          error: { code: 'validation', message: 'Invalid name.' },
        });
      }
      user.name = nameVal.data;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          ok: false,
          error: { code: 'validation', message: 'Current password is required to set a new password.' },
        });
      }
      if (newPassword.length < 10) {
        return res.status(400).json({
          ok: false,
          error: { code: 'validation', message: 'New password must be at least 10 characters.' },
        });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({
          ok: false,
          error: { code: 'invalid_credentials', message: 'Current password is incorrect.' },
        });
      }
      user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    }

    await user.save();
    return res.json({ ok: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/me - delete account and all data
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        ok: false,
        error: { code: 'validation', message: 'Password confirmation required.' },
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: { code: 'not_found', message: 'User not found.' },
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        ok: false,
        error: { code: 'invalid_credentials', message: 'Incorrect password.' },
      });
    }

    // Delete all user data in safe order
    const { deleteUserData } = require('../services/cleanup');
    await deleteUserData(req.userId);

    res.clearCookie('token', { path: '/' });
    return res.json({ ok: true, data: { message: 'Account and all data deleted.' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
