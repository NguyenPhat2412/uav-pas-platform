'use client';

import {Minus, TrendingDown, TrendingUp} from 'lucide-react';
import {Badge, Card} from '@/components/ui';
import type {ChartSeries as Series, TrendViewMode} from '@/types/dashboard/dashboard.types';
import {cn} from '@/lib/utils';

export type {Series, TrendViewMode};

// Strict Red & White monochrome palette across all admin charts and map markers.
export const seriesColors = {
    blue: '#c43a4a',
    orange: '#3f3f46',
    aqua: '#71717a',
    yellow: '#a1a1aa',
    violet: '#d4d4d8',
    red: '#7f1d1d',
    gray: '#fecaca',
} as const;

/**
 * Builds a monotone cubic Bezier SVG path so daily count curves stay smooth
 * without ever overshooting below zero on flat stretches.
 */
export function buildMonotoneSplinePath(points: {x: number; y: number}[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    const n = points.length;
    const dx: number[] = [];
    const dy: number[] = [];
    const m: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        dx[i] = points[i + 1].x - points[i].x;
        dy[i] = points[i + 1].y - points[i].y;
        m[i] = dx[i] !== 0 ? dy[i] / dx[i] : 0;
    }
    const tangents: number[] = new Array(n).fill(0);
    tangents[0] = m[0];
    tangents[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
        tangents[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    }
    for (let i = 0; i < n - 1; i++) {
        if (m[i] === 0) {
            tangents[i] = 0;
            tangents[i + 1] = 0;
        } else {
            const a = tangents[i] / m[i];
            const b = tangents[i + 1] / m[i];
            const h = Math.hypot(a, b);
            if (h > 3) {
                const scale = 3 / h;
                tangents[i] = scale * a * m[i];
                tangents[i + 1] = scale * b * m[i];
            }
        }
    }
    let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const step = dx[i] / 3;
        const cp1x = p0.x + step;
        const cp1y = p0.y + tangents[i] * step;
        const cp2x = p1.x - step;
        const cp2y = p1.y - tangents[i + 1] * step;
        d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
}

/** Evenly spaced axis ticks; counts never get fractional steps. */
export function niceTicks(peak: number, integer = true): number[] {
    const raw = peak / 4;
    const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
    const nice = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(s => s >= raw) ?? magnitude * 10;
    const step = integer ? Math.max(1, Math.ceil(nice)) : nice;
    return Array.from(
        {length: Math.max(2, Math.ceil(peak / step) + 1)},
        (_, i) => Math.round(i * step * 100) / 100,
    );
}

export function ChartTooltip({
    label,
    series,
    index,
    format,
    leftPct,
    className,
}: {
    label: string;
    series: Series[];
    index: number;
    format: (value: number) => string;
    leftPct: number;
    className?: string;
}) {
    const total = series.reduce((sum, s) => sum + (s.values[index] ?? 0), 0);
    return (
        <Card
            role="tooltip"
            style={{left: `${leftPct}%`}}
            className={cn(
                'pointer-events-none absolute top-2 z-20 grid min-w-[165px] -translate-x-1/2 gap-1 rounded-overlay border-rose-200 bg-white/95 px-3 py-2 text-xs text-primary shadow-lg backdrop-blur-xs',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-3 border-b border-rose-100 pb-1">
                <strong className="font-bold tabular-nums text-primary">{label}</strong>
                <Badge variant="primary" size="sm" className="normal-case tracking-normal tabular-nums">
                    {format(total)}
                </Badge>
            </div>
            {series.map(s => (
                <span key={s.key} className="flex items-center justify-between gap-3 text-primary/75">
                    <span className="inline-flex items-center gap-1.5">
                        <i className="inline-block h-2.5 w-2.5 rounded-panel" style={{background: s.color}} />
                        {s.label}
                    </span>
                    <strong className="font-semibold tabular-nums text-primary">
                        {format(s.values[index] ?? 0)}
                    </strong>
                </span>
            ))}
        </Card>
    );
}

export function Legend({items}: {items: {label: string; color: string; dashed?: boolean}[]}) {
    return (
        <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0 text-xs text-primary/75">
            {items.map(item => (
                <li key={item.label} className="inline-flex items-center gap-1.5">
                    <span
                        className={cn(
                            'inline-block',
                            item.dashed
                                ? 'h-0 w-3.5 rounded-panel border-t-2 border-dashed'
                                : 'h-2.5 w-2.5 rounded-panel',
                        )}
                        style={{
                            background: item.dashed ? undefined : item.color,
                            borderColor: item.color,
                        }}
                        aria-hidden="true"
                    />
                    {item.label}
                </li>
            ))}
        </ul>
    );
}

/** Change against the previous period; `higherIsBetter` decides whether a rise is coloured good or bad. */
export function Delta({
    current,
    previous,
    higherIsBetter = true,
    suffix = '',
    label,
}: {
    current: number;
    previous: number;
    higherIsBetter?: boolean;
    suffix?: string;
    label: string;
}) {
    const diff = current - previous;
    if (Math.abs(diff) < 1e-9) {
        return (
            <small className="inline-flex items-center gap-[3px] text-xs font-normal text-primary/60">
                <Minus size={13} aria-hidden="true" />
                {label}
            </small>
        );
    }
    const good = diff > 0 === higherIsBetter;
    const pct = previous
        ? `${Math.round((Math.abs(diff) / Math.abs(previous)) * 100)}%`
        : `${Math.round(Math.abs(diff) * 10) / 10}${suffix}`;
    const Icon = diff > 0 ? TrendingUp : TrendingDown;
    if (!good) {
        return (
            <Badge
                variant="primary"
                size="sm"
                className="w-fit bg-primary text-white normal-case tracking-normal"
            >
                <Icon size={12} aria-hidden="true" />
                <span>{pct}</span>
                <span className="font-normal text-white/85">{label}</span>
            </Badge>
        );
    }
    return (
        <small className="inline-flex items-center gap-[3px] text-xs font-semibold text-primary">
            <Icon size={13} aria-hidden="true" />
            {pct} <span className="font-normal text-primary/70">{label}</span>
        </small>
    );
}
