import { useEffect, useState } from 'react';
import { QrCode, Search, CheckCircle2, XCircle, Camera, ScanLine, Users, UserCheck } from 'lucide-react';
import { supabase, type Ticket, type Event, type Volunteer } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageLoader, EmptyState, StatCard } from '@/components/ui';
import { formatDateTime, cn } from '@/lib/utils';

type CheckInTab = 'attendees' | 'volunteers';

export function CheckInPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<CheckInTab>('attendees');

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data } = await supabase.from('events').select('*').eq('organizer_id', profile.id).order('start_date', { ascending: false });
      setEvents((data as Event[]) || []);
      if ((data as Event[])?.length > 0) setSelectedEvent((data as Event[])[0].id);
      setLoading(false);
    })();
  }, [profile]);

  useEffect(() => {
    if (!selectedEvent) { setTickets([]); setVolunteers([]); return; }
    (async () => {
      const [{ data: tData }, { data: vData }] = await Promise.all([
        supabase.from('tickets').select('*').eq('event_id', selectedEvent).order('created_at', { ascending: false }),
        supabase.from('volunteers').select('*').eq('event_id', selectedEvent).order('name'),
      ]);
      setTickets((tData as Ticket[]) || []);
      setVolunteers((vData as Volunteer[]) || []);
    })();
  }, [selectedEvent]);

  async function handleCheckIn(ticket: Ticket) {
    if (ticket.checked_in) { toast('Already checked in', 'info'); return; }
    setProcessing(true);
    const { error } = await supabase.from('tickets').update({ checked_in: true, checked_in_at: new Date().toISOString() }).eq('id', ticket.id);
    if (error) { toast(error.message, 'error'); setProcessing(false); return; }
    setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, checked_in: true, checked_in_at: new Date().toISOString() } : t));
    toast(`${ticket.attendee_name || 'Attendee'} checked in successfully`);
    setProcessing(false);
  }

  async function handleVolunteerCheckIn(volunteer: Volunteer) {
    if (volunteer.status === 'checked_in') { toast('Already checked in', 'info'); return; }
    setProcessing(true);
    const { error } = await supabase.from('volunteers').update({ status: 'checked_in' }).eq('id', volunteer.id);
    if (error) { toast(error.message, 'error'); setProcessing(false); return; }
    setVolunteers((prev) => prev.map((v) => v.id === volunteer.id ? { ...v, status: 'checked_in' as const } : v));
    toast(`${volunteer.name} checked in — assigned to ${volunteer.assigned_role || 'Floater'}`);
    setProcessing(false);
  }

  async function handleQRSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim() || !selectedEvent) return;

    if (tab === 'attendees') {
      const ticket = tickets.find((t) => t.qr_code === search.trim());
      if (!ticket) { toast('Invalid ticket code for this event', 'error'); return; }
      await handleCheckIn(ticket);
    } else {
      // Volunteer QR: match by name or email (volunteers use name-based codes)
      const code = search.trim().toLowerCase();
      const volunteer = volunteers.find((v) =>
        v.name.toLowerCase().replace(/\s/g, '') === code ||
        v.email.toLowerCase() === code ||
        v.id.slice(0, 8) === code,
      );
      if (!volunteer) { toast('Volunteer not found for this event', 'error'); return; }
      await handleVolunteerCheckIn(volunteer);
    }
    setSearch('');
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<QrCode className="w-8 h-8" />} title="No events to manage" description="Create an event first to use the check-in system" />;

  const checkedIn = tickets.filter((t) => t.checked_in).length;
  const totalTickets = tickets.length;
  const confirmedTickets = tickets.filter((t) => t.status === 'confirmed').length;
  const checkedInVolunteers = volunteers.filter((v) => v.status === 'checked_in').length;
  const assignedVolunteers = volunteers.filter((v) => v.status === 'assigned').length;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-neutral-900">Check-in System</h1><p className="text-sm text-neutral-500 mt-0.5">Validate attendee tickets and volunteer QR entry at the door</p></div>

      <div>
        <label className="label">Select Event</label>
        <select className="input sm:w-96" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {selectedEvent && (
        <>
          {/* Tab switcher */}
          <div className="flex gap-2">
            <button onClick={() => setTab('attendees')} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors', tab === 'attendees' ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50')}>
              <Users className="w-4 h-4" /> Attendees
            </button>
            <button onClick={() => setTab('volunteers')} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors', tab === 'volunteers' ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50')}>
              <UserCheck className="w-4 h-4" /> Volunteers
            </button>
          </div>

          {/* Stats */}
          {tab === 'attendees' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Total Tickets" value={String(totalTickets)} icon={<Users className="w-5 h-5" />} color="primary" />
              <StatCard label="Confirmed" value={String(confirmedTickets)} icon={<CheckCircle2 className="w-5 h-5" />} color="accent" />
              <StatCard label="Checked In" value={String(checkedIn)} icon={<ScanLine className="w-5 h-5" />} color="warning" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Total Volunteers" value={String(volunteers.length)} icon={<Users className="w-5 h-5" />} color="primary" />
              <StatCard label="Assigned" value={String(assignedVolunteers)} icon={<UserCheck className="w-5 h-5" />} color="accent" />
              <StatCard label="Checked In" value={String(checkedInVolunteers)} icon={<ScanLine className="w-5 h-5" />} color="warning" />
            </div>
          )}

          {/* QR Scanner */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary-600" />
              {tab === 'attendees' ? 'Scan or Enter Ticket QR Code' : 'Scan or Enter Volunteer QR Code'}
            </h3>
            <form onSubmit={handleQRSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input className="input pl-10 font-mono" placeholder={tab === 'attendees' ? 'Enter QR code…' : 'Enter volunteer name or code…'} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button type="submit" disabled={processing || !search.trim()} className="btn-primary">Check In</button>
            </form>
            <p className="text-xs text-neutral-400 mt-2">
              {tab === 'attendees'
                ? 'Enter the ticket QR code value to validate and check in the attendee.'
                : 'Enter the volunteer name, email, or ID to check in and confirm their assigned role.'}
            </p>
          </div>

          {/* List */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900">
                {tab === 'attendees' ? `Attendees (${tickets.length})` : `Volunteers (${volunteers.length})`}
              </h3>
            </div>
            {tab === 'attendees' ? (
              tickets.length === 0 ? (
                <p className="text-sm text-neutral-400 py-10 text-center">No tickets sold for this event yet.</p>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {tickets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', t.checked_in ? 'bg-accent-100 text-accent-600' : 'bg-neutral-100 text-neutral-400')}>
                          {t.checked_in ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{t.attendee_name || 'Unknown'}</p>
                          <p className="text-xs text-neutral-500 truncate">{t.attendee_email} · {t.quantity} ticket(s)</p>
                          {t.checked_in && t.checked_in_at && <p className="text-xs text-accent-600 mt-0.5">Checked in: {formatDateTime(t.checked_in_at)}</p>}
                        </div>
                      </div>
                      <button onClick={() => handleCheckIn(t)} disabled={t.checked_in || processing} className={cn('btn text-xs', t.checked_in ? 'bg-neutral-100 text-neutral-400 cursor-default' : 'btn-accent')}>
                        {t.checked_in ? 'Done' : 'Check In'}
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              volunteers.length === 0 ? (
                <p className="text-sm text-neutral-400 py-10 text-center">No volunteers registered for this event yet.</p>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {volunteers.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', v.status === 'checked_in' ? 'bg-accent-100 text-accent-600' : v.status === 'assigned' ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-400')}>
                          {v.status === 'checked_in' ? <CheckCircle2 className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{v.name}</p>
                          <p className="text-xs text-neutral-500 truncate">
                            {v.assigned_role ? `${v.assigned_role} · ${v.assigned_zone}` : 'Unassigned'} · {v.email}
                          </p>
                          {v.status === 'checked_in' && <p className="text-xs text-accent-600 mt-0.5">Checked in</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleVolunteerCheckIn(v)}
                        disabled={v.status === 'checked_in' || processing}
                        className={cn('btn text-xs', v.status === 'checked_in' ? 'bg-neutral-100 text-neutral-400 cursor-default' : 'btn-accent')}
                      >
                        {v.status === 'checked_in' ? 'Done' : 'Check In'}
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
