'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {FolderOpen, PackageSearch, Plus, RotateCcw, Search} from 'lucide-react';
import {PageGuard} from '@/components/customer/CustomerLayout';
import {Button, Status} from '@/components/customer/CustomerUi';
import {LoadingRows} from '@/components/data/WorkspaceState';
import {OrderStatusBar} from '@/components/mission/customer/OrderStatusBar';
import {IllustratedEmptyState} from '@/components/shared/IllustratedEmptyState';
import {formatVndCompact} from '@/forms/marketplace-forms';
import {missionListFilters, missionPageRange} from '@/forms/mission-form';
import {mapMissionToOrderStatusGroup, ORDER_STATUS_GROUPS} from '@/forms/project-form';
import {useMissionActions, useMissions} from '@/hooks/useCustomerMissions';
import {useCustomerProjects, useOrderRealtimeSync} from '@/hooks/useCustomerProjects';
import {formatDate} from '@/lib/presentation';
import {toMissionSlug} from '@/lib/url-slugs';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import type {OrderStatusGroup} from '@/types/project.types';

export default function MissionsPage() {
    return (
        <PageGuard>
            <Missions/>
        </PageGuard>
    );
}

function Missions() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialGroup = (searchParams.get('group') || '') as OrderStatusGroup | '';
    const validInitialGroup = ORDER_STATUS_GROUPS.includes(initialGroup as OrderStatusGroup) ? initialGroup : '';

    const actions = useMissionActions();
    const {can} = useAuth();
    const {t} = useI18n();
    useOrderRealtimeSync();

    const [cloningId, setCloningId] = useState<number | null>(null);
    const [filters, setFilters] = useState(missionListFilters('', ''));
    const [statusGroup, setStatusGroup] = useState<OrderStatusGroup | ''>(validInitialGroup);
    const [projectId, setProjectId] = useState<number | ''>('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setSearch(filters.search.trim()), 300);
        return () => clearTimeout(timer);
    }, [filters.search]);

    const projectsQuery = useCustomerProjects(0, '', 50);
    const projects = projectsQuery.data?.content ?? [];

    const query = useMissions(search, filters.page, undefined, undefined, {
        projectId: projectId === '' ? null : projectId,
        statusGroup,
    });

    const page = query.data;
    const rawItems = page?.content ?? [];
    const items = statusGroup
        ? rawItems.filter(m => mapMissionToOrderStatusGroup(m) === statusGroup)
        : rawItems;
    const range = page ? missionPageRange(page) : undefined;
    const filtered = Boolean(filters.search || statusGroup || projectId !== '');

    const resetFilters = () => {
        setFilters(missionListFilters('', ''));
        setStatusGroup('');
        setProjectId('');
    };

    return (
        <div className="flex flex-1 flex-col gap-4 bg-background p-3.5 sm:p-5">
            {/* Shopee-style 5 Status Icon Strip */}
            <OrderStatusBar
                showAllTab
                activeGroup={statusGroup}
                onSelectGroup={next => {
                    setStatusGroup(next);
                    setFilters(v => ({...v, page: 0}));
                }}
            />

            {/* Search + Project Filter + Book Service CTA */}
            <div className="flex flex-wrap items-center gap-2.5 rounded-panel border border-slate-200 bg-card p-3">
                <label className="relative min-w-[200px] flex-1">
                    <span className="sr-only">{t('missions.search')}</span>
                    <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                    <input
                        type="search"
                        aria-label={t('missions.search')}
                        placeholder={t('missions.searchPlaceholder')}
                        value={filters.search}
                        onChange={e => setFilters(missionListFilters(e.target.value, filters.status))}
                        className="h-10 w-full rounded-control border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-primary"
                    />
                </label>

                {projects.length > 0 && (
                    <select
                        value={projectId}
                        aria-label={t('marketplaceShop.filterByProject')}
                        onChange={e => {
                            setProjectId(e.target.value ? Number(e.target.value) : '');
                            setFilters(v => ({...v, page: 0}));
                        }}
                        className="h-10 rounded-control border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-primary"
                    >
                        <option value="">{t('marketplaceShop.allProjects')}</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                )}

                {filtered && (
                    <Button variant="secondary" onClick={resetFilters}>
                        <RotateCcw size={13} className="mr-1 inline" aria-hidden="true"/>
                        {t('missions.clearFilters')}
                    </Button>
                )}

                {can('MISSION_CREATE') && (
                    <Link
                        href="/customer/services"
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control bg-primary px-4 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                        <Plus size={14} aria-hidden="true"/>
                        <span>{t('marketplaceShop.subscribeForProject')}</span>
                    </Link>
                )}
            </div>

            {/* List Body */}
            <div className="overflow-hidden rounded-panel border border-slate-200 bg-card">
                {query.isError ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-rose-50 px-4 py-3 text-xs text-danger" role="alert">
                        <span>{t('missions.loadError')}</span>
                        <Button variant="secondary" onClick={() => void query.refetch()}>
                            {t('common.retry')}
                        </Button>
                    </div>
                ) : query.isLoading ? (
                    <LoadingRows/>
                ) : items.length === 0 ? (
                    <IllustratedEmptyState
                        imageSrc="/images/hero-slides/uav-hero-1.webp"
                        imageAlt={t('marketplaceShop.emptyOrdersTitle')}
                        icon={PackageSearch}
                        title={filtered ? t('missions.emptyFiltered') : t('marketplaceShop.emptyOrdersTitle')}
                        description={filtered ? t('marketplaceShop.emptyCatalogDesc') : t('marketplaceShop.emptyOrdersDesc')}
                        action={
                            filtered ? (
                                <Button variant="secondary" onClick={resetFilters}>
                                    <RotateCcw size={13} className="mr-1 inline" aria-hidden="true"/>
                                    {t('missions.clearFilters')}
                                </Button>
                            ) : (
                                <Link
                                    href="/customer/services"
                                    className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                                >
                                    {t('marketplaceShop.exploreCatalog')}
                                </Link>
                            )
                        }
                    />
                ) : (
                    <>
                        {!!range?.total && (
                            <div className="border-b border-slate-100 px-4 py-2 text-xs font-medium text-muted tabular-nums" role="status">
                                {t('missions.range', {first: range.first, last: range.last, total: range.total})}
                            </div>
                        )}
                        <div
                            className={`divide-y divide-slate-100 transition-opacity duration-150 ${
                                query.isPlaceholderData ? 'opacity-65' : 'opacity-100'
                            }`}
                        >
                            {items.map(mission => {
                                const slugHref = `/customer/missions/${toMissionSlug(mission)}`;
                                return (
                                    <article key={mission.id} className="flex flex-col gap-2.5 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link href={slugHref} className="text-xs font-bold whitespace-nowrap text-primary tabular-nums hover:underline">
                                                    {mission.code}
                                                </Link>
                                                <Status value={mission.status}/>
                                                {mission.projectName && (
                                                    <span className="inline-flex items-center gap-1 rounded-badge bg-slate-100 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-slate-700">
                                                        <FolderOpen size={11} aria-hidden="true"/>
                                                        <span className="max-w-[160px] truncate">{mission.projectName}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <Link href={slugHref} className="block line-clamp-2 text-sm font-semibold text-slate-900 hover:text-primary">
                                                {mission.title}
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 tabular-nums">
                                                <span className="whitespace-nowrap">{formatDate(mission.startTime)}</span>
                                                {mission.quotedSubtotalVnd != null && (
                                                    <span className="font-bold whitespace-nowrap text-primary">
                                                        {formatVndCompact(mission.quotedSubtotalVnd)} · {t('marketplaceShop.illustrative')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            <Link
                                                href={slugHref}
                                                className="inline-flex min-h-9 items-center justify-center rounded-control bg-primary px-3.5 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                                            >
                                                {t('marketplaceShop.homeViewDetails')}
                                            </Link>
                                            {can('MISSION_CREATE') && (
                                                <Button
                                                    variant="secondary"
                                                    disabled={cloningId !== null}
                                                    onClick={async () => {
                                                        setCloningId(mission.id);
                                                        const cloned = await actions.clone.mutateAsync(mission.id).catch(() => null);
                                                        setCloningId(null);
                                                        if (cloned) router.push(`/customer/missions/${toMissionSlug(cloned)}`);
                                                    }}
                                                >
                                                    {cloningId === mission.id ? t('capabilities.clone.cloning') : t('capabilities.clone.action')}
                                                </Button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}

                {page && (page.totalPages > 1 || filters.page > 0) && (
                    <nav className="flex items-center justify-center gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs tabular-nums" aria-label={t('missions.pagination')}>
                        <Button
                            variant="secondary"
                            disabled={filters.page === 0 || query.isFetching}
                            onClick={() => setFilters(v => ({...v, page: Math.max(0, v.page - 1)}))}
                        >
                            {t('missions.prevPage')}
                        </Button>
                        <span aria-live="polite" className="whitespace-nowrap font-semibold text-slate-600">
                            {t('missions.pageOf', {page: page.page + 1, total: Math.max(page.totalPages, page.page + 1)})}
                        </span>
                        <Button
                            variant="secondary"
                            disabled={!page.hasNext || query.isFetching}
                            onClick={() => setFilters(v => ({...v, page: v.page + 1}))}
                        >
                            {t('missions.nextPage')}
                        </Button>
                    </nav>
                )}
            </div>
        </div>
    );
}
