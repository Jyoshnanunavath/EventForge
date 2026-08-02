import { useEffect, useState } from 'react';
import { FileText, Sparkles, Wand2, Save, Trash2, Download, Clock } from 'lucide-react';
import { supabase, type Event, type Ticket, type Speaker, type Session, type Sponsor, type Exhibitor, type Volunteer, type EventFeedback, type EventReport, type EventReportData } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { generateEventReport, summarizeSentiment } from '@/lib/ai';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { formatDate, formatMoney, cn } from '@/lib/utils';

export function AIReportGeneratorPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [feedback, setFeedback] = useState<EventFeedback[]>([]);
  const [reports, setReports] = useState<EventReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState<EventReportData | null>(null);

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
      const [tRes, spRes, sessRes, sponRes, exRes, vRes, fRes, rRes] = await Promise.all([
        supabase.from('tickets').select('*').eq('event_id', selectedEvent),
        supabase.from('speakers').select('*').eq('event_id', selectedEvent),
        supabase.from('sessions').select('*').eq('event_id', selectedEvent),
        supabase.from('sponsors').select('*').eq('event_id', selectedEvent),
        supabase.from('exhibitors').select('*').eq('event_id', selectedEvent),
        supabase.from('volunteers').select('*').eq('event_id', selectedEvent),
        supabase.from('event_feedback').select('*').eq('event_id', selectedEvent),
        supabase.from('event_reports').select('*').eq('event_id', selectedEvent).order('created_at', { ascending: false }),
      ]);
      setTickets((tRes.data as Ticket[]) || []);
      setSpeakers((spRes.data as Speaker[]) || []);
      setSessions((sessRes.data as Session[]) || []);
      setSponsors((sponRes.data as Sponsor[]) || []);
      setExhibitors((exRes.data as Exhibitor[]) || []);
      setVolunteers((vRes.data as Volunteer[]) || []);
      setFeedback((fRes.data as EventFeedback[]) || []);
      setReports((rRes.data as EventReport[]) || []);
      setReportData(null);
    })();
  }, [selectedEvent]);

  async function handleGenerate() {
    if (!selectedEvent) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    const event = events.find((e) => e.id === selectedEvent)!;
    const sold = tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);
    const revenue = tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + Number(t.total_amount), 0);
    const checkedIn = tickets.filter((t) => t.checked_in).length;
    const feedbackSummary = feedback.length > 0 ? summarizeSentiment(feedback) : undefined;
    const data = generateEventReport({
      event,
      ticketsSold: sold,
      totalRevenue: revenue,
      checkedIn,
      speakerCount: speakers.length,
      sessionCount: sessions.length,
      sponsorCount: sponsors.length,
      exhibitorCount: exhibitors.length,
      volunteerCount: volunteers.length,
      feedbackSummary,
    });
    setReportData(data);
    setGenerating(false);
    toast('AI report generated successfully');
  }

  async function handleSave() {
    if (!reportData || !selectedEvent || !profile) return;
    setSaving(true);
    const event = events.find((e) => e.id === selectedEvent)!;
    const { data, error } = await supabase.from('event_reports').insert({
      event_id: selectedEvent,
      generated_by: profile.id,
      title: `Report — ${event.title} — ${new Date().toLocaleDateString()}`,
      report_data: reportData,
    }).select().single();
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    setReports((prev) => [data as EventReport, ...prev]);
    toast('Report saved to database');
    setSaving(false);
  }

  function handleDownload() {
    if (!reportData) return;
    const blob = new Blob([reportData.fullReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-report-${selectedEvent}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Report downloaded');
  }

  async function handleDeleteReport(id: string) {
    if (!confirm('Delete this report?')) return;
    const { error } = await supabase.from('event_reports').delete().eq('id', id);
    if (error) toast(error.message, 'error'); else { toast('Report deleted'); setReports((prev) => prev.filter((r) => r.id !== id)); }
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<FileText className="w-8 h-8" />} title="No events available" description="Create an event first to generate reports" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">AI Event Report Generator</h1>
          <p className="text-xs text-neutral-500">Automatically generate comprehensive post-event reports</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select className="input sm:w-64" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary">
          {generating ? <Spinner /> : <><Wand2 className="w-4 h-4" /> Generate Report</>}
        </button>
        {reportData && (
          <>
            <button onClick={handleSave} disabled={saving} className="btn-accent">{saving ? <Spinner /> : <><Save className="w-4 h-4" /> Save</>}</button>
            <button onClick={handleDownload} className="btn-secondary"><Download className="w-4 h-4" /> Download</button>
          </>
        )}
      </div>

      {reportData ? (
        <div className="space-y-5 animate-fade-in">
          {/* Summary */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary-600" /> Executive Summary</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">{reportData.summary}</p>
          </div>

          {/* Metrics */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Key Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {reportData.metrics.map((m, i) => (
                <div key={i} className="p-3 rounded-xl bg-neutral-50">
                  <p className="text-lg font-bold text-neutral-900">{m.value}</p>
                  <p className="text-xs text-neutral-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Insights & Highlights */}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900 mb-3">AI Insights</h3>
              <ul className="space-y-2">
                {reportData.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-600"><span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />{insight}</li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900 mb-3">Highlights</h3>
              <div className="flex flex-wrap gap-2">
                {reportData.highlights.map((h, i) => <span key={i} className="badge-success">{h}</span>)}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-3">Recommendations for Next Event</h3>
            <ul className="space-y-2">
              {reportData.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-600"><span className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 shrink-0" />{r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-400">Click "Generate Report" to create a comprehensive AI-powered event report</p>
          <p className="text-xs text-neutral-400 mt-1">Includes metrics, insights, highlights, and recommendations</p>
        </div>
      )}

      {/* Saved reports */}
      {reports.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Saved Reports</h3>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{r.title}</p>
                  <p className="text-xs text-neutral-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(r.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setReportData(r.report_data)} className="btn-ghost text-xs">View</button>
                  <button onClick={() => handleDeleteReport(r.id)} className="btn-ghost text-error-600 hover:bg-error-50 p-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
