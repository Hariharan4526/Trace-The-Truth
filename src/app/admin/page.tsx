'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { challengeSchema, type ChallengeFormData } from '@/lib/schemas'
import type { Challenge } from '@/lib/types'

export default function AdminPanel() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fileUploads, setFileUploads] = useState<File[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('challenges')
  
  // New state for real-time data
  const [completions, setCompletions] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [teamStats, setTeamStats] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [userChallengeMap, setUserChallengeMap] = useState<any>({})
  
  const itemsPerPage = 10

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
  })

  useEffect(() => {
    const filtered = challenges.filter(c => {
      const searchableText = `${c.title} ${c.task || c.description || ''}`.toLowerCase()
      return searchableText.includes(searchQuery.toLowerCase())
    })
    console.log('🔍 Filter results - Total:', challenges.length, 'Filtered:', filtered.length)
    console.log('📊 Challenges by difficulty - Easy:', challenges.filter(c => c.difficulty === 'easy').length, 'Medium:', challenges.filter(c => c.difficulty === 'medium').length, 'Hard:', challenges.filter(c => c.difficulty === 'hard').length)
    setFilteredChallenges(filtered)
    setCurrentPage(1)
  }, [searchQuery, challenges])

  const totalPages = Math.ceil(filteredChallenges.length / itemsPerPage)
  const paginatedChallenges = filteredChallenges.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const stats = {
    total: challenges.length,
    active: challenges.filter(c => c.difficulty === 'easy').length,
    medium: challenges.filter(c => c.difficulty === 'medium').length,
    hard: challenges.filter(c => c.difficulty === 'hard').length,
  }

  // Fetch real-time completion data
  const fetchCompletions = async () => {
    try {
      const response = await supabase
        .from('submissions')
        .select('*')
        .limit(50)

      console.log('RESPONSE STATUS:', response.status)
      console.log('RESPONSE ERROR:', response.error)
      console.log('RESPONSE DATA:', response.data)
      
      const { data, error } = response

      if (error) {
        console.error('ERROR MESSAGE:', error?.message)
        console.error('ERROR CODE:', error?.code)
        console.error('ERROR DETAILS:', error?.details)
        console.error('ERROR HINT:', error?.hint)
        return
      }

      if (data) {
        // Show all submissions (both correct and incorrect) - most recent first
        const sorted = [...data].reverse()
        setCompletions(sorted.slice(0, 50))
      }
    } catch (err) {
      console.error('EXCEPTION:', err)
    }
  }

  // Fetch teams data
  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')

      if (error) {
        console.error('Fetch teams error:', error)
        return
      }

      if (data) {
        setTeams(data)
        // Calculate team statistics
        const totalMembers = data.reduce((sum: number, t: any) => sum + (t.member_count || 0), 0)
        const stats = {
          totalTeams: data.length,
          activeTeams: data.length,
          totalMembers: totalMembers,
          averageMembersPerTeam: data.length > 0 ? Math.round(totalMembers / data.length) : 0,
        }
        setTeamStats(stats)
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err)
    }
  }

  // Refresh all data
  const refreshAllData = async () => {
    setRefreshing(true)
    await Promise.all([fetchCompletions(), fetchTeams()])
    setRefreshing(false)
    setSuccessMessage('Data refreshed successfully')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userData?.role !== 'admin') {
        router.push('/challenges')
        return
      }

      setUser(userData)

      try {
        const { data } = await supabase
          .from('challenges')
          .select('*')

        console.log('✅ Loaded challenges:', data?.length || 0)
        console.log('📋 Challenges data:', data)
        setChallenges(data || [])
        
        // Fetch initial data
        await fetchCompletions()
        await fetchTeams()
      } catch (err) {
        console.error('❌ Error loading challenges:', err)
        setError('Failed to load challenges')
      } finally {
        setLoading(false)
      }

      // Subscribe to real-time submission updates
      const submissionChannel = supabase
        .channel('submissions-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'submissions'
        }, () => {
          fetchCompletions()
        })
        .subscribe()

      // Subscribe to real-time teams updates
      const teamsChannel = supabase
        .channel('teams-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'teams'
        }, () => {
          fetchTeams()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(submissionChannel)
        supabase.removeChannel(teamsChannel)
      }
    }

    checkAuth()
  }, [supabase, router])

  // Enrich completions with user and challenge data
  useEffect(() => {
    const enrichCompletions = async () => {
      if (completions.length === 0) return

      const map: any = { ...userChallengeMap }
      const idsToFetch = {
        users: new Set<string>(),
        challenges: new Set<string>(),
      }

      // Collect unique IDs to fetch
      completions.forEach((comp: any) => {
        if (!map[`user_${comp.user_id}`]) {
          idsToFetch.users.add(comp.user_id)
        }
        if (!map[`challenge_${comp.challenge_id}`]) {
          idsToFetch.challenges.add(comp.challenge_id)
        }
      })

      // Fetch user data
      if (idsToFetch.users.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', Array.from(idsToFetch.users))

        users?.forEach((user: any) => {
          map[`user_${user.id}`] = user
        })
      }

      // Fetch challenge data
      if (idsToFetch.challenges.size > 0) {
        const { data: challenges } = await supabase
          .from('challenges')
          .select('id, title')
          .in('id', Array.from(idsToFetch.challenges))

        challenges?.forEach((challenge: any) => {
          map[`challenge_${challenge.id}`] = challenge
        })
      }

      setUserChallengeMap(map)
    }

    enrichCompletions()
  }, [completions, supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files)
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          setError(`File ${file.name} is too large (max 10MB)`)
          return false
        }
        return true
      })
      setError(null)
      setFileUploads(prev => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setFileUploads(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (): Promise<string[]> => {
    if (fileUploads.length === 0) return []

    const uploadedUrls: string[] = []

    try {
      setUploadingFile(true)
      for (const file of fileUploads) {
        const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`
        const { data, error: uploadError } = await supabase.storage
          .from('challenge-files')
          .upload(`challenges/${filename}`, file)

        if (uploadError) {
          setError(`File upload failed: ${file.name}`)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('challenge-files')
          .getPublicUrl(`challenges/${filename}`)

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl)
        }
      }
      return uploadedUrls
    } catch (err) {
      setError('Failed to upload files')
      return uploadedUrls
    } finally {
      setUploadingFile(false)
    }
  }

  const onSubmit = async (data: ChallengeFormData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      let fileUrls: string[] = []
      if (fileUploads.length > 0) {
        fileUrls = await uploadFiles()
        if (fileUrls.length === 0 && fileUploads.length > 0) {
          return
        }
      }

      // Map task and scenario to description and scenario fields for database compatibility
      const dbData: any = {
        title: data.title,
        description: data.task || '', // Map task to description
        scenario: data.scenario || '',
        difficulty: data.difficulty,
        points: data.points,
        flag: data.flag,
      }

      if (editingId) {
        if (fileUrls.length > 0) dbData.file_urls = JSON.stringify(fileUrls)

        const { error } = await supabase
          .from('challenges')
          .update(dbData)
          .eq('id', editingId)

        if (error) {
          setError(error.message)
          return
        }

        setChallenges(
          challenges.map((c) => (c.id === editingId ? { ...c, ...dbData } : c)),
        )
        setEditingId(null)
        setSuccessMessage('Challenge updated successfully')
      } else {
        const createData: any = {
          ...dbData,
          created_by: session.user.id,
        }
        if (fileUrls.length > 0) createData.file_urls = JSON.stringify(fileUrls)

        console.log('📝 Creating challenge:', createData)
        const { error, data: insertedData } = await supabase
          .from('challenges')
          .insert([createData])
          .select()

        if (error) {
          console.error('❌ Insert error:', error)
          setError(error.message)
          return
        }

        console.log('✅ Challenge inserted:', insertedData)
        setSuccessMessage('Challenge created successfully')

        const { data: newChallenges, error: fetchError } = await supabase
          .from('challenges')
          .select('*')
        
        console.log('✅ Refetched challenges:', newChallenges?.length || 0)
        console.log('📋 All challenges after insert:', newChallenges)
        
        if (fetchError) {
          console.error('❌ Fetch error after insert:', fetchError)
          return
        }
        
        setChallenges(newChallenges || [])
      }

      reset()
      setShowForm(false)
      setFileUploads([])
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('An error occurred')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return

    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id)

      if (error) {
        setError(error.message)
        return
      }

      setChallenges(challenges.filter((c) => c.id !== id))
      setSuccessMessage('Challenge deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to delete challenge')
    }
  }

  const handleEdit = (challenge: Challenge) => {
    setEditingId(challenge.id)
    setValue('title', challenge.title)
    // Handle old challenges that have description/scenario vs new ones with task
    setValue('task', challenge.task || challenge.description || '')
    setValue('scenario', challenge.scenario || '')
    setValue('difficulty', challenge.difficulty)
    setValue('points', challenge.points)
    setValue('flag', challenge.flag)
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingId(null)
    reset()
    setShowForm(false)
    setFileUploads([])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 border-green-500/50 text-green-400'
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
      case 'hard':
        return 'bg-red-500/20 border-red-500/50 text-red-400'
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400'
    }
  }

  const toggleChallengeAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('challenges')
        .update({ is_available: !currentStatus })
        .eq('id', id)

      if (error) {
        setError(error.message)
        return
      }

      setChallenges(
        challenges.map((c) =>
          c.id === id ? { ...c, is_available: !currentStatus } : c
        )
      )
      
      const statusText = !currentStatus ? 'enabled' : 'disabled'
      setSuccessMessage(`Challenge ${statusText} successfully`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to update challenge availability')
    }
  }

  const releaseAllChallenges = async () => {
    if (!confirm(`Release all ${challenges.length} challenges to participants?`)) return

    try {
      if (challenges.length === 0) {
        setError('No challenges to release')
        return
      }

      for (const challenge of challenges) {
        const { error } = await supabase
          .from('challenges')
          .update({ is_available: true })
          .eq('id', challenge.id)

        if (error) {
          setError(error.message)
          return
        }
      }

      setChallenges(
        challenges.map((c) => ({ ...c, is_available: true }))
      )
      
      setSuccessMessage(`All ${challenges.length} challenges released successfully`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to release all challenges')
    }
  }

  const disableAllChallenges = async () => {
    if (!confirm(`Disable all ${challenges.length} challenges for participants?`)) return

    try {
      if (challenges.length === 0) {
        setError('No challenges to disable')
        return
      }

      for (const challenge of challenges) {
        const { error } = await supabase
          .from('challenges')
          .update({ is_available: false })
          .eq('id', challenge.id)

        if (error) {
          setError(error.message)
          return
        }
      }

      setChallenges(
        challenges.map((c) => ({ ...c, is_available: false }))
      )
      
      setSuccessMessage(`All ${challenges.length} challenges disabled successfully`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to disable all challenges')
    }
  }

  // New admin actions
  const resetTeamScore = async (teamId: string) => {
    if (!confirm('Reset this team\'s score? This cannot be undone.')) return
    
    try {
      // Delete all correct submissions for this team
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('team_id', teamId)
        .eq('is_correct', true)

      if (error) {
        setError(error.message)
        return
      }

      setSuccessMessage('Team score reset successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      await fetchTeams()
    } catch (err) {
      setError('Failed to reset team score')
    }
  }

  const resetChallengesolves = async (challengeId: string) => {
    if (!confirm('Reset solve count for this challenge? This cannot be undone.')) return
    
    try {
      console.log('🔄 resetChallengesolves called for:', challengeId)
      
      // First, let's see what we're trying to delete
      const checkResponse = await supabase
        .from('submissions')
        .select('id, challenge_id, is_correct')
        .eq('challenge_id', challengeId)
        .eq('is_correct', true)
      
      console.log('📋 Submissions to delete:', checkResponse.data?.length || 0)
      console.log('📋 Check error:', checkResponse.error)
      
      const deleteResponse = await supabase
        .from('submissions')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('is_correct', true)

      console.log('📦 Delete response status:', deleteResponse.status)
      console.log('📦 Delete response count:', deleteResponse.count)
      console.log('📦 Delete response error:', deleteResponse.error)
      const { error } = deleteResponse

      if (error) {
        console.error('❌ Delete error (full):', JSON.stringify(error, null, 2))
        console.error('❌ Error message:', error?.message)
        console.error('❌ Error code:', error?.code)
        setError(error?.message || 'Failed to reset challenge solves - check RLS policies')
        return
      }

      console.log('✅ Delete successful, refreshing completions')
      setSuccessMessage('Challenge solve count reset successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      await fetchCompletions()
    } catch (err) {
      console.error('⚠️ Catch error in resetChallengesolves:', err)
      setError('Failed to reset challenge solves')
    }
  }

  const generateReport = async () => {
    try {
      const { data } = await supabase
        .from('submissions')
        .select(`
          *,
          challenges(title, points, difficulty),
          users(username, email)
        `)

      if (!data) {
        setError('No data to generate report')
        return
      }

      // Create CSV
      const headers = ['Timestamp', 'Challenge', 'Difficulty', 'Points', 'Team Member', 'Email', 'Status']
      const rows = data.map((item: any) => [
        item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A',
        item.challenges?.title || 'Unknown',
        item.challenges?.difficulty || 'N/A',
        item.challenges?.points || '0',
        item.users?.username || 'Unknown',
        item.users?.email || 'Unknown',
        item.is_correct ? 'Correct' : 'Incorrect'
      ])

      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `completions-report-${new Date().toISOString()}.csv`
      a.click()

      setSuccessMessage('Report downloaded successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to generate report')
    }
  }

  const deleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Delete team "${teamName}"? This will remove all related data.`)) return
    
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) {
        setError(error.message)
        return
      }

      setSuccessMessage(`Team "${teamName}" deleted successfully`)
      setTimeout(() => setSuccessMessage(null), 3000)
      await fetchTeams()
    } catch (err) {
      setError('Failed to delete team')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 font-mono">LOADING ADMIN TERMINAL...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <Header currentPage="admin" />

      {/* Header Bar */}
      <header className="border-b border-cyan-500/30 bg-black/50 backdrop-blur sticky top-0 z-30">
        <div className="px-8 py-4 flex justify-between items-center">
          <div>
            <p className="text-gray-400 font-mono text-xs mb-1">
              <span className="text-cyan-400">Dashboard</span>
            </p>
            <h1 className="text-2xl font-black text-white">Admin Control Panel</h1>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={refreshAllData}
              disabled={refreshing}
              className="bg-cyan-600/30 border border-cyan-500/50 hover:bg-cyan-600/50 text-cyan-400 font-mono text-sm px-4 py-2 rounded transition disabled:opacity-50"
            >
              {refreshing ? '⟳ REFRESHING...' : '⟳ REFRESH'}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-cyan-600 hover:bg-cyan-700 text-black font-mono text-sm px-4 py-2 rounded transition flex items-center gap-2"
            >
              + Add Challenge
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 border-t border-cyan-500/20 flex gap-8 bg-black/30">
          {[
            { id: 'challenges', label: '⊙ CHALLENGES' },
            { id: 'realtime', label: '◉ REAL-TIME' },
            { id: 'teams', label: '◈ TEAMS' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 font-mono text-xs uppercase transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-cyan-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <section className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Alerts */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/70 text-red-300 px-6 py-4 rounded-lg mb-6 font-mono text-sm">
                ✗ {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-500/20 border border-green-500/70 text-green-300 px-6 py-4 rounded-lg mb-6 font-mono text-sm">
                ✓ {successMessage}
              </div>
            )}

            {/* CHALLENGES TAB */}
            {activeTab === 'challenges' && (
              <>
                {/* Search and Filter */}
                <div className="mb-6 flex gap-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search challenges..."
                    className="flex-1 bg-black border border-cyan-500/30 rounded px-4 py-2 text-gray-300 placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Challenge List Header */}
                <div className="bg-black border border-cyan-500/30 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-cyan-500/30 flex justify-between items-center">
                    <h2 className="text-lg font-black text-white">Challenge List</h2>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 border border-cyan-500/30 text-gray-300 hover:text-cyan-400 font-mono text-xs rounded transition">
                        🔽 Filter
                      </button>
                      <button
                        onClick={generateReport}
                        className="px-4 py-2 border border-cyan-500/30 text-gray-300 hover:text-cyan-400 font-mono text-xs rounded transition"
                      >
                        ⬇ Export
                      </button>
                      <div className="border-l border-cyan-500/30 pl-3 flex gap-2">
                        <button
                          onClick={releaseAllChallenges}
                          className="px-4 py-2 border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 font-mono text-xs rounded transition"
                        >
                          ✓ Release All
                        </button>
                        <button
                          onClick={disableAllChallenges}
                          className="px-4 py-2 border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-mono text-xs rounded transition"
                        >
                          ✕ Disable All
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  {challenges.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-gray-400 font-mono">NO CHALLENGES YET</p>
                    </div>
                  ) : (
                    <div className="border border-cyan-500/20 rounded overflow-hidden">
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-cyan-500/10 border-b border-cyan-500/30">
                            <tr>
                              <th className="px-4 py-3 text-left text-gray-500 font-mono text-xs uppercase tracking-wider w-1/4">Challenge Title</th>
                              <th className="px-4 py-3 text-left text-gray-500 font-mono text-xs uppercase tracking-wider w-1/4">Category</th>
                              <th className="px-4 py-3 text-left text-gray-500 font-mono text-xs uppercase tracking-wider w-1/12">Points</th>
                              <th className="px-4 py-3 text-left text-gray-500 font-mono text-xs uppercase tracking-wider w-1/12">Difficulty</th>
                              <th className="px-4 py-3 text-left text-gray-500 font-mono text-xs uppercase tracking-wider w-1/12">Status</th>
                              <th className="px-4 py-3 text-left text-gray-500 font-mono text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredChallenges.map((challenge) => (
                              <tr key={challenge.id} className="border-b border-cyan-500/20 hover:bg-cyan-500/5 transition">
                                <td className="px-4 py-3">
                                  <div className="truncate">
                                    <p className="text-white font-semibold text-sm">{challenge.title}</p>
                                    <p className="text-gray-500 text-xs font-mono">ID: {challenge.id.slice(0, 8)}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-gray-300 text-xs line-clamp-2">
                                    {(challenge.task || challenge.description || 'No description').substring(0, 40)}...
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <p className="text-cyan-400 font-mono font-bold text-sm">{challenge.points}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-mono font-bold inline-block ${getDifficultyColor(challenge.difficulty)}`}>
                                    {challenge.difficulty.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => toggleChallengeAvailability(challenge.id, challenge.is_available ?? false)}
                                    className={`relative inline-block w-10 h-5 rounded-full transition border ${
                                      challenge.is_available ?? false
                                        ? 'bg-green-500/30 border-green-400'
                                        : 'bg-gray-500/30 border-gray-400'
                                    }`}
                                  >
                                    <span
                                      className={`absolute top-0.5 w-4 h-4 rounded-full transition ${
                                        challenge.is_available ?? false
                                          ? 'left-5 bg-green-400'
                                          : 'left-0.5 bg-gray-400'
                                      }`}
                                    ></span>
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => handleEdit(challenge)}
                                      className="px-2 py-1 text-xs font-mono rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition"
                                    >
                                      EDIT
                                    </button>
                                    <button
                                      onClick={() => {
                                        resetChallengesolves(challenge.id)
                                      }}
                                      className="px-2 py-1 text-xs font-mono rounded border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition"
                                    >
                                      RESET
                                    </button>
                                    <button
                                      onClick={() => handleDelete(challenge.id)}
                                      className="px-2 py-1 text-xs font-mono rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                                    >
                                      DELETE
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* REAL-TIME ACTIVITY TAB */}
            {activeTab === 'realtime' && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="cyber-card text-center">
                    <div className="cyber-label text-green-400">Challenges Solved</div>
                    <div className="text-4xl font-bold text-white mt-3">{completions.filter((c: any) => c.is_correct === true).length}</div>
                  </div>
                  <div className="cyber-card text-center">
                    <div className="cyber-label text-red-400">Attempts Made</div>
                    <div className="text-4xl font-bold text-white mt-3">{completions.filter((c: any) => c.is_correct === false).length}</div>
                  </div>
                  <div className="cyber-card text-center">
                    <div className="cyber-label text-cyan-400">Total Activity</div>
                    <div className="text-4xl font-bold text-white mt-3">{completions.length}</div>
                  </div>
                  <div className="cyber-card text-center">
                    <div className="cyber-label text-cyan-400">Success Rate</div>
                    <div className="text-4xl font-bold text-white mt-3">
                      {completions.length > 0 
                        ? Math.round((completions.filter((c: any) => c.is_correct === true).length / completions.length) * 100) 
                        : 0}%
                    </div>
                  </div>
                </div>

                <div className="cyber-card">
                  <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Recent Activity (All Attempts)</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {completions.length === 0 ? (
                      <p className="text-gray-400 font-mono text-sm text-center py-8">No activity yet</p>
                    ) : (
                      completions.map((comp: any) => {
                        const user = userChallengeMap[`user_${comp.user_id}`]
                        const challenge = userChallengeMap[`challenge_${comp.challenge_id}`]
                        const isCorrect = comp.is_correct === true
                        return (
                        <div
                          key={comp.id}
                          className={`border rounded p-4 transition ${
                            isCorrect 
                              ? 'border-green-500/20 bg-green-950/20 hover:bg-green-950/40' 
                              : 'border-red-500/20 bg-red-950/20 hover:bg-red-950/40'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={`font-mono font-bold text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                {isCorrect ? '✓ SOLVED' : '✗ ATTEMPTED'}: {challenge?.title || 'Loading...'}
                              </p>
                              <p className="text-gray-400 text-xs font-mono mt-2">
                                By: <span className={`font-semibold ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>{user?.full_name || user?.email || 'Unknown'}</span>
                              </p>
                              <p className="text-gray-500 text-xs font-mono">
                                Email: {user?.email || '-'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 font-mono text-xs">
                                {comp.created_at ? new Date(comp.created_at).toLocaleTimeString() : 'N/A'}
                              </p>
                              <p className={`text-xs font-bold mt-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </p>
                            </div>
                          </div>
                        </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TEAMS ANALYTICS TAB */}
            {activeTab === 'teams' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="cyber-card text-center">
                    <div className="cyber-label text-cyan-400">Total Teams</div>
                    <div className="text-4xl font-bold text-white mt-3">{teamStats?.totalTeams || 0}</div>
                  </div>
                  <div className="cyber-card text-center">
                    <div className="cyber-label text-green-400">Active Today</div>
                    <div className="text-4xl font-bold text-white mt-3">{teamStats?.activeTeams || 0}</div>
                  </div>
                  <div className="cyber-card text-center">
                    <div className="cyber-label text-purple-400">Total Members</div>
                    <div className="text-4xl font-bold text-white mt-3">{teamStats?.totalMembers || 0}</div>
                  </div>
                </div>

                <div className="cyber-card">
                  <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Registered Teams</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-cyan-500/30">
                          <th className="px-6 py-3 text-left text-gray-500 font-mono text-xs uppercase">Team Name</th>
                          <th className="px-6 py-3 text-left text-gray-500 font-mono text-xs uppercase">Members</th>
                          <th className="px-6 py-3 text-left text-gray-500 font-mono text-xs uppercase">Created</th>
                          <th className="px-6 py-3 text-left text-gray-500 font-mono text-xs uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-mono text-sm">
                              No teams registered
                            </td>
                          </tr>
                        ) : (
                          teams.map((team: any) => (
                            <tr key={team.id} className="border-b border-cyan-500/20 hover:bg-cyan-500/5 transition">
                              <td className="px-6 py-4 text-white font-semibold">{team.name}</td>
                              <td className="px-6 py-4 text-cyan-400 font-mono">{team.member_count || 0}</td>
                              <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                                {new Date(team.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => resetTeamScore(team.id)}
                                    className="px-3 py-1 text-xs font-mono rounded border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition"
                                  >
                                    RESET SCORE
                                  </button>
                                  <button
                                    onClick={() => deleteTeam(team.id, team.name)}
                                    className="px-3 py-1 text-xs font-mono rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                                  >
                                    DELETE
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

      {/* Add/Edit Challenge Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-black border border-cyan-500/30 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6 border-b border-cyan-500/30 pb-4">
                <h2 className="text-2xl font-black text-white">
                  {editingId ? '✎ EDIT CHALLENGE' : '⊕ NEW CHALLENGE'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    handleCancel()
                  }}
                  className="text-gray-400 hover:text-red-400 transition text-2xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <label className="text-gray-300 font-mono text-xs uppercase tracking-widest block mb-2">Challenge Title</label>
                    <input
                      {...register('title')}
                      type="text"
                      className="w-full bg-black border border-cyan-500/30 rounded px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono text-sm"
                      placeholder="Malware Analysis"
                    />
                    {errors.title && (
                      <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.title.message}</p>
                    )}
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="text-gray-300 font-mono text-xs uppercase tracking-widest block mb-2">Difficulty</label>
                    <select
                      {...register('difficulty')}
                      className="w-full bg-black border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-sm cursor-pointer"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    {errors.difficulty && (
                      <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.difficulty.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Points */}
                  <div>
                    <label className="text-gray-300 font-mono text-xs uppercase tracking-widest block mb-2">Points</label>
                    <input
                      {...register('points', { valueAsNumber: true })}
                      type="number"
                      className="w-full bg-black border border-cyan-500/30 rounded px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono text-sm"
                      placeholder="100"
                    />
                    {errors.points && (
                      <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.points.message}</p>
                    )}
                  </div>

                  {/* Flag */}
                  <div>
                    <label className="text-gray-300 font-mono text-xs uppercase tracking-widest block mb-2">Correct Flag</label>
                    <input
                      {...register('flag')}
                      type="text"
                      className="w-full bg-black border border-cyan-500/30 rounded px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono text-sm"
                      placeholder="Enter the answer"
                    />
                    {errors.flag && (
                      <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.flag.message}</p>
                    )}
                  </div>
                </div>

                {/* Task */}
                <div>
                  <label className="text-gray-300 font-mono text-xs uppercase tracking-widest block mb-2">Task</label>
                  <textarea
                    {...register('task')}
                    className="w-full bg-black border border-cyan-500/30 rounded px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono text-sm resize-none"
                    rows={6}
                    placeholder="Detailed forensic task and scenario..."
                  />
                  {errors.task && (
                    <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.task.message}</p>
                  )}
                </div>

                {/* Scenario */}
                <div>
                  <label className="text-gray-300 font-mono text-xs uppercase tracking-widest block mb-2">Scenario</label>
                  <textarea
                    {...register('scenario')}
                    className="w-full bg-black border border-cyan-500/30 rounded px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono text-sm resize-none"
                    rows={6}
                    placeholder="Additional scenario details and context..."
                  />
                  {errors.scenario && (
                    <p className="text-red-400 text-xs mt-2 font-mono">✗ {errors.scenario.message}</p>
                  )}
                </div>

                {/* Files Upload */}
                <div>
                  <label className="text-gray-300 font-mono text-xs uppercase tracking-widest block mb-2">Challenge Files (Optional)</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full bg-black border border-cyan-500/30 rounded px-4 py-2 text-gray-300 font-mono text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-mono file:bg-cyan-500/20 file:text-cyan-400 cursor-pointer"
                    accept="*/*"
                    multiple
                  />
                  {fileUploads.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-cyan-400 text-xs font-mono">SELECTED FILES:</p>
                      {fileUploads.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 rounded p-2">
                          <span className="text-cyan-400 text-xs font-mono truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-400 hover:text-red-300 transition text-xs ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-cyan-500/30">
                  <button
                    type="submit"
                    disabled={uploadingFile}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-black font-mono text-sm px-4 py-2 rounded transition disabled:opacity-50"
                  >
                    {uploadingFile ? '⊳ UPLOADING...' : editingId ? '✎ UPDATE' : '⊕ CREATE'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      handleCancel()
                    }}
                    className="px-4 py-2 rounded border border-gray-500/30 text-gray-400 hover:text-gray-300 font-mono text-sm transition"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
