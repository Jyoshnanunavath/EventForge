import { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Users, Search } from 'lucide-react';
import { supabase, type Venue } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { Modal } from '@/components/Modal';

const facilitiesList = ['WiFi', 'Projector', 'Stage', 'Audio System', 'Catering', 'Parking', 'AC', 'Live Streaming', 'Translation Booth', 'Green Room'];

export function VenuesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', city: '', country: '', capacity: 100, description: '', image_url: '', facilities: [] as string[],
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('venues').select('*').order('created_at', { ascending: false });
      setVenues((data as Venue[]) || []);
      setLoading(false);
    })();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', address: '', city: '', country: '', capacity: 100, description: '', image_url: '', facilities: [] });
    setModalOpen(true);
  }

  function openEdit(v: Venue) {
    setEditing(v);
    setForm({ name: v.name, address: v.address, city: v.city, country: v.country, capacity: v.capacity, description: v.description, image_url: v.image_url, facilities: v.facilities });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('venues').update(form).eq('id', editing.id);
      if (error) toast(error.message, 'error');
      else { toast('Venue updated'); setVenues((prev) => prev.map((v) => v.id === editing.id ? { ...v, ...form } : v)); setModalOpen(false); }
    } else {
      const { data, error } = await supabase.from('venues').insert({ ...form, owner_id: profile!.id }).select().single();
      if (error) toast(error.message, 'error');
      else { toast('Venue created'); setVenues((prev) => [data as Venue, ...prev]); setModalOpen(false); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this venue?')) return;
    const { error } = await supabase.from('venues').delete().eq('id', id);
    if (error) toast(error.message, 'error');
    else { toast('Venue deleted'); setVenues((prev) => prev.filter((v) => v.id !== id)); }
  }

  const filtered = venues.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()) || v.city.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Venues</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Manage event spaces and facilities</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Venue</button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input className="input pl-10" placeholder="Search venues…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<MapPin className="w-8 h-8" />} title="No venues yet" description="Add your first venue to start creating events" action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Venue</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((v) => (
            <div key={v.id} className="card overflow-hidden group">
              <div className="h-32 overflow-hidden relative">
                {v.image_url ? <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"><MapPin className="w-10 h-10 text-white/40" /></div>}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-neutral-900">{v.name}</h3>
                <p className="text-sm text-neutral-500 flex items-center gap-1.5 mt-1"><MapPin className="w-3.5 h-3.5" />{v.city}, {v.country}</p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500"><Users className="w-3.5 h-3.5" /> Capacity: {v.capacity}</div>
                {v.facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {v.facilities.slice(0, 4).map((f) => <span key={f} className="badge-neutral">{f}</span>)}
                    {v.facilities.length > 4 && <span className="badge-neutral">+{v.facilities.length - 4}</span>}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openEdit(v)} className="btn-secondary flex-1 text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button onClick={() => handleDelete(v.id)} className="btn-ghost text-error-600 hover:bg-error-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Venue' : 'Add Venue'}
        size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Save'}</button></>}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Venue Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grand Conference Hall" /></div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">City</label><input className="input" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label className="label">Country</label><input className="input" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div><label className="label">Capacity</label><input type="number" min={1} className="input" required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          <div><label className="label">Image URL</label><input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <label className="label">Facilities</label>
            <div className="flex flex-wrap gap-2">
              {facilitiesList.map((f) => {
                const active = form.facilities.includes(f);
                return (
                  <button key={f} type="button" onClick={() => setForm({ ...form, facilities: active ? form.facilities.filter((x) => x !== f) : [...form.facilities, f] })} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{f}</button>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
