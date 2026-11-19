'use client';

import {useState} from 'react';
import {CheckCircle2, Clock, Landmark, Layers, Wallet, XCircle} from 'lucide-react';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle, OptionalMark, RequiredMark} from '@/components/ui';
import {
    IllustrativeFooterNote,
    IllustrativeTag,
    MarketplaceCardListSkeleton,
    MarketplaceEmptyPanel,
    MarketplaceErrorPanel,
    MarketplacePagination,
    MarketplaceStatusTabs,
} from '@/components/marketplace/MarketplaceShared';
import {useAdminPayouts, useProcessPayout} from '@/hooks/marketplace/useAdminMarketplace';
import {
    formatMarketplaceVnd,
    sanitizeMarketplaceText,
    validatePayoutProcessInput,
} from '@/forms/marketplace/admin-marketplace-form';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {AdminProviderPayout, PayoutStatus} from '@/types/marketplace/marketplace.types';

export function AdminMarketplacePayouts() {
    const {t} = useI18n();
    const {can} = useAuth();
    const canManagePayout = can('PAYOUT_MANAGE');

    const [status, setStatus] = useState<PayoutStatus | ''>('');
    const [page, setPage] = useState(0);
    const [refById, setRefById] = useState<Record<number, string>>({});
    const [noteById, setNoteById] = useState<Record<number, string>>({});
    const [localError, setLocalError] = useState<string | null>(null);

    const query = useAdminPayouts(status, page);
    const processPayout = useProcessPayout();
    const payouts = query.data?.content ?? [];

    const handleProcess = (payout: AdminProviderPayout, approve: boolean) => {
        setLocalError(null);
        const checked = validatePayoutProcessInput({
            approve,
            rawBankTransferRef: refById[payout.id],
            rawAdminNote: noteById[payout.id],
        });
        if (!checked.ok) {
            setLocalError(
                checked.code === 'TRANSFER_REF_REQUIRED'
                    ? t('adminCommerce.marketplace.payouts.errRefRequired')
                    : t('adminCommerce.marketplace.payouts.errNoteRequired'),
            );
            return;
        }
        processPayout.mutate(
            {id: payout.id, payload: checked.payload},
            {
                onSuccess: () => {
                    toast.success(t('adminCommerce.marketplace.payouts.processedToast', {code: payout.code}));
                },
            },
        );
    };

    const statusTabs: { value: PayoutStatus | ''; label: string; icon: React.ReactNode }[] = [
        {
            value: '',
            label: t('adminCommerce.marketplace.payouts.allStatuses', {count: query.data?.totalElements ?? 0}),
            icon: <Layers size={14} aria-hidden="true"/>,
        },
        {value: 'PENDING', label: t('adminCommerce.marketplace.payouts.statusPending'), icon: <Clock size={14} aria-hidden="true"/>},
        {value: 'PAID', label: t('adminCommerce.marketplace.payouts.statusPaid'), icon: <CheckCircle2 size={14} aria-hidden="true"/>},
        {value: 'REJECTED', label: t('adminCommerce.marketplace.payouts.statusRejected'), icon: <XCircle size={14} aria-hidden="true"/>},
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <Wallet size={20} className="shrink-0 text-primary" aria-hidden="true"/>
                                <span className="truncate">{t('adminCommerce.marketplace.payouts.pageTitle')}</span>
                            </CardTitle>
                            <p className="m-0 mt-1 text-xs text-muted">
                                {t('adminCommerce.marketplace.payouts.subtitle')}
                            </p>
                        </div>
                    </div>
                    <MarketplaceStatusTabs
                        ariaLabel={t('adminCommerce.marketplace.payouts.filterAria')}
                        value={status}
                        items={statusTabs}
                        onChange={next => {
                            setStatus(next);
                            setPage(0);
                        }}
                    />
                </CardHeader>

                {(localError || processPayout.isError) && (
                    <div className="px-5 pt-2">
                        <Alert variant="error" role="alert" className="text-xs">
                            {localError ??
                                (processPayout.error instanceof Error
                                    ? processPayout.error.message
                                    : t('adminCommerce.marketplace.payouts.processError'))}
                        </Alert>
                    </div>
                )}

                <CardContent className="p-0">
                    {query.isLoading ? (
                        <MarketplaceCardListSkeleton rows={3}/>
                    ) : query.isError ? (
                        <MarketplaceErrorPanel
                            message={t('adminCommerce.marketplace.payouts.loadError')}
                            error={query.error}
                            onRetry={() => void query.refetch()}
                        />
                    ) : payouts.length === 0 ? (
                        <MarketplaceEmptyPanel
                            icon={<Wallet size={20} aria-hidden="true"/>}
                            title={t('adminCommerce.marketplace.payouts.emptyTitle')}
                            detail={t('adminCommerce.marketplace.payouts.emptyDetail')}
                            hasFilter={Boolean(status)}
                            onClearFilter={() => {
                                setStatus('');
                                setPage(0);
                            }}
                            onRefresh={() => void query.refetch()}
                        />
                    ) : (
                        <div className={`divide-y divide-border transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
                            {payouts.map(po => (
                                <div key={po.id} className="space-y-3 p-5">
                                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <strong className="font-mono text-sm font-semibold whitespace-nowrap text-on-surface">
                                                    {po.code}
                                                </strong>
                                                <span
                                                    className={`rounded-badge px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                                        po.status === 'PAID'
                                                            ? 'bg-slate-900 text-white'
                                                            : po.status === 'PENDING'
                                                              ? 'bg-amber-100 text-amber-800'
                                                              : 'bg-rose-100 text-danger'
                                                    }`}
                                                >
                                                    {po.status === 'PAID'
                                                        ? t('adminCommerce.marketplace.payouts.statusPaid')
                                                        : po.status === 'PENDING'
                                                          ? t('adminCommerce.marketplace.payouts.statusPending')
                                                          : t('adminCommerce.marketplace.payouts.statusRejected')}
                                                </span>
                                            </div>
                                            <p className="m-0 line-clamp-2 text-sm font-semibold text-on-surface">
                                                {sanitizeMarketplaceText(po.providerDisplayName)}
                                            </p>
                                            <p className="m-0 flex flex-wrap items-center gap-1.5 text-xs text-muted tabular-nums">
                                                <Landmark size={13} aria-hidden="true"/>
                                                <span>
                                                    {t('adminCommerce.marketplace.payouts.bankLabel')}:{' '}
                                                    <strong className="text-on-surface">
                                                        {po.bankName} · {po.bankAccountNumber} ({sanitizeMarketplaceText(po.bankAccountHolder)})
                                                    </strong>
                                                </span>
                                            </p>
                                            {po.providerNote && (
                                                <p className="m-0 text-xs text-muted">
                                                    {t('adminCommerce.marketplace.payouts.providerNoteLabel')}: {po.providerNote}
                                                </p>
                                            )}
                                            {po.bankTransferRef && (
                                                <p className="m-0 font-mono text-xs font-semibold text-on-surface">
                                                    {t('adminCommerce.marketplace.payouts.transferRefDone', {
                                                        ref: po.bankTransferRef,
                                                        by: po.processedBy || '—',
                                                    })}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2 tabular-nums">
                                            <strong className="text-lg font-bold text-primary whitespace-nowrap">
                                                {formatMarketplaceVnd(Number(po.amountVnd))}
                                            </strong>
                                            <IllustrativeTag/>
                                        </div>
                                    </div>

                                    {po.status === 'PENDING' && canManagePayout && (
                                        <div className="uav-bezel">
                                            <div className="uav-bezel-core flex flex-wrap items-end justify-between gap-3 p-3.5">
                                                <div className="flex flex-1 flex-wrap items-end gap-2.5">
                                                    <label className="min-w-[200px] flex-1 space-y-1 text-xs font-semibold text-on-surface">
                                                        <span className="block">
                                                            {t('adminCommerce.marketplace.payouts.refInputLabel')}
                                                            <RequiredMark/>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            aria-label={`${t('adminCommerce.marketplace.payouts.refInputLabel')} ${po.code}`}
                                                            value={refById[po.id] ?? ''}
                                                            onChange={e => setRefById(s => ({...s, [po.id]: e.target.value}))}
                                                            placeholder={t('adminCommerce.marketplace.payouts.refPlaceholder')}
                                                            className="h-9 w-full rounded-control border border-border-input bg-card px-3 font-mono text-xs font-normal"
                                                        />
                                                    </label>
                                                    <label className="min-w-[180px] flex-1 space-y-1 text-xs font-semibold text-on-surface">
                                                        <span className="block">
                                                            {t('adminCommerce.marketplace.payouts.noteInputLabel')}
                                                            <OptionalMark/>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            aria-label={`${t('adminCommerce.marketplace.payouts.noteInputLabel')} ${po.code}`}
                                                            value={noteById[po.id] ?? ''}
                                                            onChange={e => setNoteById(s => ({...s, [po.id]: e.target.value}))}
                                                            placeholder={t('adminCommerce.marketplace.payouts.notePlaceholder')}
                                                            className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs font-normal"
                                                        />
                                                    </label>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        disabled={processPayout.isPending}
                                                        leftIcon={<CheckCircle2 size={14} aria-hidden="true"/>}
                                                        onClick={() => handleProcess(po, true)}
                                                        className="whitespace-nowrap"
                                                    >
                                                        {t('adminCommerce.marketplace.payouts.approveBtn')}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="danger"
                                                        disabled={processPayout.isPending}
                                                        leftIcon={<XCircle size={14} aria-hidden="true"/>}
                                                        onClick={() => handleProcess(po, false)}
                                                        className="whitespace-nowrap"
                                                    >
                                                        {t('adminCommerce.marketplace.payouts.rejectBtn')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
            <IllustrativeFooterNote/>
        </div>
    );
}
