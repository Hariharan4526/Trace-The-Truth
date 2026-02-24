# Vercel and Supabase Deployment Guide

## Free Hosting Platforms Recommended

### 🚀 Vercel (Frontend Hosting)
- **Cost**: Free tier available
- **Features**: Serverless functions, edge computing, CI/CD
- **Ideal for**: Next.js applications (official platform)
- **Deploy**: https://vercel.com
- **Free Tier Includes**: 
  - Unlimited deployments
  - Automatic HTTPS
  - 100GB bandwidth per month
  - Environment variables
  - Custom domains

### 🗄️ Supabase (Database & Backend)
- **Cost**: Free tier available
- **Features**: PostgreSQL database, real-time features, auth
- **Deploy**: https://supabase.com
- **Free Tier Includes**:
  - 500MB database storage
  - Up to 50 concurrent connections
  - 2GB bandwidth per day
  - Real-time and Vector features
  - Email auth (rate limited)

## Step-by-Step Deployment

### Phase 1: Supabase Setup (5-10 minutes)

#### 1. Create Supabase Project
1. Visit https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - **Project name**: `forensics-event`
   - **Database password**: Use strong password
   - **Region**: Choose closest to you
5. Wait for provisioning (2-3 minutes)

#### 2. Copy API Keys
1. Go to Settings → API
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

#### 3. Create Database Tables

1. Go to SQL Editor
2. Create new query
3. Copy and paste all SQL queries from README.md
4. Run each query block

**Critical: Enable RLS on all tables** - Follow the steps in README.md

#### 4. Test Authentication
1. Go to Auth → Users
2. Create a test user
3. Set their role to admin:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'test@example.com';
```

### Phase 2: GitHub Repository Setup (5 minutes)

#### 1. Initialize Git
```bash
cd /path/to/forensics-event
git init
git add .
git commit -m "Initial commit: Digital Forensics Event"
```

#### 2. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `forensics-event`
3. Description: `Digital forensics challenge platform`
4. Make it Public (for Vercel free tier)
5. Click "Create repository"

#### 3. Push Code
```bash
git remote add origin https://github.com/YOUR_USERNAME/forensics-event.git
git branch -M main
git push -u origin main
```

### Phase 3: Vercel Deployment (5-10 minutes)

#### 1. Connect to GitHub
1. Visit https://vercel.com
2. Sign up with GitHub (recommended)
3. Click "New Project"
4. Select your GitHub account
5. Search and select `forensics-event`
6. Click "Import"

#### 2. Configure Environment Variables
In Vercel Project Settings:

1. Go to Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key

**Important**: Use "Production" environment for all

#### 3. Deploy
1. Click "Deploy"
2. Wait for build to complete (3-5 minutes)
3. View production URL

#### 4. Set Custom Domain (Optional)
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records following Vercel's instructions

### Phase 4: Post-Deployment Verification

#### 1. Test the Website
1. Visit your deployed URL
2. Register a new account
3. Verify email functionality
4. Log in
5. Test challenge submission

#### 2. Setup Admin Access
1. Register your admin account
2. In Supabase SQL Editor, run:
```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@domain.com';
```

#### 3. Create Sample Challenges
1. Log in as admin
2. Go to Admin Panel
3. Create 2-3 sample challenges

#### 4. Monitor Performance
1. Vercel Dashboard → Deployments → Analytics
2. Supabase Dashboard → Database → Usage
3. Set up alerts if needed

## Advanced Configuration

### Custom Domain Setup
```
Vercel:
1. Go to Settings → Domains
2. Click "Add Domain"
3. Enter your domain
4. Update DNS records (Vercel shows instructions)

DNS Example (GoDaddy, Namecheap, etc.):
- Use Vercel's provided DNS records
- Wait 24-48 hours for propagation
```

### Environment-Specific Configuration

**.env.local** (Local Development)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Vercel Environment Variables** (Production)
Same as above, added through Vercel console

### Database Maintenance

#### Regular Backups
```sql
-- Supabase automatically backs up daily (free tier keeps 7 days)
-- Manual export:
1. Dashboard → Database → Backups
2. Click "Request backup"
3. Download when ready
```

#### Clear Old Data
```sql
-- Delete old submissions (before specific date):
DELETE FROM submissions 
WHERE submitted_at < NOW() - INTERVAL '30 days';

-- Check table sizes:
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public';
```

### Performance Optimization

#### Add Database Indexes
```sql
-- Already included in setup, but review:
CREATE INDEX idx_users_score ON users(score DESC);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_submissions_timestamp ON submissions(submitted_at DESC);
```

#### Enable Caching in Vercel
```javascript
// next.config.js
module.exports = {
  headers: async () => {
    return [
      {
        source: '/api/challenges',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
    ]
  },
}
```

## Troubleshooting Deployment

### Vercel Build Fails
**Solution:**
```bash
# Check build logs in Vercel
# Run locally:
npm run build
npm run start

# Common issues:
# 1. Node version: Update to 18+
# 2. Missing env vars: Add to Vercel console
# 3. Dependency issues: Delete node_modules, reinstall
```

### Supabase Connection Issues
**Solution:**
```bash
# Check connection string
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test from browser console:
const supabase = createClient(URL, KEY)
const { data } = await supabase.auth.getSession()
console.log(data)
```

### Database Queries Timing Out
**Solution:**
```sql
-- Add indexes for slow queries:
CREATE INDEX idx_challenge_lookup ON challenges(id, difficulty);

-- Check query performance:
EXPLAIN ANALYZE SELECT * FROM challenges;

-- Optimize RLS policies - they can slow queries:
-- Review in RLS tab and consider caching
```

### Emails Not Sending
**Solution:**
```sql
-- Check Supabase auth settings
1. Go to Auth → Templates
2. Verify email templates are enabled
3. Check SMTP configuration

-- For custom domain emails:
1. Add verified domain to Supabase
2. Update link in email template
3. Test with small email
```

## Scaling Beyond Free Tier

### When to Upgrade

**Vercel Pro ($20/month):**
- After 100K requests/month
- Need faster deployments
- Want priority support

**Supabase Pro ($25/month):**
- After 2GB storage
- More than 100 concurrent connections
- High-frequency database operations

### Migration Steps
1. Upgrade plan in respective dashboards
2. No code changes needed
3. Automatic scaling

## Monitoring & Maintenance

### Weekly Checklist
- [ ] Check Vercel analytics for errors
- [ ] Monitor Supabase database usage
- [ ] Review user registrations
- [ ] Check leaderboard updates

### Monthly Tasks
- [ ] Backup database
- [ ] Review and optimize slow queries
- [ ] Update dependencies
- [ ] Check for security updates

### Logs Access
**Vercel Logs:**
```bash
# View deployment logs
vercel logs
vercel logs --follow
```

**Supabase Logs:**
1. Dashboard → Logs → Function Invocations
2. Database → Inspector
3. Realtime → Stats

## Additional Resources

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.io/docs
- Next.js Deployment: https://nextjs.org/learn/basics/deploying-nextjs-app
- Environment Variables: https://vercel.com/docs/environment-variables

## Quick Start Checklist

- [ ] Supabase project created
- [ ] Database tables created
- [ ] RLS policies enabled
- [ ] Environment variables copied
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Vercel environment variables set
- [ ] Deployment successful
- [ ] Website accessible
- [ ] Admin user created
- [ ] Sample challenges added
- [ ] Email verification working
- [ ] Leaderboard loading
- [ ] Admin panel accessible

## Support

Need help?
1. Check README.md for detailed setup
2. Review error messages in console
3. Check Vercel & Supabase status pages
4. Search GitHub issues
5. Ask in community forums

Good luck with your Digital Forensics Event! 🔍
