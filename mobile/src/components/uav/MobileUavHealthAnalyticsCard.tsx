import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Activity, AlertTriangle, BatteryCharging, CheckCircle2, Cpu, Wrench} from 'lucide-react-native';
import {AppText, Badge, Card, LoadingState, SectionTitle} from '@/components/ui';
import {useUavHealthAnalytics} from '@/hooks/uav/useFleetAndMaintenance';
import type {UavHealthProfile} from '@/shared/types/uav/telemetry.types';
import {colors, radius, spacing} from '@/styles/tokens';

interface Props {
    selectedUavId?: number | null;
    onSelectUav?: (profile: UavHealthProfile) => void;
}

const AIRFRAME_LABELS: Record<UavHealthProfile['airframeClass'], string> = {
    QUADCOPTER_RTK: '4 Cánh RTK',
    HEXACOPTER_SAR: '6 Cánh SAR',
    VTOL_FIXED_WING: 'VTOL Cánh bằng',
};

export function MobileUavHealthAnalyticsCard({selectedUavId, onSelectUav}: Props) {
    const query = useUavHealthAnalytics();
    if (query.isPending) {
        return (
            <Card>
                <LoadingState label="Đang tải phân tích sức khỏe đội bay (SOH)..."/>
            </Card>
        );
    }
    if (!query.data) return null;

    const {totalFleetCount, optimalCount, attentionCount, criticalCount, averageHealthScore, profiles} = query.data;

    return (
        <Card>
            <SectionTitle
                title="Phân tích Sức khỏe Đội bay (SOH)"
                action={
                    <Badge
                        icon={Activity}
                        label={`TB ${Math.round(averageHealthScore)}%`}
                        background={colors.primaryLight}
                        color={colors.primary}
                    />
                }
            />

            <View style={styles.kpiRow}>
                <View style={styles.kpiBox}>
                    <AppText variant="caption">Tổng đội bay</AppText>
                    <AppText variant="title">{totalFleetCount}</AppText>
                </View>
                <View style={styles.kpiBox}>
                    <AppText variant="caption">Sẵn sàng tốt</AppText>
                    <AppText variant="title">{optimalCount}</AppText>
                </View>
                <View style={styles.kpiBox}>
                    <AppText variant="caption">Cần lưu ý</AppText>
                    <AppText variant="title">{attentionCount}</AppText>
                </View>
                <View style={styles.kpiBox}>
                    <AppText variant="caption">Rủi ro cao</AppText>
                    <AppText variant="title">{criticalCount}</AppText>
                </View>
            </View>

            {profiles.map(profile => {
                const isCritical = profile.healthTier === 'CRITICAL';
                const isWarn = profile.healthTier === 'ATTENTION';
                const isSelected = selectedUavId === profile.uavId;
                return (
                    <Pressable
                        key={profile.uavId}
                        onPress={() => onSelectUav?.(profile)}
                        accessibilityRole="button"
                        style={[styles.profileCard, isSelected && styles.profileCardSelected]}>
                        <View style={styles.rowBetween}>
                            <View style={styles.flex}>
                                <AppText variant="small" style={styles.bold}>
                                    {profile.serialNumber} · {profile.model}
                                </AppText>
                                <AppText variant="caption">
                                    {AIRFRAME_LABELS[profile.airframeClass]} · {profile.rotorCount} cánh · Tải {profile.maxPayloadKg} kg
                                </AppText>
                            </View>
                            <Badge
                                icon={isCritical || isWarn ? AlertTriangle : CheckCircle2}
                                label={`SOH ${Math.round(profile.healthScore)}%`}
                                background={isCritical ? colors.dangerLight : isWarn ? colors.warningLight : colors.slateLight}
                                color={isCritical ? colors.danger : isWarn ? colors.warning : colors.slateDark}
                            />
                        </View>

                        <View style={styles.metricsRow}>
                            <Badge
                                icon={BatteryCharging}
                                label={`Pin ${Math.round(profile.batteryStateOfHealthPct)}% (${profile.estimatedBatteryCycles} chu kỳ)`}
                            />
                            <Badge
                                icon={Cpu}
                                label={`Động cơ ${Math.round(profile.motorHealthPct)}%`}
                            />
                            <Badge
                                icon={Wrench}
                                label={`Còn ~${profile.predictedRemainingHours.toFixed(0)}h bay`}
                            />
                        </View>

                        <AppText variant="caption">{profile.recommendation}</AppText>
                    </Pressable>
                );
            })}
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    bold: {fontWeight: '700', color: colors.text},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    kpiRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    kpiBox: {
        flexBasis: '22%',
        flexGrow: 1,
        padding: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
        gap: 2,
    },
    profileCard: {
        padding: spacing.sm,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        gap: spacing.xs,
    },
    profileCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    metricsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
});
