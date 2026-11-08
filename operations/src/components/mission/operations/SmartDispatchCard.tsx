'use client';

import type {ReactNode} from 'react';
import {Sparkles, Star} from 'lucide-react';
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui';
import {useDispatchCandidates} from '@/hooks/mission/useOperationsMissions';
import {useI18n} from '@/providers/I18nContext';
import type {Mission} from '@/types/mission/mission.types';

export function SmartDispatchCard({
    mission,
    disabled,
    canWriteDispatch,
    onAutoAssign,
}: {
    mission: Mission;
    disabled?: boolean;
    canWriteDispatch: boolean;
    onAutoAssign: () => Promise<void>;
}) {
    const {t, formatNumber} = useI18n();
    const isDispatchPhase =
        mission.status === 'CONFIRMED' || mission.status === 'RESOURCE_RESERVED';
    const query = useDispatchCandidates(mission.id, isDispatchPhase);

    if (!isDispatchPhase || !query.data) return null;

    const plan = query.data;
    const topStation =
        (plan.recommendedStationId != null
            ? plan.stations.find(s => s.id === plan.recommendedStationId)
            : undefined) ?? plan.stations.find(s => s.eligible);
    const topUav =
        (plan.recommendedUavId != null
            ? plan.uavs.find(u => u.id === plan.recommendedUavId)
            : undefined) ?? plan.uavs.find(u => u.eligible);
    const topOperator =
        (plan.recommendedOperatorId != null
            ? plan.operators.find(o => o.id === plan.recommendedOperatorId)
            : undefined) ?? plan.operators.find(o => o.eligible);
    const topEquipment =
        (plan.recommendedEquipmentId != null
            ? plan.equipment.find(e => e.id === plan.recommendedEquipmentId)
            : undefined) ?? plan.equipment.find(e => e.eligible);

    return (
        <Card className="min-w-0">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 px-5 py-4 md:px-6">
                <div className="min-w-0">
                    <CardTitle className="inline-flex items-center gap-2 text-lg font-bold text-foreground">
                        <Sparkles size={18} className="text-primary" aria-hidden="true" />
                        {t('capabilities.smartDispatch.title')}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-muted">
                        {t('capabilities.smartDispatch.subtitle')}
                    </CardDescription>
                </div>
                {canWriteDispatch && plan.canAutoAssign && (
                    <Button
                        type="button"
                        disabled={disabled}
                        leftIcon={<Sparkles size={15} />}
                        onClick={() => void onAutoAssign().then(() => query.refetch())}
                    >
                        {disabled
                            ? t('capabilities.smartDispatch.autoAssigning')
                            : t('capabilities.smartDispatch.autoAssign')}
                    </Button>
                )}
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 md:p-6">
                <CandidateTile
                    label={t('capabilities.smartDispatch.stationLabel')}
                    scoreText={
                        topStation
                            ? t('capabilities.smartDispatch.recommended', {score: topStation.score})
                            : undefined
                    }
                    emptyText={t('capabilities.smartDispatch.noCandidate')}
                    title={topStation?.name}
                    meta={
                        topStation ? (
                            <>
                                {topStation.code}
                                {topStation.distanceKm != null
                                    ? ` · ${t('capabilities.smartDispatch.distanceKm', {km: formatNumber(topStation.distanceKm)})}`
                                    : ''}
                            </>
                        ) : null
                    }
                />

                <CandidateTile
                    label={t('capabilities.smartDispatch.uavLabel')}
                    scoreText={
                        topUav
                            ? t('capabilities.smartDispatch.recommended', {score: topUav.score})
                            : undefined
                    }
                    emptyText={t('capabilities.smartDispatch.noCandidate')}
                    title={topUav ? `${topUav.serialNumber} · ${topUav.model}` : undefined}
                    meta={
                        topUav ? (
                            <span className="flex flex-wrap gap-x-2">
                                {topUav.batteryPct != null && (
                                    <span>
                                        {t('capabilities.smartDispatch.batteryPct', {
                                            pct: topUav.batteryPct,
                                        })}
                                    </span>
                                )}
                                {topUav.daysSinceMaintenance != null && (
                                    <span>
                                        ·{' '}
                                        {t('capabilities.smartDispatch.maintDays', {
                                            days: topUav.daysSinceMaintenance,
                                        })}
                                    </span>
                                )}
                            </span>
                        ) : null
                    }
                />

                <CandidateTile
                    label={t('capabilities.smartDispatch.operatorLabel')}
                    scoreText={
                        topOperator
                            ? t('capabilities.smartDispatch.recommended', {score: topOperator.score})
                            : undefined
                    }
                    emptyText={t('capabilities.smartDispatch.noCandidate')}
                    title={topOperator?.fullName}
                    meta={
                        topOperator ? (
                            <span className="flex flex-wrap items-center gap-x-2">
                                <span>
                                    {t('capabilities.smartDispatch.sameDayLoad', {
                                        count: topOperator.sameDayMissionCount,
                                    })}
                                </span>
                                <span>
                                    ·{' '}
                                    {t('capabilities.smartDispatch.completedCount', {
                                        count: topOperator.completedMissionCount,
                                    })}
                                </span>
                                {topOperator.averageRating != null && (
                                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700">
                                        · <Star size={11} className="fill-amber-400 text-amber-500" />
                                        {topOperator.averageRating.toFixed(1)}
                                    </span>
                                )}
                            </span>
                        ) : null
                    }
                />

                <CandidateTile
                    label={t('capabilities.smartDispatch.equipmentLabel')}
                    scoreText={
                        topEquipment
                            ? t('capabilities.smartDispatch.recommended', {score: topEquipment.score})
                            : undefined
                    }
                    emptyText={t('capabilities.smartDispatch.noCandidate')}
                    title={topEquipment?.name}
                    meta={
                        topEquipment ? (
                            <>
                                {topEquipment.category} ·{' '}
                                {t('capabilities.smartDispatch.stockCount', {
                                    count: topEquipment.availableQuantity,
                                })}
                            </>
                        ) : null
                    }
                />
            </CardContent>
        </Card>
    );
}

function CandidateTile({
    label,
    scoreText,
    emptyText,
    title,
    meta,
}: {
    label: string;
    scoreText?: string;
    emptyText: string;
    title?: string;
    meta?: ReactNode;
}) {
    return (
        <Card variant="surface" className="grid gap-1.5 border-border bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
                {scoreText && (
                    <Badge
                        variant="outline"
                        size="sm"
                        className="border-sky-200 bg-sky-50 tabular-nums normal-case text-uav-blue"
                    >
                        {scoreText}
                    </Badge>
                )}
            </div>
            {title ? (
                <>
                    <div className="truncate text-sm font-bold text-foreground">{title}</div>
                    <div className="text-xs text-muted">{meta}</div>
                </>
            ) : (
                <div className="text-xs text-muted">{emptyText}</div>
            )}
        </Card>
    );
}
