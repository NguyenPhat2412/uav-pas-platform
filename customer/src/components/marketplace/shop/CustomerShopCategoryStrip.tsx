'use client';

import {ServiceCategoryIcon} from '@/components/marketplace/shop/ServiceCategoryIcon';
import {
    WEB_SERVICE_CATEGORIES,
    type ServiceCategoryDef,
} from '@/lib/marketplace/service-categories';
import {useI18n} from '@/providers/I18nContext';

export function CustomerShopCategoryStrip({
    activeKey,
    onSelect,
}: {
    activeKey: string;
    onSelect: (category: ServiceCategoryDef) => void;
}) {
    const {t} = useI18n();

    return (
        <div
            role="group"
            aria-label={t('publicSite.catalog.allMissionTypes')}
            className="grid grid-cols-4 gap-1 rounded-panel border border-slate-200 bg-card p-2 sm:grid-cols-7 sm:gap-2 sm:p-3"
        >
            {WEB_SERVICE_CATEGORIES.map((cat, idx) => {
                const selected = activeKey === cat.key;
                const label = t(cat.labelKey);
                return (
                    <button
                        key={cat.key}
                        type="button"
                        aria-pressed={selected}
                        aria-label={label}
                        title={label}
                        onClick={() => onSelect(cat)}
                        onKeyDown={e => {
                            const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                            if (!step) return;
                            e.preventDefault();
                            const nextIdx = (idx + step + WEB_SERVICE_CATEGORIES.length) % WEB_SERVICE_CATEGORIES.length;
                            const nextCat = WEB_SERVICE_CATEGORIES[nextIdx];
                            if (nextCat) onSelect(nextCat);
                            const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');
                            buttons?.[nextIdx]?.focus();
                        }}
                        className="group flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-start gap-1.5 rounded-control px-0.5 py-1.5 text-center transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97] sm:justify-center sm:px-1.5 motion-reduce:transition-none"
                    >
                        <span
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors sm:h-11 sm:w-11 ${
                                selected
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-uav-red-light text-primary group-hover:bg-rose-100'
                            }`}
                        >
                            <ServiceCategoryIcon name={cat.icon} size={20}/>
                        </span>
                        <span
                            className={`line-clamp-2 text-center text-[11px] leading-tight sm:text-xs sm:leading-4 ${
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
