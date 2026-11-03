import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

const DEMO_USER = {
  _id: 'demo-user-123',
  name: 'Alex Morgan',
  email: 'alex@documind.internal',
  createdAt: new Date().toISOString(),
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  // Check current session on mount
  useEffect(() => {
    let mounted = true
    async function checkAuth() {
      try {
        const res = await authApi.getMe()
        if (mounted && res?.ok && res?.data?.user) {
          setUser(res.data.user)
          setIsDemo(false)
        } else if (mounted) {
          setUser(DEMO_USER)
          setIsDemo(true)
        }
      } catch (err) {
        // If not authenticated or backend not running yet, default to local researcher
        if (mounted) {
          setUser(DEMO_USER)
          setIsDemo(true)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    checkAuth()
    return () => {
      mounted = false
    }
  }, [])

  const login = async (email, password) => {
    try {
      const res = await authApi.login(email, password)
      if (res?.ok && res?.data?.user) {
        setUser(res.data.user)
        setIsDemo(false)
        return res.data.user
      }
    } catch (err) {
      if (err.code === 'network_error') {
        // Backend not available, allow demo mode
        setUser(DEMO_USER)
        setIsDemo(true)
        return DEMO_USER
      }
      throw err
    }
  }

  const register = async (name, email, password) => {
    try {
      const res = await authApi.register(name, email, password)
      if (res?.ok && res?.data?.user) {
        setUser(res.data.user)
        setIsDemo(false)
        return res.data.user
      }
    } catch (err) {
      if (err.code === 'network_error') {
        const demo = { ...DEMO_USER, name, email }
        setUser(demo)
        setIsDemo(true)
        return demo
      }
      throw err
    }
  }

  const logout = async () => {
    try {
      if (!isDemo) {
        await authApi.logout()
      }
    } catch (_) {
      // Ignore logout errors
    } finally {
      setUser(null)
      setIsDemo(false)
    }
  }

  const updateProfile = async (data) => {
    if (isDemo) {
      setUser((prev) => ({ ...prev, name: data.name || prev.name }))
      return { ok: true, data: { user: { ...user, name: data.name || user.name } } }
    }
    const res = await authApi.updateMe(data)
    if (res?.ok && res?.data?.user) {
      setUser(res.data.user)
    }
    return res
  }

  const enterDemoMode = () => {
    setUser(DEMO_USER)
    setIsDemo(true)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo,
        login,
        register,
        logout,
        updateProfile,
        enterDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
