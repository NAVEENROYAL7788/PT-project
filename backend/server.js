// server.js - Entry point: connect to MongoDB, then start Express server
'use strict';

const mongoose = require('mongoose');
const app = require('./src/app');
const config = require('./src/config');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  let mongoUri = config.mongodbUri;
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
    console.log('[db] Connected to external MongoDB at', mongoUri);
  } catch (err) {
    console.log('[db] Standalone MongoDB not running. Starting local embedded instance...');
    try {
      const mongod = await MongoMemoryServer.create({
        instance: { port: 27017, dbName: 'documind' },
      });
      mongoUri = mongod.getUri();
      await mongoose.connect(mongoUri);
      console.log('[db] Connected to local embedded MongoDB at', mongoUri);
    } catch (memErr) {
      // If port 27017 had conflict, let MongoMemoryServer choose a free port
      const mongod = await MongoMemoryServer.create({
        instance: { dbName: 'documind' },
      });
      mongoUri = mongod.getUri();
      await mongoose.connect(mongoUri);
      console.log('[db] Connected to local dynamic MongoDB at', mongoUri);
    }
  }

  app.listen(config.port, () => {
    console.log(`[server] DocuMind backend running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('[server] Startup error:', err);
  process.exit(1);
});
