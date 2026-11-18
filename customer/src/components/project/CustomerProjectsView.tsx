'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {FolderKanban, MapPin, Pencil, Plus, Search, Trash2} from 'lucide-react';
import {PageGuard} from '@/components/customer/CustomerLayout';
import {Status} from '@/components/customer/CustomerUi';
import {ProjectSubscriptionsSection} from '@/components/project/ProjectSubscriptionsSection';
import {ProjectUpsertDialog} from '@/components/project/ProjectUpsertDialog';
import {IllustratedEmptyState} from '@/components/shared/IllustratedEmptyState';
import {Alert, Button} from '@/components/ui';
import {extractActionableError} from '@/forms/marketplace/marketplace-forms';
import {useMissions} from '@/hooks/mission/useCustomerMissions';
import {useCustomerProjects, useProjectActions} from '@/hooks/project/useCustomerProjects';
import {ApiError} from '@/lib/api';
import {formatShortDate} from '@/lib/format';
import {toMissionSlug} from '@/lib/url-slugs';
import {useI18n} from '@/providers/I18nContext';
import type {CustomerProject} from '@/types/project/project.types';

export default function CustomerProjectsPage() {
    return (
        <PageGuard>
            <CustomerProjectsView/>
        </PageGuard>
    );
}

function CustomerProjectsView() {
    const {t, formatDate} = useI18n();
    const searchParams = useSearchParams();
    const paramProjectId = Number(searchParams.get('project') || '');

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [selectedId, setSelectedId] = useState<number | null>(
        Number.isFinite(paramProjectId) && paramProjectId > 0 ? paramProjectId : null,
    );
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<CustomerProject | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const projectsQuery = useCustomerProjects(page, search, 20);
    const actions = useProjectActions();
    const projects = projectsQuery.data?.content ?? [];
    const activeProject = projects.find(p => p.id === selectedId) ?? projects[0] ?? null;

    const projectOrdersQuery = useMissions('', 0, undefined, undefined, {
        projectId: activeProject?.id ?? null,
    });
    const projectOrders = activeProject ? projectOrdersQuery.data?.content ?? [] : [];

    const handleDelete = async (id: number) => {
        setDeleteError(null);
        try {
            await actions.deleteProject.mutateAsync(id);
            setConfirmDeleteId(null);
            if (selectedId === id) setSelectedId(null);
        } catch (err) {
            setDeleteError(extractActionableError(err, t('missionDetail.actionFailed')));
        }
    };

    const openCreate = () => {
        setEditingProject(null);
        setDialogOpen(true);
    };

    return (
        <div className="flex flex-1 flex-col gap-4 bg-background p-3.5 sm:p-5">
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-slate-200 bg-card p-4">
                <div className="min-w-0 space-y-0.5">
                    <h1 className="m-0 truncate text-xl font-bold text-slate-900">{t('marketplaceShop.projectsTitle')}</h1>
                    <p className="m-0 text-xs text-slate-500">{t('marketplaceShop.projectsSubtitle')}</p>
                </div>
                <Button type="button" leftIcon={<Plus size={16}/>} onClick={openCreate} className="min-h-11 whitespace-nowrap">
                    {t('marketplaceShop.newProjectBtn')}
                </Button>
            </header>

            {deleteError && <Alert variant="error" role="alert" className="text-xs">{deleteError}</Alert>}

            {projectsQuery.isLoading ? (
                <div role="status" aria-busy="true" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="space-y-2.5 lg:col-span-4">
                        {[0, 1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-panel bg-slate-100"/>)}
                    </div>
                    <div className="h-72 animate-pulse rounded-panel bg-slate-100 lg:col-span-8"/>
                </div>
            ) : projectsQuery.isError ? (
                <Alert variant="error" role="alert" className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                        {projectsQuery.error instanceof ApiError && projectsQuery.error.status === 404
                            ? t('marketplaceShop.bookingApiUnavailable')
                            : t('errorPage.detail')}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void projectsQuery.refetch()}>
                        {t('common.retry')}
                    </Button>
                </Alert>
            ) : projects.length === 0 ? (
                <div className="rounded-panel border border-slate-200 bg-card">
                    <IllustratedEmptyState
                        imageSrc="/images/process/step-02-gis-planning.webp"
                        imageAlt={t('marketplaceShop.emptyProjectsTitle')}
                        icon={FolderKanban}
                        title={t('marketplaceShop.emptyProjectsTitle')}
                        description={t('marketplaceShop.emptyProjectsDesc')}
                        action={
                            <Button type="button" leftIcon={<Plus size={15}/>} onClick={openCreate} className="min-h-11 whitespace-nowrap">
                                {t('marketplaceShop.emptyProjectsFirstCta')}
                            </Button>
                        }
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* Project Selector List */}
                    <aside className="space-y-2.5 lg:col-span-4">
                        <label className="relative block">
                            <span className="sr-only">{t('common.search')}</span>
                            <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                            <input
                                type="search"
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setPage(0);
                                }}
                                placeholder={t('common.search')}
                                className="h-10 w-full rounded-control border border-slate-200 bg-card pr-3 pl-9 text-xs text-slate-900 outline-none focus:border-primary"
                            />
                        </label>
                        <div className="grid gap-2">
                            {projects.map(proj => {
                                const selected = activeProject?.id === proj.id;
                                return (
                                    <button
                                        key={proj.id}
                                        type="button"
                                        onClick={() => setSelectedId(proj.id)}
                                        className={`flex w-full cursor-pointer flex-col gap-1 rounded-panel border p-3.5 text-left transition-colors ${
                                            selected
                                                ? 'border-primary bg-uav-red-light/50'
                                                : 'border-slate-200 bg-card hover:bg-slate-50'
                                        }`}
                                    >
                                        <strong className="line-clamp-2 text-sm font-semibold text-slate-900">
                                            {proj.name}
                                        </strong>
                                        <span className="inline-flex items-center gap-1 truncate whitespace-nowrap text-xs text-slate-500">
                                            <MapPin size={12} aria-hidden="true"/>
                                            {proj.province}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Active Project Workspace */}
                    {activeProject && (
                        <div className="space-y-4 lg:col-span-8">
                            <section className="rounded-panel border border-slate-200 bg-card p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 space-y-1">
                                        <h2 className="m-0 line-clamp-2 text-lg font-bold text-slate-900">
                                            {activeProject.name}
                                        </h2>
                                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                            <MapPin size={13} className="text-primary" aria-hidden="true"/>
                                            {activeProject.province}
                                        </span>
                                        {activeProject.note && (
                                            <p className="m-0 pt-1 text-xs leading-relaxed text-slate-600">
                                                {activeProject.note}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            leftIcon={<Pencil size={13}/>}
                                            onClick={() => {
                                                setEditingProject(activeProject);
                                                setDialogOpen(true);
                                            }}
                                            className="whitespace-nowrap"
                                        >
                                            {t('marketplaceShop.editProjectBtn')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="danger"
                                            size="sm"
                                            leftIcon={<Trash2 size={13}/>}
                                            onClick={() => setConfirmDeleteId(activeProject.id)}
                                            className="whitespace-nowrap"
                                        >
                                            {t('marketplaceShop.deleteProjectBtn')}
                                        </Button>
                                    </div>
                                </div>

                                {confirmDeleteId === activeProject.id && (
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-rose-200 bg-rose-50 p-3 text-xs text-danger">
                                        <span>{t('marketplaceShop.confirmDeleteProject')}</span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setConfirmDeleteId(null)}
                                            >
                                                {t('common.cancel')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="danger"
                                                size="sm"
                                                isLoading={actions.deleteProject.isPending}
                                                onClick={() => void handleDelete(activeProject.id)}
                                            >
                                                {t('marketplaceShop.deleteProjectBtn')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <ProjectSubscriptionsSection projectId={activeProject.id}/>

                            {/* Orders under this Project */}
                            <section className="space-y-3 rounded-panel border border-slate-200 bg-card p-4">
                                <h3 className="m-0 whitespace-nowrap text-sm font-bold text-slate-900">
                                    {t('marketplaceShop.projectOrdersTitle')} ({projectOrders.length})
                                </h3>
                                {projectOrdersQuery.isLoading ? (
                                    <div className="h-16 animate-pulse rounded-control bg-slate-100"/>
                                ) : projectOrders.length === 0 ? (
                                    <p className="m-0 py-3 text-center text-xs text-slate-500">
                                        {t('marketplaceShop.emptyProjectOrders')}
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {projectOrders.map(mission => (
                                            <Link
                                                key={mission.id}
                                                href={`/customer/missions/${toMissionSlug(mission)}`}
                                                className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-slate-50"
                                            >
                                                <div className="min-w-0">
                                                    <strong className="block truncate text-xs font-bold text-primary tabular-nums">
                                                        {mission.code}
                                                    </strong>
                                                    <span className="block truncate text-sm font-medium text-slate-900">
                                                        {mission.title}
                                                    </span>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <span className="hidden whitespace-nowrap text-xs text-slate-500 tabular-nums sm:inline">
                                                        {formatShortDate(mission.startTime, formatDate)}
                                                    </span>
                                                    <Status value={mission.status}/>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            )}

            <ProjectUpsertDialog
                key={editingProject?.id ?? 'create'}
                open={dialogOpen}
                editingProject={editingProject}
                onClose={() => setDialogOpen(false)}
                onSaved={saved => setSelectedId(saved.id)}
            />
        </div>
    );
}
