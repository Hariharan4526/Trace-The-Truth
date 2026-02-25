'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface TeamLeaderboardEntry {
  id: string
  name: string
  score: number
  member_count: number
  leader_id: string
  leader_name: string
  rank: number
}

interface TeamRow {
  id: string
  name: string
  member_count: number
  leader_id: string
}

interface UserRow {
  id: string
  full_name: string
  role: string
  team_id: string | null
  score: number | null
}

export default function LeaderboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [entries, setEntries] = useState<TeamLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const [currentUserTeamId, setCurrentUserTeamId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const buildLeaderboardData = async (): Promise<TeamLeaderboardEntry[]> => {
    const { data: teams, error: teamError } = await supabase
      .from('teams')
      .select('id, name, member_count, leader_id')

    if (teamError) {
      throw new Error(teamError.message)
    }

    if (!teams || teams.length === 0) {
      return []
    }

    const teamRows = teams as TeamRow[]
    const teamIds = teamRows.map((team) => team.id)
    const leaderIdSet = new Set(teamRows.map((team) => team.leader_id))

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, full_name, role, team_id, score')
      .in('team_id', teamIds)

    if (userError) {
      throw new Error(userError.message)
    }

    const userRows = (users || []) as UserRow[]
    const leaderMap = new Map<string, string>()
    const leaderRoleMap = new Map<string, string>()
    const teamScoreMap = new Map<string, number>()

    userRows.forEach((teamUser) => {
      if (teamUser.team_id) {
        teamScoreMap.set(teamUser.team_id, (teamScoreMap.get(teamUser.team_id) || 0) + (teamUser.score || 0))
      }

      if (leaderIdSet.has(teamUser.id)) {
        leaderMap.set(teamUser.id, teamUser.full_name)
        leaderRoleMap.set(teamUser.id, teamUser.role)
      }
    })

    const filteredTeams = teamRows.filter((team) => leaderRoleMap.get(team.leader_id) !== 'admin')

    return filteredTeams
      .map((team) => ({
        id: team.id,
        name: team.name,
        score: teamScoreMap.get(team.id) || 0,
        member_count: team.member_count,
        leader_id: team.leader_id,
        leader_name: leaderMap.get(team.leader_id) || 'Unknown',
        rank: 0,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.name.localeCompare(b.name)
      })
      .map((team, index) => ({
        ...team,
        rank: index + 1,
      }))
  }

  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null
    let subscription: ReturnType<typeof supabase.channel> | null = null

    const loadLeaderboard = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      try {
        // Get current user's team
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', session.user.id)
          .single()

        const trackedTeamId = userData?.team_id || null
        setCurrentUserTeamId(trackedTeamId)

        const applyLeaderboardState = (leaderboardData: TeamLeaderboardEntry[]) => {
          setEntries(leaderboardData)
          const currentTeam = leaderboardData.find((team) => team.id === trackedTeamId)
          setCurrentUserRank(currentTeam ? currentTeam.rank : null)
        }

        const leaderboardData = await buildLeaderboardData()
        applyLeaderboardState(leaderboardData)

        // Subscribe to teams table for real-time updates
        subscription = supabase
          .channel('teams_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'teams' },
            async () => {
              try {
                const updatedData = await buildLeaderboardData()
                applyLeaderboardState(updatedData)
              } catch (refreshError) {
                console.error('Error refreshing leaderboard from realtime update:', refreshError)
              }
            }
          )
          .subscribe()

        // Set up polling as fallback (refresh every 5 seconds)
        pollInterval = setInterval(async () => {
          try {
            const updatedData = await buildLeaderboardData()
            applyLeaderboardState(updatedData)
          } catch (pollError) {
            console.error('Error polling leaderboard data:', pollError)
          }
        }, 5000)
      } catch (err) {
        setError('Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const refreshLeaderboard = async () => {
    setRefreshing(true)
    try {
      const leaderboardData = await buildLeaderboardData()
      setEntries(leaderboardData)

      const currentTeam = leaderboardData.find((team) => team.id === currentUserTeamId)
      setCurrentUserRank(currentTeam ? currentTeam.rank : null)
    } catch (err) {
      console.error('Error refreshing leaderboard:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 font-mono">LOADING RANKINGS...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <Header currentPage="leaderboard" />

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 cyber-container">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-green-400 font-mono text-xs">● SYSTEM ONLINE</span>
                <span className="text-cyan-400 font-mono text-xs">● LIVE RANKINGS</span>
                {currentUserRank && <span className="text-cyan-400 font-mono text-xs">● YOUR RANK: #{currentUserRank}</span>}
                {currentUserTeamId && <span className="text-yellow-400 font-mono text-xs">● TEAM TRACKED</span>}
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white mb-3 tracking-tight">
                SQUAD LEADERBOARD
              </h1>
              <p className="text-gray-400 font-mono text-sm uppercase tracking-wide">
                Live ranking of top investigation squads
              </p>
            </div>

            <button
              onClick={refreshLeaderboard}
              disabled={refreshing}
              className="cyber-btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? '⟳ REFRESHING...' : '⟳ REFRESH'}
            </button>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-cyan-400">FULL RANKING</h2>
          <p className="text-gray-500 font-mono text-xs">{entries.length} ACTIVE SQUADS</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-8 font-mono text-sm">
            ✗ {error}
          </div>
        )}

        {entries.length === 0 ? (
          <div className="text-center py-12 border border-cyan-500/30 rounded">
            <p className="text-gray-400 font-mono">NO SQUADS AVAILABLE</p>
          </div>
        ) : (
          <div className="cyber-card overflow-hidden p-0">
            {/* Table Header */}
            <div className="bg-cyan-500/10 border-b border-cyan-500/30">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 font-mono text-xs text-cyan-300 uppercase tracking-wider font-semibold">
                <div className="col-span-2">Rank</div>
                <div className="col-span-4">Squad Name</div>
                <div className="col-span-3">Leader</div>
                <div className="col-span-1">Members</div>
                <div className="col-span-2 text-right">Score</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-cyan-500/20">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 gap-4 px-6 py-5 transition-all duration-200 hover:bg-cyan-500/10 ${
                    index % 2 === 0 ? 'bg-black/50' : 'bg-cyan-500/[0.03]'
                  } ${entry.id === currentUserTeamId ? 'border-l-4 border-green-400 bg-green-500/10' : ''}`}
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-xl">{getMedalEmoji(entry.rank)}</span>
                    <span className="text-cyan-300 font-bold text-lg">#{entry.rank}</span>
                  </div>

                  <div className="col-span-4 flex items-center">
                    <div>
                      <Link
                        href={`/team/${entry.id}`}
                        className="text-white font-semibold hover:text-cyan-300 transition"
                      >
                        {entry.name}
                      </Link>
                      {entry.id === currentUserTeamId && (
                        <p className="text-green-300 font-mono text-[10px] uppercase mt-1">Your squad</p>
                      )}
                    </div>
                  </div>

                  <div className="col-span-3 flex flex-col justify-center">
                    <p className="text-gray-200">{entry.leader_name}</p>
                    <p className="text-gray-500 text-xs font-mono">Squad Leader</p>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <span className="text-green-400 font-bold">{entry.member_count}/3</span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className="text-yellow-400 font-black text-2xl">{entry.score}</span>
                    <span className="text-gray-500 font-mono text-xs">PTS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
