'use client';

import {useEffect, useId, useRef, useState} from 'react';
import {Check, ChevronDown, Plane} from 'lucide-react';
import {normalizeUavStatusCardKey, sanitizeEntityName} from '@/forms/marketplace-forms';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';
import type {ProviderUav} from '@/types/marketplace.types';

/**
 * Two-line UAV selector (UI-REVIEW-9-FIXES #9):
 * - Never truncates UAV `serialNumber` (`font-mono font-bold whitespace-nowrap`)
 * - Shows `manufacturer · model` on a dedicated 2nd caption line inside every dropdown option
 *   AND right beneath the field when a UAV is selected.
 */
export function ProviderUavSelectField({
    uavs,
    value,
    onChange,
    unassignedLabel,
    ariaLabel,
}: {
    uavs: readonly ProviderUav[];
    value: number | '';
    onChange: (nextUavId: number | '') => void;
    unassignedLabel: string;
    ariaLabel?: string;
}) {
    const {t} = useI18n();
    const listboxId = useId();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const selected = uavs.find(u => u.id === Number(value)) ?? null;

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const selectedMeta = selected
        ? [sanitizeEntityName(selected.manufacturer), sanitizeEntityName(selected.model)]
              .filter(Boolean)
              .join(' · ')
        : '';

    return (
        <div ref={rootRef} className="relative min-w-0">
            <button
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-haspopup="listbox"
                aria-label={ariaLabel}
                onClick={() => setOpen(prev => !prev)}
                className={cn(
                    'flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-control border bg-white px-3 py-1.5 text-left transition-colors focus:outline-none',
                    open ? 'border-primary ring-2 ring-primary/15' : 'border-slate-300 hover:border-slate-400',
                )}
            >
                <span className="inline-flex min-w-0 items-center gap-2 overflow-x-auto">
                    <Plane size={14} className="shrink-0 text-primary" aria-hidden="true"/>
                    {selected ? (
                        <strong className="font-mono text-xs font-bold whitespace-nowrap text-slate-900">
                            {sanitizeEntityName(selected.serialNumber)}
                        </strong>
                    ) : (
                        <span className="text-xs font-medium whitespace-nowrap text-slate-500">
                            {unassignedLabel}
                        </span>
                    )}
                </span>
                <ChevronDown
                    size={15}
                    className={cn('shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
                    aria-hidden="true"
                />
            </button>

            {selectedMeta && (
                <p className="m-0 mt-1 line-clamp-1 text-[11px] font-normal text-slate-500">
                    {selectedMeta}
                </p>
            )}

            {open && (
                <ul
                    id={listboxId}
                    role="listbox"
                    className="absolute left-0 z-30 mt-1 max-h-64 w-full min-w-[16rem] list-none overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                    <li role="option" aria-selected={selected === null}>
                        <button
                            type="button"
                            onClick={() => {
                                onChange('');
                                setOpen(false);
                            }}
                            className={cn(
                                'flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
                                selected === null ? 'bg-uav-red-light text-primary' : 'text-slate-600 hover:bg-slate-50',
                            )}
                        >
                            <span>{unassignedLabel}</span>
                            {selected === null && <Check size={14} className="shrink-0 text-primary" aria-hidden="true"/>}
                        </button>
                    </li>

                    {uavs.map(uav => {
                        const isChosen = selected?.id === uav.id;
                        const stateKey = normalizeUavStatusCardKey(uav.status);
                        const meta = [sanitizeEntityName(uav.manufacturer), sanitizeEntityName(uav.model)]
                            .filter(Boolean)
                            .join(' · ');
                        return (
                            <li key={uav.id} role="option" aria-selected={isChosen}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(uav.id);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'flex w-full cursor-pointer items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                                        isChosen ? 'bg-uav-red-light/70' : 'hover:bg-slate-50',
                                    )}
                                >
                                    <div className="min-w-0 space-y-0.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <strong className="font-mono text-xs font-bold whitespace-nowrap text-slate-900">
                                                {sanitizeEntityName(uav.serialNumber)}
                                            </strong>
                                            <span
                                                className={cn(
                                                    'rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
                                                    stateKey === 'FLYING'
                                                        ? 'bg-primary text-white'
                                                        : stateKey === 'MAINTENANCE'
                                                          ? 'bg-amber-100 text-amber-800'
                                                          : 'bg-slate-100 text-slate-700',
                                                )}
                                            >
                                                {t(`opsMarketplace.fleet.status.${stateKey}`)}
                                            </span>
                                        </div>
                                        {meta && (
                                            <span className="block line-clamp-1 text-[11px] text-slate-500">
                                                {meta}
                                            </span>
                                        )}
                                    </div>
                                    {isChosen && <Check size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true"/>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
