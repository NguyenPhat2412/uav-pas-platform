'use client';

import {useId, useState} from 'react';
import {Minus, TrendingDown, TrendingUp} from 'lucide-react';
import type {ChartSeries as Series, TrendViewMode} from '@/features/dashboard/types/dashboard.types';
import {cn} from '@/lib/utils';

export type {Series, TrendViewMode};

// Strict Red & White monochrome palette across all admin charts and map markers.
export const seriesColors = {
    blue: '#dc2626',
    orange: '#f87171',
    aqua: '#b91c1c',
    yellow: '#fca5a5',
    violet: '#991b1b',
    red: '#7f1d1d',
    gray: '#fecaca',
} as const;

const SVG_W = 1000;
const SVG_H = 200;

/**
 * Builds a monotone cubic Bezier SVG path so daily count curves stay smooth
 * without ever overshooting below zero on flat stretches.
 */
function buildMonotoneSplinePath(points: { x: number; y: number }[]): string {
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
        if (m[i - 1] * m[i] <= 0) {
            tangents[i] = 0;
        } else {
            tangents[i] = (m[i - 1] + m[i]) / 2;
        }
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
                const t = 3 / h;
                tangents[i] = t * a * m[i];
                tangents[i + 1] = t * b * m[i];
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

/**
 * Multi-series daily chart with 100% HTML/CSS typography (never stretches text inside SVG)
 * and three visual representations:
 * - 'bars' (default): Stacked daily columns with subtle day-slot tracks.
 * - 'area': Monotone cubic spline area chart with HTML dots and sharp HTML axes.
 * - 'matrix': Daily activity intensity tiles with inline counts.
 */
export function TrendChart({
    labels,
    series,
    ariaLabel,
    format = String,
    mode = 'bars',
}: {
    labels: string[];
    series: Series[];
    ariaLabel: string;
    format?: (value: number) => string;
    mode?: TrendViewMode;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const gradientId = useId();
    const count = labels.length;
    const dayTotals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
    const peak = Math.max(1, ...dayTotals, ...series.flatMap(s => s.values));
    const ticks = niceTicks(peak);
    const ticksDesc = [...ticks].reverse();
    const top = ticks[ticks.length - 1] || 1;

    const maxVisibleLabels = count <= 10 ? count : count <= 35 ? 8 : 10;
    const labelStep = Math.max(1, Math.ceil(count / maxVisibleLabels));
    const shouldShowLabel = (i: number) => {
        if (count <= 10) return true;
        if (i === count - 1) return true;
        if (i % labelStep === 0 && count - 1 - i >= Math.ceil(labelStep * 0.6)) return true;
        return false;
    };

    const tooltipLeftPct = (index: number) => {
        if (count <= 1) return 50;
        const raw = ((index + 0.5) / count) * 100;
        return Math.min(90, Math.max(10, raw));
    };

    if (mode === 'matrix') {
        return (
            <div className="relative flex flex-col gap-3" role="img" aria-label={ariaLabel}>
                <div
                    className={cn(
                        'grid gap-1.5',
                        count <= 7
                            ? 'grid-cols-7'
                            : count <= 31
                                ? 'grid-cols-5 sm:grid-cols-10 lg:grid-cols-15'
                                : 'grid-cols-6 sm:grid-cols-10 md:grid-cols-15 xl:grid-cols-18'
                    )}
                >
                    {labels.map((label, i) => {
                        const completed = series[0]?.values[i] ?? 0;
                        const failed = series[1]?.values[i] ?? 0;
                        const total = completed + failed;
                        const ratio = total > 0 ? Math.min(1, total / top) : 0;
                        const hasFail = failed > 0;
                        const isHovered = hover === i;
                        return (
                            <div
                                key={`${label}-${i}`}
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(null)}
                                className={cn(
                                    'relative flex flex-col justify-between rounded-control border p-2 transition-all select-none',
                                    total === 0
                                        ? 'border-rose-100 bg-white text-rose-300'
                                        : hasFail && completed === 0
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-rose-200 text-primary',
                                    isHovered && 'ring-2 ring-primary/40 border-primary z-10 bg-white shadow-xs'
                                )}
                                style={
                                    total > 0 && !(hasFail && completed === 0)
                                        ? {backgroundColor: `rgba(220, 38, 38, ${0.06 + ratio * 0.22})`}
                                        : undefined
                                }
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className={cn('text-[10.5px] font-medium tabular-nums', hasFail && completed === 0 ? 'text-white/85' : 'text-primary/70')}>{label}</span>
                                    {hasFail && (
                                        <span
                                            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', hasFail && completed === 0 ? 'bg-white' : 'bg-primary')}
                                            title={`${series[1]?.label}: ${format(failed)}`}
                                        />
                                    )}
                                </div>
                                <div className="mt-1.5 flex items-baseline justify-between gap-1">
                                    <strong className={cn('text-sm font-bold tabular-nums leading-none', total === 0 ? 'text-rose-200' : hasFail && completed === 0 ? 'text-white' : 'text-primary')}>
                                        {format(total)}
                                    </strong>
                                    {total > 0 && hasFail && (
                                        <small className={cn('text-[10px] font-semibold tabular-nums', hasFail && completed === 0 ? 'text-white/90' : 'text-primary')}>
                                            -{format(failed)}
                                        </small>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {hover !== null && (
                    <ChartTooltip
                        label={labels[hover]}
                        series={series}
                        index={hover}
                        format={format}
                        className="bottom-full mb-2"
                        leftPct={50}
                    />
                )}
            </div>
        );
    }

    if (mode === 'area') {
        const xSvg = (i: number) => (count <= 1 ? SVG_W / 2 : (i / (count - 1)) * SVG_W);
        const ySvg = (v: number) => SVG_H - (v / top) * SVG_H;
        const xPct = (i: number) => (count <= 1 ? 50 : (i / (count - 1)) * 100);
        const yPct = (v: number) => 100 - (v / top) * 100;

        const primaryPoints = (series[0]?.values ?? []).map((v, i) => ({x: xSvg(i), y: ySvg(v)}));
        const primaryCurve = buildMonotoneSplinePath(primaryPoints);
        const primaryArea =
            primaryPoints.length > 1
                ? `${primaryCurve} L${primaryPoints[primaryPoints.length - 1].x.toFixed(1)},${SVG_H} L${primaryPoints[0].x.toFixed(1)},${SVG_H} Z`
                : '';

        return (
            <div className="relative select-none" role="img" aria-label={ariaLabel}>
                <div className="flex items-stretch gap-3">
                    {/* Sharp HTML Y-axis labels */}
                    <div className="flex h-[200px] w-8 shrink-0 flex-col justify-between pr-1 text-right text-[11px] font-medium tabular-nums text-primary/60" aria-hidden="true">
                        {ticksDesc.map(t => (
                            <span key={t} className="leading-none -translate-y-1 first:translate-y-0 last:translate-y-0">
                                {format(t)}
                            </span>
                        ))}
                    </div>

                    {/* Plot Canvas */}
                    <div
                        className="relative h-[200px] min-w-0 flex-1"
                        onMouseLeave={() => setHover(null)}
                        onMouseMove={e => {
                            const box = e.currentTarget.getBoundingClientRect();
                            const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / Math.max(1, box.width)));
                            setHover(Math.round(ratio * Math.max(0, count - 1)));
                        }}
                    >
                        {/* Horizontal Grid Lines */}
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                            {ticksDesc.map((t, idx) => (
                                <div
                                    key={t}
                                    className={cn(
                                        'w-full border-b',
                                        idx === ticksDesc.length - 1
                                            ? 'border-solid border-rose-300'
                                            : 'border-dashed border-rose-100'
                                    )}
                                />
                            ))}
                        </div>

                        {/* Pure curve SVG (zero text/circles inside so nothing distorts) */}
                        <svg
                            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                            preserveAspectRatio="none"
                            className="pointer-events-none absolute inset-0 block h-full w-full overflow-visible"
                            aria-hidden="true"
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={series[0]?.color ?? seriesColors.blue} stopOpacity={0.25}/>
                                    <stop offset="100%" stopColor={series[0]?.color ?? seriesColors.blue} stopOpacity={0.01}/>
                                </linearGradient>
                            </defs>
                            {primaryArea && <path d={primaryArea} fill={`url(#${gradientId})`}/>}
                            {series.map(s => {
                                const pts = s.values.map((v, i) => ({x: xSvg(i), y: ySvg(v)}));
                                return (
                                    <path
                                        key={s.key}
                                        d={buildMonotoneSplinePath(pts)}
                                        fill="none"
                                        stroke={s.color}
                                        strokeWidth={2.25}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                        strokeDasharray={s.dashed ? '6 4' : undefined}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                );
                            })}
                        </svg>

                        {/* HTML Crosshair & Circular Dots (never stretched by SVG aspect ratio) */}
                        {hover !== null && (
                            <>
                                <div
                                    className="pointer-events-none absolute inset-y-0 z-10 w-px -translate-x-1/2 border-l border-dashed border-primary/50"
                                    style={{left: `${xPct(hover)}%`}}
                                />
                                {series.map(s => (
                                    <span
                                        key={s.key}
                                        className="pointer-events-none absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow-xs"
                                        style={{
                                            left: `${xPct(hover)}%`,
                                            top: `${yPct(s.values[hover] ?? 0)}%`,
                                            background: s.color,
                                        }}
                                    />
                                ))}
                                <ChartTooltip
                                    label={labels[hover]}
                                    series={series}
                                    index={hover}
                                    format={format}
                                    leftPct={tooltipLeftPct(hover)}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Sharp HTML X-axis date labels */}
                <div className="mt-2.5 flex pl-11" aria-hidden="true">
                    {labels.map((label, i) => (
                        <div key={`${label}-${i}`} className="min-w-0 flex-1 text-center">
                            {shouldShowLabel(i) && (
                                <span className="inline-block whitespace-nowrap text-[11px] font-medium tabular-nums text-primary/70">
                                    {label}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Default 'bars' mode: Stacked daily columns with day-slot tracks and crisp HTML axes
    return (
        <div className="relative select-none" role="img" aria-label={ariaLabel}>
            <div className="flex items-stretch gap-3">
                {/* Sharp HTML Y-axis labels */}
                <div className="flex h-[200px] w-8 shrink-0 flex-col justify-between pr-1 text-right text-[11px] font-medium tabular-nums text-primary/60" aria-hidden="true">
                    {ticksDesc.map(t => (
                        <span key={t} className="leading-none -translate-y-1 first:translate-y-0 last:translate-y-0">
                            {format(t)}
                        </span>
                    ))}
                </div>

                {/* Plot Canvas */}
                <div className="relative h-[200px] min-w-0 flex-1">
                    {/* Horizontal Grid Lines */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                        {ticksDesc.map((t, idx) => (
                            <div
                                key={t}
                                className={cn(
                                    'w-full border-b',
                                    idx === ticksDesc.length - 1
                                        ? 'border-solid border-rose-300'
                                        : 'border-dashed border-rose-100'
                                )}
                            />
                        ))}
                    </div>

                    {/* Interactive Daily Stacked Columns */}
                    <div
                        className={cn(
                            'relative z-10 flex h-full items-end px-0.5',
                            count <= 10 ? 'gap-2.5 sm:gap-4' : count <= 35 ? 'gap-1 sm:gap-1.5' : 'gap-[2px]'
                        )}
                        onMouseLeave={() => setHover(null)}
                    >
                        {labels.map((label, i) => {
                            const total = dayTotals[i] ?? 0;
                            const isHovered = hover === i;
                            const activeSegments = series
                                .map(s => ({...s, value: s.values[i] ?? 0}))
                                .filter(s => s.value > 0);

                            return (
                                <div
                                    key={`${label}-${i}`}
                                    onMouseEnter={() => setHover(i)}
                                    className={cn(
                                        'group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-t-[4px] transition-colors',
                                        isHovered ? 'bg-rose-100/70' : 'hover:bg-rose-50/70'
                                    )}
                                >
                                    <div className="flex h-full w-full max-w-[28px] flex-col items-center justify-end rounded-t-[4px] bg-rose-50/50 px-[1px]">
                                        {total > 0 ? (
                                            <div className="flex h-full w-full flex-col-reverse items-stretch justify-start overflow-hidden rounded-t-[3px]">
                                                {activeSegments.map((seg, segIdx) => {
                                                    const heightPct = Math.max(3, (seg.value / top) * 100);
                                                    const isTopSegment = segIdx === activeSegments.length - 1;
                                                    return (
                                                        <span
                                                            key={seg.key}
                                                            className={cn(
                                                                'block w-full transition-opacity',
                                                                isTopSegment && 'rounded-t-[3px]',
                                                                segIdx > 0 && 'border-b border-white/60'
                                                            )}
                                                            style={{
                                                                height: `${heightPct}%`,
                                                                background: seg.color,
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span className="block h-[2px] w-full rounded-full bg-rose-200"/>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {hover !== null && (
                        <ChartTooltip
                            label={labels[hover]}
                            series={series}
                            index={hover}
                            format={format}
                            leftPct={tooltipLeftPct(hover)}
                        />
                    )}
                </div>
            </div>

            {/* Sharp HTML X-axis date labels */}
            <div
                className={cn(
                    'mt-2.5 flex pl-11 pr-0.5',
                    count <= 10 ? 'gap-2.5 sm:gap-4' : count <= 35 ? 'gap-1 sm:gap-1.5' : 'gap-[2px]'
                )}
                aria-hidden="true"
            >
                {labels.map((label, i) => (
                    <div key={`${label}-${i}`} className="min-w-0 flex-1 text-center">
                        {shouldShowLabel(i) && (
                            <span
                                className={cn(
                                    'inline-block whitespace-nowrap text-[11px] font-medium tabular-nums transition-colors',
                                    hover === i ? 'font-bold text-primary' : 'text-primary/70'
                                )}
                            >
                                {label}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ChartTooltip({
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
        <div
            className={cn(
                'pointer-events-none absolute top-2 z-20 grid min-w-[165px] -translate-x-1/2 gap-1 rounded-overlay border border-rose-200 bg-white/95 px-3 py-2 text-xs text-primary shadow-lg backdrop-blur-xs',
                className
            )}
            role="tooltip"
            style={{left: `${leftPct}%`}}
        >
            <div className="flex items-center justify-between gap-3 border-b border-rose-100 pb-1">
                <strong className="font-bold tabular-nums text-primary">{label}</strong>
                <span className="rounded-badge bg-uav-red-light px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-primary">
                    {format(total)}
                </span>
            </div>
            {series.map(s => (
                <span key={s.key} className="flex items-center justify-between gap-3 text-primary/75">
                    <span className="inline-flex items-center gap-1.5">
                        <i className="inline-block h-2.5 w-2.5 rounded-panel" style={{background: s.color}}/>
                        {s.label}
                    </span>
                    <strong className="font-semibold tabular-nums text-primary">{format(s.values[index] ?? 0)}</strong>
                </span>
            ))}
        </div>
    );
}

export function Legend({items}: { items: { label: string; color: string; dashed?: boolean }[] }) {
    return <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0 text-xs text-primary/75">{items.map(item => <li key={item.label} className="inline-flex items-center gap-1.5">
        <span className={cn('inline-block', item.dashed ? 'h-0 w-3.5 rounded-panel border-t-2 border-dashed' : 'h-2.5 w-2.5 rounded-panel')} style={{background: item.dashed ? undefined : item.color, borderColor: item.color}}
              aria-hidden="true"/>{item.label}</li>)}</ul>;
}

/** Part-to-whole as one segmented bar plus a labelled list with counts and shares. */
export function SegmentBar({items, ariaLabel}: { items: { label: string; value: number; color: string }[]; ariaLabel: string }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return <div className="w-full">
        <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-panel bg-rose-50" role="img" aria-label={ariaLabel}>
            {total > 0 ? items.filter(i => i.value > 0).map(item =>
                <span key={item.label} style={{flexGrow: item.value, background: item.color}} title={`${item.label}: ${item.value}`}/>) :
                <span className="flex-1"/>}
        </div>
        <ul className="m-0 mt-3.5 list-none p-0">{items.map(item => <li key={item.label} className="grid grid-cols-[12px_1fr_auto_40px] items-center gap-2.5 border-b border-dashed border-rose-100 py-1.5 text-[13px] last:border-b-0">
            <span className="h-2.5 w-2.5 rounded-panel" style={{background: item.color}} aria-hidden="true"/>
            <span className="text-primary/80">{item.label}</span>
            <strong className="text-primary">{item.value}</strong>
            <small className="text-right text-primary/60">{total ? Math.round(item.value / total * 100) : 0}%</small>
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
        <span className="truncate text-primary/80" title={item.label}>{item.label}</span>
        <span className="h-2.5 rounded-full bg-rose-50"><span className="block h-full min-w-[4px] rounded-full" style={{width: `${(item.value / peak) * 100}%`, background: color}}/></span>
        <strong className="text-primary">{format(item.value)}</strong>
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
    const ticks = niceTicks(peak);
    const ticksDesc = [...ticks].reverse();
    const top = ticks[ticks.length - 1] || 1;
    return (
        <div className="relative select-none" role="img" aria-label={ariaLabel}>
            <div className="relative h-[190px]">
                {/* Subtle horizontal gridlines */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                    {ticksDesc.map((t, idx) => (
                        <div
                            key={t}
                            className={cn(
                                'w-full border-b',
                                idx === ticksDesc.length - 1
                                    ? 'border-solid border-rose-300'
                                    : 'border-dashed border-rose-100'
                            )}
                        />
                    ))}
                </div>
                <div className="relative z-10 flex h-full items-stretch gap-2.5 px-1">
                    {groups.map((group, gi) => (
                        <div
                            key={group.label}
                            className={cn(
                                'relative flex min-w-0 flex-1 flex-col rounded-t-[4px] px-1 transition-colors',
                                hover === gi ? 'bg-rose-100/70' : 'hover:bg-rose-50/70'
                            )}
                            onMouseEnter={() => setHover(gi)}
                            onMouseLeave={() => setHover(null)}
                        >
                            {hover === gi && (
                                <div
                                    className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 grid min-w-[155px] -translate-x-1/2 gap-1 rounded-overlay border border-rose-200 bg-white/95 px-3 py-2 text-xs text-primary shadow-lg backdrop-blur-xs"
                                    role="tooltip"
                                >
                                    <strong className="border-b border-rose-100 pb-1 font-bold tabular-nums text-primary">
                                        {group.label}
                                    </strong>
                                    {series.map((s, si) => (
                                        <span key={s.label} className="flex items-center justify-between gap-3 text-primary/75">
                                            <span className="inline-flex items-center gap-1.5">
                                                <i className="inline-block h-2.5 w-2.5 rounded-panel" style={{background: s.color}}/>
                                                {s.label}
                                            </span>
                                            <strong className="font-semibold tabular-nums text-primary">
                                                {format(group.values[si] ?? 0)}
                                            </strong>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-1 items-end justify-center gap-1">
                                {series.map((s, si) => {
                                    const val = group.values[si] ?? 0;
                                    const heightPct = val > 0 ? Math.max(3, (val / top) * 100) : 0;
                                    return (
                                        <span
                                            key={s.label}
                                            className={cn(
                                                'w-[min(22px,42%)] transition-all',
                                                val > 0 ? 'rounded-t-[3px]' : 'h-[2px] rounded-full bg-rose-200'
                                            )}
                                            style={val > 0 ? {height: `${heightPct}%`, background: s.color} : undefined}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-2 flex gap-2.5 px-1">
                {groups.map((group, gi) => (
                    <small
                        key={group.label}
                        className={cn(
                            'min-w-0 flex-1 truncate text-center text-[11px] font-medium tabular-nums transition-colors',
                            hover === gi ? 'font-bold text-primary' : 'text-primary/70'
                        )}
                    >
                        {group.label}
                    </small>
                ))}
            </div>
        </div>
    );
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
            <small key={h} className="text-[10.5px] text-primary/60">{h % 3 === 0 ? h : ''}</small>)}</div>
        {grid.map((row, r) => <div key={rowLabels[r]} className="grid min-w-[440px] grid-cols-[32px_repeat(24,minmax(14px,1fr))] items-center gap-[3px]">
            <small className="text-[10.5px] text-primary/60">{rowLabels[r]}</small>
            {row.map((value, h) => <span key={h} className="h-[18px] rounded-panel bg-rose-50" title={cellTitle(r, h, value)}
                                         style={{background: value ? `rgba(220, 38, 38, ${0.12 + 0.88 * value / peak})` : undefined}}/>)}
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
    if (Math.abs(diff) < 1e-9) return <small className="inline-flex items-center gap-[3px] text-xs font-normal text-primary/60"><Minus size={13} aria-hidden="true"/>{label}</small>;
    const good = diff > 0 === higherIsBetter;
    const pct = previous ? `${Math.round(Math.abs(diff) / Math.abs(previous) * 100)}%` : `${Math.round(Math.abs(diff) * 10) / 10}${suffix}`;
    return <small className={cn('inline-flex items-center gap-[3px] text-xs font-semibold', good ? 'text-primary' : 'rounded-badge bg-primary px-1.5 py-0.5 text-white')}>
        {diff > 0 ? <TrendingUp size={13} aria-hidden="true"/> : <TrendingDown size={13} aria-hidden="true"/>}
        {pct} <span className={cn('font-normal', good ? 'text-primary/70' : 'text-white/85')}>{label}</span>
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
