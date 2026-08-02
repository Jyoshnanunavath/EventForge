/*
# AI Features — Volunteers, Seating, AI Conversations

## Overview
Adds support for AI-powered event features: volunteer management with AI allocation,
seating arrangement generation, and persistent AI assistant conversations.

## New Tables
1. `volunteers` — people volunteering for an event, with skills, availability, and
   assigned role/task. Used by the AI Volunteer Allocation feature.
2. `seating_arrangements` — generated seating layouts for an event, storing the
   layout configuration as JSON (tables, rows, seats, VIP zones, stage position).
3. `ai_conversations` — persistent chat history for the AI Event Planning Assistant,
   storing user messages and AI responses per user per event (optional).

## Security
- RLS enabled on all tables.
- Volunteers: organizers can CRUD volunteers for their events; authenticated users can read.
- Seating: organizers can CRUD seating for their events; authenticated users can read.
- AI conversations: each user can only read/write their own conversation history.

## Important Notes
1. All three tables are event-scoped through the `events` table with ON DELETE CASCADE.
2. `volunteers.assigned_role` and `volunteers.assigned_task` are populated by the AI
   allocation algorithm — the frontend writes the AI's suggestion to these columns.
3. `seating_arrangements.layout` is a JSONB column storing the full visual layout
   (rows, seats per row, table positions, VIP zones, stage, aisle positions).
4. `ai_conversations.messages` is a JSONB array of {role, content, timestamp} objects.
*/

-- VOLUNTEERS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  availability text NOT NULL DEFAULT 'full',
  experience text NOT NULL DEFAULT 'beginner',
  preferred_role text NOT NULL DEFAULT '',
  assigned_role text NOT NULL DEFAULT '',
  assigned_task text NOT NULL DEFAULT '',
  assigned_zone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned','assigned','checked_in','declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "volunteers_select" ON volunteers;
CREATE POLICY "volunteers_select" ON volunteers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "volunteers_insert_own" ON volunteers;
CREATE POLICY "volunteers_insert_own" ON volunteers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = volunteers.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "volunteers_update_own" ON volunteers;
CREATE POLICY "volunteers_update_own" ON volunteers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = volunteers.event_id AND events.organizer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = volunteers.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "volunteers_delete_own" ON volunteers;
CREATE POLICY "volunteers_delete_own" ON volunteers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = volunteers.event_id AND events.organizer_id = auth.uid())
  );

-- SEATING ARRANGEMENTS --------------------------------------------------
CREATE TABLE IF NOT EXISTS seating_arrangements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Main Layout',
  layout jsonb NOT NULL DEFAULT '{}',
  capacity int NOT NULL DEFAULT 0,
  vip_zones int NOT NULL DEFAULT 0,
  has_stage boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE seating_arrangements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seating_select" ON seating_arrangements;
CREATE POLICY "seating_select" ON seating_arrangements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "seating_insert_own" ON seating_arrangements;
CREATE POLICY "seating_insert_own" ON seating_arrangements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = seating_arrangements.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "seating_update_own" ON seating_arrangements;
CREATE POLICY "seating_update_own" ON seating_arrangements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = seating_arrangements.event_id AND events.organizer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = seating_arrangements.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "seating_delete_own" ON seating_arrangements;
CREATE POLICY "seating_delete_own" ON seating_arrangements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = seating_arrangements.event_id AND events.organizer_id = auth.uid())
  );

-- AI CONVERSATIONS -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conv_select_own" ON ai_conversations;
CREATE POLICY "ai_conv_select_own" ON ai_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conv_insert_own" ON ai_conversations;
CREATE POLICY "ai_conv_insert_own" ON ai_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conv_update_own" ON ai_conversations;
CREATE POLICY "ai_conv_update_own" ON ai_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conv_delete_own" ON ai_conversations;
CREATE POLICY "ai_conv_delete_own" ON ai_conversations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- INDEXES ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_volunteers_event ON volunteers(event_id);
CREATE INDEX IF NOT EXISTS idx_seating_event ON seating_arrangements(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id);