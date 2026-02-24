export interface User {
  id: string
  email: string
  full_name: string
  role: 'user' | 'admin'
  score: number
  team_id?: string
  created_at: string
}

export interface Team {
  id: string
  name: string
  join_code: string
  leader_id: string
  score: number
  member_count: number
  created_at: string
}

export interface TeamMember {
  id: string
  user_id: string
  team_id: string
  role: 'leader' | 'member'
  joined_at: string
}

export interface Challenge {
  id: string
  title: string
  task?: string
  scenario?: string
  description?: string // For backwards compatibility with old challenges
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  flag: string
  file_url?: string
  file_urls?: string
  is_available?: boolean
  created_at: string
  created_by: string
}

export interface Submission {
  id: string
  user_id: string
  team_id?: string
  challenge_id: string
  flag: string
  is_correct: boolean
  submitted_at: string
}

export interface LeaderboardEntry {
  team_id?: string
  team_name?: string
  user_id: string
  email: string
  full_name: string
  score: number
  solved_challenges: number
  member_count?: number
  rank: number
}
