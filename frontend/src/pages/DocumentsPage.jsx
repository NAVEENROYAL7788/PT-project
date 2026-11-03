import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  FileText,
  MessageSquare,
  BookOpen,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { documentsApi, conversationsApi } from '../lib/api'
import { useToast } from '../context/ToastContext'
import SummaryModal from '../components/SummaryModal'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  // Modals state
  const [selectedSummaryDoc, setSelectedSummaryDoc] = useState(null)
  const [docToDelete, setDocToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fileInputRef = useRef(null)
  const { addToast } = useToast()
  const navigate = useNavigate()

  // Format bytes helper
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Fetch documents
  const loadDocuments = async () => {
    try {
      const res = await documentsApi.list()
      if (res?.ok && res?.data?.documents) {
        setDocuments(res.data.documents)
      }
    } catch (err) {
      if (err.code === 'network_error') {
        // Fallback demo documents for standalone frontend testing
        setDocuments((prev) =>
          prev.length > 0
            ? prev
            : [
                {
                  _id: 'doc-demo-1',
                  fileName: 'Q3_Financial_Compliance_Report.pdf',
                  fileType: 'pdf',
                  sizeBytes: 1420500,
                  status: 'ready',
                  pageCount: 14,
                  chunkCount: 52,
                  uploadedAt: new Date(Date.now() - 3600000).toISOString(),
                },
                {
                  _id: 'doc-demo-2',
                  fileName: 'System_Architecture_v2.txt',
                  fileType: 'txt',
                  sizeBytes: 42100,
                  status: 'ready',
                  pageCount: 3,
                  chunkCount: 12,
                  uploadedAt: new Date(Date.now() - 86400000).toISOString(),
                },
              ]
        )
      } else {
        addToast(err.message, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  // Auto-poll documents while any are 'processing'
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing')
    if (!hasProcessing) return

    const timer = setInterval(() => {
      loadDocuments()
    }, 2500)

    return () => clearInterval(timer)
  }, [documents])

  // File drop / upload handling
  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    const file = fileList[0]

    // Client-side validations
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'txt'].includes(ext)) {
      addToast('Invalid file format. Only PDF and TXT files are supported.', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast('File exceeds the 10 MB limit.', 'error')
      return
    }

    setUploading(true)
    setUploadProgress(10)

    try {
      const res = await documentsApi.upload(file, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percent)
        }
      })

      if (res?.ok && res?.data?.document) {
        addToast(`Uploaded "${file.name}". Processing indexing in background...`, 'success')
        setDocuments((prev) => [res.data.document, ...prev])
      }
    } catch (err) {
      if (err.code === 'network_error') {
        // Simulated local document upload
        const mockNewDoc = {
          _id: 'doc-' + Date.now(),
          fileName: file.name,
          fileType: ext,
          sizeBytes: file.size,
          status: 'ready',
          pageCount: ext === 'pdf' ? Math.max(1, Math.round(file.size / 80000)) : 2,
          chunkCount: Math.max(2, Math.round(file.size / 15000)),
          uploadedAt: new Date().toISOString(),
        }
        setDocuments((prev) => [mockNewDoc, ...prev])
        addToast(`[Demo] Ingested and indexed "${file.name}"`, 'success')
      } else {
        addToast(err.message || 'Upload failed', 'error')
      }
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const onDragLeave = () => {
    setDragActive(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // Navigate to or create a conversation for this document
  const handleStartChat = async (doc) => {
    if (doc.status !== 'ready') {
      addToast('Document is not ready for querying yet.', 'error')
      return
    }

    try {
      const res = await conversationsApi.create(doc._id, `Chat about ${doc.fileName}`)
      if (res?.ok && res?.data?.conversation) {
        navigate(`/chat?id=${res.data.conversation._id}`)
        return
      }
    } catch (err) {
      // In demo mode or if navigation
      navigate(`/chat?doc=${doc._id}`)
    }
  }

  // Delete document
  const confirmDelete = async () => {
    if (!docToDelete) return
    setIsDeleting(true)
    try {
      await documentsApi.delete(docToDelete._id)
      setDocuments((prev) => prev.filter((d) => d._id !== docToDelete._id))
      addToast(`Deleted document "${docToDelete.fileName}"`, 'info')
    } catch (err) {
      if (err.code === 'network_error') {
        setDocuments((prev) => prev.filter((d) => d._id !== docToDelete._id))
        addToast(`[Demo] Removed document "${docToDelete.fileName}"`, 'info')
      } else {
        addToast(err.message, 'error')
      }
    } finally {
      setIsDeleting(false)
      setDocToDelete(null)
    }
  }

  const readyCount = documents.filter((d) => d.status === 'ready').length
  const totalPages = documents.reduce((sum, d) => sum + (d.pageCount || 0), 0)

  return (
    <div className="page-container">
      {/* Page Title & Stats */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: 'var(--text-3xl)', margin: '0 0 var(--space-2)' }}>
            Documents Repository
          </h2>
          <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: 600 }}>
            Upload PDFs or text files to build verified FAISS vector indexes. Ask questions with
            strict context attribution or generate structured summaries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="card card-sm flex items-center gap-3">
            <div>
              <div className="text-xs text-muted uppercase" style={{ letterSpacing: '0.04em' }}>
                Total Indexed
              </div>
              <div className="text-xl font-semibold" style={{ color: 'var(--color-accent)' }}>
                {readyCount} <span className="text-xs text-muted font-medium">/ {documents.length} docs</span>
              </div>
            </div>
            <div className="divider" style={{ width: 1, height: 28, margin: 0, borderTop: 'none', borderLeft: '1px solid var(--color-border)' }} />
            <div>
              <div className="text-xs text-muted uppercase" style={{ letterSpacing: '0.04em' }}>
                Pages Analyzed
              </div>
              <div className="text-xl font-semibold text-primary">
                {totalPages}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadDocuments}
            title="Refresh list"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        className={`dropzone mb-8 ${dragActive ? 'active' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".pdf,.txt"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}
          >
            <Upload size={22} />
          </div>

          <div className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
            {uploading ? 'Processing & Vectorizing Document...' : 'Click or drag files here to upload'}
          </div>

          <p className="text-xs text-muted" style={{ margin: 0 }}>
            Supports PDF and TXT documents up to 10 MB per file.
          </p>

          {uploading && (
            <div style={{ width: 240, marginTop: 'var(--space-2)' }}>
              <div
                style={{
                  height: 6,
                  backgroundColor: 'var(--color-border)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    backgroundColor: 'var(--color-accent)',
                    transition: 'width 200ms ease',
                  }}
                />
              </div>
              <div className="text-xs text-muted mt-1 text-center">{uploadProgress}% complete</div>
            </div>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
          className="flex items-center justify-between"
        >
          <span className="font-semibold text-sm">Indexed Documents</span>
          <span className="text-xs text-muted">{documents.length} total entries</span>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-6)' }} className="flex flex-col gap-3">
            <div className="skeleton" style={{ height: 44, width: '100%' }} />
            <div className="skeleton" style={{ height: 44, width: '100%' }} />
            <div className="skeleton" style={{ height: 44, width: '100%' }} />
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <FileText size={36} className="text-muted" style={{ margin: '0 auto var(--space-3)' }} />
            <div className="font-semibold text-base mb-1">No documents uploaded yet</div>
            <p className="text-sm text-muted" style={{ maxWidth: 400, margin: '0 auto var(--space-4)' }}>
              Add your first document to extract text, construct FAISS vector chunks, and initiate RAG searches.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              <span>Select File</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: 'var(--space-3) var(--space-6)' }}>Document</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Status</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Pages / Chunks</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Size</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Uploaded</th>
                  <th style={{ padding: 'var(--space-3) var(--space-6)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  let badgeClass = 'badge-ready'
                  let badgeText = 'Ready'
                  let StatusIcon = CheckCircle

                  if (doc.status === 'processing') {
                    badgeClass = 'badge-processing'
                    badgeText = 'Vectorizing'
                    StatusIcon = Clock
                  } else if (doc.status === 'failed') {
                    badgeClass = 'badge-failed'
                    badgeText = 'Failed'
                    StatusIcon = AlertTriangle
                  }

                  const uploadDate = doc.uploadedAt
                    ? new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recent'

                  return (
                    <tr
                      key={doc._id}
                      style={{
                        borderBottom: '1px solid var(--color-border-subtle)',
                        fontSize: 'var(--text-sm)',
                        transition: 'background-color var(--transition)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Name & Type */}
                      <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--color-surface-raised)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-accent)',
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={17} />
                          </div>
                          <div>
                            <div className="font-medium" style={{ color: 'var(--color-text)' }}>
                              {doc.fileName}
                            </div>
                            <div className="text-xs text-muted uppercase">
                              {doc.fileType} format
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: 'var(--space-4) var(--space-4)' }}>
                        <span className={`badge ${badgeClass}`}>
                          <StatusIcon size={12} />
                          <span>{badgeText}</span>
                        </span>
                      </td>

                      {/* Pages / Chunks */}
                      <td style={{ padding: 'var(--space-4) var(--space-4)' }}>
                        <div className="text-sm font-medium">
                          {doc.pageCount || 1} {doc.pageCount === 1 ? 'page' : 'pages'}
                        </div>
                        <div className="text-xs text-muted">
                          {doc.chunkCount ? `${doc.chunkCount} vectors` : 'Calculating'}
                        </div>
                      </td>

                      {/* File Size */}
                      <td style={{ padding: 'var(--space-4) var(--space-4)', color: 'var(--color-text-secondary)' }}>
                        {formatBytes(doc.sizeBytes)}
                      </td>

                      {/* Upload Date */}
                      <td style={{ padding: 'var(--space-4) var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                        {uploadDate}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: 'var(--space-4) var(--space-6)', textAlign: 'right' }}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedSummaryDoc(doc)}
                            disabled={doc.status !== 'ready'}
                            title="View AI Summary"
                          >
                            <BookOpen size={14} />
                            <span>Summary</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleStartChat(doc)}
                            disabled={doc.status !== 'ready'}
                            title="Chat with Document"
                          >
                            <MessageSquare size={14} />
                            <span>Chat</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDocToDelete(doc)}
                            style={{ color: 'var(--color-error)', padding: '0.35rem 0.5rem' }}
                            title="Delete Document"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Modal */}
      <SummaryModal
        document={selectedSummaryDoc}
        isOpen={Boolean(selectedSummaryDoc)}
        onClose={() => setSelectedSummaryDoc(null)}
      />

      {/* Delete Confirmation Dialog */}
      {docToDelete && (
        <div className="dialog-backdrop" onClick={() => setDocToDelete(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3" style={{ color: 'var(--color-error)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Delete Document?</h3>
            </div>
            <p className="text-sm text-secondary mb-6">
              Are you sure you want to delete <strong>{docToDelete.fileName}</strong>?
              This will irreversibly remove its indexed FAISS vector embeddings, summaries, and associated conversation logs.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
