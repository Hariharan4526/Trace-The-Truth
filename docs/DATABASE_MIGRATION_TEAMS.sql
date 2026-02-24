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
