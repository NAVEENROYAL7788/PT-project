// src/models/Message.js
'use strict';

const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    chunkId: { type: String, required: true },
    page: { type: Number, required: true },
    snippet: { type: String, required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: {
      type: [sourceSchema],
      default: [],
    },
    answerable: {
      type: Boolean,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

messageSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Message', messageSchema);
