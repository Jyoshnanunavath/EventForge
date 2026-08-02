import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { supabase, type Exhibitor, type Event } from '@/lib/supabase';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { Modal } from '@/components/Modal';

const categories = ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Food & Beverage', 'Other'];

export function ExhibitorsPage() {
  const { route } = useRouter();
  const { toast } = useToast();
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>(route.params.event || 'all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exhibitor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ event_id: '', name: '', description: '', booth_number: '', category: 'Technology', logo_url: '', website: '', contact_email: '' });

  useEffect(() => {
    (async () => {
      const [{ data: exData }, { data: eData }] = await Promise.all([
        supabase.from('exhibitors').select('*').order('booth_number'),
        supabase.from('events').select('*').order('title'),
      ]);
      setExhibitors((exData as Exhibitor[]) || []);
      setEvents((eData as Event[]) || []);
      if (route.params.event) setForm((f) => ({ ...f, event_id: route.params.event }));
      setLoading(false);
    })();
  }, [route.params.event]);

  function openCreate() { setEditing(null); setForm({ event_id: eventFilter !== 'all' ? eventFilter : events[0]?.id || '', name: '', description: '', booth_number: '', category: 'Technology', logo_url: '', website: '', contact_email: '' }); setModalOpen(true); }
  function openEdit(ex: Exhibitor) { setEditing(ex); setForm({ event_id: ex.event_id, name: ex.name, description: ex.description, booth_number: ex.booth_number, category: ex.category, logo_url: ex.logo_url, website: ex.website, contact_email: ex.contact_email }); setModalOpen(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('exhibitors').update(form).eq('id', editing.id);
      if (error) toast(error.message, 'error'); else { toast('Exhibitor updated'); setExhibitors((p) => p.map((x) => x.id === editing.id ? { ...x, ...form } : x)); setModalOpen(false); }
    } else {
      const { data, error } = await supabase.from('exhibitors').insert(form).select().single();
      if (error) toast(error.message, 'error'); else { toast('Exhibitor added'); setExhibitors((p) => [data as Exhibitor, ...p]); setModalOpen(false); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this exhibitor?')) return;
    const { error } = await supabase.from('exhibitors').delete().eq('id', id);
    if (error) toast(error.message, 'error'); else { toast('Exhibitor removed'); setExhibitors((p) => p.filter((x) => x.id !== id)); }
  }

  const filtered = eventFilter === 'all' ? exhibitors : exhibitors.filter((x) => x.event_id === eventFilter);
  const eventMap = new Map(events.map((e) => [e.id, e.title]));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-neutral-900">Exhibitors</h1><p className="text-sm text-neutral-500 mt-0.5">Manage exhibitors and booth assignments</p></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Exhibitor</button>
      </div>

      <select className="input sm:w-64" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
        <option value="all">All Events</option>
        {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>

      {filtered.length === 0 ? (
        <EmptyState icon={<Building2 className="w-8 h-8" />} title="No exhibitors yet" description="Add exhibitors to your events" action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Exhibitor</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((ex) => (
            <div key={ex.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center text-sm font-bold text-neutral-600 shrink-0">{ex.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0"><h3 className="font-bold text-neutral-900 truncate">{ex.name}</h3><p className="text-xs text-neutral-500 truncate">{eventMap.get(ex.event_id)}</p></div>
                </div>
                <span className="badge-primary shrink-0">Booth {ex.booth_number || '—'}</span>
              </div>
              <p className="text-xs text-neutral-500">{ex.category}</p>
              {ex.description && <p className="text-xs text-neutral-400 mt-2 line-clamp-2">{ex.description}</p>}
              {(ex.website || ex.contact_email) && (
                <div className="flex gap-3 mt-2 text-xs text-neutral-500">
                  {ex.website && <a href={ex.website} target="_blank" rel="noreferrer" className="hover:text-primary-600 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Website</a>}
                  {ex.contact_email && <span>{ex.contact_email}</span>}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(ex)} className="btn-secondary flex-1 text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => handleDelete(ex.id)} className="btn-ghost text-error-600 hover:bg-error-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Exhibitor' : 'Add Exhibitor'} size="lg" footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Save'}</button></>}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Event</label><select className="input" required value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}><option value="">Select event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Exhibitor Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Booth Number</label><input className="input" value={form.booth_number} onChange={(e) => setForm({ ...form, booth_number: e.target.value })} placeholder="B-12" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label">Contact Email</label><input type="email" className="input" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
          </div>
          <div><label className="label">Website</label><input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
