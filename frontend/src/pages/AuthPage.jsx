import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, register, enterDemoMode } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Name is required')
          setLoading(false)
          return
        }
        if (password.length < 10) {
          setError('Password must be at least 10 characters')
          setLoading(false)
          return
        }
        await register(name.trim(), email.trim(), password)
        addToast('Account created successfully!', 'success')
      } else {
        await login(email.trim(), password)
        addToast('Welcome back!', 'success')
      }
      navigate('/documents')
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoMode = () => {
    enterDemoMode()
    addToast('Entered Interactive Demo Mode', 'info')
    navigate('/documents')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        padding: 'var(--space-4)',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Logo and Intro */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-btn)',
              backgroundColor: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              margin: '0 auto var(--space-3)',
            }}
          >
            <Sparkles size={22} />
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', margin: '0 0 var(--space-1)' }}>
            DocuMind
          </h2>
          <p className="text-secondary text-sm" style={{ margin: 0 }}>
            Verifiable Document Intelligence & Question Answering
          </p>
        </div>

        {/* Tab switcher */}
        <div className="tab-list" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className={`tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(false)
              setError('')
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(true)
              setError('')
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="flex items-center gap-2 mb-4 p-3 rounded"
            style={{
              backgroundColor: 'var(--color-error-light)',
              color: 'var(--color-error)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Eleanor Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder={isRegister ? 'At least 10 characters' : '••••••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full justify-center mt-2"
            disabled={loading}
          >
            <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        <div className="divider" style={{ margin: 'var(--space-6) 0' }} />

        {/* Quick Demo Mode Access */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm w-full justify-center"
            onClick={handleDemoMode}
            title="Explore without running MongoDB/Flask"
          >
            <ShieldCheck size={15} className="text-accent" />
            <span>Explore in Interactive Demo Mode</span>
          </button>
          <div className="text-xs text-muted mt-2">
            No active backend required to preview full UI & workflows.
          </div>
        </div>
      </div>
    </div>
  )
}
