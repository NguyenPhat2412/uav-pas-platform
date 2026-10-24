'use client';

import Link from 'next/link';
import {CalendarClock, MapPin, Plus, RefreshCw} from 'lucide-react';
import {Button, Card, CardContent, CardHeader, CardTitle, Input, Spinner} from '@/components/ui';
import {displayLabel} from "@/components/shared/presentation";
import {Mission} from "@/features/missions/types/mission.types";
import {MissionStatusBadge} from "@/features/missions/components/MissionStatusBadge";
import {toMissionSlug} from "@/lib/url-slugs";
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
    return <Card className="overflow-hidden">
        <CardHeader
            className="flex-row flex-wrap items-center justify-between gap-4 border-b border-border"><CardTitle>{title ?? t('opsMissions.list.myMissions')}</CardTitle>
            <div className="flex max-w-xl flex-1 flex-wrap items-center gap-2.5 [&>*:first-child]:min-w-[180px] [&>*:first-child]:flex-1"><Input aria-label={t('opsMissions.list.search')} placeholder={t('opsMissions.list.searchPlaceholder')}
                                                       value={search}
                                                       onChange={(event) => setSearch(event.target.value)}/><Button
                size="sm" variant="outline" onClick={onRefresh} leftIcon={<RefreshCw size={15}/>}>{t('opsMissions.list.refresh')}</Button>{allowCreate &&
                <Link href="/operations/missions/create"><Button size="sm" leftIcon={<Plus size={15}/>}>{t('opsMissions.list.create')}</Button></Link>}</div>
        </CardHeader>
        <CardContent className="p-0">{loading ?
            <div className="flex min-h-48 items-center justify-center"><Spinner size="lg"/></div> : error ?
                <p className="p-6 text-danger">{error}</p> : missions.length === 0 ?
                    <p className="p-8 text-center text-muted">{t('opsMissions.list.empty')}</p> :
                    <div className="divide-y divide-border">{missions.map((mission) => <Link key={mission.id}
                                                                                                href={`/operations/missions/${toMissionSlug(mission)}`}
                                                                                                className="block p-5 transition-colors hover:bg-background">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div><p className="text-xs font-semibold text-primary">{mission.code}</p><h3
                                className="break-words text-lg font-semibold text-foreground">{mission.title}</h3></div>
                            <MissionStatusBadge status={mission.status}/></div>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted"><span
                            className="inline-flex items-center gap-1"><CalendarClock
                            size={15}/>{formatDate(mission.startTime, {dateStyle: 'short', timeStyle: 'medium'})}</span><span
                            className="inline-flex items-center gap-1"><MapPin
                            size={15}/>{mission.locationName}</span><span>{displayLabel(mission.missionType)}</span>
                        </div>
                    </Link>)}</div>}</CardContent>
    </Card>;
}
