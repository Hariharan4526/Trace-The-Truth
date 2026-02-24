'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/schemas'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      router.push('/challenges')
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        {/* Header */}
        <div className="mb-12 text-center border-b border-cyan-500/30 pb-8">
          <div className="system-status justify-center mb-4">
            <span>SECURITY INITIALIZED</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-3 tracking-tight">
            ACCESS POINT
          </h1>
          <p className="terminal-text">AUTHENTICATION REQUIRED</p>
        </div>

        {/* Form Card */}
        <div className="cyber-container">
          {error && (
            <div className="bg-red-500/20 border border-red-500/70 text-red-300 px-4 py-3 rounded-lg mb-6 font-mono text-sm">
              ✗ {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="cyber-label">Email Address_</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/60">✉️</span>
                <input
                  {...register('email')}
                  type="email"
                  className="cyber-input pl-10"
                  placeholder="analyst@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="cyber-label">Access Key_</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/60">🔐</span>
                <input
                  {...register('password')}
                  type="password"
                  className="cyber-input pl-10"
                  placeholder="••••••••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="cyber-btn w-full mt-8"
            >
              {loading ? '⊳ AUTHENTICATING...' : '⊳ AUTHENTICATE'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-cyan-500/30 text-center">
            <p className="terminal-text mb-4">NO ACCESS YET?</p>
            <Link 
              href="/register" 
              className="cyber-link font-mono text-sm transition"
            >
              {'> '} Initialize Registration
            </Link>
          </div>
        </div>

        {/* System Footer */}
        <div className="mt-12 text-center text-gray-500 font-mono text-xs space-y-1">
          <p>[SYS] VER: 2.0.0 | SECURE</p>
          <p>[ENV] PRODUCTION | ENCRYPTED</p>
        </div>
      </div>
    </div>
  )
}
