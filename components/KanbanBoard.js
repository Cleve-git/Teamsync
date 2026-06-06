'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TaskCommentModal from '@/components/TaskCommentModal'

const COLUMNS = [
  { id: 'todo', label: '📝 To Do', color: 'border-gray-600' },
  { id: 'in_progress', label: '🔄 In Progress', color: 'border-yellow-500' },
  { id: 'done', label: '✅ Done', color: 'border-green-500' },
]

const PRIORITY_COLORS = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-red-500/20 text-red-400',
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export default function KanbanBoard({ tasks, members, onTaskUpdate, onTaskDelete, onTaskEdit }) {
  const [editingTask, setEditingTask] = useState(null)
  const [editData, setEditData] = useState({})
  const [loading, setLoading] = useState(false)
  const [commentTask, setCommentTask] = useState(null)
  const [showFilter, setShowFilter] = useState(false)

  // Filter states
  const [filterMember, setFilterMember] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [sortDeadline, setSortDeadline] = useState(false)

  const supabase = createClient()

  const activeFilterCount = [filterMember, filterPriority, sortDeadline].filter(Boolean).length

  const applyFilters = (taskList) => {
    let filtered = [...taskList]

    if (filterMember) {
      filtered = filtered.filter(t => t.assigned_to === filterMember)
    }

    if (filterPriority) {
      filtered = filtered.filter(t => t.priority === filterPriority)
    }

    if (sortDeadline) {
      filtered.sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date) - new Date(b.due_date)
      })
    }

    return filtered
  }

  const getTasksByStatus = (status) => applyFilters(tasks.filter(t => t.status === status))

  const resetFilters = () => {
    setFilterMember('')
    setFilterPriority('')
    setSortDeadline(false)
  }

  const openEdit = (task) => {
    setEditingTask(task)
    setEditData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assigned_to: task.assigned_to || '',
      due_date: task.due_date || '',
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: editData.title,
        description: editData.description,
        priority: editData.priority,
        assigned_to: editData.assigned_to || null,
        due_date: editData.due_date || null,
      })
      .eq('id', editingTask.id)
      .select(`*, assigned_profile:profiles!tasks_assigned_to_fkey(full_name)`)
      .single()

    if (!error && data) onTaskEdit(data)
    setEditingTask(null)
    setLoading(false)
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    onTaskDelete(taskId)
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  return (
    <>
      {/* Filter Bar */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition ${
              activeFilterCount > 0
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            🔍 Filter
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-gray-500 hover:text-red-400 transition"
            >
              × Reset filter
            </button>
          )}

          {/* Active filter tags */}
          <div className="flex gap-2 flex-wrap">
            {filterMember && (
              <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                👤 {members.find(m => m.id === filterMember)?.full_name?.split(' ')[0]}
                <button onClick={() => setFilterMember('')} className="hover:text-white">×</button>
              </span>
            )}
            {filterPriority && (
              <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                🎯 {filterPriority === 'high' ? 'Tinggi' : filterPriority === 'medium' ? 'Sedang' : 'Rendah'}
                <button onClick={() => setFilterPriority('')} className="hover:text-white">×</button>
              </span>
            )}
            {sortDeadline && (
              <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                📅 Nearest deadline
                <button onClick={() => setSortDeadline(false)} className="hover:text-white">×</button>
              </span>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilter && (
          <div className="mt-3 bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-wrap gap-4">
            {/* Filter by Member */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-400 mb-1.5"> Filter Member</label>
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">All member</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Priority */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-400 mb-1.5">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">All priority</option>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            {/* Sort by Deadline */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-400 mb-1.5">Sort Deadlines</label>
              <button
                onClick={() => setSortDeadline(!sortDeadline)}
                className={`w-full px-3 py-2 rounded-lg text-sm border transition ${
                  sortDeadline
                    ? 'bg-green-600/20 border-green-500/50 text-green-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {sortDeadline ? '✅ The nearest deadline is active' : 'Sort by closest deadline'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const colTasks = getTasksByStatus(col.id)
          return (
            <div key={col.id} className={`bg-gray-900 border-t-2 ${col.color} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">{col.label}</h3>
                <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 text-sm">
                    {activeFilterCount > 0 ? 'No matching tasks' : 'No task'}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority === 'low' ? 'Low' : task.priority === 'medium' ? 'Medium' : 'High'}
                        </span>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => setCommentTask(task)}
                            className="text-gray-500 hover:text-blue-400 bg-gray-700 hover:bg-gray-600 p-1 rounded text-xs transition"
                            title="Comment"
                          >💬</button>
                          <button
                            onClick={() => openEdit(task)}
                            className="text-gray-500 hover:text-yellow-400 bg-gray-700 hover:bg-gray-600 p-1 rounded text-xs transition"
                            title="Edit"
                          >✏️</button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-gray-500 hover:text-red-400 bg-gray-700 hover:bg-gray-600 p-1 rounded text-xs transition"
                            title="Delete"
                          >🗑️</button>
                        </div>
                      </div>

                      <p className="text-white text-sm font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{task.description}</p>
                      )}

                       <div className="flex items-center justify-between mt-3">
                      <span className="text-gray-500 text-xs">
                        {task.assigned_profile?.full_name
                          ? `👤 ${task.assigned_profile.full_name.split(' ')[0]}`
                          : '👤 Unassigned'}
                      </span>
                      <div className="flex items-center gap-2">
                        {task.due_date && (
                          <span className={`text-xs flex items-center gap-1 ${
                            isOverdue(task.due_date) && task.status !== 'done'
                              ? 'text-red-400'
                              : 'text-gray-500'
                          }`}>
                            {isOverdue(task.due_date) && task.status !== 'done' ? '⚠️' : '📅'}
                            {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setCommentTask(task) }}
                          className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition"
                        >
                          <span className="text-xs">💬</span>
                          {task.comment_count > 0 && (
                            <span className="bg-blue-600/30 text-blue-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                              {task.comment_count}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                      <div className="flex gap-2 mt-3">
                        {col.id !== 'todo' && (
                          <button
                            onClick={() => onTaskUpdate(task.id, col.id === 'done' ? 'in_progress' : 'todo')}
                            className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 rounded transition"
                          >← Back</button>
                        )}
                        {col.id !== 'done' && (
                          <button
                            onClick={() => onTaskUpdate(task.id, col.id === 'todo' ? 'in_progress' : 'done')}
                            className="flex-1 text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 py-1 rounded transition"
                          >Forward →</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit Task</h2>
              <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  value={editData.priority}
                  onChange={(e) => setEditData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Assign to</label>
                <select
                  value={editData.assigned_to}
                  onChange={(e) => setEditData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">-- Select member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Deadline</label>
                <input
                  type="date"
                  value={editData.due_date}
                  onChange={(e) => setEditData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition"
                >{loading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentTask && (
        <TaskCommentModal
          task={commentTask}
          members={members}
          onClose={() => setCommentTask(null)}
        />
      )}
    </>
  )
}