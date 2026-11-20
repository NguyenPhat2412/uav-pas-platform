'use client';

import {useState} from 'react';
import {PlaneTakeoff, Radio, RefreshCw} from 'lucide-react';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {
    IllustrativeFooterNote,
    MarketplaceCardListSkeleton,
    MarketplaceEmptyPanel,
    MarketplaceErrorPanel,
    MarketplacePagination,
} from '@/components/marketplace/MarketplaceShared';
import {DispatchQueueCard} from '@/components/marketplace/DispatchQueueCard';
import {
    useAdminDispatchQueue,
    useAdminMarketplaceRealtime,
    useAutoDispatchOrder,
    useManualDispatchOrder,
} from '@/hooks/marketplace/useAdminMarketplace';
import {
    buildAutoDispatchInput,
    buildManualDispatchInput,
    formatAdminConflictError,
} from '@/forms/marketplace/admin-marketplace-form';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';

export function AdminMarketplaceDispatch() {
    const {t} = useI18n();
    const {can} = useAuth();
    const canModerate = can('MARKETPLACE_MODERATE');

    const [page, setPage] = useState(0);
    const [noteByMission, setNoteByMission] = useState<Record<number, string>>({});

    const {wsConnected} = useAdminMarketplaceRealtime(canModerate);
    const query = useAdminDispatchQueue(page);
    const manualDispatch = useManualDispatchOrder();
    const autoDispatch = useAutoDispatchOrder();

    const items = query.data?.content ?? [];
    const isMutating = manualDispatch.isPending || autoDispatch.isPending;
    const mutationError = manualDispatch.error ?? autoDispatch.error;

    const handleManualAssign = (missionId: number, code: string, providerId: number) => {
        manualDispatch.mutate(
            {
                missionId,
                payload: buildManualDispatchInput({
                    providerId,
                    rawNote: noteByMission[missionId],
                }),
            },
            {
                onSuccess: () => {
                    toast.success(t('adminCommerce.marketplace.dispatch.assignedToast', {code}));
                },
            },
        );
    };

    const handleAutoAssign = (missionId: number, code: string) => {
        autoDispatch.mutate(
            {
                missionId,
                payload: buildAutoDispatchInput({
                    missionId,
                    rawNote: noteByMission[missionId],
                }),
            },
            {
                onSuccess: () => {
                    toast.success(t('adminCommerce.marketplace.dispatch.autoAssignedToast', {code}));
                },
            },
        );
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <PlaneTakeoff size={20} className="shrink-0 text-primary" aria-hidden="true"/>
                            <span className="truncate">{t('adminCommerce.marketplace.dispatch.pageTitle')}</span>
                        </CardTitle>
                        <p className="m-0 mt-1 text-xs text-muted">
                            {t('adminCommerce.marketplace.dispatch.subtitle')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                        <span className="rounded-badge bg-slate-100 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-on-surface tabular-nums">
                            {t('adminCommerce.marketplace.dispatch.queueCount', {
                                count: query.data?.totalElements ?? 0,
                            })}
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void query.refetch()}
                            leftIcon={<RefreshCw size={13} aria-hidden="true"/>}
                            className="whitespace-nowrap"
                        >
                            {t('adminCommerce.marketplace.refresh')}
                        </Button>
                    </div>
                </CardHeader>

                {(manualDispatch.isError || autoDispatch.isError) && (
                    <div className="px-5 pt-2">
                        <Alert variant="error" role="alert" className="text-xs">
                            {formatAdminConflictError(
                                mutationError,
                                t,
                                'adminCommerce.marketplace.dispatch.assignError',
                            )}
                        </Alert>
                    </div>
                )}

                <CardContent className="p-0">
                    {query.isLoading ? (
                        <MarketplaceCardListSkeleton rows={3}/>
                    ) : query.isError ? (
                        <MarketplaceErrorPanel
                            message={t('adminCommerce.marketplace.dispatch.loadError')}
                            error={query.error}
                            onRetry={() => void query.refetch()}
                        />
                    ) : items.length === 0 ? (
                        <MarketplaceEmptyPanel
                            icon={<PlaneTakeoff size={20} aria-hidden="true"/>}
                            title={t('adminCommerce.marketplace.dispatch.emptyTitle')}
                            detail={t('adminCommerce.marketplace.dispatch.emptyDetail')}
                            onRefresh={() => void query.refetch()}
                        />
                    ) : (
                        <div className={`divide-y divide-border transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
                            {items.map(entry => (
                                <DispatchQueueCard
                                    key={entry.mission.id}
                                    item={entry}
                                    noteValue={noteByMission[entry.mission.id] ?? ''}
                                    canModerate={canModerate}
                                    isPending={isMutating}
                                    onNoteChange={val => setNoteByMission(s => ({...s, [entry.mission.id]: val}))}
                                    onManualAssign={providerId =>
                                        handleManualAssign(entry.mission.id, entry.mission.code, providerId)
                                    }
                                    onAutoAssign={() => handleAutoAssign(entry.mission.id, entry.mission.code)}
                                />
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
            <IllustrativeFooterNote/>
        </div>
    );
}
