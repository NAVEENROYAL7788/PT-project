import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1E1E1E] p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[#57534E] hover:text-[#0D9488] mb-8 font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Studio</span>
        </Link>

        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E7E5E4]">
            <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1C1917]">Terms of Service</h1>
              <p className="text-xs text-[#78716C] mt-0.5">Effective: November 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-[#44403C] leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-[#1C1917] mb-2">1. Acceptance of Terms</h2>
              <p>
                By accessing and using DocuMind, you agree to comply with and be bound by these Terms of Service. If you do not agree, do not use the application.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1C1917] mb-2">2. Document Ownership & Content Rights</h2>
              <p>
                You retain full copyright and ownership of all documents, PDFs, notes, and study material you upload. We do not use your proprietary documents to train public foundational AI models.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1C1917] mb-2">3. Third-Party AI Services</h2>
              <p>
                Question answering and document summarization features utilize Google Gemini. By submitting queries, you acknowledge that relevant document excerpts are sent to Google Gemini in accordance with Google's API terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1C1917] mb-2">4. Acceptable Use</h2>
              <p>
                Users agree not to upload malicious files, exploit system boundaries, or use the service for unlawful purposes. We reserve the right to suspend accounts that violate these guidelines.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

