'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TaskCommentModal({ task, members, onClose }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      await fetchComments()
      setLoading(false)
    }
    init()
  }, [])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('task_comments')
      .select(`*, profiles(full_name, avatar_url)`)
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSending(true)

    const { data } = await supabase
      .from('task_comments')
      .insert([{
        task_id: task.id,
        user_id: user.id,
        content: newComment.trim(),
      }])
      .select(`*, profiles(full_name, avatar_url)`)
      .single()

    if (data) setComments(prev => [...prev, data])
    setNewComment('')
    setSending(false)
  }

  const handleDelete = async (commentId, commentUserId) => {
    if (commentUserId !== user.id) return
    await supabase.from('task_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const formatTime = (ts) => new Date(ts).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })

  const PRIORITY_COLORS = {
    low: 'bg-gray-500/20 text-gray-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority === 'low' ? 'Low' : task.priority === 'medium' ? 'Medium' : 'High'}
                </span>
                {task.due_date && (
                  <span className="text-gray-500 text-xs">
                    📅 {new Date(task.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              <h2 className="text-white font-bold text-lg">{task.title}</h2>
              {task.description && (
                <p className="text-gray-400 text-sm mt-1">{task.description}</p>
              )}
              {task.assigned_profile?.full_name && (
                <p className="text-gray-500 text-xs mt-1">
                  👤 {task.assigned_profile.full_name}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0"
            >×</button>
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 chat-scroll">
          {loading ? (
            <p className="text-gray-500 text-sm text-center">Loading comments...</p>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">💬</p>
              <p className="text-gray-500 text-sm">No comments yet</p>
              <p className="text-gray-600 text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isMe = comment.user_id === user?.id
              return (
                <div key={comment.id} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {comment.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-semibold">
                        {comment.profiles?.full_name || 'Unknown'}
                      </span>
                      <span className="text-gray-600 text-xs">{formatTime(comment.created_at)}</span>
                      {isMe && (
                        <button
                          onClick={() => handleDelete(comment.id, comment.user_id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition ml-auto"
                        >🗑️</button>
                      )}
                    </div>
                    <div className="bg-gray-800 rounded-xl rounded-tl-sm px-4 py-2.5 text-gray-200 text-sm">
                      {comment.content}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-800 flex-shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || sending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition"
            >➤</button>
          </form>
        </div>
      </div>
    </div>
  )
}