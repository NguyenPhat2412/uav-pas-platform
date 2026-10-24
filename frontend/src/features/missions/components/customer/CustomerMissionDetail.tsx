'use client';
import Link from 'next/link';
import {MissionRequestDetails} from '@/features/missions/components/MissionRequestDetails';
import {useParams} from 'next/navigation';
import {useState} from 'react';
import {MissionTimeline} from "@/components/shared/MissionTimeline";
import {displayLabel, formatDate, missionHint, serviceName} from "@/components/shared/presentation";
import {PageGuard} from "@/components/customer/layout";
import {Button, Status} from "@/components/customer/ui";
import {useAuth} from '@/contexts/AuthContext';
import {useMissionActions, useMissionDetail, useServices} from "@/lib/query/customer";
import {customerService} from "@/lib/api/customer";
import {canEditMission} from "@/features/missions/forms/mission-form";
import {MissionProgress} from "@/features/missions/components/customer/MissionProgress";
import {MediaPreview} from "@/features/missions/components/customer/MediaPreview";
import {useI18n} from '@/contexts/I18nContext';

export default function MissionDetailPage() {
    return <PageGuard><MissionDetail/></PageGuard>;
}

function MissionDetail() {
    const {id} = useParams<{ id: string }>();
    const q = useMissionDetail(Number(id));
    const services = useServices();
    const actions = useMissionActions();
    const {can, user} = useAuth();
    const {t} = useI18n();
    const [mediaError, setMediaError] = useState(false);
    const [downloading, setDownloading] = useState<number | null>(null);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const mission = q.detail.data;
    const actionError = actions.submit.error || actions.cancel.error;
    if (q.detail.isLoading) return <div className="grid min-h-[70vh] place-items-center text-sm text-muted" role="status">{t('missionDetail.loading')}</div>;
    if (q.detail.isError || !mission || mission.customerId !== user?.id) return <div className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-3.5 py-3 text-xs text-danger [&_a]:underline"
                                                                                     role="alert">{t('missionDetail.loadError')} <Button variant="secondary" onClick={() => void q.detail.refetch()}>{t('common.retry')}</Button> <Link href="/customer/missions">{t('missionDetail.backToList')}</Link></div>;
    const canSubmit = canEditMission(mission, user?.id, can('MISSION_UPDATE'));
    const canCancel = ['DRAFT', 'PENDING_CONFIRMATION'].includes(mission.status) && can('MISSION_CANCEL');
    const download = async (mediaId: number) => {
        setDownloading(mediaId);
        setMediaError(false);
        try {
            const signed = await customerService.download(mediaId);
            window.open(signed.url, '_blank', 'noopener,noreferrer');
        } catch {
            setMediaError(true);
        } finally {
            setDownloading(null);
        }
    };
    const panelClass = 'min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm';
    const panelHeaderClass = 'flex items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-6 md:py-5';
    const panelTitleClass = 'm-0 text-lg font-bold text-foreground';
    const panelBodyClass = 'p-5 md:p-6';
    const mutedClass = 'm-0 text-sm leading-relaxed text-muted';
    const errorBoxClass = 'flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-3.5 py-3 text-xs text-danger [&_a]:underline';
    return <div className="mx-auto grid max-w-[1200px] gap-4 leading-normal text-foreground md:gap-6">
        <Link href="/customer/missions" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline">{t('missionCreate.back')}</Link>
        <section className={panelClass} aria-labelledby="mission-title">
            <div className="p-5 md:p-7">
                <div className="flex flex-col-reverse items-start justify-between gap-3 md:flex-row md:gap-5">
                    <div className="min-w-0"><p className="m-0 text-xs font-bold tracking-wider text-primary">{mission.code}</p><h1 id="mission-title" className="my-2 break-words text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-3xl">{mission.title}</h1><p
                        className={mutedClass}>{mission.locationName}</p></div>
                    <Status value={mission.status}/></div>
                <dl className="m-0 mt-6 grid grid-cols-2 gap-4.5 md:grid-cols-4 md:gap-5 [&_dt]:mb-1.5 [&_dt]:text-xs [&_dt]:text-muted [&_dd]:m-0 [&_dd]:break-words [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foreground">
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
                {mission.description && <p className="m-0 mt-5 text-sm leading-relaxed text-muted">{mission.description}</p>}
                <MissionRequestDetails mission={mission}/>
            </div>
            <div className="flex flex-col items-stretch justify-between gap-4 border-t border-border bg-background px-5 py-4 md:flex-row md:items-center md:px-7"><p className="m-0 max-w-[70ch] text-sm text-muted">{missionHint(mission.status)}</p>{(canSubmit || canCancel) &&
                <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto">
                    {canSubmit && !actions.submit.isPending && !actions.cancel.isPending &&
                        <Link className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-border bg-card px-4 text-sm font-bold text-foreground transition-colors hover:bg-background" href={`/customer/missions/${mission.id}/edit`}>{t('missionDetail.editDraft')}</Link>}
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
            <div className="grid gap-3 rounded-xl border border-border bg-background p-4 md:p-5" role="group" aria-label={t('missionDetail.cancelConfirmLabel')}><strong>{t('missionDetail.cancelQuestion')}</strong><p className={mutedClass}>{t('missionDetail.cancelWarning')}</p>
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
        {mission.status === 'COMPLETED' && <section className={panelClass} aria-labelledby="handover-title">
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
        {mission.status === 'FAILED' && <section className={panelClass}>
            <header className={panelHeaderClass}><h2 className={panelTitleClass}>{t('missionDetail.outcome')}</h2></header>
            <div className={panelBodyClass}>
                <p className="m-0 text-sm text-foreground">{mission.failureReason || t('missionDetail.failedDefault')}</p>{mission.failureNotes &&
                <p className="m-0 mt-2 text-sm leading-relaxed text-muted">{mission.failureNotes}</p>}</div>
        </section>}
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-6">
            <section className={panelClass} aria-labelledby="files-title">
                <header className={panelHeaderClass}><h2 id="files-title" className={panelTitleClass}>{t('missionDetail.files')}</h2><span
                    className="rounded-lg bg-background px-2.5 py-1 text-xs font-semibold text-muted">{t('missionDetail.fileCount', {count: q.media.data?.length ?? 0})}</span></header>
                <div className={`${panelBodyClass} grid gap-3`}>
                    <p className={mutedClass}>{t('missionDetail.filesIntro')}</p>
                    {mediaError && <div className={errorBoxClass} role="alert">{t('missionDetail.downloadError')}</div>}
                    {!can('MISSION_MEDIA_VIEW') ?
                        <p className={mutedClass}>{t('missionDetail.noFilePermission')}</p> : q.media.isLoading ?
                            <p role="status" className={mutedClass}>{t('missionDetail.loadingFiles')}</p> : q.media.isError ?
                                <div className={errorBoxClass} role="alert">{t('missionDetail.filesError')} <button className="font-bold underline"
                                    onClick={() => void q.media.refetch()}>{t('common.retry')}</button>
                                </div> : q.media.data?.length ?
                                    <><MediaPreview items={q.media.data}/><ul className="m-0 grid list-none gap-3 p-0">{q.media.data.map(item => <li className="mission-file flex items-center justify-between gap-3 rounded-xl border border-border p-3 md:gap-4 md:p-4"
                                                                                                key={item.id}>
                                        <div className="grid min-w-0 gap-1.5"><span
                                            className="break-words text-sm font-semibold text-foreground">{item.media.originalName}</span><span
                                            className="text-xs text-muted">{displayLabel(item.mediaRole)} · {Math.max(1, Math.ceil(item.media.size / 1000))} KB</span>
                                        </div>
                                        <Button variant="secondary" disabled={downloading !== null}
                                                onClick={() => void download(item.media.id)}>{downloading === item.media.id ? t('missionDetail.downloading') : t('missionDetail.download')}</Button>
                                    </li>)}</ul></> :
                                    <div className="px-2 py-6 text-center text-sm text-muted">{t('missionDetail.noFiles')}</div>}
                </div>
            </section>
            <section className={panelClass} aria-labelledby="history-title">
                <header className={panelHeaderClass}><h2 id="history-title" className={panelTitleClass}>{t('missionDetail.history')}</h2></header>
                <div className={panelBodyClass}>
                    {!can('MISSION_TIMELINE_VIEW') ?
                        <p className={mutedClass}>{t('missionDetail.noHistoryPermission')}</p> : q.timeline.isLoading ?
                            <p role="status" className={mutedClass}>{t('missionDetail.loadingHistory')}</p> : q.timeline.isError ?
                                <div className={errorBoxClass} role="alert">{t('missionDetail.historyError')} <button className="font-bold underline"
                                    onClick={() => void q.timeline.refetch()}>{t('common.retry')}</button></div> :
                                <MissionTimeline events={q.timeline.data ?? []}/>}
                </div>
            </section>
        </div>
    </div>;
}
