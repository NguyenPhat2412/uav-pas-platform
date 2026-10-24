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
    return <>
        <div className="page-heading">
            <div><h1>{t('missions.title')}</h1><p>{t('missions.subtitle')}</p></div>
            {can('MISSION_CREATE') &&
                <Link className="button button-primary" href="/customer/missions/create">{t('missions.create')}</Link>}</div>
        <Panel>
            <div className="filter-row">
                <label className="field"><span>{t('missions.search')}</span><input className="mission-search" aria-label={t('missions.search')}
                                                                         placeholder={t('missions.searchPlaceholder')}
                                                                         value={filters.search}
                                                                         onChange={event => setFilters(missionListFilters(event.target.value, filters.status))}/></label>
                <label className="field"><span>{t('common.status')}</span><select value={filters.status}
                                                                        onChange={event => setFilters(missionListFilters(filters.search, event.target.value as MissionStatus | ''))}>
                    <option value="">{t('missions.allStatuses')}</option>
                    {missionStatuses.map(status => <option key={status} value={status}>{displayLabel(status)}</option>)}
                </select></label>
                <label className="field"><span>{t('missions.type')}</span><select value={missionType}
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
            </div>
            {query.isError ? <div className="error" role="alert">{t('missions.loadError')} <Button variant="secondary"
                                                                                                 onClick={() => void query.refetch()}>{t('common.retry')}</Button></div>
                : query.isLoading ? <div className="empty" role="status">{t('missions.loading')}</div>
                    : <>
                        {!!range?.total &&
                            <p className="muted" role="status">{t('missions.range', {first: range.first, last: range.last, total: range.total})}</p>}
                        {page?.content.length ? <div className="table-wrap">
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>{t('missions.code')}</th>
                                    <th>{t('missions.titleColumn')}</th>
                                    <th>{t('missions.time')}</th>
                                    <th>{t('common.status')}</th>
                                </tr>
                                </thead>
                                <tbody>{page.content.map(mission => <tr key={mission.id}>
                                    <td data-label={t('missions.code')}><Link href={`/customer/missions/${mission.id}`}
                                                              className="button-link">{mission.code}</Link></td>
                                    <td data-label={t('missions.titleColumn')}>{mission.title}</td>
                                    <td data-label={t('missions.time')}>{formatDate(mission.startTime)}</td>
                                    <td data-label={t('common.status')}><Status value={mission.status}/></td>
                                </tr>)}</tbody>
                            </table>
                        </div> : <div
                            className="empty">{filters.page > 0 ? t('missions.emptyPage') : filtered ? t('missions.emptyFiltered') : t('missions.empty')}</div>}
                        {page && (page.totalPages > 1 || filters.page > 0) &&
                            <nav className="pagination" aria-label={t('missions.pagination')}>
                                <Button variant="secondary" disabled={filters.page === 0 || query.isFetching}
                                        onClick={() => setFilters(value => ({
                                            ...value,
                                            page: Math.max(0, value.page - 1)
                                        }))}>{t('missions.prevPage')}</Button>
                                <span
                                    aria-live="polite">{t('missions.pageOf', {page: page.page + 1, total: Math.max(page.totalPages, page.page + 1)})}</span>
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
