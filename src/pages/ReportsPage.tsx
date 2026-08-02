import { useEffect, useState } from 'react';
import { FileBarChart, Download, CalendarDays, DollarSign, Users, Ticket as TicketIcon, CheckCircle2 } from 'lucide-react';
import { supabase, type Event, type Ticket, type Speaker, type Session, type Sponsor, type Exhibitor } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { PageLoader, EmptyState } from '@/components/ui';
import { formatMoney, formatDate, categoryColor, statusColor, cn } from '@/lib/utils';

export function ReportsPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'summary' | 'tickets' | 'events' | 'sponsors'>('summary');

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: eData } = await supabase.from('events').select('*').eq('organizer_id', profile.id).order('start_date', { ascending: false });
      const eventList = (eData as Event[]) || [];
      setEvents(eventList);
      if (eventList.length > 0) {
        const ids = eventList.map((e) => e.id);
        const [t, sp, se, sp2, ex] = await Promise.all([
          supabase.from('tickets').select('*').in('event_id', ids),
          supabase.from('speakers').select('*').in('event_id', ids),
          supabase.from('sessions').select('*').in('event_id', ids),
          supabase.from('sponsors').select('*').in('event_id', ids),
          supabase.from('exhibitors').select('*').in('event_id', ids),
        ]);
        setTickets((t.data as Ticket[]) || []);
        setSpeakers((sp.data as Speaker[]) || []);
        setSessions((se.data as Session[]) || []);
        setSponsors((sp2.data as Sponsor[]) || []);
        setExhibitors((ex.data as Exhibitor[]) || []);
      }
      setLoading(false);
    })();
  }, [profile]);

  function exportCSV() {
    let csv = '';
    if (reportType === 'summary') {
      csv = 'Metric,Value\n';
      csv += `Total Events,${events.length}\n`;
      csv += `Total Tickets Sold,${tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0)}\n`;
      csv += `Total Revenue,${tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + Number(t.total_amount), 0)}\n`;
      csv += `Total Speakers,${speakers.length}\n`;
      csv += `Total Sessions,${sessions.length}\n`;
      csv += `Total Sponsors,${sponsors.length}\n`;
      csv += `Total Exhibitors,${exhibitors.length}\n`;
      csv += `Checked In,${tickets.filter((t) => t.checked_in).length}\n`;
    } else if (reportType === 'tickets') {
      csv = 'Event,Attendee,Email,Type,Quantity,Amount,Status,Checked In,Date\n';
      tickets.forEach((t) => {
        const ev = events.find((e) => e.id === t.event_id)?.title || '';
        csv += `"${ev}","${t.attendee_name}","${t.attendee_email}","${t.ticket_type}",${t.quantity},${t.total_amount},${t.status},${t.checked_in ? 'Yes' : 'No'},${formatDate(t.created_at)}\n`;
      });
    } else if (reportType === 'events') {
      csv = 'Title,Category,Status,Start Date,End Date,Max Attendees,Price,Capacity Used,Revenue\n';
      events.forEach((e) => {
        const eTickets = tickets.filter((t) => t.event_id === e.id && t.status === 'confirmed');
        const sold = eTickets.reduce((s, t) => s + t.quantity, 0);
        const rev = eTickets.reduce((s, t) => s + Number(t.total_amount), 0);
        csv += `"${e.title}","${e.category}","${e.status}","${formatDate(e.start_date)}","${formatDate(e.end_date)}",${e.max_attendees},${e.price},${sold},${rev}\n`;
      });
    } else if (reportType === 'sponsors') {
      csv = 'Event,Sponsor,Tier,Website\n';
      sponsors.forEach((s) => {
        const ev = events.find((e) => e.id === s.event_id)?.title || '';
        csv += `"${ev}","${s.name}","${s.tier}","${s.website}"\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventforge-${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Report exported as CSV');
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<FileBarChart className="w-8 h-8" />} title="No reports available" description="Create events to generate reports" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  const confirmed = tickets.filter((t) => t.status === 'confirmed');
  const revenue = confirmed.reduce((s, t) => s + Number(t.total_amount), 0);
  const sold = confirmed.reduce((s, t) => s + t.quantity, 0);
  const checkedIn = tickets.filter((t) => t.checked_in).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-neutral-900">Reports</h1><p className="text-sm text-neutral-500 mt-0.5">Generate and export event reports</p></div>
        <button onClick={exportCSV} className="btn-primary"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      {/* Report type tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {([
          { value: 'summary', label: 'Summary', icon: <FileBarChart className="w-4 h-4" /> },
          { value: 'tickets', label: 'Tickets', icon: <TicketIcon className="w-4 h-4" /> },
          { value: 'events', label: 'Events', icon: <CalendarDays className="w-4 h-4" /> },
          { value: 'sponsors', label: 'Sponsors', icon: <Users className="w-4 h-4" /> },
        ] as const).map((t) => (
          <button key={t.value} onClick={() => setReportType(t.value)} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors', reportType === t.value ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50')}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Summary report */}
      {reportType === 'summary' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5"><div className="flex items-center gap-2 mb-2 text-primary-600"><CalendarDays className="w-5 h-5" /></div><p className="text-2xl font-bold">{events.length}</p><p className="text-sm text-neutral-500">Total Events</p></div>
            <div className="card p-5"><div className="flex items-center gap-2 mb-2 text-accent-600"><TicketIcon className="w-5 h-5" /></div><p className="text-2xl font-bold">{sold}</p><p className="text-sm text-neutral-500">Tickets Sold</p></div>
            <div className="card p-5"><div className="flex items-center gap-2 mb-2 text-warning-600"><DollarSign className="w-5 h-5" /></div><p className="text-2xl font-bold">{formatMoney(revenue, 'INR')}</p><p className="text-sm text-neutral-500">Revenue</p></div>
            <div className="card p-5"><div className="flex items-center gap-2 mb-2 text-primary-600"><CheckCircle2 className="w-5 h-5" /></div><p className="text-2xl font-bold">{checkedIn}</p><p className="text-sm text-neutral-500">Checked In</p></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5"><p className="text-2xl font-bold">{speakers.length}</p><p className="text-sm text-neutral-500">Speakers</p></div>
            <div className="card p-5"><p className="text-2xl font-bold">{sessions.length}</p><p className="text-sm text-neutral-500">Sessions</p></div>
            <div className="card p-5"><p className="text-2xl font-bold">{sponsors.length}</p><p className="text-sm text-neutral-500">Sponsors</p></div>
            <div className="card p-5"><p className="text-2xl font-bold">{exhibitors.length}</p><p className="text-sm text-neutral-500">Exhibitors</p></div>
          </div>
        </div>
      )}

      {/* Tickets report */}
      {reportType === 'tickets' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase"><tr><th className="text-left p-3 font-medium">Event</th><th className="text-left p-3 font-medium">Attendee</th><th className="text-left p-3 font-medium">Type</th><th className="text-right p-3 font-medium">Qty</th><th className="text-right p-3 font-medium">Amount</th><th className="text-left p-3 font-medium">Status</th><th className="text-center p-3 font-medium">Checked In</th></tr></thead>
              <tbody className="divide-y divide-neutral-50">
                {tickets.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-neutral-400">No tickets sold yet</td></tr> : tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-medium text-neutral-900 truncate max-w-[160px]">{events.find((e) => e.id === t.event_id)?.title}</td>
                    <td className="p-3">{t.attendee_name}</td>
                    <td className="p-3 text-neutral-500">{t.ticket_type}</td>
                    <td className="p-3 text-right">{t.quantity}</td>
                    <td className="p-3 text-right font-semibold">{formatMoney(t.total_amount, t.currency)}</td>
                    <td className="p-3"><span className={cn('badge', statusColor(t.status))}>{t.status}</span></td>
                    <td className="p-3 text-center">{t.checked_in ? <CheckCircle2 className="w-4 h-4 text-accent-500 inline" /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events report */}
      {reportType === 'events' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase"><tr><th className="text-left p-3 font-medium">Event</th><th className="text-left p-3 font-medium">Category</th><th className="text-left p-3 font-medium">Status</th><th className="text-left p-3 font-medium">Date</th><th className="text-right p-3 font-medium">Sold</th><th className="text-right p-3 font-medium">Revenue</th></tr></thead>
              <tbody className="divide-y divide-neutral-50">
                {events.map((e) => {
                  const eTickets = tickets.filter((t) => t.event_id === e.id && t.status === 'confirmed');
                  return (
                    <tr key={e.id} className="hover:bg-neutral-50">
                      <td className="p-3 font-medium text-neutral-900">{e.title}</td>
                      <td className="p-3"><span className={cn('badge', categoryColor(e.category))}>{e.category}</span></td>
                      <td className="p-3"><span className={cn('badge', statusColor(e.status))}>{e.status}</span></td>
                      <td className="p-3 text-neutral-500">{formatDate(e.start_date)}</td>
                      <td className="p-3 text-right">{eTickets.reduce((s, t) => s + t.quantity, 0)}/{e.max_attendees}</td>
                      <td className="p-3 text-right font-semibold">{formatMoney(eTickets.reduce((s, t) => s + Number(t.total_amount), 0), e.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sponsors report */}
      {reportType === 'sponsors' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase"><tr><th className="text-left p-3 font-medium">Sponsor</th><th className="text-left p-3 font-medium">Event</th><th className="text-left p-3 font-medium">Tier</th><th className="text-left p-3 font-medium">Website</th></tr></thead>
              <tbody className="divide-y divide-neutral-50">
                {sponsors.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-neutral-400">No sponsors yet</td></tr> : sponsors.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-medium text-neutral-900">{s.name}</td>
                    <td className="p-3 text-neutral-500">{events.find((e) => e.id === s.event_id)?.title}</td>
                    <td className="p-3 capitalize">{s.tier}</td>
                    <td className="p-3 text-primary-600 truncate max-w-[200px]">{s.website || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
