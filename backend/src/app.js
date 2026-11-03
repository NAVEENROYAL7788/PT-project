// src/app.js - Express application setup (no server.listen here; that's in server.js)
'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const config = require('./config');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const conversationRoutes = require('./routes/conversations');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Security headers
app.use(helmet());

// CORS - restricted to frontend origin only
app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Cookie parser for httpOnly JWT
app.use(cookieParser());

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      ok: false,
      error: { code: 'rate_limited', message: 'Too many requests. Please slow down.' },
    });
  },
});
app.use(globalLimiter);

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ ok: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/conversations', conversationRoutes);

// 404 and error handlers (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
