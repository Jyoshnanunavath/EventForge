import { useEffect, useState } from 'react';
import { TrendingUp, Users, Clock, AlertTriangle, Sparkles, Wand2 } from 'lucide-react';
import { supabase, type Event, type Ticket, type Session } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { predictCrowd, type CrowdPrediction } from '@/lib/ai';
import { PageLoader, EmptyState, StatCard, Spinner } from '@/components/ui';
import { LineChart } from '@/components/Charts';
import { formatTime, cn } from '@/lib/utils';

export function CrowdPredictionPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<CrowdPrediction | null>(null);
  const [hasFood, setHasFood] = useState(true);

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
      const [{ data: tData }, { data: sData }] = await Promise.all([
        supabase.from('tickets').select('*').eq('event_id', selectedEvent),
        supabase.from('sessions').select('*').eq('event_id', selectedEvent),
      ]);
      setTickets((tData as Ticket[]) || []);
      setSessions((sData as Session[]) || []);
      setPrediction(null);
    })();
  }, [selectedEvent]);

  async function handlePredict() {
    if (!selectedEvent) return;
    setPredicting(true);
    await new Promise((r) => setTimeout(r, 800));
    const event = events.find((e) => e.id === selectedEvent)!;
    const sold = tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);
    const result = predictCrowd({
      ticketsSold: sold,
      maxCapacity: event.max_attendees,
      eventStart: event.start_date,
      eventEnd: event.end_date,
      isFreeEvent: event.price === 0,
      hasFood,
    });
    setPrediction(result);
    setPredicting(false);
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<TrendingUp className="w-8 h-8" />} title="No events to analyze" description="Create an event first to use crowd prediction" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  const event = events.find((e) => e.id === selectedEvent);
  const sold = tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Crowd Prediction Dashboard</h1>
          <p className="text-xs text-neutral-500">AI-powered attendance and crowd flow forecasting</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select className="input sm:w-64" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-neutral-200 text-sm cursor-pointer">
          <input type="checkbox" checked={hasFood} onChange={(e) => setHasFood(e.target.checked)} className="accent-primary-600" />
          Event includes catering
        </label>
        <button onClick={handlePredict} disabled={predicting} className="btn-primary">
          {predicting ? <Spinner /> : <><Wand2 className="w-4 h-4" /> Predict Crowd</>}
        </button>
      </div>

      {prediction ? (
        <div className="space-y-5 animate-fade-in">
          {/* Key stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Expected Attendance" value={String(prediction.expectedAttendance)} icon={<Users className="w-5 h-5" />} color="primary" />
            <StatCard label="No-Show Rate" value={`${Math.round(prediction.noShowRate * 100)}%`} icon={<AlertTriangle className="w-5 h-5" />} color="warning" />
            <StatCard label="Peak Arrival" value={formatTime(prediction.peakArrivalTime)} icon={<Clock className="w-5 h-5" />} color="accent" />
            <StatCard label="Confidence" value={`${prediction.confidenceLevel}%`} icon={<TrendingUp className="w-5 h-5" />} color="primary" />
          </div>

          {/* Crowd density chart */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-600" /> Crowd Density Over Time</h3>
            <LineChart data={prediction.crowdDensity.map((d) => ({ label: d.label, value: d.count }))} height={200} />
          </div>

          {/* Peak arrival detail */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-primary-600" /> Peak Arrival Window</h3>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-50">
              <div className="text-3xl font-bold text-primary-700">{prediction.peakArrivalCount}</div>
              <div>
                <p className="text-sm font-medium text-neutral-900">attendees arriving in a 15-minute window</p>
                <p className="text-xs text-neutral-500">Peak at {formatTime(prediction.peakArrivalTime)} — {Math.round((prediction.peakArrivalCount / event!.max_attendees) * 100)}% of venue capacity at once</p>
              </div>
            </div>
          </div>

          {/* Timeline breakdown */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Crowd Timeline Breakdown</h3>
            <div className="space-y-2">
              {prediction.crowdDensity.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500 w-24 shrink-0">{d.label}</span>
                  <div className="flex-1 h-6 rounded-lg bg-neutral-100 overflow-hidden">
                    <div className={cn('h-full rounded-lg transition-all duration-500', d.density > 0.7 ? 'bg-error-500' : d.density > 0.4 ? 'bg-warning-500' : 'bg-primary-500')} style={{ width: `${Math.min(d.density * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-neutral-700 w-16 text-right shrink-0">{d.count} ppl</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary-600" /> AI Recommendations</h3>
            <ul className="space-y-2">
              {prediction.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <TrendingUp className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-400">Click "Predict Crowd" to generate AI-powered attendance forecasts</p>
          <p className="text-xs text-neutral-400 mt-1">Based on {sold} tickets sold and {event?.max_attendees} capacity</p>
        </div>
      )}
    </div>
  );
}
