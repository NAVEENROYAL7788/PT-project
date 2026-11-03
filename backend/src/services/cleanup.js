// src/services/cleanup.js
// Safe deletion of all data belonging to a user (account deletion)
// and per-document deletion.
'use strict';

const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { deleteDocumentIndex } = require('./flaskClient');

/**
 * Delete a single document and its related data.
 * Removes: Flask index, Messages, Conversation(s), Document record.
 * Reports partial failures without throwing - returns { errors: string[] }.
 */
async function deleteDocument(documentId, userId) {
  const errors = [];

  // Verify ownership
  const doc = await Document.findOne({ _id: documentId, userId });
  if (!doc) return { errors: [] }; // Already gone or not owned

  // 1. Delete Flask index
  try {
    await deleteDocumentIndex(documentId.toString());
  } catch (err) {
    errors.push(`Flask index deletion failed: ${err.message}`);
    // Continue - partial failure is reported but cleanup proceeds
  }

  // 2. Get conversation IDs for this document
  const conversations = await Conversation.find({ documentId, userId }).select('_id');
  const conversationIds = conversations.map((c) => c._id);

  // 3. Delete all messages for these conversations
  if (conversationIds.length > 0) {
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
  }

  // 4. Delete conversations
  await Conversation.deleteMany({ documentId, userId });

  // 5. Delete document record
  await Document.deleteOne({ _id: documentId, userId });

  return { errors };
}

/**
 * Delete all data for a user (account deletion).
 * Safe order: Flask indexes first, then Messages, Conversations, Documents, User.
 */
async function deleteUserData(userId) {
  const errors = [];

  // 1. Find all user documents for Flask cleanup
  const docs = await Document.find({ userId }).select('_id');

  for (const doc of docs) {
    try {
      await deleteDocumentIndex(doc._id.toString());
    } catch (err) {
      errors.push(`Flask index deletion failed for ${doc._id}: ${err.message}`);
    }
  }

  // 2. Delete all messages for all conversations
  const convs = await Conversation.find({ userId }).select('_id');
  const convIds = convs.map((c) => c._id);
  if (convIds.length > 0) {
    await Message.deleteMany({ conversationId: { $in: convIds } });
  }

  // 3. Delete all conversations
  await Conversation.deleteMany({ userId });

  // 4. Delete all documents
  await Document.deleteMany({ userId });

  // 5. Delete user
  await User.deleteOne({ _id: userId });

  if (errors.length > 0) {
    console.error('[cleanup] Partial failures during user data deletion:', errors);
  }

  return { errors };
}

module.exports = { deleteDocument, deleteUserData };
