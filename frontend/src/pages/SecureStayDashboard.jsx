import React, { useState } from 'react'
import SecureStaySidebar from '../components/SecureStaySidebar'
import SecureStayNavbar from '../components/SecureStayNavbar'
import WidgetSecurityFeed from '../components/WidgetSecurityFeed'
import WidgetFinancialUtility from '../components/WidgetFinancialUtility'
import WidgetKanban from '../components/WidgetKanban'
import WidgetQuickActions from '../components/WidgetQuickActions'
import WidgetHostelAITutor from '../components/WidgetHostelAITutor'
import { AlertOctagon, ShieldAlert, Cpu, Radio, KeyRound, Wrench } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function SecureStayDashboard() {
  const [activeView, setActiveView] = useState('dashboard') // 'dashboard' | 'security' | 'financials' | 'kanban' | 'aitutor' | 'settings'
  const [isLockdown, setIsLockdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { addToast } = useToast()

  const handleToggleLockdown = () => {
    const nextState = !isLockdown
    setIsLockdown(nextState)
    if (nextState) {
      addToast('🚨 EMERGENCY PERIMETER LOCKDOWN TRIGGERED! All 48 smart locks sealed.', 'error')
    } else {
      addToast('Perimeter lockdown disarmed. Normal hardware access restored.', 'success')
    }
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-[#000000] text-slate-100 ${isLockdown ? 'lockdown-active' : ''}`}>
      {/* Persistent Left Sidebar */}
      <SecureStaySidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isLockdown={isLockdown}
        onToggleLockdown={handleToggleLockdown}
      />

      {/* Main Command Center Body */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Navbar */}
        <SecureStayNavbar
          isLockdown={isLockdown}
          onToggleLockdown={handleToggleLockdown}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Red Alert Banner when Lockdown is Active */}
        {isLockdown && (
          <div className="bg-[#F43F5E] text-white px-6 py-2.5 flex items-center justify-between text-xs font-mono font-bold animate-pulse shadow-neonRose shrink-0 z-30">
            <div className="flex items-center gap-2">
              <AlertOctagon size={18} className="animate-spin" />
              <span>[CRITICAL RED ALERT] GLOBAL FACILITY LOCKDOWN ACTIVE — KEYPAD SIGNALS OVERRIDDEN — PERIMETER SEALED</span>
            </div>
            <button
              onClick={handleToggleLockdown}
              className="px-3 py-1 bg-white text-[#F43F5E] rounded font-bold hover:bg-slate-100 transition shadow"
            >
              DISARM LOCKDOWN
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: FULL COMMAND CENTER (Widgets A, B, C, D) */}
          {activeView === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Facility Title & Live Hardware Status */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold font-mono text-slate-100 tracking-wide flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] shadow-neonCyan" />
                    <span>Hostel Command Center • Block-A Overview</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Real-Time Keypad Telemetry, Utility Overload Detection, and Maintenance Dispatch
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <div className="px-3 py-1.5 rounded-lg bg-[#121214] border border-[#27272a] flex items-center gap-2">
                    <Radio size={13} className="text-[#10B981] animate-pulse" />
                    <span className="text-slate-300">Telemetry: <strong className="text-white">Active</strong></span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[#121214] border border-[#27272a] flex items-center gap-2">
                    <Cpu size={13} className="text-[#06B6D4]" />
                    <span className="text-slate-300">Firmware: <strong className="text-white">v4.1.2</strong></span>
                  </div>
                </div>
              </div>

              {/* WIDGET D: Quick Actions Row */}
              <WidgetQuickActions
                isLockdown={isLockdown}
                onToggleLockdown={handleToggleLockdown}
              />

              {/* WIDGET A & B: Security Feed + Financial & Utility Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* WIDGET A: Live Security Feed (Monospaced Hardware Terminal) */}
                <WidgetSecurityFeed isLockdown={isLockdown} />

                {/* WIDGET B: Financial & Utility Overview */}
                <WidgetFinancialUtility
                  onGeneratePaymentClick={() => setActiveView('financials')}
                />
              </div>

              {/* WIDGET C: Maintenance Kanban Board */}
              <WidgetKanban />
            </div>
          )}

          {/* TAB 2: DEDICATED LIVE SECURITY FEED */}
          {activeView === 'security' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="pb-3 border-b border-[#27272a]">
                <h2 className="text-lg font-bold font-mono text-slate-100">
                  Full Hardware Terminal & Biometric Scanners
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Live streaming telemetry from all 48 room keypads, RFID turnstiles, and fire exits.
                </p>
              </div>
              <WidgetSecurityFeed isLockdown={isLockdown} />
            </div>
          )}

          {/* TAB 3: DEDICATED FINANCIALS & UTILITY OVERVIEW */}
          {activeView === 'financials' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="pb-3 border-b border-[#27272a]">
                <h2 className="text-lg font-bold font-mono text-slate-100">
                  Financial Revenue & Energy Consumption Dashboard
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Target tracking towards ₹1,80,000 monthly target and smart breaker telemetry.
                </p>
              </div>
              <WidgetFinancialUtility />
            </div>
          )}

          {/* TAB 4: DEDICATED MAINTENANCE KANBAN */}
          {activeView === 'kanban' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="pb-3 border-b border-[#27272a]">
                <h2 className="text-lg font-bold font-mono text-slate-100">
                  Facilities & Maintenance Operations (Kanban)
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Manage Reported, In-Progress, and Resolved work orders with real-time updates.
                </p>
              </div>
              <WidgetKanban />
            </div>
          )}

          {/* TAB 5: AI KNOWLEDGE & NOTEBOOKLM TUTOR */}
          {activeView === 'aitutor' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="pb-3 border-b border-[#27272a]">
                <h2 className="text-lg font-bold font-mono text-slate-100">
                  Hostel Policy & Agreement AI Tutor (NotebookLM Engine)
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Upload hostel agreements, safety regulations, and curfew policies. The AI breaks them down with verified citations.
                </p>
              </div>
              <WidgetHostelAITutor />
            </div>
          )}

          {/* TAB 6: SETTINGS & HARDWARE CONFIG */}
          {activeView === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="pb-3 border-b border-[#27272a]">
                <h2 className="text-lg font-bold font-mono text-slate-100">
                  Emergency Hardware Config & Master Overrides
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Configure hardware baud rates, RFID master cards, and emergency protocols.
                </p>
              </div>

              <div className="bg-[#121214] border border-[#27272a] rounded-xl p-5 space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center pb-3 border-b border-[#27272a]">
                  <div>
                    <div className="font-bold text-slate-200">Emergency Global Lock Override</div>
                    <div className="text-[11px] text-slate-400">Instantly activates deadbolts on all 48 door controllers</div>
                  </div>
                  <button
                    onClick={handleToggleLockdown}
                    className={`px-4 py-2 rounded-lg font-bold ${isLockdown ? 'bg-[#F43F5E] text-white shadow-neonRose' : 'bg-[#000000] border border-[#F43F5E] text-[#F43F5E]'}`}
                  >
                    {isLockdown ? 'DISARM NOW' : 'TRIGGER LOCK'}
                  </button>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-[#27272a]">
                  <div>
                    <div className="font-bold text-slate-200">Hardware Ping Interval</div>
                    <div className="text-[11px] text-slate-400">Heartbeat check frequency for battery and tamper sensors</div>
                  </div>
                  <span className="px-3 py-1 bg-[#000000] text-[#06B6D4] border border-[#27272a] rounded font-bold">
                    3,500 ms
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-200">Color Palette Specification</div>
                    <div className="text-[11px] text-slate-400">Navy (#000000), Slate (#121214), Cyan (#06B6D4), Green (#10B981), Amber (#F59E0B), Rose (#F43F5E)</div>
                  </div>
                  <span className="px-3 py-1 bg-[#000000] text-[#10B981] border border-[#27272a] rounded font-bold">
                    DEFAULT DARK MODE
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

