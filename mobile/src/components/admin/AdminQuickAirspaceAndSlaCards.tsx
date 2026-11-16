import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Clock, Power, ShieldAlert, Wrench} from 'lucide-react-native';
import {AppText, Badge, Button, Card, EmptyState, ErrorState, LoadingState, SectionTitle} from '@/components/ui';
import {signInErrorText} from '@/forms/auth/sign-in-flow';
import {useI18n} from '@/providers/I18nContext';
import {businessToday} from '@/shared/utils/maintenance/workflows';
import type {AirspaceZone} from '@/shared/types/airspace/airspace.types';
import type {SlaIntelligenceData} from '@/shared/types/admin';
import {colors, radius, spacing} from '@/styles/tokens';

function nextPreventiveDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return businessToday(tomorrow);
}

export function AdminAirspaceTabContent({
    isPending,
    isError,
    error,
    zones,
    togglingZoneId,
    onRetry,
    onToggleZone,
}: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    zones?: AirspaceZone[];
    togglingZoneId?: number;
    onRetry: () => void;
    onToggleZone: (zone: AirspaceZone) => void;
}) {
    const {t, formatDate} = useI18n();
    if (isPending) return <LoadingState/>;
    if (isError) {
        return (
            <ErrorState
                message={signInErrorText(error, t)}
                retryLabel={t('common.retry')}
                onRetry={onRetry}
            />
        );
    }
    if (!zones?.length) {
        return <EmptyState icon={ShieldAlert} message={t('mobile.adminQuick.airspace.empty')}/>;
    }

    return (
        <>
            {zones.map(zone => {
                const toggling = togglingZoneId === zone.id;
                const isProhibited = zone.zoneType === 'PROHIBITED';
                return (
                    <Card key={zone.id}>
                        <View style={styles.rowBetween}>
                            <AppText variant="title" style={styles.flex} numberOfLines={1}>
                                {zone.code} · {zone.name}
                            </AppText>
                            <Badge
                                label={
                                    zone.active
                                        ? t('mobile.adminQuick.airspace.activeBadge')
                                        : t('mobile.adminQuick.airspace.inactiveBadge')
                                }
                                background={zone.active ? colors.slateDark : colors.slateLight}
                                color={zone.active ? colors.white : colors.textSecondary}
                            />
                        </View>
                        <View style={styles.pills}>
                            <Badge
                                label={zone.zoneType}
                                background={isProhibited ? colors.dangerLight : colors.warningLight}
                                color={isProhibited ? colors.danger : colors.warning}
                            />
                            {zone.maxAltitudeAglM != null && <Badge label={`≤ ${zone.maxAltitudeAglM} m AGL`}/>}
                            {(zone.effectiveFrom || zone.effectiveUntil) && (
                                <Badge
                                    icon={Clock}
                                    label={t('capabilities.notam.scheduledBadge')}
                                    background={colors.warningLight}
                                    color={colors.warning}
                                />
                            )}
                        </View>
                        {(zone.effectiveFrom || zone.effectiveUntil) && (
                            <AppText variant="caption">
                                {t('capabilities.notam.windowSummary', {
                                    from: zone.effectiveFrom ? formatDate(zone.effectiveFrom) : '—',
                                    until: zone.effectiveUntil ? formatDate(zone.effectiveUntil) : '—',
                                })}
                            </AppText>
                        )}
                        <AppText variant="small">{zone.authority}</AppText>
                        {zone.description ? <AppText variant="caption">{zone.description}</AppText> : null}
                        <Button
                            label={
                                zone.active
                                    ? t('mobile.adminQuick.airspace.deactivate')
                                    : t('mobile.adminQuick.airspace.activate')
                            }
                            icon={Power}
                            tone={zone.active ? 'secondary' : 'primary'}
                            loading={toggling}
                            onPress={() => onToggleZone(zone)}
                        />
                    </Card>
                );
            })}
        </>
    );
}

export function AdminSlaTabContent({
    isPending,
    isError,
    error,
    data,
    canCreateMaintenance,
    creatingUavId,
    defaultTechnicianName,
    onRetry,
    onCreatePreventiveOrder,
}: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data?: SlaIntelligenceData;
    canCreateMaintenance: boolean;
    creatingUavId?: number;
    defaultTechnicianName: string;
    onRetry: () => void;
    onCreatePreventiveOrder: (
        uavId: number,
        serialNumber: string,
        fields: { title: string; description: string; plannedDate: string; technicianName: string },
    ) => void;
}) {
    const {t, formatNumber} = useI18n();
    if (isPending) return <LoadingState/>;
    if (isError || !data) {
        return (
            <ErrorState
                message={signInErrorText(error, t)}
                retryLabel={t('common.retry')}
                onRetry={onRetry}
            />
        );
    }

    return (
        <>
            <Card>
                <SectionTitle title={t('capabilities.sla.title')}/>
                <AppText variant="caption">{t('capabilities.sla.subtitle')}</AppText>
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiCell}>
                        <AppText variant="caption">{t('capabilities.sla.kpis.confirmTurnaround')}</AppText>
                        <AppText variant="title">
                            {t('capabilities.sla.kpis.minutesUnit', {min: formatNumber(data.avgConfirmationMinutes)})}
                        </AppText>
                    </View>
                    <View style={styles.kpiCell}>
                        <AppText variant="caption">{t('capabilities.sla.kpis.onTimeRate')}</AppText>
                        <AppText variant="title">{formatNumber(data.onTimeCompletionRate)}%</AppText>
                    </View>
                    <View style={styles.kpiCell}>
                        <AppText variant="caption">{t('capabilities.sla.kpis.preflightRate')}</AppText>
                        <AppText variant="title">{formatNumber(data.preflightComplianceRate)}%</AppText>
                    </View>
                    <View style={styles.kpiCell}>
                        <AppText variant="caption">{t('capabilities.sla.kpis.customerRating')}</AppText>
                        <AppText variant="title">
                            {data.avgCustomerRating != null ? `★ ${data.avgCustomerRating.toFixed(1)}/5` : '—'}
                        </AppText>
                    </View>
                </View>
            </Card>

            <Card>
                <SectionTitle
                    title={t('capabilities.sla.riskTitle')}
                    action={
                        <Badge
                            label={t('capabilities.sla.riskSummary', {
                                overdue: data.overdueUavCount,
                                dueSoon: data.dueSoonUavCount,
                            })}
                            background={colors.warningLight}
                            color={colors.warning}
                        />
                    }
                />
                {data.fleetMaintenanceRisks.map(row => {
                    const riskKey =
                        row.riskLevel === 'OVERDUE' || row.riskLevel === 'DUE_SOON' || row.riskLevel === 'NORMAL'
                            ? row.riskLevel
                            : 'NORMAL';
                    const isOverdue = riskKey === 'OVERDUE';
                    const isDueSoon = riskKey === 'DUE_SOON';
                    const creating = creatingUavId === row.uavId;
                    return (
                        <View key={row.uavId} style={styles.riskRow}>
                            <View style={styles.rowBetween}>
                                <AppText variant="title" style={styles.flex}>
                                    {row.serialNumber} · {row.model}
                                </AppText>
                                <Badge
                                    label={`${t(`capabilities.sla.riskLevels.${riskKey}`)} (${row.riskScore})`}
                                    background={isOverdue ? colors.dangerLight : isDueSoon ? colors.warningLight : colors.slateLight}
                                    color={isOverdue ? colors.danger : isDueSoon ? colors.warning : colors.slateDark}
                                />
                            </View>
                            <AppText variant="caption">{row.recommendation}</AppText>
                            {row.hasOpenRepairOrder ? (
                                <Badge
                                    label={t('capabilities.sla.openOrderExists')}
                                    background={colors.slateLight}
                                    color={colors.slateDark}
                                />
                            ) : riskKey !== 'NORMAL' && canCreateMaintenance ? (
                                <Button
                                    label={creating ? t('capabilities.sla.creatingOrder') : t('capabilities.sla.createPreventiveOrder')}
                                    icon={Wrench}
                                    tone="secondary"
                                    loading={creating}
                                    onPress={() =>
                                        onCreatePreventiveOrder(row.uavId, row.serialNumber, {
                                            title: `${t('capabilities.sla.createPreventiveOrder')} — ${row.serialNumber}`.slice(0, 160),
                                            description: row.recommendation.slice(0, 2000),
                                            plannedDate: nextPreventiveDate(),
                                            technicianName: defaultTechnicianName.slice(0, 120),
                                        })
                                    }
                                />
                            ) : null}
                        </View>
                    );
                })}
            </Card>
        </>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    kpiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    kpiCell: {
        flexBasis: '47%',
        flexGrow: 1,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
        padding: spacing.sm,
        gap: 2,
    },
    riskRow: {
        gap: spacing.xs,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
});
