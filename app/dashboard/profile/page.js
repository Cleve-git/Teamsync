'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (prof) {
        setProfile(prof)
        setFullName(prof.full_name || '')
        setBio(prof.bio || '')
        setAvatarUrl(prof.avatar_url || '')
      }
      setLoading(false)
    }
    getData()
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    let newAvatarUrl = avatarUrl

    // Upload avatar if there is a new file
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const fileName = `${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true })

      if (uploadError) {
        setError('Failed to upload profile photo!')
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      newAvatarUrl = urlData.publicUrl
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        bio,
        avatar_url: newAvatarUrl,
      })
      .eq('id', user.id)

    if (updateError) {
      setError('Failed to save profile!')
      setSaving(false)
      return
    }

    setAvatarUrl(newAvatarUrl)
    setSuccess('Profile saved successfully!')
    setSaving(false)
  }

  const getInitial = () => fullName?.charAt(0).toUpperCase() || '?'

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white transition"
          >← Dashboard</button>
          <span className="text-gray-600">/</span>
          <h1 className="text-white font-semibold">Edit Profile</h1>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-t-2xl h-28 border border-gray-800 border-b-0"></div>

        {/* Profile Card */}
        <div className="bg-gray-900 border border-gray-800 border-t-0 rounded-b-2xl px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-gray-900 overflow-hidden bg-blue-600 flex items-center justify-center">
                {(avatarPreview || avatarUrl) ? (
                  <img
                    src={avatarPreview || avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-2xl font-bold">{getInitial()}</span>
                )}
              </div>
              {/* Upload button */}
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer transition text-xs">
                ✏️
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">{user?.email}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">✅ {success}</div>
            )}

            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-white font-semibold mb-4">Profile Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us a little about yourself..."
                    rows={3}
                    maxLength={150}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition resize-none"
                  />
                  <p className="text-gray-600 text-xs mt-1 text-right">{bio.length}/150</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                  <input
                    type="text"
                    value={user?.email}
                    disabled
                    className="w-full bg-gray-800/50 border border-gray-700 text-gray-500 rounded-lg px-4 py-3 cursor-not-allowed"
                  />
                  <p className="text-gray-600 text-xs mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}