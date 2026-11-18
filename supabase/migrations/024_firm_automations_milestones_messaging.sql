-- ============================================================================
-- 024_firm_automations_milestones_messaging.sql
-- Client Milestones CRM, Personal Sticky To-Dos, Team Groups & Direct Messages
-- ============================================================================

-- 1. Client Important Dates & Milestone CRM (Birthdays, Incorporation Days, GST Anniversaries)
CREATE TABLE IF NOT EXISTS client_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('BIRTHDAY', 'INCORPORATION_DAY', 'GST_ANNIVERSARY', 'CUSTOM')),
  title TEXT NOT NULL,
  milestone_date DATE NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  last_greeted_year INTEGER,
  last_greeted_at TIMESTAMPTZ,
  last_greeted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_milestones_firm ON client_milestones(firm_id);
CREATE INDEX IF NOT EXISTS idx_client_milestones_client ON client_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_client_milestones_date ON client_milestones(milestone_date);

-- 2. Personal Sticky To-Do Scratchpad for Every Firm Member
CREATE TABLE IF NOT EXISTS firm_user_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('URGENT', 'HIGH', 'NORMAL', 'LOW')),
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_user_todos_user ON firm_user_todos(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_firm_user_todos_firm ON firm_user_todos(firm_id);

-- 3. Practice Team Chat Groups & Broadcast Channels
CREATE TABLE IF NOT EXISTS firm_chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'INTERNAL_TEAM' CHECK (group_type IN ('INTERNAL_TEAM', 'CLIENT_GROUP', 'BROADCAST')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_chat_groups_firm ON firm_chat_groups(firm_id);

-- 4. Group Members Junction Table
CREATE TABLE IF NOT EXISTS firm_chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES firm_chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_firm_chat_group_members_user ON firm_chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_firm_chat_group_members_group ON firm_chat_group_members(group_id);

-- 5. Extend client_messages for Group & Direct Team Messaging
ALTER TABLE client_messages
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES firm_chat_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Allow client_user_id to be nullable when message is a group or direct team message
ALTER TABLE client_messages ALTER COLUMN client_user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_messages_group ON client_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_recipient ON client_messages(recipient_user_id, sender_user_id);

-- Enable Row Level Security
ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_user_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_chat_group_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_milestones' AND policyname = 'client_milestones_policy') THEN
    CREATE POLICY client_milestones_policy ON client_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_user_todos' AND policyname = 'firm_user_todos_policy') THEN
    CREATE POLICY firm_user_todos_policy ON firm_user_todos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_chat_groups' AND policyname = 'firm_chat_groups_policy') THEN
    CREATE POLICY firm_chat_groups_policy ON firm_chat_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_chat_group_members' AND policyname = 'firm_chat_group_members_policy') THEN
    CREATE POLICY firm_chat_group_members_policy ON firm_chat_group_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
