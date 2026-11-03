import React, { useState } from 'react'
import {
  User,
  Lock,
  Cpu,
  AlertCircle,
  Save,
  Shield,
  Activity,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const { addToast } = useToast()

  const [name, setName] = useState(user?.name || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      addToast('Name cannot be empty', 'error')
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile({ name: name.trim() })
      addToast('Profile updated successfully', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')

    if (!currentPassword) {
      setPasswordError('Current password is required')
      return
    }

    if (newPassword.length < 10) {
      setPasswordError('New password must be at least 10 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      await updateProfile({ currentPassword, newPassword })
      addToast('Password changed successfully', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message || 'Password update failed')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <div className="mb-8">
        <h2 style={{ fontSize: 'var(--text-3xl)', margin: '0 0 var(--space-2)' }}>
          System & Profile Settings
        </h2>
        <p className="text-secondary text-sm" style={{ margin: 0 }}>
          Manage your account credentials, security preferences, and inspect the underlying RAG vector pipeline architecture.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Profile Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <User size={20} className="text-accent" />
            <h3 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>Account Information</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="max-w-md">
            <div className="form-group">
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                value={user?.email || ''}
                disabled
                style={{ backgroundColor: 'var(--color-surface)', cursor: 'not-allowed' }}
              />
              <span className="text-xs text-muted mt-1">
                Email address cannot be changed once registered.
              </span>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={savingProfile}
              >
                <Save size={14} />
                <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <Lock size={20} className="text-accent" />
            <h3 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>Change Password</h3>
          </div>

          <form onSubmit={handleChangePassword} className="max-w-md">
            {passwordError && (
              <div
                className="flex items-center gap-2 mb-4 p-3 rounded"
                style={{
                  backgroundColor: 'var(--color-error-light)',
                  color: 'var(--color-error)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <AlertCircle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="label">Current Password</label>
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 10 characters"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="btn btn-secondary btn-sm"
                disabled={savingPassword}
              >
                <Shield size={14} />
                <span>{savingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Pipeline Architecture Specifications Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <Cpu size={20} className="text-accent" />
            <h3 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>
              RAG Pipeline Architecture
            </h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            <div
              className="p-4 rounded-card border"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <div className="text-xs text-muted uppercase font-semibold mb-1">
                Embedding Model
              </div>
              <div className="font-semibold text-base mb-1">all-MiniLM-L6-v2</div>
              <p className="text-xs text-secondary" style={{ margin: 0 }}>
                384 dense float32 dimensions with strict L2-normalization for cosine distance equivalence.
              </p>
            </div>

            <div
              className="p-4 rounded-card border"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <div className="text-xs text-muted uppercase font-semibold mb-1">
                Vector Indexing
              </div>
              <div className="font-semibold text-base mb-1">FAISS IndexFlatL2</div>
              <p className="text-xs text-secondary" style={{ margin: 0 }}>
                Deterministic nearest neighbor search with isolated index storage per document.
              </p>
            </div>

            <div
              className="p-4 rounded-card border"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <div className="text-xs text-muted uppercase font-semibold mb-1">
                Chunk Strategy
              </div>
              <div className="font-semibold text-base mb-1">500 chars / 50 overlap</div>
              <p className="text-xs text-secondary" style={{ margin: 0 }}>
                Preserves exact page numbering and character offsets for verifiable citation rendering.
              </p>
            </div>

            <div
              className="p-4 rounded-card border"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <div className="text-xs text-muted uppercase font-semibold mb-1">
                Safety & Verification
              </div>
              <div className="font-semibold text-base mb-1">Ground-Truth Only</div>
              <p className="text-xs text-secondary" style={{ margin: 0 }}>
                System-level refusal prompt triggered when semantic relevance drops below threshold (0.25).
              </p>
            </div>
          </div>

          <div
            className="mt-6 p-4 rounded-card flex flex-col gap-2"
            style={{ backgroundColor: 'var(--color-accent-light)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity size={20} className="text-accent" />
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-accent)' }}>
                    Dual-Microservice Topology & Data Flow
                  </div>
                  <div className="text-xs text-secondary">
                    Express API Gateway (Port 4000) ➔ Python RAG Service (Port 5001) ➔ Google Gemini
                  </div>
                </div>
              </div>
              <span className="badge badge-ready">Online</span>
            </div>
            <div className="text-xs text-secondary mt-2 pt-2 border-t border-accent/20">
              <strong>Data Flow Disclosure:</strong> Document excerpts and questions are sent to Google Gemini for answer and summary generation. Data handling and privacy are governed by Google's official policies: see <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline font-medium text-accent">Google Privacy Policy</a> and <a href="https://developers.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline font-medium text-accent">Google APIs Terms of Service</a>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
