import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';

type Tone = 'blue' | 'red' | 'amber' | 'slate';

const iconTones: Record<Tone, string> = {
    blue: 'bg-uav-blue-light text-uav-blue border-blue-200',
    red: 'bg-uav-red-light text-primary border-rose-200',
    amber: 'bg-amber-50 text-warning border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

const accents: Record<Tone, string> = {
    blue: 'border-t-uav-blue',
    red: 'border-t-primary',
    amber: 'border-t-amber-500',
    slate: 'border-t-slate-400',
};

/**
 * One metric cell: flat, a coloured top rule carries the tone. Place cells in a MetricStrip so they share one frame.
 */
export function KpiCard({label, value, meta, icon, tone = 'blue'}: {
    label: string;
    value?: number | string;
    meta?: string;
    icon?: ReactNode;
    tone?: Tone
}) {
    return (
        <article className={cn('flex items-start gap-3.5 border-t-2 bg-white p-4', accents[tone])}>
            {icon && <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-panel border', iconTones[tone])}>
                {icon}
            </div>}
            <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                <strong className="mt-1 block text-2xl font-black tabular-nums tracking-tight text-foreground">{value ?? '—'}</strong>
                {meta && <small className="mt-0.5 block text-xs font-medium text-slate-500">{meta}</small>}
            </div>
        </article>
    );
}

/** Seamless metric band: one border, cells split by hairline dividers instead of separate floating cards. */
export function MetricStrip({children, className}: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4', className)}>
            {children}
        </div>
    );
}
