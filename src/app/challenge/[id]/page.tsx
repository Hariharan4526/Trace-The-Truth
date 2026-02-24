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
          message: `🎉 Correct! You earned ${challenge?.points} points!`,
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-2xl font-bold text-white">Loading challenge...</div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-red-400 mb-4">{error}</p>
          <Link href="/challenges" className="text-blue-400 hover:text-blue-300">
            ← Back to Challenges
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400">
              🔍 Digital Forensics
            </Link>
            <div className="space-x-4">
              <Link href="/challenges" className="text-white hover:text-blue-400 transition">
                Challenges
              </Link>
              <span className="text-white font-semibold">Score: {user?.score || 0}</span>
              <button onClick={handleLogout} className="text-white hover:text-red-400 transition">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/challenges" className="text-blue-400 hover:text-blue-300 mb-8 inline-block">
          ← Back to Challenges
        </Link>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">{challenge.title}</h1>
              <div className="flex gap-4 mt-6">
                <span className="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500 rounded-lg capitalize font-semibold">
                  {challenge.difficulty}
                </span>
                <span className="px-4 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500 rounded-lg font-semibold">
                  {challenge.points} Points
                </span>
              </div>
            </div>
          </div>

          {/* Challenge Files */}
          {challenge.file_url && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📁 Challenge Files</h2>
              <p className="text-gray-300 mb-4">Download the evidence files to analyze:</p>
              <a
                href={challenge.file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
              >
                ⬇️ Download File
              </a>
            </div>
          )}

          {/* Case Details */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">📋 Task</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{challenge.task || challenge.description || challenge.scenario || 'No details available'}</p>
          </div>

          {/* Scenario */}
          {(challenge.scenario || challenge.description) && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📋 Scenario</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{challenge.scenario || challenge.description || 'No scenario available'}</p>
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
              <label className="block text-white mb-2 font-bold text-lg">
                🚩 Submit Your Flag
              </label>
              <p className="text-gray-400 mb-3">
                Find the flag hidden in the scenario and submit it below
              </p>
              <input
                type="text"
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                placeholder="flag{...}"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || result?.correct}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : result?.correct ? '✅ Solved!' : 'Submit Flag'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
