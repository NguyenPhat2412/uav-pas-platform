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
    if (q.detail.isLoading) return <div className="center-state" role="status">{t('missionDetail.loading')}</div>;
    if (q.detail.isError || !mission || mission.customerId !== user?.id) return <div className="error"
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
    return <div className="mission-page">
        <Link href="/customer/missions" className="mission-back">{t('missionCreate.back')}</Link>
        <section className="mission-hero" aria-labelledby="mission-title">
            <div className="mission-hero-body">
                <div className="mission-title-row">
                    <div><p className="mission-code">{mission.code}</p><h1 id="mission-title">{mission.title}</h1><p
                        className="mission-muted">{mission.locationName}</p></div>
                    <Status value={mission.status}/></div>
                <dl className="mission-facts">
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
                {mission.description && <p className="mission-muted" style={{marginTop: 20}}>{mission.description}</p>}
                <MissionRequestDetails mission={mission}/>
            </div>
            <div className="mission-guidance"><p>{missionHint(mission.status)}</p>{(canSubmit || canCancel) &&
                <div className="mission-actions">
                    {canSubmit && !actions.submit.isPending && !actions.cancel.isPending &&
                        <Link className="button button-secondary" href={`/customer/missions/${mission.id}/edit`}>{t('missionDetail.editDraft')}</Link>}
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
            <div className="mission-note" role="group" aria-label={t('missionDetail.cancelConfirmLabel')}><strong>{t('missionDetail.cancelQuestion')}</strong><p className="mission-muted">{t('missionDetail.cancelWarning')}</p>
                <div className="mission-actions"><Button variant="secondary"
                                                         disabled={actions.cancel.isPending || actions.submit.isPending}
                                                         onClick={() => setConfirmCancel(false)}>{t('missionDetail.keepRequest')}</Button><Button variant="danger" disabled={actions.cancel.isPending || actions.submit.isPending}
                                        onClick={() => {
                                            actions.submit.reset();
                                            actions.cancel.mutate(mission.id, {onSuccess: () => setConfirmCancel(false)});
                                        }}>{actions.cancel.isPending ? t('missionDetail.cancelling') : t('missionDetail.confirmCancel')}</Button></div>
            </div>}
        {actionError && <div className="error"
                             role="alert">{actionError.message === 'MISSION_INVALID_STATUS' ? t('missionDetail.statusChanged') : t('missionDetail.actionFailed')}</div>}
        {mission.status === 'COMPLETED' && <section className="mission-panel" aria-labelledby="handover-title">
            <header><h2 id="handover-title">{t('missionDetail.handover')}</h2></header>
            <div className="mission-panel-body">
                <dl className="mission-resource-list">
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
                <p className="mission-muted" style={{marginTop: 16}}>{t('missionDetail.completedNote')}</p></div>
        </section>}
        {mission.status === 'FAILED' && <section className="mission-panel">
            <header><h2>{t('missionDetail.outcome')}</h2></header>
            <div className="mission-panel-body">
                <p>{mission.failureReason || t('missionDetail.failedDefault')}</p>{mission.failureNotes &&
                <p className="mission-muted">{mission.failureNotes}</p>}</div>
        </section>}
        <div className="mission-grid">
            <section className="mission-panel" aria-labelledby="files-title">
                <header><h2 id="files-title">{t('missionDetail.files')}</h2><span
                    className="mission-count">{t('missionDetail.fileCount', {count: q.media.data?.length ?? 0})}</span></header>
                <div className="mission-panel-body">
                    <p className="mission-muted">{t('missionDetail.filesIntro')}</p>
                    {mediaError && <div className="error" role="alert">{t('missionDetail.downloadError')}</div>}
                    {!can('MISSION_MEDIA_VIEW') ?
                        <p className="mission-muted">{t('missionDetail.noFilePermission')}</p> : q.media.isLoading ?
                            <p role="status">{t('missionDetail.loadingFiles')}</p> : q.media.isError ?
                                <div className="error" role="alert">{t('missionDetail.filesError')} <button
                                    onClick={() => void q.media.refetch()}>{t('common.retry')}</button>
                                </div> : q.media.data?.length ?
                                    <><MediaPreview items={q.media.data}/><ul className="mission-files">{q.media.data.map(item => <li className="mission-file"
                                                                                                key={item.id}>
                                        <div className="mission-file-info"><span
                                            className="mission-file-name">{item.media.originalName}</span><span
                                            className="mission-file-meta">{displayLabel(item.mediaRole)} · {Math.max(1, Math.ceil(item.media.size / 1000))} KB</span>
                                        </div>
                                        <Button variant="secondary" disabled={downloading !== null}
                                                onClick={() => void download(item.media.id)}>{downloading === item.media.id ? t('missionDetail.downloading') : t('missionDetail.download')}</Button>
                                    </li>)}</ul></> :
                                    <div className="mission-empty">{t('missionDetail.noFiles')}</div>}
                </div>
            </section>
            <section className="mission-panel" aria-labelledby="history-title">
                <header><h2 id="history-title">{t('missionDetail.history')}</h2></header>
                <div className="mission-panel-body">
                    {!can('MISSION_TIMELINE_VIEW') ?
                        <p className="mission-muted">{t('missionDetail.noHistoryPermission')}</p> : q.timeline.isLoading ?
                            <p role="status">{t('missionDetail.loadingHistory')}</p> : q.timeline.isError ?
                                <div className="error" role="alert">{t('missionDetail.historyError')} <button
                                    onClick={() => void q.timeline.refetch()}>{t('common.retry')}</button></div> :
                                <MissionTimeline events={q.timeline.data ?? []}/>}
                </div>
            </section>
        </div>
    </div>;
}
