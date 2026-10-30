'use client';
import Link from 'next/link';
import {MissionRequestDetails} from '@/features/missions/components/MissionRequestDetails';
import {useParams} from 'next/navigation';
import {useState} from 'react';
import {MissionTimeline} from "@/components/shared/MissionTimeline";
import {displayLabel, formatDate, missionHint, serviceName} from "@/components/shared/presentation";
import {PageGuard} from "@/components/customer/CustomerLayout";
import {Button, Status} from "@/components/customer/CustomerUi";
import {useAuth} from '@/providers/AuthContext';
import {useMissionActions, useMissionDetail, useServices} from '@/features/missions/hooks/useCustomerMissions';
import {customerMissionService} from '@/features/missions/api/customer-missions.api';
import {canEditMission} from "@/features/missions/forms/mission-form";
import {MissionProgress} from "@/features/missions/components/customer/MissionProgress";
import {MediaPreview} from "@/features/missions/components/customer/MediaPreview";
import {MissionFiles} from "@/features/missions/components/customer/MissionFiles";
import {MissionResources} from "@/features/missions/components/customer/MissionResources";
import {SiteWeather} from "@/features/missions/components/customer/SiteWeather";
import {MissionMonitoring} from "@/features/missions/components/customer/MissionMonitoring";
import {parseEntityId, toMissionSlug} from "@/lib/url-slugs";
import {useI18n} from '@/providers/I18nContext';
import type {MissionTab} from '@/features/missions/types/mission.types';

export default function MissionDetailPage() {
    return <PageGuard><MissionDetail/></PageGuard>;
}

function MissionDetail() {
    const {id} = useParams<{ id: string }>();
    const missionId = parseEntityId(id);
    const q = useMissionDetail(missionId);
    const services = useServices();
    const actions = useMissionActions();
    const {can, user} = useAuth();
    const {t} = useI18n();
    const [mediaError, setMediaError] = useState(false);
    const [downloading, setDownloading] = useState<number | null>(null);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [chosenTab, setTab] = useState<MissionTab | null>(null);
    const mission = q.detail.data;
    const actionError = actions.submit.error || actions.cancel.error;
    if (q.detail.isLoading) return <div className="grid min-h-[70vh] place-items-center text-sm text-muted" role="status">{t('missionDetail.loading')}</div>;
    const canViewAny = can('MISSION_VIEW_ALL');
    if (q.detail.isError || !mission || (!canViewAny && mission.customerId !== user?.id)) return <div className="flex flex-wrap items-center gap-3 rounded-panel bg-red-50 px-3.5 py-3 text-xs text-danger [&_a]:underline"
                                                                                     role="alert">{t('missionDetail.loadError')} <Button variant="secondary" onClick={() => void q.detail.refetch()}>{t('common.retry')}</Button> <Link href="/customer/missions">{t('missionDetail.backToList')}</Link></div>;
    const finished = ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'].includes(mission.status);
    const tabs: MissionTab[] = finished ? ['monitoring', 'delivery', 'history'] : ['monitoring', 'weather', 'delivery', 'history'];
    // Finished missions open on their results; everything else on the live view.
    const tab: MissionTab = chosenTab && tabs.includes(chosenTab) ? chosenTab : mission.status === 'COMPLETED' ? 'delivery' : 'monitoring';
    const canSubmit = canEditMission(mission, user?.id, can('MISSION_UPDATE'));
    const canCancel = ['DRAFT', 'PENDING_CONFIRMATION'].includes(mission.status) && can('MISSION_CANCEL');
    const download = async (mediaId: number) => {
        setDownloading(mediaId);
        setMediaError(false);
        try {
            const signed = await customerMissionService.download(mediaId);
            window.open(signed.url, '_blank', 'noopener,noreferrer');
        } catch {
            setMediaError(true);
        } finally {
            setDownloading(null);
        }
    };
    const panelClass = 'min-w-0 overflow-hidden rounded-panel border-b border-border bg-card';
    const panelHeaderClass = 'flex items-center justify-between gap-3 border-b border-border bg-slate-50/70 px-4 py-3 md:px-5';
    const panelTitleClass = 'm-0 text-sm font-bold text-slate-800';
    const panelBodyClass = 'p-4 md:p-5';
    const mutedClass = 'm-0 text-sm leading-relaxed text-muted';
    const errorBoxClass = 'flex flex-wrap items-center gap-3 rounded-panel bg-red-50 px-3.5 py-3 text-xs text-danger [&_a]:underline';
    return <div className="flex flex-1 flex-col bg-white leading-normal text-foreground">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 md:px-5">
            <Link href="/customer/missions" className="inline-flex min-h-8 w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline">{t('missionCreate.back')}</Link>
        </div>
        <section className={panelClass} aria-labelledby="mission-title">
            <div className="p-4 md:p-5">
                <div className="flex flex-col-reverse items-start justify-between gap-3 md:flex-row md:gap-5">
                    <div className="min-w-0"><p className="m-0 text-xs font-bold tracking-wider text-primary">{mission.code}</p><h1 id="mission-title" className="my-1.5 break-words text-xl font-extrabold leading-tight tracking-tight text-foreground md:text-2xl">{mission.title}</h1><p
                        className={mutedClass}>{mission.locationName}</p></div>
                    <Status value={mission.status}/></div>
                {mission.description && <p className="m-0 mt-3 text-sm leading-relaxed text-muted">{mission.description}</p>}
                <MissionRequestDetails mission={mission}/>
            </div>
            <dl className="m-0 grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 md:grid-cols-4 [&>div]:bg-slate-50/50 [&>div]:px-4 [&>div]:py-3 [&_dt]:mb-1 [&_dt]:text-xs [&_dt]:text-muted [&_dd]:m-0 [&_dd]:break-words [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foreground">
                <div>
                    <dt>{t('missionCreate.service')}</dt>
                    <dd>{services.data?.find(s => s.id === mission.serviceId) ? serviceName(services.data.find(s => s.id === mission.serviceId)!) : displayLabel(mission.missionType)}</dd>
                </div>
                <div>
                    <dt>{t('missionDetail.plannedStart')}</dt>
                    <dd>{formatDate(mission.startTime)}</dd>
                </div>
                <div>
                    <dt>{t('missionForm.expectedEnd')}</dt>
                    <dd>{formatDate(mission.expectedEndTime)}</dd>
                </div>
                <div>
                    <dt>{t('missionForm.priority')}</dt>
                    <dd>{displayLabel(mission.priority)}</dd>
                </div>
            </dl>
            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border bg-white px-4 py-3 md:flex-row md:items-center md:px-5"><p className="m-0 max-w-[70ch] text-xs font-medium text-muted">{missionHint(mission.status)}</p>{(canSubmit || canCancel) &&
                <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto">
                    {canSubmit && !actions.submit.isPending && !actions.cancel.isPending &&
                        <Link className="inline-flex min-h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-control border border-border bg-card px-3.5 text-xs font-bold text-foreground transition-colors hover:bg-slate-50" href={`/customer/missions/${toMissionSlug(mission)}/edit`}>{t('missionDetail.editDraft')}</Link>}
                    {canSubmit &&
                        <Button disabled={actions.submit.isPending || actions.cancel.isPending} onClick={() => {
                            actions.cancel.reset();
                            actions.submit.mutate(mission.id);
                        }}>{actions.submit.isPending ? t('missionDetail.sending') : t('missionDetail.submit')}</Button>}
                    {canCancel &&
                        <Button variant="danger" disabled={actions.cancel.isPending || actions.submit.isPending}
                                onClick={() => setConfirmCancel(true)}>{t('missionDetail.cancelRequest')}</Button>}
                </div>}</div>
        </section>
        <MissionProgress status={mission.status}/>
        {confirmCancel && canCancel &&
            <div className="grid gap-3 rounded-panel border border-border bg-background p-4 md:p-5" role="group" aria-label={t('missionDetail.cancelConfirmLabel')}><strong>{t('missionDetail.cancelQuestion')}</strong><p className={mutedClass}>{t('missionDetail.cancelWarning')}</p>
                <div className="flex flex-wrap items-center gap-2.5"><Button variant="secondary"
                                                         disabled={actions.cancel.isPending || actions.submit.isPending}
                                                         onClick={() => setConfirmCancel(false)}>{t('missionDetail.keepRequest')}</Button><Button variant="danger" disabled={actions.cancel.isPending || actions.submit.isPending}
                                        onClick={() => {
                                            actions.submit.reset();
                                            actions.cancel.mutate(mission.id, {onSuccess: () => setConfirmCancel(false)});
                                        }}>{actions.cancel.isPending ? t('missionDetail.cancelling') : t('missionDetail.confirmCancel')}</Button></div>
            </div>}
        {actionError && <div className={errorBoxClass}
                             role="alert">{actionError.message === 'MISSION_INVALID_STATUS' ? t('missionDetail.statusChanged') : t('missionDetail.actionFailed')}</div>}
        <MissionResources mission={mission}/>
        <section className={`${panelClass} flex-1 border-b-0`} aria-label={t('missionTabs.label')}>
            <div role="tablist" aria-label={t('missionTabs.label')} className="flex gap-1 overflow-x-auto border-b border-border bg-slate-50/50 px-3 md:px-5">
                {tabs.map(key => <button key={key} type="button" role="tab" id={`mission-tab-${key}`} aria-controls={`mission-panel-${key}`}
                                           aria-selected={tab === key} tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)}
                                           onKeyDown={e => {
                                               const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                                               if (!step) return;
                                               const next = tabs[(tabs.indexOf(key) + step + tabs.length) % tabs.length];
                                               setTab(next);
                                               document.getElementById(`mission-tab-${next}`)?.focus();
                                           }}
                                           className={`-mb-px inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}>
                    {t(`missionTabs.${key}`)}
                    {key === 'delivery' && (q.media.data?.length ?? 0) > 0 && <span className="rounded-panel bg-background px-2 py-0.5 text-xs text-muted">{q.media.data!.length}</span>}
                </button>)}
            </div>
            <div role="tabpanel" id={`mission-panel-${tab}`} aria-labelledby={`mission-tab-${tab}`} className={panelBodyClass}>
                {tab === 'monitoring' && <MissionMonitoring mission={mission}/>}
                {tab === 'weather' && <SiteWeather mission={mission}/>}
                {tab === 'delivery' && <div className="grid gap-5">
        {mission.status === 'COMPLETED' && <section className="min-w-0 overflow-hidden rounded-panel border border-border" aria-labelledby="handover-title">
            <header className={panelHeaderClass}><h2 id="handover-title" className={panelTitleClass}>{t('missionDetail.handover')}</h2></header>
            <div className={panelBodyClass}>
                <dl className="m-0 grid gap-4 [&_dt]:text-xs [&_dt]:text-muted [&_dd]:m-0 [&_dd]:mt-1 [&_dd]:break-words [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foreground">
                    <div>
                        <dt>{t('missionDetail.invoice')}</dt>
                        <dd>{t(mission.billingStatus === 'PENDING' ? 'missionDetail.billingPending' : mission.billingStatus === 'ERROR' ? 'missionDetail.billingError' : mission.billingStatus === 'ISSUED' ? 'missionDetail.billingIssued' : 'missionDetail.billingNone')}</dd>
                    </div>
                    <div>
                        <dt>{t('missionDetail.resultNote')}</dt>
                        <dd>{mission.completionNote || t('missionDetail.noResultNote')}</dd>
                    </div>
                    <div>
                        <dt>{t('missionDetail.equipmentCondition')}</dt>
                        <dd>{mission.equipmentCondition || t('missionDetail.noEquipmentCondition')}</dd>
                    </div>
                </dl>
                <p className="m-0 mt-4 text-sm leading-relaxed text-muted">{t('missionDetail.completedNote')}</p></div>
        </section>}
        {mission.status === 'FAILED' && <section className="min-w-0 overflow-hidden rounded-panel border border-border">
            <header className={panelHeaderClass}><h2 className={panelTitleClass}>{t('missionDetail.outcome')}</h2></header>
            <div className={panelBodyClass}>
                <p className="m-0 text-sm text-foreground">{mission.failureReason || t('missionDetail.failedDefault')}</p>{mission.failureNotes &&
                <p className="m-0 mt-2 text-sm leading-relaxed text-muted">{mission.failureNotes}</p>}</div>
        </section>}
                    <div className="grid gap-3">
                    <h2 id="files-title" className="m-0 text-base font-bold text-foreground">{t('missionDetail.files')} <span className="ml-1 text-xs font-semibold text-muted">{t('missionDetail.fileCount', {count: q.media.data?.length ?? 0})}</span></h2>
                    {mediaError && <div className={errorBoxClass} role="alert">{t('missionDetail.downloadError')}</div>}
                    {!can('MISSION_MEDIA_VIEW') ?
                        <p className={mutedClass}>{t('missionDetail.noFilePermission')}</p> : q.media.isLoading ?
                            <p role="status" className={mutedClass}>{t('missionDetail.loadingFiles')}</p> : q.media.isError ?
                                <div className={errorBoxClass} role="alert">{t('missionDetail.filesError')} <button className="font-bold underline"
                                    onClick={() => void q.media.refetch()}>{t('common.retry')}</button>
                                </div> : q.media.data?.length ?
                                    <><MediaPreview items={q.media.data}/><MissionFiles items={q.media.data} downloading={downloading}
                                                                                           onDownload={mediaId => void download(mediaId)}/></> :
                                    <div className="px-2 py-6 text-center text-sm text-muted">{t('missionDetail.noFiles')}</div>}
                    </div>
                </div>}
                {tab === 'history' && <>
                    {!can('MISSION_TIMELINE_VIEW') ?
                        <p className={mutedClass}>{t('missionDetail.noHistoryPermission')}</p> : q.timeline.isLoading ?
                            <p role="status" className={mutedClass}>{t('missionDetail.loadingHistory')}</p> : q.timeline.isError ?
                                <div className={errorBoxClass} role="alert">{t('missionDetail.historyError')} <button className="font-bold underline"
                                    onClick={() => void q.timeline.refetch()}>{t('common.retry')}</button></div> :
                                <MissionTimeline events={q.timeline.data ?? []}/>}
                </>}
            </div>
        </section>
    </div>;
}
