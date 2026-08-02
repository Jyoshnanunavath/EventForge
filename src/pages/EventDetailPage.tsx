import { useEffect, useState } from 'react';
import {
  CalendarDays, MapPin, Users, DollarSign, Clock, Mic, Building2,
  Pencil, Ticket as TicketIcon, Share2, ArrowLeft, UserCircle,
} from 'lucide-react';
import { supabase, type Event, type Speaker, type Session, type Sponsor, type Exhibitor, type Ticket } from '@/lib/supabase';
import { useRouter } from '@/context/Router';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import {
  formatDate, formatTime, formatMoney, categoryColor, statusColor, tierColor, cn, formatDateTime, generateToken,
} from '@/lib/utils';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { Modal } from '@/components/Modal';

export function EventDetailPage({ eventId }: { eventId: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [booking, setBooking] = useState({ quantity: 1, name: '', email: '', card: '', expiry: '', cvc: '' });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: eData }, { data: sData }, { data: sessData }, { data: spData }, { data: exData }, { data: tData }] = await Promise.all([
        supabase.from('events').select('*, venue:venues(*), organizer:profiles(*)').eq('id', eventId).maybeSingle(),
        supabase.from('speakers').select('*').eq('event_id', eventId).order('name'),
        supabase.from('sessions').select('*, speaker:speakers(*)').eq('event_id', eventId).order('start_time'),
        supabase.from('sponsors').select('*').eq('event_id', eventId).order('tier'),
        supabase.from('exhibitors').select('*').eq('event_id', eventId).order('name'),
        supabase.from('tickets').select('*').eq('event_id', eventId),
      ]);
      setEvent(eData as Event | null);
      setSpeakers((sData as Speaker[]) || []);
      setSessions((sessData as Session[]) || []);
      setSponsors((spData as Sponsor[]) || []);
      setExhibitors((exData as Exhibitor[]) || []);
      setTickets((tData as Ticket[]) || []);
      setLoading(false);
    })();
  }, [eventId]);

  const isOrganizer = profile?.id === event?.organizer_id;
  const soldCount = tickets.filter((t) => t.status === 'confirmed').reduce((sum, t) => sum + t.quantity, 0);
  const checkedInCount = tickets.filter((t) => t.checked_in).length;

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) { toast('Please sign in to book tickets', 'error'); return; }
    if (booking.card.replace(/\s/g, '').length < 12) { toast('Enter a valid card number', 'error'); return; }
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1200));
    const qrToken = generateToken();
    const total = (event?.price || 0) * booking.quantity;
    const { data, error } = await supabase.from('tickets').insert({
      event_id: eventId,
      attendee_id: profile.id,
      ticket_type: 'General',
      quantity: booking.quantity,
      unit_price: event?.price || 0,
      total_amount: total,
      currency: event?.currency || 'INR',
      status: 'confirmed',
      payment_method: 'card',
      payment_ref: 'MOCK-' + generateToken().slice(0, 8).toUpperCase(),
      qr_code: qrToken,
      attendee_name: booking.name,
      attendee_email: booking.email,
    }).select().single();
    setPaying(false);
    if (error) { toast(error.message, 'error'); return; }
    await supabase.from('notifications').insert({
      user_id: profile.id,
      event_id: eventId,
      type: 'booking',
      title: 'Booking Confirmed',
      message: `Your ticket for "${event?.title}" is confirmed. Check your email for the QR code.`,
    });
    setBookingOpen(false);
    toast('Booking confirmed! Your QR ticket is ready.');
    navigate(`/tickets/${data.id}`);
  }

  if (loading) return <PageLoader />;
  if (!event) return <EmptyState icon={<CalendarDays className="w-8 h-8" />} title="Event not found" description="This event may have been removed." action={<button onClick={() => navigate('/events')} className="btn-primary">Back to Events</button>} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/events')} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Back to Events</button>

      {/* Hero */}
      <div className="card overflow-hidden">
        <div className="relative h-56 sm:h-72">
          {event.banner_url ? (
            <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 flex items-center justify-center">
              <CalendarDays className="w-16 h-16 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex gap-2 mb-2">
              <span className={cn('badge', categoryColor(event.category))}>{event.category}</span>
              <span className={cn('badge', statusColor(event.status))}>{event.status}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">{event.title}</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><CalendarDays className="w-5 h-5" /></div>
              <div><p className="text-xs text-neutral-500">Starts</p><p className="text-sm font-semibold">{formatDateTime(event.start_date)}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
              <div><p className="text-xs text-neutral-500">Ends</p><p className="text-sm font-semibold">{formatDateTime(event.end_date)}</p></div>
            </div>
            {event.venue && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center"><MapPin className="w-5 h-5" /></div>
                <div><p className="text-xs text-neutral-500">Venue</p><p className="text-sm font-semibold truncate">{event.venue.name}</p></div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
              <div><p className="text-xs text-neutral-500">Ticket</p><p className="text-sm font-semibold">{event.price > 0 ? formatMoney(event.price, event.currency) : 'Free'}</p></div>
            </div>
          </div>

          {event.description && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">About this event</h3>
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {event.status === 'published' && (
              <button onClick={() => setBookingOpen(true)} className="btn-primary">
                <TicketIcon className="w-4 h-4" /> Book Ticket
              </button>
            )}
            {isOrganizer && (
              <button onClick={() => navigate(`/events/${eventId}/edit`)} className="btn-secondary">
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
            <button
              onClick={async () => { await navigator.clipboard.writeText(window.location.href); toast('Event link copied'); }}
              className="btn-ghost"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </div>

      {/* Stats for organizer */}
      {isOrganizer && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4"><p className="text-2xl font-bold text-neutral-900">{soldCount}</p><p className="text-xs text-neutral-500">Tickets Sold</p></div>
          <div className="card p-4"><p className="text-2xl font-bold text-neutral-900">{checkedInCount}</p><p className="text-xs text-neutral-500">Checked In</p></div>
          <div className="card p-4"><p className="text-2xl font-bold text-neutral-900">{speakers.length}</p><p className="text-xs text-neutral-500">Speakers</p></div>
          <div className="card p-4"><p className="text-2xl font-bold text-neutral-900">{sessions.length}</p><p className="text-xs text-neutral-500">Sessions</p></div>
        </div>
      )}

      {/* Sessions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary-600" /> Sessions</h2>
          {isOrganizer && <button onClick={() => navigate(`/sessions?event=${eventId}`)} className="btn-ghost text-sm">Manage →</button>}
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-neutral-400 py-6 text-center">No sessions scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-start gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="text-center shrink-0">
                  <p className="text-xs text-neutral-500">{formatTime(s.start_time)}</p>
                  <p className="text-xs text-neutral-400">{formatTime(s.end_time)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-neutral-900">{s.title}</h4>
                  {s.speaker && <p className="text-xs text-neutral-500 mt-0.5">{s.speaker.name} · {s.speaker.company}</p>}
                  <div className="flex gap-2 mt-1.5">
                    <span className="badge-neutral">{s.room || 'TBA'}</span>
                    <span className="badge-primary">{s.track}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Speakers */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><Mic className="w-5 h-5 text-primary-600" /> Speakers</h2>
          {isOrganizer && <button onClick={() => navigate(`/speakers?event=${eventId}`)} className="btn-ghost text-sm">Manage →</button>}
        </div>
        {speakers.length === 0 ? (
          <p className="text-sm text-neutral-400 py-6 text-center">No speakers announced yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {speakers.map((sp) => (
              <div key={sp.id} className="flex items-start gap-3 p-4 rounded-xl border border-neutral-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white shrink-0">
                  {sp.avatar_url ? <img src={sp.avatar_url} alt={sp.name} className="w-full h-full rounded-full object-cover" /> : <UserCircle className="w-6 h-6" />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-neutral-900 truncate">{sp.name}</h4>
                  <p className="text-xs text-neutral-500 truncate">{sp.title} · {sp.company}</p>
                  {sp.bio && <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{sp.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-primary-600" /> Sponsors</h2>
            {isOrganizer && <button onClick={() => navigate(`/sponsors?event=${eventId}`)} className="btn-ghost text-sm">Manage →</button>}
          </div>
          <div className="space-y-3">
            {(['platinum', 'gold', 'silver', 'bronze'] as const).map((tier) => {
              const tierSponsors = sponsors.filter((s) => s.tier === tier);
              if (tierSponsors.length === 0) return null;
              return (
                <div key={tier}>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">{tier}</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tierSponsors.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold', tierColor(s.tier))}>
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{s.name}</p>
                          {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline truncate block">{s.website}</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exhibitors */}
      {exhibitors.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-primary-600" /> Exhibitors</h2>
            {isOrganizer && <button onClick={() => navigate(`/exhibitors?event=${eventId}`)} className="btn-ghost text-sm">Manage →</button>}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {exhibitors.map((ex) => (
              <div key={ex.id} className="p-4 rounded-xl border border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-neutral-900">{ex.name}</h4>
                  <span className="badge-primary">Booth {ex.booth_number}</span>
                </div>
                <p className="text-xs text-neutral-500">{ex.category}</p>
                {ex.description && <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{ex.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking modal */}
      <Modal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title="Book Your Ticket"
        description={event.title}
        size="md"
        footer={
          <>
            <button onClick={() => setBookingOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleBook} disabled={paying} className="btn-primary">
              {paying ? <Spinner /> : <>Pay {formatMoney((event.price || 0) * booking.quantity, event.currency)}</>}
            </button>
          </>
        }
      >
        <form onSubmit={handleBook} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" required value={booking.name} onChange={(e) => setBooking({ ...booking, name: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" required value={booking.email} onChange={(e) => setBooking({ ...booking, email: e.target.value })} placeholder="jane@example.com" />
            </div>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input type="number" min={1} max={10} className="input" required value={booking.quantity} onChange={(e) => setBooking({ ...booking, quantity: Number(e.target.value) })} />
          </div>
          <div className="pt-3 border-t border-neutral-100">
            <p className="text-sm font-semibold text-neutral-700 mb-3">Payment Details (Demo)</p>
            <div className="space-y-3">
              <input className="input" placeholder="Card Number (1234 5678 9012 3456)" required value={booking.card} onChange={(e) => setBooking({ ...booking, card: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="MM/YY" required value={booking.expiry} onChange={(e) => setBooking({ ...booking, expiry: e.target.value })} />
                <input className="input" placeholder="CVC" required value={booking.cvc} onChange={(e) => setBooking({ ...booking, cvc: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-primary-50">
            <span className="text-sm text-neutral-600">Total</span>
            <span className="text-lg font-bold text-primary-700">{formatMoney((event.price || 0) * booking.quantity, event.currency)}</span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
