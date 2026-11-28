'use client';

import {Calendar, Clock, PackageCheck, PlaneTakeoff} from 'lucide-react';
import type {SellerOrderTab} from '@/forms/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';

const ORDER_TABS: readonly { key: SellerOrderTab; icon: typeof Clock }[] = [
    {key: 'PENDING_ACCEPT', icon: Clock},
    {key: 'WAITING_FLIGHT', icon: Calendar},
    {key: 'IN_FLIGHT', icon: PlaneTakeoff},
    {key: 'DELIVERED', icon: PackageCheck},
] as const;

interface ProviderOrderTabsBarProps {
    activeTab: SellerOrderTab;
    counts: Record<SellerOrderTab, number>;
    onSelect: (tab: SellerOrderTab) => void;
}

export function ProviderOrderTabsBar({activeTab, counts, onSelect}: ProviderOrderTabsBarProps) {
    const {t} = useI18n();

    return (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="tablist">
            {ORDER_TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onSelect(tab.key)}
                        className={`flex min-h-14 items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                            active
                                ? 'border-primary bg-uav-red-light text-primary'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <span className="inline-flex min-w-0 items-center gap-2">
                            <Icon size={18} className={active ? 'text-primary' : 'text-slate-500'} aria-hidden="true"/>
                            <span className="line-clamp-2 break-words text-xs font-semibold leading-tight">
                                {t(`opsMarketplace.orders.tabs.${tab.key}`)}
                            </span>
                        </span>
                        <strong className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-900 shadow-2xs">
                            {counts[tab.key]}
                        </strong>
                    </button>
                );
            })}
        </div>
    );
}
