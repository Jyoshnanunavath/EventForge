import { useEffect, useState } from 'react';
import { CalendarClock, Sparkles, Wand2, Clock, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { supabase, type Event, type Session, type Speaker } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { generateSchedule, type ScheduleResult, type GeneratedSlot } from '@/lib/ai';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { formatTime, cn } from '@/lib/utils';

const trackColors = ['bg-primary-100 text-primary-700 border-primary-200', 'bg-accent-100 text-accent-700 border-accent-200', 'bg-warning-500/15 text-warning-700 border-warning-200', 'bg-info-500/15 text-info-700 border-info-200'];

export function ScheduleGeneratorPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [numTracks, setNumTracks] = useState(3);
  const [sessionDuration, setSessionDuration] = useState(45);
  const [saving, setSaving] = useState(false);

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
    if (!selectedEvent) { setSessions([]); setResult(null); return; }
    (async () => {
      const [{ data: sData }, { data: spData }] = await Promise.all([
        supabase.from('sessions').select('*').eq('event_id', selectedEvent).order('start_time'),
        supabase.from('speakers').select('*').eq('event_id', selectedEvent),
      ]);
      setSessions((sData as Session[]) || []);
      setSpeakers((spData as Speaker[]) || []);
      setResult(null);
    })();
  }, [selectedEvent]);

  async function handleGenerate() {
    if (!selectedEvent || sessions.length === 0) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    const event = events.find((e) => e.id === selectedEvent)!;
    const res = generateSchedule({ event, sessions, speakers, numTracks, sessionDuration });
    setResult(res);
    setGenerating(false);
    if (res.conflicts.length > 0) toast(`${res.conflicts.length} conflict(s) detected — review the schedule`, 'info');
    else toast('Schedule generated successfully — no conflicts!');
  }

  async function handleSaveSchedule() {
    if (!result || !selectedEvent) return;
    setSaving(true);
    let updated = 0;
    for (const slot of result.slots) {
      const { error } = await supabase.from('sessions').update({
        start_time: slot.start_time,
        end_time: slot.end_time,
        room: slot.room,
        track: slot.track,
      }).eq('id', slot.session_id);
      if (!error) updated++;
    }
    setSaving(false);
    toast(`${updated} sessions updated with generated schedule`);
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<CalendarClock className="w-8 h-8" />} title="No events to schedule" description="Create an event with sessions first" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
          <CalendarClock className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Automatic Schedule Generator</h1>
          <p className="text-xs text-neutral-500">AI-powered conflict-free session scheduling</p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="label">Event</label>
          <select className="input" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-400 mb-4">No sessions found for this event.</p>
            <button onClick={() => navigate(`/sessions?event=${selectedEvent}`)} className="btn-secondary">Add Sessions</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Parallel Tracks</label>
                <select className="input" value={numTracks} onChange={(e) => setNumTracks(Number(e.target.value))}>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} track{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Session Duration</label>
                <select className="input" value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))}>
                  {[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleGenerate} disabled={generating} className="btn-primary flex-1">
                {generating ? <Spinner /> : <><Wand2 className="w-4 h-4" /> Generate Schedule</>}
              </button>
              {result && (
                <button onClick={handleSaveSchedule} disabled={saving} className="btn-accent">
                  {saving ? <Spinner /> : <><Save className="w-4 h-4" /> Apply to Sessions</>}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4"><p className="text-2xl font-bold text-neutral-900">{result.slots.length}</p><p className="text-xs text-neutral-500">Sessions Scheduled</p></div>
            <div className="card p-4"><p className="text-2xl font-bold text-neutral-900">{result.tracks.length}</p><p className="text-xs text-neutral-500">Tracks</p></div>
            <div className="card p-4"><p className="text-2xl font-bold text-neutral-900">{formatTime(result.startTime)}</p><p className="text-xs text-neutral-500">Start Time</p></div>
            <div className="card p-4"><p className="text-2xl font-bold text-neutral-900">{formatTime(result.endTime)}</p><p className="text-xs text-neutral-500">End Time</p></div>
          </div>

          {/* Conflicts */}
          {result.conflicts.length > 0 && (
            <div className="card p-4 border-warning-200 bg-warning-500/5">
              <h3 className="font-semibold text-warning-700 flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5" /> Conflicts Detected</h3>
              <ul className="space-y-1">
                {result.conflicts.map((c, i) => <li key={i} className="text-sm text-warning-600">• {c}</li>)}
              </ul>
            </div>
          )}

          {/* Timeline */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-primary-600" /> Generated Timeline</h3>
            <div className="space-y-2">
              {result.slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors">
                  <div className="text-center shrink-0 w-20">
                    <p className="text-sm font-bold text-neutral-900">{formatTime(slot.start_time)}</p>
                    <p className="text-xs text-neutral-400">{formatTime(slot.end_time)}</p>
                  </div>
                  <div className="w-px h-10 bg-neutral-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{slot.title}</p>
                    <p className="text-xs text-neutral-500">{slot.speaker_name} · {slot.room}</p>
                  </div>
                  <span className={cn('badge border', trackColors[i % result.tracks.length])}>{slot.track}</span>
                  {slot.conflict ? <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-accent-500 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
