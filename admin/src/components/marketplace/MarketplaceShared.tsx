'use client';

import type {ReactNode} from 'react';
import {ChevronLeft, ChevronRight, Inbox, Info, RefreshCw, RotateCcw} from 'lucide-react';
import {Alert, Button} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';

export function IllustrativeTag() {
    const {t} = useI18n();
    return (
        <span className="inline-flex shrink-0 items-center rounded-badge border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-muted">
            {t('adminCommerce.marketplace.illustrative')}
        </span>
    );
}

export function IllustrativeFooterNote() {
    const {t} = useI18n();
    return (
        <p className="m-0 flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-muted">
            <Info size={13} className="shrink-0 text-slate-400" aria-hidden="true"/>
            <span>{t('adminCommerce.marketplace.illustrativeFooterNote')}</span>
        </p>
    );
}

export function MarketplaceCardListSkeleton({rows = 3}: { rows?: number }) {
    const {t} = useI18n();
    return (
        <div role="status" aria-busy="true" aria-label={t('opsShared.state.loadingData')} className="divide-y divide-border">
            <span className="sr-only">{t('opsShared.state.loadingData')}</span>
            {Array.from({length: rows}).map((_, idx) => (
                <div key={idx} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-2">
                            <div className="h-5 w-52 animate-pulse rounded-control bg-slate-100"/>
                            <div className="h-3.5 w-72 max-w-full animate-pulse rounded-control bg-slate-100"/>
                        </div>
                        <div className="h-6 w-24 animate-pulse rounded-control bg-slate-100"/>
                    </div>
                    <div className="h-12 w-full animate-pulse rounded-panel bg-slate-100"/>
                </div>
            ))}
        </div>
    );
}

export function MarketplaceErrorPanel({
    message,
    error,
    onRetry,
}: {
    message: string;
    error?: unknown;
    onRetry: () => void;
}) {
    const {t} = useI18n();
    const detail = error instanceof Error && error.message ? error.message : message;
    return (
        <div className="space-y-3 p-5" role="alert">
            <Alert variant="error" className="text-xs">
                {detail}
            </Alert>
            <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetry}
                leftIcon={<RefreshCw size={14} aria-hidden="true"/>}
                className="whitespace-nowrap"
            >
                {t('adminCommerce.marketplace.retry')}
            </Button>
        </div>
    );
}

export function MarketplaceEmptyPanel({
    icon,
    title,
    detail,
    hasFilter,
    onClearFilter,
    onRefresh,
}: {
    icon?: ReactNode;
    title: string;
    detail: string;
    hasFilter?: boolean;
    onClearFilter?: () => void;
    onRefresh?: () => void;
}) {
    const {t} = useI18n();
    return (
        <div role="status" className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--uav-color-primary-light)] text-primary">
                {icon ?? <Inbox size={20} aria-hidden="true"/>}
            </div>
            <h3 className="m-0 text-sm font-semibold text-on-surface">{title}</h3>
            <p className="m-0 max-w-md text-xs text-muted">{detail}</p>
            {hasFilter && onClearFilter ? (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onClearFilter}
                    leftIcon={<RotateCcw size={14} aria-hidden="true"/>}
                    className="mt-2 whitespace-nowrap"
                >
                    {t('adminCommerce.marketplace.clearFilter')}
                </Button>
            ) : onRefresh ? (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onRefresh}
                    leftIcon={<RefreshCw size={14} aria-hidden="true"/>}
                    className="mt-2 whitespace-nowrap"
                >
                    {t('adminCommerce.marketplace.refresh')}
                </Button>
            ) : null}
        </div>
    );
}

export function MarketplaceStatusTabs<T extends string>({
    ariaLabel,
    value,
    items,
    onChange,
}: {
    ariaLabel: string;
    value: T;
    items: { value: T; label: string; icon?: ReactNode }[];
    onChange: (next: T) => void;
}) {
    return (
        <div className="max-w-full overflow-x-auto pb-0.5">
            <div role="tablist" aria-label={ariaLabel} className="inline-flex flex-nowrap gap-1">
                {items.map(item => {
                    const selected = item.value === value;
                    return (
                        <button
                            key={item.value || 'ALL'}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => onChange(item.value)}
                            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors"
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function MarketplacePagination({
    page,
    size = 20,
    totalElements = 0,
    onPageChange,
}: {
    page: number;
    size?: number;
    totalElements?: number;
    onPageChange: (nextPage: number) => void;
}) {
    const {t} = useI18n();
    const totalPages = Math.max(1, Math.ceil(totalElements / Math.max(1, size)));
    if (totalElements <= size && page === 0) return null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted tabular-nums">
            <span className="whitespace-nowrap">
                {t('adminCommerce.marketplace.totalItems', {count: totalElements})} ·{' '}
                {t('adminCommerce.marketplace.pageOf', {page: page + 1, total: totalPages})}
            </span>
            <div className="flex items-center gap-1.5">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 0}
                    onClick={() => onPageChange(page - 1)}
                    leftIcon={<ChevronLeft size={14} aria-hidden="true"/>}
                    className="whitespace-nowrap"
                >
                    {t('adminCommerce.marketplace.prevPage')}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page + 1 >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    rightIcon={<ChevronRight size={14} aria-hidden="true"/>}
                    className="whitespace-nowrap"
                >
                    {t('adminCommerce.marketplace.nextPage')}
                </Button>
            </div>
        </div>
    );
}
