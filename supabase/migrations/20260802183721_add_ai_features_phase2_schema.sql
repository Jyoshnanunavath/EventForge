/*
# AI Features Phase 2 — Feedback, Reports, Chatbot

## Overview
Adds support for attendee feedback with sentiment, AI-generated event reports,
and an attendee-facing AI chatbot that answers event questions.

## New Tables
1. `event_feedback` — attendee feedback for an event: rating, comment, sentiment
   score (computed), and sentiment label. Used by the Sentiment Analysis feature.
2. `event_reports` — AI-generated reports stored as structured JSON: summary,
   key metrics, insights, recommendations, and generated text.
3. `chatbot_conversations` — attendee chatbot sessions per event. Stores the
   full message history as JSONB so the chatbot has context across turns.

## Security
- RLS enabled on all tables.
- event_feedback: attendees can read their own feedback; organizers can read all
  feedback for their events. INSERT/UPDATE/DELETE limited to the feedback author.
- event_reports: organizers can INSERT/DELETE reports for their events; all
  authenticated users can read.
- chatbot_conversations: each user reads/writes only their own conversations.

## Important Notes
1. `event_feedback.sentiment_score` is a float from -1 to 1, computed client-side.
2. `event_feedback.sentiment_label` is derived: 'positive' (>0.1), 'negative' (<-0.1), 'neutral'.
3. `event_reports.report_data` stores the full structured report as JSONB.
4. `chatbot_conversations.messages` is a JSONB array of {role, content, timestamp}.
*/

-- EVENT FEEDBACK --------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL DEFAULT '',
  sentiment_score float NOT NULL DEFAULT 0,
  sentiment_label text NOT NULL DEFAULT 'neutral' CHECK (sentiment_label IN ('positive','neutral','negative')),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','content','venue','speakers','organization','food','other')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE event_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_select" ON event_feedback;
CREATE POLICY "feedback_select" ON event_feedback FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events WHERE events.id = event_feedback.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "feedback_insert_own" ON event_feedback;
CREATE POLICY "feedback_insert_own" ON event_feedback FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_update_own" ON event_feedback;
CREATE POLICY "feedback_update_own" ON event_feedback FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_delete_own" ON event_feedback;
CREATE POLICY "feedback_delete_own" ON event_feedback FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- EVENT REPORTS ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  generated_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Event Report',
  report_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select" ON event_reports;
CREATE POLICY "reports_select" ON event_reports FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "reports_insert_own" ON event_reports;
CREATE POLICY "reports_insert_own" ON event_reports FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_reports.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "reports_delete_own" ON event_reports;
CREATE POLICY "reports_delete_own" ON event_reports FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_reports.event_id AND events.organizer_id = auth.uid())
  );

-- CHATBOT CONVERSATIONS -------------------------------------------------
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chatbot_select_own" ON chatbot_conversations;
CREATE POLICY "chatbot_select_own" ON chatbot_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chatbot_insert_own" ON chatbot_conversations;
CREATE POLICY "chatbot_insert_own" ON chatbot_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chatbot_update_own" ON chatbot_conversations;
CREATE POLICY "chatbot_update_own" ON chatbot_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chatbot_delete_own" ON chatbot_conversations;
CREATE POLICY "chatbot_delete_own" ON chatbot_conversations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- INDEXES ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_feedback_event ON event_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON event_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_event ON event_reports(event_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_event ON chatbot_conversations(event_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_user ON chatbot_conversations(user_id);