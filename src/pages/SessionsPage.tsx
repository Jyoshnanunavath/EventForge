import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Pencil, Trash2, Clock, MapPin, Users } from 'lucide-react';
import { supabase, type Session, type Event, type Speaker } from '@/lib/supabase';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { formatTime, toInputDateTime, cn } from '@/lib/utils';

export function SessionsPage() {
  const { route } = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>(route.params.event || 'all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ event_id: '', speaker_id: '', title: '', description: '', room: '', start_time: '', end_time: '', capacity: 50, track: 'Main' });

  useEffect(() => {
    (async () => {
      const [{ data: sessData }, { data: eData }] = await Promise.all([
        supabase.from('sessions').select('*, speaker:speakers(*)').order('start_time'),
        supabase.from('events').select('*').order('title'),
      ]);
      setSessions((sessData as Session[]) || []);
      setEvents((eData as Event[]) || []);
      if (route.params.event) setForm((f) => ({ ...f, event_id: route.params.event }));
      setLoading(false);
    })();
  }, [route.params.event]);

  useEffect(() => {
    if (form.event_id) {
      supabase.from('speakers').select('*').eq('event_id', form.event_id).order('name').then(({ data }) => setSpeakers((data as Speaker[]) || []));
    } else {
      setSpeakers([]);
    }
  }, [form.event_id]);

  function openCreate() { setEditing(null); setForm({ event_id: eventFilter !== 'all' ? eventFilter : events[0]?.id || '', speaker_id: '', title: '', description: '', room: '', start_time: '', end_time: '', capacity: 50, track: 'Main' }); setModalOpen(true); }
  function openEdit(s: Session) {
    setEditing(s);
    setForm({ event_id: s.event_id, speaker_id: s.speaker_id || '', title: s.title, description: s.description, room: s.room, start_time: toInputDateTime(s.start_time), end_time: toInputDateTime(s.end_time), capacity: s.capacity, track: s.track });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, speaker_id: form.speaker_id || null, start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time).toISOString(), capacity: Number(form.capacity) };
    if (editing) {
      const { error } = await supabase.from('sessions').update(payload).eq('id', editing.id);
      if (error) toast(error.message, 'error'); else { toast('Session updated'); setSessions((p) => p.map((s) => s.id === editing.id ? { ...s, ...payload } as Session : s)); setModalOpen(false); }
    } else {
      const { data, error } = await supabase.from('sessions').insert(payload).select('*, speaker:speakers(*)').single();
      if (error) toast(error.message, 'error'); else { toast('Session created'); setSessions((p) => [data as Session, ...p]); setModalOpen(false); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this session?')) return;
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) toast(error.message, 'error'); else { toast('Session deleted'); setSessions((p) => p.filter((s) => s.id !== id)); }
  }

  const filtered = eventFilter === 'all' ? sessions : sessions.filter((s) => s.event_id === eventFilter);
  const eventMap = new Map(events.map((e) => [e.id, e.title]));
  const tracks = ['Main', 'Track A', 'Track B', 'Workshop', 'Panel'];

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-neutral-900">Sessions</h1><p className="text-sm text-neutral-500 mt-0.5">Schedule and manage sessions</p></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Session</button>
      </div>

      <div>
        <select className="input sm:w-64" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="all">All Events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CalendarDays className="w-8 h-8" />} title="No sessions yet" description="Schedule sessions for your events" action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Session</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 sm:w-40 shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold leading-none">{formatTime(s.start_time)}</span>
                </div>
                <div className="text-xs text-neutral-500"><Clock className="w-3 h-3 inline mr-1" />{formatTime(s.end_time)}</div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-neutral-900">{s.title}</h3>
                {s.speaker && <p className="text-sm text-neutral-500 mt-0.5">{s.speaker.name} · {s.speaker.company}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="badge-neutral"><MapPin className="w-3 h-3" /> {s.room || 'TBA'}</span>
                  <span className="badge-primary">{s.track}</span>
                  <span className="badge-neutral"><Users className="w-3 h-3" /> {s.capacity}</span>
                  <span className="text-xs text-neutral-400">{eventMap.get(s.event_id)}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(s)} className="btn-secondary text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => handleDelete(s.id)} className="btn-ghost text-error-600 hover:bg-error-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Session' : 'Add Session'} size="lg" footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Save'}</button></>}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Event</label><select className="input" required value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}><option value="">Select event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
          <div><label className="label">Title</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="The Future of AI" /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Speaker</label><select className="input" value={form.speaker_id} onChange={(e) => setForm({ ...form, speaker_id: e.target.value })}><option value="">— No speaker —</option>{speakers.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}</select>{speakers.length === 0 && form.event_id && <p className="text-xs text-warning-600 mt-1">No speakers added for this event yet.</p>}</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Start Time</label><input type="datetime-local" className="input" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><label className="label">End Time</label><input type="datetime-local" className="input" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label">Room</label><input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Hall A" /></div>
            <div><label className="label">Track</label><select className="input" value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })}>{tracks.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="label">Capacity</label><input type="number" min={1} className="input" required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
