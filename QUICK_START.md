# Digital Forensics Event - Setup Instructions

## 📋 Quick Start Guide

This guide will help you set up your Digital Forensics Event website locally and deploy it to production.

## ✅ Prerequisites

Before starting, make sure you have:

- **Node.js 18+** - [Download](https://nodejs.org)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com)
- **GitHub Account** - [Sign up](https://github.com)
- **Supabase Account** - [Free](https://supabase.com)
- **Vercel Account** - [Free](https://vercel.com)

## 🚀 Local Development (5 minutes)

### 1. Install Dependencies
```bash
cd forensics-event
npm install
```

### 2. Create Environment File
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🗄️ Supabase Setup (10 minutes)

### 1. Create Project
- Go to [supabase.com](https://supabase.com)
- Sign up/login
- Click "New Project"
- Enter project name: `forensics-event`
- Create strong password
- Select your region
- Wait 2-3 minutes for setup

### 2. Create Database Tables

Go to **SQL Editor** and paste each section:

```sql
-- Users Table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Challenges Table
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  scenario TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
  points INTEGER NOT NULL,
  flag TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Submissions Table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  flag TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX idx_submissions_challenge_id ON public.submissions(challenge_id);
```

### 3. Enable Row Level Security

```sql
-- Users RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "public_can_view_users" ON public.users
  FOR SELECT USING (true);

-- Challenges RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_view_challenges" ON public.challenges
  FOR SELECT USING (true);

CREATE POLICY "admin_can_manage_challenges" ON public.challenges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Submissions RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_submissions" ON public.submissions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_can_insert_own_submissions" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 4. Get API Keys
- Go to **Settings → API**
- Copy `Project URL` and `anon public` key
- Add to `.env.local`

## 📝 Testing Locally

### 1. Register Test Account
- Go to http://localhost:3000
- Click "Register"
- Create test account

### 2. Make Admin
In Supabase SQL Editor:
```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### 3. Create Sample Challenge
- Login as admin
- Go to Admin Panel
- Create challenge with:
  - Title: "Test Challenge"
  - Description: "This is a test"
  - Scenario: "Find the flag: flag{test123}"
  - Difficulty: Easy
  - Points: 100
  - Flag: `flag{test123}`

### 4. Test Flow
- Logout
- Go to Challenges
- Try to solve the challenge
- Submit: `flag{test123}`
- Verify score updated in leaderboard

## 🌍 Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/forensics-event.git
git branch -M main
git push -u origin main
```

### 2. Deploy
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Select GitHub repository
- Click "Import"

### 3. Add Environment Variables
In Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Deploy
- Click "Deploy"
- Wait 3-5 minutes
- Visit your live site!

## 🎯 Next Steps

### Add More Challenges
1. Login as admin
2. Go to Admin Panel
3. Create challenges with:
   - Different difficulty levels
   - Realistic crime scenarios
   - Hidden flags in scenario descriptions

### Customize
- Update logo/theme in `src/app/globals.css`
- Change colors in Tailwind config
- Add custom favicon to `public/`

### Invite Users
- Share your Vercel URL
- Users can register and start playing
- Track standings on leaderboard

## 🔒 Security Checklist

- [ ] All environment variables set in Vercel
- [ ] Supabase RLS policies configured
- [ ] Admin users properly defined
- [ ] Flags are not visible in client code
- [ ] Passwords hashed by Supabase
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Backup enabled in Supabase

## 📊 Monitoring

### Check Deployment
```bash
# View Vercel logs
vercel logs --follow

# Visit deployed URL
https://your-project.vercel.app
```

### Database Queries
In Supabase SQL Editor:
```sql
-- Check total users
SELECT COUNT(*) FROM users;

-- Check submissions
SELECT COUNT(*) FROM submissions WHERE is_correct = true;

-- Top scores
SELECT email, score FROM users ORDER BY score DESC LIMIT 10;
```

## 🆘 Troubleshooting

### Can't Login
- Check email/password correct
- Verify user exists in Supabase
- Clear browser cache

### Admin Panel Not Showing
- Check user role in database
- Must be set to 'admin'
- Refresh page after updating

### Challenges Not Loading
- Verify tables created in Supabase
- Check RLS policies
- Look at browser console errors

### Build Fails
```bash
# Try locally:
npm run build
npm run start

# Check node version:
node --version  # Should be 18+

# Update dependencies:
npm install
npm audit fix
```

## 📚 Documentation

- [README.md](./README.md) - Full documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [Supabase Docs](https://supabase.io/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)

## 💡 Tips

1. **Test Everything** - Locally before deploying
2. **Strong Passwords** - Use 12+ character passwords
3. **Backup Data** - Export Supabase backups weekly
4. **Monitor Usage** - Check Supabase and Vercel dashboards
5. **Keep Updated** - Run `npm update` monthly

## 📞 Support

- Check README.md for comprehensive guide
- Review error messages in browser console
- Check Vercel deployment logs
- Search GitHub issues: https://github.com/issues
- Supabase community: https://github.com/supabase/supabase/discussions

## 🎉 You're Ready!

Your Digital Forensics Event website is now live! Start adding challenges and inviting participants.

Happy forensic analyzing! 🔍
