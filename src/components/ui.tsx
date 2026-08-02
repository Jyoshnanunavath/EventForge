import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('inline-block animate-spin rounded-full border-2 border-neutral-200 border-t-primary-600', className)} style={{ width: '1.25rem', height: '1.25rem' }} />
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f2fb]">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="w-8 h-8" />
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner className="w-6 h-6" />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon, trend, color = 'primary' }: { label: string; value: string; icon: ReactNode; trend?: string; color?: 'primary' | 'accent' | 'warning' | 'error' }) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-50 text-accent-600',
    warning: 'bg-warning-500/10 text-warning-600',
    error: 'bg-error-500/10 text-error-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[color])}>
          {icon}
        </div>
        {trend && <span className="text-xs font-medium text-accent-600">{trend}</span>}
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}

export function SkeletonCard() {
  return <div className="card p-5 space-y-3"><div className="skeleton h-4 w-3/4 rounded" /><div className="skeleton h-3 w-1/2 rounded" /><div className="skeleton h-20 rounded" /></div>;
}
