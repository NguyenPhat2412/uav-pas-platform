import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle, Ellipse, G, Line, Path, Rect} from 'react-native-svg';
import {RefreshCw, RotateCw, ServerOff, ShieldCheck, WifiOff, Wrench} from 'lucide-react-native';
import {AppBackground} from '@/components/layout/AppBackground';
import {BrandMark} from '@/components/shared/BrandMark';
import {AppText, Badge, Button, Card, CONTENT_WIDTH} from '@/components/ui';
import {useNetworkStatus, type OfflineReason} from '@/hooks/network/useNetworkStatus';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

export interface ConnectionLostScreenProps {
    mode?: OfflineReason;
    checking?: boolean;
    onRetry: () => void;
    onDismiss?: () => void;
    onSignOut?: () => void;
}

/** UAV PAS telemetry illustration: Ground Station radar <-> broken signal link <-> hovering Quadcopter. */
function LostTelemetryGraphic() {
    return (
        <View style={styles.graphicWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Svg width={276} height={138} viewBox="0 0 276 138">
                {/* Ground control radar rings (left) */}
                <Circle cx={48} cy={88} r={34} fill={colors.primaryLight} fillOpacity={0.55}/>
                <Circle cx={48} cy={88} r={24} fill="none" stroke={colors.primary} strokeOpacity={0.28} strokeWidth={1.4}/>
                <Path d="M 34 106 L 48 76 L 62 106 Z" fill={colors.slateDark}/>
                <Circle cx={48} cy={74} r={5} fill={colors.primary}/>

                {/* Dashed flight link interrupted in the middle */}
                <Path
                    d="M 60 72 C 90 54, 108 56, 124 64"
                    fill="none"
                    stroke={colors.slate}
                    strokeWidth={2}
                    strokeDasharray="4 6"
                    strokeLinecap="round"
                />
                <Path
                    d="M 156 64 C 174 56, 192 54, 214 60"
                    fill="none"
                    stroke={colors.border}
                    strokeWidth={2}
                    strokeDasharray="4 6"
                    strokeLinecap="round"
                />

                {/* Disconnected link node */}
                <Circle
                    cx={140}
                    cy={66}
                    r={16}
                    fill={colors.surface}
                    stroke={colors.primary}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                />
                <Line x1={134} y1={60} x2={146} y2={72} stroke={colors.primary} strokeWidth={2.4} strokeLinecap="round"/>
                <Line x1={146} y1={60} x2={134} y2={72} stroke={colors.primary} strokeWidth={2.4} strokeLinecap="round"/>

                {/* Hovering UAV PAS quadcopter (right) */}
                <G transform="translate(226, 62) rotate(-4)">
                    <Line x1={-28} y1={-4} x2={28} y2={-4} stroke={colors.slateDark} strokeWidth={3.2} strokeLinecap="round"/>
                    <Line x1={-28} y1={-4} x2={-34} y2={-12} stroke={colors.slateDark} strokeWidth={3} strokeLinecap="round"/>
                    <Line x1={28} y1={-4} x2={34} y2={-12} stroke={colors.slateDark} strokeWidth={3} strokeLinecap="round"/>
                    <Ellipse cx={-34} cy={-14} rx={14} ry={3} fill={colors.muted}/>
                    <Ellipse cx={34} cy={-14} rx={14} ry={3} fill={colors.muted}/>
                    <Rect x={-15} y={-9} width={30} height={19} rx={6} fill={colors.slateDark}/>
                    <Circle cx={0} cy={0} r={4.2} fill={colors.surface}/>
                    <Circle cx={0} cy={0} r={2} fill={colors.primary}/>
                    <Line x1={-9} y1={10} x2={-13} y2={20} stroke={colors.slate} strokeWidth={2.5} strokeLinecap="round"/>
                    <Line x1={9} y1={10} x2={13} y2={20} stroke={colors.slate} strokeWidth={2.5} strokeLinecap="round"/>
                </G>
            </Svg>
        </View>
    );
}

/**
 * Full-screen UAV PAS Connection Lost / Server Unreachable page built with the project's
 * radar survey background, BrandMark, telemetry artwork, and surface tokens.
 */
export function ConnectionLostScreen({
    mode = 'network',
    checking = false,
    onRetry,
    onDismiss,
    onSignOut,
}: ConnectionLostScreenProps) {
    const {t} = useI18n();
    const insets = useSafeAreaInsets();

    const ModeIcon = mode === 'maintenance' ? Wrench : mode === 'server' ? ServerOff : WifiOff;
    const badgeLabel = mode === 'maintenance'
        ? t('errorPage.maintenanceBadge')
        : mode === 'server'
            ? t('errorPage.serverBadge')
            : t('mobile.status.offlineBadge');
    const title = mode === 'maintenance'
        ? t('errorPage.maintenanceTitle')
        : mode === 'server'
            ? t('mobile.status.offlineTitle')
            : t('mobile.status.networkLostTitle');
    const detail = mode === 'maintenance'
        ? t('errorPage.maintenanceDetail')
        : mode === 'server'
            ? t('mobile.status.offlineHint')
            : t('mobile.status.networkLostDetail');

    return (
        <View style={styles.root} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <AppBackground/>
            <ScrollView
                contentContainerStyle={[
                    styles.scroll,
                    {paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl},
                ]}
                bounces={false}>
                <View style={styles.column}>
                    <View style={styles.header}>
                        <BrandMark/>
                        <View style={styles.badgeWrap}>
                            <Badge
                                icon={ModeIcon}
                                label={badgeLabel}
                                background={colors.dangerLight}
                                color={colors.danger}
                            />
                        </View>
                    </View>

                    <Card style={styles.heroCard}>
                        <LostTelemetryGraphic/>

                        <View style={styles.copyBlock}>
                            <AppText variant="heading" style={styles.center}>
                                {title}
                            </AppText>
                            <AppText variant="small" style={styles.center}>
                                {detail}
                            </AppText>
                        </View>

                        <View style={styles.checkList}>
                            <View style={styles.checkRow}>
                                <View style={styles.checkIcon}>
                                    <ModeIcon size={15} color={colors.primary}/>
                                </View>
                                <AppText variant="small" style={styles.flex}>
                                    {t('mobile.status.checkWifi')}
                                </AppText>
                            </View>
                            <View style={styles.checkRow}>
                                <View style={styles.checkIcon}>
                                    <ShieldCheck size={15} color={colors.primary}/>
                                </View>
                                <AppText variant="small" style={styles.flex}>
                                    {t('mobile.status.sessionProtected')}
                                </AppText>
                            </View>
                            <View style={styles.checkRow}>
                                <View style={styles.checkIcon}>
                                    <RefreshCw size={15} color={colors.primary}/>
                                </View>
                                <AppText variant="small" style={styles.flex}>
                                    {t('mobile.status.autoSync')}
                                </AppText>
                            </View>
                        </View>

                        <View style={styles.actions}>
                            <Button
                                icon={RotateCw}
                                label={t('mobile.status.reconnectButton')}
                                loading={checking}
                                onPress={onRetry}
                            />
                            {onDismiss ? (
                                <Button
                                    tone="secondary"
                                    size="sm"
                                    label={t('mobile.status.viewCachedButton')}
                                    onPress={onDismiss}
                                />
                            ) : null}
                            {onSignOut ? (
                                <Button
                                    tone="ghost"
                                    size="sm"
                                    label={t('common.logout')}
                                    onPress={onSignOut}
                                />
                            ) : null}
                        </View>
                    </Card>
                </View>
            </ScrollView>
        </View>
    );
}

/** Global root overlay that automatically presents ConnectionLostScreen whenever connectivity drops. */
export function GlobalOfflineScreen() {
    const {isOffline, reason, dismissed, checking, recheck, dismiss} = useNetworkStatus();

    if (!isOffline || dismissed) return null;

    return (
        <View style={styles.overlay}>
            <ConnectionLostScreen
                mode={reason}
                checking={checking}
                onRetry={() => void recheck()}
                onDismiss={dismiss}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {flex: 1, backgroundColor: colors.canvas},
    overlay: {...StyleSheet.absoluteFill, zIndex: 999},
    scroll: {flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg},
    column: {width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center', gap: spacing.lg},
    header: {alignItems: 'center', gap: spacing.sm},
    badgeWrap: {alignSelf: 'center', alignItems: 'center'},
    heroCard: {
        borderTopWidth: 3,
        borderTopColor: colors.primary,
        padding: spacing.xl,
        gap: spacing.lg,
    },
    graphicWrap: {alignItems: 'center', paddingVertical: spacing.xs},
    copyBlock: {gap: spacing.xs, alignItems: 'center'},
    center: {textAlign: 'center'},
    checkList: {
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
    },
    checkRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    checkIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flex: {flex: 1},
    actions: {gap: spacing.sm},
});
