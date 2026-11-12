import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Svg, {Circle, Line, Polyline} from 'react-native-svg';
import {AlertTriangle, Compass, Pause, Play, RotateCcw, ShieldCheck} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ChipGroup, LoadingState, SectionTitle} from '@/components/ui';
import {MobileUav3DViewerCard} from '@/components/uav/MobileUav3DViewerCard';
import {useMissionTelemetryReplay} from '@/hooks/mission/useCustomerMissions';
import {useOperationsMissionTelemetryReplay} from '@/hooks/operations/useOperationsMissions';
import {colors, radius, spacing} from '@/styles/tokens';

interface Props {
    missionId: number;
    portal: 'customer' | 'operations';
}

type SpeedScale = '1' | '2' | '4';

export function MobileMission3DReplayCard({missionId, portal}: Props) {
    const customerReplay = useMissionTelemetryReplay(missionId, portal === 'customer');
    const opsReplay = useOperationsMissionTelemetryReplay(missionId, portal === 'operations');
    const query = portal === 'customer' ? customerReplay : opsReplay;

    const [frameIdx, setFrameIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState<SpeedScale>('1');

    const replay = query.data;
    const samples = replay?.samples ?? [];
    const safeIdx = samples.length > 0 ? Math.min(frameIdx, samples.length - 1) : 0;
    const currentSample = samples[safeIdx];

    useEffect(() => {
        if (!playing || samples.length <= 1) return;
        const stepMs = Math.max(180, Math.round(700 / Number(speed)));
        const timer = setInterval(() => {
            setFrameIdx(prev => {
                if (prev + 1 >= samples.length) {
                    setPlaying(false);
                    return 0;
                }
                return prev + 1;
            });
        }, stepMs);
        return () => clearInterval(timer);
    }, [playing, speed, samples.length]);

    if (query.isPending) {
        return (
            <Card>
                <LoadingState label="Đang tải dữ liệu phát lại quỹ đạo 3D..."/>
            </Card>
        );
    }
    if (!replay || samples.length === 0) return null;

    const chartW = 280;
    const chartH = 96;
    const maxAlt = Math.max(120, replay.maxAltitudeMeters * 1.15);

    const flightPoints = samples
        .map((s, idx) => {
            const x = samples.length > 1 ? (idx / (samples.length - 1)) * (chartW - 16) + 8 : chartW / 2;
            const y = chartH - 8 - ((s.terrainElevationMeters + s.altitudeAglMeters) / maxAlt) * (chartH - 18);
            return `${x.toFixed(1)},${Math.max(6, Math.min(chartH - 6, y)).toFixed(1)}`;
        })
        .join(' ');

    const terrainPoints = samples
        .map((s, idx) => {
            const x = samples.length > 1 ? (idx / (samples.length - 1)) * (chartW - 16) + 8 : chartW / 2;
            const y = chartH - 8 - (s.terrainElevationMeters / maxAlt) * (chartH - 18);
            return `${x.toFixed(1)},${Math.max(8, Math.min(chartH - 6, y)).toFixed(1)}`;
        })
        .join(' ');

    const cursorX = samples.length > 1 ? (safeIdx / (samples.length - 1)) * (chartW - 16) + 8 : chartW / 2;
    const cursorY = currentSample
        ? chartH - 8 - ((currentSample.terrainElevationMeters + currentSample.altitudeAglMeters) / maxAlt) * (chartH - 18)
        : chartH / 2;

    return (
        <>
            <MobileUav3DViewerCard
                serialNumber={replay.uavSerialNumber}
                modelName={replay.uavModel}
                airframeClass={replay.airframeClass}
                pitchDeg={currentSample?.pitchDeg ?? 0}
                rollDeg={currentSample?.rollDeg ?? 0}
                yawDeg={currentSample?.headingDeg ?? 0}
                altitudeM={currentSample?.altitudeAglMeters ?? 0}
                speedMps={currentSample?.groundSpeedMs ?? 0}
                batteryPct={currentSample?.batteryPct ?? 100}
            />

            <Card>
                <SectionTitle
                    title="Phát lại Quỹ đạo 3D & Mặt cắt Địa hình"
                    action={
                        <Badge
                            icon={replay.terrainClearanceSafe ? ShieldCheck : AlertTriangle}
                            label={
                                replay.terrainClearanceSafe
                                    ? `An toàn địa hình (≥${Math.round(replay.minClearanceMeters)}m)`
                                    : `Cảnh báo độ cao (${Math.round(replay.minClearanceMeters)}m)`
                            }
                            background={replay.terrainClearanceSafe ? colors.slateLight : colors.warningLight}
                            color={replay.terrainClearanceSafe ? colors.slateDark : colors.warning}
                        />
                    }
                />

                <View style={styles.kpiRow}>
                    <View style={styles.kpiItem}>
                        <AppText variant="caption">Tổng quãng đường</AppText>
                        <AppText variant="small" style={styles.bold}>
                            {(replay.totalDistanceMeters / 1000).toFixed(2)} km
                        </AppText>
                    </View>
                    <View style={styles.kpiItem}>
                        <AppText variant="caption">Trần bay cao nhất</AppText>
                        <AppText variant="small" style={styles.bold}>
                            {Math.round(replay.maxAltitudeMeters)} m
                        </AppText>
                    </View>
                    <View style={styles.kpiItem}>
                        <AppText variant="caption">Gimbal / RTK</AppText>
                        <AppText variant="small" style={styles.bold}>
                            {Math.round(currentSample?.gimbalPitchDeg ?? -45)}° · {currentSample?.rtkStatus ?? 'FIXED'}
                        </AppText>
                    </View>
                </View>

                <View style={styles.chartBox}>
                    <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
                        <Line x1={8} y1={chartH - 8} x2={chartW - 8} y2={chartH - 8} stroke={colors.border} strokeWidth={1}/>
                        <Polyline points={terrainPoints} fill="none" stroke={colors.warning} strokeWidth={2}/>
                        <Polyline points={flightPoints} fill="none" stroke={colors.primary} strokeWidth={2.5}/>
                        <Line x1={cursorX} y1={6} x2={cursorX} y2={chartH - 8} stroke={colors.slateDark} strokeWidth={1} strokeDasharray="3,3"/>
                        <Circle cx={cursorX} cy={Math.max(6, Math.min(chartH - 6, cursorY))} r={5} fill={colors.primary} stroke={colors.white} strokeWidth={1.5}/>
                    </Svg>
                    <View style={styles.legendRow}>
                        <AppText variant="caption">Đỏ: Độ cao tuyệt đối UAV</AppText>
                        <AppText variant="caption">Cam: Cao độ mặt đất (DEM)</AppText>
                    </View>
                </View>

                {/* Scrubber Step Dots */}
                <View style={styles.stepBar}>
                    {samples.map((s, idx) => {
                        const active = idx === safeIdx;
                        return (
                            <Pressable
                                key={s.index}
                                onPress={() => {
                                    setPlaying(false);
                                    setFrameIdx(idx);
                                }}
                                accessibilityRole="button"
                                style={[styles.stepTick, idx <= safeIdx && styles.stepTickDone, active && styles.stepTickActive]}
                            />
                        );
                    })}
                </View>

                <View style={styles.controlsRow}>
                    <Button
                        label={playing ? 'Tạm dừng' : 'Phát quỹ đạo'}
                        icon={playing ? Pause : Play}
                        onPress={() => setPlaying(prev => !prev)}
                        style={styles.flex}
                    />
                    <Button
                        label="Đặt lại"
                        icon={RotateCcw}
                        tone="secondary"
                        onPress={() => {
                            setPlaying(false);
                            setFrameIdx(0);
                        }}
                    />
                </View>

                <View style={styles.speedRow}>
                    <View style={styles.speedLabel}>
                        <Compass size={14} color={colors.slate}/>
                        <AppText variant="caption">
                            Mẫu {safeIdx + 1}/{samples.length} · Tốc độ phát:
                        </AppText>
                    </View>
                    <ChipGroup<SpeedScale>
                        value={speed}
                        onChange={setSpeed}
                        options={[
                            {value: '1', label: '1x'},
                            {value: '2', label: '2x'},
                            {value: '4', label: '4x'},
                        ]}
                    />
                </View>
            </Card>
        </>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    bold: {fontWeight: '700', color: colors.text},
    kpiRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    kpiItem: {
        flex: 1,
        minWidth: 80,
        padding: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
        gap: 2,
    },
    chartBox: {
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
        padding: spacing.xs,
        gap: 4,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xs,
    },
    stepBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        height: 18,
    },
    stepTick: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.border,
    },
    stepTickDone: {
        backgroundColor: colors.primaryLight,
    },
    stepTickActive: {
        height: 12,
        backgroundColor: colors.primary,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
    },
    speedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    speedLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});
