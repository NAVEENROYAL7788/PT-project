import React, { useState } from 'react'
import { Lock, QrCode, UserPlus, Download, AlertOctagon, X, Check, Copy, ShieldAlert, Key } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function WidgetQuickActions({ isLockdown, onToggleLockdown }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showTenantModal, setShowTenantModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // Payment Link state
  const [tenantName, setTenantName] = useState('Rahul Verma (Room 302)')
  const [rentAmount, setRentAmount] = useState('7500')
  const [generatedLink, setGeneratedLink] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // New Tenant state
  const [newTenantName, setNewTenantName] = useState('')
  const [newRoomNo, setNewRoomNo] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPin, setNewPin] = useState('4829')

  const { addToast } = useToast()

  const handleGeneratePayment = (e) => {
    e.preventDefault()
    const link = `upi://pay?pa=securesstaypg@icici&pn=SecureStayHostel&am=${rentAmount}&tn=Rent_Payment_${tenantName.replace(/\s+/g, '_')}`
    setGeneratedLink(link)
    addToast(`Payment link generated for ${tenantName}!`, 'success')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopiedLink(true)
    addToast('UPI Payment link copied to clipboard', 'info')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleAddTenant = (e) => {
    e.preventDefault()
    if (!newTenantName || !newRoomNo) return
    addToast(`Tenant ${newTenantName} onboarded to ${newRoomNo} with Keypad PIN #${newPin}!`, 'success')
    setNewTenantName('')
    setNewRoomNo('')
    setNewPhone('')
    setShowTenantModal(false)
  }

  const handleExportLogs = (type) => {
    const csvContent =
      type === 'security'
        ? `Timestamp,Device,Event,User,Severity\n2026-11-01 15:24:02,KEYPAD_ROOM_302,ACCESS_GRANTED,Rahul Verma,NORMAL\n2026-11-01 15:20:50,BACK_FIRE_EXIT,FORCED_ENTRY_ATTEMPT,UNKNOWN,CRITICAL`
        : `Room,Tenant,Amount,Due_Date,Status\nRoom 101,Aman Gupta,7500,2026-11-05,PAID\nRoom 302,Rahul Verma,7500,2026-11-01,OVERDUE`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `SecureStay_${type}_audit_logs.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowExportModal(false)
    addToast(`Exported ${type} audit log CSV`, 'success')
  }

  return (
    <>
      <div className="bg-[#121214] border border-[#27272a] rounded-xl p-5 shadow-xl transition-all">
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
            <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
              Widget D: Quick Actions & Emergency Controls
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">HOSTEL CONTROLLER DISPATCH</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Trigger Global Lock */}
          <button
            onClick={onToggleLockdown}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all font-mono font-bold text-xs uppercase tracking-wider group text-left ${
              isLockdown
                ? 'bg-[#F43F5E] text-white border-[#F43F5E] shadow-neonRose animate-pulse'
                : 'bg-[#F43F5E]/10 border-[#F43F5E]/40 text-[#F43F5E] hover:bg-[#F43F5E] hover:text-white shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isLockdown ? 'bg-white text-[#F43F5E]' : 'bg-[#000000] text-[#F43F5E]'}`}>
              <AlertOctagon size={22} className={isLockdown ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="text-sm font-bold">{isLockdown ? 'DISARM LOCKDOWN' : 'TRIGGER GLOBAL LOCK'}</div>
              <div className={`text-[10px] font-normal ${isLockdown ? 'text-white/80' : 'text-slate-400'}`}>
                {isLockdown ? 'Red Alert Active • 48 Doors Sealed' : 'Emergency Perimeter Seal'}
              </div>
            </div>
          </button>

          {/* Action 2: Generate Payment Links */}
          <button
            onClick={() => setShowPaymentModal(true)}
            className="p-4 rounded-xl bg-[#000000] border border-[#27272a] hover:border-[#06B6D4] hover:shadow-neonCyan text-slate-100 flex items-center gap-3 transition-all font-mono font-bold text-xs uppercase tracking-wider text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#121214] border border-[#27272a] group-hover:border-[#06B6D4] flex items-center justify-center text-[#06B6D4] shrink-0">
              <QrCode size={20} />
            </div>
            <div>
              <div className="text-sm font-bold group-hover:text-[#06B6D4] transition">Payment Links</div>
              <div className="text-[10px] text-slate-400 font-normal">Instant UPI & Card Collection</div>
            </div>
          </button>

          {/* Action 3: Add New Tenant */}
          <button
            onClick={() => setShowTenantModal(true)}
            className="p-4 rounded-xl bg-[#000000] border border-[#27272a] hover:border-[#10B981] hover:shadow-neonGreen text-slate-100 flex items-center gap-3 transition-all font-mono font-bold text-xs uppercase tracking-wider text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#121214] border border-[#27272a] group-hover:border-[#10B981] flex items-center justify-center text-[#10B981] shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <div className="text-sm font-bold group-hover:text-[#10B981] transition">Add New Tenant</div>
              <div className="text-[10px] text-slate-400 font-normal">Assign Digital Keypad PIN</div>
            </div>
          </button>

          {/* Action 4: Export Logs */}
          <button
            onClick={() => setShowExportModal(true)}
            className="p-4 rounded-xl bg-[#000000] border border-[#27272a] hover:border-slate-400 text-slate-100 flex items-center gap-3 transition-all font-mono font-bold text-xs uppercase tracking-wider text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#121214] border border-[#27272a] flex items-center justify-center text-slate-300 shrink-0">
              <Download size={20} />
            </div>
            <div>
              <div className="text-sm font-bold">Export Logs</div>
              <div className="text-[10px] text-slate-400 font-normal">Download Hardware CSV</div>
            </div>
          </button>
        </div>
      </div>

      {/* Modal 1: Payment Link Generator */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] border border-[#06B6D4] rounded-xl max-w-md w-full p-6 shadow-neonCyan animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-[#06B6D4]" />
                <h4 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Generate Instant UPI Payment Link
                </h4>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGeneratePayment} className="mt-4 space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Select Tenant</label>
                <select
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="Rahul Verma (Room 302)">Rahul Verma — Room 302 (Overdue ₹7,500)</option>
                  <option value="Sneha Patel (Room 108)">Sneha Patel — Room 108 (Due ₹7,500)</option>
                  <option value="Rohan Mehra (Room 204)">Rohan Mehra — Room 204 (Partial ₹3,500)</option>
                  <option value="Ananya Roy (Room 405)">Ananya Roy — Room 405 (Advance ₹8,000)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Amount (₹ INR)</label>
                <input
                  type="number"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#06B6D4] text-black font-bold hover:bg-[#0891B2] transition shadow-neonCyan"
              >
                Generate Link & QR Code
              </button>

              {generatedLink && (
                <div className="p-3 bg-[#000000] border border-[#06B6D4]/40 rounded-lg space-y-2 mt-3">
                  <div className="text-[10px] text-slate-400">DISPATCH LINK READY:</div>
                  <div className="text-[11px] text-[#06B6D4] break-all p-2 bg-[#121214] rounded border border-[#27272a]">
                    {generatedLink}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full py-1.5 bg-[#10B981] text-black font-bold rounded flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Payment Link'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add New Tenant */}
      {showTenantModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] border border-[#10B981] rounded-xl max-w-md w-full p-6 shadow-neonGreen animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-[#10B981]" />
                <h4 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Onboard Tenant & Issue Keypad PIN
                </h4>
              </div>
              <button onClick={() => setShowTenantModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="mt-4 space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Sharma"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Assigned Room</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 402"
                    value={newRoomNo}
                    onChange={(e) => setNewRoomNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Digital Keypad PIN</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      readOnly
                      value={newPin}
                      className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-[#06B6D4] font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPin(Math.floor(1000 + Math.random() * 9000).toString())}
                      className="px-2 bg-[#27272a] text-slate-300 rounded hover:text-white"
                      title="Generate new PIN"
                    >
                      🎲
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Phone Number (SMS / WhatsApp Alerts)</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTenantModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#000000] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#10B981] text-black font-bold hover:bg-[#059669] shadow-neonGreen"
                >
                  Issue Keycode & Onboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Export Logs */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] border border-[#27272a] rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-[#06B6D4]" />
                <h4 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Export System Audit Logs
                </h4>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <p className="text-slate-300 leading-relaxed">
                Choose the log archive to export as a formatted CSV spreadsheet:
              </p>

              <button
                onClick={() => handleExportLogs('security')}
                className="w-full p-3 bg-[#000000] border border-[#27272a] hover:border-[#06B6D4] text-left rounded-lg transition group"
              >
                <div className="font-bold text-slate-100 group-hover:text-[#06B6D4]">
                  🚨 Hardware Security & Keypad Audit (.CSV)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Includes all access granted, low-battery alerts, and forced entry attempts.
                </div>
              </button>

              <button
                onClick={() => handleExportLogs('financial')}
                className="w-full p-3 bg-[#000000] border border-[#27272a] hover:border-[#10B981] text-left rounded-lg transition group"
              >
                <div className="font-bold text-slate-100 group-hover:text-[#10B981]">
                  💳 Rent & Utility Inflow Report (.CSV)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Tenant-by-tenant rent payment status and kilowatt power metrics.
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

