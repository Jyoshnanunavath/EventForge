import { cn } from '@/lib/utils';

export function BarChart({ data, height = 180 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="relative w-full flex items-end justify-center" style={{ height: height - 30 }}>
            <div
              className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-500 group-hover:from-primary-700 group-hover:to-primary-500 relative"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '4px' : '0' }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{d.value}</span>
            </div>
          </div>
          <span className="text-xs text-neutral-500 truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data, size = 160 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = size / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={20} />
          {data.map((d, i) => {
            const dash = (d.value / total) * circumference;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={20}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
            offset += dash;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-neutral-900">{total}</span>
          <span className="text-xs text-neutral-500">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
            <span className="text-sm text-neutral-600">{d.label}</span>
            <span className="text-sm font-semibold text-neutral-900 ml-auto">{d.value}</span>
            <span className="text-xs text-neutral-400">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ data, height = 160 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - 20 - (d.value / max) * (height - 40);
    return { x, y, ...d };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${path} L ${width} ${height - 20} L 0 ${height - 20} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lineGrad)" />
        <path d={path} fill="none" stroke="#7c3aed" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.5} fill="#7c3aed" className="opacity-0 hover:opacity-100 transition-opacity" />
        ))}
      </svg>
      <div className="flex justify-between mt-2">
        {data.map((d, i) => <span key={i} className="text-xs text-neutral-400">{d.label}</span>)}
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, label, color = 'primary' }: { value: number; max: number; label?: string; color?: 'primary' | 'accent' | 'warning' | 'error' }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap = { primary: 'bg-primary-500', accent: 'bg-accent-500', warning: 'bg-warning-500', error: 'bg-error-500' };
  return (
    <div>
      {label && <div className="flex justify-between text-xs mb-1"><span className="text-neutral-600">{label}</span><span className="text-neutral-400">{value}/{max}</span></div>}
      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', colorMap[color])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
