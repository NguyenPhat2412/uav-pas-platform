import React from 'react';
import {Pressable, Share, StyleSheet, View} from 'react-native';
import {Award, CheckCircle2, FileCheck2, MapPin, Share2, ShieldCheck} from 'lucide-react-native';
import {AppText, Badge, Button, Card, LoadingState, SectionTitle} from '@/components/ui';
import {useMissionInspectionReport} from '@/hooks/mission/useCustomerMissions';
import {useOperationsMissionInspectionReport} from '@/hooks/operations/useOperationsMissions';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

interface Props {
    missionId: number;
    portal: 'customer' | 'operations';
    onOpenMedia?: (mediaId: number) => void;
}

export function MobileMissionInspectionReportCard({missionId, portal, onOpenMedia}: Props) {
    const {formatDate} = useI18n();
    const customerQuery = useMissionInspectionReport(missionId, portal === 'customer');
    const opsQuery = useOperationsMissionInspectionReport(missionId, portal === 'operations');
    const query = portal === 'customer' ? customerQuery : opsQuery;

    if (query.isPending) {
        return (
            <Card>
                <LoadingState label="Đang tải biên bản nghiệm thu..."/>
            </Card>
        );
    }

    const report = query.data;
    if (!report) return null;

    const handleShareCertificate = async () => {
        const summary = [
            `CHỨNG NHẬN NGHIỆM THU NHIỆM VỤ UAV PAS`,
            `Mã chứng nhận: ${report.certificateCode}`,
            `Nhiệm vụ: ${report.missionCode} — ${report.title}`,
            `Thiết bị bay: ${report.uavSerialNumber} (${report.uavModel})`,
            `Quãng đường bay: ${(report.totalDistanceMeters / 1000).toFixed(2)} km · Độ cao tối đa: ${Math.round(report.maxAltitudeMeters)} m`,
            `Số điểm dừng: ${report.waypointCount} · Tệp bàn giao: ${report.mediaCount}`,
        ].join('\n');
        await Share.share({message: summary});
    };

    return (
        <Card>
            <SectionTitle
                title="Biên bản nghiệm thu & bàn giao"
                action={
                    <Badge
                        icon={Award}
                        label={report.certificateCode}
                        background={colors.primaryLight}
                        color={colors.primary}
                    />
                }
            />

            <View style={styles.certBanner}>
                <ShieldCheck size={18} color={colors.primary}/>
                <View style={styles.flex}>
                    <AppText variant="small" style={styles.bold}>
                        {report.uavSerialNumber} · {report.uavModel}
                    </AppText>
                    <AppText variant="caption">
                        Trạm: {report.stationName ?? '—'} · Người điều khiển: {report.operatorName ?? '—'}
                    </AppText>
                </View>
                <Badge
                    icon={CheckCircle2}
                    label={report.preflightPassed ? 'Đạt an toàn' : 'Đã kiểm tra'}
                    background={colors.slateLight}
                    color={colors.slateDark}
                />
            </View>

            <View style={styles.grid}>
                <View style={styles.cell}>
                    <AppText variant="caption">Quãng đường</AppText>
                    <AppText variant="small" style={styles.bold}>
                        {(report.totalDistanceMeters / 1000).toFixed(2)} km
                    </AppText>
                </View>
                <View style={styles.cell}>
                    <AppText variant="caption">Độ cao tối đa</AppText>
                    <AppText variant="small" style={styles.bold}>
                        {Math.round(report.maxAltitudeMeters)} m
                    </AppText>
                </View>
                <View style={styles.cell}>
                    <AppText variant="caption">Điểm dừng</AppText>
                    <AppText variant="small" style={styles.bold}>
                        {report.waypointCount} điểm
                    </AppText>
                </View>
                <View style={styles.cell}>
                    <AppText variant="caption">Tệp bàn giao</AppText>
                    <AppText variant="small" style={styles.bold}>
                        {report.mediaCount} tệp
                    </AppText>
                </View>
            </View>

            {report.deliverablePins.length > 0 && (
                <View style={styles.pinsSection}>
                    <AppText variant="caption" style={styles.bold}>
                        Vị trí chụp của từng tệp:
                    </AppText>
                    {report.deliverablePins.map(pin => (
                        <Pressable
                            key={pin.mediaId}
                            onPress={() => onOpenMedia?.(pin.mediaId)}
                            accessibilityRole="button"
                            style={styles.pinRow}>
                            <FileCheck2 size={16} color={colors.primary}/>
                            <View style={styles.flex}>
                                <AppText variant="small" numberOfLines={1} style={styles.bold}>
                                    {pin.fileName}
                                </AppText>
                                <AppText variant="caption">
                                    Điểm {pin.waypointIndex} · {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)} · {Math.round(pin.altitudeMeters)} m
                                </AppText>
                            </View>
                            <MapPin size={15} color={colors.slate}/>
                        </Pressable>
                    ))}
                </View>
            )}

            <View style={styles.footerRow}>
                <AppText variant="caption" style={styles.flex}>
                    Cấp lúc: {formatDate(report.generatedAt)}
                </AppText>
                <Button
                    size="sm"
                    label="Chia sẻ biên bản"
                    icon={Share2}
                    tone="secondary"
                    onPress={() => void handleShareCertificate()}
                />
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1, minWidth: 0},
    bold: {fontWeight: '700', color: colors.text},
    certBanner: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.border,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    cell: {
        flexBasis: '46%',
        minWidth: 0,
        flexGrow: 1,
        padding: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
        gap: 2,
    },
    pinsSection: {
        gap: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    pinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
    },
    footerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
});
