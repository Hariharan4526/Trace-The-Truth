'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Team } from '@/lib/types'

export default function JoinTeamPage() {
  const router = useRouter()
  const supabase = createClient()
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) {
      setError('Join code is required')
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

      // Find team by join code
      const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())

      if (teamError || !teams || teams.length === 0) {
        setError('Invalid join code. Please check and try again.')
        return
      }

      const team: Team = teams[0]

      // Check if team is full
      if (team.member_count >= 3) {
        setError('This squad is full (3 members maximum)')
        return
      }

      // Check if user already in a team
      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', session.user.id)
        .single()

      if (userData?.team_id) {
        setError('You are already in a squad. Leave your current squad first.')
        return
      }

      // Add user as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          {
            user_id: session.user.id,
            team_id: team.id,
            role: 'member',
          },
        ])

      if (memberError) {
        setError(memberError.message)
        return
      }

      // Update user's team_id
      const { error: userError } = await supabase
        .from('users')
        .update({ team_id: team.id })
        .eq('id', session.user.id)

      if (userError) {
        setError(userError.message)
        return
      }

      // Update team member count
      const { error: updateError } = await supabase
        .from('teams')
        .update({ member_count: team.member_count + 1 })
        .eq('id', team.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push(`/team/${team.id}`)
    } catch (err) {
      setError('Failed to join team')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-blue-500/30 bg-black/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-white hover:text-blue-400">
              ⚔ TRACE THE TRUTH
            </Link>
            <div className="space-x-6 text-sm">
              <Link href="/" className="text-gray-300 hover:text-blue-400 transition font-mono">
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
          <div className="mb-12 text-center border-b border-blue-500/30 pb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-blue-400 font-mono text-sm">👥 JOIN SQUAD</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              ENTER INVESTIGATION SQUAD
            </h1>
            <p className="text-blue-400 font-mono text-sm">ACCESS KEY REQUIRED // TEAM COLLABORATION</p>
          </div>

          {/* Form Card */}
          <div className="border border-blue-500/50 rounded p-8 bg-black/50 backdrop-blur max-w-md mx-auto">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-6 font-mono text-sm">
                ✗ {error}
              </div>
            )}

            <form onSubmit={handleJoinTeam} className="space-y-6">
              {/* Join Code Field */}
              <div>
                <label className="block text-blue-400 mb-2 font-mono text-sm uppercase">
                  Access Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full px-4 py-3 bg-black border border-blue-500/30 rounded text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 font-mono text-center text-2xl tracking-widest transition"
                  placeholder="XXXXXX"
                  disabled={loading}
                />
                <p className="text-gray-500 text-xs mt-2 font-mono text-center">
                  6-CHARACTER ALPHANUMERIC CODE
                </p>
              </div>

              {/* Info Text */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-4">
                <p className="text-blue-400 font-mono text-xs">
                  ⓘ Ask your squad leader for the access code. You will join as a team member and contribute to your squad's score.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase text-sm tracking-wider"
              >
                {loading ? '⊳ JOINING...' : '⊳ JOIN SQUAD'}
              </button>

              {/* Back Link */}
              <div className="text-center pt-4 border-t border-blue-500/30">
                <Link
                  href="/"
                  className="text-blue-400 hover:text-blue-300 font-mono text-sm transition underline"
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
