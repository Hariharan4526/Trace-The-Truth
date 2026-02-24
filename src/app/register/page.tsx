'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/schemas'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    setError(null)

    try {
      // Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (!authData.user) {
        setError('Failed to create user')
        return
      }

      // Insert user profile into users table
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: data.email,
            full_name: data.full_name,
            role: 'user',
            score: 0,
          },
        ])

      if (insertError) {
        setError(insertError.message)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">✓</div>
          <h2 className="text-3xl font-bold text-green-400 mb-2">REGISTRATION SUCCESSFUL</h2>
          <p className="text-gray-400 font-mono mb-4">
            Your analyst account has been created. Redirecting to login...
          </p>
          <div className="text-blue-400 font-mono">
            <div className="inline-block border border-blue-500/50 rounded p-4">
              [Loading: 50%]
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      {/* Main Container */}
      <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-center gap-16 lg:gap-24">
        
        {/* LEFT SECTION - BRANDING & EVENT DETAILS */}
        <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center text-center space-y-12">
          
          {/* System Status */}
          <div className="self-start">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
              <span className="font-mono text-xs text-cyan-400 tracking-widest">SYSTEM ONLINE</span>
            </div>
          </div>

          {/* Branding Content - Centered Vertically */}
          <div className="flex flex-col items-center space-y-12">
            
            {/* Main Title */}
            <div className="space-y-2">
              <h1 className="text-7xl font-black text-white tracking-tighter" style={{
                textShadow: '0 0 20px rgba(34, 211, 238, 0.6), 0 0 40px rgba(34, 211, 238, 0.3)'
              }}>
                TRACE
              </h1>
              <h2 className="text-7xl font-black bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent tracking-tighter" style={{
                textShadow: '0 0 30px rgba(34, 211, 238, 0.8)'
              }}>
                THE TRUTH
              </h2>
              <p className="font-mono text-sm text-gray-500 tracking-widest pt-2">2026 EDITION</p>
            </div>

            {/* Event Details Box */}
            <div className="w-full max-w-sm border border-cyan-500/50 rounded-lg p-6 bg-black/80 backdrop-blur" style={{
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.2), inset 0 0 20px rgba(34, 211, 238, 0.05)'
            }}>
              <div className="font-mono text-sm text-cyan-400 mb-4">
                <span className="text-gray-500">{'>'} </span>Event_Details.log
              </div>
              <div className="space-y-3 font-mono text-xs">
                <div className="text-gray-400">
                  <span className="text-cyan-400">Target:</span> <span className="text-white ml-2">Capture The Flag (CTF)</span>
                </div>
                <div className="text-gray-400">
                  <span className="text-cyan-400">Protocol:</span> <span className="text-white ml-2">Forensic Analysis</span>
                </div>
                <div className="text-gray-400">
                  <span className="text-cyan-400">Location:</span> <span className="text-white ml-2">Global // Remote</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION - REGISTRATION FORM */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
          
          {/* Form Container - Fixed Width */}
          <div className="w-full max-w-md">
            
            {/* Form Header */}
            <div className="mb-8 text-center md:text-left">
              <h3 className="text-3xl font-bold text-white mb-2 font-mono tracking-tight">
                Initialize Sequence
              </h3>
              <p className="text-gray-400 font-mono text-sm">
                Enter your credentials to join the investigation.
              </p>
            </div>

            {/* Form Card */}
            <div className="border border-cyan-500/60 rounded-lg p-8 bg-black/50 backdrop-blur" style={{
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.15), inset 0 0 20px rgba(34, 211, 238, 0.03)'
            }}>
              {error && (
                <div className="bg-red-500/20 border border-red-500/70 text-red-300 px-4 py-3 rounded mb-6 font-mono text-sm">
                  ✗ {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Full Name Field */}
                <div>
                  <label className="block text-cyan-400 mb-2 font-mono text-xs uppercase tracking-widest">
                    {'> '} Full Name_
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/60">👤</span>
                    <input
                      {...register('full_name')}
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-black border border-cyan-500/40 rounded text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-mono text-sm transition"
                      placeholder="John Doe"
                    />
                  </div>
                  {errors.full_name && (
                    <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.full_name.message}</p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-cyan-400 mb-2 font-mono text-xs uppercase tracking-widest">
                    {'> '} Email Address_
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/60">✉️</span>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full pl-10 pr-4 py-2.5 bg-black border border-cyan-500/40 rounded text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-mono text-sm transition"
                      placeholder="hacker@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.email.message}</p>
                  )}
                </div>

                {/* College Field */}
                <div>
                  <label className="block text-cyan-400 mb-2 font-mono text-xs uppercase tracking-widest">
                    {'> '} College_ <span className="text-gray-500">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/60">✉️</span>
                    <input
                      {...register('confirm_password')}
                      type="password"
                      className="w-full pl-10 pr-4 py-2.5 bg-black border border-cyan-500/40 rounded text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-mono text-sm transition"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-cyan-400 mb-2 font-mono text-xs uppercase tracking-widest">
                    {'> '} Access Key (Password)_
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/60">🔐</span>
                    <input
                      {...register('password')}
                      type="password"
                      className="w-full pl-10 pr-4 py-2.5 bg-black border border-cyan-500/40 rounded text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-mono text-sm transition"
                      placeholder="••••••••••••••"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-cyan-400 mb-2 font-mono text-xs uppercase tracking-widest">
                    {'> '} Confirm Access Key_
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/60">🔐</span>
                    <input
                      {...register('confirm_password')}
                      type="password"
                      className="w-full pl-10 pr-4 py-2.5 bg-black border border-cyan-500/40 rounded text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-mono text-sm transition"
                      placeholder="••••••••••••••"
                    />
                  </div>
                  {errors.confirm_password && (
                    <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.confirm_password.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase text-sm tracking-widest mt-8"
                  style={{
                    boxShadow: loading ? 'none' : '0 0 15px rgba(34, 211, 238, 0.6), inset 0 0 10px rgba(255,255,255,0.1)'
                  }}
                >
                  {loading ? '⊳ PROCESSING...' : '⊳ INITIATE REGISTRATION'}
                </button>
              </form>

              {/* Footer Links */}
              <div className="mt-8 pt-6 border-t border-cyan-500/30 text-center">
                <p className="text-gray-500 font-mono text-xs mb-3">
                  Already possess an access key?
                </p>
                <Link 
                  href="/login" 
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-sm transition"
                >
                  {'> '} Log in to Console
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
