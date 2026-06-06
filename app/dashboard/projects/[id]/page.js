'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import KanbanBoard from '@/components/KanbanBoard'
import CreateTaskModal from '@/components/CreateTaskModal'
import InviteMemberModal from '@/components/InviteMemberModal'
import RolesBoard from '@/components/RolesBoard'
import ProjectChat from '@/components/ProjectChat'

export default function ProjectPage() {
  const [user, setUser] = useState(null)
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [roles, setRoles] = useState([])
  const [roleMembers, setRoleMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mentionCount, setMentionCount] = useState(0)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const fetchProject = async () => {
    const { data } = await supabase
      .from('projects').select('*').eq('id', params.id).single()
    if (data) setProject(data)
  }

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select(`*, assigned_profile:profiles!tasks_assigned_to_fkey(full_name), task_comments(id)`)
      .eq('project_id', params.id)
      .order('created_at', { ascending: true })
    if (data) {
      setTasks(data.map(t => ({
        ...t,
        comment_count: t.task_comments?.length || 0
      })))
    }
  }

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('project_members')
      .select(`role, profiles(id, full_name)`)
      .eq('project_id', params.id)
    if (data) setMembers(data.map(m => ({ ...m.profiles, role: m.role })))
  }

  const fetchRoles = async () => {
    const { data } = await supabase
      .from('project_roles').select('*').eq('project_id', params.id)
    if (data) setRoles(data)
    const { data: rm } = await supabase
      .from('role_members').select('*').eq('project_id', params.id)
    if (rm) setRoleMembers(rm)
  }

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchProject()
      await fetchTasks()
      await fetchMembers()
      await fetchRoles()
      setLoading(false)
    }
    getData()
  }, [])

  const handleTaskCreated = (newTask) => {
    setTasks(prev => [...prev, { ...newTask, comment_count: 0 }])
  }

  const handleTaskUpdate = async (taskId, newStatus) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  const handleTaskDelete = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const handleTaskEditSave = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id
      ? { ...updatedTask, comment_count: t.comment_count }
      : t
    ))
  }

  const handleMemberAdded = (newMember) => {
    setMembers(prev => [...prev, newMember])
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white transition"
            >← Dashboard</button>
            <span className="text-gray-600">/</span>
            <h1 className="text-white font-semibold">{project?.name}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/dashboard/projects/${params.id}/roulette`)}
              className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 text-sm px-4 py-2 rounded-lg transition"
            >🎰 Roulette</button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition"
            > Add Member</button>
            <button
              onClick={() => setShowTaskModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
            >+ Add Task</button>
          </div>
        </div>
      </nav>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Chat Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{ right: chatOpen ? '25%' : '0' }}
          className="fixed top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white rounded-l-xl w-8 h-16 flex items-center justify-center shadow-lg z-40 border border-r-0 border-gray-700 transition-all duration-300"
        >
          <div className="relative flex flex-col items-center gap-1">
            <span className="text-white font-bold text-lg leading-none">
              {chatOpen ? '›' : '‹'}
            </span>
            {!chatOpen && (unreadCount > 0 || mentionCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            )}
          </div>
        </button>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Project Info */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">{project?.name}</h2>
              <p className="text-gray-400 mt-1">{project?.description || 'No description'}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Tasks</p>
                <p className="text-2xl font-bold text-white mt-1">{tasks.length}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {tasks.filter(t => t.status === 'done').length}
                </p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Members</p>
                <p className="text-2xl font-bold text-white mt-1">{members.length}</p>
              </div>
            </div>

            {/* Roles Board */}
            <RolesBoard
              projectId={params.id}
              roles={roles}
              members={members}
              roleMembersData={roleMembers}
              onUpdate={() => fetchRoles()}
            />

            {/* Kanban */}
            <KanbanBoard
              tasks={tasks}
              members={members}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onTaskEdit={handleTaskEditSave}
            />
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`fixed top-0 right-0 h-full bg-gray-900 border-l border-gray-800 shadow-2xl transition-all duration-300 z-30 flex flex-col ${
          chatOpen ? 'w-[25%]' : 'w-0 overflow-hidden'
        }`}>
          {user && (
            <div className={chatOpen ? 'block h-full' : 'hidden'}>
              <ProjectChat
                projectId={params.id}
                user={user}
                members={members}
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                onUnreadChange={setUnreadCount}
                onMentionChange={setMentionCount}
              />
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      {showTaskModal && (
        <CreateTaskModal
          projectId={params.id}
          members={members}
          onClose={() => setShowTaskModal(false)}
          onSuccess={handleTaskCreated}
        />
      )}
      {showInviteModal && (
        <InviteMemberModal
          projectId={params.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleMemberAdded}
        />
      )}
    </div>
  )
}