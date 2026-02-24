# 📁 Complete File Manifest

## Project Files Overview

### 📖 Documentation Files
Located in project root:

| File | Purpose |
|------|---------|
| `README.md` | **Main documentation** - Comprehensive setup, features, security, troubleshooting |
| `QUICK_START.md` | **Fast setup guide** - Step-by-step for local dev and testing |
| `DEPLOYMENT.md` | **Production deployment** - Vercel & Supabase setup, scaling, monitoring |
| `SETUP_COMPLETE.md` | **Completion summary** - What was built and next steps |
| `PROJECT_SUMMARY.md` | **Overview** - Quick reference of all features |
| `FILE_MANIFEST.md` | **This file** - Complete file structure reference |

### ⚙️ Configuration Files
Located in project root:

| File | Purpose | Notes |
|------|---------|-------|
| `package.json` | Dependencies & scripts | All packages installed |
| `tsconfig.json` | TypeScript configuration | Strict mode enabled |
| `next.config.ts` | Next.js configuration | Production optimized |
| `tailwind.config.ts` | Tailwind CSS configuration | Dark theme optimized |
| `.env.local` | **Creator: You** | Add your Supabase keys here |
| `.eslintrc.json` | ESLint configuration | Code quality rules |
| `.gitignore` | Git ignore rules | Protects .env.local & secrets |
| `.git/` | Git repository | Version control (after init) |

### 📁 Source Code Structure

#### `/src/app` - Next.js Pages (8 pages total)

| File | Route | Purpose | Auth Required |
|------|-------|---------|----------------|
| `layout.tsx` | N/A | Root layout wrapper | No |
| `page.tsx` | `/` | Home/landing page | No |
| `globals.css` | N/A | Tailwind styles | No |
| `login/page.tsx` | `/login` | Login page | No |
| `register/page.tsx` | `/register` | Registration page | No |
| `challenges/page.tsx` | `/challenges` | Challenges list | **Yes** |
| `challenge/[id]/page.tsx` | `/challenge/:id` | Individual challenge solver | **Yes** |
| `leaderboard/page.tsx` | `/leaderboard` | Leaderboard rankings | **Yes** |
| `admin/page.tsx` | `/admin` | Admin challenge management | **Yes - Admin only** |
| `profile/page.tsx` | `/profile` | User profile & stats | **Yes** |

#### `/src/lib` - Utilities & Configuration

| File | Purpose | Contents |
|------|---------|----------|
| `supabase/client.ts` | Supabase client | Browser-side database connection |
| `types.ts` | TypeScript interfaces | User, Challenge, Submission, LeaderboardEntry types |
| `schemas.ts` | Zod validation schemas | registerSchema, loginSchema, challengeSchema |
| `auth-context.tsx` | Auth state provider | (Reference - manage auth state if needed) |

#### `/public` - Static Assets
- `favicon.ico` - Site icon
- `next.svg` - Next.js logo (can be replaced)
- `vercel.svg` - Vercel logo (can be replaced)
- Any custom images you add

#### `/.github` - GitHub Configuration
- `workflows/` - CI/CD (optional)
- `copilot-instructions.md` - Copilot guidelines (optional)

---

## 📊 Dependencies Overview

### Production Dependencies (`package.json`)
```json
{
  "next": "16.1.6",                         // React framework
  "react": "19.2.3",                        // UI library
  "react-dom": "19.2.3",                    // React DOM
  "@supabase/supabase-js": "^2.95.3",       // Database client
  "@supabase/ssr": "^0.8.0",                // Server-side rendering
  "@supabase/auth-helpers-nextjs": "^0.15.0", // Auth middleware
  "@supabase/auth-helpers-react": "^0.15.0",  // Auth hooks
  "react-hook-form": "^7.71.1",             // Form handling
  "@hookform/resolvers": "^5.2.2",          // Form validation
  "zod": "^4.3.6",                          // Schema validation
  "axios": "^1.13.5"                        // HTTP client
}
```

### Dev Dependencies
```json
{
  "typescript": "^5",                       // Type checking
  "tailwindcss": "^4",                      // CSS framework
  "@tailwindcss/postcss": "^4",             // Tailwind PostCSS
  "eslint": "^9",                           // Code linting
  "eslint-config-next": "16.1.6"            // Next.js ESLint rules
}
```

---

## 🗄️ Database Schema

### Tables in Supabase

#### `public.users`
```sql
id              UUID PRIMARY KEY (Supabase Auth)
email           TEXT UNIQUE NOT NULL
full_name       TEXT NOT NULL
role            TEXT DEFAULT 'user' (enum: 'user', 'admin')
score           INTEGER DEFAULT 0
created_at      TIMESTAMP DEFAULT NOW()
```

#### `public.challenges`
```sql
id              UUID PRIMARY KEY
title           TEXT NOT NULL
description     TEXT NOT NULL
scenario        TEXT NOT NULL (full crime description)
difficulty      TEXT NOT NULL (enum: 'easy', 'medium', 'hard')
points          INTEGER NOT NULL
flag            TEXT NOT NULL (correct answer)
created_by      UUID FOREIGN KEY -> users.id
created_at      TIMESTAMP DEFAULT NOW()
```

#### `public.submissions`
```sql
id              UUID PRIMARY KEY
user_id         UUID NOT NULL FOREIGN KEY -> users.id
challenge_id    UUID NOT NULL FOREIGN KEY -> challenges.id
flag            TEXT NOT NULL (user's submitted answer)
is_correct      BOOLEAN DEFAULT FALSE
submitted_at    TIMESTAMP DEFAULT NOW()
```

### Indexes
- `idx_submissions_user_id` - Fast user submission lookup
- `idx_submissions_challenge_id` - Fast challenge lookup
- `idx_users_email` - Fast email lookup

---

## 🔐 Security Files

### Environment Variables (.env.local)
```env
# Public (safe to commit to GitHub)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Private (NEVER commit - in .gitignore)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### RLS Policies (in Supabase)
Each table has policies in SQL:
- `users_can_view_own` - Users see only their data
- `public_can_view_users` - Everyone sees leaderboard
- `anyone_can_view_challenges` - Everyone sees challenges
- `admin_can_manage_challenges` - Only admins modify challenges
- `users_can_view_own_submissions` - Users see their submissions
- `users_can_insert_own_submissions` - Users submit flags

---

## 📦 Build Artifacts

### After `npm run build`
```
.next/                 # Compiled Next.js application
├── cache/             # Build cache
├── static/            # Static files
└── server/            # Server components
```

### After `npm run dev`
```
.next/                 # Dev build cache (regenerates constantly)
node_modules/          # All dependencies
```

---

## 🐛 Important Sensitive Files

🔴 **NEVER commit these:**
- `.env.local` (has Supabase keys)
- `node_modules/` (Git ignores)
- `.next/` (Git ignores)
- Any files with API keys

✅ **Safe to commit:**
- Source code files
- Configuration (tsconfig, next.config)
- Documentation (README, etc)

Check `.gitignore` to verify these are protected.

---

## 📝 Code File Details

### Home Page (`src/app/page.tsx`)
- Unauthenticated landing page
- Features showcase
- Call-to-action buttons
- Navigation based on auth state

### Authentication Pages
- **Login** (`login/page.tsx`)
  - Email/password form with validation
  - Zod schema validation
  - Error messages
  - Register link

- **Register** (`register/page.tsx`)
  - Full name, email, password fields
  - Password confirmation
  - Creates user in database
  - Redirect to login after success

### Challenge Pages
- **List** (`challenges/page.tsx`)
  - Fetch all challenges
  - Display with difficulty colors
  - Link to individual challenge
  - User score display

- **Solver** (`challenge/[id]/page.tsx`)
  - Show crime scenario
  - Flag submission form
  - Score update on correct submission
  - Result feedback

### Leaderboard (`leaderboard/page.tsx`)
- Rank all users by score
- Show challenges solved
- Medal for top 3
- Real-time updates

### Admin Panel (`admin/page.tsx`)
- Create new challenges (form on left)
- List existing challenges (on right)
- Edit/delete functionality
- Only accessible to admins

### User Profile (`profile/page.tsx`)
- Display account info
- Show statistics
- Score breakdown
- Challenge count

---

## 🎯 Feature-to-File Mapping

| Feature | Main Files |
|---------|-----------|
| Authentication | `login/page.tsx`, `register/page.tsx`, `lib/schemas.ts` |
| Challenges | `challenges/page.tsx`, `challenge/[id]/page.tsx`, `admin/page.tsx` |
| Scoring | `lib/types.ts`, `challenge/[id]/page.tsx` |
| Leaderboard | `leaderboard/page.tsx` |
| Admin | `admin/page.tsx` |
| Styling | `globals.css`, `tailwind.config.ts` |
| Database | `lib/supabase/client.ts`, Supabase SQL |

---

## 🚀 Deployment Files

### For Vercel
- `next.config.ts` - Vercel reads this
- `package.json` - Dependencies
- `.env.local` → Vercel Environment Variables (set in console)

### For Supabase
- `.env.local` - Contains `NEXT_PUBLIC_SUPABASE_URL`
- Database tables (created via SQL)
- RLS policies (created via SQL)

### GitHub
- Everything except `.env.local` (protected by `.gitignore`)
- `.git/` - Version history

---

## 📋 Checklist: Verify All Files

Before deployment, verify these files exist:

**Documentation**
- [ ] README.md
- [ ] QUICK_START.md
- [ ] DEPLOYMENT.md
- [ ] PROJECT_SUMMARY.md
- [ ] FILE_MANIFEST.md

**Configuration**
- [ ] package.json
- [ ] tsconfig.json
- [ ] next.config.ts
- [ ] tailwind.config.ts
- [ ] .eslintrc.json
- [ ] .gitignore

**Pages** (8 required)
- [ ] src/app/page.tsx
- [ ] src/app/login/page.tsx
- [ ] src/app/register/page.tsx
- [ ] src/app/challenges/page.tsx
- [ ] src/app/challenge/[id]/page.tsx
- [ ] src/app/leaderboard/page.tsx
- [ ] src/app/admin/page.tsx
- [ ] src/app/profile/page.tsx

**Utilities**
- [ ] src/lib/supabase/client.ts
- [ ] src/lib/types.ts
- [ ] src/lib/schemas.ts
- [ ] src/app/layout.tsx
- [ ] src/app/globals.css

**Supabase**
- [ ] users table created
- [ ] challenges table created
- [ ] submissions table created
- [ ] RLS policies enabled
- [ ] Indexes created

**Environment**
- [ ] .env.local created (in root)
- [ ] NEXT_PUBLIC_SUPABASE_URL set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set

---

## 🎉 You Have Everything!

All files are created and ready. Your project structure is complete.

**Next step**: Read QUICK_START.md to begin!

---

**Questions about files?** Check the main documentation files or the comments in source code.
