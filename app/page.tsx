'use client'

import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()

  const features = [
    {
      icon: '📋',
      title: 'Kanban Board',
      desc: 'Manage team tasks with an interactive board. Filter by member, priority, and deadline.'
    },
    {
      icon: '💬',
      title: 'Real-time Team Chat',
      desc: 'Communicate directly within your project. Supports mentions, replies, edits, and message deletion.'
    },
    {
      icon: '🎰',
      title: 'Member Roulette',
      desc: "Can't decide who handles a task? Spin the roulette to pick fairly and assign roles instantly."
    },
    {
      icon: '👥',
      title: 'Role Management',
      desc: 'Define roles for every team member. Frontend, Backend, QC, or fully custom to your needs.'
    },
    {
      icon: '🔔',
      title: 'Smart Notifications',
      desc: 'Get notified instantly when someone sends a message or mentions you. Never miss an important update.'
    },
    {
      icon: '🔗',
      title: 'Invite System',
      desc: 'Invite members via email or a unique 6-character code. Accept or decline invitations easily.'
    },
  ]

  const steps = [
    { num: '01', title: 'Create Account', desc: 'Sign up in just a few seconds' },
    { num: '02', title: 'Create Project', desc: 'Set up your project and define team roles' },
    { num: '03', title: 'Invite Your Team', desc: 'Invite members via email or invite code' },
    { num: '04', title: 'Start Working', desc: 'Assign tasks, chat, and track progress together' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">TeamSync</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/login')}
              className="text-gray-400 hover:text-white text-sm transition"
            >Sign In</button>
            <button
              onClick={() => router.push('/register')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
            >Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm px-4 py-1.5 rounded-full mb-6">
             Modern team collaboration platform
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Teamwork Made
            <span className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent"> Effortless</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            TeamSync brings together task management, real-time chat, and team coordination in one platform. Perfect for group assignments, campus projects, and professional teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/register')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition text-lg"
            >Get Started →</button>
            <button
              onClick={() => router.push('/login')}
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-3.5 rounded-xl transition text-lg"
            >Already have an account</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-gray-800">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: 'Real-time', label: 'Chat & Updates' },
            { num: '6', label: 'Core Features' },
            { num: '∞', label: 'Projects & Members' },
            { num: '24/7', label: 'Always Available' },
          ].map((stat, i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-white mb-1">{stat.num}</p>
              <p className="text-gray-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-gray-400 text-lg">A complete set of tools for effective team collaboration</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition group"
              >
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-600/20 transition">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">4 simple steps to start collaborating</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-full h-px bg-gray-700 z-0"></div>
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-blue-400 font-bold text-lg">{step.num}</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Collaborate?
            </h2>
            <p className="text-gray-400 mb-8">
              Set up your team and start building together in minutes.
            </p>
            <button
              onClick={() => router.push('/register')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-4 rounded-xl transition text-lg"
            >
              Get Started →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-white font-bold">TeamSync</h1>
            <span className="text-gray-600 text-sm">— Team Collaboration Platform</span>
          </div>
          <p className="text-gray-600 text-sm">Built with Next.js & Supabase</p>
        </div>
      </footer>

    </div>
  )
}