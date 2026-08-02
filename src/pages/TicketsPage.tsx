import { useEffect, useState } from 'react';
import { Ticket as TicketIcon, CalendarDays, Download, ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, type Ticket, type Event } from '@/lib/supabase';
import { useRouter } from '@/context/Router';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageLoader, EmptyState } from '@/components/ui';
import { formatDate, formatTime, formatMoney, statusColor, cn, copyToClipboard } from '@/lib/utils';

export function TicketsPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from('tickets').select('*, event:events(*)').eq('attendee_id', profile.id).order('created_at', { ascending: false });
      setTickets((data as Ticket[]) || []);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-neutral-900">My Tickets</h1><p className="text-sm text-neutral-500 mt-0.5">Your booked event tickets</p></div>

      {tickets.length === 0 ? (
        <EmptyState icon={<TicketIcon className="w-8 h-8" />} title="No tickets yet" description="Browse events and book your first ticket" action={<button onClick={() => navigate('/events')} className="btn-primary">Browse Events</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {tickets.map((t) => (
            <div key={t.id} className="card p-5 cursor-pointer hover:shadow-lg hover:border-primary-200 transition-all" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-neutral-900 truncate">{t.event?.title || 'Event'}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{t.event && formatDate(t.event.start_date)}</p>
                </div>
                <span className={cn('badge', statusColor(t.status))}>{t.status}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                <div className="text-xs text-neutral-500">
                  <p>{t.quantity} × {t.ticket_type}</p>
                  <p className="font-semibold text-neutral-900 mt-0.5">{formatMoney(t.total_amount, t.currency)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {t.checked_in ? <><CheckCircle2 className="w-4 h-4 text-accent-500" /><span className="text-xs font-medium text-accent-600">Checked in</span></> : <><Clock className="w-4 h-4 text-neutral-400" /><span className="text-xs text-neutral-400">Not checked in</span></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('tickets').select('*, event:events(*)').eq('id', ticketId).maybeSingle();
      setTicket(data as Ticket | null);
      setLoading(false);
    })();
  }, [ticketId]);

  async function handleCancel() {
    if (!ticket) return;
    if (!confirm('Cancel this ticket? This cannot be undone.')) return;
    const { error } = await supabase.from('tickets').update({ status: 'cancelled' }).eq('id', ticketId);
    if (error) { toast(error.message, 'error'); return; }
    setTicket({ ...ticket, status: 'cancelled' });
    toast('Ticket cancelled');
  }

  if (loading) return <PageLoader />;
  if (!ticket) return <EmptyState icon={<XCircle className="w-8 h-8" />} title="Ticket not found" description="This ticket may have been removed." action={<button onClick={() => navigate('/tickets')} className="btn-primary">Back to Tickets</button>} />;

  const event = ticket.event;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/tickets')} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Back to Tickets</button>

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-primary-200 mb-1">E-Ticket</p>
              <h1 className="text-xl font-bold font-display">{event?.title}</h1>
            </div>
            <span className={cn('badge', statusColor(ticket.status), 'bg-white/90')}>{ticket.status}</span>
          </div>
        </div>

        {/* QR section */}
        <div className="p-6 flex flex-col items-center text-center border-b border-dashed border-neutral-200">
          {ticket.status === 'confirmed' && !ticket.checked_in ? (
            <>
              <div className="p-4 bg-white rounded-2xl border-2 border-neutral-200 shadow-soft">
                <QRCodeSVG value={ticket.qr_code} size={180} level="M" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 mt-4">Scan at the entrance</p>
              <p className="text-xs text-neutral-500 mt-1">Show this QR code to the event staff for check-in</p>
              <button onClick={() => { copyToClipboard(ticket.qr_code); toast('Ticket code copied'); }} className="btn-ghost text-xs mt-2">
                Copy code: {ticket.qr_code.slice(0, 8)}…
              </button>
            </>
          ) : ticket.checked_in ? (
            <div className="py-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-accent-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-9 h-9 text-accent-600" />
              </div>
              <p className="text-lg font-bold text-neutral-900">Checked In</p>
              <p className="text-sm text-neutral-500 mt-1">Checked in at {ticket.checked_in_at && formatDate(ticket.checked_in_at)} {ticket.checked_in_at && formatTime(ticket.checked_in_at)}</p>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-error-100 flex items-center justify-center mb-3"><XCircle className="w-9 h-9 text-error-600" /></div>
              <p className="text-lg font-bold text-neutral-900">Ticket {ticket.status}</p>
              <p className="text-sm text-neutral-500 mt-1">This ticket is no longer valid</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-neutral-500">Attendee</p><p className="font-semibold text-neutral-900">{ticket.attendee_name || profile?.full_name}</p></div>
            <div><p className="text-xs text-neutral-500">Email</p><p className="font-semibold text-neutral-900 truncate">{ticket.attendee_email || profile?.id}</p></div>
            <div><p className="text-xs text-neutral-500">Ticket Type</p><p className="font-semibold text-neutral-900">{ticket.ticket_type}</p></div>
            <div><p className="text-xs text-neutral-500">Quantity</p><p className="font-semibold text-neutral-900">{ticket.quantity}</p></div>
            <div><p className="text-xs text-neutral-500">Amount Paid</p><p className="font-semibold text-neutral-900">{formatMoney(ticket.total_amount, ticket.currency)}</p></div>
            <div><p className="text-xs text-neutral-500">Payment Ref</p><p className="font-semibold text-neutral-900 font-mono text-xs">{ticket.payment_ref}</p></div>
          </div>

          {event && (
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1"><CalendarDays className="w-4 h-4" /> {formatDate(event.start_date)} · {formatTime(event.start_date)}</div>
              <p className="text-xs text-neutral-500">{event.category}</p>
            </div>
          )}

          {ticket.status === 'confirmed' && !ticket.checked_in && (
            <button onClick={handleCancel} className="btn-danger w-full">Cancel Ticket</button>
          )}
        </div>
      </div>
    </div>
  );
}
