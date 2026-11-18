'use client';

import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {
    Calendar,
    ClipboardList,
    Eye,
    FolderKanban,
    Layers,
    MapPin,
    Radio,
    Search,
    Store,
    User,
} from 'lucide-react';
import {Button, Card, CardContent, CardHeader, CardTitle, StatusBadge} from '@/components/ui';
import {
    IllustrativeTag,
    MarketplaceCardListSkeleton,
    MarketplaceEmptyPanel,
    MarketplaceErrorPanel,
    MarketplacePagination,
    MarketplaceStatusTabs,
} from '@/components/marketplace/MarketplaceShared';
import {OrderTwoSidedDrawer} from '@/components/marketplace/OrderTwoSidedDrawer';
import {formatMarketplaceVnd} from '@/forms/marketplace/admin-marketplace-form';
import {
    useAdminMarketplaceOrders,
    useAdminMarketplaceRealtime,
    useAdminProviders,
} from '@/hooks/marketplace/useAdminMarketplace';
import {displayLabel} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {AdminMarketplaceOrder} from '@/types/marketplace/marketplace.types';

const ORDER_STATUS_TABS = [
    '',
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'READY',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
] as const;

export function AdminMarketplaceOrders() {
    const {t, formatDate} = useI18n();
    const {wsConnected} = useAdminMarketplaceRealtime();
    const searchParams = useSearchParams();

    const [status, setStatus] = useState<string>('');
    const [projectId, setProjectId] = useState<string>(() => searchParams.get('projectId') ?? '');
    const [providerId, setProviderId] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<AdminMarketplaceOrder | null>(null);

    const providersQuery = useAdminProviders('VERIFIED', '', 0);
    const verifiedProviders = providersQuery.data?.content ?? [];

    const query = useAdminMarketplaceOrders({
        status,
        projectId,
        providerId,
        search,
        page,
    });

    const rawOrders = query.data?.content ?? [];
    const orders = rawOrders.filter(order => {
        if (projectId.trim() && order.projectId != null && String(order.projectId) !== projectId.trim()) {
            return false;
        }
        if (providerId.trim() && order.providerId != null && String(order.providerId) !== providerId.trim()) {
            return false;
        }
        return true;
    });

    const hasFilter = Boolean(status || projectId.trim() || providerId.trim() || search.trim());

    const statusTabs = ORDER_STATUS_TABS.map(code => ({
        value: code,
        label: code ? displayLabel(code) : t('adminCommerce.marketplace.orders.allStatuses'),
        icon: code === '' ? <Layers size={14} aria-hidden="true"/> : undefined,
    }));

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <ClipboardList size={20} className="shrink-0 text-primary" aria-hidden="true"/>
                                <span className="truncate">{t('adminCommerce.marketplace.orders.pageTitle')}</span>
                            </CardTitle>
                            <p className="m-0 mt-1 text-xs text-muted">
                                {t('adminCommerce.marketplace.orders.subtitle')}
                            </p>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-badge border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                                wsConnected
                                    ? 'border-slate-300 bg-slate-900 text-white'
                                    : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                        >
                            <Radio size={12} aria-hidden="true"/>
                            {wsConnected
                                ? t('adminCommerce.marketplace.dispatch.liveConnected')
                                : t('adminCommerce.marketplace.dispatch.liveReconnecting')}
                        </span>
                    </div>

                    <MarketplaceStatusTabs
                        ariaLabel={t('adminCommerce.marketplace.orders.statusFilter')}
                        value={status}
                        items={statusTabs}
                        onChange={next => {
                            setStatus(next);
                            setPage(0);
                        }}
                    />

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <label className="relative">
                            <span className="sr-only">{t('adminCommerce.marketplace.orders.searchPlaceholder')}</span>
                            <Search size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                            <input
                                type="search"
                                aria-label={t('adminCommerce.marketplace.orders.searchPlaceholder')}
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setPage(0);
                                }}
                                placeholder={t('adminCommerce.marketplace.orders.searchPlaceholder')}
                                className="h-9 w-full rounded-control border border-border bg-card pr-3 pl-8 text-xs font-medium text-foreground"
                            />
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            aria-label={t('adminCommerce.marketplace.orders.projectFilter')}
                            value={projectId}
                            onChange={e => {
                                setProjectId(e.target.value);
                                setPage(0);
                            }}
                            placeholder={t('adminCommerce.marketplace.orders.projectPlaceholder')}
                            className="h-9 w-full rounded-control border border-border bg-card px-3 text-xs font-medium text-foreground tabular-nums"
                        />
                        <select
                            aria-label={t('adminCommerce.marketplace.orders.providerFilter')}
                            value={providerId}
                            onChange={e => {
                                setProviderId(e.target.value);
                                setPage(0);
                            }}
                            className="h-9 w-full rounded-control border border-border bg-card px-3 text-xs font-medium text-foreground"
                        >
                            <option value="">{t('adminCommerce.marketplace.orders.allProviders')}</option>
                            {verifiedProviders.map(p => (
                                <option key={p.id} value={String(p.id)}>
                                    {p.displayName} ({p.province})
                                </option>
                            ))}
                        </select>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {query.isLoading ? (
                        <MarketplaceCardListSkeleton rows={4}/>
                    ) : query.isError ? (
                        <MarketplaceErrorPanel
                            message={t('adminCommerce.marketplace.orders.loadError')}
                            error={query.error}
                            onRetry={() => void query.refetch()}
                        />
                    ) : orders.length === 0 ? (
                        <MarketplaceEmptyPanel
                            icon={<ClipboardList size={20} aria-hidden="true"/>}
                            title={t('adminCommerce.marketplace.orders.emptyTitle')}
                            detail={t('adminCommerce.marketplace.orders.emptyDetail')}
                            hasFilter={hasFilter}
                            onClearFilter={() => {
                                setStatus('');
                                setProjectId('');
                                setProviderId('');
                                setSearch('');
                                setPage(0);
                            }}
                            onRefresh={() => void query.refetch()}
                        />
                    ) : (
                        <div className={`divide-y divide-border transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
                            {orders.map(order => (
                                <div key={order.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-badge bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold whitespace-nowrap text-white">
                                                {order.code}
                                            </span>
                                            <strong className="line-clamp-2 text-sm font-semibold text-on-surface">
                                                {order.title}
                                            </strong>
                                            <StatusBadge status={order.status}/>
                                            {order.providerResponseStatus &&
                                                order.providerResponseStatus !== 'NOT_APPLICABLE' && (
                                                    <StatusBadge status={order.providerResponseStatus}/>
                                                )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <User size={13} aria-hidden="true"/>
                                                <strong className="text-on-surface">
                                                    {order.customerName || (order.customerId ? `#${order.customerId}` : '—')}
                                                </strong>
                                            </span>
                                            {(order.projectName || order.projectId) && (
                                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                    <FolderKanban size={13} aria-hidden="true"/>
                                                    <span>{order.projectName || `#${order.projectId}`}</span>
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <Store size={13} aria-hidden="true"/>
                                                <strong className="text-on-surface">
                                                    {order.providerDisplayName ||
                                                        t('adminCommerce.marketplace.orders.unassignedProvider')}
                                                </strong>
                                            </span>
                                            {order.locationName && (
                                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                    <MapPin size={13} aria-hidden="true"/>
                                                    <span className="max-w-48 truncate">{order.locationName}</span>
                                                </span>
                                            )}
                                            {order.requestedDate && (
                                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                    <Calendar size={13} aria-hidden="true"/>
                                                    <span>{formatDate(order.requestedDate)}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
                                        {order.quotedSubtotalVnd != null && (
                                            <div className="flex items-center gap-1.5">
                                                <strong className="text-sm font-bold text-primary whitespace-nowrap">
                                                    {formatMarketplaceVnd(Number(order.quotedSubtotalVnd))}
                                                </strong>
                                                <IllustrativeTag/>
                                            </div>
                                        )}
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            leftIcon={<Eye size={14} aria-hidden="true"/>}
                                            onClick={() => setSelectedOrder(order)}
                                            className="whitespace-nowrap"
                                        >
                                            {t('adminCommerce.marketplace.orders.detailBtn')}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <MarketplacePagination
                        page={page}
                        size={query.data?.size ?? 20}
                        totalElements={query.data?.totalElements ?? 0}
                        onPageChange={setPage}
                    />
                </CardContent>
            </Card>

            {selectedOrder && (
                <OrderTwoSidedDrawer
                    initialOrder={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </div>
    );
}
