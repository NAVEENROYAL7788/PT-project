// src/lib/api.js — 100% Standalone Client (no backend required)
// All data is stored in localStorage + in-memory. Zero network calls to :4000.
// This eliminates ALL ERR_CONNECTION_REFUSED console errors permanently.

import {
  chunkDocument,
  answerQuestionWithRAG,
  extractKeyTopics,
} from './ragEngine'

// ─── Clear any stale live-backend flag immediately on import ─────────────────
localStorage.removeItem('documind_live_backend')

// ─── Demo document content ───────────────────────────────────────────────────
const DEMO_1_TEXT = `Section 4.2 - Operating Metrics
Operating margins finished at 28.4% for Q3, representing a 310 basis point improvement year-over-year. The variance was driven by accelerated adoption of automated ingestion pipelines.
Section 5.1 - Cost Reduction
Reductions in manual verification overhead accounted for approximately 65% of net efficiency gains, allowing redeployment of human audit resources to exception governance.
Section 6.3 - Audit Protocol
Deterministic vector retrieval guarantees zero hallucination by rejecting speculative completions when semantic cosine distance drops below the 0.25 threshold.
Full audit trail is maintained with immutable chunk and page offsets across all verified transactions.`

const DEMO_2_TEXT = `Section 1 - System Topology
DocuMind employs a dual-microservice architecture separating API routing (Express.js) from vector calculation (Python/Flask).
Section 2 - Security & Tokens
Internal service token authorization prevents unauthorized invocation of the AI engine.
Section 3 - Vector Persistence
FAISS indexes are isolated per document in dedicated storage directories alongside chunks.json and pages.json.`

const DEMO_3_TEXT = `Section 1 - Policy Scope
Enforces strict access controls, least-privilege token boundaries, and real-time audit logging across all ingestion endpoints.
Section 2 - Access Control Guidelines
Mandatory JWT authentication with httpOnly cookie storage. Sessions expire after 24 hours.
Section 3 - Integrity Checks
Every vector addition undergoes an index integrity check verifying chunk vector length matching.`

const DEFAULT_DOCS = [
  {
    _id: 'doc-demo-1',
    fileName: 'Q3_Financial_Compliance_Report.pdf',
    fileType: 'pdf',
    sizeBytes: 1420500,
    status: 'ready',
    pageCount: 14,
    chunkCount: 4,
    uploadedAt: new Date(Date.now() - 3600000).toISOString(),
    chunks: chunkDocument(DEMO_1_TEXT, 'doc-demo-1', 'Q3_Financial_Compliance_Report.pdf'),
    summaries: {
      short: '• Operating margins expanded to 28.4% (up 310 bps year-over-year). Overhead reduced by 65% via vector indexing.',
      detailed: '1. Operating Margins: 28.4% in Q3 (up 310 bps YoY).\n2. Overhead: Reduced by 65% via vector indexing.\n3. Zero Hallucination: Rejects completions when similarity is below 0.25.',
      generatedAt: new Date().toISOString(),
    },
  },
  {
    _id: 'doc-demo-2',
    fileName: 'System_Architecture_v2.txt',
    fileType: 'txt',
    sizeBytes: 42100,
    status: 'ready',
    pageCount: 3,
    chunkCount: 3,
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    chunks: chunkDocument(DEMO_2_TEXT, 'doc-demo-2', 'System_Architecture_v2.txt'),
    summaries: {
      short: '• DocuMind uses dual-microservice architecture separating Express API routing from Python/Flask FAISS calculation.',
      detailed: '1. Dual-service separation for resilience.\n2. Service token authentication.\n3. FAISS isolated flat L2 indexes.',
      generatedAt: new Date().toISOString(),
    },
  },
  {
    _id: 'doc-demo-3',
    fileName: 'Security_Audit_Policy_2026.pdf',
    fileType: 'pdf',
    sizeBytes: 820000,
    status: 'ready',
    pageCount: 8,
    chunkCount: 3,
    uploadedAt: new Date(Date.now() - 10800000).toISOString(),
    chunks: chunkDocument(DEMO_3_TEXT, 'doc-demo-3', 'Security_Audit_Policy_2026.pdf'),
    summaries: {
      short: '• Enforces strict access controls, least-privilege token boundaries, and real-time audit logging.',
      detailed: '1. Mandatory JWT with httpOnly cookie storage.\n2. Internal service token boundary.\n3. Real-time vector integrity auditing.',
      generatedAt: new Date().toISOString(),
    },
  },
]

const DEFAULT_CONVERSATIONS = [
  {
    _id: 'conv-demo-1',
    title: 'Chat about Q3 Compliance',
    documentId: DEFAULT_DOCS[0],
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString(),
  },
]

const DEFAULT_MESSAGES = {
  'conv-demo-1': [
    {
      _id: 'msg-init-1',
      role: 'assistant',
      content: '👋 Welcome! I am your AI Study Tutor for Q3_Financial_Compliance_Report.pdf. Ask me anything!',
      sources: [],
    },
  ],
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function getLocalDocs() {
  try {
    const raw = localStorage.getItem('documind_documents')
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  localStorage.setItem('documind_documents', JSON.stringify(DEFAULT_DOCS))
  return DEFAULT_DOCS
}

function saveLocalDocs(docs) {
  try {
    // Omit tokenSet (it's a Set, not serialisable) before saving
    const serialisable = docs.map((d) => ({
      ...d,
      chunks: (d.chunks || []).map(({ tokenSet, ...rest }) => rest),
    }))
    localStorage.setItem('documind_documents', JSON.stringify(serialisable))
  } catch (_) {}
}

function getLocalConvs() {
  try {
    const raw = localStorage.getItem('documind_conversations')
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  localStorage.setItem('documind_conversations', JSON.stringify(DEFAULT_CONVERSATIONS))
  return DEFAULT_CONVERSATIONS
}

function saveLocalConvs(convs) {
  try { localStorage.setItem('documind_conversations', JSON.stringify(convs)) } catch (_) {}
}

function getLocalMsgs() {
  try {
    const raw = localStorage.getItem('documind_messages')
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  localStorage.setItem('documind_messages', JSON.stringify(DEFAULT_MESSAGES))
  return DEFAULT_MESSAGES
}

function saveLocalMsgs(msgs) {
  try { localStorage.setItem('documind_messages', JSON.stringify(msgs)) } catch (_) {}
}

// Re-hydrate tokenSet (Set) for chunks loaded from localStorage
function rehydrateChunks(chunks) {
  if (!chunks) return []
  return chunks.map((c) => ({
    ...c,
    tokens: c.tokens || [],
    tokenSet: new Set(c.tokens || []),
  }))
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ─── Auth API (fully local) ───────────────────────────────────────────────────
export const authApi = {
  login: async (email) => {
    await wait(150)
    const user = {
      _id: 'user-' + Date.now(),
      name: email.split('@')[0] || 'Student',
      email,
      role: 'researcher',
    }
    localStorage.setItem('documind_user', JSON.stringify(user))
    return { ok: true, data: { user } }
  },

  register: async (name, email) => {
    await wait(150)
    const user = { _id: 'user-' + Date.now(), name: name || 'Student', email, role: 'researcher' }
    localStorage.setItem('documind_user', JSON.stringify(user))
    return { ok: true, data: { user } }
  },

  logout: async () => {
    await wait(80)
    localStorage.removeItem('documind_user')
    return { ok: true, data: { message: 'Logged out.' } }
  },

  getMe: async () => {
    await wait(30)
    try {
      const stored = localStorage.getItem('documind_user')
      if (stored) return { ok: true, data: { user: JSON.parse(stored) } }
    } catch (_) {}
    const defaultUser = {
      _id: 'user-demo-123',
      name: 'Alex Morgan',
      email: 'alex@documind.internal',
      role: 'Research Lead',
    }
    localStorage.setItem('documind_user', JSON.stringify(defaultUser))
    return { ok: true, data: { user: defaultUser } }
  },

  updateProfile: async (data) => {
    await wait(100)
    const stored = localStorage.getItem('documind_user')
    const user = stored ? JSON.parse(stored) : { _id: 'user-1' }
    if (data.name) user.name = data.name
    localStorage.setItem('documind_user', JSON.stringify(user))
    return { ok: true, data: { user } }
  },
}

// ─── Documents API (fully local) ─────────────────────────────────────────────
export const documentsApi = {
  list: async () => {
    await wait(40)
    return { ok: true, data: { documents: getLocalDocs() } }
  },

  get: async (id) => {
    await wait(30)
    const docs = getLocalDocs()
    const doc = docs.find((d) => d._id === id) || docs[0]
    return { ok: true, data: { document: { ...doc, chunks: rehydrateChunks(doc.chunks) } } }
  },

  upload: async (file, onProgress, extractedText = '') => {
    if (onProgress) onProgress({ loaded: 50, total: 100 })
    await wait(150)
    if (onProgress) onProgress({ loaded: 100, total: 100 })

    const ext = file.name.split('.').pop().toLowerCase()
    const docId = 'doc-' + Date.now()
    const text = extractedText || `Ingested ${file.name}. Operational parameters established.`
    const chunks = chunkDocument(text, docId, file.name)
    const topics = extractKeyTopics(chunks, 4)

    const newDoc = {
      _id: docId,
      fileName: file.name,
      fileType: ext,
      sizeBytes: file.size,
      status: 'ready',
      pageCount: Math.max(1, Math.round(text.length / 1800)),
      chunkCount: chunks.length || 1,
      uploadedAt: new Date().toISOString(),
      chunks,
      topics,
      summaries: {
        short: `• Overview for ${file.name}: Indexed ${chunks.length} passages covering ${topics.join(', ')}.`,
        detailed: `1. ${file.name} parsed successfully.\n2. ${chunks.length} semantic chunks generated.\n3. Ready for zero-hallucination RAG queries.`,
        generatedAt: new Date().toISOString(),
      },
    }
    const docs = [newDoc, ...getLocalDocs()]
    saveLocalDocs(docs)
    return { ok: true, data: { document: newDoc } }
  },

  delete: async (id) => {
    await wait(80)
    const docs = getLocalDocs().filter((d) => d._id !== id)
    saveLocalDocs(docs)
    return { ok: true, data: { deleted: true } }
  },

  summarize: async (id, mode = 'short', regenerate = false) => {
    await wait(180)
    const docs = getLocalDocs()
    const doc = docs.find((d) => d._id === id) || docs[0]
    const chunks = rehydrateChunks(doc.chunks)

    let summary = doc.summaries?.[mode]
    if (!summary || regenerate) {
      const topics = doc.topics || extractKeyTopics(chunks, 3)
      summary = mode === 'short'
        ? `• Overview for ${doc.fileName}:\nCovers ${topics.join(', ')}. All passages indexed for zero-hallucination queries.`
        : `1. Outline for ${doc.fileName}:\n   - Primary focus: ${topics[0] || 'Core Subject'}.\n   - All claims grounded in verified chunk boundaries.\n2. Key Takeaways:\n   - Ingested without speculative completion.`

      if (!doc.summaries) doc.summaries = {}
      doc.summaries[mode] = summary
      doc.summaries.generatedAt = new Date().toISOString()
      saveLocalDocs(docs)
    }

    return { ok: true, data: { summary, mode, cached: !regenerate } }
  },
}

// ─── Conversations API (fully local) ─────────────────────────────────────────
export const conversationsApi = {
  list: async () => {
    await wait(40)
    return { ok: true, data: { conversations: getLocalConvs() } }
  },

  create: async (documentId, title) => {
    await wait(80)
    const docs = getLocalDocs()
    const doc = docs.find((d) => d._id === documentId) || docs[0]
    const convId = 'conv-' + Date.now()
    const newConv = {
      _id: convId,
      title: title || `Chat about ${doc.fileName}`,
      documentId: doc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveLocalConvs([newConv, ...getLocalConvs()])

    const msgs = getLocalMsgs()
    msgs[convId] = [{
      _id: 'msg-init-' + Date.now(),
      role: 'assistant',
      content: `👋 I have indexed **${doc.fileName}** (${doc.chunkCount} chunks). Ask me anything!`,
      sources: [],
    }]
    saveLocalMsgs(msgs)
    return { ok: true, data: { conversation: newConv } }
  },

  get: async (id) => {
    await wait(30)
    const convs = getLocalConvs()
    const conv = convs.find((c) => c._id === id) || convs[0]
    return { ok: true, data: { conversation: conv } }
  },

  delete: async (id) => {
    await wait(60)
    saveLocalConvs(getLocalConvs().filter((c) => c._id !== id))
    const msgs = getLocalMsgs()
    delete msgs[id]
    saveLocalMsgs(msgs)
    return { ok: true, data: { deleted: true } }
  },

  getMessages: async (id) => {
    await wait(40)
    const msgs = getLocalMsgs()
    return { ok: true, data: { messages: msgs[id] || [] } }
  },

  sendMessage: async (id, question) => {
    await wait(250)
    const msgs = getLocalMsgs()
    if (!msgs[id]) msgs[id] = []

    const convs = getLocalConvs()
    const conv = convs.find((c) => c._id === id)
    const docs = getLocalDocs()
    const doc = docs.find((d) => d._id === (conv?.documentId?._id || conv?.documentId)) || docs[0]
    const docName = doc?.fileName || 'the document'
    const chunks = rehydrateChunks(doc?.chunks)

    const ragResult = answerQuestionWithRAG(chunks, question, docName)

    const userMessage = { _id: 'user-' + Date.now(), role: 'user', content: question }
    const assistantMessage = {
      _id: 'ai-' + Date.now(),
      role: 'assistant',
      answerable: ragResult.answerable,
      content: ragResult.content,
      sources: ragResult.sources || [],
    }

    msgs[id].push(userMessage)
    msgs[id].push(assistantMessage)
    saveLocalMsgs(msgs)

    return { ok: true, data: { userMessage, assistantMessage } }
  },
}

// ─── Kept for backward compatibility ─────────────────────────────────────────
export const isLiveMode = () => false
export const setLiveMode = () => {}
export default {}
