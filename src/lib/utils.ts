export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...opts });
}

export function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(date: string | Date) {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function formatMoney(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatRelative(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 7) return formatDate(d);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return 'just now';
}

export function toInputDateTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function generateToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function categoryColor(category: string) {
  const map: Record<string, string> = {
    Technology: 'bg-primary-100 text-primary-700',
    Business: 'bg-accent-100 text-accent-700',
    Marketing: 'bg-warning-500/15 text-warning-700',
    Education: 'bg-info-500/15 text-info-700',
    Entertainment: 'bg-error-500/15 text-error-700',
    General: 'bg-neutral-100 text-neutral-600',
  };
  return map[category] || map.General;
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-neutral-100 text-neutral-600',
    published: 'bg-accent-100 text-accent-700',
    cancelled: 'bg-error-500/15 text-error-700',
    completed: 'bg-primary-100 text-primary-700',
    confirmed: 'bg-accent-100 text-accent-700',
    pending: 'bg-warning-500/15 text-warning-700',
    refunded: 'bg-neutral-100 text-neutral-600',
  };
  return map[status] || 'bg-neutral-100 text-neutral-600';
}

export function tierColor(tier: string) {
  const map: Record<string, string> = {
    platinum: 'bg-gradient-to-r from-neutral-300 to-neutral-400 text-neutral-800',
    gold: 'bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900',
    silver: 'bg-gradient-to-r from-neutral-200 to-neutral-300 text-neutral-700',
    bronze: 'bg-gradient-to-r from-orange-300 to-orange-500 text-orange-900',
  };
  return map[tier] || map.silver;
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
