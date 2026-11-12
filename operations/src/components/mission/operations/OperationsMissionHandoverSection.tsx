'use client';

import type {ReactNode} from 'react';
import {MissionTimeline} from '@/components/shared/MissionTimeline';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {Mission, MissionEvent} from '@/types/mission/mission.types';
import type {Operator, Station, Uav} from '@/types/resources';

export interface OperationsMissionHandoverSectionProps {
    mission: Mission;
    stations: Station[];
    uavs: Uav[];
    operators: Operator[];
    events: MissionEvent[];
    readTimeline: boolean;
    currentUser?: {
        id: number;
        fullName?: string | null;
        username?: string;
    } | null;
    mediaSlot: ReactNode;
}

export function OperationsMissionHandoverSection({
    mission,
    stations,
    uavs,
    operators,
    events,
    readTimeline,
    currentUser,
    mediaSlot,
}: OperationsMissionHandoverSectionProps) {
    const {t} = useI18n();
    const assignedStation = stations.find(s => s.id === mission.stationId);
    const assignedUav = uavs.find(u => u.id === mission.uavId);
    const assignedOperator = operators.find(o => o.id === mission.operatorId);

    const stationValue =
        assignedStation?.name ||
        (mission.stationId
            ? t('opsMissions.detail.assigned.stationFallback', {id: mission.stationId})
            : t('opsMissions.detail.assigned.unassigned'));

    const uavValue = assignedUav
        ? `${assignedUav.serialNumber} · ${assignedUav.model}`
        : mission.uavId
          ? t('opsMissions.detail.assigned.uavFallback', {id: mission.uavId})
          : t('opsMissions.detail.assigned.unassigned');

    const operatorValue =
        assignedOperator?.fullName ||
        assignedOperator?.username ||
        (mission.operatorId === currentUser?.id
            ? currentUser?.fullName || currentUser?.username || t('opsMissions.detail.assigned.you')
            : mission.operatorId
              ? t('opsMissions.detail.assigned.operatorFallback', {id: mission.operatorId})
              : t('opsMissions.detail.assigned.unassigned'));

    const billingValue =
        mission.billingStatus === 'PENDING'
            ? t('opsMissions.detail.outcome.billingPending')
            : mission.billingStatus === 'ERROR'
              ? t('opsMissions.detail.outcome.billingError')
              : mission.billingStatus === 'ISSUED'
                ? t('opsMissions.detail.outcome.billingIssued')
                : t('opsMissions.detail.outcome.billingNone');

    return (
        <div className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="grid gap-5">
                <Card className="min-w-0" id="resources">
                    <CardHeader className="px-5 py-4 md:px-6 md:py-5">
                        <CardTitle className="text-lg font-bold text-foreground">
                            {t('opsMissions.detail.assigned.title')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 md:p-6">
                        <dl className="m-0 grid gap-4">
                            <HandoverInfo label={t('opsMissions.detail.resources.station')} value={stationValue} />
                            <HandoverInfo label="UAV" value={uavValue} />
                            <HandoverInfo label={t('opsMissions.detail.resources.operator')} value={operatorValue} />
                        </dl>
                        {mission.operatorId && (
                            <p className="m-0 mt-4 text-sm leading-relaxed text-muted">
                                {mission.operatorAccepted
                                    ? t('opsMissions.detail.assigned.accepted')
                                    : t('opsMissions.detail.assigned.notAccepted')}
                            </p>
                        )}
                        {mission.operatorConflictNote && (
                            <p className="m-0 mt-2 text-sm leading-relaxed text-muted">
                                {t('opsMissions.detail.assigned.conflict', {note: mission.operatorConflictNote})}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {(mission.status === 'FAILED' || mission.status === 'COMPLETED') && (
                    <Card className="min-w-0" role="region" aria-labelledby="mission-outcome-title">
                        <CardHeader className="px-5 py-4 md:px-6 md:py-5">
                            <CardTitle id="mission-outcome-title" className="text-lg font-bold text-foreground">
                                {t('opsMissions.detail.outcome.title')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 md:p-6">
                            <dl className="m-0 grid gap-4">
                                {mission.status === 'FAILED' ? (
                                    <>
                                        <HandoverInfo
                                            label={t('opsMissions.detail.outcome.failureReason')}
                                            value={mission.failureReason || t('opsMissions.detail.outcome.none')}
                                        />
                                        {mission.failureNotes && (
                                            <HandoverInfo
                                                label={t('opsMissions.detail.outcome.incident')}
                                                value={mission.failureNotes}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <HandoverInfo
                                            label={t('opsMissions.detail.outcome.billing')}
                                            value={billingValue}
                                        />
                                        <HandoverInfo
                                            label={t('opsMissions.detail.outcome.result')}
                                            value={mission.completionNote || t('opsMissions.detail.outcome.none')}
                                        />
                                        {mission.equipmentCondition && (
                                            <HandoverInfo
                                                label={t('opsMissions.detail.outcome.equipmentCondition')}
                                                value={mission.equipmentCondition}
                                            />
                                        )}
                                    </>
                                )}
                            </dl>
                        </CardContent>
                    </Card>
                )}

                {mediaSlot}
            </div>

            <Card className="min-w-0" id="timeline">
                <CardHeader className="px-5 py-4 md:px-6 md:py-5">
                    <CardTitle className="text-lg font-bold text-foreground">
                        {t('opsMissions.detail.timeline.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6">
                    {readTimeline ? (
                        <MissionTimeline events={events} showActor />
                    ) : (
                        <p className="m-0 text-sm leading-relaxed text-muted">
                            {t('opsMissions.detail.timeline.noPermission')}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function HandoverInfo({label, value}: {label: string; value: string}) {
    return (
        <div>
            <dt className="mb-1 text-xs text-muted">{label}</dt>
            <dd className="m-0 break-words text-sm font-semibold text-foreground">{value}</dd>
        </div>
    );
}
