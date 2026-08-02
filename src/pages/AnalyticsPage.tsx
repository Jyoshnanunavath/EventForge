import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Ticket as TicketIcon, CalendarDays } from 'lucide-react';
import { supabase, type Event, type Ticket } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { PageLoader, EmptyState, StatCard } from '@/components/ui';
import { BarChart, LineChart, DonutChart, ProgressBar } from '@/components/Charts';
import { formatMoney, categoryColor, cn } from '@/lib/utils';

export function AnalyticsPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>('all');

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: eData } = await supabase.from('events').select('*').eq('organizer_id', profile.id).order('start_date', { ascending: false });
      const eventList = (eData as Event[]) || [];
      setEvents(eventList);
      if (eventList.length > 0) {
        const { data: tData } = await supabase.from('tickets').select('*').in('event_id', eventList.map((e) => e.id));
        setTickets((tData as Ticket[]) || []);
      }
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No data to analyze" description="Create events and sell tickets to see analytics" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  const filteredTickets = eventFilter === 'all' ? tickets : tickets.filter((t) => t.event_id === eventFilter);
  const confirmed = filteredTickets.filter((t) => t.status === 'confirmed');
  const revenue = confirmed.reduce((sum, t) => sum + Number(t.total_amount), 0);
  const totalSold = confirmed.reduce((sum, t) => sum + t.quantity, 0);
  const checkedIn = filteredTickets.filter((t) => t.checked_in).length;
  const checkInRate = totalSold > 0 ? Math.round((checkedIn / totalSold) * 100) : 0;

  // Revenue by event
  const revenueByEvent = events.map((e) => ({
    label: e.title.slice(0, 8),
    value: Math.round(tickets.filter((t) => t.event_id === e.id && t.status === 'confirmed').reduce((s, t) => s + Number(t.total_amount), 0)),
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Tickets over time (last 7 days)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const count = filteredTickets.filter((t) => t.created_at.slice(0, 10) === dayStr).length;
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), value: count };
  });

  // Category distribution
  const catData = events.reduce((acc, e) => {
    const existing = acc.find((a) => a.label === e.category);
    if (existing) existing.value++;
    else acc.push({ label: e.category, value: 1, color: { Technology: '#8b5cf6', Business: '#10b981', Marketing: '#f59e0b', Education: '#3b82f6', Entertainment: '#ef4444', General: '#94a3b8' }[e.category] || '#94a3b8' });
    return acc;
  }, [] as { label: string; value: number; color: string }[]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-neutral-900">Analytics</h1><p className="text-sm text-neutral-500 mt-0.5">Deep insights into your events</p></div>
        <select className="input sm:w-64" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="all">All Events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatMoney(revenue, 'INR')} icon={<DollarSign className="w-5 h-5" />} trend="+15%" color="primary" />
        <StatCard label="Tickets Sold" value={String(totalSold)} icon={<TicketIcon className="w-5 h-5" />} trend="+8%" color="accent" />
        <StatCard label="Check-in Rate" value={`${checkInRate}%`} icon={<Users className="w-5 h-5" />} color="warning" />
        <StatCard label="Avg. Order Value" value={formatMoney(confirmed.length > 0 ? revenue / confirmed.length : 0, 'INR')} icon={<TrendingUp className="w-5 h-5" />} color="primary" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary-600" /> Revenue by Event</h3>
          {revenueByEvent.some((d) => d.value > 0) ? <BarChart data={revenueByEvent} /> : <p className="text-sm text-neutral-400 py-12 text-center">No revenue data yet</p>}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary-600" /> Ticket Sales (Last 7 Days)</h3>
          {last7Days.some((d) => d.value > 0) ? <LineChart data={last7Days} /> : <p className="text-sm text-neutral-400 py-12 text-center">No recent sales</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary-600" /> Events by Category</h3>
          {catData.length > 0 ? <DonutChart data={catData} /> : <p className="text-sm text-neutral-400 py-12 text-center">No events</p>}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Capacity Utilization</h3>
          <div className="space-y-4">
            {events.slice(0, 6).map((e) => {
              const sold = tickets.filter((t) => t.event_id === e.id && t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);
              return <ProgressBar key={e.id} label={e.title} value={sold} max={e.max_attendees} color={sold / e.max_attendees > 0.8 ? 'error' : 'accent'} />;
            })}
          </div>
        </div>
      </div>

      {/* Event performance table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-neutral-100"><h3 className="font-semibold text-neutral-900">Event Performance</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase">
              <tr>
                <th className="text-left p-3 font-medium">Event</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Sold</th>
                <th className="text-right p-3 font-medium">Capacity</th>
                <th className="text-right p-3 font-medium">Revenue</th>
                <th className="text-right p-3 font-medium">Checked In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {events.map((e) => {
                const eTickets = tickets.filter((t) => t.event_id === e.id);
                const sold = eTickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);
                const rev = eTickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + Number(t.total_amount), 0);
                const ci = eTickets.filter((t) => t.checked_in).length;
                return (
                  <tr key={e.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-medium text-neutral-900">{e.title}</td>
                    <td className="p-3"><span className={cn('badge', categoryColor(e.category))}>{e.category}</span></td>
                    <td className="p-3 text-right">{sold}</td>
                    <td className="p-3 text-right text-neutral-500">{e.max_attendees}</td>
                    <td className="p-3 text-right font-semibold">{formatMoney(rev, e.currency)}</td>
                    <td className="p-3 text-right">{ci}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
