import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {ChevronRight, Home, Pause, Play, ShieldAlert} from 'lucide-react-native';
import {AppText, Badge, Button, Card} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {SimCommand, SimulationRunLog, SimulationState} from '@/shared/types/simulation/simulation.types';
import {colors, radius, spacing} from '@/styles/tokens';

export function SimulationSessionCard({
    state,
    canFly,
    busy,
    onCommand,
    onStop,
    onOpenMission,
}: {
    state: SimulationState;
    canFly: boolean;
    busy: boolean;
    onCommand: (command: SimCommand) => void;
    onStop: () => void;
    onOpenMission: (missionId: number) => void;
}) {
    const {t} = useI18n();
    const airborne = state.mode !== 'LANDED';
    const isWarn = ['HOLD', 'RETURN_TO_HOME', 'LANDING'].includes(state.mode);
    return (
        <Card>
            <View style={styles.rowBetween}>
                <View style={styles.titleStack}>
                    <AppText variant="title">{state.uavCode}</AppText>
                    <AppText variant="caption" style={styles.code}>
                        {Math.floor(state.elapsedSeconds / 60)}:{String(Math.floor(state.elapsedSeconds % 60)).padStart(2, '0')}
                    </AppText>
                </View>
                <Badge
                    label={t(`simulation.modes.${state.mode}`)}
                    background={isWarn ? colors.warningLight : colors.primaryLight}
                    color={isWarn ? colors.warning : colors.primary}
                />
            </View>

            {state.missionId != null && state.missionCode ? (
                <Pressable
                    onPress={() => onOpenMission(state.missionId!)}
                    accessibilityRole="button"
                    style={styles.missionBanner}>
                    <View style={styles.flex}>
                        <AppText variant="caption" style={styles.code}>{state.missionCode}</AppText>
                    </View>
                    <ChevronRight size={16} color={colors.primary}/>
                </Pressable>
            ) : null}

            <View style={styles.telemetryStrip}>
                <AppText variant="caption">
                    {t('simulation.hud.altitude')}: {Math.round(state.altitudeMeters)} m
                </AppText>
                <AppText variant="caption">
                    {t('simulation.hud.speed')}: {state.groundSpeedMs.toFixed(1)} m/s
                </AppText>
                <AppText variant="caption">
                    {t('simulation.hud.battery')}: {Math.round(state.batteryPct)}%
                </AppText>
                <AppText variant="caption">
                    {t('simulation.hud.waypoint')}: {Math.min(state.nextWaypoint, state.waypointCount)}/{state.waypointCount}
                </AppText>
                <AppText variant="caption">
                    {t('simulation.hud.rtk')}: {state.rtkStatus} ({state.satelliteCount})
                </AppText>
                <AppText variant="caption">
                    {t('simulation.hud.wind')}: {state.settings.windSpeedMs.toFixed(1)} m/s · {state.settings.timeScale}x
                </AppText>
            </View>

            {state.airspaceBreaches > 0 && (
                <Badge
                    icon={ShieldAlert}
                    label={`${t('simulation.hud.airspace')}: ${state.airspaceBreaches}`}
                    background={colors.dangerLight}
                    color={colors.danger}
                />
            )}

            {canFly && (
                <View style={styles.actions}>
                    {state.mode === 'HOLD' ? (
                        <Button
                            label={t('simulation.resume')}
                            icon={Play}
                            disabled={busy}
                            onPress={() => onCommand('RESUME')}
                        />
                    ) : (
                        <Button
                            label={t('simulation.pause')}
                            icon={Pause}
                            tone="secondary"
                            disabled={busy || !['MISSION', 'RETURN_TO_HOME'].includes(state.mode)}
                            onPress={() => onCommand('PAUSE')}
                        />
                    )}
                    <Button
                        label={t('simulation.rth')}
                        icon={Home}
                        tone="secondary"
                        disabled={busy || ['RETURN_TO_HOME', 'LANDING', 'LANDED'].includes(state.mode)}
                        onPress={() => onCommand('RETURN_TO_HOME')}
                    />
                    <Button
                        label={state.gpsDegraded ? t('simulation.faultGpsRestore') : t('simulation.faultGps')}
                        tone="secondary"
                        disabled={busy || !airborne}
                        onPress={() => onCommand('SIMULATE_GPS_DEGRADE')}
                    />
                    <Button
                        label={t('simulation.stop')}
                        tone="ghost"
                        disabled={busy}
                        onPress={onStop}
                    />
                </View>
            )}
        </Card>
    );
}

export function SimulationRunLogCard({
    run,
    onOpenMission,
}: {
    run: SimulationRunLog;
    onOpenMission: (missionId: number) => void;
}) {
    const {t, formatDate} = useI18n();
    const isDanger = run.status === 'EMERGENCY_LANDED';
    const isWarn = run.status === 'FAILSAFE_RTH' || run.status === 'RUNNING';
    return (
        <Card>
            <View style={styles.rowBetween}>
                <View style={styles.titleStack}>
                    <AppText variant="title">{run.uavCode}</AppText>
                    <AppText variant="caption">{formatDate(run.startedAt)}</AppText>
                </View>
                <Badge
                    label={t(`simulation.runStatus.${run.status}`)}
                    background={isDanger ? colors.dangerLight : isWarn ? colors.warningLight : colors.slateLight}
                    color={isDanger ? colors.danger : isWarn ? colors.warning : colors.slateDark}
                />
            </View>
            <View style={styles.pills}>
                <Badge
                    label={run.missionCode ?? t('simulation.history.freeFlight')}
                    background={colors.slateLight}
                    color={colors.slateDark}
                />
                <Badge
                    label={`${Math.round(run.altitudeMeters)} m · ${run.windSpeedMs.toFixed(1)} m/s · ${run.timeScale}x`}
                />
                <Badge
                    label={`${run.waypointsReached}/${run.waypointCount} · ${Math.round(run.startBatteryPct)}% → ${run.endBatteryPct != null ? `${Math.round(run.endBatteryPct)}%` : '—'}`}
                />
            </View>
            {run.outcomeSummary ? <AppText variant="small">{run.outcomeSummary}</AppText> : null}
            {run.missionId != null && run.missionCode ? (
                <Pressable
                    onPress={() => onOpenMission(run.missionId!)}
                    accessibilityRole="button"
                    style={styles.missionBanner}>
                    <AppText variant="caption" style={[styles.code, styles.flex]}>{run.missionCode}</AppText>
                    <ChevronRight size={16} color={colors.primary}/>
                </Pressable>
            ) : null}
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
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
});
