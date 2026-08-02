import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { supabase, type Event, type Venue, type EventStatus } from '@/lib/supabase';
import { useRouter } from '@/context/Router';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { toInputDateTime, cn } from '@/lib/utils';
import { Spinner } from '@/components/ui';

const categories = ['Technology', 'Business', 'Marketing', 'Education', 'Entertainment', 'General'];
const statuses: EventStatus[] = ['draft', 'published', 'cancelled', 'completed'];

export function EventEditorPage({ eventId }: { eventId?: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(!!eventId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Technology',
    start_date: '',
    end_date: '',
    venue_id: '',
    status: 'draft' as EventStatus,
    banner_url: '',
    max_attendees: 100,
    price: 0,
    currency: 'INR',
  });

  useEffect(() => {
    (async () => {
      const { data: vData } = await supabase.from('venues').select('*').order('name');
      setVenues((vData as Venue[]) || []);
      if (eventId) {
        const { data } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
        if (data) {
          const e = data as Event;
          setForm({
            title: e.title,
            description: e.description,
            category: e.category,
            start_date: toInputDateTime(e.start_date),
            end_date: toInputDateTime(e.end_date),
            venue_id: e.venue_id || '',
            status: e.status,
            banner_url: e.banner_url,
            max_attendees: e.max_attendees,
            price: e.price,
            currency: e.currency,
          });
        }
      }
      setLoading(false);
    })();
  }, [eventId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const payload = {
      ...form,
      venue_id: form.venue_id || null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      price: Number(form.price),
      max_attendees: Number(form.max_attendees),
    };

    if (eventId) {
      const { error } = await supabase.from('events').update(payload).eq('id', eventId);
      if (error) toast(error.message, 'error');
      else { toast('Event updated successfully'); navigate(`/events/${eventId}`); }
    } else {
      const { data, error } = await supabase.from('events').insert({ ...payload, organizer_id: profile.id }).select().single();
      if (error) toast(error.message, 'error');
      else { toast('Event created successfully'); navigate(`/events/${data.id}`); }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!eventId) return;
    if (!confirm('Delete this event? This will remove all associated sessions, tickets, and speakers.')) return;
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) toast(error.message, 'error');
    else { toast('Event deleted'); navigate('/events'); }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-6 h-6" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(eventId ? `/events/${eventId}` : '/events')} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {eventId && (
          <button onClick={handleDelete} className="btn-danger">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{eventId ? 'Edit Event' : 'Create New Event'}</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Fill in the details below to {eventId ? 'update' : 'create'} your event</p>
      </div>

      <form onSubmit={handleSave} className="card p-6 space-y-5">
        <div>
          <label className="label">Event Title</label>
          <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="AI Summit 2026" />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[100px] resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your event…" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}>
              {statuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Start Date &amp; Time</label>
            <input type="datetime-local" className="input" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <label className="label">End Date &amp; Time</label>
            <input type="datetime-local" className="input" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label">Venue</label>
          <select className="input" value={form.venue_id} onChange={(e) => setForm({ ...form, venue_id: e.target.value })}>
            <option value="">— No venue —</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.city})</option>)}
          </select>
        </div>

        <div>
          <label className="label">Banner Image URL</label>
          <input className="input" value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://…" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Max Attendees</label>
            <input type="number" min={1} className="input" required value={form.max_attendees} onChange={(e) => setForm({ ...form, max_attendees: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Ticket Price</label>
            <input type="number" min={0} step="0.01" className="input" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(eventId ? `/events/${eventId}` : '/events')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : <><Save className="w-4 h-4" /> {eventId ? 'Save Changes' : 'Create Event'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
