import { useEffect, useState } from 'react';
import { Mic, Plus, Pencil, Trash2, Search, UserCircle } from 'lucide-react';
import { supabase, type Speaker, type Event } from '@/lib/supabase';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { Modal } from '@/components/Modal';

export function SpeakersPage() {
  const { route, navigate } = useRouter();
  const { toast } = useToast();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<string>(route.params.event || 'all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ event_id: '', name: '', title: '', company: '', bio: '', email: '', avatar_url: '' });

  useEffect(() => {
    (async () => {
      const [{ data: sData }, { data: eData }] = await Promise.all([
        supabase.from('speakers').select('*').order('name'),
        supabase.from('events').select('*').order('title'),
      ]);
      setSpeakers((sData as Speaker[]) || []);
      setEvents((eData as Event[]) || []);
      if (route.params.event) setForm((f) => ({ ...f, event_id: route.params.event }));
      setLoading(false);
    })();
  }, [route.params.event]);

  function openCreate() { setEditing(null); setForm({ event_id: eventFilter !== 'all' ? eventFilter : events[0]?.id || '', name: '', title: '', company: '', bio: '', email: '', avatar_url: '' }); setModalOpen(true); }
  function openEdit(s: Speaker) { setEditing(s); setForm({ event_id: s.event_id, name: s.name, title: s.title, company: s.company, bio: s.bio, email: s.email, avatar_url: s.avatar_url }); setModalOpen(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('speakers').update(form).eq('id', editing.id);
      if (error) toast(error.message, 'error'); else { toast('Speaker updated'); setSpeakers((p) => p.map((s) => s.id === editing.id ? { ...s, ...form } : s)); setModalOpen(false); }
    } else {
      const { data, error } = await supabase.from('speakers').insert(form).select().single();
      if (error) toast(error.message, 'error'); else { toast('Speaker added'); setSpeakers((p) => [data as Speaker, ...p]); setModalOpen(false); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this speaker?')) return;
    const { error } = await supabase.from('speakers').delete().eq('id', id);
    if (error) toast(error.message, 'error'); else { toast('Speaker removed'); setSpeakers((p) => p.filter((s) => s.id !== id)); }
  }

  const filtered = speakers.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.company.toLowerCase().includes(search.toLowerCase());
    const matchEvent = eventFilter === 'all' || s.event_id === eventFilter;
    return matchSearch && matchEvent;
  });

  const eventMap = new Map(events.map((e) => [e.id, e.title]));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-neutral-900">Speakers</h1><p className="text-sm text-neutral-500 mt-0.5">Manage speakers across your events</p></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Speaker</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input className="input pl-10" placeholder="Search speakers…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="input sm:w-56" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="all">All Events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Mic className="w-8 h-8" />} title="No speakers yet" description="Add speakers to your events" action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Speaker</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white shrink-0">
                  {s.avatar_url ? <img src={s.avatar_url} alt={s.name} className="w-full h-full rounded-full object-cover" /> : <UserCircle className="w-7 h-7" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-neutral-900 truncate">{s.name}</h3>
                  <p className="text-sm text-neutral-500 truncate">{s.title} · {s.company}</p>
                  <p className="text-xs text-primary-600 mt-1 truncate">{eventMap.get(s.event_id) || 'Unknown event'}</p>
                </div>
              </div>
              {s.bio && <p className="text-xs text-neutral-500 mt-3 line-clamp-2">{s.bio}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(s)} className="btn-secondary flex-1 text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => handleDelete(s.id)} className="btn-ghost text-error-600 hover:bg-error-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Speaker' : 'Add Speaker'} size="lg" footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Save'}</button></>}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Event</label><select className="input" required value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}><option value="">Select event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Title / Role</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="CTO" /></div>
            <div><label className="label">Company</label><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          </div>
          <div><label className="label">Avatar URL</label><input className="input" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" /></div>
          <div><label className="label">Bio</label><textarea className="input min-h-[80px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
