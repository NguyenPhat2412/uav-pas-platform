'use client';

import {useState} from 'react';
import {BadgeCheck, Clock, FileEdit, Layers, PauseCircle, Search, ShieldCheck, Store, XCircle} from 'lucide-react';
import {Alert, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {
    IllustrativeFooterNote,
    MarketplaceCardListSkeleton,
    MarketplaceEmptyPanel,
    MarketplaceErrorPanel,
    MarketplacePagination,
    MarketplaceStatusTabs,
} from '@/components/marketplace/MarketplaceShared';
import {ProviderKycDrawer} from '@/components/marketplace/ProviderKycDrawer';
import {ProviderModerationRow} from '@/components/marketplace/ProviderModerationRow';
import {ProviderVerificationWorkflowCard} from '@/components/marketplace/ProviderVerificationWorkflowCard';
import {
    useAdminProviders,
    useModerateProvider,
    useModerateProviderDocument,
    useOpenProviderDocument,
} from '@/hooks/marketplace/useAdminMarketplace';
import {usePlatformSettings} from '@/hooks/settings/useSettings';
import {validateProviderModerationInput} from '@/forms/marketplace/admin-marketplace-form';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {AdminProviderProfile, ProviderVerificationStatus} from '@/types/marketplace/marketplace.types';

export function AdminMarketplaceProviders() {
    const {t} = useI18n();
    const {can} = useAuth();
    const canModerate = can('MARKETPLACE_MODERATE');

    const [status, setStatus] = useState<ProviderVerificationStatus | ''>('');
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(0);
    const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
    const [noteById, setNoteById] = useState<Record<number, string>>({});
    const [feePctById, setFeePctById] = useState<Record<number, string>>({});
    const [localError, setLocalError] = useState<string | null>(null);

    const query = useAdminProviders(status, keyword, page);
    const settingsQuery = usePlatformSettings();
    const moderate = useModerateProvider();
    const moderateDoc = useModerateProviderDocument();
    const openDoc = useOpenProviderDocument();
    const providers = query.data?.content ?? [];
    const selectedProvider: AdminProviderProfile | null =
        providers.find(p => p.id === selectedProviderId) ?? null;

    const configuredDefaultFeePct = (() => {
        const found = (settingsQuery.data ?? []).find(s => s.configKey === 'marketplace.platform_fee_rate');
        const rate = found ? Number(found.configValue) : 0.1;
        return Number.isFinite(rate) ? (rate * 100).toFixed(1) : '10.0';
    })();

    const handleModerate = (provider: AdminProviderProfile, nextStatus: ProviderVerificationStatus) => {
        setLocalError(null);
        const checked = validateProviderModerationInput({
            status: nextStatus,
            rawFeePct: feePctById[provider.id],
            rawNote: noteById[provider.id] ?? provider.reviewNote ?? undefined,
        });
        if (!checked.ok) {
            setLocalError(
                checked.code === 'INVALID_FEE_RATE'
                    ? t('adminCommerce.marketplace.providers.errInvalidFee')
                    : t('adminCommerce.marketplace.providers.errNoteRequired'),
            );
            return;
        }
        moderate.mutate(
            {id: provider.id, payload: checked.payload},
            {
                onSuccess: () => {
                    toast.success(t('adminCommerce.marketplace.providers.moderatedToast', {name: provider.displayName}));
                },
            },
        );
    };

    const statusTabs: { value: ProviderVerificationStatus | ''; label: string; icon: React.ReactNode }[] = [
        {value: '', label: t('adminCommerce.marketplace.providerStatus.ALL'), icon: <Layers size={14} aria-hidden="true"/>},
        {value: 'DRAFT', label: t('adminCommerce.marketplace.providerStatus.DRAFT'), icon: <FileEdit size={14} aria-hidden="true"/>},
        {value: 'PENDING_REVIEW', label: t('adminCommerce.marketplace.providerStatus.PENDING_REVIEW'), icon: <Clock size={14} aria-hidden="true"/>},
        {value: 'VERIFIED', label: t('adminCommerce.marketplace.providerStatus.VERIFIED'), icon: <BadgeCheck size={14} aria-hidden="true"/>},
        {value: 'REJECTED', label: t('adminCommerce.marketplace.providerStatus.REJECTED'), icon: <XCircle size={14} aria-hidden="true"/>},
        {value: 'SUSPENDED', label: t('adminCommerce.marketplace.providerStatus.SUSPENDED'), icon: <PauseCircle size={14} aria-hidden="true"/>},
    ];

    return (
        <div className="space-y-4">
            <ProviderVerificationWorkflowCard activeStatus={status}/>
            <Card>
                <CardHeader className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <ShieldCheck size={20} className="shrink-0 text-primary" aria-hidden="true"/>
                                <span className="truncate">{t('adminCommerce.marketplace.providers.pageTitle')}</span>
                            </CardTitle>
                            <p className="m-0 mt-1 text-xs text-muted">
                                {t('adminCommerce.marketplace.providers.subtitle')}
                            </p>
                        </div>
                        <label className="relative w-full sm:w-64">
                            <span className="sr-only">{t('adminCommerce.marketplace.providers.searchAria')}</span>
                            <Search size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                            <input
                                type="search"
                                aria-label={t('adminCommerce.marketplace.providers.searchAria')}
                                value={keyword}
                                onChange={e => {
                                    setKeyword(e.target.value);
                                    setPage(0);
                                }}
                                placeholder={t('adminCommerce.marketplace.providers.searchPlaceholder')}
                                className="h-9 w-full rounded-control border border-border bg-card pr-3 pl-8 text-xs font-medium text-foreground"
                            />
                        </label>
                    </div>
                    <MarketplaceStatusTabs
                        ariaLabel={t('adminCommerce.marketplace.providers.filterAria')}
                        value={status}
                        items={statusTabs}
                        onChange={next => {
                            setStatus(next);
                            setPage(0);
                        }}
                    />
                </CardHeader>

                {(localError || moderate.isError) && (
                    <div className="px-5 pt-2">
                        <Alert variant="error" role="alert" className="text-xs">
                            {localError ??
                                (moderate.error instanceof Error
                                    ? moderate.error.message
                                    : t('adminCommerce.marketplace.providers.updateError'))}
                        </Alert>
                    </div>
                )}

                <CardContent className="p-0">
                    {query.isLoading ? (
                        <MarketplaceCardListSkeleton rows={3}/>
                    ) : query.isError ? (
                        <MarketplaceErrorPanel
                            message={t('adminCommerce.marketplace.providers.loadError')}
                            error={query.error}
                            onRetry={() => void query.refetch()}
                        />
                    ) : providers.length === 0 ? (
                        <MarketplaceEmptyPanel
                            icon={<Store size={20} aria-hidden="true"/>}
                            title={t('adminCommerce.marketplace.providers.emptyTitle')}
                            detail={
                                status || keyword.trim()
                                    ? t('adminCommerce.marketplace.providers.emptyFiltered')
                                    : t('adminCommerce.marketplace.providers.emptyDefault')
                            }
                            hasFilter={Boolean(status || keyword.trim())}
                            onClearFilter={() => {
                                setStatus('');
                                setKeyword('');
                                setPage(0);
                            }}
                            onRefresh={() => void query.refetch()}
                        />
                    ) : (
                        <div className={`divide-y divide-border transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
                            {providers.map(p => (
                                <ProviderModerationRow
                                    key={p.id}
                                    provider={p}
                                    defaultFeePct={configuredDefaultFeePct}
                                    noteValue={noteById[p.id] ?? p.reviewNote ?? ''}
                                    feeValue={
                                        feePctById[p.id] ??
                                        (p.commissionRateOverride != null ? String(Number(p.commissionRateOverride) * 100) : '')
                                    }
                                    canModerate={canModerate}
                                    isPending={moderate.isPending}
                                    onNoteChange={val => setNoteById(s => ({...s, [p.id]: val}))}
                                    onFeeChange={val => setFeePctById(s => ({...s, [p.id]: val}))}
                                    onInspect={() => setSelectedProviderId(p.id)}
                                    onOpenDoc={doc => void openDoc(doc, t('adminCommerce.marketplace.providers.docOpenError'))}
                                    onModerate={nextStatus => handleModerate(p, nextStatus)}
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

            {selectedProvider && (
                <ProviderKycDrawer
                    provider={selectedProvider}
                    defaultFeePct={configuredDefaultFeePct}
                    noteValue={noteById[selectedProvider.id] ?? selectedProvider.reviewNote ?? ''}
                    feeValue={
                        feePctById[selectedProvider.id] ??
                        (selectedProvider.commissionRateOverride != null
                            ? String(Number(selectedProvider.commissionRateOverride) * 100)
                            : '')
                    }
                    canModerate={canModerate}
                    isPending={moderate.isPending}
                    isModeratingDoc={moderateDoc.isPending}
                    onNoteChange={val => setNoteById(s => ({...s, [selectedProvider.id]: val}))}
                    onFeeChange={val => setFeePctById(s => ({...s, [selectedProvider.id]: val}))}
                    onModerate={nextStatus => handleModerate(selectedProvider, nextStatus)}
                    onModerateDoc={(doc, nextDocStatus) => {
                        const rawNote = (noteById[selectedProvider.id] ?? '').trim();
                        if (nextDocStatus === 'REJECTED' && !rawNote) {
                            setLocalError(t('adminCommerce.marketplace.providers.errNoteRequired'));
                            return;
                        }
                        setLocalError(null);
                        moderateDoc.mutate(
                            {
                                providerId: selectedProvider.id,
                                docId: doc.id,
                                status: nextDocStatus,
                                reviewerNote: rawNote || undefined,
                            },
                            {
                                onSuccess: () =>
                                    toast.success(
                                        t('adminCommerce.marketplace.providers.moderatedToast', {
                                            name: doc.title,
                                        }),
                                    ),
                            },
                        );
                    }}
                    onOpenDoc={doc => void openDoc(doc, t('adminCommerce.marketplace.providers.docOpenError'))}
                    onClose={() => setSelectedProviderId(null)}
                />
            )}
        </div>
    );
}
