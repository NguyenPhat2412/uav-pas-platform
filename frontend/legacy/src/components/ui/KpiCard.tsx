import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KpiCard({ label, value, meta, icon, tone = 'blue' }: { label: string; value?: number | string; meta?: string; icon: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'slate' }) {
  return <article className="kpi-card">
    <div className={cn('kpi-icon', `kpi-icon-${tone}`)}>{icon}</div>
    <div className="min-w-0"><span>{label}</span><strong>{value ?? '—'}</strong>{meta && <small>{meta}</small>}</div>
    <ArrowUpRight size={15} className="ml-auto self-start text-slate-300" />
  </article>;
}
