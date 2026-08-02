import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { supabase, type Sponsor, type Event, type SponsorTier } from '@/lib/supabase';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { tierColor, cn } from '@/lib/utils';

const tiers: SponsorTier[] = ['platinum', 'gold', 'silver', 'bronze'];

export function SponsorsPage() {
  const { route } = useRouter();
  const { toast } = useToast();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>(route.params.event || 'all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ event_id: '', name: '', tier: 'silver' as SponsorTier, logo_url: '', website: '', description: '' });

  useEffect(() => {
    (async () => {
      const [{ data: spData }, { data: eData }] = await Promise.all([
        supabase.from('sponsors').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('title'),
      ]);
      setSponsors((spData as Sponsor[]) || []);
      setEvents((eData as Event[]) || []);
      if (route.params.event) setForm((f) => ({ ...f, event_id: route.params.event }));
      setLoading(false);
    })();
  }, [route.params.event]);

  function openCreate() { setEditing(null); setForm({ event_id: eventFilter !== 'all' ? eventFilter : events[0]?.id || '', name: '', tier: 'silver', logo_url: '', website: '', description: '' }); setModalOpen(true); }
  function openEdit(s: Sponsor) { setEditing(s); setForm({ event_id: s.event_id, name: s.name, tier: s.tier, logo_url: s.logo_url, website: s.website, description: s.description }); setModalOpen(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('sponsors').update(form).eq('id', editing.id);
      if (error) toast(error.message, 'error'); else { toast('Sponsor updated'); setSponsors((p) => p.map((s) => s.id === editing.id ? { ...s, ...form } : s)); setModalOpen(false); }
    } else {
      const { data, error } = await supabase.from('sponsors').insert(form).select().single();
      if (error) toast(error.message, 'error'); else { toast('Sponsor added'); setSponsors((p) => [data as Sponsor, ...p]); setModalOpen(false); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this sponsor?')) return;
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) toast(error.message, 'error'); else { toast('Sponsor removed'); setSponsors((p) => p.filter((s) => s.id !== id)); }
  }

  const filtered = eventFilter === 'all' ? sponsors : sponsors.filter((s) => s.event_id === eventFilter);
  const eventMap = new Map(events.map((e) => [e.id, e.title]));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-neutral-900">Sponsors</h1><p className="text-sm text-neutral-500 mt-0.5">Manage event sponsors by tier</p></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Sponsor</button>
      </div>

      <select className="input sm:w-64" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
        <option value="all">All Events</option>
        {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>

      {filtered.length === 0 ? (
        <EmptyState icon={<Building2 className="w-8 h-8" />} title="No sponsors yet" description="Add sponsors to your events" action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Sponsor</button>} />
      ) : (
        <div className="space-y-6">
          {tiers.map((tier) => {
            const tierSponsors = filtered.filter((s) => s.tier === tier);
            if (tierSponsors.length === 0) return null;
            return (
              <div key={tier}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={cn('px-3 py-1 rounded-lg text-sm font-bold capitalize', tierColor(tier))}>{tier}</span>
                  <span className="text-xs text-neutral-400">{tierSponsors.length} sponsor{tierSponsors.length > 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tierSponsors.map((s) => (
                    <div key={s.id} className="card p-5">
                      <div className="flex items-start gap-3">
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0', tierColor(s.tier))}>{s.name.slice(0, 2).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-neutral-900 truncate">{s.name}</h3>
                          <p className="text-xs text-primary-600 mt-0.5">{eventMap.get(s.event_id)}</p>
                          {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="text-xs text-neutral-500 hover:text-primary-600 flex items-center gap-1 mt-1 truncate"><ExternalLink className="w-3 h-3" />{s.website}</a>}
                        </div>
                      </div>
                      {s.description && <p className="text-xs text-neutral-500 mt-3 line-clamp-2">{s.description}</p>}
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => openEdit(s)} className="btn-secondary flex-1 text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                        <button onClick={() => handleDelete(s.id)} className="btn-ghost text-error-600 hover:bg-error-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Sponsor' : 'Add Sponsor'} size="md" footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Save'}</button></>}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Event</label><select className="input" required value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}><option value="">Select event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
          <div><label className="label">Sponsor Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Tier</label><select className="input" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as SponsorTier })}>{tiers.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}</select></div>
          <div><label className="label">Website</label><input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
