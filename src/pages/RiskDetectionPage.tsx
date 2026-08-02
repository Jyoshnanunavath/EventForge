import { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Shield, Wand2, Sparkles } from 'lucide-react';
import { supabase, type Event, type Ticket, type Speaker, type Session, type Sponsor, type Volunteer } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { detectRisks, type RiskItem } from '@/lib/ai';
import { PageLoader, EmptyState, StatCard, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

const severityConfig = {
  critical: { color: 'bg-error-500/10 text-error-700 border-error-200', bar: 'bg-error-500', icon: <ShieldAlert className="w-5 h-5" /> },
  high: { color: 'bg-warning-500/10 text-warning-700 border-warning-200', bar: 'bg-warning-500', icon: <AlertTriangle className="w-5 h-5" /> },
  medium: { color: 'bg-info-500/10 text-info-700 border-info-200', bar: 'bg-info-500', icon: <AlertTriangle className="w-5 h-5" /> },
  low: { color: 'bg-neutral-100 text-neutral-600 border-neutral-200', bar: 'bg-neutral-400', icon: <CheckCircle2 className="w-5 h-5" /> },
};

export function RiskDetectionPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [risks, setRisks] = useState<RiskItem[]>([]);

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
      const [tRes, spRes, sessRes, sponRes, vRes] = await Promise.all([
        supabase.from('tickets').select('*').eq('event_id', selectedEvent),
        supabase.from('speakers').select('*').eq('event_id', selectedEvent),
        supabase.from('sessions').select('*').eq('event_id', selectedEvent),
        supabase.from('sponsors').select('*').eq('event_id', selectedEvent),
        supabase.from('volunteers').select('*').eq('event_id', selectedEvent),
      ]);
      setTickets((tRes.data as Ticket[]) || []);
      setSpeakers((spRes.data as Speaker[]) || []);
      setSessions((sessRes.data as Session[]) || []);
      setSponsors((sponRes.data as Sponsor[]) || []);
      setVolunteers((vRes.data as Volunteer[]) || []);
      setRisks([]);
    })();
  }, [selectedEvent]);

  async function handleScan() {
    if (!selectedEvent) return;
    setScanning(true);
    await new Promise((r) => setTimeout(r, 1000));
    const event = events.find((e) => e.id === selectedEvent)!;
    const sold = tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);
    const assignedVolunteers = volunteers.filter((v) => v.status === 'assigned').length;
    const daysUntil = Math.ceil((new Date(event.start_date).getTime() - Date.now()) / 86400000);
    const detected = detectRisks({
      event,
      ticketsSold: sold,
      speakersConfirmed: speakers.length,
      sessionsScheduled: sessions.length,
      hasVenue: !!event.venue_id,
      daysUntilEvent: daysUntil,
      volunteersAssigned: assignedVolunteers,
      sponsorCount: sponsors.length,
    });
    setRisks(detected);
    setScanning(false);
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<ShieldAlert className="w-8 h-8" />} title="No events to scan" description="Create an event first to use risk detection" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  const criticalCount = risks.filter((r) => r.severity === 'critical').length;
  const highCount = risks.filter((r) => r.severity === 'high').length;
  const mediumCount = risks.filter((r) => r.severity === 'medium').length;
  const lowCount = risks.filter((r) => r.severity === 'low').length;
  const overallRiskScore = risks.length > 0 ? Math.round(risks.reduce((s, r) => s + r.riskScore, 0) / risks.length) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Risk Detection Dashboard</h1>
          <p className="text-xs text-neutral-500">AI-powered risk assessment and mitigation guidance</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select className="input sm:w-64" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <button onClick={handleScan} disabled={scanning} className="btn-primary">
          {scanning ? <Spinner /> : <><Wand2 className="w-4 h-4" /> Scan for Risks</>}
        </button>
      </div>

      {risks.length > 0 ? (
        <div className="space-y-5 animate-fade-in">
          {/* Overall risk score */}
          <div className={cn('card p-6', overallRiskScore > 70 ? 'border-error-200 bg-error-50/30' : overallRiskScore > 40 ? 'border-warning-200 bg-warning-50/30' : 'border-accent-200 bg-accent-50/30')}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2"><Shield className="w-5 h-5" /> Overall Risk Assessment</h3>
              <span className={cn('text-2xl font-bold', overallRiskScore > 70 ? 'text-error-600' : overallRiskScore > 40 ? 'text-warning-600' : 'text-accent-600')}>{overallRiskScore}/100</span>
            </div>
            <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-700', overallRiskScore > 70 ? 'bg-error-500' : overallRiskScore > 40 ? 'bg-warning-500' : 'bg-accent-500')} style={{ width: `${overallRiskScore}%` }} />
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              {overallRiskScore > 70 ? 'High risk — immediate action required on critical items' : overallRiskScore > 40 ? 'Moderate risk — address high-priority items soon' : 'Low risk — event is in good shape, monitor remaining items'}
            </p>
          </div>

          {/* Risk stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Critical" value={String(criticalCount)} icon={<ShieldAlert className="w-5 h-5" />} color="error" />
            <StatCard label="High" value={String(highCount)} icon={<AlertTriangle className="w-5 h-5" />} color="warning" />
            <StatCard label="Medium" value={String(mediumCount)} icon={<AlertTriangle className="w-5 h-5" />} color="primary" />
            <StatCard label="Low" value={String(lowCount)} icon={<CheckCircle2 className="w-5 h-5" />} color="accent" />
          </div>

          {/* Risk items */}
          <div className="space-y-3">
            {risks.map((risk) => {
              const cfg = severityConfig[risk.severity];
              return (
                <div key={risk.id} className={cn('card p-5 border-2', cfg.color)}>
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5">{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">{risk.category}</span>
                        <span className={cn('badge capitalize', cfg.color)}>{risk.severity}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-900 mb-2">{risk.description}</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5"><span className="text-neutral-500">Likelihood</span><span className="font-medium">{risk.likelihood}%</span></div>
                          <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden"><div className={cn('h-full rounded-full', cfg.bar)} style={{ width: `${risk.likelihood}%` }} /></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5"><span className="text-neutral-500">Impact</span><span className="font-medium">{risk.impact}%</span></div>
                          <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden"><div className={cn('h-full rounded-full', cfg.bar)} style={{ width: `${risk.impact}%` }} /></div>
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-xs text-neutral-500">Risk Score</p>
                          <p className="text-lg font-bold text-neutral-900">{risk.riskScore}</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/60 border border-white/40">
                        <p className="text-xs font-medium text-neutral-700 mb-0.5 flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary-500" /> AI Mitigation Strategy</p>
                        <p className="text-xs text-neutral-600">{risk.mitigation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-400">Click "Scan for Risks" to run an AI-powered risk assessment</p>
          <p className="text-xs text-neutral-400 mt-1">Analyzes ticket sales, speakers, sessions, venue, volunteers, and timeline</p>
        </div>
      )}
    </div>
  );
}
