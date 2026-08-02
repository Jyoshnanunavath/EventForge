import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wand2, Sparkles, Target } from 'lucide-react';
import { supabase, type Event, type Ticket } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { predictBudget, type BudgetPrediction } from '@/lib/ai';
import { PageLoader, EmptyState, StatCard, Spinner } from '@/components/ui';
import { DonutChart } from '@/components/Charts';
import { formatMoney, cn } from '@/lib/utils';

export function BudgetPredictionPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<BudgetPrediction | null>(null);
  const [costs, setCosts] = useState({ venue: 0, catering: 0, av: 0, marketing: 0, staffing: 0, misc: 0 });

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
      const { data } = await supabase.from('tickets').select('*').eq('event_id', selectedEvent);
      setTickets((data as Ticket[]) || []);
      setPrediction(null);
    })();
  }, [selectedEvent]);

  async function handlePredict() {
    if (!selectedEvent) return;
    setPredicting(true);
    await new Promise((r) => setTimeout(r, 800));
    const event = events.find((e) => e.id === selectedEvent)!;
    const sold = tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);
    const result = predictBudget({
      maxAttendees: event.max_attendees,
      ticketPrice: event.price,
      ticketsSold: sold,
      venueCost: costs.venue,
      cateringCost: costs.catering,
      avCost: costs.av,
      marketingCost: costs.marketing,
      staffingCost: costs.staffing,
      miscCost: costs.misc,
    });
    setPrediction(result);
    setPredicting(false);
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<DollarSign className="w-8 h-8" />} title="No events available" description="Create an event to use budget prediction" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  const event = events.find((e) => e.id === selectedEvent);
  const sold = tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);

  const costFields = [
    { key: 'venue' as const, label: 'Venue Cost', placeholder: '5000' },
    { key: 'catering' as const, label: 'Catering Cost', placeholder: '2000' },
    { key: 'av' as const, label: 'AV & Tech Cost', placeholder: '1500' },
    { key: 'marketing' as const, label: 'Marketing Cost', placeholder: '1000' },
    { key: 'staffing' as const, label: 'Staffing Cost', placeholder: '800' },
    { key: 'misc' as const, label: 'Miscellaneous', placeholder: '500' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Budget Prediction</h1>
          <p className="text-xs text-neutral-500">AI-powered cost forecasting and break-even analysis</p>
        </div>
      </div>

      <select className="input sm:w-64" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
        {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>

      {/* Cost inputs */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-neutral-900">Enter Your Estimated Costs</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {costFields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">₹</span>
                <input type="number" min={0} className="input pl-7" value={costs[f.key]} onChange={(e) => setCosts({ ...costs, [f.key]: Number(e.target.value) })} placeholder={f.placeholder} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50">
          <span className="text-sm text-neutral-500">Current ticket price</span>
          <span className="text-sm font-semibold text-neutral-900">{event?.price === 0 ? 'Free event' : formatMoney(event?.price || 0, event?.currency)}</span>
        </div>
        <button onClick={handlePredict} disabled={predicting} className="btn-primary w-full">
          {predicting ? <Spinner /> : <><Wand2 className="w-4 h-4" /> Predict Budget & Profitability</>}
        </button>
      </div>

      {prediction ? (
        <div className="space-y-5 animate-fade-in">
          {/* Key stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Cost" value={formatMoney(prediction.totalEstimatedCost, 'INR')} icon={<DollarSign className="w-5 h-5" />} color="error" />
            <StatCard label="Projected Revenue" value={formatMoney(prediction.projectedRevenue, 'INR')} icon={<TrendingUp className="w-5 h-5" />} color="accent" />
            <StatCard label={prediction.projectedProfit >= 0 ? 'Projected Profit' : 'Projected Loss'} value={formatMoney(Math.abs(prediction.projectedProfit), 'INR')} icon={prediction.projectedProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />} color={prediction.projectedProfit >= 0 ? 'accent' : 'error'} />
            <StatCard label="Cost / Attendee" value={formatMoney(prediction.costPerAttendee, 'INR')} icon={<Target className="w-5 h-5" />} color="primary" />
          </div>

          {/* Break-even */}
          <div className={cn('card p-6', prediction.projectedProfit >= 0 ? 'border-accent-200 bg-accent-50/30' : 'border-error-200 bg-error-50/30')}>
            <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-primary-600" /> Break-Even Analysis</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white">
                <p className="text-xs text-neutral-500">Tickets needed to break even</p>
                <p className="text-2xl font-bold text-neutral-900">{prediction.breakEvenTickets}</p>
                <p className="text-xs text-neutral-400 mt-1">at current price of {formatMoney(event?.price || 0, event?.currency)}</p>
              </div>
              <div className="p-4 rounded-xl bg-white">
                <p className="text-xs text-neutral-500">Minimum price to break even</p>
                <p className="text-2xl font-bold text-neutral-900">{formatMoney(prediction.breakEvenPrice, 'INR')}</p>
                <p className="text-xs text-neutral-400 mt-1">based on {sold} tickets sold</p>
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Cost Breakdown</h3>
            <DonutChart data={prediction.costBreakdown.map((c) => ({ label: c.category, value: c.amount, color: { Venue: '#8b5cf6', Catering: '#10b981', 'AV & Tech': '#f59e0b', Marketing: '#3b82f6', Staffing: '#ef4444', Miscellaneous: '#94a3b8' }[c.category] || '#94a3b8' }))} />
          </div>

          {/* Recommendations */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary-600" /> AI Recommendations</h3>
            <ul className="space-y-2">
              {prediction.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-600"><span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />{r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <DollarSign className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-400">Enter your estimated costs and click "Predict Budget" to see profitability analysis</p>
        </div>
      )}
    </div>
  );
}
