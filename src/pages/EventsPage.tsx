import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Search, Filter } from 'lucide-react';
import { supabase, type Event } from '@/lib/supabase';
import { useRouter } from '@/context/Router';
import { useAuth } from '@/context/AuthContext';
import { EventCard } from '@/components/EventCard';
import { PageLoader, EmptyState } from '@/components/ui';

export function EventsPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'mine'>('all');

  useEffect(() => {
    (async () => {
      let query = supabase.from('events').select('*, venue:venues(*)').order('start_date', { ascending: false });
      if (filter === 'mine' && profile) query = query.eq('organizer_id', profile.id);
      if (filter === 'published') query = query.eq('status', 'published');
      if (filter === 'draft') query = query.eq('status', 'draft');
      const { data } = await query;
      setEvents((data as Event[]) || []);
      setLoading(false);
    })();
  }, [filter, profile]);

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase()),
  );

  const isOrganizer = profile?.role === 'organizer' || profile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Events</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Browse and manage all events</p>
        </div>
        {isOrganizer && (
          <button onClick={() => navigate('/events/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> Create Event
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input className="input pl-10" placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {([
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Drafts' },
            ...(isOrganizer ? [{ value: 'mine', label: 'My Events' }] : []),
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as 'all' | 'published' | 'draft' | 'mine')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.value ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-5 space-y-3"><div className="skeleton h-40 rounded-xl" /><div className="skeleton h-4 w-3/4 rounded" /><div className="skeleton h-3 w-1/2 rounded" /></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-8 h-8" />}
          title="No events found"
          description={search ? "Try a different search term" : isOrganizer ? "Create your first event to get started" : "Check back soon for new events"}
          action={isOrganizer && !search ? <button onClick={() => navigate('/events/new')} className="btn-primary"><Plus className="w-4 h-4" /> Create Event</button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} onClick={() => navigate(`/events/${event.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
