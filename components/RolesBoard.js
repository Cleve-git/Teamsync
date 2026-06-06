'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RolesBoard({ projectId, roles, members, roleMembersData, onUpdate }) {
  const [showAddRole, setShowAddRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const addRole = async () => {
    if (!newRoleName.trim()) return
    setLoading(true)
    const { data } = await supabase
      .from('project_roles')
      .insert([{ project_id: projectId, name: newRoleName.trim() }])
      .select()
      .single()
    if (data) onUpdate()
    setNewRoleName('')
    setShowAddRole(false)
    setLoading(false)
  }

  const assignMember = async (roleId, userId) => {
    const already = roleMembersData.find(
      rm => rm.role_id === roleId && rm.user_id === userId
    )
    if (already) return

    await supabase.from('role_members').insert([{
      role_id: roleId,
      user_id: userId,
      project_id: projectId,
    }])
    onUpdate()
  }

  const removeMember = async (roleMemberId) => {
    await supabase.from('role_members').delete().eq('id', roleMemberId)
    onUpdate()
  }

  const deleteRole = async (roleId) => {
    await supabase.from('project_roles').delete().eq('id', roleId)
    onUpdate()
  }

  const getMembersForRole = (roleId) => {
    return roleMembersData
      .filter(rm => rm.role_id === roleId)
      .map(rm => ({
        ...rm,
        profile: members.find(m => m.id === rm.user_id),
      }))
  }

  const getUnassignedMembers = (roleId) => {
    const assigned = roleMembersData
      .filter(rm => rm.role_id === roleId)
      .map(rm => rm.user_id)
    return members.filter(m => !assigned.includes(m.id))
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Team Roles</h3>
        <button
          onClick={() => setShowAddRole(!showAddRole)}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition"
        >
          + Add Role
        </button>
      </div>

      {/* Add Role Input */}
      {showAddRole && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRole()}
            placeholder="New role name..."
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
            autoFocus
          />
          <button
            onClick={addRole}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            Save
          </button>
          <button
            onClick={() => setShowAddRole(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition"
          >
            Cancel
          </button>
        </div>
      )}

      {roles.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-4">
          There are no roles yet. 
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {roles.map((role) => {
            const roleMembers = getMembersForRole(role.id)
            const unassigned = getUnassignedMembers(role.id)
            return (
              <div key={role.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                {/* Role Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-semibold">{role.name}</span>
                  <button
                    onClick={() => deleteRole(role.id)}
                    className="text-gray-600 hover:text-red-400 text-xs transition"
                    title="Delete role"
                  >🗑️</button>
                </div>

                {/* Assigned Members */}
                <div className="space-y-1 mb-2 min-h-[32px]">
                  {roleMembers.length === 0 ? (
                    <p className="text-gray-600 text-xs">There are no members yet</p>
                  ) : (
                    roleMembers.map((rm) => (
                      <div key={rm.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {rm.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-gray-300 text-xs">{rm.profile?.full_name?.split(' ')[0]}</span>
                        </div>
                        <button
                          onClick={() => removeMember(rm.id)}
                          className="text-gray-600 hover:text-red-400 text-xs transition"
                        >×</button>
                      </div>
                    ))
                  )}
                </div>

                {/* Assign dropdown */}
                {unassigned.length > 0 && (
                  <select
                    onChange={(e) => { if (e.target.value) assignMember(role.id, e.target.value) }}
                    value=""
                    className="w-full bg-gray-700 border border-gray-600 text-gray-400 rounded-lg px-2 py-1 text-xs focus:outline-none transition"
                  >
                    <option value="">+ Assign Members</option>
                    {unassigned.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}