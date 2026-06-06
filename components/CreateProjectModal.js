'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CreateProjectModal({ onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [roles, setRoles] = useState(['Frontend', 'Backend'])
  const [newRole, setNewRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const addRole = () => {
    if (!newRole.trim()) return
    if (roles.includes(newRole.trim())) return
    setRoles(prev => [...prev, newRole.trim()])
    setNewRole('')
  }

  const removeRole = (index) => {
    setRoles(prev => prev.filter((_, i) => i !== index))
  }

    const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const inviteCode = generateInviteCode()

    // Create a project
    const { data, error } = await supabase
      .from('projects')
      .insert([{ name, description, owner_id: user.id, invite_code: inviteCode }])
      .select()
      .single()

    if (error) {
      setError('Failed to create a project!')
      setLoading(false)
      return
    }

    await supabase.from('project_members').insert([{
      project_id: data.id,
      user_id: user.id,
      role: 'admin',
    }])

    if (roles.length > 0) {
      await supabase.from('project_roles').insert(
        roles.map(r => ({ project_id: data.id, name: r }))
      )
    }

    setLoading(false)
    onSuccess(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create a New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
             Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What's your next big idea?"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="describe your project.."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {roles.map((role, i) => (
                <span key={i} className="flex items-center gap-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm px-3 py-1 rounded-full">
                  {role}
                  <button
                    type="button"
                    onClick={() => removeRole(i)}
                    className="text-blue-400 hover:text-red-400 ml-1 leading-none"
                  >×</button>
                </span>
              ))}
              {roles.length === 0 && (
                <p className="text-gray-600 text-sm">No role yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
                placeholder="Add new role"
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={addRole}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? 'Saving...' : 'Create a Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}