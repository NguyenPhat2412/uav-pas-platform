'use client';

import {useState} from 'react';
import Link from 'next/link';
import {
    ClipboardList,
    Eye,
    FolderKanban,
    Layers,
    MapPin,
    RefreshCw,
    Search,
    User,
} from 'lucide-react';
import {Button, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {
    IllustrativeFooterNote,
    MarketplaceCardListSkeleton,
    MarketplaceEmptyPanel,
    MarketplaceErrorPanel,
    MarketplacePagination,
} from '@/components/marketplace/MarketplaceShared';
import {ProjectSubscriptionsDrawer} from '@/components/marketplace/ProjectSubscriptionsDrawer';
import {sanitizeMarketplaceText} from '@/forms/admin-marketplace-form';
import {useAdminCustomerProjects} from '@/hooks/useAdminMarketplace';
import {useI18n} from '@/providers/I18nContext';
import type {AdminCustomerProject, AdminProjectStatus} from '@/types/marketplace.types';

export function AdminMarketplaceProjects() {
    const {t} = useI18n();
    const [keyword, setKeyword] = useState('');
    const [province, setProvince] = useState('');
    const [status, setStatus] = useState<AdminProjectStatus | ''>('');
    const [page, setPage] = useState(0);
    const [selectedProject, setSelectedProject] = useState<AdminCustomerProject | null>(null);

    const query = useAdminCustomerProjects({
        keyword,
        province,
        status,
        page,
        size: 20,
    });
    const projects = query.data?.content ?? [];
    const totalElements = query.data?.totalElements ?? projects.length;
    const hasFilter = Boolean(keyword.trim() || province.trim() || status);

    const clearFilters = () => {
        setKeyword('');
        setProvince('');
        setStatus('');
        setPage(0);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <FolderKanban size={20} className="shrink-0 text-primary" aria-hidden="true"/>
                            <span className="truncate">{t('adminCommerce.marketplace.projects.pageTitle')}</span>
                        </CardTitle>
                        <p className="m-0 mt-1 text-xs text-muted">{t('adminCommerce.marketplace.projects.subtitle')}</p>
                    </div>
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
                </CardHeader>

                <CardContent className="border-t border-border px-5 py-3.5">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                        <div className="relative sm:col-span-2">
                            <Search
                                size={14}
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                aria-label={t('adminCommerce.marketplace.projects.searchPlaceholder')}
                                value={keyword}
                                onChange={e => {
                                    setKeyword(e.target.value);
                                    setPage(0);
                                }}
                                placeholder={t('adminCommerce.marketplace.projects.searchPlaceholder')}
                                className="h-9 w-full rounded-control border border-border-input bg-card pr-3 pl-8 text-xs"
                            />
                        </div>
                        <input
                            type="text"
                            aria-label={t('adminCommerce.marketplace.projects.provincePlaceholder')}
                            value={province}
                            onChange={e => {
                                setProvince(e.target.value);
                                setPage(0);
                            }}
                            placeholder={t('adminCommerce.marketplace.projects.provincePlaceholder')}
                            className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs"
                        />
                        <div className="flex items-center gap-2">
                            <select
                                aria-label={t('adminCommerce.marketplace.projects.statusFilter')}
                                value={status}
                                onChange={e => {
                                    setStatus(e.target.value as AdminProjectStatus | '');
                                    setPage(0);
                                }}
                                className="h-9 flex-1 rounded-control border border-border-input bg-card px-2.5 text-xs"
                            >
                                <option value="">{t('adminCommerce.marketplace.projects.statusAll')}</option>
                                <option value="ACTIVE">{t('adminCommerce.marketplace.projects.statusActive')}</option>
                                <option value="ARCHIVED">{t('adminCommerce.marketplace.projects.statusArchived')}</option>
                            </select>
                            {hasFilter && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={clearFilters}
                                    className="whitespace-nowrap"
                                >
                                    {t('adminCommerce.marketplace.clearFilter')}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>

                <CardContent className="p-0">
                    {query.isLoading ? (
                        <MarketplaceCardListSkeleton rows={4}/>
                    ) : query.isError ? (
                        <MarketplaceErrorPanel
                            message={t('adminCommerce.marketplace.projects.loadError')}
                            error={query.error}
                            onRetry={() => void query.refetch()}
                        />
                    ) : projects.length === 0 ? (
                        <MarketplaceEmptyPanel
                            icon={<FolderKanban size={24} aria-hidden="true"/>}
                            title={t('adminCommerce.marketplace.projects.emptyTitle')}
                            detail={t('adminCommerce.marketplace.projects.emptyDetail')}
                            hasFilter={hasFilter}
                            onClearFilter={clearFilters}
                            onRefresh={() => void query.refetch()}
                        />
                    ) : (
                        <>
                            <div className="divide-y divide-border">
                                {projects.map(project => {
                                    const customerDisplay =
                                        sanitizeMarketplaceText(project.customerFullName) ||
                                        project.customerUsername ||
                                        (project.customerId ? `#${project.customerId}` : '—');
                                    return (
                                        <article key={project.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-badge bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold whitespace-nowrap text-white">
                                                        {project.code}
                                                    </span>
                                                    <strong className="line-clamp-2 text-base font-semibold text-on-surface">
                                                        {sanitizeMarketplaceText(project.name)}
                                                    </strong>
                                                    <span
                                                        className={`rounded-badge px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                                            project.status === 'ACTIVE'
                                                                ? 'bg-slate-100 text-on-surface'
                                                                : 'bg-amber-100 text-amber-800'
                                                        }`}
                                                    >
                                                        {project.status === 'ACTIVE'
                                                            ? t('adminCommerce.marketplace.projects.statusActive')
                                                            : t('adminCommerce.marketplace.projects.statusArchived')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
                                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                        <User size={13} aria-hidden="true"/>
                                                        <strong className="text-on-surface">{customerDisplay}</strong>
                                                    </span>
                                                    {project.province && (
                                                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                            <MapPin size={13} aria-hidden="true"/>
                                                            <span>{project.province}</span>
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                        <Layers size={13} aria-hidden="true"/>
                                                        {t('adminCommerce.marketplace.projects.activeSubsBadge', {
                                                            count: project.activeSubscriptionCount ?? 0,
                                                        })}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                        <ClipboardList size={13} aria-hidden="true"/>
                                                        {t('adminCommerce.marketplace.projects.missionsBadge', {
                                                            count: project.missionCount ?? 0,
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link
                                                    href={`/admin/marketplace/orders?projectId=${project.id}`}
                                                    className="inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface-container-low px-3 text-xs font-semibold whitespace-nowrap text-on-surface transition-colors hover:border-slate-400"
                                                >
                                                    <ClipboardList size={13} aria-hidden="true"/>
                                                    {t('adminCommerce.marketplace.projects.viewOrdersBtn')}
                                                </Link>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    leftIcon={<Eye size={14} aria-hidden="true"/>}
                                                    onClick={() => setSelectedProject(project)}
                                                    className="whitespace-nowrap"
                                                >
                                                    {t('adminCommerce.marketplace.projects.inspectBtn')}
                                                </Button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                            <MarketplacePagination
                                page={page}
                                size={20}
                                totalElements={totalElements}
                                onPageChange={setPage}
                            />
                        </>
                    )}
                </CardContent>
            </Card>
            <IllustrativeFooterNote/>

            {selectedProject && (
                <ProjectSubscriptionsDrawer
                    project={selectedProject}
                    onClose={() => setSelectedProject(null)}
                />
            )}
        </div>
    );
}
