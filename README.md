# Digital Forensics Event Website

A complete web platform for hosting digital forensics challenges with authentication, leaderboard, admin panel, and crime scenario-based challenges.

## Features

✅ **User Authentication**
- Email verification
- Secure password handling with Zod validation
- Session management with Supabase Auth

✅ **Challenge Management**
- Create, edit, and delete challenges
- Multiple difficulty levels (Easy, Medium, Hard)
- Point-based scoring system
- Crime scenario descriptions

✅ **Leaderboard System**
- Real-time ranking
- Score tracking
- Challenge completion count
- Top performers display

✅ **Admin Panel**
- Full CRUD operations for challenges
- Admin-only panel with role-based access
- Challenge management interface

✅ **User Profiles**
- User statistics
- Score tracking
- Challenge completion history

✅ **Responsive Design**
- Mobile-friendly UI
- Dark theme optimized for long sessions
- Tailwind CSS styling

## Tech Stack

- **Frontend**: Next.js 14+ with React
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Validation**: Zod + React Hook Form
- **Hosting**: Vercel
- **Language**: TypeScript

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Home page
│   ├── login/page.tsx       # Login page
│   ├── register/page.tsx    # Registration page
│   ├── challenges/page.tsx  # Challenges list
│   ├── challenge/[id]/page.tsx # Individual challenge
│   ├── leaderboard/page.tsx # Leaderboard
│   ├── admin/page.tsx       # Admin panel
│   ├── profile/page.tsx     # User profile
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── lib/
│   ├── supabase/
│   │   └── client.ts        # Supabase client
│   ├── auth-context.tsx     # Auth context provider
│   ├── types.ts             # TypeScript types
│   └── schemas.ts           # Zod validation schemas
└── public/                  # Static assets
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account
- Vercel account

### 2. Supabase Configuration

#### Create Tables

Run these SQL queries in your Supabase dashboard (SQL Editor):

```sql
-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Challenges table
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

-- Submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  flag TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX idx_submissions_challenge_id ON public.submissions(challenge_id);
CREATE INDEX idx_users_email ON public.users(email);
```

#### Enable Row Level Security (RLS)

```sql
-- Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can see their own data
CREATE POLICY "users_can_view_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "users_can_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Public can view all user profiles (for leaderboard)
CREATE POLICY "public_can_view_users" ON public.users
  FOR SELECT USING (true);

-- Challenges table
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can view challenges
CREATE POLICY "anyone_can_view_challenges" ON public.challenges
  FOR SELECT USING (true);

-- Only admins can insert/update/delete challenges
CREATE POLICY "admin_can_manage_challenges" ON public.challenges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Submissions table
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "users_can_view_own_submissions" ON public.submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "users_can_insert_own_submissions" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 3. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these values from:
- Supabase Project Settings → API
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are public
- `SUPABASE_SERVICE_ROLE_KEY` is private (never commit this)

### 4. Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
```

### 5. Create Admin User

1. Register a new account in the app
2. Go to Supabase dashboard → SQL Editor
3. Update the user role to admin:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';
```

## Deployment to Vercel

### 1. Connect GitHub Repository

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select your GitHub repository
5. Click "Import"

### 2. Configure Environment Variables

In Vercel Dashboard Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Deploy

Click "Deploy" - Vercel will automatically build and deploy your application.

Your site will be available at: `https://your-project.vercel.app`

## Creating Sample Challenges

Log in as admin and use the Admin Panel to create challenges:

**Example Challenge 1:**
- Title: "The Lost Email"
- Description: "Find the hidden flag in the email metadata"
- Scenario: "A corporate employee suspects an email was tampered with. Analyze the email headers and find the hidden flag in the X-Custom-Header field."
- Difficulty: Easy
- Points: 100
- Flag: `flag{email_header_analysis}`

**Example Challenge 2:**
- Title: "Network Breach Investigation"
- Description: "Investigate suspicious network traffic"
- Scenario: "Our network was compromised. Analyze the packet capture log and find the command executed by the attacker: 'exfiltrate -target admin -port 4444'"
- Difficulty: Hard
- Points: 250
- Flag: `flag{exfiltrate_admin_4444}`

## API Endpoints

The application uses Supabase for backend operations:

- `POST /auth/signup` - Register new user
- `POST /auth/signin` - Login user
- `POST /auth/signout` - Logout user
- `GET /users` - Get user info
- `GET /challenges` - Get all challenges
- `POST /challenges` - Create challenge (admin only)
- `PUT /challenges/{id}` - Update challenge (admin only)
- `DELETE /challenges/{id}` - Delete challenge (admin only)
- `GET /submissions` - Get user submissions
- `POST /submissions` - Submit flag

## Database Schema

### Users Table
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key (Supabase Auth) |
| email | TEXT | User email |
| full_name | TEXT | User full name |
| role | TEXT | 'user' or 'admin' |
| score | INTEGER | Total points earned |
| created_at | TIMESTAMP | Account creation time |

### Challenges Table
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| title | TEXT | Challenge title |
| description | TEXT | Short description |
| scenario | TEXT | Full scenario details |
| difficulty | TEXT | 'easy', 'medium', or 'hard' |
| points | INTEGER | Points awarded for solving |
| flag | TEXT | Correct flag answer |
| created_by | UUID | Admin who created it |
| created_at | TIMESTAMP | Creation time |

### Submissions Table
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | User who submitted |
| challenge_id | UUID | Challenge being solved |
| flag | TEXT | Submitted flag |
| is_correct | BOOLEAN | Whether flag is correct |
| submitted_at | TIMESTAMP | Submission time |

## Security Features

✅ **Authentication**
- Supabase Auth with email verification
- Hashed password storage
- Session tokens with expiration

✅ **Authorization**
- Row Level Security (RLS) policies
- Role-based access control (Admin/User)
- Admin-only operations protected

✅ **Data Protection**
- Encrypted database connection
- HTTPS-only communication
- Secure flag storage

✅ **Input Validation**
- Zod schema validation
- React Hook Form integration
- XSS protection via React

## Troubleshooting

### Users can't log in
- Check Supabase Auth is enabled
- Verify database tables are created
- Check environment variables are set correctly

### Admin panel not accessible
- Ensure user role is set to 'admin' in database
- Check RLS policies are configured correctly

### Challenges not loading
- Verify challenges table has data
- Check RLS policies allow SELECT
- Review browser console for errors

### Vercel deployment fails
- Ensure all environment variables are set
- Check Node.js version is 18+
- Review build logs for specific errors

## Support

For issues with:
- **Supabase**: https://supabase.io/docs
- **Next.js**: https://nextjs.org/docs
- **Vercel**: https://vercel.com/docs

## License

MIT License - Feel free to use this for your digital forensics event!

## Future Enhancements

- [ ] Real-time challenge hints
- [ ] Challenge categories
- [ ] Team competitions
- [ ] Achievement badges
- [ ] Email notifications
- [ ] Challenge difficulty adjustments
- [ ] Automated scoring adjustments
- [ ] Analytics dashboard

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
