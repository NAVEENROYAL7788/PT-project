import React, { useState, useEffect, useRef } from 'react'
import { Terminal, ShieldAlert, CheckCircle, AlertTriangle, Key, Radio, Pause, Play, Trash2 } from 'lucide-react'

const INITIAL_LOGS = [
  { id: 'log-1', time: '15:24:02', device: 'KEYPAD_ROOM_302', event: 'ACCESS_GRANTED', user: 'Rahul Verma (Card #9821)', type: 'success' },
  { id: 'log-2', time: '15:23:41', device: 'MAIN_GATE_TURNSTILE_01', event: 'ACCESS_GRANTED', user: 'Priya Sharma (Facial Scan)', type: 'success' },
  { id: 'log-3', time: '15:22:15', device: 'KEYPAD_ROOM_204', event: 'BATTERY_LOW_ALERT', user: 'System (Level: 14% Voltage)', type: 'warning' },
  { id: 'log-4', time: '15:20:50', device: 'BACK_FIRE_EXIT_DOOR', event: 'FORCED_ENTRY_ATTEMPT', user: 'UNKNOWN (Sensor Tamper Detected!)', type: 'alert' },
  { id: 'log-5', time: '15:19:12', device: 'KEYPAD_ROOM_108', event: 'ACCESS_GRANTED', user: 'Aditya Nair (PIN Verified)', type: 'success' },
  { id: 'log-6', time: '15:17:30', device: 'MESS_HALL_RFID', event: 'ACCESS_GRANTED', user: 'Sneha Patel (Card #4102)', type: 'success' },
  { id: 'log-7', time: '15:15:02', device: 'SERVER_ROOM_BIOMETRIC', event: 'MASTER_RFID_OVERRIDE', user: 'Admin: Vikram S.', type: 'cyan' },
]

export default function WidgetSecurityFeed({ isLockdown }) {
  const [logs, setLogs] = useState(INITIAL_LOGS)
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'ALERT' | 'SUCCESS' | 'WARNING'
  const [isStreaming, setIsStreaming] = useState(true)
  const feedEndRef = useRef(null)

  // Real-time terminal hardware simulation
  useEffect(() => {
    if (!isStreaming) return

    const simulatedEvents = [
      { device: 'MAIN_GATE_TURNSTILE_01', event: 'ACCESS_GRANTED', user: 'Tenant #412 (NFC Scan)', type: 'success' },
      { device: 'KEYPAD_ROOM_405', event: 'ACCESS_GRANTED', user: 'Ananya Roy (PIN Verified)', type: 'success' },
      { device: 'BASEMENT_PARKING_GATE', event: 'ACCESS_GRANTED', user: 'Vehicle Sensor (ID #KA-03-88)', type: 'success' },
      { device: 'KEYPAD_ROOM_112', event: 'BATTERY_LOW_ALERT', user: 'Hardware (Battery: 18%)', type: 'warning' },
      { device: 'SIDE_PERIMETER_GATE', event: 'FORCED_ENTRY_ATTEMPT', user: 'UNAUTHORIZED_LATCH_FORCE', type: 'alert' },
      { device: 'COMMON_ROOM_DOOR', event: 'ACCESS_GRANTED', user: 'Kunal Sen (RFID #8812)', type: 'success' },
    ]

    const interval = setInterval(() => {
      const now = new Date()
      const timeStr = now.toTimeString().split(' ')[0]
      const pick = simulatedEvents[Math.floor(Math.random() * simulatedEvents.length)]

      const newLog = {
        id: 'log-' + Date.now(),
        time: timeStr,
        device: pick.device,
        event: isLockdown ? 'GLOBAL_LOCKDOWN_ENFORCED' : pick.event,
        user: isLockdown ? 'SYSTEM_LOCK_ENGAGED' : pick.user,
        type: isLockdown ? 'alert' : pick.type,
      }

      setLogs((prev) => [newLog, ...prev.slice(0, 39)]) // keep last 40 logs
    }, 3800)

    return () => clearInterval(interval)
  }, [isStreaming, isLockdown])

  const filteredLogs = logs.filter((l) => {
    if (filter === 'ALERT') return l.type === 'alert'
    if (filter === 'SUCCESS') return l.type === 'success'
    if (filter === 'WARNING') return l.type === 'warning'
    return true
  })

  return (
    <div className={`bg-[#121214] border ${isLockdown ? 'border-[#F43F5E] shadow-neonRose' : 'border-[#27272a] shadow-xl'} rounded-xl p-5 flex flex-col h-[420px] transition-all relative overflow-hidden`}>
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#27272a] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#000000] border border-[#27272a] flex items-center justify-center text-[#06B6D4]">
            <Terminal size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
                Widget A: Live Security Feed
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#000000] border border-[#27272a] text-[#06B6D4]">
                <Radio size={10} className="animate-pulse text-[#10B981]" />
                <span>48 LOCKS SYNCED</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Simulating Real-Time Keypad & RFID Hardware Stream</p>
          </div>
        </div>

        {/* Controls & Filter */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#000000] p-0.5 rounded-lg border border-[#27272a] text-[10px] font-mono">
            {['ALL', 'ALERT', 'SUCCESS', 'WARNING'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded transition-colors ${
                  filter === f
                    ? 'bg-[#06B6D4] text-black font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className="p-1.5 rounded-lg bg-[#000000] border border-[#27272a] text-slate-300 hover:text-[#06B6D4] transition"
            title={isStreaming ? 'Pause Stream' : 'Resume Stream'}
          >
            {isStreaming ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={() => setLogs([])}
            className="p-1.5 rounded-lg bg-[#000000] border border-[#27272a] text-slate-400 hover:text-[#F43F5E] transition"
            title="Clear Terminal"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-1.5 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No logs matching filter. Awaiting hardware signals...</div>
        ) : (
          filteredLogs.map((log) => {
            let badgeBg = 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
            let Icon = CheckCircle

            if (log.type === 'alert') {
              badgeBg = 'bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/60 animate-pulse'
              Icon = ShieldAlert
            } else if (log.type === 'warning') {
              badgeBg = 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
              Icon = AlertTriangle
            } else if (log.type === 'cyan') {
              badgeBg = 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/40'
              Icon = Key
            }

            return (
              <div
                key={log.id}
                className="flex items-center justify-between p-2 rounded bg-[#000000]/80 border border-[#27272a]/70 hover:border-[#06B6D4]/50 transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">[{log.time}]</span>
                  <span className="text-slate-300 font-semibold truncate text-[11px] max-w-[150px]">
                    {log.device}
                  </span>
                  <span className="text-slate-400 truncate text-[11px] hidden sm:inline">
                    ➔ {log.user}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${badgeBg}`}>
                    <Icon size={11} />
                    <span>{log.event}</span>
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Terminal Footer */}
      <div className="mt-2 pt-2 border-t border-[#27272a] flex justify-between items-center text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
          <span>AES-256 HARDWARE PROTOCOL ACTIVE</span>
        </span>
        <span>LATENCY: 12ms</span>
      </div>
    </div>
  )
}

