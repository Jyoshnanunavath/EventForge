import { useEffect, useState } from 'react';
import { Armchair, Sparkles, Wand2, Save, Trash2, MapPin, Crown, Building } from 'lucide-react';
import { supabase, type Event, type SeatingArrangement, type SeatingLayout } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { generateSeatingLayout, type SeatingConfig } from '@/lib/ai';
import { PageLoader, EmptyState, Spinner, StatCard } from '@/components/ui';
import { cn } from '@/lib/utils';

const styles = [
  { value: 'theater', label: 'Theater', desc: 'Rows facing stage — max capacity', icon: <Armchair className="w-5 h-5" /> },
  { value: 'banquet', label: 'Banquet', desc: 'Round tables — best for networking', icon: <Building className="w-5 h-5" /> },
  { value: 'classroom', label: 'Classroom', desc: 'Tables + chairs — for workshops', icon: <Armchair className="w-5 h-5" /> },
  { value: 'ushape', label: 'U-Shape', desc: 'Interactive — under 40 people', icon: <Armchair className="w-5 h-5" /> },
] as const;

export function SeatingArrangementPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [arrangements, setArrangements] = useState<SeatingArrangement[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [layout, setLayout] = useState<SeatingLayout | null>(null);
  const [config, setConfig] = useState<SeatingConfig>({
    capacity: 100,
    style: 'theater',
    vipPercentage: 10,
    hasStage: true,
    stagePosition: 'top',
    aisleEvery: 4,
  });

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data: eData } = await supabase.from('events').select('*').eq('organizer_id', profile.id).order('start_date', { ascending: false });
      const eventList = (eData as Event[]) || [];
      setEvents(eventList);
      if (eventList.length > 0) {
        setSelectedEvent(eventList[0].id);
        setConfig((c) => ({ ...c, capacity: eventList[0].max_attendees }));
      }
      setLoading(false);
    })();
  }, [profile]);

  useEffect(() => {
    if (!selectedEvent) return;
    (async () => {
      const { data } = await supabase.from('seating_arrangements').select('*').eq('event_id', selectedEvent).order('created_at', { ascending: false });
      setArrangements((data as SeatingArrangement[]) || []);
    })();
  }, [selectedEvent]);

  useEffect(() => {
    if (selectedEvent) {
      const ev = events.find((e) => e.id === selectedEvent);
      if (ev) setConfig((c) => ({ ...c, capacity: ev.max_attendees }));
    }
  }, [selectedEvent, events]);

  async function handleGenerate() {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    const result = generateSeatingLayout(config);
    setLayout(result);
    setGenerating(false);
    toast(`Layout generated — ${result.totalSeats} seats across ${result.rows.length} rows`);
  }

  async function handleSave() {
    if (!layout || !selectedEvent) return;
    setSaving(true);
    const { data, error } = await supabase.from('seating_arrangements').insert({
      event_id: selectedEvent,
      name: `${styles.find((s) => s.value === config.style)?.label} Layout — ${new Date().toLocaleDateString()}`,
      layout,
      capacity: layout.totalSeats,
      vip_zones: layout.vipZones.length,
      has_stage: config.hasStage,
    }).select().single();
    if (error) toast(error.message, 'error');
    else { toast('Seating arrangement saved'); setArrangements((p) => [data as SeatingArrangement, ...p]); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this seating arrangement?')) return;
    const { error } = await supabase.from('seating_arrangements').delete().eq('id', id);
    if (error) toast(error.message, 'error'); else { toast('Arrangement deleted'); setArrangements((p) => p.filter((a) => a.id !== id)); }
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<Armchair className="w-8 h-8" />} title="No events available" description="Create an event first to generate seating" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
          <Armchair className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">AI Seating Arrangement</h1>
          <p className="text-xs text-neutral-500">Generate optimized floor plans automatically</p>
        </div>
      </div>

      <select className="input sm:w-64" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
        {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>

      {/* Configuration */}
      <div className="card p-6 space-y-5">
        <h3 className="font-semibold text-neutral-900">Layout Configuration</h3>

        {/* Style selector */}
        <div>
          <label className="label">Seating Style</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {styles.map((s) => (
              <button key={s.value} onClick={() => setConfig({ ...config, style: s.value })} className={cn('flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all', config.style === s.value ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300')}>
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', config.style === s.value ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500')}>{s.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{s.label}</p>
                  <p className="text-xs text-neutral-500">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Capacity</label>
            <input type="number" min={1} className="input" value={config.capacity} onChange={(e) => setConfig({ ...config, capacity: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">VIP Percentage: {config.vipPercentage}%</label>
            <input type="range" min={0} max={30} className="w-full mt-2 accent-primary-600" value={config.vipPercentage} onChange={(e) => setConfig({ ...config, vipPercentage: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Aisle Every N Rows</label>
            <input type="number" min={1} max={10} className="input" value={config.aisleEvery} onChange={(e) => setConfig({ ...config, aisleEvery: Number(e.target.value) })} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Stage</label>
            <div className="flex gap-2">
              <button onClick={() => setConfig({ ...config, hasStage: true })} className={cn('btn flex-1 text-sm', config.hasStage ? 'btn-primary' : 'btn-secondary')}>With Stage</button>
              <button onClick={() => setConfig({ ...config, hasStage: false })} className={cn('btn flex-1 text-sm', !config.hasStage ? 'btn-primary' : 'btn-secondary')}>No Stage</button>
            </div>
          </div>
          <div>
            <label className="label">Stage Position</label>
            <select className="input" value={config.stagePosition} onChange={(e) => setConfig({ ...config, stagePosition: e.target.value as SeatingConfig['stagePosition'] })} disabled={!config.hasStage}>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleGenerate} disabled={generating} className="btn-primary flex-1">
            {generating ? <Spinner /> : <><Wand2 className="w-4 h-4" /> Generate Layout</>}
          </button>
          {layout && (
            <button onClick={handleSave} disabled={saving} className="btn-accent">
              {saving ? <Spinner /> : <><Save className="w-4 h-4" /> Save Layout</>}
            </button>
          )}
        </div>
      </div>

      {/* Visual layout */}
      {layout && (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Visual Layout</h3>
            <div className="flex gap-2 text-xs">
              <span className="badge-warning"><Crown className="w-3 h-3" /> VIP</span>
              <span className="badge-neutral">General</span>
              <span className="badge-primary"><MapPin className="w-3 h-3" /> Stage</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Seats" value={String(layout.totalSeats)} icon={<Armchair className="w-5 h-5" />} color="primary" />
            <StatCard label="Rows" value={String(layout.rows.length)} icon={<Armchair className="w-5 h-5" />} color="accent" />
            <StatCard label="VIP Zones" value={String(layout.vipZones.length)} icon={<Crown className="w-5 h-5" />} color="warning" />
          </div>

          {/* Stage */}
          {config.hasStage && (
            <div className={cn('flex justify-center mb-6', config.stagePosition === 'bottom' && 'order-2')}>
              <div className="bg-gradient-to-r from-primary-500 to-primary-700 text-white text-sm font-semibold px-12 py-3 rounded-xl shadow-glow" style={{ width: `${config.stagePosition === 'left' || config.stagePosition === 'right' ? '60px' : '60%'}` }}>
                {config.stagePosition === 'left' || config.stagePosition === 'right' ? (
                  <div className="writing-mode-vertical text-center" style={{ writingMode: 'vertical-rl' }}>STAGE</div>
                ) : 'STAGE'}
              </div>
            </div>
          )}

          {/* Seating rows */}
          <div className={cn('space-y-2', config.stagePosition === 'left' && 'flex flex-row gap-4', config.stagePosition === 'right' && 'flex flex-row-reverse gap-4')}>
            {layout.rows.map((row, i) => (
              <div key={row.id} className={cn('flex items-center gap-2', config.stagePosition === 'left' || config.stagePosition === 'right' ? 'flex-col' : 'flex-row')}>
                <span className="text-xs text-neutral-400 w-12 shrink-0 text-right">{row.label}</span>
                <div className="flex flex-1 flex-wrap gap-1 justify-center">
                  {Array.from({ length: Math.min(row.seats, 30) }, (_, j) => (
                    <div
                      key={j}
                      className={cn(
                        'w-5 h-5 rounded-md border-2 transition-all hover:scale-110',
                        row.zone === 'VIP' ? 'bg-warning-500/20 border-warning-400' : 'bg-neutral-100 border-neutral-300',
                      )}
                      title={`${row.label} — Seat ${j + 1}`}
                    />
                  ))}
                  {row.seats > 30 && <span className="text-xs text-neutral-400 self-center">+{row.seats - 30} more</span>}
                </div>
                {layout.aisles.includes(i) && <div className="w-2 h-8 border-l-2 border-dashed border-neutral-300" />}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 rounded-xl bg-neutral-50 text-xs text-neutral-500 space-y-1">
            <p><strong>Layout details:</strong> {layout.rows.length} rows, {layout.totalSeats} total seats, {layout.vipZones.length} VIP zone(s), {layout.aisles.length} aisle(s)</p>
            <p>Each square represents a seat. VIP seats are highlighted in amber. Dashed lines indicate aisles for easy movement.</p>
          </div>
        </div>
      )}

      {/* Saved arrangements */}
      {arrangements.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Saved Arrangements</h3>
          <div className="space-y-2">
            {arrangements.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{a.name}</p>
                  <p className="text-xs text-neutral-500">{a.capacity} seats · {a.vip_zones} VIP zone(s) · {a.has_stage ? 'With stage' : 'No stage'}</p>
                </div>
                <button onClick={() => handleDelete(a.id)} className="btn-ghost text-error-600 hover:bg-error-50 p-1.5"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
