# Team Feature Setup Guide

## Overview
Your forensics event platform now supports **team-based competition** with 3 members per squad. One member acts as the squad leader, and the other two join using the generated access code.

---

## Database Setup

### Step 1: Run SQL Migration

Go to your **Supabase Dashboard** → **SQL Editor** and execute the SQL script:

```bash
docs/DATABASE_MIGRATION_TEAMS.sql
```

Or manually run these commands:

```sql
-- Teams Table
CREATE TABLE "public"."teams" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "join_code" VARCHAR(6) NOT NULL UNIQUE,
  "leader_id" UUID NOT NULL REFERENCES "public"."users"(id) ON DELETE CASCADE,
  "score" INTEGER NOT NULL DEFAULT 0,
  "member_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members Table
CREATE TABLE "public"."team_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "public"."users"(id) ON DELETE CASCADE,
  "team_id" UUID NOT NULL REFERENCES "public"."teams"(id) ON DELETE CASCADE,
  "role" VARCHAR(20) NOT NULL DEFAULT 'member',
  "joined_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "team_id")
);

-- Update Users Table to add team_id column
ALTER TABLE "public"."users" ADD COLUMN "team_id" UUID REFERENCES "public"."teams"(id) ON DELETE SET NULL;

-- Update Submissions Table to track team submissions
ALTER TABLE "public"."submissions" ADD COLUMN "team_id" UUID REFERENCES "public"."teams"(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX "idx_teams_join_code" ON "public"."teams"("join_code");
CREATE INDEX "idx_teams_leader_id" ON "public"."teams"("leader_id");
CREATE INDEX "idx_team_members_user_id" ON "public"."team_members"("user_id");
CREATE INDEX "idx_team_members_team_id" ON "public"."team_members"("team_id");
CREATE INDEX "idx_users_team_id" ON "public"."users"("team_id");
CREATE INDEX "idx_submissions_team_id" ON "public"."submissions"("team_id");

-- Enable RLS
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Teams table
CREATE POLICY "allow_read_all_teams"
ON "public"."teams"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "allow_leader_update_own_team"
ON "public"."teams"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = leader_id)
WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "allow_leader_insert_team"
ON "public"."teams"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = leader_id);

-- RLS Policies for Team Members table
CREATE POLICY "allow_read_team_members"
ON "public"."team_members"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "allow_insert_team_member"
ON "public"."team_members"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR (SELECT leader_id FROM teams WHERE id = team_id) = auth.uid());
```

### Step 2: Verify Tables Created
In Supabase Dashboard, go to **Table Editor** and confirm these new tables exist:
- ✅ `teams`
- ✅ `team_members`

---

## User Flow

### 1. **Registration & Login**
```
Register → Login → Home Page
```

### 2. **Create Squad (Team Leader)**
```
Home Page
  ↓
Click "Create Squad"
  ↓
Enter Squad Name
  ↓
Redirected to Squad Dashboard
  ↓
View Auto-Generated Access Code
  ↓
Share Code with 2 Other Members
```

### 3. **Join Squad (Team Members)**
```
Home Page
  ↓
Click "Join Squad"
  ↓
Enter Access Code (from leader)
  ↓
Redirected to Squad Dashboard
  ↓
Ready to Solve Challenges as Team
```

### 4. **Solve Challenges**
```
All squad members access challenges
  ↓
Any member solves challenge → Earns points
  ↓
Points contribute to SQUAD SCORE
  ↓
View Leaderboard (sorted by squad scores)
```

---

## Features Implemented

### ✅ Squad Creation
- **Leader** creates a squad with a name
- Auto-generates a 6-character alphanumeric access code
- Leader becomes the squad leader

### ✅ Squad Joining
- **Members** join using the access code
- Max 3 members per squad (1 leader + 2 members)
- Automatic team_id assignment

### ✅ Squad Dashboard
- View squad members and roles
- Display combined squad score
- Show member count (X/3)
- Copy access code button (leader only)
- Quick links to challenges and leaderboard

### ✅ Team-Based Leaderboard
- Rankings sorted by squad score
- Display squad name, leader name, member count
- Medal icons for top 3 squads (🥇 🥈 🥉)
- Statistics: Total Squads, Avg Score, Total Points

### ✅ Challenge Submissions
- Individual members solve challenges
- Points automatically added to squad score
- Team score = sum of all member scores

---

## API Routes/Endpoints

### Pages Created:
```
/                      - Home (with team creation/join options)
/team/create           - Create squad form
/team/join             - Join squad with code
/team/[id]             - Squad dashboard
/leaderboard           - Team-based rankings
```

### Database Operations:
- `teams` - Create, Read, Update
- `team_members` - Add members, Read roster
- `users` - Update team_id on registration
- `submissions` - Track team submissions

---

## Testing Checklist

- [ ] **Register 3 users**: User A, User B, User C
- [ ] **User A creates squad**: Name it "Test Squad"
- [ ] **Copy access code** from dashboard
- [ ] **User B joins**: Use access code → Joins successfully
- [ ] **User C joins**: Use same code → Joins successfully
- [ ] **Verify team dashboard**: Shows 3/3 members
- [ ] **User A solves challenge**: +100 points
- [ ] **Check squad score**: Shows 100 points total
- [ ] **View leaderboard**: "Test Squad" appears with correct score
- [ ] **Another user creates squad**: New squad appears on leaderboard

---

## Important Notes

### Score Calculation
- When a member solves a challenge: `user.score += points` AND `team.score += points`
- Leaderboard shows **team.score** for rankings
- Each member contributing strengthens the squad

### Access Codes
- Format: 6 uppercase alphanumeric (e.g., `A3B9C2`)
- Auto-generated on squad creation
- Unique per squad
- Cannot join if squad is full (3/3 members)

### Permissions
- Only squad leader can view/copy access code
- Only authenticated users can create/join squads
- RLS policies protect data access

---

## Deployment Reminder

When deploying to **Vercel**:
1. Environment variables already configured in `.env.local`
2. Supabase URL and Key must be set
3. Database migrations must be applied **before** deploying
4. Test registration and team creation on production

---

## Next Steps (Optional Enhancements)

- [ ] Team deletion (leader can disband squad)
- [ ] Member removal (leader can kick members)
- [ ] Leave squad (members can leave)
- [ ] Private messaging between squad members
- [ ] Squad statistics and performance charts
- [ ] Achievement badges for squads
- [ ] Squad comments/notes

