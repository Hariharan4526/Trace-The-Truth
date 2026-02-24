'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CreateTeamPage() {
  const router = useRouter()
  const supabase = createClient()
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) {
      setError('Team name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const joinCode = generateJoinCode()

      // Create team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([
          {
            name: teamName,
            join_code: joinCode,
            leader_id: session.user.id,
            score: 0,
            member_count: 1,
          },
        ])
        .select()
        .single()

      if (teamError) {
        setError(teamError.message)
        return
      }

      // Add leader as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          {
            user_id: session.user.id,
            team_id: teamData.id,
            role: 'leader',
          },
        ])

      if (memberError) {
        setError(memberError.message)
        return
      }

      // Update user's team_id
      const { error: userError } = await supabase
        .from('users')
        .update({ team_id: teamData.id })
        .eq('id', session.user.id)

      if (userError) {
        setError(userError.message)
        return
      }

      router.push(`/team/${teamData.id}`)
    } catch (err) {
      setError('Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-cyan-500/30 bg-black/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-white hover:text-cyan-400">
              ⚔ TRACE THE TRUTH
            </Link>
            <div className="space-x-6 text-sm">
              <Link href="/" className="text-gray-300 hover:text-cyan-400 transition font-mono">
                HOME
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="w-full">
          {/* Header */}
          <div className="mb-12 text-center border-b border-cyan-500/30 pb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-cyan-400 font-mono text-sm">⊕ CREATE SQUAD</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              FORM YOUR INVESTIGATION TEAM
            </h1>
            <p className="text-cyan-400 font-mono text-sm">3 MEMBERS PER SQUAD // SECURE COLLABORATION</p>
          </div>

          {/* Form Card */}
          <div className="border border-cyan-500/50 rounded p-8 bg-black/50 backdrop-blur max-w-md mx-auto">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-6 font-mono text-sm">
                ✗ {error}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-6">
              {/* Team Name Field */}
              <div>
                <label className="block text-cyan-400 mb-2 font-mono text-sm uppercase">
                  Squad Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-black border border-cyan-500/30 rounded text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 font-mono text-sm transition"
                  placeholder="Team name (e.g., Alpha Squad)"
                  disabled={loading}
                />
                <p className="text-gray-500 text-xs mt-2 font-mono">{teamName.length}/50</p>
              </div>

              {/* Info Text */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-4">
                <p className="text-cyan-400 font-mono text-xs">
                  ⓘ You will be designated as the squad LEADER. You can invite up to 2 additional members using the generated access code.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-semibold py-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase text-sm tracking-wider"
              >
                {loading ? '⊳ INITIALIZING...' : '⊕ CREATE SQUAD'}
              </button>

              {/* Back Link */}
              <div className="text-center pt-4 border-t border-cyan-500/30">
                <Link
                  href="/"
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-sm transition underline"
                >
                  ← Back Home
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
