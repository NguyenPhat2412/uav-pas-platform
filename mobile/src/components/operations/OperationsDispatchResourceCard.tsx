import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Cpu, RadioTower, Sparkles, UserCheck} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ChipGroup, SectionTitle} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {Mission, MissionDispatchCandidates} from '@/shared/types/mission/mission.types';
import type {Operator} from '@/shared/types/resources';
import type {FleetStation, FleetUav} from '@/shared/types/uav/fleet-map.types';
import {colors, radius, spacing} from '@/styles/tokens';

export interface OperationsDispatchResourceCardProps {
    mission: Mission;
    stations: FleetStation[];
    uavs: FleetUav[];
    operators: Operator[];
    assignedStationLabel: string | null;
    assignedUavLabel: string | null;
    assignedOperatorLabel: string | null;
    dispatchCandidates?: MissionDispatchCandidates;
    canAssignStation: boolean;
    canAssignUav: boolean;
    canAssignOperator: boolean;
    canReserveEquipment: boolean;
    autoAssignLoading: boolean;
    assignStationLoading: boolean;
    assignUavLoading: boolean;
    assignOperatorLoading: boolean;
    onAutoAssign: () => void;
    onAssignStation: (stationId: number, onDone: () => void) => void;
    onAssignUav: (uavId: number, onDone: () => void) => void;
    onAssignOperator: (operatorId: number, onDone: () => void) => void;
}

export function OperationsDispatchResourceCard({
    mission,
    stations,
    uavs,
    operators,
    assignedStationLabel,
    assignedUavLabel,
    assignedOperatorLabel,
    dispatchCandidates,
    canAssignStation,
    canAssignUav,
    canAssignOperator,
    canReserveEquipment,
    autoAssignLoading,
    assignStationLoading,
    assignUavLoading,
    assignOperatorLoading,
    onAutoAssign,
    onAssignStation,
    onAssignUav,
    onAssignOperator,
}: OperationsDispatchResourceCardProps) {
    const {t} = useI18n();
    const [selectedStationId, setSelectedStationId] = useState<string>('');
    const [selectedUavId, setSelectedUavId] = useState<string>('');
    const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');

    const effectiveStationChoice = selectedStationId || (mission.stationId != null ? String(mission.stationId) : '');
    const effectiveUavChoice = selectedUavId || (mission.uavId != null ? String(mission.uavId) : '');
    const effectiveOperatorChoice = selectedOperatorId || (mission.operatorId != null ? String(mission.operatorId) : '');

    const assignableStations = stations.filter(s => s.status !== 'INACTIVE' || s.id === mission.stationId);
    const assignableUavs = uavs.filter(u => {
        if (u.id === mission.uavId) return true;
        if (u.status !== 'AVAILABLE') return false;
        const filterStationId = effectiveStationChoice ? Number(effectiveStationChoice) : mission.stationId;
        return filterStationId == null || u.stationId == null || u.stationId === filterStationId;
    });
    const assignableOperators = operators.filter(op => op.status === 'ACTIVE' || op.id === mission.operatorId);

    const topStation = dispatchCandidates?.stations.find(s => s.id === dispatchCandidates.recommendedStationId);
    const topUav = dispatchCandidates?.uavs.find(u => u.id === dispatchCandidates.recommendedUavId);
    const topOp = dispatchCandidates?.operators.find(o => o.id === dispatchCandidates.recommendedOperatorId);

    return (
        <Card>
            <SectionTitle title={t('mobile.ops.dispatch.title')}/>

            {dispatchCandidates && (
                <View style={styles.smartBox}>
                    <AppText variant="small" style={styles.dispatchLabel}>
                        {t('capabilities.smartDispatch.title')}
                    </AppText>
                    <AppText variant="caption">{t('capabilities.smartDispatch.subtitle')}</AppText>
                    <View style={styles.pills}>
                        {topStation && (
                            <Badge
                                label={`${topStation.code} (${topStation.score})`}
                                background={colors.surface}
                                color={colors.slateDark}
                            />
                        )}
                        {topUav && (
                            <Badge
                                label={`${topUav.serialNumber} (${topUav.score})`}
                                background={colors.surface}
                                color={colors.slateDark}
                            />
                        )}
                        {topOp && (
                            <Badge
                                label={`@${topOp.username} (${topOp.score})`}
                                background={colors.surface}
                                color={colors.slateDark}
                            />
                        )}
                    </View>
                    {dispatchCandidates.canAutoAssign &&
                        (canAssignStation || canAssignUav || canAssignOperator || canReserveEquipment) && (
                            <Button
                                label={
                                    autoAssignLoading
                                        ? t('capabilities.smartDispatch.autoAssigning')
                                        : t('capabilities.smartDispatch.autoAssign')
                                }
                                icon={Sparkles}
                                loading={autoAssignLoading}
                                onPress={onAutoAssign}
                            />
                        )}
                </View>
            )}

            <View style={styles.dispatchSection}>
                <AppText variant="small" style={styles.dispatchLabel}>
                    {t('mobile.ops.dispatch.station')}: {assignedStationLabel ?? t('mobile.ops.dispatch.unassigned')}
                </AppText>
                {canAssignStation && assignableStations.length > 0 && (
                    <>
                        <ChipGroup
                            value={effectiveStationChoice}
                            onChange={setSelectedStationId}
                            options={assignableStations.map(st => ({
                                value: String(st.id),
                                label: `${st.code} · ${st.name}`,
                            }))}
                        />
                        <Button
                            label={t('mobile.ops.dispatch.assignStation')}
                            icon={RadioTower}
                            tone="secondary"
                            disabled={!effectiveStationChoice || Number(effectiveStationChoice) === mission.stationId}
                            loading={assignStationLoading}
                            onPress={() => onAssignStation(Number(effectiveStationChoice), () => setSelectedStationId(''))}
                        />
                    </>
                )}
            </View>

            <View style={styles.dispatchSection}>
                <AppText variant="small" style={styles.dispatchLabel}>
                    {t('mobile.ops.dispatch.uav')}: {assignedUavLabel ?? t('mobile.ops.dispatch.unassigned')}
                </AppText>
                {canAssignUav && assignableUavs.length > 0 && (
                    <>
                        <ChipGroup
                            value={effectiveUavChoice}
                            onChange={setSelectedUavId}
                            options={assignableUavs.map(u => ({
                                value: String(u.id),
                                label: `${u.serialNumber} · ${u.model}`,
                            }))}
                        />
                        <Button
                            label={t('mobile.ops.dispatch.assignUav')}
                            icon={Cpu}
                            tone="secondary"
                            disabled={!effectiveUavChoice || Number(effectiveUavChoice) === mission.uavId}
                            loading={assignUavLoading}
                            onPress={() => onAssignUav(Number(effectiveUavChoice), () => setSelectedUavId(''))}
                        />
                    </>
                )}
            </View>

            <View style={styles.dispatchSection}>
                <AppText variant="small" style={styles.dispatchLabel}>
                    {t('mobile.ops.dispatch.operator')}: {assignedOperatorLabel ?? t('mobile.ops.dispatch.unassigned')}
                </AppText>
                {canAssignOperator && assignableOperators.length > 0 && (
                    <>
                        <ChipGroup
                            value={effectiveOperatorChoice}
                            onChange={setSelectedOperatorId}
                            options={assignableOperators.map(op => ({
                                value: String(op.id),
                                label: `${op.fullName || op.username} (@${op.username})`,
                            }))}
                        />
                        <Button
                            label={t('mobile.ops.dispatch.assignOperator')}
                            icon={UserCheck}
                            tone="secondary"
                            disabled={!effectiveOperatorChoice || Number(effectiveOperatorChoice) === mission.operatorId}
                            loading={assignOperatorLoading}
                            onPress={() => onAssignOperator(Number(effectiveOperatorChoice), () => setSelectedOperatorId(''))}
                        />
                    </>
                )}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    smartBox: {
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
    },
    dispatchSection: {
        gap: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    dispatchLabel: {fontWeight: '600', color: colors.text},
});
