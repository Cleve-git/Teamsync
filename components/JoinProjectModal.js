'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function JoinProjectModal({ user, onClose, onSuccess }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleJoin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const upperCode = code.trim().toUpperCase()

    const { data: project, error: findError } = await supabase
      .from('projects')
      .select('*')
      .eq('invite_code', upperCode)
      .single()

    if (findError || !project) {
      setError('Code not found! Please double check the code you entered.')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      setError('You are already a member of this project!')
      setLoading(false)
      return
    }

    const { error: joinError } = await supabase
      .from('project_members')
      .insert([{
        project_id: project.id,
        user_id: user.id,
        role: 'member',
      }])

    if (joinError) {
      setError('Failed to join the project!')
      setLoading(false)
      return
    }

    await supabase.from('join_notifications').insert([{
      project_id: project.id,
      user_id: user.id,
      status: 'joined',
      is_read: false,
    }])

    setLoading(false)
    onSuccess(project)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white"> Join Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Invitation Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder=""
              maxLength={6}
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500 transition uppercase"
            />
            <p className="text-gray-500 text-xs mt-1 text-center">
              Enter the 6 character code provided by the project admin.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition"
            >Cancel</button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
            >{loading ? 'Joining...' : 'Join Project'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}