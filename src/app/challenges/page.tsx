'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import type { Challenge } from '@/lib/types'

export default function ChallengesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [flag, setFlag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null)
  const [teamSolvedChallenges, setTeamSolvedChallenges] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkAuth = async () => {
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

      // Get solved challenges
      const { data: solvedData } = await supabase
        .from('submissions')
        .select('challenge_id')
        .eq('team_id', userData.team_id)
        .eq('is_correct', true)
      
      setTeamSolvedChallenges(new Set(solvedData?.map(s => s.challenge_id) || []))

      try {
        const { data, error } = await supabase
          .from('challenges')
          .select('*')
          .eq('is_available', true)
          .order('difficulty', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setChallenges(data || [])
        }
      } catch (err) {
        setError('Failed to load challenges')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [supabase, router])

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flag.trim() || !selectedChallenge) {
      setResult({ correct: false, message: 'Please enter a flag' })
      return
    }

    setSubmitting(true)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      if (teamSolvedChallenges.has(selectedChallenge.id)) {
        setResult({ correct: false, message: '✓ This challenge is already solved by your team.' })
        return
      }

      const { data: existingTeamSolve } = await supabase
        .from('submissions')
        .select('id')
        .eq('team_id', user?.team_id)
        .eq('challenge_id', selectedChallenge.id)
        .eq('is_correct', true)
        .limit(1)

      if (existingTeamSolve && existingTeamSolve.length > 0) {
        setTeamSolvedChallenges(new Set([...teamSolvedChallenges, selectedChallenge.id]))
        setResult({ correct: false, message: '✓ This challenge is already solved by your team.' })
        return
      }

      const isCorrect = flag.trim() === selectedChallenge?.flag

      if (isCorrect) {
        const newScore = (user?.score || 0) + (selectedChallenge?.points || 0)
        
        // Update user score
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ score: newScore })
          .eq('id', session.user.id)

        if (userUpdateError) {
          console.error('Error updating user score:', userUpdateError)
        }

        // Update team score if user is part of a team
        if (user?.team_id) {
          const { data: teamData, error: teamFetchError } = await supabase
            .from('teams')
            .select('score')
            .eq('id', user.team_id)
            .single()

          if (teamFetchError) {
            console.error('Error fetching team:', teamFetchError)
          } else if (teamData) {
            const newTeamScore = (teamData.score || 0) + (selectedChallenge?.points || 0)
            const { error: teamUpdateError } = await supabase
              .from('teams')
              .update({ score: newTeamScore })
              .eq('id', user.team_id)

            if (teamUpdateError) {
              console.error('Error updating team score:', teamUpdateError)
            }
          }
        }

        // Record submission with team_id
        const { error: submissionError } = await supabase
          .from('submissions')
          .insert([
            {
              user_id: session.user.id,
              team_id: user?.team_id || null,
              challenge_id: selectedChallenge.id,
              flag: flag,
              is_correct: true,
            },
          ])

        if (submissionError) {
          console.error('Error recording submission:', submissionError)
        }

        setResult({
          correct: true,
          message: `🎉 Correct! You earned ${selectedChallenge?.points} points!`,
        })
        setUser({ ...user, score: newScore })
        setTeamSolvedChallenges(new Set([...teamSolvedChallenges, selectedChallenge.id]))
        setFlag('')
        setTimeout(() => {
          setSelectedChallenge(null)
          setResult(null)
        }, 2000)
      } else {
        await supabase
          .from('submissions')
          .insert([
            {
              user_id: session.user.id,
              team_id: user?.team_id || null,
              challenge_id: selectedChallenge.id,
              flag: flag,
              is_correct: false,
            },
          ])

        setResult({ correct: false, message: '❌ Incorrect flag. Try again!' })
      }
    } catch (err) {
      setResult({ correct: false, message: 'An error occurred' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getDifficultyStars = (difficulty: string) => {
    const stars = {
      easy: '★☆☆☆☆',
      medium: '★★★☆☆',
      hard: '★★★★★'
    }
    return stars[difficulty as keyof typeof stars] || '★☆☆☆☆'
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'border-green-500/50 hover:border-green-500'
      case 'medium':
        return 'border-yellow-500/50 hover:border-yellow-500'
      case 'hard':
        return 'border-red-500/50 hover:border-red-500'
      default:
        return 'border-gray-500/50'
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    const badges = {
      easy: { color: 'bg-green-500/20 text-green-400', label: '● EASY' },
      medium: { color: 'bg-yellow-500/20 text-yellow-400', label: '● MEDIUM' },
      hard: { color: 'bg-red-500/20 text-red-400', label: '● HARD' }
    }
    return badges[difficulty as keyof typeof badges] || badges.easy
  }

  const groupedChallenges: Record<'easy' | 'medium' | 'hard', Challenge[]> = {
    easy: [],
    medium: [],
    hard: [],
  }

  challenges.forEach((challenge) => {
    groupedChallenges[challenge.difficulty].push(challenge)
  })

  const difficultySections: Array<{ key: 'easy' | 'medium' | 'hard'; title: string; color: string }> = [
    { key: 'easy', title: 'Easy', color: 'text-green-400' },
    { key: 'medium', title: 'Medium', color: 'text-yellow-400' },
    { key: 'hard', title: 'Hard', color: 'text-red-400' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 font-mono">LOADING CHALLENGES...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <Header currentPage="challenges" />

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 border-b border-cyan-500/30 pb-8">
          <div className="system-status justify-start mb-4">
            <span>CHALLENGES LOADED</span>
            {user && <span>SCORE: {user?.score || 0} PTS</span>}
          </div>
          <h1 className="text-6xl font-black text-white mb-3 tracking-tight">FORENSIC CASES</h1>
          <p className="text-gray-400 font-mono text-sm">SOLVE PUZZLES, CAPTURE FLAGS, CLIMB THE LEADERBOARD</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/70 text-red-300 px-6 py-4 rounded-lg mb-8 font-mono text-sm">
            ✗ {error}
          </div>
        )}

        {challenges.length === 0 ? (
          <div className="cyber-container text-center py-12">
            <p className="text-gray-400 font-mono">NO CHALLENGES AVAILABLE</p>
          </div>
        ) : (
          <div className="space-y-12">
            {difficultySections.map((section) => {
              const sectionChallenges = groupedChallenges[section.key]
              if (sectionChallenges.length === 0) return null

              return (
                <div key={section.key}>
                  <div className="mb-5 flex items-center justify-between border-b border-cyan-500/20 pb-3">
                    <h2 className={`font-mono text-lg md:text-xl font-bold tracking-widest ${section.color}`}>
                      {section.title}
                    </h2>
                    <span className="text-gray-500 font-mono text-xs">{sectionChallenges.length} CASES</span>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {sectionChallenges.map((challenge) => {
                      const badge = getDifficultyBadge(challenge.difficulty)
                      return (
                        <button
                          key={challenge.id}
                          onClick={() => {
                            setSelectedChallenge(challenge)
                            setFlag('')
                            setResult(null)
                          }}
                          className="cyber-card group text-left cursor-pointer"
                        >
                          <div className="mb-4">
                            <h3 className="text-xl font-black text-white tracking-wide uppercase mb-2">
                              {challenge.title}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                              {challenge.task || challenge.description || 'No description'}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <p className={`text-xs font-mono px-3 py-1 rounded inline-block border ${badge.color}`}>
                              {badge.label}
                            </p>

                            <div className="text-2xl font-bold text-cyan-400">
                              {challenge.points} PTS
                            </div>

                            <div className="text-cyan-400 font-mono text-xs group-hover:text-cyan-300 transition">
                              {'> '} ACCESS CASE
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Challenge Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedChallenge(null)}>
          <div
            className="cyber-container max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-cyan-500/30">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-cyan-400 font-mono text-xs">🔍</span>
                  <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">{selectedChallenge.difficulty} CASE</span>
                  <span className="text-gray-500 text-xs">{getDifficultyStars(selectedChallenge.difficulty)}</span>
                </div>
                <h2 className="text-4xl font-black text-white tracking-wide uppercase break-words">
                  {selectedChallenge.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="text-gray-400 hover:text-red-400 transition flex-shrink-0 ml-4"
              >
                ✕
              </button>
            </div>

            {/* Challenge Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-cyan-500/20">
              <div>
                <p className="text-cyan-400 font-mono text-xs uppercase">Status</p>
                <p className="text-white text-lg font-black">Active</p>
              </div>
              <div>
                <p className="text-cyan-400 font-mono text-xs uppercase">Points</p>
                <p className="text-cyan-400 text-lg font-black">{selectedChallenge.points} PTS</p>
              </div>
            </div>

            {/* Task Description */}
            <div className="bg-black/50 border border-cyan-500/20 rounded-lg p-4 mb-6 font-mono text-sm">
              <p className="text-cyan-400 mb-2">{'> TASK'}</p>
              <p className="text-gray-100 whitespace-pre-wrap text-lg leading-8">
                {selectedChallenge.task || selectedChallenge.description || 'No task available'}
              </p>
            </div>

            {/* Scenario */}
            {(selectedChallenge.scenario || selectedChallenge.description) && (
              <div className="bg-black/50 border border-cyan-500/20 rounded-lg p-4 mb-6 font-mono text-sm">
                <p className="text-cyan-400 mb-2">{'> SCENARIO'}</p>
                <p className="text-gray-100 whitespace-pre-wrap text-lg leading-8">
                  {selectedChallenge.scenario || selectedChallenge.description || 'No scenario available'}
                </p>
              </div>
            )}

            {/* File Downloads */}
            {(selectedChallenge.file_urls || selectedChallenge.file_url) && (
              <div className="bg-black/50 border border-cyan-500/20 rounded-lg p-4 mb-6">
                <p className="text-cyan-400 font-mono text-xs mb-3">📁 EVIDENCE FILES</p>
                <div className="space-y-2">
                  {selectedChallenge.file_urls ? (
                    JSON.parse(selectedChallenge.file_urls).map((fileUrl: string, index: number) => (
                      <a
                        key={index}
                        href={fileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600 rounded text-white hover:text-cyan-300 font-mono text-xs transition w-full"
                      >
                        ⬇️ {fileUrl.split('/').pop()}
                      </a>
                    ))
                  ) : selectedChallenge.file_url ? (
                    <a
                      href={selectedChallenge.file_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600 rounded text-white hover:text-cyan-300 font-mono text-xs transition w-full"
                    >
                      ⬇️ {selectedChallenge.file_url.split('/').pop()}
                    </a>
                  ) : null}
                </div>
              </div>
            )}

            {/* Result or Already Solved Message */}
            {teamSolvedChallenges.has(selectedChallenge.id) && (
              <div className="bg-green-500/20 border-green-500/70 text-green-300 border px-4 py-3 rounded-lg mb-6 font-mono text-sm">
                ✓ CHALLENGE ALREADY SOLVED BY YOUR TEAM
              </div>
            )}

            {result && (
              <div
                className={`${
                  result.correct
                    ? 'bg-green-500/20 border-green-500/70 text-green-300'
                    : 'bg-red-500/20 border-red-500/70 text-red-300'
                } border px-4 py-3 rounded-lg mb-6 font-mono text-sm`}
              >
                {result.message}
              </div>
            )}

            {/* Flag Submission */}
            <form onSubmit={handleSubmitFlag} className="space-y-4">
              <div>
                <label className="cyber-label">SUBMIT FLAG_</label>
                <input
                  type="text"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder="Enter the Answer"
                  disabled={result?.correct || teamSolvedChallenges.has(selectedChallenge.id)}
                  className="cyber-input"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || result?.correct || teamSolvedChallenges.has(selectedChallenge.id)}
                className="cyber-btn w-full disabled:opacity-50"
              >
                {submitting ? '⊳ SUBMITTING...' : result?.correct ? '✓ SOLVED' : teamSolvedChallenges.has(selectedChallenge.id) ? '✓ SOLVED' : '⊳ SUBMIT FLAG'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
