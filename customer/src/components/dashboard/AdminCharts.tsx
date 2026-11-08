'use client';

import {useState} from 'react';
import {Badge, Card} from '@/components/ui';
import {cn} from '@/lib/utils';
import {
    Delta,
    Legend,
    niceTicks,
    seriesColors,
    type Series,
    type TrendViewMode,
} from '@/components/dashboard/AdminChartPrimitives';
import {TrendChart} from '@/components/dashboard/AdminTrendChart';

export {Delta, Legend, seriesColors, TrendChart};
export type {Series, TrendViewMode};

/** Part-to-whole as one segmented bar plus a labelled list with counts and shares. */
export function SegmentBar({
    items,
    ariaLabel,
}: {
    items: {label: string; value: number; color: string}[];
    ariaLabel: string;
}) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return (
        <div className="w-full">
            <div
                className="flex h-3.5 gap-0.5 overflow-hidden rounded-panel bg-rose-50"
                role="img"
                aria-label={ariaLabel}
            >
                {total > 0 ? (
                    items
                        .filter(i => i.value > 0)
                        .map(item => (
                            <span
                                key={item.label}
                                style={{flexGrow: item.value, background: item.color}}
                                title={`${item.label}: ${item.value}`}
                            />
                        ))
                ) : (
                    <span className="flex-1" />
                )}
            </div>
            <ul className="m-0 mt-3.5 list-none p-0">
                {items.map(item => (
                    <li
                        key={item.label}
                        className="grid grid-cols-[12px_1fr_auto_48px] items-center gap-2.5 border-b border-dashed border-rose-100 py-1.5 text-[13px] last:border-b-0"
                    >
                        <span
                            className="h-2.5 w-2.5 rounded-panel"
                            style={{background: item.color}}
                            aria-hidden="true"
                        />
                        <span className="text-primary/80">{item.label}</span>
                        <strong className="tabular-nums text-primary">{item.value}</strong>
                        <Badge
                            variant="outline"
                            size="sm"
                            className="justify-end border-rose-100 text-primary/70 tabular-nums"
                        >
                            {total ? Math.round((item.value / total) * 100) : 0}%
                        </Badge>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Ranked horizontal bars for one measure in a single hue. */
export function BarList({
    items,
    format = String,
    color = seriesColors.blue,
}: {
    items: {label: string; value: number}[];
    format?: (value: number) => string;
    color?: string;
}) {
    const peak = Math.max(1, ...items.map(i => i.value));
    return (
        <ul className="m-0 grid list-none gap-3 p-0">
            {items.map(item => (
                <li
                    key={item.label}
                    className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-2.5 text-[13px]"
                >
                    <span className="truncate text-primary/80" title={item.label}>
                        {item.label}
                    </span>
                    <span className="h-2.5 rounded-full bg-rose-50">
                        <span
                            className="block h-full min-w-[4px] rounded-full"
                            style={{width: `${(item.value / peak) * 100}%`, background: color}}
                        />
                    </span>
                    <strong className="tabular-nums text-primary">{format(item.value)}</strong>
                </li>
            ))}
        </ul>
    );
}

/** Grouped columns (e.g. paid vs outstanding per month). */
export function ColumnChart({
    groups,
    series,
    ariaLabel,
    format = String,
}: {
    groups: {label: string; values: number[]}[];
    series: {label: string; color: string}[];
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
                <div
                    className="pointer-events-none absolute inset-0 flex flex-col justify-between"
                    aria-hidden="true"
                >
                    {ticksDesc.map((tick, idx) => (
                        <div
                            key={tick}
                            className={cn(
                                'w-full border-b',
                                idx === ticksDesc.length - 1
                                    ? 'border-solid border-rose-300'
                                    : 'border-dashed border-rose-100',
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
                                hover === gi ? 'bg-rose-100/70' : 'hover:bg-rose-50/70',
                            )}
                            onMouseEnter={() => setHover(gi)}
                            onMouseLeave={() => setHover(null)}
                        >
                            {hover === gi && (
                                <Card
                                    role="tooltip"
                                    className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 grid min-w-[155px] -translate-x-1/2 gap-1 rounded-overlay border-rose-200 bg-white/95 px-3 py-2 text-xs text-primary shadow-lg backdrop-blur-xs"
                                >
                                    <strong className="border-b border-rose-100 pb-1 font-bold tabular-nums text-primary">
                                        {group.label}
                                    </strong>
                                    {series.map((s, si) => (
                                        <span
                                            key={s.label}
                                            className="flex items-center justify-between gap-3 text-primary/75"
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                <i
                                                    className="inline-block h-2.5 w-2.5 rounded-panel"
                                                    style={{background: s.color}}
                                                />
                                                {s.label}
                                            </span>
                                            <strong className="font-semibold tabular-nums text-primary">
                                                {format(group.values[si] ?? 0)}
                                            </strong>
                                        </span>
                                    ))}
                                </Card>
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
                                                val > 0
                                                    ? 'rounded-t-[3px]'
                                                    : 'h-[2px] rounded-full bg-rose-200',
                                            )}
                                            style={
                                                val > 0
                                                    ? {height: `${heightPct}%`, background: s.color}
                                                    : undefined
                                            }
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
                            hover === gi ? 'font-bold text-primary' : 'text-primary/70',
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
export function Heatmap({
    grid,
    rowLabels,
    ariaLabel,
    cellTitle,
}: {
    grid: number[][];
    rowLabels: string[];
    ariaLabel: string;
    cellTitle: (row: number, hour: number, value: number) => string;
}) {
    const peak = Math.max(1, ...grid.flat());
    return (
        <div className="flex flex-col gap-[3px] overflow-x-auto" role="img" aria-label={ariaLabel}>
            <div
                className="grid min-w-[440px] grid-cols-[32px_repeat(24,minmax(14px,1fr))] items-center gap-[3px]"
                aria-hidden="true"
            >
                <span />
                {Array.from({length: 24}, (_, h) => (
                    <small key={h} className="text-[10.5px] text-primary/60">
                        {h % 3 === 0 ? h : ''}
                    </small>
                ))}
            </div>
            {grid.map((row, r) => (
                <div
                    key={rowLabels[r]}
                    className="grid min-w-[440px] grid-cols-[32px_repeat(24,minmax(14px,1fr))] items-center gap-[3px]"
                >
                    <small className="text-[10.5px] text-primary/60">{rowLabels[r]}</small>
                    {row.map((value, h) => (
                        <span
                            key={h}
                            className="h-[18px] rounded-panel bg-rose-50"
                            title={cellTitle(r, h, value)}
                            style={{
                                background: value
                                    ? `rgba(220, 38, 38, ${0.12 + (0.88 * value) / peak})`
                                    : undefined,
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
