// src/config.js - All configuration from environment variables. No secrets hardcoded.
'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/documind',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || '',
  flaskBaseUrl: process.env.FLASK_BASE_URL || 'http://127.0.0.1:5001',
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '10', 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:4000',
  uploadTempDir: process.env.UPLOAD_TEMP_DIR || './temp',
  flaskTimeoutMs: parseInt(process.env.FLASK_TIMEOUT_MS || '60000', 10),
  operatorName: process.env.OPERATOR_NAME || '',
  contactEmail: process.env.CONTACT_EMAIL || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Validate required secrets at startup
const requiredSecrets = ['jwtSecret', 'internalServiceToken'];
for (const key of requiredSecrets) {
  if (!config[key]) {
    console.error(`[config] FATAL: Required environment variable for "${key}" is not set.`);
    process.exit(1);
  }
}

module.exports = config;
