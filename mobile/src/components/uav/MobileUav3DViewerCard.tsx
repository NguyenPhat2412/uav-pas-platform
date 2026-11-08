import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Svg, {Circle, G, Line, Polygon, Rect} from 'react-native-svg';
import {Cpu, Eye, Layers, ShieldCheck, Zap} from 'lucide-react-native';
import {AppText, Badge, Card, ChipGroup, SectionTitle} from '@/components/ui';
import {colors, radius, spacing} from '@/styles/tokens';

export type MobileAirframeClass = 'QUADCOPTER_RTK' | 'HEXACOPTER_SAR' | 'VTOL_FIXED_WING';

interface HotspotSpec {
    id: string;
    label: string;
    detail: string;
    x: number;
    y: number;
}

const HOTSPOTS: HotspotSpec[] = [
    {id: 'rtk', label: 'Module GNSS Dual-RTK', detail: 'Định vị chính xác ±1.5 cm thực địa, chống nhiễu đa tần L1/L2/L5.', x: 140, y: 42},
    {id: 'gimbal', label: 'Cụm Gimbal AI 4K & Nhiệt', detail: 'Camera quang học 4K Zoom 30x + Cảm biến nhiệt FLIR 640×512 ổn định 3 trục.', x: 140, y: 124},
    {id: 'motors', label: 'Động cơ Brushless FOC', detail: 'Chống nước/bụi IP55, cảm biến nhiệt cuộn dây & điều tốc ESC thông minh.', x: 64, y: 58},
    {id: 'battery', label: 'Pin Thông minh LiPo 12S', detail: 'Dung lượng 22,000 mAh, tự sưởi ấm và giám sát độ khỏe từng cell (SOH).', x: 140, y: 84},
    {id: 'frame', label: 'Khung Carbon Hàng không', detail: 'Sợi carbon T700 siêu nhẹ, chịu sức gió cấp 7 (15 m/s).', x: 196, y: 92},
    {id: 'payload', label: 'Ngàm Tải trọng & Đèn SAR', detail: 'Đèn pha tìm kiếm 10,000 Lumens & cơ cấu thả phao cứu sinh khẩn cấp.', x: 92, y: 120},
];

export interface MobileUav3DViewerProps {
    serialNumber?: string;
    modelName?: string;
    airframeClass?: MobileAirframeClass;
    pitchDeg?: number;
    rollDeg?: number;
    yawDeg?: number;
    altitudeM?: number;
    speedMps?: number;
    batteryPct?: number;
}

export function MobileUav3DViewerCard({
    serialNumber = 'UAV-350-RTK',
    modelName = 'DJI Matrice 350 RTK',
    airframeClass: initialAirframe = 'QUADCOPTER_RTK',
    pitchDeg = 0,
    rollDeg = 0,
    yawDeg = 0,
    altitudeM = 85,
    speedMps = 12.4,
    batteryPct = 88,
}: MobileUav3DViewerProps) {
    const [airframe, setAirframe] = useState<MobileAirframeClass>(initialAirframe);
    const [exploded, setExploded] = useState(false);
    const [xray, setXray] = useState(false);
    const [selectedHotspot, setSelectedHotspot] = useState<HotspotSpec>(HOTSPOTS[0]);

    const spread = exploded ? 14 : 0;
    const pitchOffset = Math.max(-14, Math.min(14, pitchDeg * 0.6));
    const rollAngle = Math.max(-25, Math.min(25, rollDeg));

    return (
        <Card>
            <SectionTitle
                title={`Mô hình 3D · ${modelName}`}
                action={<Badge icon={Cpu} label={serialNumber} background={colors.slateDark} color={colors.white}/>}
            />

            <ChipGroup<MobileAirframeClass>
                value={airframe}
                onChange={setAirframe}
                options={[
                    {value: 'QUADCOPTER_RTK', label: '4 Cánh RTK'},
                    {value: 'HEXACOPTER_SAR', label: '6 Cánh SAR'},
                    {value: 'VTOL_FIXED_WING', label: 'VTOL Cánh bằng'},
                ]}
            />

            <View style={styles.modeRow}>
                <Pressable
                    onPress={() => setExploded(prev => !prev)}
                    accessibilityRole="button"
                    style={[styles.modeBtn, exploded && styles.modeBtnActive]}>
                    <Layers size={14} color={exploded ? colors.white : colors.slateDark}/>
                    <AppText variant="caption" style={exploded ? styles.modeTextActive : styles.modeText}>
                        Tách lớp linh kiện
                    </AppText>
                </Pressable>
                <Pressable
                    onPress={() => setXray(prev => !prev)}
                    accessibilityRole="button"
                    style={[styles.modeBtn, xray && styles.modeBtnActive]}>
                    <Eye size={14} color={xray ? colors.white : colors.slateDark}/>
                    <AppText variant="caption" style={xray ? styles.modeTextActive : styles.modeText}>
                        X-Ray khung thân
                    </AppText>
                </Pressable>
            </View>

            <View style={styles.viewport}>
                <Svg width="100%" height={180} viewBox="0 0 280 170">
                    {/* Artificial Horizon & Perspective Grid */}
                    <Line x1={20} y1={148} x2={260} y2={148} stroke={colors.inputBorder} strokeWidth={1} strokeDasharray="4,4"/>
                    <Line x1={50} y1={160} x2={230} y2={160} stroke={colors.border} strokeWidth={1}/>

                    <G transform={`translate(0, ${pitchOffset}) rotate(${rollAngle}, 140, 88)`}>
                        {airframe === 'VTOL_FIXED_WING' ? (
                            <G>
                                {/* Main Fixed Wing */}
                                <Polygon
                                    points={`38,${86 - spread * 0.3} 242,${86 - spread * 0.3} 226,${102 - spread * 0.3} 54,${102 - spread * 0.3}`}
                                    fill={xray ? colors.primaryLight : colors.slateDark}
                                    stroke={colors.primary}
                                    strokeWidth={1.5}
                                />
                                {/* Twin VTOL Booms */}
                                <Line x1={82} y1={52 - spread} x2={82} y2={126 + spread} stroke={colors.slate} strokeWidth={3}/>
                                <Line x1={198} y1={52 - spread} x2={198} y2={126 + spread} stroke={colors.slate} strokeWidth={3}/>
                                {/* 4 VTOL Lift Rotors */}
                                {[
                                    [82, 52 - spread],
                                    [82, 126 + spread],
                                    [198, 52 - spread],
                                    [198, 126 + spread],
                                ].map(([cx, cy], idx) => (
                                    <Circle key={idx} cx={cx} cy={cy} r={16} fill={colors.slateLight} stroke={colors.primary} strokeWidth={1.5}/>
                                ))}
                            </G>
                        ) : (
                            <G>
                                {/* Diagonal Carbon Arms */}
                                <Line x1={140} y1={86} x2={64 - spread} y2={52 - spread} stroke={colors.slateDark} strokeWidth={4}/>
                                <Line x1={140} y1={86} x2={216 + spread} y2={52 - spread} stroke={colors.slateDark} strokeWidth={4}/>
                                <Line x1={140} y1={86} x2={64 - spread} y2={120 + spread} stroke={colors.slateDark} strokeWidth={4}/>
                                <Line x1={140} y1={86} x2={216 + spread} y2={120 + spread} stroke={colors.slateDark} strokeWidth={4}/>
                                {airframe === 'HEXACOPTER_SAR' && (
                                    <>
                                        <Line x1={140} y1={86} x2={44 - spread} y2={86} stroke={colors.slateDark} strokeWidth={4}/>
                                        <Line x1={140} y1={86} x2={236 + spread} y2={86} stroke={colors.slateDark} strokeWidth={4}/>
                                        <Circle cx={44 - spread} cy={86} r={17} fill={colors.slateLight} stroke={colors.primary} strokeWidth={1.5}/>
                                        <Circle cx={236 + spread} cy={86} r={17} fill={colors.slateLight} stroke={colors.primary} strokeWidth={1.5}/>
                                    </>
                                )}
                                {[
                                    [64 - spread, 52 - spread],
                                    [216 + spread, 52 - spread],
                                    [64 - spread, 120 + spread],
                                    [216 + spread, 120 + spread],
                                ].map(([cx, cy], idx) => (
                                    <Circle key={idx} cx={cx} cy={cy} r={20} fill={colors.slateLight} stroke={colors.primary} strokeWidth={1.5}/>
                                ))}
                            </G>
                        )}

                        {/* Central Carbon Fuselage */}
                        <Rect
                            x={114}
                            y={68}
                            width={52}
                            height={34}
                            rx={8}
                            fill={xray ? colors.surface : colors.slateDark}
                            stroke={colors.primary}
                            strokeWidth={2}
                        />
                        {/* Dual RTK Antennas (rises in Exploded mode) */}
                        <Line x1={130} y1={68 - spread} x2={130} y2={46 - spread} stroke={colors.primary} strokeWidth={2.5}/>
                        <Line x1={150} y1={68 - spread} x2={150} y2={46 - spread} stroke={colors.primary} strokeWidth={2.5}/>
                        <Circle cx={130} cy={44 - spread} r={4} fill={colors.primary}/>
                        <Circle cx={150} cy={44 - spread} r={4} fill={colors.primary}/>

                        {/* Gimbal Turret & Landing Skids (lowers in Exploded mode) */}
                        <Circle cx={140} cy={114 + spread} r={10} fill={colors.primary} stroke={colors.white} strokeWidth={1.5}/>
                        <Line x1={108} y1={102 + spread} x2={98} y2={132 + spread} stroke={colors.slate} strokeWidth={2.5}/>
                        <Line x1={172} y1={102 + spread} x2={182} y2={132 + spread} stroke={colors.slate} strokeWidth={2.5}/>
                    </G>

                    {/* Interactive Component Hotspot Dots */}
                    {HOTSPOTS.map(spot => {
                        const active = selectedHotspot.id === spot.id;
                        return (
                            <Circle
                                key={spot.id}
                                cx={spot.x}
                                cy={spot.y}
                                r={active ? 7 : 5}
                                fill={active ? colors.primary : colors.warning}
                                stroke={colors.white}
                                strokeWidth={2}
                                onPress={() => setSelectedHotspot(spot)}
                            />
                        );
                    })}
                </Svg>

                <View style={styles.hudOverlay}>
                    <AppText variant="caption" style={styles.hudPill}>
                        Pitch {pitchDeg.toFixed(1)}° · Roll {rollDeg.toFixed(1)}° · Yaw {Math.round(yawDeg)}°
                    </AppText>
                    <AppText variant="caption" style={styles.hudPill}>
                        AGL {Math.round(altitudeM)}m · {speedMps.toFixed(1)}m/s · Pin {Math.round(batteryPct)}%
                    </AppText>
                </View>
            </View>

            {/* Hotspot Selector Chips & Spec Drawer */}
            <View style={styles.hotspotChips}>
                {HOTSPOTS.map(spot => {
                    const active = selectedHotspot.id === spot.id;
                    return (
                        <Pressable
                            key={spot.id}
                            onPress={() => setSelectedHotspot(spot)}
                            accessibilityRole="button"
                            style={[styles.spotChip, active && styles.spotChipActive]}>
                            <AppText variant="caption" style={active ? styles.modeTextActive : styles.modeText}>
                                {spot.label}
                            </AppText>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.specBox}>
                <View style={styles.specHeader}>
                    <ShieldCheck size={16} color={colors.primary}/>
                    <AppText variant="small" style={styles.specTitle}>{selectedHotspot.label}</AppText>
                    <Zap size={14} color={colors.warning}/>
                </View>
                <AppText variant="caption">{selectedHotspot.detail}</AppText>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    modeRow: {flexDirection: 'row', gap: spacing.sm},
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
    },
    modeBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    modeText: {color: colors.slateDark, fontWeight: '600'},
    modeTextActive: {color: colors.white, fontWeight: '700'},
    viewport: {
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
        padding: spacing.xs,
        alignItems: 'center',
    },
    hudOverlay: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: spacing.xs,
        paddingHorizontal: spacing.xs,
    },
    hudPill: {
        fontWeight: '600',
        color: colors.slateDark,
    },
    hotspotChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    spotChip: {
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    spotChipActive: {
        backgroundColor: colors.slateDark,
        borderColor: colors.slateDark,
    },
    specBox: {
        padding: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
    },
    specHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    specTitle: {
        flex: 1,
        fontWeight: '700',
        color: colors.text,
    },
});
