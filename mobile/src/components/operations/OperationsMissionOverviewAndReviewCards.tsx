import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
    CalendarClock,
    CheckCircle2,
    Cpu,
    MapPin,
    RadioTower,
    Star,
} from 'lucide-react-native';
import {AppText, Badge, Card, SectionTitle} from '@/components/ui';
import {MissionStatusBadge} from '@/components/mission/MissionBits';
import {AirspaceBadge} from '@/components/operations/OperationsMissionPreflightCard';
import {Verdict} from '@/components/weather/WeatherCard';
import {useI18n} from '@/providers/I18nContext';
import {displayLabel} from '@/shared/lib/presentation';
import type {AirspaceCheckResult} from '@/shared/types/airspace/airspace.types';
import type {Mission, MissionReview} from '@/shared/types/mission/mission.types';
import type {UavTelemetry} from '@/shared/types/uav/telemetry.types';
import type {WeatherAssessment} from '@/shared/types/weather/weather.types';
import {colors, spacing} from '@/styles/tokens';

export function OperationsMissionOverviewCards({
    mission,
    assignedStationLabel,
    assignedUavLabel,
    assignedOperatorLabel,
    liveTelemetry,
    finished,
    hasPoint,
    weather,
    airspaceCheck,
}: {
    mission: Mission;
    assignedStationLabel: string | null;
    assignedUavLabel: string | null;
    assignedOperatorLabel: string | null;
    liveTelemetry?: UavTelemetry;
    finished: boolean;
    hasPoint: boolean;
    weather?: WeatherAssessment;
    airspaceCheck?: AirspaceCheckResult;
}) {
    const {t, formatDate} = useI18n();
    return (
        <>
            <Card>
                <View style={styles.rowBetween}>
                    <AppText variant="caption" style={styles.code}>{mission.code}</AppText>
                    <MissionStatusBadge status={mission.status}/>
                </View>
                <AppText variant="heading">{mission.title}</AppText>
                <View style={styles.pills}>
                    <Badge label={displayLabel(mission.missionType)}/>
                    <Badge
                        label={displayLabel(mission.priority)}
                        background={mission.priority === 'URGENT' ? colors.dangerLight : colors.slateLight}
                        color={mission.priority === 'URGENT' ? colors.danger : colors.slateDark}
                    />
                    {assignedStationLabel && <Badge icon={RadioTower} label={assignedStationLabel}/>}
                    {assignedUavLabel && <Badge icon={Cpu} label={assignedUavLabel}/>}
                </View>
                <View style={styles.metaRow}>
                    <CalendarClock size={16} color={colors.muted}/>
                    <AppText variant="small" style={styles.flex}>
                        {formatDate(mission.startTime)} → {formatDate(mission.expectedEndTime, {timeStyle: 'short'})}
                    </AppText>
                </View>
                <View style={styles.metaRow}>
                    <MapPin size={16} color={colors.muted}/>
                    <AppText variant="small" style={styles.flex}>{mission.locationName || '—'}</AppText>
                </View>
                {assignedOperatorLabel && (
                    <AppText variant="caption">
                        {t('opsMissions.detail.resources.operator')}: {assignedOperatorLabel} ·{' '}
                        {mission.operatorAccepted
                            ? t('opsMissions.detail.assigned.accepted')
                            : t('opsMissions.detail.assigned.notAccepted')}
                    </AppText>
                )}
                {mission.operatorConflictNote ? (
                    <AppText variant="small" style={styles.warningText}>
                        {t('opsMissions.detail.assigned.conflict', {note: mission.operatorConflictNote})}
                    </AppText>
                ) : null}
                {mission.description ? <AppText variant="small">{mission.description}</AppText> : null}
            </Card>

            {mission.status === 'IN_PROGRESS' && (
                <Card>
                    <SectionTitle title={t('mobile.ops.telemetry.title')}/>
                    {liveTelemetry ? (
                        <View style={styles.hudGrid}>
                            <View style={styles.hudItem}>
                                <AppText variant="caption">{t('opsMissions.overview.hud.battery')}</AppText>
                                <AppText variant="title">
                                    {liveTelemetry.batteryPct != null ? `${liveTelemetry.batteryPct}%` : '—'}
                                </AppText>
                            </View>
                            <View style={styles.hudItem}>
                                <AppText variant="caption">{t('opsMissions.overview.hud.altitude')}</AppText>
                                <AppText variant="title">
                                    {liveTelemetry.altitudeAglMeters != null ? `${Math.round(liveTelemetry.altitudeAglMeters)} m` : '—'}
                                </AppText>
                            </View>
                            <View style={styles.hudItem}>
                                <AppText variant="caption">{t('opsMissions.overview.hud.speed')}</AppText>
                                <AppText variant="title">
                                    {liveTelemetry.groundSpeedMs != null ? `${liveTelemetry.groundSpeedMs.toFixed(1)} m/s` : '—'}
                                </AppText>
                            </View>
                            <View style={styles.hudItem}>
                                <AppText variant="caption">RTK</AppText>
                                <AppText variant="title">{liveTelemetry.rtkStatus ?? 'NONE'}</AppText>
                            </View>
                        </View>
                    ) : (
                        <AppText variant="small">{t('opsMissions.overview.hud.noTelemetry')}</AppText>
                    )}
                </Card>
            )}

            {!finished && (hasPoint || airspaceCheck) && (
                <Card>
                    <SectionTitle
                        title={t('mobile.airspace.weatherAndAirspaceTitle')}
                        action={airspaceCheck ? <AirspaceBadge clearance={airspaceCheck.clearance}/> : undefined}
                    />
                    {weather && (
                        <View style={styles.weatherBlock}>
                            <Verdict clearance={weather.clearance}/>
                            <AppText variant="small">{t('weather.preflight.score', {score: weather.safetyScore})}</AppText>
                        </View>
                    )}
                    {airspaceCheck?.violations.map(violation => (
                        <AppText key={violation.zoneId} variant="small">
                            • {violation.code} ({violation.authority}): {violation.message}
                        </AppText>
                    ))}
                    {airspaceCheck && airspaceCheck.violations.length === 0 && (
                        <AppText variant="small">{t('mobile.airspace.noViolations')}</AppText>
                    )}
                </Card>
            )}
        </>
    );
}

export function OperationsCustomerReviewSummaryCard({review}: { review?: MissionReview }) {
    const {t} = useI18n();
    return (
        <Card>
            <SectionTitle
                title={t('capabilities.review.opsTitle')}
                action={
                    review?.reviewed ? (
                        <Badge
                            icon={review.deliverablesAccepted ? CheckCircle2 : undefined}
                            label={
                                review.deliverablesAccepted
                                    ? t('capabilities.review.acceptedBadge')
                                    : t('capabilities.review.pendingBadge')
                            }
                            background={review.deliverablesAccepted ? colors.slateLight : colors.warningLight}
                            color={review.deliverablesAccepted ? colors.slateDark : colors.warning}
                        />
                    ) : undefined
                }
            />
            {!review?.reviewed ? (
                <AppText variant="small">{t('capabilities.review.emptyOps')}</AppText>
            ) : (
                <>
                    <View style={styles.pills}>
                        <Badge
                            icon={Star}
                            label={`${t('capabilities.review.overallRating')}: ${review.overallRating ?? 5}/5`}
                            background={colors.warningLight}
                            color={colors.warning}
                        />
                        <Badge label={`${t('capabilities.review.dataQuality')}: ${review.dataQualityRating ?? 5}/5`}/>
                        <Badge label={`${t('capabilities.review.timeliness')}: ${review.timelinessRating ?? 5}/5`}/>
                    </View>
                    {review.comment ? <AppText variant="small">“{review.comment}”</AppText> : null}
                </>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    code: {fontWeight: '700', color: colors.slate},
    pills: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    warningText: {color: colors.danger, fontWeight: '600'},
    hudGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md},
    hudItem: {minWidth: '45%', gap: 2},
    weatherBlock: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap'},
});
