import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {
    CheckCircle2,
    Cpu,
    Crosshair,
    Phone,
    Radio,
    Sparkles,
    Users,
    XCircle,
} from 'lucide-react-native';
import {AppText, Badge, Button, Card, EmptyState, LoadingState, SectionTitle} from '@/components/ui';
import {SarStatusBadge} from '@/components/operations/SarMissionsScreen';
import {useI18n} from '@/providers/I18nContext';
import {displayLabel} from '@/shared/lib/presentation';
import type {AiDetection, AiTask, SarCockpitMission} from '@/shared/types/sar/sar.types';
import type {UavTelemetry} from '@/shared/types/uav/telemetry.types';
import {isFinitePoint} from '@/utils/operations/map-shapes';
import {colors, radius, spacing} from '@/styles/tokens';

export function SarMissionHeaderCard({
    mission,
    hasLkp,
    hasDrift,
    onOpenMissionDetail,
}: {
    mission: SarCockpitMission;
    hasLkp: boolean;
    hasDrift: boolean;
    onOpenMissionDetail: () => void;
}) {
    const {t} = useI18n();
    return (
        <Card>
            <View style={styles.rowBetween}>
                <AppText variant="caption" style={styles.code}>{mission.missionCode}</AppText>
                <SarStatusBadge status={mission.sarStatus}/>
            </View>
            <AppText variant="heading">{mission.missionTitle}</AppText>

            <View style={styles.pills}>
                {mission.priority ? (
                    <Badge
                        label={displayLabel(mission.priority)}
                        background={mission.priority === 'URGENT' ? colors.dangerLight : colors.slateLight}
                        color={mission.priority === 'URGENT' ? colors.danger : colors.slateDark}
                    />
                ) : null}
                {mission.victimCountEstimated != null && (
                    <Badge
                        icon={Users}
                        label={t('mobile.ops.sar.victimsCount', {count: mission.victimCountEstimated})}
                        background={colors.primaryLight}
                        color={colors.primary}
                    />
                )}
                {mission.uavSerialNumber ? (
                    <Badge
                        icon={Cpu}
                        label={mission.uavModel ? `${mission.uavModel} (${mission.uavSerialNumber})` : mission.uavSerialNumber}
                    />
                ) : null}
                {mission.stationName ? <Badge icon={Radio} label={mission.stationName}/> : null}
            </View>

            <View style={styles.metaRow}>
                <Crosshair size={16} color={colors.primary}/>
                <AppText variant="small" style={styles.flex}>
                    {t('mobile.ops.sar.lkpLabel')}:{' '}
                    {hasLkp ? `${mission.lkpLatitude.toFixed(5)}, ${mission.lkpLongitude.toFixed(5)}` : '—'}
                    {hasDrift ? ` (±${Math.round(mission.driftRadiusMeters!)} m)` : ''}
                </AppText>
            </View>

            {mission.emergencyContact ? (
                <View style={styles.metaRow}>
                    <Phone size={16} color={colors.muted}/>
                    <AppText variant="small" style={styles.flex}>{mission.emergencyContact}</AppText>
                </View>
            ) : null}

            <Button
                label={t('mobile.ops.sar.openMissionDetail')}
                tone="ghost"
                onPress={onOpenMissionDetail}
            />
        </Card>
    );
}

export function SarTelemetryHudCard({
    liveTelemetry,
    latestTask,
}: {
    liveTelemetry?: UavTelemetry | null;
    latestTask: AiTask | null;
}) {
    const {t} = useI18n();
    return (
        <Card>
            <SectionTitle title={t('mobile.ops.sar.hudTitle')}/>
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

            {latestTask && (
                <View style={styles.aiSummary}>
                    <Sparkles size={16} color={colors.primary}/>
                    <AppText variant="caption" style={styles.flex}>
                        {t('mobile.ops.sar.aiNodeLine', {
                            node: latestTask.processingNode,
                            fps: latestTask.fps != null ? latestTask.fps.toFixed(1) : '—',
                            latency: latestTask.inferenceTimeMs != null ? Math.round(latestTask.inferenceTimeMs) : '—',
                        })}
                    </AppText>
                </View>
            )}
        </Card>
    );
}

export function FindingRow({
    detection,
    selected,
    canAct,
    verifying,
    onSelect,
    onVerify,
    onDismiss,
}: {
    detection: AiDetection;
    selected: boolean;
    canAct: boolean;
    verifying: boolean;
    onSelect: () => void;
    onVerify: () => void;
    onDismiss: () => void;
}) {
    const {t, formatDate} = useI18n();
    return (
        <Pressable
            onPress={onSelect}
            accessibilityRole="button"
            style={[styles.detectionCard, selected && styles.detectionSelected]}>
            <View style={styles.rowBetween}>
                <AppText variant="title">
                    {detection.label} · {Math.round(detection.confidence * 100)}%
                </AppText>
                <Badge
                    label={detection.verified ? t('mobile.ops.sar.verifiedBadge') : t('mobile.ops.sar.pendingBadge')}
                    background={detection.verified ? colors.slateDark : colors.warningLight}
                    color={detection.verified ? colors.white : colors.warning}
                />
            </View>
            {isFinitePoint(detection.latitude, detection.longitude) ? (
                <AppText variant="small">
                    {detection.latitude!.toFixed(5)}, {detection.longitude!.toFixed(5)}
                    {detection.trackingId ? ` · #${detection.trackingId}` : ''}
                </AppText>
            ) : null}
            <AppText variant="caption">
                {formatDate(detection.createdAt, {dateStyle: 'short', timeStyle: 'medium'})}
                {detection.verifiedBy ? ` · ${detection.verifiedBy}` : ''}
            </AppText>

            {canAct && (
                <View style={styles.actions}>
                    <Button
                        label={t('mobile.ops.sar.verifyTarget')}
                        icon={CheckCircle2}
                        tone={detection.verified ? 'secondary' : 'primary'}
                        loading={verifying}
                        onPress={onVerify}
                        style={styles.flex}
                    />
                    <Button
                        label={t('mobile.ops.sar.falseAlarm')}
                        icon={XCircle}
                        tone="ghost"
                        loading={verifying}
                        onPress={onDismiss}
                    />
                </View>
            )}
        </Pressable>
    );
}

export function SarDetectionsCard({
    detectionList,
    selectedDetectionId,
    isPending,
    canAct,
    verifying,
    onSelectDetection,
    onVerifyDetection,
    onDismissDetection,
}: {
    detectionList: AiDetection[];
    selectedDetectionId: number | null;
    isPending: boolean;
    canAct: boolean;
    verifying: boolean;
    onSelectDetection: (detectionId: number) => void;
    onVerifyDetection: (detectionId: number) => void;
    onDismissDetection: (detectionId: number) => void;
}) {
    const {t} = useI18n();
    return (
        <Card>
            <SectionTitle
                title={t('mobile.ops.sar.detectionsTitle')}
                action={
                    <Badge
                        label={String(detectionList.length)}
                        background={detectionList.length > 0 ? colors.primaryLight : colors.slateLight}
                        color={detectionList.length > 0 ? colors.primary : colors.slateDark}
                    />
                }
            />
            {isPending ? (
                <LoadingState/>
            ) : detectionList.length === 0 ? (
                <EmptyState icon={Sparkles} message={t('mobile.ops.sar.noDetections')}/>
            ) : (
                detectionList.map(det => (
                    <FindingRow
                        key={det.id}
                        detection={det}
                        selected={selectedDetectionId === det.id}
                        canAct={canAct}
                        verifying={verifying}
                        onSelect={() => onSelectDetection(det.id)}
                        onVerify={() => onVerifyDetection(det.id)}
                        onDismiss={() => onDismissDetection(det.id)}
                    />
                ))
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    code: {fontWeight: '700', letterSpacing: 0.5},
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    hudGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md},
    hudItem: {
        flexBasis: '45%',
        flexGrow: 1,
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        padding: spacing.sm,
        gap: 2,
    },
    aiSummary: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs},
    detectionCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.control,
        padding: spacing.md,
        gap: spacing.xs,
        backgroundColor: colors.surface,
    },
    detectionSelected: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs},
});
