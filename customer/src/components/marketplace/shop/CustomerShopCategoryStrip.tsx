'use client';

import {Camera, Database, MapPinned, Plane, Sparkles, type LucideIcon} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import type {MissionType} from '@/types/mission/mission.types';

interface CategoryTile {
    value: MissionType | '';
    labelKey: string;
    icon: LucideIcon;
}

const CATEGORIES: readonly CategoryTile[] = [
    {value: '', labelKey: 'marketplaceShop.allCategories', icon: Sparkles},
    {value: 'AREA_INSPECTION', labelKey: 'marketplaceShop.catInspection', icon: MapPinned},
    {value: 'AERIAL_RECORDING', labelKey: 'marketplaceShop.catRecording', icon: Camera},
    {value: 'DATA_COLLECTION', labelKey: 'marketplaceShop.catData', icon: Database},
    {value: 'UAV_RENTAL', labelKey: 'marketplaceShop.catRental', icon: Plane},
] as const;

export function CustomerShopCategoryStrip({
    active,
    onSelect,
}: {
    active: MissionType | '';
    onSelect: (next: MissionType | '') => void;
}) {
    const {t} = useI18n();

    return (
        <div
            role="group"
            aria-label={t('publicSite.catalog.allMissionTypes')}
            className="grid grid-cols-5 gap-2 rounded-panel border border-slate-200 bg-card p-3"
        >
            {CATEGORIES.map((cat, idx) => {
                const Icon = cat.icon;
                const selected = active === cat.value;
                const label = t(cat.labelKey);
                return (
                    <button
                        key={cat.labelKey}
                        type="button"
                        aria-pressed={selected}
                        aria-label={label}
                        title={label}
                        onClick={() => onSelect(cat.value)}
                        onKeyDown={e => {
                            const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                            if (!step) return;
                            e.preventDefault();
                            const nextIdx = (idx + step + CATEGORIES.length) % CATEGORIES.length;
                            const nextCat = CATEGORIES[nextIdx];
                            if (nextCat) onSelect(nextCat.value);
                            const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');
                            buttons?.[nextIdx]?.focus();
                        }}
                        className="group flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-control px-1 py-1.5 text-center transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97] motion-reduce:transition-none"
                    >
                        <span
                            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                                selected
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-uav-red-light text-primary group-hover:bg-rose-100'
                            }`}
                        >
                            <Icon size={20} strokeWidth={1.85} aria-hidden="true"/>
                        </span>
                        <span
                            className={`block max-w-full truncate whitespace-nowrap text-xs leading-4 ${
                                selected ? 'font-bold text-primary' : 'font-medium text-slate-700'
                            }`}
                        >
                            {label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
