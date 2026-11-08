'use client';

import type {ReactNode, RefObject} from 'react';
import Link from 'next/link';
import {ArrowLeft, CheckCircle2, Play, Radio} from 'lucide-react';
import {MissionMonitoring} from '@/components/mission/customer/MissionMonitoring';
import {MissionRequestDetails} from '@/components/mission/MissionRequestDetails';
import {Alert, Button, Card, CardContent, CardFooter, CardHeader, CardTitle, StatusBadge} from '@/components/ui';
import type {useMissionWorkflow} from '@/hooks/mission/useMissionWorkflow';
import {displayLabel, formatDate, missionHint} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {Mission, MissionConfirmationKind, MissionDetailSection} from '@/types/mission/mission.types';
import type {missionControls} from '@/utils/mission/presentation';

export interface OperationsMissionOverviewSectionProps {
    mission: Mission;
    missions: ReturnType<typeof useMissionWorkflow>;
    backHref: string;
    controls: ReturnType<typeof missionControls>;
    disabled: boolean;
    busy: boolean;
    uploading: boolean;
    stale: boolean;
    errorText: string;
    mutationErrorRef: RefObject<HTMLDivElement | null>;
    sectionErrors: MissionDetailSection[];
    canRehearse: boolean;
    rehearsing: boolean;
    weatherSlot?: ReactNode;
    confirmSlot?: ReactNode;
    onAction: (run: () => Promise<Mission>) => Promise<void>;
    onOpenConfirmation: (kind: MissionConfirmationKind) => void;
    onRehearse: () => void;
    onReloadStale: () => void;
    onRetrySections: () => void;
}

export function OperationsMissionOverviewSection({
    mission,
    missions,
    backHref,
    controls,
    disabled,
    busy,
    uploading,
    stale,
    errorText,
    mutationErrorRef,
    sectionErrors,
    canRehearse,
    rehearsing,
    weatherSlot,
    confirmSlot,
    onAction,
    onOpenConfirmation,
    onRehearse,
    onReloadStale,
    onRetrySections,
}: OperationsMissionOverviewSectionProps) {
    const {t} = useI18n();
    const showMap = Boolean(mission.flightPlan || (mission.latitude != null && mission.longitude != null));
    const showPreflightNav = !['DRAFT', 'PENDING_CONFIRMATION', 'CANCELLED', 'REJECTED'].includes(mission.status);
    const navPillClass =
        'inline-flex min-h-11 items-center rounded-control border border-border bg-card px-4 py-2 text-xs font-semibold text-muted transition-colors hover:bg-uav-red-light hover:text-primary';

    return (
        <>
            <Link
                href={backHref}
                className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
                <ArrowLeft size={16} aria-hidden="true" />
                {t('opsMissions.detail.backToList')}
            </Link>

            <Card className="min-w-0" id="overview" role="region" aria-labelledby="mission-title">
                <CardContent className="p-5 md:p-7">
                    <div className="flex flex-col-reverse items-start justify-between gap-3 md:flex-row md:gap-5">
                        <div className="min-w-0">
                            <p className="m-0 text-xs font-bold tracking-wider text-primary">{mission.code}</p>
                            <h1
                                id="mission-title"
                                className="my-2 break-words text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-3xl"
                            >
                                {mission.title}
                            </h1>
                            <p className="m-0 text-sm leading-relaxed text-muted">{mission.locationName}</p>
                        </div>
                        <StatusBadge status={mission.status} />
                    </div>

                    <dl className="m-0 mt-6 grid grid-cols-2 gap-4.5 md:grid-cols-4 md:gap-5">
                        <OverviewFact label={t('opsMissions.detail.facts.type')} value={displayLabel(mission.missionType)} />
                        <OverviewFact label={t('opsMissions.detail.facts.start')} value={formatDate(mission.startTime)} />
                        <OverviewFact label={t('opsMissions.detail.facts.end')} value={formatDate(mission.expectedEndTime)} />
                        <OverviewFact label={t('opsMissions.detail.facts.priority')} value={displayLabel(mission.priority)} />
                    </dl>

                    {mission.description && (
                        <p className="m-0 mt-5 text-sm leading-relaxed text-muted">{mission.description}</p>
                    )}

                    <MissionRequestDetails mission={mission} />
                    {weatherSlot}
                </CardContent>

                <CardFooter className="flex-col items-stretch justify-between gap-4 bg-background px-5 py-4 md:flex-row md:items-center md:px-7">
                    <p className="m-0 max-w-[70ch] text-sm text-muted">{missionHint(mission.status)}</p>
                    <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto">
                        {controls.submit && (
                            <Button disabled={disabled} onClick={() => void onAction(() => missions.submit(mission.id))}>
                                {t('opsMissions.detail.actions.submit')}
                            </Button>
                        )}
                        {controls.confirm && (
                            <Button disabled={disabled} onClick={() => void onAction(() => missions.confirm(mission.id))}>
                                {t('opsMissions.detail.actions.confirm')}
                            </Button>
                        )}
                        {controls.ready && (
                            <Button disabled={disabled} onClick={() => void onAction(() => missions.ready(mission.id))}>
                                {t('opsMissions.detail.actions.ready')}
                            </Button>
                        )}
                        {controls.accept && (
                            <Button disabled={disabled} onClick={() => void onAction(() => missions.accept(mission.id, mission.version))}>
                                {t('opsMissions.detail.actions.accept')}
                            </Button>
                        )}
                        {controls.start && (
                            <Button disabled={disabled} leftIcon={<Play size={16} />} onClick={() => void onAction(() => missions.start(mission.id))}>
                                {t('opsMissions.detail.actions.start')}
                            </Button>
                        )}
                        {controls.complete && (
                            <Button disabled={disabled} leftIcon={<CheckCircle2 size={16} />} onClick={() => onOpenConfirmation('complete')}>
                                {t('opsMissions.detail.actions.complete')}
                            </Button>
                        )}
                        {controls.fail && (
                            <Button disabled={disabled} variant="danger" onClick={() => onOpenConfirmation('fail')}>
                                {t('opsMissions.detail.actions.fail')}
                            </Button>
                        )}
                        {controls.forceFail && (
                            <Button disabled={disabled} variant="danger" onClick={() => onOpenConfirmation('forceFail')}>
                                {t('opsMissions.detail.actions.forceFail')}
                            </Button>
                        )}
                        {controls.conflict && (
                            <Button disabled={disabled} variant="outline" onClick={() => onOpenConfirmation('conflict')}>
                                {t('opsMissions.detail.actions.conflict')}
                            </Button>
                        )}
                        {controls.reject && (
                            <Button disabled={disabled} variant="outline" onClick={() => onOpenConfirmation('reject')}>
                                {t('opsMissions.detail.actions.reject')}
                            </Button>
                        )}
                        {controls.cancel && (
                            <Button disabled={disabled} variant="outline" onClick={() => onOpenConfirmation('cancel')}>
                                {t('opsMissions.detail.actions.cancel')}
                            </Button>
                        )}
                        {canRehearse && (
                            <Button disabled={disabled || rehearsing} variant="outline" leftIcon={<Radio size={16} />} onClick={onRehearse}>
                                {t('simulation.rehearseAction')}
                            </Button>
                        )}
                        {busy && (
                            <span role="status" className="text-sm text-muted">
                                {t('opsMissions.detail.actions.processing')}
                            </span>
                        )}
                    </div>
                </CardFooter>
            </Card>

            {['CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(mission.status) && !mission.operatorAccepted && (
                <Alert role="status" variant="info" title={t('opsMissions.detail.awaitingAcceptance.title')}>
                    {t('opsMissions.detail.awaitingAcceptance.body')}
                </Alert>
            )}

            {confirmSlot}

            {errorText && (
                <div ref={mutationErrorRef} role="alert" tabIndex={-1}>
                    <Alert role="presentation" variant="error">{errorText}</Alert>
                </div>
            )}

            {stale && (
                <Button variant="outline" disabled={busy || uploading} onClick={onReloadStale}>
                    {t('opsMissions.detail.reloadStatus')}
                </Button>
            )}

            {sectionErrors.length > 0 && (
                <Alert variant="warning">
                    {t('opsMissions.detail.sectionsFailed', {
                        sections: sectionErrors.map(name => t(`opsMissions.detail.sections.${name}`)).join(', '),
                    })}{' '}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="inline-flex h-auto p-0 font-semibold text-amber-950 underline hover:bg-transparent"
                        disabled={busy || uploading}
                        onClick={onRetrySections}
                    >
                        {t('opsMissions.detail.retry')}
                    </Button>
                </Alert>
            )}

            <nav className="flex flex-wrap gap-2" aria-label={t('opsMissions.detail.nav.label')}>
                {showMap && <a className={navPillClass} href="#flight-map">{t('missionMonitor.mapTitle')}</a>}
                {showPreflightNav && <a className={navPillClass} href="#preflight">{t('capabilities.preflight.title')}</a>}
                <a className={navPillClass} href="#permit">{t('permit.title')}</a>
                <a className={navPillClass} href="#resources">{t('opsMissions.detail.nav.resources')}</a>
                <a className={navPillClass} href="#media">{t('opsMissions.detail.nav.media')}</a>
                <a className={navPillClass} href="#timeline">{t('opsMissions.detail.nav.timeline')}</a>
            </nav>

            {showMap && (
                <Card className="min-w-0" id="flight-map">
                    <CardHeader className="px-5 py-4 md:px-6 md:py-5">
                        <CardTitle className="text-lg font-bold text-foreground">{t('missionMonitor.mapTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 md:p-6">
                        <MissionMonitoring mission={mission} />
                    </CardContent>
                </Card>
            )}
        </>
    );
}

function OverviewFact({label, value}: {label: string; value: string}) {
    return (
        <div>
            <dt className="mb-1 text-xs text-muted">{label}</dt>
            <dd className="m-0 break-words text-sm font-semibold text-foreground">{value}</dd>
        </div>
    );
}
