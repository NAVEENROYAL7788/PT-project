// src/routes/conversations.js - Conversation and message routes
'use strict';

const express = require('express');
const { z } = require('zod');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Document = require('../models/Document');
const { authenticate } = require('../middleware/auth');
const { queryDocument } = require('../services/flaskClient');

const router = express.Router();
const MAX_CONTEXT_TURNS = 4;

// GET /api/conversations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .populate('documentId', 'fileName status');
    return res.json({ ok: true, data: { conversations } });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations - create a new conversation
router.post('/', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({
      documentId: z.string().min(1),
      title: z.string().min(1).max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'validation',
          message: parsed.error.errors.map((e) => e.message).join('; '),
        },
      });
    }

    const { documentId, title } = parsed.data;

    // Verify document ownership
    const doc = await Document.findOne({ _id: documentId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({
        ok: false,
        error: { code: 'not_found', message: 'Document not found.' },
      });
    }

    const conversation = await Conversation.create({
      userId: req.userId,
      documentId,
      title: title || `Chat about ${doc.fileName}`,
    });

    return res.status(201).json({ ok: true, data: { conversation } });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Document not found.' } });
    }
    next(err);
  }
});

// GET /api/conversations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).populate('documentId', 'fileName status pageCount');
    if (!conversation) {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Conversation not found.' } });
    }
    return res.json({ ok: true, data: { conversation } });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Conversation not found.' } });
    }
    next(err);
  }
});

// DELETE /api/conversations/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!conversation) {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Conversation not found.' } });
    }
    await Message.deleteMany({ conversationId: req.params.id });
    return res.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Conversation not found.' } });
    }
    next(err);
  }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.userId });
    if (!conversation) {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Conversation not found.' } });
    }
    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 });
    return res.json({ ok: true, data: { messages } });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Conversation not found.' } });
    }
    next(err);
  }
});

// POST /api/conversations/:id/messages - send a question
router.post('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const questionSchema = z.object({
      question: z.string().min(1, 'Question is required').max(2000, 'Question too long (max 2000 chars)'),
    });
    const parsed = questionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'validation',
          message: parsed.error.errors.map((e) => e.message).join('; '),
        },
      });
    }

    const { question } = parsed.data;

    // Verify conversation ownership
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!conversation) {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Conversation not found.' } });
    }

    // Verify document ownership and status
    const doc = await Document.findOne({ _id: conversation.documentId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Document not found.' } });
    }
    if (doc.status !== 'ready') {
      return res.status(409).json({
        ok: false,
        error: { code: 'not_ready', message: 'Document is not ready. Please wait for processing to complete.' },
      });
    }

    // Load recent conversation history for context
    const recentMessages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(MAX_CONTEXT_TURNS * 2)
      .select('role content');

    const history = recentMessages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call Flask for RAG answer
    let flaskResult;
    try {
      flaskResult = await queryDocument(doc._id.toString(), question, history);
    } catch (flaskErr) {
      // On LLM/AI error, save nothing and return error
      return res.status(flaskErr.status || 502).json({
        ok: false,
        error: { code: flaskErr.flaskCode || flaskErr.code || 'ai_error', message: flaskErr.message },
      });
    }

    // Save user message
    const userMsg = await Message.create({
      conversationId: conversation._id,
      userId: req.userId,
      role: 'user',
      content: question,
      sources: [],
      answerable: null,
    });

    // Save assistant message with grounded sources
    const assistantMsg = await Message.create({
      conversationId: conversation._id,
      userId: req.userId,
      role: 'assistant',
      content: flaskResult.answer,
      sources: flaskResult.sources || [],
      answerable: flaskResult.answerable,
    });

    // Update conversation updatedAt
    await Conversation.findByIdAndUpdate(conversation._id, { updatedAt: new Date() });

    return res.status(201).json({
      ok: true,
      data: {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      },
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Conversation not found.' } });
    }
    next(err);
  }
});

module.exports = router;
