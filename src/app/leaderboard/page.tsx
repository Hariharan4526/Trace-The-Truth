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

export default function LeaderboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [entries, setEntries] = useState<TeamLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const [currentUserTeamId, setCurrentUserTeamId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
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

        setCurrentUserTeamId(userData?.team_id || null)

        // Fetch all teams with their scores
        const { data: teams, error: teamError } = await supabase
          .from('teams')
          .select('id, name, score, member_count, leader_id')
          .order('score', { ascending: false })

        if (teamError) {
          setError(teamError.message)
          return
        }

        // Get leader names and roles
        if (teams && teams.length > 0) {
          const leaderIds = teams.map(t => t.leader_id)
          const { data: leaders } = await supabase
            .from('users')
            .select('id, full_name, role')
            .in('id', leaderIds)

          const leaderMap = new Map()
          const leaderRoleMap = new Map()
          leaders?.forEach(l => {
            leaderMap.set(l.id, l.full_name)
            leaderRoleMap.set(l.id, l.role)
          })

          // Filter out teams with admin leaders and rank them
          const filteredTeams = teams.filter(team => leaderRoleMap.get(team.leader_id) !== 'admin')
          
          const leaderboardData: TeamLeaderboardEntry[] = filteredTeams.map((team, index) => ({
            id: team.id,
            name: team.name,
            score: team.score,
            member_count: team.member_count,
            leader_id: team.leader_id,
            leader_name: leaderMap.get(team.leader_id) || 'Unknown',
            rank: index + 1,
          }))

          setEntries(leaderboardData)

          // Find current user's rank
          const currentTeam = leaderboardData.find(t => t.id === userData?.team_id)
          if (currentTeam) {
            setCurrentUserRank(currentTeam.rank)
          }
        }

        // Subscribe to teams table for real-time updates
        const subscription = supabase
          .channel('teams_changes')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'teams' },
            async (payload) => {
              console.log('Team update detected:', payload)
              // Reload leaderboard when teams change
              const { data: updatedTeams, error: fetchError } = await supabase
                .from('teams')
                .select('id, name, score, member_count, leader_id')
                .order('score', { ascending: false })

              if (fetchError) {
                console.error('Error fetching updated teams:', fetchError)
                return
              }

              if (updatedTeams && updatedTeams.length > 0) {
                const leaderIds = updatedTeams.map(t => t.leader_id)
                const { data: leaders } = await supabase
                  .from('users')
                  .select('id, full_name, role')
                  .in('id', leaderIds)

                const leaderMap = new Map()
                const leaderRoleMap = new Map()
                leaders?.forEach(l => {
                  leaderMap.set(l.id, l.full_name)
                  leaderRoleMap.set(l.id, l.role)
                })

                const filteredTeams = updatedTeams.filter(team => leaderRoleMap.get(team.leader_id) !== 'admin')

                const leaderboardData: TeamLeaderboardEntry[] = filteredTeams.map((team, index) => ({
                  id: team.id,
                  name: team.name,
                  score: team.score,
                  member_count: team.member_count,
                  leader_id: team.leader_id,
                  leader_name: leaderMap.get(team.leader_id) || 'Unknown',
                  rank: index + 1,
                }))

                setEntries(leaderboardData)

                const currentTeam = leaderboardData.find(t => t.id === userData?.team_id)
                if (currentTeam) {
                  setCurrentUserRank(currentTeam.rank)
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status)
          })

        // Set up polling as fallback (refresh every 5 seconds)
        const pollInterval = setInterval(async () => {
          const { data: teamsData, error: teamError } = await supabase
            .from('teams')
            .select('id, name, score, member_count, leader_id')
            .order('score', { ascending: false })

          if (!teamError && teamsData) {
            const leaderIds = teamsData.map(t => t.leader_id)
            const { data: leadersData } = await supabase
              .from('users')
              .select('id, full_name, role')
              .in('id', leaderIds)

            const leaderMap = new Map()
            const leaderRoleMap = new Map()
            leadersData?.forEach(l => {
              leaderMap.set(l.id, l.full_name)
              leaderRoleMap.set(l.id, l.role)
            })

            const filteredTeams = teamsData.filter(team => leaderRoleMap.get(team.leader_id) !== 'admin')

            const leaderboardData: TeamLeaderboardEntry[] = filteredTeams.map((team, index) => ({
              id: team.id,
              name: team.name,
              score: team.score,
              member_count: team.member_count,
              leader_id: team.leader_id,
              leader_name: leaderMap.get(team.leader_id) || 'Unknown',
              rank: index + 1,
            }))

            setEntries(leaderboardData)

            const currentTeam = leaderboardData.find(t => t.id === userData?.team_id)
            if (currentTeam) {
              setCurrentUserRank(currentTeam.rank)
            }
          }
        }, 5000)

        return () => {
          subscription.unsubscribe()
          clearInterval(pollInterval)
        }
      } catch (err) {
        setError('Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const refreshLeaderboard = async () => {
    setRefreshing(true)
    try {
      const { data: teamsData, error: teamError } = await supabase
        .from('teams')
        .select('id, name, score, member_count, leader_id')
        .order('score', { ascending: false })

      if (!teamError && teamsData) {
        const leaderIds = teamsData.map(t => t.leader_id)
        const { data: leadersData } = await supabase
          .from('users')
          .select('id, full_name, role')
          .in('id', leaderIds)

        const leaderMap = new Map()
        const leaderRoleMap = new Map()
        leadersData?.forEach(l => {
          leaderMap.set(l.id, l.full_name)
          leaderRoleMap.set(l.id, l.role)
        })

        const filteredTeams = teamsData.filter(
          team => leaderRoleMap.get(team.leader_id) !== 'admin'
        )

        const leaderboardData: TeamLeaderboardEntry[] = filteredTeams.map((team, index) => ({
          id: team.id,
          name: team.name,
          score: team.score,
          member_count: team.member_count,
          leader_id: team.leader_id,
          leader_name: leaderMap.get(team.leader_id) || 'Unknown',
          rank: index + 1,
        }))

        setEntries(leaderboardData)

        const currentTeam = leaderboardData.find(t => t.id === currentUserTeamId)
        if (currentTeam) {
          setCurrentUserRank(currentTeam.rank)
        }
      }
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
        <div className="text-blue-400 font-mono">LOADING RANKINGS...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <Header currentPage="leaderboard" />

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-green-400 font-mono text-sm">● SYSTEM ONLINE</span>
              <span className="text-green-400 font-mono text-sm">● LIVE RANKINGS</span>
              {currentUserRank && <span className="text-blue-400 font-mono text-sm">● YOUR RANK: #{currentUserRank}</span>}
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Squad Leaderboard</h1>
            <p className="text-gray-400">
              Top performing investigation squads
            </p>
          </div>
          <button
            onClick={refreshLeaderboard}
            disabled={refreshing}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-mono text-sm px-4 py-2 rounded transition"
          >
            {refreshing ? '⟳ REFRESHING...' : '⟳ REFRESH'}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-8 font-mono text-sm">
            ✗ {error}
          </div>
        )}

        {entries.length === 0 ? (
          <div className="text-center py-12 border border-blue-500/30 rounded">
            <p className="text-gray-400 font-mono">NO SQUADS AVAILABLE</p>
          </div>
        ) : (
          <div className="border border-blue-500/30 rounded overflow-hidden">
            {/* Table Header */}
            <div className="bg-blue-500/10 border-b border-blue-500/30">
              <div className="grid grid-cols-12 gap-4 p-6 font-mono text-sm text-blue-400 uppercase font-semibold">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Squad Name</div>
                <div className="col-span-3">Leader</div>
                <div className="col-span-2">Members</div>
                <div className="col-span-2">Score</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-blue-500/20">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 gap-4 p-6 transition hover:bg-blue-500/10 ${
                    index < 3 ? 'bg-blue-500/5' : ''
                  } ${entry.id === currentUserTeamId ? 'border-l-4 border-green-500' : ''}`}
                >
                  <div className="col-span-1">
                    <span className="text-2xl font-bold">
                      {getMedalEmoji(entry.rank)}
                    </span>
                    <span className="text-blue-400 font-mono text-lg font-bold ml-2">
                      #{entry.rank}
                    </span>
                  </div>

                  <div className="col-span-4">
                    <Link
                      href={`/team/${entry.id}`}
                      className="text-white font-semibold hover:text-blue-400 transition"
                    >
                      {entry.name}
                    </Link>
                  </div>

                  <div className="col-span-3">
                    <p className="text-gray-300">{entry.leader_name}</p>
                    <p className="text-gray-500 text-xs font-mono">Squad Leader</p>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold">
                        {entry.member_count}
                      </span>
                      <span className="text-gray-500 font-mono text-sm">{entry.member_count}/3</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold text-xl">
                        {entry.score}
                      </span>
                      <span className="text-gray-500 font-mono text-sm">PTS</span>
                    </div>
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
