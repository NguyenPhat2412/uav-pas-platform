import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';

const iconTones: Record<'blue' | 'green' | 'amber' | 'slate', string> = {
    blue: 'bg-sky-50 text-sky-600 border-sky-200',
    green: 'bg-emerald-50 text-success border-emerald-200',
    amber: 'bg-amber-50 text-warning border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function KpiCard({label, value, meta, icon, tone = 'blue'}: {
    label: string;
    value?: number | string;
    meta?: string;
    icon: ReactNode;
    tone?: 'blue' | 'green' | 'amber' | 'slate'
}) {
    return (
        <article className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border', iconTones[tone])}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                <strong className="mt-1 block text-2xl font-black tracking-tight text-foreground">{value ?? '—'}</strong>
                {meta && <small className="mt-0.5 block text-xs font-medium text-slate-500">{meta}</small>}
            </div>
        </article>
    );
}
