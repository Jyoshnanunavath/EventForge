import { useEffect, useState } from 'react';
import {
  CalendarDays, Users, DollarSign, Ticket as TicketIcon, TrendingUp,
  Mic, Building2, ArrowRight, CheckCircle2, Clock,
} from 'lucide-react';
import { supabase, type Event, type Ticket, type Speaker, type Session, type Sponsor } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { PageLoader, EmptyState, StatCard } from '@/components/ui';
import { BarChart, DonutChart, ProgressBar } from '@/components/Charts';
import { formatDate, formatMoney, categoryColor, statusColor, cn } from '@/lib/utils';

export function DashboardPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const isOrganizer = profile.role === 'organizer' || profile.role === 'admin';
      const eventsQuery = isOrganizer
        ? supabase.from('events').select('*, venue:venues(*)').eq('organizer_id', profile.id).order('start_date', { ascending: false })
        : supabase.from('events').select('*, venue:venues(*)').eq('status', 'published').order('start_date', { ascending: false });
      const { data: eData } = await eventsQuery;
      const eventList = (eData as Event[]) || [];
      setEvents(eventList);

      if (eventList.length > 0) {
        const eventIds = eventList.map((e) => e.id);
        const [ticketsRes, speakersRes, sessionsRes, sponsorsRes] = await Promise.all([
          isOrganizer
            ? supabase.from('tickets').select('*').in('event_id', eventIds)
            : supabase.from('tickets').select('*').eq('attendee_id', profile.id),
          supabase.from('speakers').select('*').in('event_id', eventIds),
          supabase.from('sessions').select('*').in('event_id', eventIds),
          supabase.from('sponsors').select('*').in('event_id', eventIds),
        ]);
        setTickets((ticketsRes.data as Ticket[]) || []);
        setSpeakers((speakersRes.data as Speaker[]) || []);
        setSessions((sessionsRes.data as Session[]) || []);
        setSponsors((sponsorsRes.data as Sponsor[]) || []);
      } else if (!isOrganizer) {
        const { data: myTickets } = await supabase.from('tickets').select('*, event:events(*)').eq('attendee_id', profile.id).order('created_at', { ascending: false });
        setTickets((myTickets as Ticket[]) || []);
      }
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <PageLoader />;

  const isOrganizer = profile?.role === 'organizer' || profile?.role === 'admin';
  const confirmedTickets = tickets.filter((t) => t.status === 'confirmed');
  const revenue = confirmedTickets.reduce((sum, t) => sum + Number(t.total_amount), 0);
  const checkedIn = tickets.filter((t) => t.checked_in).length;
  const upcomingEvents = events.filter((e) => new Date(e.start_date) > new Date()).length;

  // Ticket sales by event (top 6)
  const salesByEvent = events.map((e) => ({
    label: e.title.slice(0, 8),
    value: tickets.filter((t) => t.event_id === e.id && t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0),
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Event status distribution
  const statusData = [
    { label: 'Published', value: events.filter((e) => e.status === 'published').length, color: '#10b981' },
    { label: 'Draft', value: events.filter((e) => e.status === 'draft').length, color: '#94a3b8' },
    { label: 'Completed', value: events.filter((e) => e.status === 'completed').length, color: '#8b5cf6' },
    { label: 'Cancelled', value: events.filter((e) => e.status === 'cancelled').length, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Welcome back, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="text-sm text-neutral-500 mt-0.5">{isOrganizer ? "Here's what's happening with your events" : 'Explore and book events'}</p>
      </div>

      {isOrganizer ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Events" value={String(events.length)} icon={<CalendarDays className="w-5 h-5" />} trend={`${upcomingEvents} upcoming`} color="primary" />
            <StatCard label="Tickets Sold" value={String(confirmedTickets.reduce((s, t) => s + t.quantity, 0))} icon={<TicketIcon className="w-5 h-5" />} color="accent" />
            <StatCard label="Revenue" value={formatMoney(revenue, 'INR')} icon={<DollarSign className="w-5 h-5" />} trend="+12%" color="warning" />
            <StatCard label="Checked In" value={String(checkedIn)} icon={<CheckCircle2 className="w-5 h-5" />} color="primary" />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-600" /> Ticket Sales by Event</h3>
              {salesByEvent.some((d) => d.value > 0) ? <BarChart data={salesByEvent} /> : <p className="text-sm text-neutral-400 py-12 text-center">No sales data yet</p>}
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary-600" /> Event Status</h3>
              {statusData.length > 0 ? <DonutChart data={statusData} /> : <p className="text-sm text-neutral-400 py-12 text-center">No events yet</p>}
            </div>
          </div>

          {/* Capacity */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Event Capacity</h3>
            <div className="space-y-4">
              {events.slice(0, 5).map((e) => {
                const sold = tickets.filter((t) => t.event_id === e.id && t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);
                return <ProgressBar key={e.id} label={e.title} value={sold} max={e.max_attendees} color={sold / e.max_attendees > 0.8 ? 'error' : sold / e.max_attendees > 0.5 ? 'warning' : 'accent'} />;
              })}
              {events.length === 0 && <p className="text-sm text-neutral-400 py-4 text-center">No events yet</p>}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><Mic className="w-5 h-5" /></div><div><p className="text-xl font-bold">{speakers.length}</p><p className="text-xs text-neutral-500">Speakers</p></div></div>
            <div className="card p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center"><Users className="w-5 h-5" /></div><div><p className="text-xl font-bold">{sessions.length}</p><p className="text-xs text-neutral-500">Sessions</p></div></div>
            <div className="card p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-warning-500/10 text-warning-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div><div><p className="text-xl font-bold">{sponsors.length}</p><p className="text-xs text-neutral-500">Sponsors</p></div></div>
            <div className="card p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><TicketIcon className="w-5 h-5" /></div><div><p className="text-xl font-bold">{tickets.length}</p><p className="text-xs text-neutral-500">Total Tickets</p></div></div>
          </div>
        </>
      ) : (
        /* Attendee view */
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="My Tickets" value={String(tickets.length)} icon={<TicketIcon className="w-5 h-5" />} color="primary" />
            <StatCard label="Upcoming Events" value={String(events.length)} icon={<CalendarDays className="w-5 h-5" />} color="accent" />
            <StatCard label="Checked In" value={String(tickets.filter((t) => t.checked_in).length)} icon={<CheckCircle2 className="w-5 h-5" />} color="warning" />
          </div>

          <div>
            <h3 className="font-semibold text-neutral-900 mb-4">Upcoming Events</h3>
            {events.length === 0 ? (
              <EmptyState icon={<CalendarDays className="w-8 h-8" />} title="No upcoming events" description="Check back soon for new events" action={<button onClick={() => navigate('/events')} className="btn-primary">Browse All Events</button>} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.slice(0, 6).map((e) => (
                  <button key={e.id} onClick={() => navigate(`/events/${e.id}`)} className="card overflow-hidden text-left group hover:shadow-lg hover:border-primary-200 transition-all">
                    <div className="h-32 overflow-hidden">
                      {e.banner_url ? <img src={e.banner_url} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center"><CalendarDays className="w-10 h-10 text-white/30" /></div>}
                    </div>
                    <div className="p-4">
                      <div className="flex gap-2 mb-2"><span className={cn('badge', categoryColor(e.category))}>{e.category}</span><span className={cn('badge', statusColor(e.status))}>{e.status}</span></div>
                      <h4 className="font-bold text-neutral-900 group-hover:text-primary-700 transition-colors">{e.title}</h4>
                      <p className="text-xs text-neutral-500 mt-1">{formatDate(e.start_date)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {tickets.length > 0 && (
            <div>
              <h3 className="font-semibold text-neutral-900 mb-4">My Recent Tickets</h3>
              <div className="card divide-y divide-neutral-50">
                {tickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4">
                    <div><p className="text-sm font-semibold text-neutral-900">{t.event?.title}</p><p className="text-xs text-neutral-500">{t.quantity} ticket(s) · {formatMoney(t.total_amount, t.currency)}</p></div>
                    <div className="flex items-center gap-2">
                      {t.checked_in ? <span className="badge-success"><CheckCircle2 className="w-3 h-3" /> Checked In</span> : <span className="badge-neutral"><Clock className="w-3 h-3" /> Pending</span>}
                      <button onClick={() => navigate(`/tickets/${t.id}`)} className="btn-ghost text-xs">View <ArrowRight className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
