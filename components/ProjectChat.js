'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProjectChat({ projectId, user, members, isOpen, onClose, onUnreadChange, onMentionChange }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [hoveredMessage, setHoveredMessage] = useState(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [cursorPos, setCursorPos] = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const markAllRead = async () => {
    if (typeof onUnreadChange === 'function') onUnreadChange(0)
    if (typeof onMentionChange === 'function') onMentionChange(0)

    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .eq('is_read', false)

    setMessages(prev => {
      const toUpdate = prev.filter(
        m => m.user_id !== user.id && !(m.read_by || []).includes(user.id)
      )
      toUpdate.forEach(async (msg) => {
        await supabase.from('messages')
          .update({ read_by: [...(msg.read_by || []), user.id] })
          .eq('id', msg.id)
      })
      return prev.map(m => ({
        ...m,
        read_by: m.user_id !== user.id ? [...(m.read_by || []), user.id] : m.read_by
      }))
    })
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(`*, profiles(full_name), reply_message:reply_to(content, profiles(full_name))`)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (data) {
      setMessages(data)

      const unread = data.filter(
        m => m.user_id !== user.id && !(m.read_by || []).includes(user.id)
      ).length
      if (typeof onUnreadChange === 'function') onUnreadChange(unread)

      const { data: notifs } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('type', 'mention')
        .eq('is_read', false)
      if (typeof onMentionChange === 'function') {
        onMentionChange(notifs?.length || 0)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`chat-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `project_id=eq.${projectId}`,
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles').select('full_name').eq('id', payload.new.user_id).single()
        let replyMsg = null
        if (payload.new.reply_to) {
          const { data } = await supabase
            .from('messages').select('content, profiles(full_name)')
            .eq('id', payload.new.reply_to).single()
          replyMsg = data
        }
        const newMsg = { ...payload.new, profiles: profile, reply_message: replyMsg }
        setMessages(prev => [...prev, newMsg])

        if (payload.new.user_id !== user.id) {
          const myFirstName = members?.find(m => m.id === user.id)?.full_name?.split(' ')[0] || ''
          const isMentioned = myFirstName && payload.new.content.includes(`@${myFirstName}`)

          if (isMentioned) {
            await supabase.from('notifications').insert([{
              user_id: user.id,
              project_id: projectId,
              message_id: payload.new.id,
              type: 'mention',
              is_read: false,
            }])
            if (!isOpen && typeof onMentionChange === 'function') {
              onMentionChange(prev => (typeof prev === 'number' ? prev : 0) + 1)
            }
          } else {
            if (!isOpen && typeof onUnreadChange === 'function') {
              onUnreadChange(prev => (typeof prev === 'number' ? prev : 0) + 1)
            }
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      markAllRead()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages])

  const handleInputChange = (e) => {
    const val = e.target.value
    setNewMessage(val)
    const pos = e.target.selectionStart
    setCursorPos(pos)
    const textBeforeCursor = val.slice(0, pos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    if (mentionMatch) {
      setMentionSearch(mentionMatch[1].toLowerCase())
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (member) => {
    const textBeforeCursor = newMessage.slice(0, cursorPos)
    const textAfterCursor = newMessage.slice(cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    if (mentionMatch) {
      const before = textBeforeCursor.slice(0, mentionMatch.index)
      const firstName = member.full_name.split(' ')[0]
      setNewMessage(`${before}@${firstName} ${textAfterCursor}`)
    }
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const filteredMentions = (members || []).filter(m =>
    m?.full_name?.toLowerCase().includes(mentionSearch) && m.id !== user.id
  )

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    const content = newMessage.trim()
    setNewMessage('')
    setReplyTo(null)
    setShowMentions(false)
    await supabase.from('messages').insert([{
      project_id: projectId,
      user_id: user.id,
      content,
      reply_to: replyTo?.id || null,
      read_by: [user.id],
    }])
  }

  const handleDelete = async (messageId) => {
    await supabase.from('messages').delete().eq('id', messageId)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editContent.trim()) return
    await supabase.from('messages')
      .update({ content: editContent, edited: true, updated_at: new Date().toISOString() })
      .eq('id', editingMessage.id)
    setEditingMessage(null)
    setEditContent('')
  }

  const isMentionedMe = (content) => {
    const myFirstName = members?.find(m => m.id === user.id)?.full_name?.split(' ')[0] || ''
    return myFirstName && content.includes(`@${myFirstName}`)
  }

  const renderContent = (content) => {
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-blue-300 font-semibold bg-blue-500/20 px-0.5 rounded">{part}</span>
      ) : part
    )
  }

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (ts) => new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {})

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="text-white font-semibold">Team Chat</h3>
          <span className="text-gray-500 text-xs">{messages.length} Messages</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition text-xl leading-none">×</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0 chat-scroll">
        {loading ? (
          <div className="text-center text-gray-500 text-sm mt-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-8">
            <p className="text-2xl mb-2">👋</p>
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-800"></div>
                <span className="text-gray-600 text-xs">{date}</span>
                <div className="flex-1 h-px bg-gray-800"></div>
              </div>
              {msgs.map((message) => {
                const isMe = message.user_id === user.id
                const mentioned = !isMe && isMentionedMe(message.content)
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 mb-2 group ${isMe ? 'flex-row-reverse' : ''} ${
                      mentioned ? 'bg-green-500/5 border border-green-500/20 rounded-lg px-2 py-1' : ''
                    }`}
                    onMouseEnter={() => setHoveredMessage(message.id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
                      {message.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>

                    <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <span className="text-gray-400 text-xs mb-1">
                          {message.profiles?.full_name || 'Unknown'}
                          {mentioned && <span className="text-green-400 ml-1 text-xs">• mention you</span>}
                        </span>
                      )}

                      {message.reply_message && (
                        <div className="text-xs px-3 py-1.5 rounded-t-lg border-l-2 border-blue-400 bg-gray-700/50 text-gray-400 max-w-full mb-0.5">
                          <span className="font-semibold text-blue-400">
                            {message.reply_message.profiles?.full_name?.split(' ')[0]}
                          </span>
                          <p className="truncate">{message.reply_message.content}</p>
                        </div>
                      )}

                      <div className={`px-3 py-2 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : mentioned
                          ? 'bg-green-900/40 border border-green-500/30 text-gray-200 rounded-tl-sm'
                          : 'bg-gray-800 text-gray-200 rounded-tl-sm'
                      }`}>
                        {renderContent(message.content)}
                        {message.edited && <span className="text-xs opacity-60 ml-1">(edited)</span>}
                      </div>

                      <span className="text-gray-600 text-xs mt-0.5">
                        {formatTime(message.created_at)}
                      </span>
                    </div>

                    {hoveredMessage === message.id && (
                      <div className={`flex items-center gap-1 self-center ${isMe ? 'flex-row-reverse mr-1' : 'ml-1'}`}>
                        <button
                          onClick={() => setReplyTo(message)}
                          className="text-gray-500 hover:text-blue-400 bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition text-xs"
                        >↩️</button>
                        {isMe && (
                          <button
                            onClick={() => { setEditingMessage(message); setEditContent(message.content) }}
                            className="text-gray-500 hover:text-yellow-400 bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition text-xs"
                          >✏️</button>
                        )}
                        {isMe && (
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="text-gray-500 hover:text-red-400 bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition text-xs"
                          >🗑️</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
            <div>
              <p className="text-blue-400 text-xs font-semibold">{replyTo.profiles?.full_name?.split(' ')[0]}</p>
              <p className="text-gray-400 text-xs truncate max-w-[180px]">{replyTo.content}</p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white text-lg">×</button>
        </div>
      )}

      {/* Edit bar */}
      {editingMessage && (
        <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/30 flex items-center justify-between flex-shrink-0">
          <span className="text-yellow-400 text-xs">✏️ Message edit mode</span>
          <button onClick={() => { setEditingMessage(null); setEditContent('') }} className="text-gray-500 hover:text-white text-lg">×</button>
        </div>
      )}

      {/* Mention dropdown */}
      {showMentions && filteredMentions.length > 0 && (
        <div className="mx-4 mb-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex-shrink-0">
          {filteredMentions.map(m => (
            <button
              key={m.id}
              onClick={() => insertMention(m)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition text-left"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {m.full_name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-white text-sm">{m.full_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-800 flex-shrink-0">
        {editingMessage ? (
          <form onSubmit={handleEdit} className="flex gap-2">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 bg-gray-800 border border-yellow-500/50 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 transition"
              autoFocus
            />
            <button type="submit" className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-xl transition text-sm font-semibold">
              Save
            </button>
          </form>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder={replyTo ? `Replying...` : 'Type @ to mention...'}
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded-xl transition"
            >➤</button>
          </form>
        )}
      </div>
    </div>
  )
}