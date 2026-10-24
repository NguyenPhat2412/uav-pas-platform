'use client';

import {useState} from 'react';
import {ArrowDownRight, ArrowUpRight, Minus} from 'lucide-react';
import {cn} from '@/lib/utils';

// Fixed categorical order (never cycled) so a series keeps its colour across every admin chart.
export const seriesColors = {
    blue: '#2a78d6',
    orange: '#eb6834',
    aqua: '#1baf7a',
    yellow: '#eda100',
    violet: '#6250d6',
    red: '#e34948',
    gray: '#94a3b8',
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
    return <div className="trend-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} preserveAspectRatio="none"
             onMouseLeave={() => setHover(null)}
             onMouseMove={e => {
                 const box = e.currentTarget.getBoundingClientRect();
                 const px = (e.clientX - box.left) / box.width * W;
                 const step = (W - PAD.left - PAD.right) / Math.max(1, labels.length - 1);
                 setHover(Math.min(labels.length - 1, Math.max(0, Math.round((px - PAD.left) / step))));
             }}>
            {ticks.map(t => <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid"/>
                <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" className="chart-tick">{format(t)}</text>
            </g>)}
            {labels.map((label, i) => i % labelEvery === 0 &&
                <text key={label} x={x(i)} y={H - 6} textAnchor="middle" className="chart-tick">{label}</text>)}
            {series[0] && <path d={`${path(series[0].values)}L${x(labels.length - 1)},${y(0)}L${x(0)},${y(0)}Z`}
                                fill={series[0].color} opacity={0.1}/>}
            {series.map(s => <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2}
                                   strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '5 4' : undefined}
                                   vectorEffect="non-scaling-stroke"/>)}
            {hover !== null && <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="chart-crosshair"/>
                {series.map(s => <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color}
                                         className="chart-dot"/>)}
            </g>}
        </svg>
        {hover !== null && <div className="chart-tooltip trend-tooltip" role="tooltip"
                                style={{left: `${(x(hover) / W) * 100}%`}}>
            <strong>{labels[hover]}</strong>
            {series.map(s => <span key={s.key}><i style={{background: s.color}}/>{s.label}: {format(s.values[hover] ?? 0)}</span>)}
        </div>}
    </div>;
}

export function Legend({items}: { items: { label: string; color: string; dashed?: boolean }[] }) {
    return <ul className="chart-legend">{items.map(item => <li key={item.label}>
        <span className={cn(item.dashed && 'chart-legend-dashed')} style={{background: item.dashed ? undefined : item.color, borderColor: item.color}}
              aria-hidden="true"/>{item.label}</li>)}</ul>;
}

/** Part-to-whole as one segmented bar plus a labelled list with counts and shares. */
export function SegmentBar({items, ariaLabel}: { items: { label: string; value: number; color: string }[]; ariaLabel: string }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return <div className="segment-chart">
        <div className="segment-bar" role="img" aria-label={ariaLabel}>
            {total > 0 ? items.filter(i => i.value > 0).map(item =>
                <span key={item.label} style={{flexGrow: item.value, background: item.color}} title={`${item.label}: ${item.value}`}/>) :
                <span className="segment-empty"/>}
        </div>
        <ul className="segment-list">{items.map(item => <li key={item.label}>
            <span className="segment-swatch" style={{background: item.color}} aria-hidden="true"/>
            <span className="segment-label">{item.label}</span>
            <strong>{item.value}</strong>
            <small>{total ? Math.round(item.value / total * 100) : 0}%</small>
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
    return <ul className="chart-bars">{items.map(item => <li key={item.label}>
        <span className="chart-bar-label" title={item.label}>{item.label}</span>
        <span className="chart-bar-track"><span className="chart-bar" style={{width: `${(item.value / peak) * 100}%`, background: color}}/></span>
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
    return <div className="column-chart" role="img" aria-label={ariaLabel}>
        {groups.map((group, gi) => <div key={group.label} className="column-group"
                                        onMouseEnter={() => setHover(gi)} onMouseLeave={() => setHover(null)}>
            {hover === gi && <div className="chart-tooltip" role="tooltip"><strong>{group.label}</strong>
                {series.map((s, si) => <span key={s.label}><i style={{background: s.color}}/>{s.label}: {format(group.values[si] ?? 0)}</span>)}
            </div>}
            <div className="column-bars">{series.map((s, si) =>
                <span key={s.label} style={{height: `${((group.values[si] ?? 0) / peak) * 100}%`, background: s.color}}/>)}</div>
            <small>{group.label}</small>
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
    return <div className="heatmap" role="img" aria-label={ariaLabel}>
        <div className="heatmap-hours" aria-hidden="true"><span/>{Array.from({length: 24}, (_, h) =>
            <small key={h}>{h % 3 === 0 ? h : ''}</small>)}</div>
        {grid.map((row, r) => <div key={rowLabels[r]} className="heatmap-row">
            <small>{rowLabels[r]}</small>
            {row.map((value, h) => <span key={h} title={cellTitle(r, h, value)}
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
    if (Math.abs(diff) < 1e-9) return <small className="kpi-delta kpi-delta-flat"><Minus size={13} aria-hidden="true"/>{label}</small>;
    const good = diff > 0 === higherIsBetter;
    const pct = previous ? `${Math.round(Math.abs(diff) / Math.abs(previous) * 100)}%` : `${Math.round(Math.abs(diff) * 10) / 10}${suffix}`;
    return <small className={cn('kpi-delta', good ? 'kpi-delta-good' : 'kpi-delta-bad')}>
        {diff > 0 ? <ArrowUpRight size={13} aria-hidden="true"/> : <ArrowDownRight size={13} aria-hidden="true"/>}
        {pct} <span>{label}</span>
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
