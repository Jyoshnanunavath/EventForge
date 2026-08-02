/*
# AI Event Management Platform — Core Schema

## Overview
Creates the full data model for an event management platform with multi-role access
(attendees, organizers, admins). Includes events, venues, speakers, sessions, tickets
with QR validation, sponsors, exhibitors, and in-app notifications.

## New Tables
1. `profiles` — extends auth.users with role, name, company, phone, avatar.
2. `venues` — managed spaces with capacity and facilities; owned by an organizer.
3. `events` — events hosted at a venue by an organizer, with status lifecycle.
4. `speakers` — people speaking at an event.
5. `sessions` — scheduled talks within an event, linked to a speaker and room.
6. `tickets` — bookings made by an attendee for an event, with QR code + check-in state.
7. `sponsors` — companies sponsoring an event, tiered.
8. `exhibitors` — companies exhibiting at an event, with booth numbers.
9. `notifications` — in-app messages for a user (simulated email notifications).

## Security
- RLS enabled on every table.
- Profiles: each user reads/updates their own row.
- Venues/Events/Speakers/Sessions/Sponsors/Exhibitors: organizers manage rows they own
  (or that belong to their events); attendees can read published/active data.
- Tickets: attendees manage their own; organizers can read tickets for events they own
  (needed for check-in and analytics).
- Notifications: each user reads/updates their own.

## Important Notes
1. `profiles.id` references `auth.users(id)` with ON DELETE CASCADE so deleting a user
   removes their profile.
2. Owner columns default to `auth.uid()` so client inserts that omit the owner succeed.
3. Events have a `status` check constraint covering the lifecycle
   (draft, published, cancelled, completed).
4. Tickets have a `status` check (pending, confirmed, cancelled, refunded) and a
   `checked_in` boolean plus `checked_in_at` timestamp for the check-in system.
5. The `qr_code` column stores a unique token used to validate entry; the QR image is
   rendered client-side from this token.
*/

-- PROFILES --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'attendee' CHECK (role IN ('admin','organizer','attendee')),
  company text DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- VENUES ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  capacity int NOT NULL DEFAULT 0,
  facilities text[] NOT NULL DEFAULT '{}',
  image_url text DEFAULT '',
  description text DEFAULT '',
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venues_select" ON venues;
CREATE POLICY "venues_select" ON venues FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "venues_insert_own" ON venues;
CREATE POLICY "venues_insert_own" ON venues FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "venues_update_own" ON venues;
CREATE POLICY "venues_update_own" ON venues FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "venues_delete_own" ON venues;
CREATE POLICY "venues_delete_own" ON venues FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- EVENTS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  organizer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','completed')),
  banner_url text DEFAULT '',
  max_attendees int NOT NULL DEFAULT 100,
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE
  TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events FOR DELETE
  TO authenticated USING (auth.uid() = organizer_id);

-- SPEAKERS --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "speakers_select" ON speakers;
CREATE POLICY "speakers_select" ON speakers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "speakers_insert_own" ON speakers;
CREATE POLICY "speakers_insert_own" ON speakers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = speakers.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "speakers_update_own" ON speakers;
CREATE POLICY "speakers_update_own" ON speakers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = speakers.event_id AND events.organizer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = speakers.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "speakers_delete_own" ON speakers;
CREATE POLICY "speakers_delete_own" ON speakers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = speakers.event_id AND events.organizer_id = auth.uid())
  );

-- SESSIONS --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  speaker_id uuid REFERENCES speakers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  room text NOT NULL DEFAULT '',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  capacity int NOT NULL DEFAULT 50,
  track text NOT NULL DEFAULT 'Main',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select" ON sessions;
CREATE POLICY "sessions_select" ON sessions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "sessions_insert_own" ON sessions;
CREATE POLICY "sessions_insert_own" ON sessions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = sessions.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "sessions_update_own" ON sessions;
CREATE POLICY "sessions_update_own" ON sessions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = sessions.event_id AND events.organizer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = sessions.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "sessions_delete_own" ON sessions;
CREATE POLICY "sessions_delete_own" ON sessions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = sessions.event_id AND events.organizer_id = auth.uid())
  );

-- TICKETS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_type text NOT NULL DEFAULT 'General',
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled','refunded')),
  payment_method text NOT NULL DEFAULT 'card',
  payment_ref text DEFAULT '',
  qr_code text NOT NULL DEFAULT '',
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  attendee_name text NOT NULL DEFAULT '',
  attendee_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select" ON tickets;
CREATE POLICY "tickets_select" ON tickets FOR SELECT
  TO authenticated USING (
    auth.uid() = attendee_id
    OR EXISTS (SELECT 1 FROM events WHERE events.id = tickets.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "tickets_insert_own" ON tickets;
CREATE POLICY "tickets_insert_own" ON tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = attendee_id);

DROP POLICY IF EXISTS "tickets_update_own" ON tickets;
CREATE POLICY "tickets_update_own" ON tickets FOR UPDATE
  TO authenticated USING (
    auth.uid() = attendee_id
    OR EXISTS (SELECT 1 FROM events WHERE events.id = tickets.event_id AND events.organizer_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = attendee_id
    OR EXISTS (SELECT 1 FROM events WHERE events.id = tickets.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "tickets_delete_own" ON tickets;
CREATE POLICY "tickets_delete_own" ON tickets FOR DELETE
  TO authenticated USING (auth.uid() = attendee_id);

-- SPONSORS --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'silver' CHECK (tier IN ('platinum','gold','silver','bronze')),
  logo_url text DEFAULT '',
  website text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsors_select" ON sponsors;
CREATE POLICY "sponsors_select" ON sponsors FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "sponsors_insert_own" ON sponsors;
CREATE POLICY "sponsors_insert_own" ON sponsors FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "sponsors_update_own" ON sponsors;
CREATE POLICY "sponsors_update_own" ON sponsors FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND events.organizer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "sponsors_delete_own" ON sponsors;
CREATE POLICY "sponsors_delete_own" ON sponsors FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND events.organizer_id = auth.uid())
  );

-- EXHIBITORS ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exhibitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  booth_number text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  logo_url text DEFAULT '',
  website text DEFAULT '',
  contact_email text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE exhibitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exhibitors_select" ON exhibitors;
CREATE POLICY "exhibitors_select" ON exhibitors FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "exhibitors_insert_own" ON exhibitors;
CREATE POLICY "exhibitors_insert_own" ON exhibitors FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = exhibitors.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "exhibitors_update_own" ON exhibitors;
CREATE POLICY "exhibitors_update_own" ON exhibitors FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = exhibitors.event_id AND events.organizer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = exhibitors.event_id AND events.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "exhibitors_delete_own" ON exhibitors;
CREATE POLICY "exhibitors_delete_own" ON exhibitors FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = exhibitors.event_id AND events.organizer_id = auth.uid())
  );

-- NOTIFICATIONS ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- INDEXES ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_attendee ON tickets(attendee_id);
CREATE INDEX IF NOT EXISTS idx_sessions_event ON sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_speakers_event ON speakers(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_event ON sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_exhibitors_event ON exhibitors(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_venues_owner ON venues(owner_id);

-- AUTO-UPDATE updated_at ON profiles ------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();