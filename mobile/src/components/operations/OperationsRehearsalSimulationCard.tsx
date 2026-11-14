import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
    Home,
    Pause,
    Play,
    Radio,
} from 'lucide-react-native';
import {AppText, Badge, Button, Card, SectionTitle} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {Mission} from '@/shared/types/mission/mission.types';
import type {SimCommand, SimulationRunLog, SimulationState} from '@/shared/types/simulation/simulation.types';
import {colors, radius, spacing} from '@/styles/tokens';

export interface OperationsRehearsalSimulationCardProps {
    mission: Mission;
    activeSim?: SimulationState;
    latestRun?: SimulationRunLog;
    canFlySim: boolean;
    simBusy: boolean;
    rehearsing: boolean;
    onCommand: (uavId: number, command: SimCommand) => void;
    onStop: (uavId: number) => void;
    onRehearse: () => void;
}

export function OperationsRehearsalSimulationCard({
    mission,
    activeSim,
    latestRun,
    canFlySim,
    simBusy,
    rehearsing,
    onCommand,
    onStop,
    onRehearse,
}: OperationsRehearsalSimulationCardProps) {
    const {t} = useI18n();
    return (
        <Card>
            <SectionTitle
                title={t('simulation.rehearseTitle')}
                action={
                    activeSim ? (
                        <Badge
                            icon={Radio}
                            label={t(`simulation.modes.${activeSim.mode}`)}
                            background={colors.primaryLight}
                            color={colors.primary}
                        />
                    ) : latestRun ? (
                        <Badge
                            label={t(`simulation.runStatus.${latestRun.status}`)}
                            background={colors.slateLight}
                            color={colors.slateDark}
                        />
                    ) : undefined
                }
            />
            {activeSim ? (
                <>
                    <AppText variant="small" style={styles.code}>
                        {activeSim.uavCode}
                    </AppText>
                    <View style={styles.hudGrid}>
                        <View style={styles.hudItem}>
                            <AppText variant="caption">{t('simulation.hud.altitude')}</AppText>
                            <AppText variant="title">{Math.round(activeSim.altitudeMeters)} m</AppText>
                        </View>
                        <View style={styles.hudItem}>
                            <AppText variant="caption">{t('simulation.hud.speed')}</AppText>
                            <AppText variant="title">{activeSim.groundSpeedMs.toFixed(1)} m/s</AppText>
                        </View>
                        <View style={styles.hudItem}>
                            <AppText variant="caption">{t('simulation.hud.battery')}</AppText>
                            <AppText variant="title">{Math.round(activeSim.batteryPct)}%</AppText>
                        </View>
                        <View style={styles.hudItem}>
                            <AppText variant="caption">{t('simulation.hud.waypoint')}</AppText>
                            <AppText variant="title">
                                {Math.min(activeSim.nextWaypoint, activeSim.waypointCount)}/{activeSim.waypointCount}
                            </AppText>
                        </View>
                    </View>
                    {canFlySim && (
                        <View style={styles.actions}>
                            {activeSim.mode === 'HOLD' ? (
                                <Button
                                    size="sm"
                                    label={t('simulation.resume')}
                                    icon={Play}
                                    disabled={simBusy}
                                    onPress={() => onCommand(activeSim.uavId, 'RESUME')}
                                    style={styles.simBtn}
                                />
                            ) : (
                                <Button
                                    size="sm"
                                    label={t('simulation.pause')}
                                    icon={Pause}
                                    tone="secondary"
                                    disabled={simBusy || !['MISSION', 'RETURN_TO_HOME'].includes(activeSim.mode)}
                                    onPress={() => onCommand(activeSim.uavId, 'PAUSE')}
                                    style={styles.simBtn}
                                />
                            )}
                            <Button
                                size="sm"
                                label={t('simulation.rth')}
                                icon={Home}
                                tone="secondary"
                                disabled={simBusy || ['RETURN_TO_HOME', 'LANDING', 'LANDED'].includes(activeSim.mode)}
                                onPress={() => onCommand(activeSim.uavId, 'RETURN_TO_HOME')}
                                style={styles.simBtn}
                            />
                            <Button
                                size="sm"
                                label={t('simulation.stop')}
                                tone="ghost"
                                disabled={simBusy}
                                onPress={() => onStop(activeSim.uavId)}
                                style={styles.simStopBtn}
                            />
                        </View>
                    )}
                </>
            ) : (
                <>
                    <AppText variant="small">{t('simulation.subtitle')}</AppText>
                    {latestRun?.outcomeSummary ? (
                        <View style={styles.smartBox}>
                            <AppText variant="caption" style={styles.code}>
                                {latestRun.uavCode}
                            </AppText>
                            <AppText variant="small">{latestRun.outcomeSummary}</AppText>
                        </View>
                    ) : null}
                    {canFlySim && (
                        <Button
                            size="sm"
                            label={t('simulation.rehearseAction')}
                            icon={Radio}
                            tone="secondary"
                            loading={rehearsing}
                            disabled={simBusy || mission.id <= 0}
                            onPress={onRehearse}
                        />
                    )}
                </>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    code: {
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    hudGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    hudItem: {
        flexBasis: '45%',
        flexGrow: 1,
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        padding: spacing.sm,
        gap: 2,
    },
    smartBox: {
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.xs,
        flexWrap: 'wrap',
    },
    simBtn: {flexGrow: 1, flexBasis: '45%', minWidth: 132},
    simStopBtn: {flexGrow: 1, flexBasis: '45%', minWidth: 132, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface},
});
