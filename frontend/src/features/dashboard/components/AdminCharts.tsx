'use client';

import {useState} from 'react';
import {Minus, TrendingDown, TrendingUp} from 'lucide-react';
import {cn} from '@/lib/utils';

// Fixed categorical order (never cycled) so a series keeps its colour across every admin chart.
export const seriesColors = {
    blue: 'var(--toast-info-border)',
    orange: 'var(--warning)',
    aqua: 'var(--primary)',
    yellow: 'var(--toast-warning-border)',
    violet: 'var(--brand-zalo)',
    red: 'var(--danger)',
    gray: 'var(--muted)',
} as const;

export type Series = { key: string; label: string; color: string; dashed?: boolean; values: number[] };

const W = 640, H = 200, PAD = {top: 12, right: 12, bottom: 24, left: 32};

/** Multi-series line chart with a hover crosshair; the first series gets a light area fill. */
export function TrendChart({labels, series, ariaLabel, format = String}: {
    labels: string[];
    series: Series[];
    ariaLabel: string;
    format?: (value: number) => string;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const peak = Math.max(1, ...series.flatMap(s => s.values));
    const ticks = niceTicks(peak);
    const top = ticks[ticks.length - 1];
    const x = (i: number) => PAD.left + (labels.length <= 1 ? 0 : i * (W - PAD.left - PAD.right) / (labels.length - 1));
    const y = (v: number) => H - PAD.bottom - (v / top) * (H - PAD.top - PAD.bottom);
    const path = (values: number[]) => values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const labelEvery = Math.max(1, Math.ceil(labels.length / 6));
    return <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} preserveAspectRatio="none"
             className="block h-[220px] w-full overflow-visible"
             onMouseLeave={() => setHover(null)}
             onMouseMove={e => {
                 const box = e.currentTarget.getBoundingClientRect();
                 const px = (e.clientX - box.left) / box.width * W;
                 const step = (W - PAD.left - PAD.right) / Math.max(1, labels.length - 1);
                 setHover(Math.min(labels.length - 1, Math.max(0, Math.round((px - PAD.left) / step))));
             }}>
            {ticks.map(t => <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border stroke-1 [vector-effect:non-scaling-stroke]"/>
                <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">{format(t)}</text>
            </g>)}
            {labels.map((label, i) => i % labelEvery === 0 &&
                <text key={label} x={x(i)} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">{label}</text>)}
            {series[0] && <path d={`${path(series[0].values)}L${x(labels.length - 1)},${y(0)}L${x(0)},${y(0)}Z`}
                                fill={series[0].color} opacity={0.1}/>}
            {series.map(s => <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2}
                                   strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '5 4' : undefined}
                                   vectorEffect="non-scaling-stroke"/>)}
            {hover !== null && <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-slate-400 [stroke-dasharray:3_3] [vector-effect:non-scaling-stroke]"/>
                {series.map(s => <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color}
                                         className="stroke-white stroke-2 [vector-effect:non-scaling-stroke]"/>)}
            </g>}
        </svg>
        {hover !== null && <div className="pointer-events-none absolute top-1 z-10 grid min-w-[150px] -translate-x-1/2 gap-0.5 rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground shadow-lg" role="tooltip"
                                style={{left: `${(x(hover) / W) * 100}%`}}>
            <strong>{labels[hover]}</strong>
            {series.map(s => <span key={s.key} className="flex items-center gap-1.5 text-muted"><i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{background: s.color}}/>{s.label}: {format(s.values[hover] ?? 0)}</span>)}
        </div>}
    </div>;
}

export function Legend({items}: { items: { label: string; color: string; dashed?: boolean }[] }) {
    return <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0 text-xs text-muted">{items.map(item => <li key={item.label} className="inline-flex items-center gap-1.5">
        <span className={cn('inline-block', item.dashed ? 'h-0 w-3.5 rounded-none border-t-2 border-dashed' : 'h-2.5 w-2.5 rounded-[3px]')} style={{background: item.dashed ? undefined : item.color, borderColor: item.color}}
              aria-hidden="true"/>{item.label}</li>)}</ul>;
}

/** Part-to-whole as one segmented bar plus a labelled list with counts and shares. */
export function SegmentBar({items, ariaLabel}: { items: { label: string; value: number; color: string }[]; ariaLabel: string }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return <div className="w-full">
        <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-[5px] bg-slate-100" role="img" aria-label={ariaLabel}>
            {total > 0 ? items.filter(i => i.value > 0).map(item =>
                <span key={item.label} style={{flexGrow: item.value, background: item.color}} title={`${item.label}: ${item.value}`}/>) :
                <span className="flex-1"/>}
        </div>
        <ul className="m-0 mt-3.5 list-none p-0">{items.map(item => <li key={item.label} className="grid grid-cols-[12px_1fr_auto_40px] items-center gap-2.5 border-b border-dashed border-border py-1.5 text-[13px] last:border-b-0">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{background: item.color}} aria-hidden="true"/>
            <span className="text-muted">{item.label}</span>
            <strong>{item.value}</strong>
            <small className="text-right text-slate-400">{total ? Math.round(item.value / total * 100) : 0}%</small>
        </li>)}</ul>
    </div>;
}

/** Ranked horizontal bars for one measure in a single hue. */
export function BarList({items, format = String, color = seriesColors.blue}: {
    items: { label: string; value: number }[];
    format?: (value: number) => string;
    color?: string;
}) {
    const peak = Math.max(1, ...items.map(i => i.value));
    return <ul className="m-0 grid list-none gap-3 p-0">{items.map(item => <li key={item.label} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-2.5 text-[13px]">
        <span className="truncate text-muted" title={item.label}>{item.label}</span>
        <span className="h-2.5 rounded bg-border"><span className="block h-full min-w-[4px] rounded" style={{width: `${(item.value / peak) * 100}%`, background: color}}/></span>
        <strong>{format(item.value)}</strong>
    </li>)}</ul>;
}

/** Grouped columns (e.g. paid vs outstanding per month). */
export function ColumnChart({groups, series, ariaLabel, format = String}: {
    groups: { label: string; values: number[] }[];
    series: { label: string; color: string }[];
    ariaLabel: string;
    format?: (value: number) => string;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const peak = Math.max(1, ...groups.flatMap(g => g.values));
    return <div className="flex h-[200px] items-stretch gap-2.5" role="img" aria-label={ariaLabel}>
        {groups.map((group, gi) => <div key={group.label} className="relative flex min-w-0 flex-1 flex-col gap-1.5"
                                        onMouseEnter={() => setHover(gi)} onMouseLeave={() => setHover(null)}>
            {hover === gi && <div className="pointer-events-none absolute bottom-full left-1/2 z-10 grid min-w-[150px] -translate-x-1/2 gap-0.5 rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground shadow-lg" role="tooltip"><strong>{group.label}</strong>
                {series.map((s, si) => <span key={s.label} className="flex items-center gap-1.5 text-muted"><i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{background: s.color}}/>{s.label}: {format(group.values[si] ?? 0)}</span>)}
            </div>}
            <div className="flex flex-1 items-end justify-center gap-[3px] border-b border-slate-300">{series.map((s, si) =>
                <span key={s.label} className="min-h-[1px] w-[min(18px,40%)] rounded-t" style={{height: `${((group.values[si] ?? 0) / peak) * 100}%`, background: s.color}}/>)}</div>
            <small className="text-center text-[11px] text-slate-400">{group.label}</small>
        </div>)}
    </div>;
}

/** 7×24 activity grid in one sequential hue; rows are weekdays, columns hours. */
export function Heatmap({grid, rowLabels, ariaLabel, cellTitle}: {
    grid: number[][];
    rowLabels: string[];
    ariaLabel: string;
    cellTitle: (row: number, hour: number, value: number) => string;
}) {
    const peak = Math.max(1, ...grid.flat());
    return <div className="flex flex-col gap-[3px] overflow-x-auto" role="img" aria-label={ariaLabel}>
        <div className="grid min-w-[440px] grid-cols-[32px_repeat(24,minmax(14px,1fr))] items-center gap-[3px]" aria-hidden="true"><span/>{Array.from({length: 24}, (_, h) =>
            <small key={h} className="text-[10.5px] text-slate-400">{h % 3 === 0 ? h : ''}</small>)}</div>
        {grid.map((row, r) => <div key={rowLabels[r]} className="grid min-w-[440px] grid-cols-[32px_repeat(24,minmax(14px,1fr))] items-center gap-[3px]">
            <small className="text-[10.5px] text-slate-400">{rowLabels[r]}</small>
            {row.map((value, h) => <span key={h} className="h-[18px] rounded-[3px] bg-slate-100" title={cellTitle(r, h, value)}
                                         style={{background: value ? `rgba(42, 120, 214, ${0.12 + 0.88 * value / peak})` : undefined}}/>)}
        </div>)}
    </div>;
}

/** Change against the previous period; `higherIsBetter` decides whether a rise is coloured good or bad. */
export function Delta({current, previous, higherIsBetter = true, suffix = '', label}: {
    current: number;
    previous: number;
    higherIsBetter?: boolean;
    suffix?: string;
    label: string;
}) {
    const diff = current - previous;
    if (Math.abs(diff) < 1e-9) return <small className="inline-flex items-center gap-[3px] text-xs font-normal text-muted"><Minus size={13} aria-hidden="true"/>{label}</small>;
    const good = diff > 0 === higherIsBetter;
    const pct = previous ? `${Math.round(Math.abs(diff) / Math.abs(previous) * 100)}%` : `${Math.round(Math.abs(diff) * 10) / 10}${suffix}`;
    return <small className={cn('inline-flex items-center gap-[3px] text-xs font-semibold', good ? 'text-uav-blue' : 'text-red-700')}>
        {diff > 0 ? <TrendingUp size={13} aria-hidden="true"/> : <TrendingDown size={13} aria-hidden="true"/>}
        {pct} <span className="font-normal text-muted">{label}</span>
    </small>;
}

/** Evenly spaced axis ticks; counts never get fractional steps. */
function niceTicks(peak: number, integer = true) {
    const raw = peak / 4;
    const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
    const nice = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(s => s >= raw) ?? magnitude * 10;
    const step = integer ? Math.max(1, Math.ceil(nice)) : nice;
    return Array.from({length: Math.max(2, Math.ceil(peak / step) + 1)}, (_, i) => Math.round(i * step * 100) / 100);
}
