'use client';

import {useId, useState} from 'react';
import {cn} from '@/lib/utils';
import {
    buildMonotoneSplinePath,
    ChartTooltip,
    niceTicks,
    seriesColors,
    type Series,
    type TrendViewMode,
} from '@/components/dashboard/AdminChartPrimitives';
import {TrendAxisFrame, TrendMatrixGrid} from '@/components/dashboard/AdminTrendMatrix';

const SVG_W = 1000;
const SVG_H = 200;

/**
 * Multi-series daily chart with 100% HTML/CSS typography and three visual modes:
 * - 'bars' (default): Stacked daily columns with day-slot tracks.
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
    const shouldShowLabel = (i: number) =>
        count <= 10 ||
        i === count - 1 ||
        (i % labelStep === 0 && count - 1 - i >= Math.ceil(labelStep * 0.6));
    const tooltipLeftPct = (index: number) =>
        count <= 1 ? 50 : Math.min(90, Math.max(10, ((index + 0.5) / count) * 100));

    if (mode === 'matrix') {
        return (
            <TrendMatrixGrid
                labels={labels}
                series={series}
                ariaLabel={ariaLabel}
                format={format}
                top={top}
            />
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
            <TrendAxisFrame
                ariaLabel={ariaLabel}
                ticksDesc={ticksDesc}
                labels={labels}
                hover={hover}
                format={format}
                shouldShowLabel={shouldShowLabel}
            >
                <div
                    className="relative h-full w-full"
                    onMouseLeave={() => setHover(null)}
                    onMouseMove={e => {
                        const box = e.currentTarget.getBoundingClientRect();
                        const ratio = Math.min(
                            1,
                            Math.max(0, (e.clientX - box.left) / Math.max(1, box.width)),
                        );
                        setHover(Math.round(ratio * Math.max(0, count - 1)));
                    }}
                >
                    <svg
                        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-0 block h-full w-full overflow-visible"
                        aria-hidden="true"
                    >
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="0%"
                                    stopColor={series[0]?.color ?? seriesColors.blue}
                                    stopOpacity={0.25}
                                />
                                <stop
                                    offset="100%"
                                    stopColor={series[0]?.color ?? seriesColors.blue}
                                    stopOpacity={0.01}
                                />
                            </linearGradient>
                        </defs>
                        {primaryArea && <path d={primaryArea} fill={`url(#${gradientId})`} />}
                        {series.map(s => (
                            <path
                                key={s.key}
                                d={buildMonotoneSplinePath(
                                    s.values.map((v, i) => ({x: xSvg(i), y: ySvg(v)})),
                                )}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={2.25}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                strokeDasharray={s.dashed ? '6 4' : undefined}
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}
                    </svg>
                    {hover !== null && (
                        <>
                            <div
                                className="pointer-events-none absolute inset-y-0 z-10 w-px -translate-x-1/2 border-l border-dashed border-primary/50"
                                style={{left: `${xPct(hover)}%`}}
                            />
                            {series.map(s => (
                                <span
                                    key={s.key}
                                    className="pointer-events-none absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-xs ring-2 ring-white"
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
            </TrendAxisFrame>
        );
    }

    const colGapClass =
        count <= 10 ? 'gap-2.5 sm:gap-4' : count <= 35 ? 'gap-1 sm:gap-1.5' : 'gap-[2px]';

    return (
        <TrendAxisFrame
            ariaLabel={ariaLabel}
            ticksDesc={ticksDesc}
            labels={labels}
            hover={hover}
            format={format}
            shouldShowLabel={shouldShowLabel}
            xAxisGapClass={cn('pr-0.5', colGapClass)}
        >
            <div
                className={cn('relative z-10 flex h-full items-end px-0.5', colGapClass)}
                onMouseLeave={() => setHover(null)}
            >
                {labels.map((label, i) => {
                    const total = dayTotals[i] ?? 0;
                    const activeSegments = series
                        .map(s => ({...s, value: s.values[i] ?? 0}))
                        .filter(s => s.value > 0);
                    return (
                        <div
                            key={`${label}-${i}`}
                            onMouseEnter={() => setHover(i)}
                            className={cn(
                                'group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-t-[4px] transition-colors',
                                hover === i ? 'bg-rose-100/70' : 'hover:bg-rose-50/70',
                            )}
                        >
                            <div className="flex h-full w-full max-w-[28px] flex-col items-center justify-end rounded-t-[4px] bg-rose-50/50 px-[1px]">
                                {total > 0 ? (
                                    <div className="flex h-full w-full flex-col-reverse items-stretch justify-start overflow-hidden rounded-t-[3px]">
                                        {activeSegments.map((seg, segIdx) => (
                                            <span
                                                key={seg.key}
                                                className={cn(
                                                    'block w-full transition-opacity',
                                                    segIdx === activeSegments.length - 1 && 'rounded-t-[3px]',
                                                    segIdx > 0 && 'border-b border-white/60',
                                                )}
                                                style={{
                                                    height: `${Math.max(3, (seg.value / top) * 100)}%`,
                                                    background: seg.color,
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <span className="block h-[2px] w-full rounded-full bg-rose-200" />
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
        </TrendAxisFrame>
    );
}
