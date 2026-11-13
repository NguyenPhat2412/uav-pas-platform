import React from 'react';
import {cn} from '@/lib/utils';
import {getPresentationLocale} from '@/lib/presentation';

const defaultLabels = {vi: 'Đang tải...', en: 'Loading…', ja: '読み込み中…'} as const;

function Bar({className}: { className?: string }) {
    return <div className={cn('rounded-md bg-slate-200/80 dark:bg-slate-700/60', className)} />;
}

/**
 * In-portal route placeholder shaped like a typical page: title, KPI cards, then a list.
 * The 3D UavLoader is reserved for entering a portal; switching pages inside it shows this instead.
 */
export function PageSkeleton({label, rows = 5, className}: { label?: string; rows?: number; className?: string }) {
    const text = label || defaultLabels[getPresentationLocale()];
    return (
        <div role="status" aria-label={text} aria-busy="true" className={cn('space-y-5 p-4 motion-safe:animate-pulse md:p-6', className)}>
            <div className="space-y-2">
                <Bar className="h-6 w-56 max-w-[70%]" />
                <Bar className="h-4 w-80 max-w-[90%]" />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({length: 4}, (_, index) => (
                    <div key={index} className="space-y-3 rounded-panel border border-slate-200 bg-card p-4">
                        <Bar className="h-3 w-20" />
                        <Bar className="h-7 w-16" />
                    </div>
                ))}
            </div>
            <div className="divide-y divide-slate-100 rounded-panel border border-slate-200 bg-card">
                {Array.from({length: rows}, (_, index) => (
                    <div key={index} className="flex items-center gap-3 px-4 py-3.5">
                        <Bar className="h-9 w-9 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Bar className="h-3.5 w-1/2" />
                            <Bar className="h-3 w-1/3" />
                        </div>
                        <Bar className="hidden h-6 w-20 sm:block" />
                    </div>
                ))}
            </div>
            <span className="sr-only">{text}</span>
        </div>
    );
}
