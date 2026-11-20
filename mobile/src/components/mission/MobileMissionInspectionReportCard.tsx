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
    const {t, formatDate} = useI18n();
    const customerQuery = useMissionInspectionReport(missionId, portal === 'customer');
    const opsQuery = useOperationsMissionInspectionReport(missionId, portal === 'operations');
    const query = portal === 'customer' ? customerQuery : opsQuery;

    if (query.isPending) {
        return (
            <Card>
                <LoadingState label={t('mobile.overnight.reportLoading')}/>
            </Card>
        );
    }

    const report = query.data;
    if (!report) return null;
    const isCustomer = portal === 'customer';
    const cleanText = (val?: string | null) => (val ?? '').replace(/[rR][tT][kK]/g, 'GNSS');

    const handleShareCertificate = async () => {
        const summary = [
            t('mobile.overnight.reportShareHeading'),
            `${t('mobile.overnight.reportCertCode')}: ${report.certificateCode}`,
            `${report.missionCode} — ${report.title}`,
            isCustomer
                ? `${t('mobile.marketplace.verifiedPartnerBadge')}`
                : `${cleanText(report.uavSerialNumber)} · ${cleanText(report.uavModel)}`,
            `${t('mobile.overnight.reportDistance')}: ${(report.totalDistanceMeters / 1000).toFixed(2)} km · ${t('mobile.overnight.reportMaxAlt')}: ${Math.round(report.maxAltitudeMeters)} m`,
            `${t('mobile.overnight.reportWaypoints')}: ${report.waypointCount} · ${t('mobile.overnight.reportFiles')}: ${report.mediaCount}`,
        ].join('\n');
        await Share.share({message: summary});
    };

    return (
        <Card>
            <SectionTitle
                title={t('mobile.overnight.reportTitle')}
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
                    <AppText variant="small" style={styles.bold} numberOfLines={1}>
                        {isCustomer
                            ? t('mobile.marketplace.verifiedPartnerBadge')
                            : `${cleanText(report.uavSerialNumber)} · ${cleanText(report.uavModel)}`}
                    </AppText>
                    {!isCustomer ? (
                        <AppText variant="caption" numberOfLines={1}>
                            {report.stationName ?? '—'} · {report.operatorName ?? '—'}
                        </AppText>
                    ) : null}
                </View>
                <Badge
                    icon={CheckCircle2}
                    label={
                        report.preflightPassed
                            ? t('mobile.overnight.reportPreflightPass')
                            : t('mobile.overnight.reportPreflightChecked')
                    }
                    background={colors.slateLight}
                    color={colors.slateDark}
                />
            </View>

            <View style={styles.grid}>
                <View style={styles.cell}>
                    <AppText variant="caption">{t('mobile.overnight.reportDistance')}</AppText>
                    <AppText variant="small" style={styles.bold}>
                        {(report.totalDistanceMeters / 1000).toFixed(2)} km
                    </AppText>
                </View>
                <View style={styles.cell}>
                    <AppText variant="caption">{t('mobile.overnight.reportMaxAlt')}</AppText>
                    <AppText variant="small" style={styles.bold}>
                        {Math.round(report.maxAltitudeMeters)} m
                    </AppText>
                </View>
                <View style={styles.cell}>
                    <AppText variant="caption">{t('mobile.overnight.reportWaypoints')}</AppText>
                    <AppText variant="small" style={styles.bold}>
                        {t('mobile.overnight.reportWaypointsCount', {count: report.waypointCount})}
                    </AppText>
                </View>
                <View style={styles.cell}>
                    <AppText variant="caption">{t('mobile.overnight.reportFiles')}</AppText>
                    <AppText variant="small" style={styles.bold}>
                        {t('mobile.overnight.reportFilesCount', {count: report.mediaCount})}
                    </AppText>
                </View>
            </View>

            {report.deliverablePins.length > 0 && (
                <View style={styles.pinsSection}>
                    <AppText variant="caption" style={styles.bold}>
                        {t('mobile.overnight.reportPinsHeading')}
                    </AppText>
                    {report.deliverablePins.map(pin => (
                        <Pressable
                            key={pin.mediaId}
                            onPress={() => onOpenMedia?.(pin.mediaId)}
                            accessibilityRole="button"
                            accessibilityLabel={cleanText(pin.fileName)}
                            style={styles.pinRow}>
                            <FileCheck2 size={16} color={colors.primary}/>
                            <View style={styles.flex}>
                                <AppText variant="small" numberOfLines={1} style={styles.bold}>
                                    {cleanText(pin.fileName)}
                                </AppText>
                                <AppText variant="caption">
                                    #{pin.waypointIndex} · {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)} · {Math.round(pin.altitudeMeters)} m
                                </AppText>
                            </View>
                            <MapPin size={15} color={colors.slate}/>
                        </Pressable>
                    ))}
                </View>
            )}

            <View style={styles.footerRow}>
                <AppText variant="caption" style={styles.flex}>
                    {t('mobile.overnight.reportIssuedAt', {date: formatDate(report.generatedAt)})}
                </AppText>
                <Button
                    size="sm"
                    label={t('mobile.overnight.reportShareBtn')}
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
