'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import type { User } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [team, setTeam] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [teamCompletions, setTeamCompletions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [solvedCount, setSolvedCount] = useState(0)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Check if user is in a team
      if (!userData?.team_id) {
        router.push('/team/join')
        return
      }

      setUser(userData)

      // Get team data
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', userData.team_id)
        .single()

      setTeam(teamData)

      // Get team members
      const { data: members } = await supabase
        .from('users')
        .select('*')
        .eq('team_id', userData.team_id)

      setTeamMembers(members || [])

      // Count solved challenges
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_correct', true)

      setSolvedCount(submissions?.length || 0)

      // Get team completions
      const { data: completions } = await supabase
        .from('submissions')
        .select(`
          id,
          created_at,
          user_id,
          challenge_id,
          users(email, username),
          challenges(title, points)
        `)
        .eq('team_id', userData.team_id)
        .eq('is_correct', true)
        .order('created_at', { ascending: false })
        .limit(10)

      setTeamCompletions(completions || [])
      setLoading(false)

      // Subscribe to real-time completions
      const submissionChannel = supabase
        .channel(`team-submissions:${userData.team_id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
          filter: `team_id=eq.${userData.team_id}`,
        }, async () => {
          // Re-fetch completions when new submission is added
          const { data: updatedCompletions } = await supabase
            .from('submissions')
            .select(`
              id,
              created_at,
              user_id,
              challenge_id,
              users(email, username),
              challenges(title, points)
            `)
            .eq('team_id', userData.team_id)
            .eq('is_correct', true)
            .order('created_at', { ascending: false })
            .limit(10)

          setTeamCompletions(updatedCompletions || [])
        })
        .subscribe()

      return () => {
        supabase.removeChannel(submissionChannel)
      }
    }

    loadProfile()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-blue-400 font-mono">LOADING PROFILE...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400 font-mono">ERROR: PROFILE NOT FOUND</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <Header currentPage="profile" />

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-green-400 font-mono text-sm">● PROFILE LOADED</span>
            <span className="text-green-400 font-mono text-sm">● USER AUTHENTICATED</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Analyst Profile</h1>
          <p className="text-gray-400">Your investigation statistics and team information</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* User Profile Section */}
          <div className="md:col-span-2 cyber-card">
            <div className="mb-8 pb-8 border-b border-cyan-500/30">
              <div className="cyber-label mb-4">ACCOUNT INFORMATION</div>
              <h2 className="text-3xl font-bold text-white mb-4">{user.full_name}</h2>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Email Address:</span>
                  <span className="text-cyan-400">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Account Role:</span>
                  <span className={user.role === 'admin' ? 'text-yellow-400' : 'text-green-400'}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Member Since:</span>
                  <span className="text-cyan-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div>
              <div className="cyber-label mb-4">INVESTIGATION STATS</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="cyber-box">
                  <div className="text-gray-400 font-mono text-xs mb-2">Total Score</div>
                  <div className="text-4xl font-bold text-cyan-400">{user.score}</div>
                  <div className="text-gray-500 font-mono text-xs mt-2">POINTS EARNED</div>
                </div>
                <div className="cyber-box">
                  <div className="text-gray-400 font-mono text-xs mb-2">Challenges Solved</div>
                  <div className="text-4xl font-bold text-green-400">{solvedCount}</div>
                  <div className="text-gray-500 font-mono text-xs mt-2">COMPLETED</div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Dashboard */}
          <div className="md:col-span-2 space-y-6">
            {/* Team Code Card */}
            {team && (
              <div className="cyber-card">
                <div className="cyber-label mb-4">SQUAD ACCESS CODE</div>
                <p className="text-gray-400 text-sm mb-4">Share this code with others to join your squad</p>
                <div className="bg-black/50 border border-cyan-500/40 rounded p-4 mb-4">
                  <div className="font-mono text-2xl text-cyan-400 font-bold text-center tracking-widest">
                    {team.join_code || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Team Info Card */}
            {team && (
              <div className="cyber-card">
                <div className="cyber-label mb-4">SQUAD INFORMATION</div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Squad Name:</span>
                    <span className="text-cyan-400 font-semibold">{team.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Leader:</span>
                    <span className="text-cyan-400">{teamMembers.find(m => m.id === team.leader_id)?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Members:</span>
                    <span className="text-green-400">{teamMembers.length}/3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Team Score:</span>
                    <span className="text-yellow-400 font-bold">{teamMembers.reduce((sum, m) => sum + (m.score || 0), 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-cyan-400">{new Date(team.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Members & Completions */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Team Members */}
          <div className="cyber-card">
            <div className="cyber-label mb-6">SQUAD MEMBERS</div>
            {teamMembers.length === 0 ? (
              <p className="text-gray-400 font-mono text-sm text-center py-8">No members found</p>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="border border-cyan-500/20 rounded p-4 bg-cyan-950/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-cyan-400 font-mono font-semibold">{member.full_name}</p>
                        <p className="text-gray-500 text-xs font-mono mt-1">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold">{member.score}</p>
                        <p className="text-gray-500 text-xs font-mono">POINTS</p>
                      </div>
                    </div>
                    {member.id === team?.leader_id && (
                      <div className="mt-2 inline-block px-2 py-1 bg-orange-500/20 border border-orange-500/50 text-orange-400 text-xs font-mono rounded">
                        ⚔ SQUAD LEADER
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Completions */}
          <div className="cyber-card">
            <div className="cyber-label mb-6">RECENT COMPLETIONS</div>
            {teamCompletions.length === 0 ? (
              <p className="text-gray-400 font-mono text-sm text-center py-8">No completions yet</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {teamCompletions.map((completion) => (
                  <div key={completion.id} className="border border-green-500/20 rounded p-3 bg-green-950/20">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-green-400 font-mono font-semibold text-sm truncate">
                          ✓ {completion.challenges?.title}
                        </p>
                        <p className="text-gray-500 text-xs font-mono mt-1">
                          By: {completion.users?.username || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-yellow-400 font-bold text-sm">{completion.challenges?.points}</p>
                        <p className="text-gray-500 text-xs font-mono">{new Date(completion.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Link
            href="/challenges"
            className="cyber-btn flex-1 text-center"
          >
            ⊳ CONTINUE SOLVING
          </Link>
          <Link
            href="/leaderboard"
            className="cyber-btn-secondary flex-1 text-center"
          >
            📊 VIEW LEADERBOARD
          </Link>
          <button
            onClick={handleLogout}
            className="cyber-btn-outline text-red-400 border-red-500/50 hover:border-red-500 hover:bg-red-950/20 flex-1"
          >
            ✕ LOGOUT
          </button>
        </div>
      </section>
    </div>
  )
}
