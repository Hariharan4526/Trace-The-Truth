import { z } from 'zod'

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(1, 'Password is required'),
})

export const challengeSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  task: z
    .string()
    .min(20, 'Task must be at least 20 characters'),
  scenario: z
    .string()
    .min(20, 'Scenario must be at least 20 characters'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  points: z
    .number()
    .min(10, 'Points must be at least 10')
    .max(1000, 'Points must be less than 1000'),
  flag: z
    .string()
    .min(1, 'Flag is required'),
})

export type RegisterFormData = z.infer<typeof registerSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ChallengeFormData = z.infer<typeof challengeSchema>
