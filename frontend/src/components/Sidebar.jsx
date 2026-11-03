import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FileText, MessageSquare, Settings, LogOut, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Sidebar() {
  const { user, logout, isDemo } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      addToast('Logged out successfully', 'info')
      navigate('/auth')
    } catch (err) {
      addToast('Logout error: ' + err.message, 'error')
    }
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: 'var(--space-6) var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-btn)',
              backgroundColor: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-lg)', lineHeight: 1.2, margin: 0, letterSpacing: '-0.02em' }}>
              DocuMind
            </h1>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              Verified Document Intelligence
            </p>
          </div>
        </div>

        {isDemo && (
          <div
            className="mt-3 flex items-center gap-1"
            style={{
              backgroundColor: 'var(--color-warning-light)',
              color: 'var(--color-warning)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={13} />
            <span>Interactive Demo Mode</span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ padding: 'var(--space-4) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <NavLink
          to="/"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <Sparkles size={18} />
          <span>NotebookLM Studio</span>
        </NavLink>

        <NavLink
          to="/documents"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <FileText size={18} />
          <span>Documents Repository</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <Settings size={18} />
          <span>System & Profile</span>
        </NavLink>
      </nav>

      {/* User profile section at bottom */}
      <div
        className="mt-auto"
        style={{
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: '#fff',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden" style={{ minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-text)',
                flexShrink: 0,
              }}
            >
              {userInitial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                className="font-medium text-sm"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--color-text)',
                }}
              >
                {user?.name || 'User'}
              </div>
              <div
                className="text-xs text-muted"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email || ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            title="Log out"
            style={{ padding: '0.4rem', color: 'var(--color-text-muted)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}

