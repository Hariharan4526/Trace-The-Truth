'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Challenge } from '@/lib/types'

export default function ChallengePage() {
  const router = useRouter()
  const params = useParams()
  const challengeId = params.id as string
  const supabase = createClient()

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flag, setFlag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null)
  const [user, setUser] = useState<any>(null)
  const [teamSolved, setTeamSolved] = useState(false)

  useEffect(() => {
    const loadChallenge = async () => {
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

      if (!userData?.team_id) {
        router.push('/team/join')
        return
      }

      setUser(userData)

      const { data: teamSolvedData } = await supabase
        .from('submissions')
        .select('id')
        .eq('team_id', userData.team_id)
        .eq('challenge_id', challengeId)
        .eq('is_correct', true)
        .limit(1)

      setTeamSolved(!!teamSolvedData?.length)

      // Fetch challenge
      try {
        const { data, error } = await supabase
          .from('challenges')
          .select('*')
          .eq('id', challengeId)
          .single()

        if (error) {
          setError('Challenge not found')
        } else {
          setChallenge(data)
        }
      } catch (err) {
        setError('Failed to load challenge')
      } finally {
        setLoading(false)
      }
    }

    loadChallenge()
  }, [supabase, router, challengeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flag.trim()) {
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

      if (teamSolved) {
        setResult({ correct: false, message: '✓ This challenge is already solved by your team.' })
        return
      }

      const { data: existingTeamSolve } = await supabase
        .from('submissions')
        .select('id')
        .eq('team_id', user?.team_id)
        .eq('challenge_id', challengeId)
        .eq('is_correct', true)
        .limit(1)

      if (existingTeamSolve && existingTeamSolve.length > 0) {
        setTeamSolved(true)
        setResult({ correct: false, message: '✓ This challenge is already solved by your team.' })
        return
      }

      const isCorrect = flag.trim() === challenge?.flag

      if (isCorrect) {
        // Update user score
        const { error: updateError } = await supabase
          .from('users')
          .update({ score: (user?.score || 0) + (challenge?.points || 0) })
          .eq('id', session.user.id)

        if (updateError) {
          setResult({ correct: false, message: 'Failed to update score' })
          return
        }

        // Update team score
        const { data: teamData } = await supabase
          .from('teams')
          .select('score')
          .eq('id', user?.team_id)
          .single()

        if (teamData) {
          await supabase
            .from('teams')
            .update({ score: (teamData.score || 0) + (challenge?.points || 0) })
            .eq('id', user?.team_id)
        }

        // Record submission
        await supabase
          .from('submissions')
          .insert([
            {
              user_id: session.user.id,
              team_id: user?.team_id || null,
              challenge_id: challengeId,
              flag: flag,
              is_correct: true,
            },
          ])

        setResult({
          correct: true,
          message: `🎉 Correct! You earned ${challenge?.points} points!`,
        })
        setUser({ ...user, score: (user?.score || 0) + (challenge?.points || 0) })
        setTeamSolved(true)
        setFlag('')
      } else {
        // Record failed submission
        await supabase
          .from('submissions')
          .insert([
            {
              user_id: session.user.id,
              team_id: user?.team_id || null,
              challenge_id: challengeId,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 font-mono">LOADING CHALLENGE...</div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-mono text-lg mb-4">{error}</p>
          <Link href="/challenges" className="text-cyan-400 hover:text-cyan-300 font-mono underline">
            → Return to Challenges
          </Link>
        </div>
      </div>
    )
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
              <span className="text-cyan-400 font-mono">SCORE: {user?.score || 0} PTS</span>
              <span className="text-gray-500">|</span>
              <Link href="/challenges" className="text-gray-300 hover:text-cyan-400 transition font-mono">
                CHALLENGES
              </Link>
              <span className="text-gray-500">|</span>
              <button onClick={handleLogout} className="text-gray-300 hover:text-red-400 transition font-mono">
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/challenges" className="text-cyan-400 hover:text-cyan-300 mb-8 inline-block font-mono">
          ← Back to Challenges
        </Link>

        <div className="cyber-card">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">{challenge.title}</h1>
              <div className="flex gap-4 mt-6">
                <span className="px-4 py-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500 rounded-lg capitalize font-semibold font-mono text-sm uppercase">
                  {challenge.difficulty}
                </span>
                <span className="px-4 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500 rounded-lg font-semibold font-mono text-sm uppercase">
                  {challenge.points} PTS
                </span>
              </div>
            </div>
          </div>

          {/* Challenge Files */}
          {challenge.file_url && (
            <div className="cyber-box mb-8">
              <h2 className="text-4xl font-bold text-white mb-4">📁 CHALLENGE FILES</h2>
              <p className="text-gray-200 mb-4 font-mono text-xl leading-8">Download the evidence files to analyze:</p>
              <a
                href={challenge.file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-black font-semibold rounded-lg transition flex items-center gap-2 font-mono text-xl uppercase"
              >
                ⬇️ Download File
              </a>
            </div>
          )}

          {/* Case Details */}
          <div className="cyber-box mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">📋 TASK</h2>
            <p className="text-gray-100 whitespace-pre-wrap font-mono text-3xl leading-[1.9]">{challenge.task || challenge.description || challenge.scenario || 'No details available'}</p>
          </div>

          {/* Scenario */}
          {(challenge.scenario || challenge.description) && (
            <div className="cyber-box mb-8">
              <h2 className="text-4xl font-bold text-white mb-4">📋 SCENARIO</h2>
              <p className="text-gray-100 whitespace-pre-wrap font-mono text-3xl leading-[1.9]">{challenge.scenario || challenge.description || 'No scenario available'}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`${
                result.correct
                  ? 'bg-green-500/20 border-green-500 text-green-200'
                  : 'bg-red-500/20 border-red-500 text-red-200'
              } border px-4 py-3 rounded-lg mb-8`}
            >
              {result.message}
            </div>
          )}

          {/* Flag Submission */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-cyan-400 mb-2 font-mono text-xl uppercase">
                🚩 Submit Your Flag
              </label>
              <p className="text-gray-200 mb-3 font-mono text-lg leading-8">
                Find the flag hidden in the scenario and submit it below
              </p>
              <input
                type="text"
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                placeholder="Enter the Answer"
                disabled={teamSolved}
                className="w-full px-4 py-3 bg-black border border-cyan-500/30 rounded text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || result?.correct || teamSolved}
              className="w-full bg-cyan-600 text-black font-bold py-3 rounded hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase tracking-wider"
            >
              {submitting ? '⊳ VALIDATING...' : result?.correct || teamSolved ? '✓ SOLVED' : '⊳ SUBMIT FLAG'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
