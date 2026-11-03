import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import NotebookLMStudio from './pages/NotebookLMStudio'
import DocumentsPage from './pages/DocumentsPage'
import ChatPage from './pages/ChatPage'
import SettingsPage from './pages/SettingsPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import NotFoundPage from './pages/NotFoundPage'
import AuthPage from './pages/AuthPage'

function AppContent() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-3">
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
          <div className="text-sm font-medium text-[#7A7A74]">Initializing DocuMind AI Studio...</div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<NotebookLMStudio />} />
      <Route path="/studio" element={<NotebookLMStudio />} />
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}
