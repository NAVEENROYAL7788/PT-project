import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Headphones,
  BookOpen,
  FileText,
  Send,
  Plus,
  Play,
  Pause,
  HelpCircle,
  Lightbulb,
  GraduationCap,
  Pin,
  Trash2,
  Check,
  Copy,
  ChevronRight,
  ChevronDown,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Upload,
  Bookmark,
  Share2,
  AlertCircle,
  RefreshCw,
  Settings,
  Download,
  FolderOpen,
  CheckCircle2,
  RotateCcw,
  CheckCircle,
  XCircle,
  ArrowRight,
  BrainCircuit,
  Award,
  Gauge,
  Zap,
  Moon,
  Sun,
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { documentsApi } from '../lib/api'
import {
  chunkDocument,
  retrieveRelevantChunks,
  answerQuestionWithRAG,
  extractKeyTopics,
  generateDynamicLesson,
  generateDynamicPodcast,
  generateDynamicQuiz,
  generateDynamicGlossary,
  cleanForSpeech,
  summarizeForSpeech,
  extractTextFromPDF,
} from '../lib/ragEngine'

// ============================================================================
// MARKDOWN RENDERERS WITH PRESERVED LINE BREAKS & STRUCTURE
// ============================================================================

function renderInlineMarkdown(text) {
  if (!text) return null
  const segments = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/)
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
    const codeMatch = remaining.match(/^(.*?)`(.+?)`/)

    const firstBold = boldMatch ? boldMatch.index + (boldMatch[1]?.length || 0) : Infinity
    const firstItalic = italicMatch ? italicMatch.index + (italicMatch[1]?.length || 0) : Infinity
    const firstCode = codeMatch ? codeMatch.index + (codeMatch[1]?.length || 0) : Infinity

    if (firstBold === Infinity && firstItalic === Infinity && firstCode === Infinity) {
      segments.push(<span key={key++}>{remaining}</span>)
      break
    }

    if (boldMatch && firstBold <= firstItalic && firstBold <= firstCode) {
      if (boldMatch[1]) segments.push(<span key={key++}>{boldMatch[1]}</span>)
      segments.push(<strong key={key++} className="font-bold text-[#1A1A18]">{boldMatch[2]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
    } else if (codeMatch && firstCode <= firstItalic && firstCode <= firstBold) {
      if (codeMatch[1]) segments.push(<span key={key++}>{codeMatch[1]}</span>)
      segments.push(
        <code
          key={key++}
          className="font-mono bg-[#EFEFE9] text-[#0D7377] px-1.5 py-0.5 rounded text-[0.88em]"
        >
          {codeMatch[2]}
        </code>
      )
      remaining = remaining.slice(codeMatch[0].length)
    } else if (italicMatch) {
      if (italicMatch[1]) segments.push(<span key={key++}>{italicMatch[1]}</span>)
      segments.push(<em key={key++} className="italic text-[#4A4A46]">{italicMatch[2]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
    } else {
      segments.push(<span key={key++}>{remaining}</span>)
      break
    }
  }

  return segments
}

// Renders markdown text with explicit block-level line breaks (no collapse!)
function MarkdownSegment({ text }) {
  if (!text) return null

  // Pre-process inline quiz questions and options into distinct lines so they never squash together
  const normalizedText = text
    .replace(/(?:^|\s)(Q\d+:)/g, '\n\n$1 ')
    .replace(/(?:\s*->\s*|\s{2,})(\([A-D]\))/g, '\n$1 ')

  const lines = normalizedText.split('\n')

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-[#1A1A18]">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim()

        // Empty line separator
        if (!trimmed) {
          return <div key={lIdx} className="h-2" />
        }

        // Quiz Question Label (Q1:, Q2:)
        const qMatch = trimmed.match(/^(Q\d+:)\s*(.*)/)
        if (qMatch) {
          return (
            <div
              key={lIdx}
              className="pt-3 pb-1 font-bold text-[#1A1A18] text-sm flex items-start gap-2 border-t border-[#E0DED8]/70 mt-2.5 first:border-t-0 first:mt-0"
            >
              <span className="bg-[#0D7377] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 shadow-2xs">
                {qMatch[1].replace(':', '')}
              </span>
              <span className="flex-1 text-[#1A1A18] font-semibold">
                {renderInlineMarkdown(qMatch[2])}
              </span>
            </div>
          )
        }

        // Multiple-choice quiz option ((A), (B), (C), (D))
        const optMatch = trimmed.match(/^(\([A-D]\))\s*(.*)/)
        if (optMatch) {
          return (
            <div
              key={lIdx}
              className="my-1.5 ml-3 p-2 rounded-lg bg-white border border-[#E0DED8] hover:border-[#0D7377]/60 hover:bg-[#F4F4F1]/60 transition flex items-start gap-2.5 shadow-2xs"
            >
              <span className="font-mono font-bold text-xs bg-[#E8F4F4] text-[#0D7377] border border-[#0D7377]/30 px-2 py-0.5 rounded-md shrink-0">
                {optMatch[1]}
              </span>
              <span className="text-xs text-[#2A2A28] pt-0.5 font-medium flex-1">
                {renderInlineMarkdown(optMatch[2])}
              </span>
            </div>
          )
        }

        // Headings (### or ##)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lIdx} className="font-serif font-bold text-[#0D7377] text-sm pt-2 pb-0.5">
              {renderInlineMarkdown(trimmed.replace(/^###\s*/, ''))}
            </h4>
          )
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={lIdx} className="font-serif font-bold text-[#1A1A18] text-base pt-2.5 pb-1 border-b border-[#E0DED8]">
              {renderInlineMarkdown(trimmed.replace(/^##\s*/, ''))}
            </h3>
          )
        }

        // Blockquotes (> ...)
        if (/^\s*>\s*/.test(line)) {
          const quoteText = line.replace(/^\s*>\s*/, '')
          return (
            <div
              key={lIdx}
              className="my-1.5 pl-3 py-1.5 border-l-3 border-[#0D7377] bg-[#F4F4F1] rounded-r-md italic text-[#4A4A46] text-xs leading-relaxed"
            >
              {renderInlineMarkdown(quoteText)}
            </div>
          )
        }

        // Bullets (• or - or *)
        if (/^\s*[•\-\*]\s+/.test(line)) {
          const itemText = line.replace(/^\s*[•\-\*]\s+/, '')
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="text-[#0D7377] font-bold text-xs mt-1 shrink-0">•</span>
              <span className="flex-1">{renderInlineMarkdown(itemText)}</span>
            </div>
          )
        }

        // Numbered list items (1. 2.)
        const numMatch = line.match(/^\s*(\d+)\.\s+(.*)/)
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="font-bold text-[#0D7377] text-xs mt-0.5 shrink-0 bg-[#E8F4F4] px-1.5 py-0.5 rounded">
                {numMatch[1]}
              </span>
              <span className="flex-1">{renderInlineMarkdown(numMatch[2])}</span>
            </div>
          )
        }

        // Standard paragraph line
        return (
          <div key={lIdx} className="min-h-[1.25rem]">
            {renderInlineMarkdown(line)}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// INTERACTIVE QUIZ WIDGET ("Click and Find Answer Type")
// ============================================================================

function InteractiveQuizWidget({ quiz = [], onCitationClick, onExplainConcept, title = 'Interactive Quiz', isDarkMode = true }) {
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [showSummary, setShowSummary] = useState(false)
  const { addToast } = useToast()

  if (!quiz || quiz.length === 0) return null

  const handleSelectOption = (qId, optionIdx, correctIdx) => {
    if (selectedAnswers[qId] !== undefined) return // already answered
    const isCorrect = optionIdx === correctIdx
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionIdx }))

    if (isCorrect) {
      addToast('🎉 Correct! Verified by document evidence.', 'success')
    } else {
      addToast('💡 Not quite. See the verified explanation below.', 'info')
    }
  }

  const handleResetQuiz = () => {
    setSelectedAnswers({})
    setShowSummary(false)
    addToast('Quiz reset! Try again.', 'info')
  }

  // Calculate score
  const totalQuestions = quiz.length
  const answeredCount = Object.keys(selectedAnswers).length
  const score = quiz.reduce((acc, q) => {
    return acc + (selectedAnswers[q.id] === q.correctIndex ? 1 : 0)
  }, 0)
  const isFinished = answeredCount === totalQuestions

  return (
    <div
      className={`rounded-2xl p-5 space-y-4 my-2 transition-all ${
        isDarkMode
          ? 'bg-[#121214]/90 backdrop-blur-md border border-[#27272a] text-[#F8FAFC] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
          : 'bg-white border border-[#0D7377]/30 text-[#1A1A18] shadow-xs'
      }`}
    >
      {/* Quiz Header */}
      <div className={`flex items-center justify-between pb-3 border-b ${isDarkMode ? 'border-[#27272a]' : 'border-[#E0DED8]'}`}>
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              isDarkMode
                ? 'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                : 'bg-[#E8F4F4] text-[#0D7377]'
            }`}
          >
            <GraduationCap size={18} />
          </div>
          <div>
            <h4 className={`font-serif text-sm font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>
              {title}
            </h4>
            <span className={`text-[11px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
              Click any option to test your active recall
            </span>
          </div>
        </div>

        {/* Live Score Tracker */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-xs font-bold ${isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'}`}>
              {score} / {totalQuestions} Correct
            </div>
            <div className={`text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
              {answeredCount} of {totalQuestions} solved
            </div>
          </div>
          <div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
              isDarkMode ? 'border-[#06B6D4] text-[#06B6D4] shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'border-[#0D7377] text-[#0D7377]'
            }`}
          >
            {totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Questions Stack */}
      <div className="space-y-4">
        {quiz.map((q, qIdx) => {
          const userChoice = selectedAnswers[q.id]
          const isAnswered = userChoice !== undefined
          const isCorrect = userChoice === q.correctIndex

          return (
            <div
              key={q.id || qIdx}
              className={`p-4 rounded-xl border transition-all ${
                isAnswered
                  ? isCorrect
                    ? isDarkMode
                      ? 'bg-[#10B981]/15 border-[#10B981]/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-[#FAFCFA] border-[#10B981]/40 shadow-xs'
                    : isDarkMode
                    ? 'bg-[#EF4444]/15 border-[#EF4444]/50 text-white'
                    : 'bg-[#FFFDFD] border-[#EF4444]/30 shadow-xs'
                  : isDarkMode
                  ? 'bg-[#0a0a0c] border-[#27272a] text-white'
                  : 'bg-[#FAFAF8] border-[#E0DED8]'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isDarkMode
                      ? 'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30'
                      : 'bg-[#E8F4F4] text-[#0D7377]'
                  }`}
                >
                  <span>Q{qIdx + 1}</span>
                  <span className={`${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'} font-normal`}>
                    • Page {q.page || 1} Grounded
                  </span>
                </span>
                {isAnswered && (
                  <span
                    className={`text-xs font-bold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      isCorrect
                        ? isDarkMode
                          ? 'bg-[#10B981]/25 text-[#34D399] border border-[#10B981]/40'
                          : 'bg-[#EAF6EE] text-[#1E8449]'
                        : isDarkMode
                        ? 'bg-[#EF4444]/25 text-[#F87171] border border-[#EF4444]/40'
                        : 'bg-[#FDF0EE] text-[#C0392B]'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 size={13} /> Correct!
                      </>
                    ) : (
                      <>
                        <XCircle size={13} /> Incorrect
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* Question Text */}
              <p className={`text-xs font-semibold mb-3 leading-relaxed ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>
                {q.question}
              </p>

              {/* Options (A, B, C) */}
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx)
                  const isSelected = userChoice === optIdx
                  const isThisCorrect = optIdx === q.correctIndex

                  let btnStyle = isDarkMode
                    ? 'bg-[#121214] border-[#27272a] text-[#CBD5E1] hover:border-[#06B6D4] hover:bg-[#06B6D4]/10 hover:text-white'
                    : 'bg-white border-[#E0DED8] text-[#1A1A18] hover:border-[#0D7377] hover:bg-[#F4F4F1]'

                  if (isAnswered) {
                    if (isThisCorrect) {
                      btnStyle = isDarkMode
                        ? 'bg-[#10B981]/25 border-[#10B981] text-[#34D399] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)] ring-1 ring-[#10B981]'
                        : 'bg-[#EAF6EE] border-[#10B981] text-[#1E8449] font-semibold ring-1 ring-[#10B981]'
                    } else if (isSelected && !isCorrect) {
                      btnStyle = isDarkMode
                        ? 'bg-[#EF4444]/25 border-[#EF4444] text-[#F87171] ring-1 ring-[#EF4444]'
                        : 'bg-[#FDF0EE] border-[#EF4444] text-[#C0392B] ring-1 ring-[#EF4444]'
                    } else {
                      btnStyle = isDarkMode
                        ? 'bg-[#121214]/40 border-[#27272a] text-[#64748B] opacity-60'
                        : 'bg-white/60 border-[#E0DED8] text-[#7A7A74] opacity-70'
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(q.id, optIdx, q.correctIndex)}
                      className={`w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all cursor-pointer ${btnStyle}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isAnswered && isThisCorrect
                              ? 'bg-[#10B981] text-white'
                              : isAnswered && isSelected && !isCorrect
                              ? 'bg-[#EF4444] text-white'
                              : isDarkMode
                              ? 'bg-[#0a0a0c] text-[#06B6D4] border border-[#06B6D4]/30'
                              : 'bg-[#EFEFE9] text-[#4A4A46]'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="truncate">{opt}</span>
                      </div>

                      {isAnswered && isThisCorrect && (
                        <span
                          className={`text-[11px] font-bold shrink-0 flex items-center gap-1 ${
                            isDarkMode ? 'text-[#34D399]' : 'text-[#1E8449]'
                          }`}
                        >
                          <Check size={13} /> Verified
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Instant Verified Explanation Dropdown */}
              {isAnswered && (
                <div
                  className={`mt-3 p-3 rounded-lg text-xs leading-relaxed border ${
                    isCorrect
                      ? isDarkMode
                        ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#A7F3D0]'
                        : 'bg-[#EAF6EE]/70 border-[#10B981]/30 text-[#1E8449]'
                      : isDarkMode
                      ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#FDE68A]'
                      : 'bg-[#FEF8EE] border-[#D97706]/30 text-[#8F530B]'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} />
                      <span>{isCorrect ? 'Verified Source Evidence:' : 'Review the Document Evidence:'}</span>
                    </span>
                    <button
                      onClick={() => onCitationClick && onCitationClick(q.citationId || qIdx + 1)}
                      className={`text-[10px] px-2 py-0.5 rounded transition font-bold ${
                        isDarkMode
                          ? 'bg-[#121214] border border-[#06B6D4]/50 text-[#06B6D4] hover:bg-[#06B6D4] hover:text-[#000000]'
                          : 'bg-white border border-[#0D7377]/40 text-[#0D7377] hover:bg-[#0D7377] hover:text-white'
                      }`}
                      title="Inspect original page offset"
                    >
                      [{q.citationId || qIdx + 1}] View Quote
                    </button>
                  </div>
                  <p className="text-[11px]">{q.explanation}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quiz Completion Footer */}
      {isFinished && (
        <div
          className={`pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl ${
            isDarkMode ? 'border-[#27272a] bg-[#0a0a0c]' : 'border-[#E0DED8] bg-[#FAFAF8]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Award className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} size={20} />
            <div>
              <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>
                Quiz Complete: {score} / {totalQuestions} ({Math.round((score / totalQuestions) * 100)}%)
              </div>
              <div className={`text-[11px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                {score === totalQuestions
                  ? '🌟 Perfect score! You have mastered these key concepts.'
                  : 'Great effort! Review citations above or ask for an ELI5 breakdown.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetQuiz}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                isDarkMode
                  ? 'bg-[#121214] border-[#27272a] hover:border-[#06B6D4] text-white'
                  : 'bg-white border-[#E0DED8] hover:border-[#0D7377] text-[#1A1A18]'
              }`}
            >
              <RotateCcw size={12} />
              <span>Retake Quiz</span>
            </button>
            {onExplainConcept && (
              <button
                onClick={() => onExplainConcept('Explain the key concepts tested in this quiz simply like I am 5')}
                className={`px-3 py-1.5 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-[#06B6D4] to-[#0284C7] hover:brightness-110 shadow-[0_0_12px_rgba(6,182,212,0.4)] text-[#000000] font-bold'
                    : 'bg-[#0D7377] hover:bg-[#0A5F62]'
                }`}
              >
                <Lightbulb size={12} />
                <span>Explain Missed (ELI5)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// WELCOME STUDY HUB CARD (Structured, Professional Onboarding)
// ============================================================================

function WelcomeStudyHub({ activeSource, onQuickAction, onAskQuestion, isDarkMode = true }) {
  return (
    <div
      className={`rounded-2xl p-6 space-y-5 transition-all ${
        isDarkMode
          ? 'bg-gradient-to-br from-[#121214]/95 via-[#121214]/95 to-[#000000]/95 border border-[#27272a] text-[#F8FAFC] shadow-[0_12px_40px_rgba(0,0,0,0.5)]'
          : 'bg-gradient-to-b from-[#FAFAF8] to-white border border-[#E0DED8] text-[#1A1A18] shadow-xs'
      }`}
    >
      {/* Welcome Headline */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1 ${
              isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'
            }`}
          >
            <Sparkles size={14} className={isDarkMode ? 'text-[#06B6D4] animate-pulse' : ''} />
            <span>DocuMind • AI Study Studio</span>
          </div>
          <h2 className={`font-serif text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>
            Welcome to Your Grounded Study Studio
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
            I teach you directly from your uploaded files with zero hallucination, intuitive analogies, and verified citations.
          </p>
        </div>

        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 ${
            isDarkMode
              ? 'bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : 'bg-[#EAF6EE] text-[#1E8449] border border-[#1E8449]/20'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>Vector RAG Active</span>
        </div>
      </div>

      {/* Active Source Strip */}
      <div
        className={`rounded-xl p-3 flex items-center justify-between gap-3 text-xs border ${
          isDarkMode ? 'bg-[#0a0a0c]/90 border-[#27272a] text-[#CBD5E1]' : 'bg-[#F4F4F1] border-[#E0DED8]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              isDarkMode
                ? 'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30'
                : 'bg-[#E8F4F4] text-[#0D7377]'
            }`}
          >
            📄
          </div>
          <div className="min-w-0">
            <div className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>{activeSource.title}</div>
            <div className={`text-[11px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
              {activeSource.pages} Pages • {activeSource.chunks?.length || 1} Verified Passages • 100% Grounded
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeSource.topics?.slice(0, 2).map((t, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                isDarkMode
                  ? 'bg-[#121214] border-[#27272a] text-[#06B6D4]'
                  : 'bg-white border-[#E0DED8] text-[#4A4A46]'
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* 4 Learning Pathways */}
      <div>
        <div className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
          Select How You Would Like to Learn:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Pathway 1: ELI5 */}
          <button
            type="button"
            onClick={() => onAskQuestion(`Explain ${activeSource.title} simply like I am 5 with everyday analogies`)}
            className={`p-3.5 rounded-xl text-left transition-all group cursor-pointer flex items-start gap-3 border ${
              isDarkMode
                ? 'bg-[#121214]/80 border-[#27272a] hover:border-[#06B6D4] hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:-translate-y-0.5 text-white'
                : 'bg-white border-[#E0DED8] hover:border-[#0D7377] hover:shadow-xs'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${
                isDarkMode ? 'bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/30' : 'bg-[#FEF8EE] text-[#D97706]'
              }`}
            >
              💡
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-xs font-bold flex items-center gap-1 ${
                  isDarkMode ? 'text-white group-hover:text-[#06B6D4]' : 'text-[#1A1A18] group-hover:text-[#0D7377]'
                }`}
              >
                <span>Explain Simply (ELI5)</span>
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className={`text-[11px] mt-0.5 line-clamp-2 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                Turn dense technical terms into intuitive, real-world analogies you can grasp in seconds.
              </p>
            </div>
          </button>

          {/* Pathway 2: Interactive Quiz */}
          <button
            type="button"
            onClick={() => onAskQuestion(`Quiz me on ${activeSource.title} with interactive practice questions`)}
            className={`p-3.5 rounded-xl text-left transition-all group cursor-pointer flex items-start gap-3 border ${
              isDarkMode
                ? 'bg-[#121214]/80 border-[#27272a] hover:border-[#06B6D4] hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:-translate-y-0.5 text-white'
                : 'bg-white border-[#E0DED8] hover:border-[#0D7377] hover:shadow-xs'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${
                isDarkMode ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30' : 'bg-[#E8F4F4] text-[#0D7377]'
              }`}
            >
              📝
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-xs font-bold flex items-center gap-1 ${
                  isDarkMode ? 'text-white group-hover:text-[#06B6D4]' : 'text-[#1A1A18] group-hover:text-[#0D7377]'
                }`}
              >
                <span>Interactive Practice Quiz</span>
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className={`text-[11px] mt-0.5 line-clamp-2 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                Click-and-solve multiple choice questions with instant scoring and verified passage quotes.
              </p>
            </div>
          </button>

          {/* Pathway 3: AI Study Tutor Audio Lesson */}
          <button
            type="button"
            onClick={() => onQuickAction && onQuickAction('audio')}
            className={`p-3.5 rounded-xl text-left transition-all group cursor-pointer flex items-start gap-3 border ${
              isDarkMode
                ? 'bg-[#121214]/80 border-[#27272a] hover:border-[#06B6D4] hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:-translate-y-0.5 text-white'
                : 'bg-white border-[#E0DED8] hover:border-[#0D7377] hover:shadow-xs'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${
                isDarkMode ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30' : 'bg-[#E8F4F4] text-[#0D7377]'
              }`}
            >
              🎧
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-xs font-bold flex items-center gap-1 ${
                  isDarkMode ? 'text-white group-hover:text-[#06B6D4]' : 'text-[#1A1A18] group-hover:text-[#0D7377]'
                }`}
              >
                <span>AI Study Tutor • Voice Lecture</span>
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className={`text-[11px] mt-0.5 line-clamp-2 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                1-on-1 concept teaching directly to you with adjustable playback speed (1x–2x).
              </p>
            </div>
          </button>

          {/* Pathway 4: Study Guide */}
          <button
            type="button"
            onClick={() => onQuickAction && onQuickAction('guide')}
            className={`p-3.5 rounded-xl text-left transition-all group cursor-pointer flex items-start gap-3 border ${
              isDarkMode
                ? 'bg-[#121214]/80 border-[#27272a] hover:border-[#06B6D4] hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:-translate-y-0.5 text-white'
                : 'bg-white border-[#E0DED8] hover:border-[#0D7377] hover:shadow-xs'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${
                isDarkMode ? 'bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/30' : 'bg-[#FDF0EE] text-[#DC2626]'
              }`}
            >
              📖
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-xs font-bold flex items-center gap-1 ${
                  isDarkMode ? 'text-white group-hover:text-[#06B6D4]' : 'text-[#1A1A18] group-hover:text-[#0D7377]'
                }`}
              >
                <span>Source Study Guide</span>
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className={`text-[11px] mt-0.5 line-clamp-2 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                View structured outline, core definitions, and terminology glossary extracted from text.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Quick-Start Prompts Stack */}
      <div>
        <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
          Or Ask a Verified Question Directly:
        </div>
        <div className="flex flex-wrap gap-2">
          {activeSource.suggestedQuestions?.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => onAskQuestion(sq)}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center gap-1.5 border ${
                isDarkMode
                  ? 'bg-[#0a0a0c] border-[#27272a] text-[#CBD5E1] hover:text-[#06B6D4] hover:border-[#06B6D4] hover:shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-white border-[#E0DED8] hover:border-[#0D7377] hover:text-[#0D7377] text-[#4A4A46] shadow-2xs'
              }`}
            >
              <span className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'}>✦</span>
              <span>{sq}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// INITIAL DEMO DOCUMENT & SOURCE DATA
// ============================================================================

const DEMO_1_TEXT = `Section 4.2 - Operating Metrics
Operating margins finished at 28.4% for Q3, representing a 310 basis point improvement year-over-year. The variance was driven by accelerated adoption of automated ingestion pipelines.
Section 5.1 - Cost Reduction
Reductions in manual verification overhead accounted for approximately 65% of net efficiency gains, allowing redeployment of human audit resources to exception governance.
Section 6.3 - Audit Protocol
Deterministic vector retrieval guarantees zero hallucination by rejecting speculative completions when semantic cosine distance drops below the 0.25 threshold.
Full audit trail is maintained with immutable chunk and page offsets across all verified transactions. Compliance monitoring under Section 6 requires quarterly review of vector similarity distributions.`

const DEMO_1_CHUNKS = chunkDocument(DEMO_1_TEXT, 'src-1', 'Q3_Financial_Compliance_Report.pdf')

const INITIAL_SOURCE = {
  id: 'src-1',
  title: 'Q3_Financial_Compliance_Report.pdf',
  type: 'pdf',
  size: '1.4 MB',
  pages: 14,
  words: 4200,
  uploadedAt: '1 hour ago',
  selected: true,
  chunks: DEMO_1_CHUNKS,
  summary:
    'This comprehensive compliance filing analyzes operational performance, governance mandates, and cost-reduction initiatives for Q3. Operating margins increased to 28.4% (up 310 bps year-over-year) driven by deterministic vector automation which reduced manual verification overhead by 65%.',
  topics: ['Operating Margins', 'Vector Automation', 'Audit Compliance', 'Cost Optimization'],
  suggestedQuestions: [
    'Explain the 65% verification overhead reduction like I am 5',
    'What were the core drivers behind the 28.4% margin expansion?',
    'What compliance protocols are mandated under Section 6?',
    'Quiz me on the key metrics from this report',
  ],
  passages: DEMO_1_CHUNKS.map((c, i) => ({
    id: i + 1,
    page: c.page,
    section: c.section,
    text: c.text,
  })),
  podcastScript: generateDynamicPodcast(DEMO_1_CHUNKS, 'Q3_Financial_Compliance_Report.pdf'),
  glossary: generateDynamicGlossary(DEMO_1_CHUNKS),
  quiz: generateDynamicQuiz(DEMO_1_CHUNKS, 'Q3_Financial_Compliance_Report.pdf'),
}

// ============================================================================
// MAIN NOTEBOOKLM STUDIO COMPONENT
// ============================================================================

export default function NotebookLMStudio() {
  const [sources, setSources] = useState([INITIAL_SOURCE])
  const [activeSourceId, setActiveSourceId] = useState(INITIAL_SOURCE.id)
  const [activeStudioTab, setActiveStudioTab] = useState('audio') // 'audio' | 'guide' | 'quiz' | 'notes'

  // Chat State — Initial Message is the Welcome Study Hub
  const [messages, setMessages] = useState([
    {
      id: 'm-welcome',
      role: 'assistant',
      isWelcome: true,
      content: '',
      citations: [],
    },
  ])
  const [inputQuestion, setInputQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [activeCitation, setActiveCitation] = useState(null)

  // Voice Assistant State
  const [isSpeakingAnswer, setIsSpeakingAnswer] = useState(false)
  const [speakingText, setSpeakingText] = useState('')
  const [isListeningMic, setIsListeningMic] = useState(false)
  const [speechRate, setSpeechRate] = useState(1.25) // Speed control (1x, 1.25x, 1.5x, 1.75x, 2x)
  const [isDarkMode, setIsDarkMode] = useState(true) // Aesthetic Dark Command-Center Theme
  const recognitionRef = useRef(null)

  // Audio Podcast State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)

  // Notes State
  const [notes, setNotes] = useState([
    '📌 Key Takeaway: 65% of manual verification tasks were eliminated through FAISS vector indexing.',
    '📌 Margin Impact: Q3 operating margins reached 28.4% (up 310 bps YoY).',
  ])
  const [newNoteText, setNewNoteText] = useState('')

  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const { addToast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()

  const activeSource = sources.find((s) => s.id === activeSourceId) || sources[0] || INITIAL_SOURCE

  // Ensure window viewport stays locked to the top
  useEffect(() => {
    window.scrollTo(0, 0)
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0
    }
  }, [])

  // Safely scroll only the chat container (never window/document body) when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current && messages.length > 1) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, isThinking])

  // Stop any speech when switching documents or unmounting
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [activeSourceId])

  // Voice Assistant: Listen with Microphone
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      addToast('Microphone speech recognition is not supported in this browser.', 'warning')
      return
    }

    if (isListeningMic) {
      if (recognitionRef.current) recognitionRef.current.stop()
      setIsListeningMic(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsListeningMic(true)
        addToast('Voice Assistant is listening... Speak your question now', 'info')
      }

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((res) => res[0].transcript)
          .join('')
        setInputQuestion(transcript)
      }

      recognition.onerror = (err) => {
        console.warn('Speech recognition notice:', err)
        setIsListeningMic(false)
      }

      recognition.onend = () => {
        setIsListeningMic(false)
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch (err) {
      setIsListeningMic(false)
      addToast('Could not access microphone: ' + err.message, 'error')
    }
  }

  // Speed Controller: Change playback speed (1x, 1.25x, 1.5x, 1.75x, 2x)
  const changeSpeechRate = (newRate) => {
    setSpeechRate(newRate)
    addToast(`Voice speed set to ${newRate}x`, 'info')

    if (isPlayingAudio) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      playHostDialogue(currentLineIndex, newRate)
    } else if (isSpeakingAnswer && speakingText) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      const shortSpeech = summarizeForSpeech(speakingText)
      const utter = new SpeechSynthesisUtterance(shortSpeech)
      utter.rate = newRate
      utter.pitch = 1.0
      utter.onstart = () => setIsSpeakingAnswer(true)
      utter.onend = () => {
        setIsSpeakingAnswer(false)
        setSpeakingText('')
      }
      utter.onerror = () => {
        setIsSpeakingAnswer(false)
        setSpeakingText('')
      }
      window.speechSynthesis.speak(utter)
    }
  }

  // Voice Assistant: Speak Answer Aloud (Short & Sweet Teaching Summary)
  const speakAnswer = (text) => {
    if (!('speechSynthesis' in window)) {
      addToast('Speech synthesis not supported in this browser.', 'warning')
      return
    }

    if (isSpeakingAnswer && speakingText === text) {
      window.speechSynthesis.cancel()
      setIsSpeakingAnswer(false)
      setSpeakingText('')
      return
    }

    window.speechSynthesis.cancel()
    // Distill into a short, punchy 1-2 sentence teaching takeaway (max ~35 words)
    const shortSpeech = summarizeForSpeech(text)
    const utter = new SpeechSynthesisUtterance(shortSpeech)
    utter.rate = speechRate
    utter.pitch = 1.0

    utter.onstart = () => {
      setIsSpeakingAnswer(true)
      setSpeakingText(text)
    }

    utter.onend = () => {
      setIsSpeakingAnswer(false)
      setSpeakingText('')
    }

    utter.onerror = () => {
      setIsSpeakingAnswer(false)
      setSpeakingText('')
    }

    window.speechSynthesis.speak(utter)
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeakingAnswer(false)
    setSpeakingText('')
    setIsPlayingAudio(false)
  }

  // AI Study Tutor: 1-on-1 Voice Lesson Playback
  const togglePlayAudio = () => {
    if (!isPlayingAudio) {
      setIsPlayingAudio(true)
      playHostDialogue(currentLineIndex, speechRate)
    } else {
      setIsPlayingAudio(false)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }

  const playHostDialogue = (lineIdx, rate = speechRate) => {
    const script = activeSource.podcastScript || []
    if (lineIdx >= script.length) {
      setIsPlayingAudio(false)
      setCurrentLineIndex(0)
      setAudioProgress(0)
      return
    }

    const line = script[lineIdx]
    setCurrentLineIndex(lineIdx)
    setAudioProgress(Math.round(((lineIdx + 1) / script.length) * 100))

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(line.text)
      utter.pitch = 1.0
      utter.rate = rate

      utter.onend = () => {
        const nextIdx = lineIdx + 1
        if (nextIdx < script.length) {
          playHostDialogue(nextIdx, rate)
        } else {
          setIsPlayingAudio(false)
          setCurrentLineIndex(0)
          setAudioProgress(0)
        }
      }

      utter.onerror = () => {
        setIsPlayingAudio(false)
      }

      window.speechSynthesis.speak(utter)
    }
  }

  // File Ingestion Handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    const reader = new FileReader()

    const processExtractedText = (rawText) => {
      let text = typeof rawText === 'string' ? rawText.trim() : ''
      if (!text || text.length < 20) {
        text = `File: ${file.name}\nUploaded document contains operational guidelines, specifications, and structured text.`
      }

      const wordCount = text.split(/\s+/).filter(Boolean).length
      const pagesEstimate = Math.max(1, Math.round(text.length / 1800))
      const docId = 'src-' + Date.now()

      // Semantic Chunking
      const chunks = chunkDocument(text, docId, file.name)
      const uniqueTopics = extractKeyTopics(chunks, 4)
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')

      // Dynamic studio tools
      const dynamicPodcast = generateDynamicPodcast(chunks, file.name)
      const dynamicQuiz = generateDynamicQuiz(chunks, file.name)
      const dynamicGlossary = generateDynamicGlossary(chunks)

      const passages = chunks.slice(0, 5).map((c, idx) => ({
        id: idx + 1,
        page: c.page,
        section: c.section,
        text: c.text,
      }))

      const newSource = {
        id: docId,
        title: file.name,
        type: ext,
        size: (file.size / 1024).toFixed(1) + ' KB',
        pages: pagesEstimate,
        words: wordCount,
        uploadedAt: 'Just now',
        selected: true,
        chunks,
        summary: `Document analysis of "${file.name}": Ingested ${chunks.length} semantic passages covering "${uniqueTopics.join(
          ', '
        )}". Ready for zero-hallucination grounded RAG queries and voice breakdown.`,
        topics: uniqueTopics,
        suggestedQuestions: [
          `Explain the key concepts of ${cleanTitle} simply (ELI5)`,
          `What are the primary findings in ${file.name}?`,
          `Quiz me on the core concepts in this file`,
          `What methodologies are outlined in this document?`,
        ],
        passages,
        podcastScript: dynamicPodcast,
        glossary: dynamicGlossary,
        quiz: dynamicQuiz,
      }

      setSources((prev) => [newSource, ...prev])
      setActiveSourceId(newSource.id)

      // Sync with offline document store
      documentsApi.upload(file, null, text)

      addToast(`Analyzed "${file.name}" • Indexed ${chunks.length} chunks into RAG model!`, 'success')

      // Add structured welcome card for the new file in chat
      setMessages((prev) => [
        ...prev,
        {
          id: 'm-' + Date.now(),
          role: 'assistant',
          isWelcome: true,
          content: '',
          citations: [],
        },
      ])
    }

    if (ext === 'pdf') {
      addToast(`📄 Extracting text from "${file.name}" — one moment...`, 'info')
      reader.onload = async (event) => {
        const buffer = event.target?.result
        try {
          const extracted = await extractTextFromPDF(buffer)
          processExtractedText(
            extracted && extracted.length > 50
              ? extracted
              : `PDF Document: ${file.name}\nParsed ${Math.round(file.size / 1024)} KB of document context.`
          )
        } catch (err) {
          console.warn('PDF extraction error:', err)
          processExtractedText(`PDF Document: ${file.name}\nParsed ${Math.round(file.size / 1024)} KB.`)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = (event) => {
        const text = event.target?.result || ''
        processExtractedText(text)
      }
      reader.readAsText(file)
    }
  }

  // Ask Question Handler
  const handleAskQuestion = (questionText) => {
    const q = (questionText || inputQuestion).trim()
    if (!q || isThinking) return

    setInputQuestion('')
    const userMsg = { id: 'u-' + Date.now(), role: 'user', content: q }
    setMessages((prev) => [...prev, userMsg])
    setIsThinking(true)

    setTimeout(() => {
      const chunks = activeSource.chunks || []
      const ragResult = answerQuestionWithRAG(chunks, q, activeSource.title)

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          type: ragResult.type || 'answer',
          content: ragResult.content,
          quizData: ragResult.quizData || (ragResult.type === 'quiz' ? activeSource.quiz : null),
          citations: ragResult.citations || [],
          answerable: ragResult.answerable,
          followUps: ragResult.followUps || [],
        },
      ])
      setIsThinking(false)

      if (ragResult.answerable) {
        addToast('Grounded answer retrieved from source! Click 🔊 to listen.', 'info')
      }
    }, 400)
  }

  // Pin message to notes
  const pinMessageToNotes = (content) => {
    const cleanContent = cleanForSpeech(content)
    const snippet = cleanContent.slice(0, 160) + (cleanContent.length > 160 ? '...' : '')
    setNotes((prev) => ['📌 ' + snippet, ...prev])
    addToast('Pinned insight to Studio Notes!', 'info')
  }

  const addManualNote = () => {
    if (!newNoteText.trim()) return
    setNotes((prev) => ['📝 ' + newNoteText.trim(), ...prev])
    setNewNoteText('')
    addToast('Note added!', 'success')
  }

  const exportNotes = () => {
    const text = `# DocuMind • Study Notes: ${activeSource.title}\n\n` + notes.join('\n\n')
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeSource.title.replace(/\.[^/.]+$/, '')}_Notes.md`
    a.click()
    URL.revokeObjectURL(url)
    addToast('Exported notes as Markdown!', 'success')
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col h-full w-full overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-[#000000] text-[#F8FAFC]' : 'bg-[#FAFAF8] text-[#1A1A18]'
      }`}
    >
      {/* Ambient background glows for eye-catching depth (active in dark mode) */}
      {isDarkMode && (
        <>
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#06B6D4]/12 rounded-full blur-[130px] pointer-events-none animate-ambient-glow" />
          <div
            className="absolute top-1/2 -right-32 w-96 h-96 bg-[#0D7377]/15 rounded-full blur-[130px] pointer-events-none animate-ambient-glow"
            style={{ animationDelay: '3s' }}
          />
        </>
      )}

      {/* =========================================================================
          TOP COMMAND BAR & NAVIGATION
          ========================================================================= */}
      <header
        className={`h-14 border-b px-5 flex items-center justify-between shrink-0 z-10 transition-colors duration-300 ${
          isDarkMode
            ? 'bg-[#000000]/95 backdrop-blur-md border-[#27272a] shadow-[0_4px_25px_rgba(0,0,0,0.5)]'
            : 'bg-white border-[#E0DED8] shadow-xs'
        }`}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                isDarkMode
                  ? 'bg-gradient-to-tr from-[#06B6D4] to-[#0284C7] text-[#000000] shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                  : 'bg-[#0D7377] text-white shadow-xs'
              }`}
            >
              ✦
            </div>
            <div>
              <span className={`font-serif text-base font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>
                DocuMind
              </span>
              <span
                className={`ml-1.5 text-[11px] px-1.5 py-0.5 font-semibold rounded border ${
                  isDarkMode
                    ? 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                    : 'bg-[#E8F4F4] text-[#0D7377] border-[#0D7377]/20'
                }`}
              >
                NotebookLM Studio
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 text-xs">
            <button
              onClick={() => navigate('/')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
                isDarkMode
                  ? 'bg-[#121214] text-[#06B6D4] border border-[#06B6D4]/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'bg-[#E8F4F4] text-[#0D7377]'
              }`}
            >
              <Sparkles size={14} />
              <span>Studio</span>
            </button>
            <button
              onClick={() => navigate('/documents')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition ${
                isDarkMode
                  ? 'text-[#94A3B8] hover:bg-[#121214]/60 hover:text-white'
                  : 'text-[#4A4A46] hover:bg-[#F4F4F1] hover:text-[#1A1A18]'
              }`}
            >
              <FileText size={14} />
              <span>Document Repository</span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition ${
                isDarkMode
                  ? 'text-[#94A3B8] hover:bg-[#121214]/60 hover:text-white'
                  : 'text-[#4A4A46] hover:bg-[#F4F4F1] hover:text-[#1A1A18]'
              }`}
            >
              <Settings size={14} />
              <span>Vector Settings</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              isDarkMode
                ? 'bg-[#121214] border-[#06B6D4]/40 text-[#06B6D4] hover:bg-[#06B6D4]/15 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-white border-[#E0DED8] text-[#1A1A18] hover:bg-[#F4F4F1]'
            }`}
            title="Toggle between Eye-Catching Dark Mode and Light Mode"
          >
            {isDarkMode ? (
              <>
                <Moon size={13} className="text-[#06B6D4]" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun size={13} className="text-amber-500" />
                <span>Light Mode</span>
              </>
            )}
          </button>

          {/* Voice Speed Switcher (Global for Voice Assistant & Audio Lesson) */}
          <div
            className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${
              isDarkMode ? 'bg-[#121214] border-[#27272a] text-[#94A3B8]' : 'bg-[#FAFAF8] border-[#E0DED8] text-[#7A7A74]'
            }`}
          >
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <Zap size={12} className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} />
              <span>Speed:</span>
            </span>
            {[1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
              <button
                key={rate}
                onClick={() => changeSpeechRate(rate)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  speechRate === rate
                    ? isDarkMode
                      ? 'bg-[#06B6D4] text-[#000000] shadow-[0_0_10px_rgba(6,182,212,0.6)] font-bold'
                      : 'bg-[#0D7377] text-white shadow-2xs'
                    : isDarkMode
                    ? 'text-[#94A3B8] hover:text-white hover:bg-[#27272a]'
                    : 'text-[#4A4A46] hover:bg-white hover:text-[#0D7377]'
                }`}
                title={`Set voice speed to ${rate}x`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {isSpeakingAnswer && (
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold animate-pulse border ${
                isDarkMode
                  ? 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-[#E8F4F4] text-[#0D7377] border-[#0D7377]/30'
              }`}
            >
              <Volume2 size={14} />
              <span>Teaching ({speechRate}x)...</span>
              <button onClick={stopSpeaking} className="hover:text-red-400 ml-1 font-bold">
                ✕
              </button>
            </div>
          )}

          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isDarkMode
                ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-[#EAF6EE] text-[#1E8449] border-[#1E8449]/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Zero-Hallucination RAG Active • {activeSource.chunks?.length || 1} Passages</span>
          </div>

          <div className={`flex items-center gap-2 pl-2 border-l ${isDarkMode ? 'border-[#27272a]' : 'border-[#E0DED8]'}`}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isDarkMode
                  ? 'bg-gradient-to-tr from-[#06B6D4] to-[#0284C7] text-[#000000] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-[#0D7377] text-white'
              }`}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden md:block text-left">
              <div className={`text-xs font-semibold leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>
                {user?.name || 'Alex Morgan'}
              </div>
              <div className={`text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>Research Lead</div>
            </div>
          </div>
        </div>
      </header>
      {/* =========================================================================
          MAIN 3-COLUMN STUDIO LAYOUT
          ========================================================================= */}
      <div className="flex flex-1 overflow-hidden">
        {/* =========================================================================
            LEFT COLUMN: SOURCES & GROUNDING
            ========================================================================= */}
        <aside
          className={`w-80 border-r flex flex-col shrink-0 transition-colors duration-300 ${
            isDarkMode ? 'bg-[#0a0a0c] border-[#27272a]' : 'bg-[#F4F4F1] border-[#E0DED8]'
          }`}
        >
          <div
            className={`p-4 border-b flex items-center justify-between transition-colors ${
              isDarkMode ? 'bg-[#121214] border-[#27272a]' : 'bg-white border-[#E0DED8]'
            }`}
          >
            <div>
              <h2 className={`font-serif text-sm font-semibold leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>
                Sources & Grounding
              </h2>
              <span className={`text-[11px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                {sources.length} active documents
              </span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
                isDarkMode
                  ? 'bg-gradient-to-r from-[#06B6D4] to-[#0284C7] hover:brightness-110 text-[#000000] shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-[#0D7377] hover:bg-[#0A5F62] text-white'
              }`}
              title="Upload PDF, TXT, MD, or JSON file"
            >
              <Plus size={14} />
              <span>Add Source</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.txt,.md,.json,.csv,.js,.py"
              onChange={handleFileUpload}
            />
          </div>

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 dark-scrollbar">
            <div className="text-[11px] font-semibold uppercase tracking-wider px-1 pt-1 flex justify-between">
              <span className={isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}>Indexed Files</span>
              <span className={`font-bold ${isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'}`}>Grounded</span>
            </div>

            {sources.map((src) => {
              const isSelected = src.id === activeSourceId
              return (
                <div
                  key={src.id}
                  onClick={() => setActiveSourceId(src.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-[#121214] border-[#06B6D4] ring-1 ring-[#06B6D4] shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                        : 'bg-white border-[#0D7377] shadow-xs ring-1.5 ring-[#0D7377]'
                      : isDarkMode
                      ? 'bg-[#121214] border-[#27272a] hover:bg-[#121214] hover:border-[#06B6D4]/50'
                      : 'bg-[#FAFAF8] border-[#E0DED8] hover:bg-white hover:border-[#C8C6BF]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        src.type === 'pdf'
                          ? isDarkMode
                            ? 'bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/30'
                            : 'bg-[#FDF0EE] text-[#C0392B]'
                          : isDarkMode
                          ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30'
                          : 'bg-[#E8F4F4] text-[#0D7377]'
                      }`}
                    >
                      {src.type?.toUpperCase() || 'DOC'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-semibold truncate ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>
                        {src.title}
                      </div>
                      <div className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                        {src.pages} pages • {src.chunks?.length || 1} chunks • {src.uploadedAt}
                      </div>
                    </div>
                  </div>

                  {src.topics && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {src.topics.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate border ${
                            isDarkMode
                              ? 'bg-[#000000] text-[#06B6D4] border-[#06B6D4]/30'
                              : 'bg-[#EFEFE9] text-[#4A4A46] border-transparent'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Briefing Memo */}
          <div className={`p-3.5 border-t transition-colors ${isDarkMode ? 'bg-[#121214] border-[#27272a]' : 'bg-white border-[#E0DED8]'}`}>
            <div className={`text-xs font-semibold flex items-center gap-1.5 mb-1.5 ${isDarkMode ? 'text-white' : 'text-[#1A1A18]'}`}>
              <BookOpen size={14} className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} />
              <span>Source Briefing Memo</span>
            </div>
            <p className={`text-[11px] leading-relaxed line-clamp-3 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#4A4A46]'}`}>
              {activeSource.summary}
            </p>

            <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-xs ${isDarkMode ? 'border-[#27272a]' : 'border-[#E0DED8]'}`}>
              <button
                onClick={() => navigate('/documents')}
                className={`hover:underline font-medium flex items-center gap-1 ${isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'}`}
              >
                <FolderOpen size={13} />
                <span>All Documents ({sources.length})</span>
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="text-[#7A7A74] hover:text-[#1A1A18] font-medium flex items-center gap-1"
              >
                <Settings size={13} />
                <span>Config</span>
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN: AI TUTOR & INTERACTIVE CHAT
            ========================================================================= */}
        <section className={`flex-1 flex flex-col h-full min-w-0 transition-colors duration-200 ${
          isDarkMode ? 'bg-[#000000] border-r border-[#27272a]' : 'bg-white border-r border-[#E0DED8]'
        }`}>
          {/* Header */}
          <div className={`px-6 py-3 border-b flex items-center justify-between shrink-0 transition-colors ${
            isDarkMode ? 'bg-[#121214] border-[#27272a]' : 'bg-white border-[#E0DED8]'
          }`}>
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} />
              <h3 className={`font-serif text-sm font-semibold ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#1A1A18]'}`}>
                AI Study Tutor • Grounded in {activeSource.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                isDarkMode 
                  ? 'bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                  : 'bg-[#EAF6EE] text-[#1E8449]'
              }`}>
                <Check size={12} />
                <span>Deterministic Grounding ({activeSource.chunks?.length || 1} passages)</span>
              </span>
            </div>
          </div>

          {/* Messages Feed */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 dark-scrollbar">
            {messages.map((m) => {
              const isUser = m.role === 'user'

              // User Message
              if (isUser) {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className={`max-w-xl px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-[#0891B2] to-[#06B6D4] text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]' 
                        : 'bg-[#0D7377] text-white shadow-xs'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                )
              }

              // Welcome Hub Message
              if (m.isWelcome) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-3xl">
                      <WelcomeStudyHub
                        activeSource={activeSource}
                        onQuickAction={(tab) => setActiveStudioTab(tab)}
                        onAskQuestion={(q) => handleAskQuestion(q)}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  </div>
                )
              }

              // Standard / Quiz Assistant Message
              return (
                <div key={m.id} className="flex justify-start">
                  <div className={`max-w-3xl w-full p-5 rounded-2xl rounded-tl-sm text-sm leading-relaxed space-y-3.5 transition-all ${
                    isDarkMode 
                      ? 'bg-[#121214]/85 backdrop-blur-md border border-[#27272a] text-[#F8FAFC] shadow-[0_8px_32px_rgba(0,0,0,0.36)]' 
                      : 'bg-[#FAFAF8] border border-[#E0DED8] text-[#1A1A18] shadow-xs'
                  }`}>
                    {/* Render text with proper line-by-line markdown */}
                    {m.content && (
                      <div className="space-y-2">
                        {m.content.split(/(\[\d+\])/g).map((part, pIdx) => {
                          const match = part.match(/^\[(\d+)\]$/)
                          if (match) {
                            const num = parseInt(match[1], 10)
                            return (
                              <button
                                key={pIdx}
                                onClick={() => {
                                  const found = m.citations?.find((c) => c.num === num)
                                  if (found) setActiveCitation(found.passage)
                                  else if (activeSource.passages && activeSource.passages[num - 1]) {
                                    setActiveCitation(activeSource.passages[num - 1])
                                  }
                                }}
                                className={`inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[11px] font-bold rounded border transition-all cursor-pointer ${
                                  isDarkMode
                                    ? 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30 hover:bg-[#06B6D4] hover:text-[#000000] shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                                    : 'bg-[#E8F4F4] text-[#0D7377] hover:bg-[#0D7377] hover:text-white border-[#0D7377]/30'
                                }`}
                                title="Click to view exact verified source passage"
                              >
                                {part}
                              </button>
                            )
                          }
                          return <MarkdownSegment key={pIdx} text={part} />
                        })}
                      </div>
                    )}

                    {/* Interactive Quiz Card (Rendered if message contains quiz data) */}
                    {(m.type === 'quiz' || m.quizData) && (
                      <InteractiveQuizWidget
                        quiz={m.quizData || activeSource.quiz}
                        onCitationClick={(citId) => {
                          const found = activeSource.passages?.[citId - 1]
                          if (found) setActiveCitation(found)
                        }}
                        onExplainConcept={(prompt) => handleAskQuestion(prompt)}
                        title={`Active Recall Quiz • ${activeSource.title}`}
                        isDarkMode={isDarkMode}
                      />
                    )}

                    {/* Contextual Follow-up Questions (Neatly Organized!) */}
                    {m.followUps && m.followUps.length > 0 && (
                      <div className={`pt-2 border-t ${isDarkMode ? 'border-[#27272a]' : 'border-[#E0DED8]/70'}`}>
                        <div className={`text-[11px] font-bold flex items-center gap-1 mb-1.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                          <Sparkles size={12} className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} />
                          <span>Suggested Next Questions:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.followUps.map((fu, fIdx) => (
                            <button
                              key={fIdx}
                              onClick={() => handleAskQuestion(fu)}
                              className={`text-xs px-3 py-1 rounded-full font-medium transition cursor-pointer shadow-2xs flex items-center gap-1 ${
                                isDarkMode
                                  ? 'bg-[#0a0a0c] border border-[#27272a] text-[#CBD5E1] hover:border-[#06B6D4] hover:text-[#06B6D4]'
                                  : 'bg-white border border-[#E0DED8] hover:border-[#0D7377] hover:text-[#0D7377] text-[#4A4A46]'
                              }`}
                            >
                              <span>➜</span>
                              <span>{fu}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assistant Quick Actions Bar */}
                    <div className={`pt-2.5 border-t flex items-center justify-between text-xs ${
                      isDarkMode ? 'border-[#27272a] text-[#94A3B8]' : 'border-[#E0DED8]/70 text-[#7A7A74]'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAskQuestion(`Explain this section simply like I am 5 (ELI5)`)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shadow-2xs cursor-pointer flex items-center gap-1 ${
                            isDarkMode
                              ? 'bg-[#0a0a0c] border border-[#27272a] hover:border-[#06B6D4] hover:text-[#06B6D4] text-[#CBD5E1]'
                              : 'bg-white border border-[#E0DED8] hover:border-[#0D7377] hover:text-[#0D7377]'
                          }`}
                        >
                          <span>💡</span>
                          <span>Explain Simply</span>
                        </button>
                        <button
                          onClick={() => handleAskQuestion(`Quiz me on this section with practice questions`)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shadow-2xs cursor-pointer flex items-center gap-1 ${
                            isDarkMode
                              ? 'bg-[#0a0a0c] border border-[#27272a] hover:border-[#06B6D4] hover:text-[#06B6D4] text-[#CBD5E1]'
                              : 'bg-white border border-[#E0DED8] hover:border-[#0D7377] hover:text-[#0D7377]'
                          }`}
                        >
                          <span>📝</span>
                          <span>Quiz Me</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Listen Button (Short & sweet voice teaching) */}
                        <button
                          onClick={() => speakAnswer(m.content)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                            isSpeakingAnswer && speakingText === m.content
                              ? isDarkMode
                                ? 'bg-[#06B6D4]/20 text-[#06B6D4] ring-1 ring-[#06B6D4]/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                : 'bg-[#E8F4F4] text-[#0D7377] font-bold ring-1 ring-[#0D7377]/30'
                              : isDarkMode
                                ? 'text-[#94A3B8] hover:text-[#06B6D4] hover:bg-[#0a0a0c]'
                                : 'text-[#4A4A46] hover:text-[#0D7377] hover:bg-[#F4F4F1]'
                          }`}
                          title={`Listen to short & sweet teaching summary (${speechRate}x speed)`}
                        >
                          {isSpeakingAnswer && speakingText === m.content ? (
                            <>
                              <VolumeX size={13} className="text-red-400" />
                              <span>Stop Voice</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={13} className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} />
                              <span>Listen ({speechRate}x)</span>
                            </>
                          )}
                        </button>

                        {/* Interactive Speech Speed Pill */}
                        <button
                          onClick={() => {
                            const rates = [1.0, 1.25, 1.5, 2.0]
                            const next = rates[(rates.indexOf(speechRate) + 1) % rates.length]
                            changeSpeechRate(next)
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer shadow-2xs ${
                            isDarkMode
                              ? 'bg-[#0a0a0c] border border-[#27272a] text-[#06B6D4] hover:bg-[#06B6D4]/20 hover:border-[#06B6D4]'
                              : 'bg-white border border-[#E0DED8] text-[#0D7377] hover:bg-[#E8F4F4] hover:border-[#0D7377]'
                          }`}
                          title="Click to cycle voice speed (1x → 1.25x → 1.5x → 2x)"
                        >
                          ⚡ {speechRate}x
                        </button>

                        <button
                          onClick={() => pinMessageToNotes(m.content)}
                          className={`flex items-center gap-1 text-[11px] font-medium transition cursor-pointer px-2 py-1 rounded ${
                            isDarkMode
                              ? 'text-[#94A3B8] hover:text-[#06B6D4] hover:bg-[#0a0a0c]'
                              : 'text-[#7A7A74] hover:text-[#0D7377] hover:bg-[#F4F4F1]'
                          }`}
                          title="Pin to Studio Notes"
                        >
                          <Pin size={12} />
                          <span>Pin</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {isThinking && (
              <div className="flex justify-start">
                <div className={`px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-xs ${
                  isDarkMode 
                    ? 'bg-[#121214] border border-[#27272a] text-[#94A3B8]' 
                    : 'bg-[#FAFAF8] border border-[#E0DED8] text-[#7A7A74]'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full animate-ping ${isDarkMode ? 'bg-[#06B6D4]' : 'bg-[#0D7377]'}`} />
                  <span>Searching verified passages of {activeSource.title} with BM25 & semantic vectors...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* =========================================================================
              REDESIGNED FOLLOW-UP QUESTIONS PROMPT DOCK
              ========================================================================= */}
          <div className={`px-6 py-2.5 border-t shrink-0 space-y-1.5 transition-colors ${
            isDarkMode ? 'bg-[#0a0a0c] border-[#27272a]' : 'bg-[#F4F4F1] border-[#E0DED8]'
          }`}>
            <div className={`flex items-center justify-between text-[11px] font-bold ${
              isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'
            }`}>
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} />
                <span>Quick Study Prompts for {activeSource.title}:</span>
              </span>
              <span className={isDarkMode ? 'text-[#06B6D4] font-medium' : 'text-[#0D7377] font-medium'}>
                Click any prompt to ask
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => handleAskQuestion(`Explain ${activeSource.title} simply like I am 5 with analogies`)}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium transition shrink-0 shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#121214] border border-[#27272a] text-[#CBD5E1] hover:border-[#06B6D4] hover:text-[#06B6D4]'
                    : 'bg-white border border-[#E0DED8] hover:border-[#0D7377] hover:text-[#0D7377] text-[#4A4A46]'
                }`}
              >
                <span>💡</span>
                <span>Explain Simply (ELI5)</span>
              </button>

              <button
                onClick={() => handleAskQuestion(`Quiz me on ${activeSource.title} with practice questions`)}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium transition shrink-0 shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#121214] border border-[#27272a] text-[#CBD5E1] hover:border-[#06B6D4] hover:text-[#06B6D4]'
                    : 'bg-white border border-[#E0DED8] hover:border-[#0D7377] hover:text-[#0D7377] text-[#4A4A46]'
                }`}
              >
                <span>📝</span>
                <span>Take Practice Quiz</span>
              </button>

              {activeSource.suggestedQuestions?.slice(0, 3).map((sq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskQuestion(sq)}
                  className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium transition shrink-0 shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#121214] border border-[#27272a] text-[#CBD5E1] hover:border-[#06B6D4] hover:text-[#06B6D4]'
                      : 'bg-white border border-[#E0DED8] hover:border-[#0D7377] hover:text-[#0D7377] text-[#4A4A46]'
                  }`}
                >
                  <span className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'}>✦</span>
                  <span className="truncate max-w-[280px]">{sq}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar with Voice Input & Send */}
          <div className={`p-4 border-t shrink-0 transition-colors ${
            isDarkMode ? 'bg-[#121214] border-[#27272a]' : 'bg-white border-[#E0DED8]'
          }`}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAskQuestion()
              }}
              className="flex gap-2.5"
            >
              <button
                type="button"
                onClick={startVoiceInput}
                className={`p-2.5 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                  isListeningMic
                    ? 'bg-rose-500 text-white border-rose-500 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                    : isDarkMode
                      ? 'bg-[#0a0a0c] hover:bg-[#06B6D4]/20 text-[#06B6D4] border-[#27272a]'
                      : 'bg-[#F4F4F1] hover:bg-[#E8F4F4] text-[#0D7377] border-[#E0DED8]'
                }`}
                title={isListeningMic ? 'Listening... click to stop' : 'Ask by Voice (Microphone)'}
              >
                {isListeningMic ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder={
                  isListeningMic
                    ? 'Listening to your voice... Speak your question now'
                    : `Ask anything about ${activeSource.title}... (e.g. 'Explain like I am 5' or 'Quiz me')`
                }
                className={`flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition shadow-xs ${
                  isDarkMode
                    ? 'bg-[#000000] border-[#27272a] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'
                    : 'bg-white border-[#E0DED8] text-[#1A1A18] focus:border-[#0D7377]'
                }`}
                disabled={isThinking}
              />

              <button
                type="submit"
                disabled={!inputQuestion.trim() || isThinking}
                className={`px-5 py-2.5 disabled:opacity-50 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-[#0891B2] to-[#06B6D4] hover:brightness-110 text-[#000000] font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                    : 'bg-[#0D7377] hover:bg-[#0A5F62] text-white shadow-xs'
                }`}
              >
                <span>Ask</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        </section>

        {/* =========================================================================
            RIGHT COLUMN: NOTEBOOK STUDIO (AUDIO PODCAST, STUDY GUIDE, QUIZ, NOTES)
            ========================================================================= */}
        <aside className={`w-96 flex flex-col h-full shrink-0 transition-colors duration-200 ${
          isDarkMode ? 'bg-[#0a0a0c] border-l border-[#27272a]' : 'bg-[#F4F4F1]'
        }`}>
          {/* Studio Tabs */}
          <div className={`px-4 py-3 border-b flex items-center justify-between transition-colors ${
            isDarkMode ? 'bg-[#121214] border-[#27272a]' : 'bg-white border-[#E0DED8]'
          }`}>
            <span className={`font-serif text-sm font-semibold flex items-center gap-1.5 ${
              isDarkMode ? 'text-[#F8FAFC]' : 'text-[#1A1A18]'
            }`}>
              <Sparkles size={16} className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} />
              <span>Studio Tools</span>
            </span>

            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setActiveStudioTab('audio')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                  activeStudioTab === 'audio'
                    ? isDarkMode
                      ? 'bg-[#06B6D4]/20 text-[#06B6D4] font-semibold border border-[#06B6D4]/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                      : 'bg-[#E8F4F4] text-[#0D7377] font-semibold'
                    : isDarkMode
                      ? 'text-[#94A3B8] hover:bg-[#1f1f23] hover:text-[#F8FAFC]'
                      : 'text-[#4A4A46] hover:bg-[#EFEFE9]'
                }`}
              >
                <span>🎧</span>
                <span>Voice</span>
              </button>
              <button
                onClick={() => setActiveStudioTab('guide')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  activeStudioTab === 'guide'
                    ? isDarkMode
                      ? 'bg-[#06B6D4]/20 text-[#06B6D4] font-semibold border border-[#06B6D4]/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                      : 'bg-[#E8F4F4] text-[#0D7377] font-semibold'
                    : isDarkMode
                      ? 'text-[#94A3B8] hover:bg-[#1f1f23] hover:text-[#F8FAFC]'
                      : 'text-[#4A4A46] hover:bg-[#EFEFE9]'
                }`}
              >
                📖 Guide
              </button>
              <button
                onClick={() => setActiveStudioTab('quiz')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  activeStudioTab === 'quiz'
                    ? isDarkMode
                      ? 'bg-[#06B6D4]/20 text-[#06B6D4] font-semibold border border-[#06B6D4]/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                      : 'bg-[#E8F4F4] text-[#0D7377] font-semibold'
                    : isDarkMode
                      ? 'text-[#94A3B8] hover:bg-[#1f1f23] hover:text-[#F8FAFC]'
                      : 'text-[#4A4A46] hover:bg-[#EFEFE9]'
                }`}
              >
                📝 Quiz
              </button>
              <button
                onClick={() => setActiveStudioTab('notes')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  activeStudioTab === 'notes'
                    ? isDarkMode
                      ? 'bg-[#06B6D4]/20 text-[#06B6D4] font-semibold border border-[#06B6D4]/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                      : 'bg-[#E8F4F4] text-[#0D7377] font-semibold'
                    : isDarkMode
                      ? 'text-[#94A3B8] hover:bg-[#1f1f23] hover:text-[#F8FAFC]'
                      : 'text-[#4A4A46] hover:bg-[#EFEFE9]'
                }`}
              >
                📌 Notes ({notes.length})
              </button>
            </div>
          </div>

          {/* TAB 1: 1-ON-1 AI TUTOR VOICE LESSON */}
          {activeStudioTab === 'audio' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 dark-scrollbar">
              <div className={`rounded-xl p-5 space-y-3 transition-all ${
                isDarkMode 
                  ? 'bg-[#121214]/90 backdrop-blur-md border border-[#27272a] text-[#F8FAFC] shadow-[0_8px_32px_rgba(0,0,0,0.4)]' 
                  : 'bg-white border border-[#E0DED8] shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                      isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'
                    }`}>
                      <GraduationCap size={13} />
                      <span>1-on-1 Study Tutor</span>
                    </div>
                    <h4 className={`font-serif text-base font-semibold ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#1A1A18]'}`}>
                      AI Study Tutor • Voice Lecture
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                      Direct personal concept breakdown for {activeSource.title}
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-[#06B6D4]/20 text-[#06B6D4]' : 'bg-[#E8F4F4] text-[#0D7377]'
                  }`}>
                    <Headphones size={18} />
                  </div>
                </div>

                {/* Audio Progress Bar & Play Button */}
                <div className="pt-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlayAudio}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-md shrink-0 cursor-pointer ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-[#0891B2] to-[#06B6D4] text-[#000000] hover:brightness-110 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                          : 'bg-[#0D7377] hover:bg-[#0A5F62] text-white'
                      }`}
                      title={isPlayingAudio ? 'Pause Lecture' : 'Play Voice Lecture'}
                    >
                      {isPlayingAudio ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#1f1f23]' : 'bg-[#E0DED8]'}`}>
                        <div
                          className={`h-full transition-all duration-300 ${
                            isDarkMode 
                              ? 'bg-gradient-to-r from-[#0891B2] to-[#06B6D4] shadow-[0_0_8px_rgba(6,182,212,0.8)]' 
                              : 'bg-[#0D7377]'
                          }`}
                          style={{ width: `${audioProgress}%` }}
                        />
                      </div>
                      <div className={`flex justify-between text-[11px] mt-1 font-mono ${
                        isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'
                      }`}>
                        <span>
                          {Math.floor(audioProgress * 0.04)}:
                          {(Math.floor(audioProgress * 2.4) % 60).toString().padStart(2, '0')}
                        </span>
                        <span>
                          Lesson Step {currentLineIndex + 1} of {activeSource.podcastScript?.length || 3}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Animated Speech Equalizer Wave */}
                {isPlayingAudio && (
                  <div className={`flex items-center justify-center gap-1.5 py-2 rounded-lg ${
                    isDarkMode ? 'bg-[#000000]/80 border border-[#27272a]' : 'bg-[#FAFAF8]'
                  }`}>
                    {[16, 24, 12, 28, 20, 10, 26, 18, 22, 14].map((h, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full animate-pulse ${
                          isDarkMode ? 'bg-[#06B6D4] shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-[#0D7377]'
                        }`}
                        style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                )}

                {/* Playback Speed Controls for Rapid Student Listening */}
                <div className={`pt-2.5 border-t flex items-center justify-between gap-2 ${
                  isDarkMode ? 'border-[#27272a]' : 'border-[#E0DED8]/70'
                }`}>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                    isDarkMode ? 'text-[#CBD5E1]' : 'text-[#4A4A46]'
                  }`}>
                    <Gauge size={13} className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} />
                    <span>Speed:</span>
                  </div>
                  <div className={`flex items-center gap-1 p-1 rounded-lg border ${
                    isDarkMode ? 'bg-[#000000] border-[#27272a]' : 'bg-[#FAFAF8] border-[#E0DED8]'
                  }`}>
                    {[1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeechRate(rate)}
                        className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                          speechRate === rate
                            ? isDarkMode
                              ? 'bg-[#06B6D4] text-[#000000] shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                              : 'bg-[#0D7377] text-white shadow-2xs'
                            : isDarkMode
                              ? 'text-[#94A3B8] hover:bg-[#1f1f23] hover:text-[#06B6D4]'
                              : 'text-[#4A4A46] hover:bg-white hover:text-[#0D7377]'
                        }`}
                        title={`Play voice at ${rate}x speed`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1-on-1 Teaching Transcript Stream */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className={`text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'
                  }`}>
                    Voice Lesson Stream (1-on-1 Teaching)
                  </div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    isDarkMode 
                      ? 'text-[#06B6D4] bg-[#06B6D4]/20 border-[#06B6D4]/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                      : 'text-[#0D7377] bg-[#E8F4F4] border-[#0D7377]/20'
                  }`}>
                    <Zap size={10} />
                    <span>{speechRate}x Speed</span>
                  </div>
                </div>

                {activeSource.podcastScript?.map((line, idx) => {
                  const isCurrent = idx === currentLineIndex && isPlayingAudio
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed transition-all ${
                        isCurrent
                          ? isDarkMode
                            ? 'bg-[#06B6D4]/15 border-[#06B6D4] text-white shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-[#06B6D4]'
                            : 'bg-[#E8F4F4] border-[#0D7377] font-medium shadow-xs ring-1 ring-[#0D7377]/40'
                          : isDarkMode
                            ? 'bg-[#121214] border-[#27272a] text-[#CBD5E1]'
                            : 'bg-white border-[#E0DED8]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`font-bold flex items-center gap-1.5 ${
                          isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'
                        }`}>
                          <GraduationCap size={14} />
                          <span>{line.speaker}</span>
                        </span>
                        {line.badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            isDarkMode 
                              ? 'bg-[#000000] text-[#94A3B8] border-[#27272a]' 
                              : 'bg-[#F4F4F1] text-[#4A4A46] border-[#E0DED8]'
                          }`}>
                            {line.badge}
                          </span>
                        )}
                      </div>
                      <p className={`leading-relaxed ${isDarkMode ? 'text-[#E2E8F0]' : 'text-[#2A2A28]'}`}>
                        {line.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: STUDY GUIDE & GLOSSARY */}
          {activeStudioTab === 'guide' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 dark-scrollbar">
              <div className={`rounded-xl p-4 shadow-xs space-y-2 transition-all ${
                isDarkMode 
                  ? 'bg-[#121214] border border-[#27272a] text-[#F8FAFC]' 
                  : 'bg-white border border-[#E0DED8]'
              }`}>
                <h4 className="font-serif text-base font-semibold flex items-center gap-2">
                  <BookOpen size={16} className={isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'} />
                  <span>Study Guide & Outline</span>
                </h4>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#4A4A46]'}`}>
                  Synthesized concepts and verified learning objectives from <strong>{activeSource.title}</strong>.
                </p>
              </div>

              <div className={`rounded-xl p-4 space-y-3.5 text-xs leading-relaxed shadow-xs ${
                isDarkMode 
                  ? 'bg-[#121214] border border-[#27272a] text-[#CBD5E1]' 
                  : 'bg-white border border-[#E0DED8]'
              }`}>
                <div className={`font-semibold text-sm border-b pb-1.5 ${
                  isDarkMode ? 'text-[#F8FAFC] border-[#27272a]' : 'text-[#1A1A18] border-[#E0DED8]'
                }`}>
                  Key Concepts & Definitions
                </div>
                {(activeSource.glossary || INITIAL_SOURCE.glossary).map((g, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className={`font-semibold flex items-center gap-1 ${
                      isDarkMode ? 'text-[#06B6D4]' : 'text-[#0D7377]'
                    }`}>
                      <span>•</span> {g.term}:
                    </span>
                    <p className={`pl-2 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#4A4A46]'}`}>{g.def}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE PRACTICE QUIZ */}
          {activeStudioTab === 'quiz' && (
            <div className="flex-1 overflow-y-auto p-4 dark-scrollbar">
              <InteractiveQuizWidget
                quiz={activeSource.quiz || INITIAL_SOURCE.quiz}
                onCitationClick={(citId) => {
                  const found = activeSource.passages?.[citId - 1]
                  if (found) setActiveCitation(found)
                }}
                onExplainConcept={(prompt) => handleAskQuestion(prompt)}
                title={`Active Recall Quiz • ${activeSource.title}`}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {/* TAB 4: PINNED NOTES */}
          {activeStudioTab === 'notes' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col dark-scrollbar">
              <div className="space-y-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add a new study note..."
                  onKeyDown={(e) => e.key === 'Enter' && addManualNote()}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none transition ${
                    isDarkMode
                      ? 'bg-[#000000] border-[#27272a] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#06B6D4]'
                      : 'bg-white border-[#E0DED8] text-[#1A1A18] focus:border-[#0D7377]'
                  }`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addManualNote}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#06B6D4] text-[#000000] hover:bg-[#0891B2] shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                        : 'bg-[#0D7377] hover:bg-[#0A5F62] text-white'
                    }`}
                  >
                    Add to Notes
                  </button>
                  <button
                    onClick={exportNotes}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#121214] border-[#27272a] text-[#CBD5E1] hover:bg-[#1f1f23]'
                        : 'bg-white border-[#E0DED8] hover:bg-[#F4F4F1] text-[#4A4A46]'
                    }`}
                    title="Export notes as Markdown"
                  >
                    <Download size={13} />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto pt-1">
                {notes.map((n, i) => (
                  <div
                    key={i}
                    className={`p-3 border rounded-lg text-xs leading-relaxed relative group shadow-2xs transition ${
                      isDarkMode
                        ? 'bg-[#121214] border-[#27272a] text-[#F8FAFC]'
                        : 'bg-white border-[#E0DED8] text-[#1A1A18]'
                    }`}
                  >
                    <p className="pr-4">{n}</p>
                    <button
                      onClick={() => setNotes((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* =========================================================================
          CITATION PASSAGE VIEWER (Modal)
          ========================================================================= */}
      {activeCitation && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setActiveCitation(null)}
        >
          <div
            className={`border rounded-2xl max-w-lg w-full p-6 space-y-3.5 transition-all ${
              isDarkMode
                ? 'bg-[#121214] border-[#06B6D4] text-[#F8FAFC] shadow-[0_0_50px_rgba(6,182,212,0.35)]'
                : 'bg-white border-[#0D7377] shadow-2xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${
                  isDarkMode
                    ? 'bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'bg-[#E8F4F4] text-[#0D7377] border-[#0D7377]/20'
                }`}>
                  {activeCitation.id || '1'}
                </span>
                <div>
                  <h4 className={`font-serif text-sm font-semibold ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#1A1A18]'}`}>
                    {activeCitation.section || 'Verified Source Passage'}
                  </h4>
                  <span className={`text-[11px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#7A7A74]'}`}>
                    Page {activeCitation.page || 1} • {activeSource.title}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className={`text-sm font-bold p-1 cursor-pointer ${isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#7A7A74] hover:text-[#1A1A18]'}`}
              >
                ✕
              </button>
            </div>

            <div className={`p-3.5 rounded text-xs leading-relaxed italic ${
              isDarkMode
                ? 'bg-[#000000] border-l-4 border-[#06B6D4] text-[#E2E8F0]'
                : 'bg-[#F4F4F1] border-l-4 border-[#0D7377] text-[#1A1A18]'
            }`}>
              "{activeCitation.text}"
            </div>

            <div className={`flex justify-between items-center text-[11px] pt-2 border-t ${
              isDarkMode ? 'border-[#27272a] text-[#94A3B8]' : 'border-[#E0DED8] text-[#7A7A74]'
            }`}>
              <span className={`font-medium flex items-center gap-1 ${isDarkMode ? 'text-[#34D399]' : 'text-[#1E8449]'}`}>
                <CheckCircle2 size={13} />
                <span>Deterministic Cosine Similarity Verified</span>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeCitation.text)
                  addToast('Passage quote copied to clipboard!', 'info')
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                  isDarkMode
                    ? 'bg-[#06B6D4] text-[#000000] hover:bg-[#0891B2] shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-[#E8F4F4] text-[#0D7377] hover:bg-[#0D7377] hover:text-white'
                }`}
              >
                <Copy size={12} />
                <span>Copy Quote</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
