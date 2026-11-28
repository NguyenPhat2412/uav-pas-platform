'use client';

import Link from 'next/link';
import {CalendarClock, Clock3, Layers, PackageCheck, Plane, Star, type LucideIcon} from 'lucide-react';
import {ORDER_STATUS_GROUPS} from '@/forms/project-form';
import {useOrderRealtimeSync, useOrderSummary} from '@/hooks/useCustomerProjects';
import {useI18n} from '@/providers/I18nContext';
import type {CustomerOrderSummary, OrderStatusGroup} from '@/types/project.types';

interface GroupMeta {
    group: OrderStatusGroup;
    labelKey: string;
    countKey: keyof CustomerOrderSummary;
    icon: LucideIcon;
}

const GROUP_META: readonly GroupMeta[] = [
    {group: 'PENDING', labelKey: 'marketplaceShop.ordersPending', countKey: 'pending', icon: Clock3},
    {group: 'SCHEDULED', labelKey: 'marketplaceShop.ordersScheduled', countKey: 'scheduled', icon: CalendarClock},
    {group: 'IN_FLIGHT', labelKey: 'marketplaceShop.ordersInFlight', countKey: 'inFlight', icon: Plane},
    {group: 'DELIVERED', labelKey: 'marketplaceShop.ordersDelivered', countKey: 'delivered', icon: PackageCheck},
    {group: 'TO_REVIEW', labelKey: 'marketplaceShop.ordersToReview', countKey: 'toReview', icon: Star},
] as const;

export function OrderStatusBar({
    activeGroup = '',
    onSelectGroup,
    linkMode = false,
    showAllTab = false,
}: {
    activeGroup?: OrderStatusGroup | '';
    onSelectGroup?: (next: OrderStatusGroup | '') => void;
    linkMode?: boolean;
    showAllTab?: boolean;
}) {
    const {t} = useI18n();
    const summaryQuery = useOrderSummary();
    useOrderRealtimeSync();

    const summary = summaryQuery.isSuccess ? summaryQuery.data : null;

    return (
        <nav
            aria-label={t('common.status')}
            className={`grid gap-1 rounded-panel border border-slate-200 bg-card p-2 sm:gap-2 sm:p-2.5 ${
                showAllTab ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-5'
            }`}
        >
            {showAllTab && (
                <button
                    type="button"
                    aria-pressed={activeGroup === ''}
                    onClick={() => onSelectGroup?.('')}
                    className={`flex min-h-15 min-w-0 cursor-pointer flex-col items-center justify-start gap-1 rounded-control px-0.5 py-1.5 text-center transition-colors sm:justify-center sm:px-1.5 ${
                        activeGroup === ''
                            ? 'bg-uav-red-light text-primary'
                            : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <span
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            activeGroup === '' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                        <Layers size={17} aria-hidden="true"/>
                    </span>
                    <span className="line-clamp-2 text-center text-[11px] leading-tight font-semibold sm:text-xs sm:leading-4">
                        {t('marketplaceShop.ordersAll')}
                    </span>
                </button>
            )}

            {GROUP_META.map(meta => {
                const Icon = meta.icon;
                const selected = activeGroup === meta.group;
                const count = summary ? Number(summary[meta.countKey] || 0) : 0;
                const label = t(meta.labelKey);

                const inner = (
                    <>
                        <span
                            className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                                selected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-uav-red-light text-primary'
                            }`}
                        >
                            <Icon size={17} strokeWidth={1.85} aria-hidden="true"/>
                            {count > 0 && (
                                <span className="absolute -top-1 -right-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold whitespace-nowrap text-white ring-2 ring-white tabular-nums">
                                    {count > 99 ? '99+' : count}
                                </span>
                            )}
                        </span>
                        <span
                            className={`line-clamp-2 text-center text-[11px] leading-tight sm:text-xs sm:leading-4 ${
                                selected ? 'font-bold text-primary' : 'font-medium text-slate-700'
                            }`}
                        >
                            {label}
                        </span>
                    </>
                );

                if (linkMode) {
                    return (
                        <Link
                            key={meta.group}
                            href={`/customer/missions?group=${meta.group}`}
                            title={label}
                            aria-label={count > 0 ? `${label}: ${count}` : label}
                            className="flex min-h-15 min-w-0 flex-col items-center justify-start gap-1 rounded-control px-0.5 py-1.5 text-center transition-transform duration-150 hover:bg-slate-50 active:scale-[0.97] sm:justify-center sm:px-1.5 motion-reduce:transition-none"
                        >
                            {inner}
                        </Link>
                    );
                }

                return (
                    <button
                        key={meta.group}
                        type="button"
                        aria-pressed={selected}
                        aria-label={count > 0 ? `${label}: ${count}` : label}
                        title={label}
                        onClick={() => onSelectGroup?.(selected ? '' : meta.group)}
                        onKeyDown={e => {
                            const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                            if (!step) return;
                            e.preventDefault();
                            const buttons = Array.from(
                                e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button') ?? [],
                            );
                            const curr = buttons.indexOf(e.currentTarget);
                            if (curr >= 0 && buttons.length > 0) {
                                buttons[(curr + step + buttons.length) % buttons.length]?.focus();
                            }
                        }}
                        className={`flex min-h-15 min-w-0 cursor-pointer flex-col items-center justify-start gap-1 rounded-control px-0.5 py-1.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:justify-center sm:px-1.5 ${
                            selected ? 'bg-uav-red-light/70' : 'hover:bg-slate-50'
                        }`}
                    >
                        {inner}
                    </button>
                );
            })}
        </nav>
    );
}

export {ORDER_STATUS_GROUPS};
