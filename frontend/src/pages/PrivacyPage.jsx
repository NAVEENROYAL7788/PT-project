import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft, ExternalLink } from 'lucide-react'

export default function PrivacyPage() {
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
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1C1917]">Privacy Policy & Data Disclosure</h1>
              <p className="text-xs text-[#78716C] mt-0.5">Last updated: November 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-[#44403C] leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-[#1C1917] mb-2">1. Overview</h2>
              <p>
                DocuMind is an intelligent document analysis and study assistant. We prioritize transparency in how your documents, queries, and generated notes are processed and stored.
              </p>
            </section>

            <section className="p-4 rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/20">
              <h2 className="text-base font-semibold text-[#0F766E] mb-2 flex items-center gap-2">
                <span>2. AI Service Data-Flow Disclosure</span>
              </h2>
              <p className="mb-2">
                Document excerpts and questions are sent to Google Gemini for answer generation and document summarization.
              </p>
              <p className="text-xs text-[#57534E]">
                We do not claim anything about Google's data handling that has not been independently verified; data processing and privacy terms are governed by Google's official policies:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0D9488] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Google Privacy Policy <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <a
                    href="https://developers.google.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0D9488] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Google APIs Terms of Service <ExternalLink size={12} />
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1C1917] mb-2">3. Local Retrieval & Grounding</h2>
              <p>
                Document embeddings are generated using the local <code>all-MiniLM-L6-v2</code> transformer model and indexed locally using FAISS. Only the specific top-ranked passage excerpts relevant to your query are provided to the LLM for grounded answer synthesis.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1C1917] mb-2">4. User Account Isolation</h2>
              <p>
                Documents and conversations are strictly isolated per user account in MongoDB. Users cannot query, view, or delete other users' documents.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

