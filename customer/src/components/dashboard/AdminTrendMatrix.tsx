'use client';

import {type ReactNode, useState} from 'react';
import {Card} from '@/components/ui';
import {cn} from '@/lib/utils';
import {ChartTooltip, type Series} from '@/components/dashboard/AdminChartPrimitives';

export function TrendMatrixGrid({
    labels,
    series,
    ariaLabel,
    format,
    top,
}: {
    labels: string[];
    series: Series[];
    ariaLabel: string;
    format: (value: number) => string;
    top: number;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const count = labels.length;

    return (
        <div className="relative flex flex-col gap-3" role="img" aria-label={ariaLabel}>
            <div
                className={cn(
                    'grid gap-1.5',
                    count <= 7
                        ? 'grid-cols-7'
                        : count <= 31
                          ? 'grid-cols-5 sm:grid-cols-10 lg:grid-cols-15'
                          : 'grid-cols-6 sm:grid-cols-10 md:grid-cols-15 xl:grid-cols-18',
                )}
            >
                {labels.map((label, i) => {
                    const completed = series[0]?.values[i] ?? 0;
                    const failed = series[1]?.values[i] ?? 0;
                    const total = completed + failed;
                    const ratio = total > 0 ? Math.min(1, total / top) : 0;
                    const hasFail = failed > 0;
                    const failOnly = hasFail && completed === 0;
                    return (
                        <Card
                            key={`${label}-${i}`}
                            onMouseEnter={() => setHover(i)}
                            onMouseLeave={() => setHover(null)}
                            className={cn(
                                'relative flex flex-col justify-between rounded-control p-2 transition-all select-none',
                                total === 0
                                    ? 'border-rose-100 bg-white text-rose-300'
                                    : failOnly
                                      ? 'border-primary bg-primary text-white'
                                      : 'border-rose-200 text-primary',
                                hover === i && 'z-10 border-primary bg-white shadow-xs ring-2 ring-primary/40',
                            )}
                            style={
                                total > 0 && !failOnly
                                    ? {backgroundColor: `rgba(220, 38, 38, ${0.06 + ratio * 0.22})`}
                                    : undefined
                            }
                        >
                            <div className="flex items-center justify-between gap-1">
                                <span
                                    className={cn(
                                        'text-[10.5px] font-medium tabular-nums',
                                        failOnly ? 'text-white/85' : 'text-primary/70',
                                    )}
                                >
                                    {label}
                                </span>
                                {hasFail && (
                                    <span
                                        className={cn(
                                            'h-1.5 w-1.5 shrink-0 rounded-full',
                                            failOnly ? 'bg-white' : 'bg-primary',
                                        )}
                                        title={`${series[1]?.label}: ${format(failed)}`}
                                    />
                                )}
                            </div>
                            <div className="mt-1.5 flex items-baseline justify-between gap-1">
                                <strong
                                    className={cn(
                                        'text-sm leading-none font-bold tabular-nums',
                                        total === 0
                                            ? 'text-rose-200'
                                            : failOnly
                                              ? 'text-white'
                                              : 'text-primary',
                                    )}
                                >
                                    {format(total)}
                                </strong>
                                {total > 0 && hasFail && (
                                    <small
                                        className={cn(
                                            'text-[10px] font-semibold tabular-nums',
                                            failOnly ? 'text-white/90' : 'text-primary',
                                        )}
                                    >
                                        -{format(failed)}
                                    </small>
                                )}
                            </div>
                        </Card>
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

export function TrendAxisFrame({
    ariaLabel,
    ticksDesc,
    labels,
    hover,
    format,
    shouldShowLabel,
    xAxisGapClass,
    children,
}: {
    ariaLabel: string;
    ticksDesc: number[];
    labels: string[];
    hover: number | null;
    format: (value: number) => string;
    shouldShowLabel: (i: number) => boolean;
    xAxisGapClass?: string;
    children: ReactNode;
}) {
    return (
        <div className="relative select-none" role="img" aria-label={ariaLabel}>
            <div className="flex items-stretch gap-3">
                <div
                    className="flex h-[200px] w-8 shrink-0 flex-col justify-between pr-1 text-right text-[11px] font-medium tabular-nums text-primary/60"
                    aria-hidden="true"
                >
                    {ticksDesc.map(tick => (
                        <span
                            key={tick}
                            className="-translate-y-1 leading-none first:translate-y-0 last:translate-y-0"
                        >
                            {format(tick)}
                        </span>
                    ))}
                </div>
                <div className="relative h-[200px] min-w-0 flex-1">
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
                    {children}
                </div>
            </div>
            <div className={cn('mt-2.5 flex pl-11', xAxisGapClass)} aria-hidden="true">
                {labels.map((label, i) => (
                    <div key={`${label}-${i}`} className="min-w-0 flex-1 text-center">
                        {shouldShowLabel(i) && (
                            <span
                                className={cn(
                                    'inline-block text-[11px] font-medium whitespace-nowrap tabular-nums transition-colors',
                                    hover === i ? 'font-bold text-primary' : 'text-primary/70',
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
