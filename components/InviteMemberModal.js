'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InviteMemberModal({ projectId, onClose }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  const handleInvite = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data: targetUser } = await supabase
      .rpc('get_user_id_by_email', { email_input: email })

    if (!targetUser) {
      setError('User with this email not found!')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', targetUser)
      .single()

    if (!profile) {
      setError('User not found!')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', profile.id)
      .single()

    if (existing) {
      setError('This user is already a project member!')
      setLoading(false)
      return
    }

    const { data: existingInvite } = await supabase
      .from('invite_requests')
      .select('id')
      .eq('project_id', projectId)
      .eq('invited_user_id', profile.id)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      setError('Invitation has been sent to this user!')
      setLoading(false)
      return
    }

    const { error: inviteError } = await supabase
      .from('invite_requests')
      .insert([{
        project_id: projectId,
        invited_user_id: profile.id,
        invited_by: user.id,
        status: 'pending',
        is_read: false,
      }])

    if (inviteError) {
      setError('Failed to send invitation!')
      setLoading(false)
      return
    }

    setSuccess(`Invitation successfully sent to ${profile.full_name}!`)
    setLoading(false)
    setEmail('')
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Invite Members</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleInvite} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">✅ {success}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Member Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter member email"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
            />
            <p className="text-gray-500 text-xs mt-1">
              Members will receive an invitation notification
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition"
            >Close</button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition"
            >{loading ? 'Saving...' : 'Send'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}