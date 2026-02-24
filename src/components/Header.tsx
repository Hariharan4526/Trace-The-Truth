'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

export default function Header({ currentPage }: { currentPage: 'challenges' | 'leaderboard' | 'profile' | 'teams' | 'home' | 'admin' }) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setUser(userData)
      }
      setLoading(false)
    }
    checkAuth()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (page: string) => currentPage === page ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-300 hover:text-cyan-400'

  if (loading) {
    return null
  }

  return (
    <nav className="border-b border-cyan-500/30 bg-black/50 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-lg font-black text-white hover:text-cyan-400 transition tracking-widest">
            ⚔ TRACE THE TRUTH
          </Link>

          {/* Navigation Links */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-8 text-sm">
              <Link href="/leaderboard" className={`font-mono transition pb-1 ${isActive('leaderboard')}`}>
                LEADERBOARD
              </Link>
              {user?.team_id ? (
                <>
                  <Link href="/challenges" className={`font-mono transition pb-1 ${isActive('challenges')}`}>
                    CHALLENGES
                  </Link>
                  <Link href="/profile" className={`font-mono transition pb-1 ${isActive('profile')}`}>
                    PROFILE
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-gray-500 font-mono pb-1 cursor-not-allowed opacity-50" title="Join a team to access">
                    CHALLENGES
                  </span>
                  <span className="text-gray-500 font-mono pb-1 cursor-not-allowed opacity-50" title="Join a team to access">
                    PROFILE
                  </span>
                </>
              )}

              {/* Admin Link */}
              {user?.role === 'admin' && (
                <>
                  <span className="text-gray-500">|</span>
                  <Link href="/admin" className={`font-mono transition pb-1 ${isActive('admin')}`}>
                    [ADMIN]
                  </Link>
                </>
              )}

              {/* Logout Button */}
              <span className="text-gray-500">|</span>
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:text-red-400 transition font-mono pb-1"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-6 text-sm">
              <Link href="/login" className="text-gray-300 hover:text-cyan-400 transition font-mono">
                LOGIN
              </Link>
              <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-mono transition">
                REGISTER
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

