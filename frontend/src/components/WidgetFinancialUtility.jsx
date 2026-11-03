import React, { useState } from 'react'
import { IndianRupee, Zap, AlertTriangle, Send, CheckCircle2, TrendingUp, BellRing, ArrowUpRight } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function WidgetFinancialUtility({ onGeneratePaymentClick }) {
  const [collected, setCollected] = useState(142500)
  const target = 180000
  const percentage = Math.min(100, Math.round((collected / target) * 100))
  const pending = target - collected

  const [spikeNotified, setSpikeNotified] = useState(false)
  const [throttled, setThrottled] = useState(false)
  const { addToast } = useToast()

  const handleSimulatePayment = () => {
    if (collected >= target) {
      addToast('Monthly target of ₹1,80,000 is already 100% achieved!', 'info')
      return
    }
    const increment = 7500
    setCollected((prev) => Math.min(target, prev + increment))
    addToast(`Payment of ₹${increment.toLocaleString('en-IN')} received from Room 204!`, 'success')
  }

  const handleNotifyRoom302 = () => {
    setSpikeNotified(true)
    addToast('High-Voltage Energy Alert sent via WhatsApp & SMS to Room 302 tenants.', 'warning')
  }

  const handleThrottlePower = () => {
    setThrottled(!throttled)
    if (!throttled) {
      addToast('Room 302 smart breaker throttled to 2.0 kW safe ceiling.', 'info')
    } else {
      addToast('Room 302 power throttle disarmed.', 'info')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* 1. RENT COLLECTED CARD */}
      <div className="bg-[#121214] border border-[#27272a] rounded-xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-[#06B6D4]/50 transition-all">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#000000] border border-[#27272a] flex items-center justify-center text-[#10B981]">
                <IndianRupee size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
                  Monthly Rent Collection
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">November Target vs Inflow</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              {percentage}% TARGET
            </span>
          </div>

          {/* Numbers */}
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-slate-100 flex items-center gap-1">
                <span>₹{collected.toLocaleString('en-IN')}</span>
                <span className="text-xs text-slate-400 font-normal">/ ₹{target.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                <span className="text-[#10B981] font-semibold flex items-center">
                  <TrendingUp size={12} className="inline mr-0.5" /> +12%
                </span>
                <span>vs last cycle</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">Pending Balance</div>
              <div className="text-sm font-bold font-mono text-[#F59E0B]">
                ₹{pending.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-3 w-full bg-[#000000] rounded-full overflow-hidden p-0.5 border border-[#27272a]">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#06B6D4] to-[#10B981] shadow-neonCyan"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1.5">
              <span>24 / 30 TENANTS PAID</span>
              <span>6 PENDING</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5 pt-3 border-t border-[#27272a] flex items-center gap-2">
          <button
            onClick={handleSimulatePayment}
            className="flex-1 py-1.5 px-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981] hover:text-black font-mono text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 size={13} />
            <span>Simulate Payment</span>
          </button>
          <button
            onClick={onGeneratePaymentClick}
            className="flex-1 py-1.5 px-3 rounded-lg bg-[#000000] border border-[#27272a] hover:border-[#06B6D4] text-[#06B6D4] font-mono text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Send size={12} />
            <span>Payment Link</span>
          </button>
        </div>
      </div>

      {/* 2. ELECTRICITY CONSUMPTION SPIKE CARD */}
      <div className="bg-[#121214] border border-[#27272a] rounded-xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-[#F59E0B]/50 transition-all">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#000000] border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B]">
                <Zap size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
                  Utility Overload Detection
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">Smart Sub-Meter Telemetry</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50 flex items-center gap-1 animate-pulse">
              <AlertTriangle size={11} />
              <span>OVERLOAD SPIKE</span>
            </span>
          </div>

          {/* Alert Content */}
          <div className="mt-4 p-3 rounded-lg bg-[#000000] border border-[#F59E0B]/30 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono font-bold">
              <span className="text-slate-200">Room 302 (Kunal & Rohan)</span>
              <span className="text-[#F59E0B]">18.6 kWh / 24h</span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
              ⚠️ AC continuous run spike detected (16°C setpoint for 14 hrs). Exceeds hostel baseline limit by <strong>280%</strong>.
            </p>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
              <span>BREAKER LOAD: 82%</span>
              <span>GRID HAZARD: ELEVATED</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-3 border-t border-[#27272a] flex items-center gap-2">
          <button
            onClick={handleNotifyRoom302}
            className={`flex-1 py-1.5 px-3 rounded-lg font-mono text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
              spikeNotified
                ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]'
                : 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B] hover:text-black'
            }`}
          >
            <BellRing size={13} />
            <span>{spikeNotified ? 'Tenant Notified ✓' : 'Notify Room 302'}</span>
          </button>

          <button
            onClick={handleThrottlePower}
            className={`flex-1 py-1.5 px-3 rounded-lg font-mono text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
              throttled
                ? 'bg-[#06B6D4] text-black font-bold border-[#06B6D4]'
                : 'bg-[#000000] border-[#27272a] hover:border-[#06B6D4] text-slate-300 hover:text-[#06B6D4]'
            }`}
          >
            <Zap size={12} />
            <span>{throttled ? 'Throttle Engaged (2kW)' : 'Throttle Voltage'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

