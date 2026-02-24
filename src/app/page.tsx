'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setLoading(false)
    }
    checkAuth()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xl font-bold text-cyan-400 font-mono">INITIALIZING SYSTEM...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <Header currentPage="home" />

      {/* Main Content */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-4xl fade-in">
          <div className="system-status justify-center mb-6">
            <span>SYSTEM ONLINE</span>
          </div>
          
          <h2 className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tight">
            INITIALIZE OPERATION
          </h2>
          
          <p className="text-gray-400 mb-12 text-lg max-w-2xl mx-auto font-light leading-relaxed">
            Establish a new tactical unit or sync with an existing squad to begin the investigation. Your expertise is required.
          </p>

          {isAuthenticated ? (
            <>
              {/* Proceed to Challenges */}
              <Link href="/challenges" className="cyber-btn">
                ⊳ ENTER CHALLENGES
              </Link>
            </>
          ) : (
            <>
              {/* Auth CTA */}
              <div className="space-y-6 mt-12">
                <p className="text-gray-400 mb-8">AUTHORIZATION REQUIRED</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/login" className="cyber-btn">
                    ⊳ SIGN IN
                  </Link>
                  <Link href="/register" className="cyber-btn-secondary">
                    ⊕ CREATE ACCOUNT
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-cyan-500/30 bg-black/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center font-mono text-xs text-gray-500 space-y-1">
          <p>[VER] 2.0.0 | [STATUS] SECURE | [ENCRYPTION] ACTIVE</p>
          <p>TRACE THE TRUTH © 2026 - DIGITAL FORENSICS EVENT</p>
        </div>
      </section>
    </div>
  )
}
