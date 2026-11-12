import React, {useState} from 'react';
import {Linking, Platform, Pressable, StyleSheet, View} from 'react-native';
import {
    CheckCircle2,
    CheckSquare,
    ChevronRight,
    Cpu,
    ExternalLink,
    MapPin,
    Play,
    Radio,
    Square,
} from 'lucide-react-native';
import {AppText, Badge, Button, Card, TextField} from '@/components/ui';
import {canSubmitMaintenanceCompletion} from '@/forms/operations/field-report-form';
import {useI18n} from '@/providers/I18nContext';
import type {OrderStatus, RepairOrder} from '@/shared/types/maintenance/maintenance.types';
import type {FleetStation, FleetUav, UavStatus} from '@/shared/types/uav/fleet-map.types';
import type {UavTelemetry} from '@/shared/types/uav/telemetry.types';
import {calendarDate, formatVnd, orderControls} from '@/shared/utils/maintenance/workflows';
import {isFinitePoint} from '@/utils/operations/map-shapes';
import {colors, radius, spacing} from '@/styles/tokens';

export function UavStatusBadge({status}: { status: UavStatus }) {
    const {t} = useI18n();
    const labelMap: Record<UavStatus, string> = {
        AVAILABLE: t('mobile.ops.fleet.uavStatus.AVAILABLE'),
        ASSIGNED: t('mobile.ops.fleet.uavStatus.ASSIGNED'),
        IN_USE: t('mobile.ops.fleet.uavStatus.IN_USE'),
        MAINTENANCE: t('mobile.ops.fleet.uavStatus.MAINTENANCE'),
        INACTIVE: t('mobile.ops.fleet.uavStatus.INACTIVE'),
    };
    const toneMap: Record<UavStatus, { background: string; color: string }> = {
        AVAILABLE: {background: colors.slateLight, color: colors.slateDark},
        ASSIGNED: {background: colors.primaryLight, color: colors.primary},
        IN_USE: {background: colors.slateDark, color: colors.white},
        MAINTENANCE: {background: colors.warningLight, color: colors.warning},
        INACTIVE: {background: colors.dangerLight, color: colors.danger},
    };
    const tone = toneMap[status] ?? toneMap.AVAILABLE;
    return <Badge label={labelMap[status] ?? status} background={tone.background} color={tone.color}/>;
}

export function OrderStatusBadge({status}: { status: OrderStatus }) {
    const {t} = useI18n();
    const labelMap: Record<OrderStatus, string> = {
        OPEN: t('mobile.ops.maintenance.status.OPEN'),
        IN_PROGRESS: t('mobile.ops.maintenance.status.IN_PROGRESS'),
        COMPLETED: t('mobile.ops.maintenance.status.COMPLETED'),
        CANCELLED: t('mobile.ops.maintenance.status.CANCELLED'),
    };
    const toneMap: Record<OrderStatus, { background: string; color: string }> = {
        OPEN: {background: colors.warningLight, color: colors.warning},
        IN_PROGRESS: {background: colors.primaryLight, color: colors.primary},
        COMPLETED: {background: colors.slateDark, color: colors.white},
        CANCELLED: {background: colors.slateLight, color: colors.textSecondary},
    };
    const tone = toneMap[status];
    return <Badge label={labelMap[status]} background={tone.background} color={tone.color}/>;
}

export function FleetUavCard({
    uav,
    sample,
    onOpenMission,
}: {
    uav: FleetUav;
    sample?: UavTelemetry;
    onOpenMission: (missionId: number) => void;
}) {
    const {t} = useI18n();
    return (
        <Card>
            <View style={styles.rowBetween}>
                <View style={styles.titleStack}>
                    <AppText variant="title">{uav.model}</AppText>
                    <AppText variant="caption" style={styles.code}>{uav.serialNumber}</AppText>
                </View>
                <UavStatusBadge status={uav.status}/>
            </View>

            <View style={styles.pills}>
                {uav.manufacturer ? <Badge label={uav.manufacturer}/> : null}
                {uav.stationName ? <Badge icon={Radio} label={uav.stationName}/> : null}
            </View>

            {sample ? (
                <View style={styles.telemetryStrip}>
                    <AppText variant="caption">
                        {t('opsMissions.overview.hud.battery')}: {sample.batteryPct != null ? `${sample.batteryPct}%` : '—'}
                    </AppText>
                    <AppText variant="caption">
                        {t('opsMissions.overview.hud.altitude')}:{' '}
                        {sample.altitudeAglMeters != null ? `${Math.round(sample.altitudeAglMeters)} m` : '—'}
                    </AppText>
                    <AppText variant="caption">
                        {t('opsMissions.overview.hud.speed')}:{' '}
                        {sample.groundSpeedMs != null ? `${sample.groundSpeedMs.toFixed(1)} m/s` : '—'}
                    </AppText>
                    <AppText variant="caption">RTK: {sample.rtkStatus ?? 'NONE'}</AppText>
                </View>
            ) : null}

            {uav.activeMission ? (
                <Pressable
                    onPress={() => onOpenMission(uav.activeMission!.id)}
                    accessibilityRole="button"
                    style={styles.missionBanner}>
                    <View style={styles.flex}>
                        <AppText variant="caption" style={styles.code}>{uav.activeMission.code}</AppText>
                        <AppText variant="small" numberOfLines={1}>{uav.activeMission.title}</AppText>
                    </View>
                    <ChevronRight size={16} color={colors.primary}/>
                </Pressable>
            ) : null}
        </Card>
    );
}

export function FleetStationCard({station}: { station: FleetStation }) {
    const {t} = useI18n();
    const hasCoords = isFinitePoint(station.latitude, station.longitude);

    const openMaps = () => {
        if (!hasCoords) return;
        const label = encodeURIComponent(`${station.code} ${station.name}`);
        const url =
            Platform.OS === 'ios'
                ? `maps:?q=${label}&ll=${station.latitude},${station.longitude}`
                : `geo:${station.latitude},${station.longitude}?q=${station.latitude},${station.longitude}(${label})`;
        void Linking.openURL(url);
    };

    return (
        <Card>
            <View style={styles.rowBetween}>
                <AppText variant="caption" style={styles.code}>{station.code}</AppText>
                <Badge
                    icon={Cpu}
                    label={t('mobile.ops.fleet.stationUavCount', {count: station.uavCount})}
                    background={colors.slateLight}
                    color={colors.slateDark}
                />
            </View>
            <AppText variant="title">{station.name}</AppText>
            {station.status ? <AppText variant="caption">{station.status}</AppText> : null}
            {hasCoords && (
                <Pressable onPress={openMaps} accessibilityRole="button" style={styles.mapLink}>
                    <MapPin size={14} color={colors.muted}/>
                    <AppText variant="small" style={styles.flex}>
                        {station.latitude!.toFixed(5)}, {station.longitude!.toFixed(5)}
                    </AppText>
                    <ExternalLink size={14} color={colors.primary}/>
                </Pressable>
            )}
        </Card>
    );
}

export function RepairOrderCard({
    order,
    canUpdate,
    startLoading,
    completeLoading,
    onStart,
    onComplete,
}: {
    order: RepairOrder;
    canUpdate: boolean;
    startLoading: boolean;
    completeLoading: boolean;
    onStart: () => void;
    onComplete: (notes: string, passed: boolean, onDone: () => void) => void;
}) {
    const {t, locale} = useI18n();
    const controls = orderControls(order.status, canUpdate);
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [inspectionNotes, setInspectionNotes] = useState('');
    const [inspectionPassed, setInspectionPassed] = useState(true);

    const intlLocale = locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN';
    const costLabel = /^\d+$/.test(order.totalMaterialCost)
        ? formatVnd(order.totalMaterialCost, undefined, intlLocale)
        : t('mobile.ops.maintenance.undeterminedCost');
    const plannedLabel = order.plannedDate
        ? calendarDate(order.plannedDate, undefined, intlLocale)
        : '—';

    return (
        <Card>
            <View style={styles.rowBetween}>
                <AppText variant="caption" style={styles.code}>{order.uavSerialNumber}</AppText>
                <OrderStatusBadge status={order.status}/>
            </View>

            <AppText variant="title">{order.title}</AppText>
            {order.description ? <AppText variant="small">{order.description}</AppText> : null}

            <View style={styles.metaGrid}>
                <AppText variant="caption">
                    {t('mobile.ops.maintenance.technician')}: {order.technicianName || '—'}
                </AppText>
                <AppText variant="caption">
                    {t('mobile.ops.maintenance.plannedDate')}: {plannedLabel}
                </AppText>
                <AppText variant="caption">
                    {t('mobile.ops.maintenance.materialCost')}: {costLabel}
                </AppText>
            </View>

            {order.inspectionNotes ? (
                <AppText variant="small">
                    {t('mobile.ops.maintenance.inspectionNotesLabel')}: {order.inspectionNotes}
                </AppText>
            ) : null}

            {controls.start && (
                <Button
                    label={t('mobile.ops.maintenance.startRepair')}
                    icon={Play}
                    loading={startLoading}
                    onPress={onStart}
                />
            )}

            {controls.complete && !showCompleteForm && (
                <Button
                    label={t('mobile.ops.maintenance.completeInspection')}
                    icon={CheckCircle2}
                    tone="secondary"
                    onPress={() => setShowCompleteForm(true)}
                />
            )}

            {controls.complete && showCompleteForm && (
                <View style={styles.inlineForm}>
                    <TextField
                        label={t('mobile.ops.maintenance.inspectionNotesLabel')}
                        placeholder={t('mobile.ops.maintenance.inspectionNotesPlaceholder')}
                        value={inspectionNotes}
                        onChangeText={setInspectionNotes}
                        multiline
                    />
                    <Pressable
                        onPress={() => setInspectionPassed(current => !current)}
                        accessibilityRole="checkbox"
                        accessibilityState={{checked: inspectionPassed}}
                        style={styles.checkRow}>
                        {inspectionPassed ? (
                            <CheckSquare size={20} color={colors.primary}/>
                        ) : (
                            <Square size={20} color={colors.slate}/>
                        )}
                        <AppText variant="small" style={styles.flex}>
                            {t('mobile.ops.maintenance.inspectionPassedCheck')}
                        </AppText>
                    </Pressable>
                    <View style={styles.actions}>
                        <Button
                            label={t('mobile.ops.maintenance.submitInspection')}
                            icon={CheckCircle2}
                            loading={completeLoading}
                            disabled={!canSubmitMaintenanceCompletion(inspectionNotes, inspectionPassed)}
                            onPress={() =>
                                onComplete(inspectionNotes, inspectionPassed, () => {
                                    setInspectionNotes('');
                                    setShowCompleteForm(false);
                                })
                            }
                            style={styles.flex}
                        />
                        <Button label={t('common.cancel')} tone="ghost" onPress={() => setShowCompleteForm(false)}/>
                    </View>
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    titleStack: {flex: 1, gap: 2},
    code: {fontWeight: '700', letterSpacing: 0.5},
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    telemetryStrip: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        padding: spacing.sm,
    },
    missionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.primaryLight,
    },
    mapLink: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    metaGrid: {gap: 2},
    inlineForm: {
        gap: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    checkRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
});
