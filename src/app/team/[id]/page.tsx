'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Team } from '@/lib/types'

interface TeamMemberDisplay {
  id: string
  full_name: string
  email: string
  score: number
  role: 'leader' | 'member'
}

export default function TeamDashboard() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  const supabase = createClient()

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMemberDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadTeam = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      try {
        // Fetch team
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()

        if (teamError || !teamData) {
          setError('Team not found')
          setLoading(false)
          return
        }

        setTeam(teamData)

        // Fetch team members with user info
        const { data: memberData, error: memberError } = await supabase
          .from('team_members')
          .select('user_id, role')
          .eq('team_id', teamId)

        if (!memberError && memberData) {
          const memberIds = memberData.map(m => m.user_id)
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name, email, score')
            .in('id', memberIds)

          if (users) {
            const displayMembers = memberData.map(member => {
              const user = users.find(u => u.id === member.user_id)
              return {
                id: member.user_id,
                full_name: user?.full_name || 'Unknown',
                email: user?.email || 'unknown@example.com',
                score: user?.score || 0,
                role: member.role,
              }
            })
            setMembers(displayMembers)
          }
        }

        setCurrentUser({ id: session.user.id })
      } catch (err) {
        setError('Failed to load team data')
      } finally {
        setLoading(false)
      }
    }

    loadTeam()
  }, [teamId, router, supabase])

  const handleCopyCode = () => {
    if (team?.join_code) {
      navigator.clipboard.writeText(team.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 font-mono">LOADING SQUAD DATA...</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 font-mono text-lg mb-4">SQUAD NOT FOUND</div>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 font-mono underline">
            → Return Home
          </Link>
        </div>
      </div>
    )
  }

  const isLeader = members.find(m => m.id === currentUser?.id)?.role === 'leader'

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
              <span className="text-cyan-400 font-mono">SQUAD DASHBOARD</span>
              <span className="text-gray-500">|</span>
              <Link href="/challenges" className="text-gray-300 hover:text-cyan-400 transition font-mono">
                CHALLENGES
              </Link>
              <span className="text-gray-500">|</span>
              <Link href="/leaderboard" className="text-gray-300 hover:text-cyan-400 transition font-mono">
                SCOREBOARD
              </Link>
              <span className="text-gray-500">|</span>
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:text-red-400 transition font-mono"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-green-400 font-mono text-sm">● SQUAD INITIALIZED</span>
            <span className="text-green-400 font-mono text-sm">● {members.length}/3 MEMBERS</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
          <p className="text-gray-400">Team collaboration and performance metrics</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Squad Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Squad Stats */}
            <div className="border border-cyan-500/30 rounded p-8">
              <h2 className="text-xl font-bold text-white font-mono mb-6">⊳ SQUAD STATISTICS</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border border-cyan-500/30 rounded p-4 text-center">
                  <div className="text-gray-400 font-mono text-xs mb-2">COMBINED SCORE</div>
                  <div className="text-4xl font-bold text-yellow-400">{team.score}</div>
                  <div className="text-gray-600 font-mono text-xs mt-2">POINTS</div>
                </div>
                <div className="border border-cyan-500/30 rounded p-4 text-center">
                  <div className="text-gray-400 font-mono text-xs mb-2">TEAM MEMBERS</div>
                  <div className="text-4xl font-bold text-green-400">{members.length}</div>
                  <div className="text-gray-600 font-mono text-xs mt-2">/ 3 CAPACITY</div>
                </div>
                <div className="border border-cyan-500/30 rounded p-4 text-center">
                  <div className="text-gray-400 font-mono text-xs mb-2">AVG MEMBER SCORE</div>
                  <div className="text-4xl font-bold text-cyan-400">
                    {members.length > 0 ? Math.round(members.reduce((sum, m) => sum + m.score, 0) / members.length) : 0}
                  </div>
                  <div className="text-gray-600 font-mono text-xs mt-2">PTS</div>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="border border-cyan-500/30 rounded p-8">
              <h2 className="text-xl font-bold text-white font-mono mb-6">⊳ TEAM ROSTER</h2>
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="border border-cyan-500/20 rounded p-4 flex justify-between items-center hover:border-cyan-500/50 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold">{member.full_name}</p>
                        {member.role === 'leader' && (
                          <span className="text-yellow-400 font-mono text-xs bg-yellow-500/20 px-2 py-1 rounded">
                            LEADER
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm font-mono">{member.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-400 font-bold text-lg">{member.score}</div>
                      <div className="text-gray-500 font-mono text-xs">POINTS</div>
                    </div>
                  </div>
                ))}
              </div>
              {members.length < 3 && (
                <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded">
                  <p className="text-cyan-400 font-mono text-xs">
                    ⓘ Invite {3 - members.length} more member(s) to complete your squad
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Access Code & Actions */}
          <div className="space-y-6 h-fit">
            {/* Access Code Card */}
            {isLeader && (
              <div className="border border-cyan-500/30 rounded p-6 bg-cyan-500/5">
                <h3 className="text-sm font-mono text-cyan-400 mb-4 uppercase">Squad Access Code</h3>
                <div className="mb-4">
                  <div className="text-center bg-black border border-cyan-500/50 rounded p-4">
                    <div className="font-mono text-3xl font-bold text-cyan-400 tracking-widest">
                      {team.join_code}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-semibold py-2 rounded transition font-mono uppercase text-xs"
                >
                  {copied ? '✓ COPIED' : '⊕ COPY CODE'}
                </button>
                <p className="text-gray-500 text-xs mt-3 font-mono text-center">
                  Share this code with your teammates to join
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="border border-cyan-500/30 rounded p-6 space-y-3">
              <h3 className="text-sm font-mono text-cyan-400 mb-4 uppercase">Quick Links</h3>
              <Link
                href="/challenges"
                className="block w-full bg-cyan-600 hover:bg-cyan-700 text-black font-semibold py-2 rounded transition text-center font-mono uppercase text-sm"
              >
                → Solve Challenges
              </Link>
              <Link
                href="/leaderboard"
                className="block w-full border border-cyan-500/50 hover:border-cyan-500 text-cyan-400 hover:text-cyan-300 font-semibold py-2 rounded transition text-center font-mono uppercase text-sm"
              >
                View Rankings
              </Link>
            </div>

            {/* Squad Info */}
            <div className="border border-cyan-500/30 rounded p-6 bg-cyan-500/5">
              <h3 className="text-sm font-mono text-cyan-400 mb-4 uppercase">Squad Details</h3>
              <div className="space-y-3 font-mono text-sm">
                <div>
                  <div className="text-gray-500 text-xs mb-1">Created</div>
                  <div className="text-cyan-400">
                    {new Date(team.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="pt-3 border-t border-cyan-500/30">
                  <div className="text-gray-500 text-xs mb-1">Status</div>
                  <div className="text-green-400">● ACTIVE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
