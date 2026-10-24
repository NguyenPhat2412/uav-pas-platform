'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {displayLabel, formatDate} from "@/components/shared/presentation";
import {PageGuard} from "@/components/customer/layout";
import {Button, Panel, Status} from "@/components/customer/ui";
import {useAuth} from '@/contexts/AuthContext';
import {useMissions} from "@/lib/query/customer";
import {missionListFilters, missionPageRange, missionStatuses, missionTypes} from "@/features/missions/forms/mission-form";
import type {MissionStatus, MissionType} from "@/types/customer";
import {toMissionSlug} from "@/lib/url-slugs";
import {useI18n} from '@/contexts/I18nContext';

export default function MissionsPage() {
    return <PageGuard><Missions/></PageGuard>;
}

function Missions() {
    const [filters, setFilters] = useState(missionListFilters('', ''));
    const [missionType, setMissionType] = useState<MissionType | ''>('');
    const [search, setSearch] = useState('');
    const {can} = useAuth();
    const {t} = useI18n();
    // Query only after typing pauses instead of on every keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(filters.search.trim()), 300);
        return () => clearTimeout(timer);
    }, [filters.search]);
    const query = useMissions(search, filters.page, filters.status || undefined, missionType || undefined);
    const filtered = !!(filters.search || filters.status || missionType);
    const page = query.data;
    const range = page ? missionPageRange(page) : undefined;
    const fieldClass = 'grid min-w-0 flex-1 gap-1.5 text-xs font-bold text-foreground sm:min-w-[140px]';
    const controlClass = 'min-h-10 w-full rounded-control border border-slate-300 bg-white px-3 py-2 text-base font-normal text-foreground sm:text-sm';
    return <>
        <Panel>
            <div className="-mx-4 -mt-4 mb-4 flex flex-col items-stretch gap-3 border-b border-slate-200 bg-slate-50/70 p-3.5 sm:flex-row sm:flex-wrap sm:items-end">
                <label className={fieldClass}><span>{t('missions.search')}</span><input className={controlClass} aria-label={t('missions.search')}
                                                                         placeholder={t('missions.searchPlaceholder')}
                                                                         value={filters.search}
                                                                         onChange={event => setFilters(missionListFilters(event.target.value, filters.status))}/></label>
                <label className={fieldClass}><span>{t('common.status')}</span><select className={controlClass} value={filters.status}
                                                                        onChange={event => setFilters(missionListFilters(filters.search, event.target.value as MissionStatus | ''))}>
                    <option value="">{t('missions.allStatuses')}</option>
                    {missionStatuses.map(status => <option key={status} value={status}>{displayLabel(status)}</option>)}
                </select></label>
                <label className={fieldClass}><span>{t('missions.type')}</span><select className={controlClass} value={missionType}
                                                                           onChange={event => {
                                                                               setMissionType(event.target.value as MissionType | '');
                                                                               setFilters(value => ({...value, page: 0}));
                                                                           }}>
                    <option value="">{t('missions.allTypes')}</option>
                    {missionTypes.map(type => <option key={type} value={type}>{displayLabel(type)}</option>)}
                </select></label>
                {filtered &&
                    <Button variant="secondary" onClick={() => {
                        setFilters(missionListFilters('', ''));
                        setMissionType('');
                    }}>{t('missions.clearFilters')}</Button>}
                {can('MISSION_CREATE') && <div className="sm:ml-auto"><Link className="inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-control bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover" href="/customer/missions/create">{t('missions.create')}</Link></div>}
            </div>
            {query.isError ? <div className="flex flex-wrap items-center gap-3 rounded-panel bg-red-50 px-3.5 py-3 text-xs text-danger" role="alert">{t('missions.loadError')} <Button variant="secondary"
                                                                                                 onClick={() => void query.refetch()}>{t('common.retry')}</Button></div>
                : query.isLoading ? <div className="px-6 py-9 text-center text-sm leading-relaxed text-muted" role="status">{t('missions.loading')}</div>
                    : <>
                        {!!range?.total &&
                            <p className="mb-3 text-xs text-muted" role="status">{t('missions.range', {first: range.first, last: range.last, total: range.total})}</p>}
                        {page?.content.length ? <div className="max-w-full overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="hidden sm:table-header-group">
                                <tr>
                                    <th className="border-b border-border bg-background px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-muted">{t('missions.code')}</th>
                                    <th className="border-b border-border bg-background px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-muted">{t('missions.titleColumn')}</th>
                                    <th className="border-b border-border bg-background px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-muted">{t('missions.time')}</th>
                                    <th className="border-b border-border bg-background px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-muted">{t('common.status')}</th>
                                </tr>
                                </thead>
                                <tbody className="block sm:table-row-group">{page.content.map(mission => <tr key={mission.id} className="group block border-b border-border py-3 last:border-b-0 hover:bg-background/60 sm:table-row sm:py-0">
                                    <td data-label={t('missions.code')} className="block border-0 py-1.5 align-middle text-sm text-foreground before:inline-block before:min-w-[90px] before:text-xs before:text-muted before:content-[attr(data-label)] sm:table-cell sm:border-b sm:border-border sm:px-3.5 sm:py-3.5 sm:before:hidden group-last:sm:border-b-0"><Link href={`/customer/missions/${toMissionSlug(mission)}`}
                                                              className="font-bold text-primary hover:underline">{mission.code}</Link></td>
                                    <td data-label={t('missions.titleColumn')} className="block border-0 py-1.5 align-middle text-sm text-foreground before:inline-block before:min-w-[90px] before:text-xs before:text-muted before:content-[attr(data-label)] sm:table-cell sm:border-b sm:border-border sm:px-3.5 sm:py-3.5 sm:before:hidden group-last:sm:border-b-0">{mission.title}</td>
                                    <td data-label={t('missions.time')} className="block border-0 py-1.5 align-middle text-sm text-foreground before:inline-block before:min-w-[90px] before:text-xs before:text-muted before:content-[attr(data-label)] sm:table-cell sm:border-b sm:border-border sm:px-3.5 sm:py-3.5 sm:before:hidden group-last:sm:border-b-0">{formatDate(mission.startTime)}</td>
                                    <td data-label={t('common.status')} className="block border-0 py-1.5 align-middle text-sm text-foreground before:inline-block before:min-w-[90px] before:text-xs before:text-muted before:content-[attr(data-label)] sm:table-cell sm:border-b sm:border-border sm:px-3.5 sm:py-3.5 sm:before:hidden group-last:sm:border-b-0"><Status value={mission.status}/></td>
                                </tr>)}</tbody>
                            </table>
                        </div> : <div
                            className="px-6 py-9 text-center text-sm leading-relaxed text-muted">{filters.page > 0 ? t('missions.emptyPage') : filtered ? t('missions.emptyFiltered') : t('missions.empty')}</div>}
                        {page && (page.totalPages > 1 || filters.page > 0) &&
                            <nav className="mt-6 flex flex-wrap items-center justify-center gap-3 px-4 py-4 text-sm sm:gap-4" aria-label={t('missions.pagination')}>
                                <Button variant="secondary" disabled={filters.page === 0 || query.isFetching}
                                        onClick={() => setFilters(value => ({
                                            ...value,
                                            page: Math.max(0, value.page - 1)
                                        }))}>{t('missions.prevPage')}</Button>
                                <span
                                    aria-live="polite" className="order-first basis-full text-center sm:order-none sm:basis-auto">{t('missions.pageOf', {page: page.page + 1, total: Math.max(page.totalPages, page.page + 1)})}</span>
                                <Button variant="secondary" disabled={!page.hasNext || query.isFetching}
                                        onClick={() => setFilters(value => ({...value, page: value.page + 1}))}>{t('missions.nextPage')}</Button>
                                {!page.content.length && filters.page > 0 && <Button variant="secondary"
                                                                                     onClick={() => setFilters(value => ({
                                                                                         ...value,
                                                                                         page: 0
                                                                                     }))}>{t('missions.firstPage')}</Button>}
                            </nav>}
                    </>}
        </Panel>
    </>;
}
