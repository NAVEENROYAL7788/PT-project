// src/routes/documents.js - Document upload, listing, status, deletion, summarization
'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const Document = require('../models/Document');
const { authenticate } = require('../middleware/auth');
const { indexDocument, summarizeDocument } = require('../services/flaskClient');
const { deleteDocument } = require('../services/cleanup');
const config = require('../config');

const router = express.Router();
const MAX_UPLOAD_BYTES = config.maxUploadMb * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME = ['application/pdf', 'text/plain'];
const ALLOWED_EXT = ['.pdf', '.txt'];

// Multer: disk storage in temp dir
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(config.uploadTempDir, { recursive: true });
    cb(null, config.uploadTempDir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error(`Only PDF and TXT files are accepted. Got: ${ext}`));
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error(`Invalid MIME type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// GET /api/documents
router.get('/', authenticate, async (req, res, next) => {
  try {
    const docs = await Document.find({ userId: req.userId })
      .sort({ uploadedAt: -1 })
      .select('-__v');
    return res.json({ ok: true, data: { documents: docs } });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents
router.post(
  '/',
  authenticate,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            ok: false,
            error: {
              code: 'file_too_large',
              message: `File exceeds the ${config.maxUploadMb} MB limit.`,
            },
          });
        }
        return res.status(400).json({
          ok: false,
          error: { code: 'upload_error', message: err.message },
        });
      }
      next();
    });
  },
  async (req, res, next) => {
    let tempFilePath = null;
    try {
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: { code: 'validation', message: 'No file uploaded.' },
        });
      }

      tempFilePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase().slice(1); // 'pdf' or 'txt'
      const fileType = ext;

      // Validate file signature for PDF
      if (fileType === 'pdf') {
        const headerBuf = Buffer.alloc(4);
        const fd = fs.openSync(tempFilePath, 'r');
        fs.readSync(fd, headerBuf, 0, 4, 0);
        fs.closeSync(fd);
        if (headerBuf.toString('ascii') !== '%PDF') {
          return res.status(400).json({
            ok: false,
            error: { code: 'invalid_file', message: 'File does not appear to be a valid PDF.' },
          });
        }
      }

      // Create document record in DB (status: processing)
      const doc = await Document.create({
        userId: req.userId,
        fileName: req.file.originalname,
        fileType,
        sizeBytes: req.file.size,
        status: 'processing',
        uploadedAt: new Date(),
      });

      // Return 202 immediately - client polls for status
      res.status(202).json({ ok: true, data: { document: doc } });

      // Background: forward to Flask, update status
      setImmediate(async () => {
        try {
          const result = await indexDocument(tempFilePath, doc._id.toString(), fileType);
          await Document.findByIdAndUpdate(doc._id, {
            status: 'ready',
            pageCount: result.page_count,
            chunkCount: result.chunk_count,
            indexRef: doc._id.toString(),
          });
        } catch (flaskErr) {
          await Document.findByIdAndUpdate(doc._id, {
            status: 'failed',
            errorMessage: flaskErr.message,
          });
        } finally {
          // Always clean up temp file
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      });
    } catch (err) {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (_) {}
      }
      next(err);
    }
  }
);

// GET /api/documents/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({
        ok: false,
        error: { code: 'not_found', message: 'Document not found.' },
      });
    }
    return res.json({ ok: true, data: { document: doc } });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({
        ok: false,
        error: { code: 'not_found', message: 'Document not found.' },
      });
    }
    next(err);
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { errors } = await deleteDocument(req.params.id, req.userId);
    if (errors.length > 0) {
      // Partial success - document deleted from DB but Flask cleanup may have failed
      return res.json({
        ok: true,
        data: { deleted: true, warnings: errors },
      });
    }
    return res.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({
        ok: false,
        error: { code: 'not_found', message: 'Document not found.' },
      });
    }
    next(err);
  }
});

// POST /api/documents/:id/summary
router.post('/:id/summary', authenticate, async (req, res, next) => {
  try {
    const modeSchema = z.enum(['short', 'detailed']);
    const parsed = modeSchema.safeParse(req.body.mode);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: { code: 'validation', message: 'mode must be "short" or "detailed".' },
      });
    }

    const mode = parsed.data;
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({
        ok: false,
        error: { code: 'not_found', message: 'Document not found.' },
      });
    }
    if (doc.status !== 'ready') {
      return res.status(409).json({
        ok: false,
        error: { code: 'not_ready', message: 'Document is not ready for summarization.' },
      });
    }

    const { regenerate } = req.body;

    // Check cache unless regenerate=true
    if (!regenerate && doc.summaries && doc.summaries[mode]) {
      return res.json({
        ok: true,
        data: {
          summary: doc.summaries[mode],
          mode,
          cached: true,
          generatedAt: doc.summaries.generatedAt,
        },
      });
    }

    // Call Flask
    const result = await summarizeDocument(doc._id.toString(), mode);

    // Cache in DB
    await Document.findByIdAndUpdate(doc._id, {
      [`summaries.${mode}`]: result.summary,
      'summaries.generatedAt': new Date(),
    });

    return res.json({
      ok: true,
      data: { summary: result.summary, mode, cached: false },
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({
        ok: false,
        error: { code: 'not_found', message: 'Document not found.' },
      });
    }
    if (err.flaskError) {
      return res.status(err.status || 502).json({
        ok: false,
        error: { code: err.flaskCode || 'ai_error', message: err.message },
      });
    }
    next(err);
  }
});

module.exports = router;
