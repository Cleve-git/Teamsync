'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#84cc16','#f97316','#a855f7']

export default function RoulettePage() {
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [roles, setRoles] = useState([])
  const [purpose, setPurpose] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [angle, setAngle] = useState(0)
  const [result, setResult] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: proj } = await supabase
      .from('projects').select('*').eq('id', params.id).single()
    setProject(proj)

    const { data: mem } = await supabase
      .from('project_members')
      .select('role, profiles(id, full_name)')
      .eq('project_id', params.id)
    if (mem) setMembers(mem.map(m => ({ ...m.profiles, role: m.role })))

    const { data: r } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', params.id)
    if (r) setRoles(r)

    setLoading(false)
  }

  const spin = () => {
    if (spinning || members.length === 0) return
    setSpinning(true)
    setResult(null)
    setConfirmed(false)

    const spins = 5 + Math.random() * 5
    const extra = Math.random() * 360
    const total = angle + spins * 360 + extra
    setAngle(total)

    setTimeout(() => {
      const normalized = total % 360
      const segSize = 360 / members.length
      const index = Math.floor((360 - (normalized % 360)) / segSize) % members.length
      setResult(members[index])
      setSpinning(false)
    }, 3500)
  }

  const handleConfirm = async () => {
    if (!result || !selectedRole) return

    // Assign ke role
    const role = roles.find(r => r.id === selectedRole)
    const already = await supabase
      .from('role_members')
      .select('id')
      .eq('role_id', selectedRole)
      .eq('user_id', result.id)
      .single()

    if (!already.data) {
      await supabase.from('role_members').insert([{
        role_id: selectedRole,
        user_id: result.id,
        project_id: params.id,
      }])
    }

    // Kirim ke chat
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('messages').insert([{
      project_id: params.id,
      user_id: user.id,
      content: `🎰 Roulette "${purpose || 'Pemilihan Anggota'}" → ${result.full_name} terpilih sebagai ${role?.name}!`,
    }])

    setConfirmed(true)
  }

  const reset = () => {
    setResult(null)
    setConfirmed(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  const size = 320
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 8

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/projects/${params.id}`)}
            className="text-gray-400 hover:text-white transition"
          >
            ← Back to Project
          </button>
          <span className="text-gray-600">/</span>
          <h1 className="text-white font-semibold"> Roulette member</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Left: Settings */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">Spin Settings</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Spin Objective</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="What is this roulette for?"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Assign to the role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="">-- Select the Role --</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Members list */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3"> Members({members.length})</h3>
              <div className="space-y-2">
                {members.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-gray-300 text-sm">{m.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Wheel */}
          <div className="flex flex-col items-center gap-4">
            {purpose && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2 w-full text-center">
                <p className="text-blue-300 text-sm">🎯 {purpose}</p>
              </div>
            )}

            {/* Wheel */}
            <div className="relative">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-2xl">▼</div>
              <svg
                width={size} height={size}
                style={{
                  transform: `rotate(${angle}deg)`,
                  transition: spinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                  filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.3))'
                }}
              >
                {members.length === 0 ? (
                  <circle cx={cx} cy={cy} r={r} fill="#374151" />
                ) : members.map((member, i) => {
                  const segAngle = 360 / members.length
                  const startDeg = i * segAngle - 90
                  const endDeg = startDeg + segAngle
                  const startRad = (startDeg * Math.PI) / 180
                  const endRad = (endDeg * Math.PI) / 180
                  const x1 = cx + r * Math.cos(startRad)
                  const y1 = cy + r * Math.sin(startRad)
                  const x2 = cx + r * Math.cos(endRad)
                  const y2 = cy + r * Math.sin(endRad)
                  const largeArc = segAngle > 180 ? 1 : 0
                  const midRad = ((startDeg + segAngle / 2) * Math.PI) / 180
                  const tx = cx + (r * 0.65) * Math.cos(midRad)
                  const ty = cy + (r * 0.65) * Math.sin(midRad)
                  return (
                    <g key={member.id}>
                      <path
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={COLORS[i % COLORS.length]}
                        stroke="#111827"
                        strokeWidth="2"
                      />
                      <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize="11" fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        {member.full_name?.split(' ')[0]}
                      </text>
                    </g>
                  )
                })}
                <circle cx={cx} cy={cy} r={18} fill="#111827" stroke="#374151" strokeWidth="3" />
              </svg>
            </div>

            {/* Result */}
            {result && !confirmed && (
              <div className="w-full bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-green-400 text-lg font-bold">🎉 {result.full_name}</p>
                {selectedRole && (
                  <p className="text-gray-400 text-sm mt-1">
                    will be assigned as <span className="text-white font-semibold">
                      {roles.find(r => r.id === selectedRole)?.name}
                    </span>
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={reset}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition"
                  >
                    🔄 Respin
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedRole}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-semibold transition"
                  >
                    ✅ Confirm
                  </button>
                </div>
                {!selectedRole && (
                  <p className="text-yellow-500 text-xs mt-2">⚠️ Select the role first before confirming</p>
                )}
              </div>
            )}

            {confirmed && (
              <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                <p className="text-blue-300 font-semibold">✅ Successfully assigned!</p>
                <p className="text-gray-400 text-sm mt-1">Results have been sent to Team Chat</p>
                <button
                  onClick={reset}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg text-sm transition"
                >
                  🎰 Spin Again
                </button>
              </div>
            )}

            {/* Spin button */}
            {!result && (
              <button
                onClick={spin}
                disabled={spinning || members.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition text-lg"
              >
                {spinning ? '⏳ Spinning...' : '🎰 SPIN!'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}