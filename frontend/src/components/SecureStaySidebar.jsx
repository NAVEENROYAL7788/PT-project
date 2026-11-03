import React from 'react'
import {
  Shield,
  LayoutDashboard,
  Terminal,
  IndianRupee,
  Columns3,
  Sparkles,
  Settings,
  Lock,
  Unlock,
  Radio,
  Building,
  KeyRound,
} from 'lucide-react'

export default function SecureStaySidebar({ activeView, setActiveView, isLockdown, onToggleLockdown }) {
  const navItems = [
    { key: 'dashboard', label: 'Command Center', icon: LayoutDashboard, badge: 'LIVE' },
    { key: 'security', label: 'Security Feed', icon: Terminal, badge: '48 SYNC' },
    { key: 'financials', label: 'Finances & Energy', icon: IndianRupee },
    { key: 'kanban', label: 'Maintenance Kanban', icon: Columns3 },
    { key: 'aitutor', label: 'AI Knowledge Tutor', icon: Sparkles, badge: 'NOTEBOOK' },
    { key: 'settings', label: 'Emergency & Settings', icon: Settings },
  ]

  return (
    <aside className="w-64 bg-[#000000] border-r border-[#27272a] flex flex-col justify-between shrink-0 h-screen select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#27272a] bg-[#121214]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4] flex items-center justify-center text-[#06B6D4] shadow-neonCyan">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="font-mono font-bold text-sm tracking-wider text-slate-100 uppercase">
                Secure-Stay
              </h1>
              <span className="text-[10px] font-mono font-semibold text-[#06B6D4] tracking-widest block">
                PG OPERATING SYSTEM
              </span>
            </div>
          </div>

          {/* Active Facility Tag */}
          <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-[#000000] border border-[#27272a] flex items-center gap-2 text-[10px] font-mono text-slate-300">
            <Building size={12} className="text-[#06B6D4]" />
            <span className="truncate">Block-A Vanguard Hostel</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 font-mono text-xs">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.key

            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-left ${
                  isActive
                    ? 'bg-[#121214] text-[#06B6D4] border border-[#06B6D4] shadow-neonCyan font-bold'
                    : 'text-slate-400 hover:bg-[#121214]/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? 'text-[#06B6D4]' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      isActive
                        ? 'bg-[#06B6D4] text-black'
                        : 'bg-[#121214] text-slate-400 border border-[#27272a]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Emergency Status Widget */}
      <div className="p-4 border-t border-[#27272a] bg-[#121214]/40 space-y-3 font-mono">
        <div className={`p-3 rounded-lg border text-xs ${isLockdown ? 'bg-[#F43F5E]/20 border-[#F43F5E] text-[#F43F5E]' : 'bg-[#000000] border-[#27272a] text-slate-300'}`}>
          <div className="flex items-center justify-between font-bold text-[11px] mb-1">
            <span>PERIMETER LOCKS</span>
            <span className={isLockdown ? 'text-[#F43F5E] animate-pulse' : 'text-[#10B981]'}>
              {isLockdown ? 'ALL SEALED' : 'SECURED'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {isLockdown ? 'Emergency lockdown overrides all RFID keypads.' : 'Keypad & RFID telemetry operating normally.'}
          </div>
        </div>

        <button
          onClick={onToggleLockdown}
          className={`w-full py-2 px-3 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center gap-2 uppercase tracking-wider ${
            isLockdown
              ? 'bg-[#F43F5E] text-white shadow-neonRose animate-pulse'
              : 'bg-[#000000] border border-[#F43F5E]/50 text-[#F43F5E] hover:bg-[#F43F5E] hover:text-white'
          }`}
        >
          {isLockdown ? <Unlock size={14} /> : <Lock size={14} />}
          <span>{isLockdown ? 'Disarm Lockdown' : 'Emergency Lock'}</span>
        </button>
      </div>
    </aside>
  )
}
