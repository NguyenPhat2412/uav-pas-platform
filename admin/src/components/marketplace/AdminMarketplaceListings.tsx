'use client';

import {useState} from 'react';
import {Boxes, CheckCircle2, Clock, Layers, PauseCircle, Search, XCircle} from 'lucide-react';
import {Alert, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {
    MarketplaceCardListSkeleton,
    MarketplaceEmptyPanel,
    MarketplaceErrorPanel,
    MarketplacePagination,
    MarketplaceStatusTabs,
} from '@/components/marketplace/MarketplaceShared';
import {ListingModerationDrawer} from '@/components/marketplace/ListingModerationDrawer';
import {ListingModerationRow} from '@/components/marketplace/ListingModerationRow';
import {useAdminListings, useModerateListing} from '@/hooks/marketplace/useAdminMarketplace';
import {validateListingModerationInput} from '@/forms/marketplace/admin-marketplace-form';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {AdminMarketplaceListing, ListingModerationStatus} from '@/types/marketplace/marketplace.types';

export function AdminMarketplaceListings() {
    const {t} = useI18n();
    const {can} = useAuth();
    const canModerate = can('MARKETPLACE_MODERATE');

    const [status, setStatus] = useState<ListingModerationStatus | ''>('');
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(0);
    const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
    const [noteById, setNoteById] = useState<Record<number, string>>({});
    const [featuredById, setFeaturedById] = useState<Record<number, boolean>>({});
    const [localError, setLocalError] = useState<string | null>(null);

    const query = useAdminListings(status, keyword, page);
    const moderate = useModerateListing();
    const listings = query.data?.content ?? [];
    const selectedListing: AdminMarketplaceListing | null =
        listings.find(item => item.id === selectedListingId) ?? null;

    const handleModerate = (item: AdminMarketplaceListing, nextStatus: ListingModerationStatus) => {
        setLocalError(null);
        const checked = validateListingModerationInput({
            status: nextStatus,
            rawNote: noteById[item.id] ?? item.moderationNote ?? undefined,
            featured: featuredById[item.id] ?? item.featured,
        });
        if (!checked.ok) {
            setLocalError(t('adminCommerce.marketplace.listings.errNoteRequired'));
            return;
        }
        moderate.mutate(
            {id: item.id, payload: checked.payload},
            {
                onSuccess: () => {
                    toast.success(t('adminCommerce.marketplace.listings.moderatedToast', {title: item.title}));
                },
            },
        );
    };

    const statusTabs: { value: ListingModerationStatus | ''; label: string; icon: React.ReactNode }[] = [
        {value: '', label: t('adminCommerce.marketplace.listingStatus.ALL'), icon: <Layers size={14} aria-hidden="true"/>},
        {value: 'PENDING_REVIEW', label: t('adminCommerce.marketplace.listingStatus.PENDING_REVIEW'), icon: <Clock size={14} aria-hidden="true"/>},
        {value: 'PUBLISHED', label: t('adminCommerce.marketplace.listingStatus.PUBLISHED'), icon: <CheckCircle2 size={14} aria-hidden="true"/>},
        {value: 'PAUSED', label: t('adminCommerce.marketplace.listingStatus.PAUSED'), icon: <PauseCircle size={14} aria-hidden="true"/>},
        {value: 'REJECTED', label: t('adminCommerce.marketplace.listingStatus.REJECTED'), icon: <XCircle size={14} aria-hidden="true"/>},
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <Boxes size={20} className="shrink-0 text-primary" aria-hidden="true"/>
                                <span className="truncate">{t('adminCommerce.marketplace.listings.pageTitle')}</span>
                            </CardTitle>
                            <p className="m-0 mt-1 text-xs text-muted">
                                {t('adminCommerce.marketplace.listings.subtitle')}
                            </p>
                        </div>
                        <label className="relative w-full sm:w-64">
                            <span className="sr-only">{t('adminCommerce.marketplace.listings.searchAria')}</span>
                            <Search size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                            <input
                                type="search"
                                aria-label={t('adminCommerce.marketplace.listings.searchAria')}
                                value={keyword}
                                onChange={e => {
                                    setKeyword(e.target.value);
                                    setPage(0);
                                }}
                                placeholder={t('adminCommerce.marketplace.listings.searchPlaceholder')}
                                className="h-9 w-full rounded-control border border-border bg-card pr-3 pl-8 text-xs font-medium text-foreground"
                            />
                        </label>
                    </div>
                    <MarketplaceStatusTabs
                        ariaLabel={t('adminCommerce.marketplace.listings.filterAria')}
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
                                    : t('adminCommerce.marketplace.listings.updateError'))}
                        </Alert>
                    </div>
                )}

                <CardContent className="p-0">
                    {query.isLoading ? (
                        <MarketplaceCardListSkeleton rows={3}/>
                    ) : query.isError ? (
                        <MarketplaceErrorPanel
                            message={t('adminCommerce.marketplace.listings.loadError')}
                            error={query.error}
                            onRetry={() => void query.refetch()}
                        />
                    ) : listings.length === 0 ? (
                        <MarketplaceEmptyPanel
                            icon={<Boxes size={20} aria-hidden="true"/>}
                            title={t('adminCommerce.marketplace.listings.emptyTitle')}
                            detail={
                                status || keyword.trim()
                                    ? t('adminCommerce.marketplace.listings.emptyFiltered')
                                    : t('adminCommerce.marketplace.listings.emptyDefault')
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
                            {listings.map(item => (
                                <ListingModerationRow
                                    key={item.id}
                                    item={item}
                                    noteValue={noteById[item.id] ?? item.moderationNote ?? ''}
                                    isFeatured={featuredById[item.id] ?? item.featured}
                                    canModerate={canModerate}
                                    isPending={moderate.isPending}
                                    onNoteChange={val => setNoteById(s => ({...s, [item.id]: val}))}
                                    onFeaturedChange={val => setFeaturedById(s => ({...s, [item.id]: val}))}
                                    onInspect={() => setSelectedListingId(item.id)}
                                    onModerate={nextStatus => handleModerate(item, nextStatus)}
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

            {selectedListing && (
                <ListingModerationDrawer
                    listing={selectedListing}
                    noteValue={noteById[selectedListing.id] ?? selectedListing.moderationNote ?? ''}
                    isFeatured={featuredById[selectedListing.id] ?? selectedListing.featured}
                    canModerate={canModerate}
                    isPending={moderate.isPending}
                    onNoteChange={val => setNoteById(s => ({...s, [selectedListing.id]: val}))}
                    onFeaturedChange={val => setFeaturedById(s => ({...s, [selectedListing.id]: val}))}
                    onModerate={nextStatus => handleModerate(selectedListing, nextStatus)}
                    onClose={() => setSelectedListingId(null)}
                />
            )}
        </div>
    );
}
