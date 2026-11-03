// src/models/Document.js
'use strict';

const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema(
  {
    short: { type: String, default: null },
    detailed: { type: String, default: null },
    generatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'txt'], required: true },
    sizeBytes: { type: Number, required: true },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'failed'],
      default: 'uploading',
    },
    errorMessage: { type: String, default: null },
    pageCount: { type: Number, default: null },
    chunkCount: { type: Number, default: null },
    indexRef: { type: String, default: null },
    summaries: { type: summarySchema, default: () => ({}) },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

documentSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Document', documentSchema);
