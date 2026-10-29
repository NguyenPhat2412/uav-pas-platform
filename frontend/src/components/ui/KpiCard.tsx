import type {ReactNode} from 'react';
import type {Tone} from '@/types';
import {cn} from '@/lib/utils';

const iconTones: Record<Tone, string> = {
    blue: 'bg-uav-red-light text-primary border-rose-200',
    red: 'bg-primary text-white border-primary',
    amber: 'bg-rose-50 text-primary border-rose-200',
    slate: 'bg-white text-primary border-rose-200',
};

const accents: Record<Tone, string> = {
    blue: 'border-t-primary',
    red: 'border-t-primary',
    amber: 'border-t-rose-400',
    slate: 'border-t-rose-300',
};

/**
 * One metric cell: flat, a coloured top rule carries the tone. Place cells in a MetricStrip so they share one frame.
 */
export function KpiCard({label, value, meta, icon, tone = 'red'}: {
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
                <span className="block text-[11px] font-bold uppercase tracking-wider text-primary/75">{label}</span>
                <strong className="mt-1 block text-2xl font-black tabular-nums tracking-tight text-foreground">{value ?? '—'}</strong>
                {meta && <small className="mt-0.5 block text-xs font-medium text-primary/70">{meta}</small>}
            </div>
        </article>
    );
}

/** Seamless metric band: one border, cells split by hairline dividers instead of separate floating cards. */
export function MetricStrip({children, className}: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('grid grid-cols-1 gap-px border border-rose-200 bg-rose-200 sm:grid-cols-2 xl:grid-cols-4', className)}>
            {children}
        </div>
    );
}
