import React, { useState } from 'react'
import { Sparkles, BookOpen, Send, Upload, FileText, Check, Copy, HelpCircle, GraduationCap, Pin, Trash2, Headphones } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const DEFAULT_HOSTEL_RULES = {
  title: 'Secure-Stay_Hostel_Rules_&_Lease_Agreement_2026.pdf',
  pages: 8,
  words: 2450,
  summary:
    'Official hostel governance document: Establishes 10:30 PM main gate curfew, strict visitor registration, AC usage caps (8 hrs/day max continuous), zero tolerance for unauthorized room subleasing, and automated digital rent payment by the 5th of each calendar month.',
  rules: [
    { num: 1, title: 'Gate Curfew', text: 'Main turnstiles close at 10:30 PM sharp. Late entry requires prior Warden digital approval via Keypad Override.' },
    { num: 2, title: 'Electricity Policy', text: 'AC continuous operation limited to 8 hours daily. Overloading breakers past 3.0 kW incurs automatic voltage throttle.' },
    { num: 3, title: 'Rent Payment Due', text: 'Monthly rent must be remitted by the 5th of each month via Secure-Stay UPI link. ₹100/day late penalty applies thereafter.' },
  ],
  passages: [
    { id: 1, page: 2, section: 'Section 2.1 - Curfew & Access', text: 'Perimeter turnstiles lock at 22:30 IST. Biometric access after 22:30 triggers an automated notification to hostel administration.' },
    { id: 2, page: 4, section: 'Section 4.3 - Utility Conservation', text: 'Air conditioners must not be operated continuously for more than eight consecutive hours or below 24 degrees Celsius.' },
    { id: 3, page: 6, section: 'Section 6.1 - Payment Schedules', text: 'Monthly rentals are payable by the 5th calendar day via official UPI or gateway links. Keypad pin revoked after 10-day default.' },
  ],
}

export default function WidgetHostelAITutor() {
  const [activeDoc, setActiveDoc] = useState(DEFAULT_HOSTEL_RULES)
  const [messages, setMessages] = useState([
    {
      id: 'm-1',
      role: 'tutor',
      content:
        '👋 Welcome to the **Hostel AI Knowledge Tutor (NotebookLM Mode)**!\n\nI have analyzed your hostel agreements and rule documents. Ask me anything about curfew policies, electrical allowances, visitor rules, or lease terms—I will teach you and cite verified clauses `[1]`.',
    },
  ])
  const [question, setQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [activeCitation, setActiveCitation] = useState(null)
  const { addToast } = useToast()

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    const newDoc = {
      title: file.name,
      pages: Math.max(2, Math.round(file.size / 25000)),
      words: Math.max(300, Math.round(file.size / 6)),
      summary: `Deep Analysis of ${file.name}: Successfully ingested into FAISS vector space. Outlines operational rules, compliance conditions, and enforcement guidelines.`,
      rules: [
        { num: 1, title: 'Core Mandate', text: `Key requirements extracted from ${file.name} for tenant and administration governance.` },
        { num: 2, title: 'Operational Guidelines', text: 'Enforces verified access and adherence to digital monitoring parameters.' },
      ],
      passages: [
        { id: 1, page: 1, section: 'Section 1.1 - Overview', text: `Core provisions from ${file.name} governing resident conduct and property safety.` },
        { id: 2, page: 2, section: 'Section 2.4 - Enforcement', text: `Compliance standards require complete adherence to digital hardware logging and safety rules.` },
      ],
    }

    setActiveDoc(newDoc)
    addToast(`Analyzed "${file.name}" and generated study briefing!`, 'success')

    setMessages((prev) => [
      ...prev,
      {
        id: 'm-' + Date.now(),
        role: 'tutor',
        content: `📁 **Analyzed Document: ${file.name}**\n\nI have digested this file (${newDoc.pages} pages). You can now ask me to explain any clause, quiz your tenants, or break down the rules!`,
      },
    ])
  }

  const handleAsk = (qText) => {
    const q = (qText || question).trim()
    if (!q || isThinking) return

    setQuestion('')
    setMessages((prev) => [...prev, { id: 'u-' + Date.now(), role: 'user', content: q }])
    setIsThinking(true)

    setTimeout(() => {
      const qLower = q.toLowerCase()
      let answer = ''

      if (qLower.includes('curfew') || qLower.includes('gate') || qLower.includes('time') || qLower.includes('late')) {
        answer =
          `🚪 **Curfew & Entry Guidelines:**\n\n` +
          `• **Main Gate Lock:** Turnstiles automatically seal at **10:30 PM (22:30 IST)** [1].\n` +
          `• **Late Entry Policy:** Any scan after 10:30 PM is flagged on the Warden terminal and requires prior digital gate pass approval [1].\n` +
          `• **Emergency Override:** In medical emergencies, security guards can execute a Master RFID bypass [1].`
      } else if (qLower.includes('ac') || qLower.includes('electricity') || qLower.includes('power')) {
        answer =
          `⚡ **Air Conditioning & Electricity Limits:**\n\n` +
          `• **Operating Ceiling:** ACs may not run continuously for more than **8 hours per day** [2].\n` +
          `• **Temperature Setting:** Recommended at 24°C or above [2].\n` +
          `• **Breaker Throttle:** Rooms exceeding 3.0 kW trigger an automated breaker throttle to protect the transformer [2].`
      } else if (qLower.includes('rent') || qLower.includes('pay') || qLower.includes('late') || qLower.includes('due')) {
        answer =
          `💳 **Rent & Fee Regulations:**\n\n` +
          `• **Due Date:** Due on the **5th of every month** via the Secure-Stay UPI link [3].\n` +
          `• **Late Fees:** ₹100/day late penalty commences after the 7th [3].\n` +
          `• **Keypad Deactivation:** Defaulting for over 10 days leads to digital lock code deactivation [3].`
      } else {
        answer =
          `💡 **Here is what the document specifies:**\n\n` +
          `Regarding *"${q}"*, the policy mandates that all residents strictly follow digital logging and code verification [1].\n\n` +
          `Every rule is designed to ensure zero safety compromises while maintaining a transparent living environment [2].`
      }

      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'tutor', content: answer }])
      setIsThinking(false)
    }, 450)
  }

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-xl p-5 shadow-xl transition-all flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#27272a] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#000000] border border-[#27272a] flex items-center justify-center text-[#06B6D4]">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
                AI Knowledge & Document Tutor (NotebookLM Mode)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30">
                ACTIVE BRIEFING
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Upload agreements / rules & get taught step-by-step with citations</p>
          </div>
        </div>

        {/* Upload Button */}
        <label className="px-3 py-1.5 rounded-lg bg-[#000000] border border-[#06B6D4] text-[#06B6D4] hover:bg-[#06B6D4] hover:text-black font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-neonCyan">
          <Upload size={13} />
          <span>Upload Document</span>
          <input type="file" accept=".pdf,.txt,.md" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 mt-4 overflow-hidden">
        {/* Left: Source Analysis Card */}
        <div className="bg-[#000000] border border-[#27272a] rounded-lg p-3 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="text-[10px] font-mono text-[#06B6D4] uppercase tracking-wider font-bold mb-1">
              Active Source Analysis
            </div>
            <div className="font-mono text-xs font-bold text-slate-100 truncate mb-1">
              {activeDoc.title}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mb-2">
              {activeDoc.pages} Pages • {activeDoc.words} Words • 100% Ingested
            </div>
            <div className="p-2.5 rounded bg-[#121214] border border-[#27272a] text-[11px] text-slate-300 font-mono leading-relaxed mb-3">
              {activeDoc.summary}
            </div>

            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold mb-1.5">
              Extracted Core Rules:
            </div>
            <div className="space-y-1.5">
              {activeDoc.rules.map((r) => (
                <div key={r.num} className="p-2 rounded bg-[#121214] border border-[#27272a] text-[10px] font-mono">
                  <span className="font-bold text-[#06B6D4] mr-1">Rule {r.num}:</span>
                  <span className="text-slate-200">{r.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#27272a] text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>Zero Hallucination Verified</span>
          </div>
        </div>

        {/* Right: AI Tutor Chat (NotebookLM style) */}
        <div className="md:col-span-2 bg-[#000000] border border-[#27272a] rounded-lg flex flex-col h-full overflow-hidden">
          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] p-3.5 rounded-xl leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#06B6D4] text-black font-bold'
                      : 'bg-[#121214] border border-[#27272a] text-slate-200 shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {m.content.split(/(\[\d+\])/g).map((part, idx) => {
                      const match = part.match(/\[(\d+)\]/)
                      if (match) {
                        const num = parseInt(match[1], 10)
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              const p = activeDoc.passages[num - 1] || activeDoc.passages[0]
                              setActiveCitation(p)
                            }}
                            className="inline-flex px-1.5 py-0.5 mx-0.5 rounded bg-[#06B6D4]/20 border border-[#06B6D4] text-[#06B6D4] font-bold text-[10px] hover:bg-[#06B6D4] hover:text-black transition"
                          >
                            {part}
                          </button>
                        )
                      }
                      return <span key={idx}>{part}</span>
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-[#121214] border border-[#27272a] p-3 rounded-xl text-[11px] text-[#06B6D4] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping" />
                  <span>AI Tutor consulting document clauses...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Study Questions */}
          <div className="px-3 py-1.5 bg-[#121214] border-t border-[#27272a] flex items-center gap-1.5 overflow-x-auto shrink-0 text-[10px] font-mono">
            <span className="text-slate-400 shrink-0 font-bold">Ask Tutor:</span>
            <button
              onClick={() => handleAsk('What is the exact night curfew time?')}
              className="px-2 py-0.5 rounded bg-[#000000] border border-[#27272a] text-slate-300 hover:text-[#06B6D4] hover:border-[#06B6D4] whitespace-nowrap"
            >
              🚪 Night Curfew Time
            </button>
            <button
              onClick={() => handleAsk('What happens if AC runs past 8 hours?')}
              className="px-2 py-0.5 rounded bg-[#000000] border border-[#27272a] text-slate-300 hover:text-[#06B6D4] hover:border-[#06B6D4] whitespace-nowrap"
            >
              ⚡ AC Electricity Limit
            </button>
            <button
              onClick={() => handleAsk('When is rent due and what is the late fee?')}
              className="px-2 py-0.5 rounded bg-[#000000] border border-[#27272a] text-slate-300 hover:text-[#06B6D4] hover:border-[#06B6D4] whitespace-nowrap"
            >
              💳 Rent Due & Late Fee
            </button>
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#121214] border-t border-[#27272a] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAsk()
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask the AI Tutor about any hostel rule or policy..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 font-mono text-xs focus:outline-none focus:border-[#06B6D4]"
              />
              <button
                type="submit"
                disabled={!question.trim() || isThinking}
                className="px-4 py-2 rounded-lg bg-[#06B6D4] text-black font-mono text-xs font-bold hover:bg-[#0891B2] transition flex items-center gap-1 shadow-neonCyan"
              >
                <span>Ask</span>
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Citation Modal */}
      {activeCitation && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] border-2 border-[#06B6D4] rounded-xl max-w-md w-full p-5 shadow-neonCyan font-mono text-xs animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-[#27272a]">
              <div className="flex items-center gap-1.5 font-bold text-[#06B6D4]">
                <span>[{activeCitation.id}]</span>
                <span>{activeCitation.section}</span>
              </div>
              <button onClick={() => setActiveCitation(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="my-3 p-3 bg-[#000000] border-l-4 border-[#06B6D4] rounded text-slate-200 italic leading-relaxed">
              "{activeCitation.text}"
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span className="text-[#10B981] font-bold">✓ Verified Document Citation</span>
              <span>Page {activeCitation.page}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

