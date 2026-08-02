import { useEffect, useState } from 'react';
import { Users, Sparkles, Wand2, Plus, Trash2, UserCheck, MapPin } from 'lucide-react';
import { supabase, type Event, type Volunteer } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { allocateVolunteers, volunteerRoles } from '@/lib/ai';
import { PageLoader, EmptyState, Spinner, StatCard } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';

const skillOptions = ['Customer Service', 'Communication', 'Organization', 'Technical', 'Audio Visual', 'IT', 'Hospitality', 'Crowd Management', 'Time Management', 'Knowledge', 'Flexible', 'First Aid'];
const experienceLevels = ['beginner', 'intermediate', 'expert'];
const availabilityOptions = ['full', 'partial', 'limited'];

export function VolunteerAllocationPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', skills: [] as string[], availability: 'full', experience: 'beginner', preferred_role: '' });

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data: eData } = await supabase.from('events').select('*').eq('organizer_id', profile.id).order('start_date', { ascending: false });
      const eventList = (eData as Event[]) || [];
      setEvents(eventList);
      if (eventList.length > 0) setSelectedEvent(eventList[0].id);
      setLoading(false);
    })();
  }, [profile]);

  useEffect(() => {
    if (!selectedEvent) return;
    (async () => {
      const { data } = await supabase.from('volunteers').select('*').eq('event_id', selectedEvent).order('name');
      setVolunteers((data as Volunteer[]) || []);
    })();
  }, [selectedEvent]);

  async function handleAddVolunteer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.from('volunteers').insert({ ...form, event_id: selectedEvent }).select().single();
    if (error) toast(error.message, 'error');
    else { toast('Volunteer added'); setVolunteers((p) => [...p, data as Volunteer]); setModalOpen(false); setForm({ name: '', email: '', phone: '', skills: [], availability: 'full', experience: 'beginner', preferred_role: '' }); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this volunteer?')) return;
    const { error } = await supabase.from('volunteers').delete().eq('id', id);
    if (error) toast(error.message, 'error'); else { toast('Volunteer removed'); setVolunteers((p) => p.filter((v) => v.id !== id)); }
  }

  async function handleAllocate() {
    if (volunteers.length === 0) return;
    setAllocating(true);
    await new Promise((r) => setTimeout(r, 1000));
    const allocated = allocateVolunteers(volunteers);
    // Save assignments to database
    for (const v of allocated) {
      await supabase.from('volunteers').update({
        assigned_role: v.assigned_role,
        assigned_task: v.assigned_task,
        assigned_zone: v.assigned_zone,
        status: 'assigned',
      }).eq('id', v.id);
    }
    setVolunteers(allocated);
    setAllocating(false);
    toast(`AI allocated ${allocated.length} volunteers to optimal roles`);
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<Users className="w-8 h-8" />} title="No events available" description="Create an event first to manage volunteers" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  const assignedCount = volunteers.filter((v) => v.status === 'assigned').length;
  const unassignedCount = volunteers.filter((v) => v.status === 'unassigned').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">AI Volunteer Allocation</h1>
          <p className="text-xs text-neutral-500">Smart role assignment based on skills & experience</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select className="input sm:w-64" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={() => setModalOpen(true)} className="btn-secondary"><Plus className="w-4 h-4" /> Add Volunteer</button>
          <button onClick={handleAllocate} disabled={allocating || volunteers.length === 0} className="btn-primary">
            {allocating ? <Spinner /> : <><Wand2 className="w-4 h-4" /> AI Allocate</>}
          </button>
        </div>
      </div>

      {volunteers.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Volunteers" value={String(volunteers.length)} icon={<Users className="w-5 h-5" />} color="primary" />
          <StatCard label="Assigned" value={String(assignedCount)} icon={<UserCheck className="w-5 h-5" />} color="accent" />
          <StatCard label="Unassigned" value={String(unassignedCount)} icon={<Users className="w-5 h-5" />} color="warning" />
        </div>
      )}

      {volunteers.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="No volunteers yet" description="Add volunteers and let AI assign them to optimal roles" action={<button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Volunteer</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {volunteers.map((v) => (
            <div key={v.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold shrink-0">
                    {v.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">{v.name}</h3>
                    <p className="text-xs text-neutral-500 capitalize">{v.experience} · {v.availability} availability</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(v.id)} className="btn-ghost text-error-600 hover:bg-error-50 p-1.5"><Trash2 className="w-4 h-4" /></button>
              </div>

              {v.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {v.skills.map((s) => <span key={s} className="badge-neutral">{s}</span>)}
                </div>
              )}

              {v.status === 'assigned' ? (
                <div className="p-3 rounded-xl bg-accent-50 border border-accent-100">
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck className="w-4 h-4 text-accent-600" />
                    <span className="text-sm font-semibold text-accent-700">{v.assigned_role}</span>
                  </div>
                  <p className="text-xs text-accent-600">{v.assigned_task}</p>
                  <p className="text-xs text-accent-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {v.assigned_zone}</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <p className="text-sm text-neutral-400">Unassigned — run AI allocation to assign</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Role reference */}
      {volunteers.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-neutral-900 mb-3 text-sm">Available Roles</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {volunteerRoles.map((r) => (
              <div key={r.role} className="flex items-start gap-2 p-2 rounded-lg bg-neutral-50">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', r.priority === 'high' ? 'bg-error-500' : r.priority === 'medium' ? 'bg-warning-500' : 'bg-neutral-400')} />
                <div>
                  <p className="text-xs font-semibold text-neutral-900">{r.role}</p>
                  <p className="text-xs text-neutral-500">{r.task}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add volunteer modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Volunteer" size="lg" footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button onClick={handleAddVolunteer} disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Add'}</button></>}>
        <form onSubmit={handleAddVolunteer} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <label className="label">Skills</label>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((s) => {
                const active = form.skills.includes(s);
                return <button key={s} type="button" onClick={() => setForm({ ...form, skills: active ? form.skills.filter((x) => x !== s) : [...form.skills, s] })} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', active ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}>{s}</button>;
              })}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Experience</label><select className="input" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })}>{experienceLevels.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}</select></div>
            <div><label className="label">Availability</label><select className="input" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>{availabilityOptions.map((a) => <option key={a} value={a} className="capitalize">{a}</option>)}</select></div>
          </div>
          <div><label className="label">Preferred Role (optional)</label><input className="input" value={form.preferred_role} onChange={(e) => setForm({ ...form, preferred_role: e.target.value })} placeholder="e.g. Registration, AV Tech" /></div>
        </form>
      </Modal>
    </div>
  );
}
