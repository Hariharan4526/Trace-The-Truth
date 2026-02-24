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

      setUser(userData)

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

        // Record submission
        await supabase
          .from('submissions')
          .insert([
            {
              user_id: session.user.id,
              challenge_id: challengeId,
              flag: flag,
              is_correct: true,
            },
          ])

        setResult({
          correct: true,
          message: `✓ FLAG ACCEPTED - +${challenge?.points} POINTS`,
        })
        setUser({ ...user, score: (user?.score || 0) + (challenge?.points || 0) })
        setFlag('')
      } else {
        // Record failed submission
        await supabase
          .from('submissions')
          .insert([
            {
              user_id: session.user.id,
              challenge_id: challengeId,
              flag: flag,
              is_correct: false,
            },
          ])

        setResult({ correct: false, message: '✗ INCORRECT - TRY AGAIN' })
      }
    } catch (err) {
      setResult({ correct: false, message: 'ERROR: SUBMISSION FAILED' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'hard':
        return 'bg-red-500/20 text-red-400 border-red-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-blue-400 font-mono">LOADING SCENARIO...</div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 font-mono text-lg mb-4">CHALLENGE NOT FOUND</div>
          <Link
            href="/challenges"
            className="text-blue-400 hover:text-blue-300 font-mono underline"
          >
            → Return to Challenges
          </Link>
        </div>
      </div>
    )
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
              <span className="text-blue-400 font-mono">
                SCORE: {user?.score || 0} PTS
              </span>
              <span className="text-gray-500">|</span>
              <Link href="/challenges" className="text-gray-300 hover:text-blue-400 transition font-mono">
                CHALLENGES
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
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-8 font-mono">
            ✗ {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Challenge Header */}
            <div className="border border-blue-500/30 rounded p-8 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-white mb-3">{challenge.title}</h1>
                </div>
                <div className={`border rounded px-3 py-2 font-mono text-xs font-bold uppercase whitespace-nowrap ml-4 ${getDifficultyColor(challenge.difficulty)}`}>
                  {challenge.difficulty}
                </div>
              </div>
            </div>

            {/* Task Description */}
            <div className="border border-blue-500/30 rounded p-8 mb-8">
              <div className="mb-4 pb-4 border-b border-blue-500/30">
                <h2 className="text-xl font-bold text-white font-mono">⊳ TASK</h2>
              </div>
              <div className="text-gray-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                {challenge.task || challenge.description || 'No task available'}
              </div>
            </div>

            {/* Scenario */}
            {(challenge.scenario || challenge.description) && (
              <div className="border border-blue-500/30 rounded p-8 mb-8">
                <div className="mb-4 pb-4 border-b border-blue-500/30">
                  <h2 className="text-xl font-bold text-white font-mono">⊳ SCENARIO</h2>
                </div>
                <div className="text-gray-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                  {challenge.scenario || challenge.description || 'No scenario available'}
                </div>
              </div>
            )}

            {/* Flag Submission Form */}
            <div className="border border-blue-500/30 rounded p-8">
              <form onSubmit={handleSubmit}>
                <h2 className="text-xl font-bold text-white font-mono mb-6">⊳ SUBMIT FLAG</h2>

                {result && (
                  <div
                    className={`mb-6 px-4 py-3 rounded font-mono text-sm ${
                      result.correct
                        ? 'bg-green-500/20 text-green-300 border border-green-500'
                        : 'bg-red-500/20 text-red-300 border border-red-500'
                    }`}
                  >
                    {result.message}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-blue-400 mb-2 font-mono text-sm uppercase">Flag Format</label>
                  <input
                    type="text"
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                    placeholder="flag{...}"
                    className="w-full px-4 py-3 bg-black border border-blue-500/30 rounded text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 font-mono"
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase tracking-wider"
                >
                  {submitting ? '⊳ VALIDATING...' : '⊳ SUBMIT FLAG'}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Challenge Info Card */}
            <div className="border border-blue-500/30 rounded p-6 bg-blue-500/5">
              <h3 className="text-sm font-mono text-blue-400 mb-4 uppercase">Challenge Details</h3>
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <div className="text-gray-500 text-xs uppercase mb-1">Reward</div>
                  <div className="text-yellow-400 text-2xl font-bold">{challenge.points}</div>
                  <div className="text-gray-600 text-xs">POINTS</div>
                </div>
                <div className="pt-4 border-t border-blue-500/30">
                  <div className="text-gray-500 text-xs uppercase mb-1">Your Score</div>
                  <div className="text-blue-400 text-xl font-bold">{user?.score || 0}</div>
                  <div className="text-gray-600 text-xs">TOTAL PTS</div>
                </div>
              </div>
            </div>

            {/* Navigation Card */}
            <div className="border border-blue-500/30 rounded p-6">
              <Link
                href="/challenges"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-center transition mb-3 font-mono uppercase text-sm"
              >
                ← Back to Challenges
              </Link>
              <Link
                href="/leaderboard"
                className="block w-full border border-blue-500/50 hover:border-blue-500 text-blue-400 hover:text-blue-300 font-semibold py-2 rounded text-center transition font-mono uppercase text-sm"
              >
                Tournament Ranking
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
