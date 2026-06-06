'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import CreateProjectModal from '@/components/CreateProjectModal'
import JoinProjectModal from '@/components/JoinProjectModal'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadNotif, setUnreadNotif] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchProjects(user.id)
      await fetchNotifications(user.id)
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (prof) setProfile(prof)
      setLoading(false)
    }
    getData()

    // Realtime notif
    const channel = supabase
      .channel('invite-notif')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'invite_requests',
      }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (payload.new.invited_user_id === user?.id) {
          fetchNotifications(user.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchProjects = async (userId) => {
    const { data } = await supabase
      .from('project_members')
      .select(`project_id, role, projects(id, name, description, created_at, invite_code)`)
      .eq('user_id', userId)
    if (data) {
      setProjects(data.map(item => ({ ...item.projects, role: item.role })))
    }
  }

  const fetchNotifications = async (userId) => {
    // Invite requests for this user (as the invitee)
    const { data: invites } = await supabase
      .from('invite_requests')
      .select(`
        *,
        invited_by_profile:profiles!invite_requests_invited_by_fkey(full_name),
        projects(name)
      `)
      .eq('invited_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Join notifications for admins
    const { data: adminProjects } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .eq('role', 'admin')

    let joinNotifs = []
    if (adminProjects && adminProjects.length > 0) {
      const projectIds = adminProjects.map(p => p.project_id)
      const { data } = await supabase
        .from('join_notifications')
        .select(`*, profiles(full_name), projects(name)`)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) joinNotifs = data
    }

    const allNotifs = [
      ...(invites || []).map(n => ({ ...n, notif_type: 'invite' })),
      ...joinNotifs.map(n => ({ ...n, notif_type: 'join' })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setNotifications(allNotifs)
    setUnreadNotif(allNotifs.filter(n => !n.is_read).length)
  }

  const handleAcceptInvite = async (notif) => {

    await supabase.from('project_members').insert([{
      project_id: notif.project_id,
      user_id: user.id,
      role: 'member',
    }])

    await supabase.from('invite_requests')
      .update({ status: 'accepted', is_read: true })
      .eq('id', notif.id)

    await fetchProjects(user.id)
    await fetchNotifications(user.id)
  }

  const handleDeclineInvite = async (notif) => {
    await supabase.from('invite_requests')
      .update({ status: 'declined', is_read: true })
      .eq('id', notif.id)
    await fetchNotifications(user.id)
  }

  const markNotifsRead = async () => {
    setUnreadNotif(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await supabase.from('invite_requests')
      .update({ is_read: true })
      .eq('invited_user_id', user.id)
      .eq('is_read', false)
    await supabase.from('join_notifications')
      .update({ is_read: true })
      .eq('is_read', false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleProjectCreated = (newProject) => {
    setProjects(prev => [...prev, { ...newProject, role: 'admin' }])
  }

  const handleProjectJoined = (newProject) => {
    setProjects(prev => [...prev, { ...newProject, role: 'member' }])
  }

  const formatTime = (ts) => new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white text-lg">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">TeamSync</h1>
          <div className="flex items-center gap-3">
            {/* Notif Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifPanel(!showNotifPanel)
                  if (!showNotifPanel) markNotifsRead()
                }}
                className="relative bg-gray-800 hover:bg-gray-700 text-white w-9 h-9 rounded-lg flex items-center justify-center transition"
              >
                ✉️
                {unreadNotif > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadNotif > 9 ? '9+' : unreadNotif}
                  </span>
                )}
              </button>

              {/* Notif Panel */}
              {showNotifPanel && (
                <div className="absolute right-0 top-11 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-white font-semibold text-sm">Notifications</h3>
                    <button onClick={() => setShowNotifPanel(false)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-2xl mb-2">Mail</p>
                        <p className="text-gray-500 text-sm">No notification yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 border-b border-gray-800 transition ${
                            !notif.is_read ? 'bg-blue-500/5' : ''
                          }`}
                        >
                          {/* Invite request */}
                          {notif.notif_type === 'invite' && notif.status === 'pending' && (
                            <div>
                              <div className="flex items-start gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {notif.invited_by_profile?.full_name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="flex-1">
                                  <p className="text-gray-300 text-sm">
                                    <span className="text-white font-semibold">{notif.invited_by_profile?.full_name}</span>
                                    {' '}invite you to{' '}
                                    <span className="text-blue-400 font-semibold">{notif.projects?.name}</span>
                                  </p>
                                  <p className="text-gray-600 text-xs mt-0.5">{formatTime(notif.created_at)}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-11">
                                <button
                                  onClick={() => handleAcceptInvite(notif)}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 rounded-lg transition font-semibold"
                                >Accept</button>
                                <button
                                  onClick={() => handleDeclineInvite(notif)}
                                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 rounded-lg transition"
                                >Reject</button>
                              </div>
                            </div>
                          )}

                          {/* Invite accepted/declined */}
                          {notif.notif_type === 'invite' && notif.status !== 'pending' && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {notif.invited_by_profile?.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">
                                  Invitation to <span className="text-white font-semibold">{notif.projects?.name}</span>
                                  {' '}{notif.status === 'accepted' ? 'Accepted' : 'Rejected'}
                                </p>
                                <p className="text-gray-600 text-xs mt-0.5">{formatTime(notif.created_at)}</p>
                              </div>
                            </div>
                          )}

                          {/* Join notification */}
                          {notif.notif_type === 'join' && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {notif.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-gray-300 text-sm">
                                  <span className="text-white font-semibold">{notif.profiles?.full_name}</span>
                                  {' '}join in{' '}
                                  <span className="text-blue-400 font-semibold">{notif.projects?.name}</span>
                                </p>
                                <p className="text-gray-600 text-xs mt-0.5">{formatTime(notif.created_at)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="flex items-center gap-2 hover:opacity-80 transition"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 overflow-hidden flex items-center justify-center text-white text-xs font-bold">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile?.full_name?.charAt(0).toUpperCase() || '?'}</span>
                )}
              </div>
              <span className="text-gray-400 text-sm">{profile?.full_name || user?.email}</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition"
            >Sign out</button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            Welcome, {profile?.full_name?.split(' ')[0] || 'User'}! 👋
          </h2>
          <p className="text-gray-400 mt-1">Manage your projects and teams here.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">Total Project</p>
            <p className="text-3xl font-bold text-white mt-1">{projects.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">Active Task</p>
            <p className="text-3xl font-bold text-white mt-1">0</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">Team Member</p>
            <p className="text-3xl font-bold text-white mt-1">0</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Your Project</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinModal(true)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition"
              >Join Project</button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
              >+ Create a Project</button>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-400">There are no projects yet</p>
              <p className="text-gray-600 text-sm mt-1">Create a new project or join with code</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-xl">📋</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      project.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {project.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-semibold group-hover:text-blue-400 transition">{project.name}</h4>
                    {project.invite_code && project.role === 'admin' && (
                      <span className="text-xs font-mono text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">
                        {project.invite_code}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{project.description || 'No description'}</p>
                  <p className="text-gray-600 text-xs mt-3">
                    {new Date(project.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showNotifPanel && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)}></div>
      )}

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onSuccess={handleProjectCreated}
        />
      )}

      {showJoinModal && (
        <JoinProjectModal
          user={user}
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleProjectJoined}
        />
      )}
    </div>
  )
}