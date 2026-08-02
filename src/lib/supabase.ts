import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UserRole = 'admin' | 'organizer' | 'attendee';

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  company: string;
  phone: string;
  avatar_url: string;
  bio: string;
  created_at: string;
  updated_at: string;
};

export type Venue = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  capacity: number;
  facilities: string[];
  image_url: string;
  description: string;
  owner_id: string;
  created_at: string;
};

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export type Event = {
  id: string;
  title: string;
  description: string;
  category: string;
  start_date: string;
  end_date: string;
  venue_id: string | null;
  organizer_id: string;
  status: EventStatus;
  banner_url: string;
  max_attendees: number;
  price: number;
  currency: string;
  created_at: string;
  venue?: Venue | null;
  organizer?: Profile | null;
};

export type Speaker = {
  id: string;
  event_id: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  email: string;
  avatar_url: string;
  created_at: string;
};

export type Session = {
  id: string;
  event_id: string;
  speaker_id: string | null;
  title: string;
  description: string;
  room: string;
  start_time: string;
  end_time: string;
  capacity: number;
  track: string;
  created_at: string;
  speaker?: Speaker | null;
};

export type TicketStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';

export type Ticket = {
  id: string;
  event_id: string;
  attendee_id: string;
  ticket_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: TicketStatus;
  payment_method: string;
  payment_ref: string;
  qr_code: string;
  checked_in: boolean;
  checked_in_at: string | null;
  attendee_name: string;
  attendee_email: string;
  created_at: string;
  event?: Event | null;
};

export type SponsorTier = 'platinum' | 'gold' | 'silver' | 'bronze';

export type Sponsor = {
  id: string;
  event_id: string;
  name: string;
  tier: SponsorTier;
  logo_url: string;
  website: string;
  description: string;
  created_at: string;
};

export type Exhibitor = {
  id: string;
  event_id: string;
  name: string;
  description: string;
  booth_number: string;
  category: string;
  logo_url: string;
  website: string;
  contact_email: string;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  event_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type VolunteerStatus = 'unassigned' | 'assigned' | 'checked_in' | 'declined';

export type Volunteer = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  availability: string;
  experience: string;
  preferred_role: string;
  assigned_role: string;
  assigned_task: string;
  assigned_zone: string;
  status: VolunteerStatus;
  created_at: string;
};

export type SeatingLayout = {
  rows: { id: string; seats: number; label: string; zone: string }[];
  stage: { position: 'top' | 'bottom' | 'left' | 'right'; width: number };
  vipZones: { id: string; label: string; rows: string[] }[];
  aisles: number[];
  totalSeats: number;
};

export type SeatingArrangement = {
  id: string;
  event_id: string;
  name: string;
  layout: SeatingLayout;
  capacity: number;
  vip_zones: number;
  has_stage: boolean;
  created_at: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type AIConversation = {
  id: string;
  user_id: string;
  event_id: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
};

export type FeedbackCategory = 'general' | 'content' | 'venue' | 'speakers' | 'organization' | 'food' | 'other';

export type EventFeedback = {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  comment: string;
  sentiment_score: number;
  sentiment_label: 'positive' | 'neutral' | 'negative';
  category: FeedbackCategory;
  created_at: string;
};

export type EventReportData = {
  summary: string;
  metrics: { label: string; value: string }[];
  insights: string[];
  recommendations: string[];
  highlights: string[];
  fullReport: string;
};

export type EventReport = {
  id: string;
  event_id: string;
  generated_by: string;
  title: string;
  report_data: EventReportData;
  created_at: string;
};

export type ChatbotConversation = {
  id: string;
  event_id: string;
  user_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
};
