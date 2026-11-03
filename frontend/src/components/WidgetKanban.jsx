import React, { useState } from 'react'
import { Columns3, Plus, ChevronRight, ChevronLeft, Trash2, CheckCircle2, Clock, Wrench, AlertCircle, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const INITIAL_TASKS = [
  { id: 'tsk-1', title: 'Bathroom tap leaking continuously', room: 'Room 104', priority: 'High', category: 'Plumbing', status: 'reported' },
  { id: 'tsk-2', title: 'Smart lock keypad button 4 unresponsive', room: 'Room 208', priority: 'High', category: 'Lock', status: 'reported' },
  { id: 'tsk-3', title: 'Ceiling fan high vibration at speed 5', room: 'Room 312', priority: 'Medium', category: 'Electrical', status: 'in-progress' },
  { id: 'tsk-4', title: '5GHz WiFi access point intermittent drop', room: 'Floor 2 Hallway', priority: 'High', category: 'Network', status: 'in-progress' },
  { id: 'tsk-5', title: 'RO Water purifier filter cartridge replaced', room: 'Common Mess', priority: 'Low', category: 'Plumbing', status: 'resolved' },
  { id: 'tsk-6', title: 'Emergency stairwell lightbulb fixture replaced', room: 'Block A Stairway', priority: 'Medium', category: 'Electrical', status: 'resolved' },
]

export default function WidgetKanban() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newRoom, setNewRoom] = useState('')
  const [newPriority, setNewPriority] = useState('High')
  const [newCategory, setNewCategory] = useState('Plumbing')

  const { addToast } = useToast()

  const moveTask = (taskId, direction) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t
        let newStatus = t.status
        if (direction === 'forward') {
          if (t.status === 'reported') newStatus = 'in-progress'
          else if (t.status === 'in-progress') newStatus = 'resolved'
        } else if (direction === 'backward') {
          if (t.status === 'resolved') newStatus = 'in-progress'
          else if (t.status === 'in-progress') newStatus = 'reported'
        }
        return { ...t, status: newStatus }
      })
    )
    addToast('Task status updated on Kanban board', 'info')
  }

  const deleteTask = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    addToast('Maintenance task deleted', 'info')
  }

  const handleAddTask = (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newTask = {
      id: 'tsk-' + Date.now(),
      title: newTitle.trim(),
      room: newRoom.trim() || 'General Block',
      priority: newPriority,
      category: newCategory,
      status: 'reported',
    }

    setTasks((prev) => [newTask, ...prev])
    setNewTitle('')
    setNewRoom('')
    setShowAddModal(false)
    addToast('New maintenance ticket logged in Reported queue!', 'success')
  }

  const columns = [
    { key: 'reported', label: 'Reported', color: '#F43F5E', bg: 'bg-[#F43F5E]/10', border: 'border-[#F43F5E]/30', count: tasks.filter((t) => t.status === 'reported').length },
    { key: 'in-progress', label: 'In-Progress', color: '#06B6D4', bg: 'bg-[#06B6D4]/10', border: 'border-[#06B6D4]/30', count: tasks.filter((t) => t.status === 'in-progress').length },
    { key: 'resolved', label: 'Resolved', color: '#10B981', bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/30', count: tasks.filter((t) => t.status === 'resolved').length },
  ]

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-xl p-5 shadow-xl flex flex-col transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#000000] border border-[#27272a] flex items-center justify-center text-[#06B6D4]">
            <Columns3 size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
              Widget C: Maintenance Kanban Tracker
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">Hostel Facilities & Hardware Work Orders</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] text-black font-mono text-xs font-bold transition flex items-center gap-1 shadow-neonCyan"
        >
          <Plus size={14} />
          <span>New Ticket</span>
        </button>
      </div>

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key)
          return (
            <div key={col.key} className="bg-[#000000] border border-[#27272a] rounded-lg p-3 flex flex-col h-[320px]">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a] mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wide">
                    {col.label}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-[#121214]">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-mono text-[11px]">
                    No tickets in {col.label}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    let priorityBadge = 'bg-[#10B981]/15 text-[#10B981]'
                    if (task.priority === 'High') priorityBadge = 'bg-[#F43F5E]/20 text-[#F43F5E]'
                    else if (task.priority === 'Medium') priorityBadge = 'bg-[#F59E0B]/20 text-[#F59E0B]'

                    return (
                      <div
                        key={task.id}
                        className="p-2.5 rounded-md bg-[#121214] border border-[#27272a] hover:border-[#06B6D4]/40 transition flex flex-col justify-between group shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="text-slate-400 font-bold">{task.room}</span>
                            <span className={`px-1.5 py-0.2 rounded font-semibold ${priorityBadge}`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="text-xs text-slate-100 font-medium leading-snug line-clamp-2">
                            {task.title}
                          </div>
                        </div>

                        {/* Card Movement Handles */}
                        <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-[#27272a]/60 text-[11px] text-slate-400">
                          <span className="text-[10px] text-slate-400 font-mono">{task.category}</span>

                          <div className="flex items-center gap-1">
                            {col.key !== 'reported' && (
                              <button
                                onClick={() => moveTask(task.id, 'backward')}
                                className="p-1 hover:text-[#06B6D4] transition"
                                title="Move Left"
                              >
                                <ChevronLeft size={13} />
                              </button>
                            )}

                            {col.key !== 'resolved' && (
                              <button
                                onClick={() => moveTask(task.id, 'forward')}
                                className="p-1 hover:text-[#06B6D4] transition"
                                title="Move Right"
                              >
                                <ChevronRight size={13} />
                              </button>
                            )}

                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1 hover:text-[#F43F5E] transition ml-1"
                              title="Delete Ticket"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] border border-[#06B6D4] rounded-xl max-w-md w-full p-6 shadow-neonCyan animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-[#06B6D4]" />
                <h4 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Log New Maintenance Ticket
                </h4>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="mt-4 space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Issue Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keypad battery dying, AC pipe leak"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Room / Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 204"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 focus:outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#000000] border border-[#27272a] text-slate-100 focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Lock">Lock & Keypad</option>
                  <option value="Network">WiFi & Network</option>
                  <option value="Civil">Civil / Carpentry</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#27272a] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#000000] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#06B6D4] text-black font-bold hover:bg-[#0891B2] shadow-neonCyan"
                >
                  Log Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
