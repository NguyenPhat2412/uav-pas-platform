'use client';

import Link from 'next/link';
import {CalendarClock, MapPin, Plus, RefreshCw} from 'lucide-react';
import {Button, Card, CardContent, CardHeader, CardTitle, Input, Spinner} from '@/components/ui';
import {displayLabel} from "@/components/shared/presentation";
import {Mission} from "@/features/missions/types/mission.types";
import {MissionStatusBadge} from "@/features/missions/components/MissionStatusBadge";
import {useI18n} from '@/contexts/I18nContext';

export function MissionList({
                                missions,
                                loading,
                                error,
                                search,
                                setSearch,
                                onRefresh,
                                title,
                                allowCreate = true
                            }: {
    missions: Mission[];
    loading: boolean;
    error: string | null;
    search: string;
    setSearch: (value: string) => void;
    onRefresh: () => void;
    title?: string;
    allowCreate?: boolean
}) {
    const {t, formatDate} = useI18n();
    return <Card className="mission-list">
        <CardHeader
            className="border-b border-slate-100 flex-row flex-wrap items-center justify-between gap-4"><CardTitle>{title ?? t('opsMissions.list.myMissions')}</CardTitle>
            <div className="mission-list-tools"><Input aria-label={t('opsMissions.list.search')} placeholder={t('opsMissions.list.searchPlaceholder')}
                                                       value={search}
                                                       onChange={(event) => setSearch(event.target.value)}/><Button
                size="sm" variant="outline" onClick={onRefresh} leftIcon={<RefreshCw size={15}/>}>{t('opsMissions.list.refresh')}</Button>{allowCreate &&
                <Link href="/operations/missions/create"><Button size="sm" leftIcon={<Plus size={15}/>}>{t('opsMissions.list.create')}</Button></Link>}</div>
        </CardHeader>
        <CardContent className="p-0">{loading ?
            <div className="min-h-48 flex items-center justify-center"><Spinner size="lg"/></div> : error ?
                <p className="p-6 text-error">{error}</p> : missions.length === 0 ?
                    <p className="p-8 text-center text-secondary">{t('opsMissions.list.empty')}</p> :
                    <div className="divide-y divide-slate-100">{missions.map((mission) => <Link key={mission.id}
                                                                                                href={`/operations/missions/${mission.id}`}
                                                                                                className="mission-list-item block p-5 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div><p className="text-xs font-semibold text-primary">{mission.code}</p><h3
                                className="font-semibold text-lg">{mission.title}</h3></div>
                            <MissionStatusBadge status={mission.status}/></div>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-secondary"><span
                            className="inline-flex items-center gap-1"><CalendarClock
                            size={15}/>{formatDate(mission.startTime, {dateStyle: 'short', timeStyle: 'medium'})}</span><span
                            className="inline-flex items-center gap-1"><MapPin
                            size={15}/>{mission.locationName}</span><span>{displayLabel(mission.missionType)}</span>
                        </div>
                    </Link>)}</div>}</CardContent>
    </Card>;
}
