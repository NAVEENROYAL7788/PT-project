import React from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center p-6 text-[#1E1E1E]">
      <div className="max-w-md w-full bg-white border border-[#E7E5E4] rounded-2xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center mx-auto mb-4">
          <HelpCircle size={24} />
        </div>
        <h1 className="text-3xl font-bold text-[#1C1917] mb-2">404</h1>
        <h2 className="text-base font-semibold text-[#44403C] mb-2">Page Not Found</h2>
        <p className="text-sm text-[#78716C] mb-6">
          The requested page does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Studio</span>
        </Link>
      </div>
    </div>
  )
}

