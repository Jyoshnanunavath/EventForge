import { CalendarDays, MapPin, Users, DollarSign } from 'lucide-react';
import type { Event } from '@/lib/supabase';
import { cn, formatDate, formatMoney, categoryColor, statusColor, truncate } from '@/lib/utils';

export function EventCard({ event, onClick }: { event: Event; onClick?: () => void }) {
  const ticketCount = 0;
  return (
    <button
      onClick={onClick}
      className="card overflow-hidden text-left group hover:shadow-lg hover:border-primary-200 transition-all duration-300 w-full"
    >
      <div className="relative h-40 overflow-hidden">
        {event.banner_url ? (
          <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 flex items-center justify-center">
            <CalendarDays className="w-12 h-12 text-white/40" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={cn('badge', categoryColor(event.category))}>{event.category}</span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={cn('badge', statusColor(event.status))}>{event.status}</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-neutral-900 mb-1.5 group-hover:text-primary-700 transition-colors">{event.title}</h3>
        <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{truncate(event.description || 'No description provided', 100)}</p>
        <div className="space-y-1.5 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" />
            {formatDate(event.start_date)}
          </div>
          {event.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              {event.venue.name}, {event.venue.city}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {ticketCount}/{event.max_attendees}
            </span>
            <span className="flex items-center gap-1 font-semibold text-neutral-900">
              <DollarSign className="w-3.5 h-3.5" />
              {event.price > 0 ? formatMoney(event.price, event.currency) : 'Free'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
