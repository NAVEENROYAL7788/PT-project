import React, { useState } from 'react'
import { Search, Shield, ShieldCheck, ShieldAlert, Radio, User, Bell, AlertTriangle } from 'lucide-react'

export default function SecureStayNavbar({ isLockdown, onToggleLockdown, searchQuery, setSearchQuery }) {
  return (
    <header className="h-16 bg-[#121214] border-b border-[#27272a] px-6 flex items-center justify-between shrink-0 shadow-md">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-72 lg:w-96">
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Global search rooms, tenants, lock IDs (Ctrl + K)..."
            className="w-full pl-9 pr-14 py-1.5 bg-[#000000] border border-[#27272a] rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#06B6D4] transition"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-[#121214] px-1.5 py-0.5 rounded text-slate-400 border border-[#27272a]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Center Hardware Status Badges */}
      <div className="hidden md:flex items-center gap-3">
        {/* Connected Locks Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#000000] border border-[#27272a] text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-slate-300">Locks:</span>
          <span className="font-bold text-[#10B981]">48/48 Online</span>
        </div>

        {/* System Health */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#000000] border border-[#27272a] text-xs font-mono">
          <ShieldCheck size={13} className="text-[#06B6D4]" />
          <span className="text-slate-300">Health:</span>
          <span className="font-bold text-[#06B6D4]">99.8%</span>
        </div>

        {/* Lockdown indicator badge */}
        {isLockdown && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F43F5E]/20 border border-[#F43F5E] text-xs font-mono font-bold text-[#F43F5E] animate-pulse shadow-neonRose">
            <ShieldAlert size={14} />
            <span>GLOBAL LOCKDOWN ENGAGED</span>
          </div>
        )}
      </div>

      {/* Right Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Lockdown Switch Quick Action */}
        <button
          onClick={onToggleLockdown}
          className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1.5 ${
            isLockdown
              ? 'bg-[#F43F5E] text-white shadow-neonRose animate-pulse'
              : 'bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-[#F43F5E] hover:bg-[#F43F5E] hover:text-white'
          }`}
        >
          <ShieldAlert size={14} />
          <span>{isLockdown ? 'DISARM LOCK' : 'TRIGGER LOCK'}</span>
        </button>

        {/* Admin Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#27272a]">
          <div className="w-8 h-8 rounded-lg bg-[#000000] border border-[#06B6D4] flex items-center justify-center text-[#06B6D4] font-mono font-bold text-xs shadow-neonCyan">
            CV
          </div>
          <div className="hidden lg:block text-left font-mono">
            <div className="text-xs font-bold text-slate-100 leading-tight">Cmdr. Vikram</div>
            <div className="text-[10px] text-[#06B6D4] leading-tight">Hostel Administrator</div>
          </div>
        </div>
      </div>
    </header>
  )
}

