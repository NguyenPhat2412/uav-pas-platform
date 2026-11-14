import React, {useEffect} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle, Ellipse, G, Line, Path, Rect, Text as SvgText} from 'react-native-svg';
import {
    AlertTriangle,
    ArrowLeft,
    Clock,
    FileQuestion,
    Home,
    Lock,
    RotateCcw,
    ServerOff,
    ShieldAlert,
    WifiOff,
    Wrench,
} from 'lucide-react-native';
import {AppBackground} from '@/components/layout/AppBackground';
import {BrandMark} from '@/components/shared/BrandMark';
import {UavLoader3D} from '@/components/shared/UavLoader3D';
import {ConnectionLostScreen} from '@/components/shared/ConnectionLostScreen';
import {AppText, Badge, Button, Card, CONTENT_WIDTH} from '@/components/ui';
import {useOptionalAuth} from '@/providers/AuthContext';
import {useI18n, useTranslateOutsideProvider} from '@/providers/I18nContext';
import {
    classifyRuntimeException,
    errorReference,
    type ExceptionKind,
} from '@/shared/utils/errors/runtime-error';
import {resolvePortalEntryHref} from '@/utils/operations/portal-routing';
import {colors, radius, spacing} from '@/styles/tokens';

/** Only seen when the session check outlasts the native splash (slow network): the 3D drone and the wordmark. */
export function AppSplash() {
    return (
        <View style={styles.splash} accessibilityLabel="UAV PAS" accessibilityRole="progressbar">
            <UavLoader3D size={180}/>
            <BrandMark logo={false}/>
        </View>
    );
}

/** A saved session exists but the API did not answer (offline, server busy): keep it and let the user retry. */
export function AppUnreachable({onRetry, onSignOut}: { onRetry: () => void; onSignOut: () => void }) {
    return <ConnectionLostScreen mode="server" onRetry={onRetry} onSignOut={onSignOut}/>;
}

function errorMetaForKind(kind: ExceptionKind) {
    switch (kind) {
        case 'offline':
            return {icon: WifiOff, titleKey: 'errorPage.offlineTitle', detailKey: 'errorPage.offlineDetail'};
        case 'server_unreachable':
            return {icon: ServerOff, titleKey: 'errorPage.serverTitle', detailKey: 'errorPage.serverDetail'};
        case 'maintenance':
            return {icon: Wrench, titleKey: 'errorPage.maintenanceTitle', detailKey: 'errorPage.maintenanceDetail'};
        case 'rate_limited':
            return {icon: Clock, titleKey: 'errorPage.rateLimitedTitle', detailKey: 'errorPage.rateLimitedDetail'};
        case 'forbidden':
            return {icon: ShieldAlert, titleKey: 'errorPage.forbiddenTitle', detailKey: 'errorPage.forbiddenDetail'};
        case 'not_found':
            return {icon: FileQuestion, titleKey: 'errorPage.notFoundTitle', detailKey: 'errorPage.notFoundDetail'};
        case 'unauthorized':
            return {icon: Lock, titleKey: 'errorPage.unauthorizedTitle', detailKey: 'errorPage.unauthorizedDetail'};
        default:
            return {icon: AlertTriangle, titleKey: 'errorPage.title', detailKey: 'errorPage.detail'};
    }
}

/**
 * Shown by expo-router's ErrorBoundary when a screen crashes: classifies the failure using the shared runtime-error
 * rules, shows the same 6-character support reference as the web portals, and provides both Retry and Home recovery.
 */
export function AppErrorView({error, retry}: {
    error: Error & { status?: number; code?: string; digest?: string };
    retry: () => void;
}) {
    const t = useTranslateOutsideProvider();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const kind = classifyRuntimeException(error, true);
    const reference = errorReference(error);
    const {icon: StatusIcon, titleKey, detailKey} = errorMetaForKind(kind);

    useEffect(() => {
        console.error(`[UAV-PAS] mobile screen error ${reference} (${kind})`, error);
    }, [error, kind, reference]);

    return (
        <View style={styles.root} accessibilityRole="alert">
            <AppBackground/>
            <ScrollView
                contentContainerStyle={[
                    styles.scroll,
                    {paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl},
                ]}>
                <View style={styles.column}>
                    <View style={styles.header}>
                        <BrandMark/>
                    </View>
                    <Card style={styles.heroCard}>
                        <View style={styles.iconCircle}>
                            <StatusIcon size={24} color={colors.primary}/>
                        </View>
                        <AppText
                            variant="heading"
                            numberOfLines={kind === 'not_found' ? 1 : undefined}
                            adjustsFontSizeToFit={kind === 'not_found'}
                            minimumFontScale={kind === 'not_found' ? 0.72 : undefined}
                            style={styles.titleText}>
                            {t(titleKey)}
                        </AppText>
                        <AppText variant="small" style={styles.text}>{t(detailKey)}</AppText>
                        <View style={styles.reference}>
                            <AppText variant="caption">{t('errorPage.reference')}</AppText>
                            <AppText variant="title" style={styles.code}>{reference}</AppText>
                        </View>
                        {__DEV__ && error?.message ? (
                            <View style={styles.devBox}>
                                <AppText variant="caption">{error.message}</AppText>
                            </View>
                        ) : null}
                        <View style={styles.actions}>
                            <Button icon={RotateCcw} label={t('errorPage.retry')} onPress={retry}/>
                            <Button
                                tone="secondary"
                                size="sm"
                                icon={Home}
                                label={t('errorPage.home')}
                                onPress={() => router.replace('/')}
                            />
                        </View>
                    </Card>
                </View>
            </ScrollView>
        </View>
    );
}

/** Lost-route quadcopter illustration matching NotFoundView on the web portals. */
function LostRouteDroneGraphic() {
    return (
        <View style={styles.graphicWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Svg width={260} height={132} viewBox="0 0 280 150">
                <Path
                    d="M 14 122 C 60 122, 70 70, 120 72"
                    fill="none"
                    stroke={colors.inputBorder}
                    strokeWidth={2}
                    strokeDasharray="5 6"
                    strokeLinecap="round"
                />
                <Path
                    d="M 188 66 C 216 60, 238 78, 250 104"
                    fill="none"
                    stroke={colors.border}
                    strokeWidth={2}
                    strokeDasharray="2 7"
                    strokeLinecap="round"
                />
                <Circle cx={14} cy={122} r={5} fill={colors.surface} stroke={colors.muted} strokeWidth={2}/>
                <Circle
                    cx={254}
                    cy={112}
                    r={15}
                    fill={colors.surface}
                    stroke={colors.primary}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                />
                <SvgText x={254} y={118} textAnchor="middle" fontSize={16} fontWeight="700" fill={colors.primary}>
                    ?
                </SvgText>
                <G>
                    <Line x1={128} y1={56} x2={180} y2={56} stroke={colors.slateDark} strokeWidth={3} strokeLinecap="round"/>
                    <Line x1={128} y1={56} x2={122} y2={48} stroke={colors.slateDark} strokeWidth={3} strokeLinecap="round"/>
                    <Line x1={180} y1={56} x2={186} y2={48} stroke={colors.slateDark} strokeWidth={3} strokeLinecap="round"/>
                    <Ellipse cx={122} cy={46} rx={16} ry={3} fill={colors.inputBorder}/>
                    <Ellipse cx={186} cy={46} rx={16} ry={3} fill={colors.inputBorder}/>
                    <Rect x={140} y={52} width={28} height={18} rx={6} fill={colors.slateDark}/>
                    <Circle cx={154} cy={61} r={4} fill={colors.surface}/>
                    <Circle cx={154} cy={61} r={1.8} fill={colors.primary}/>
                    <Line x1={146} y1={70} x2={142} y2={80} stroke={colors.slate} strokeWidth={2.5} strokeLinecap="round"/>
                    <Line x1={162} y1={70} x2={166} y2={80} stroke={colors.slate} strokeWidth={2.5} strokeLinecap="round"/>
                </G>
            </Svg>
        </View>
    );
}

/** 404 unmatched route / broken deep-link screen across Customer, Operations, and Admin mobile flows. */
export function AppNotFoundView() {
    const {t} = useI18n();
    const auth = useOptionalAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const homeHref = auth?.status === 'signed-in' ? resolvePortalEntryHref(auth.activePortal) : '/login';

    return (
        <View style={styles.root} accessibilityRole="alert">
            <AppBackground/>
            <ScrollView
                contentContainerStyle={[
                    styles.scroll,
                    {paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl},
                ]}>
                <View style={styles.column}>
                    <View style={styles.header}>
                        <BrandMark/>
                        <View style={styles.badgeWrap}>
                            <Badge label="404" background={colors.primaryLight} color={colors.primary}/>
                        </View>
                    </View>
                    <Card style={styles.heroCard}>
                        <LostRouteDroneGraphic/>
                        <AppText
                            variant="heading"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.72}
                            style={styles.titleText}>
                            {t('errorPage.notFoundTitle')}
                        </AppText>
                        <AppText variant="small" style={styles.text}>{t('errorPage.notFoundDetail')}</AppText>
                        <View style={styles.actions}>
                            <Button icon={Home} label={t('errorPage.home')} onPress={() => router.replace(homeHref)}/>
                            {router.canGoBack() ? (
                                <Button
                                    tone="secondary"
                                    size="sm"
                                    icon={ArrowLeft}
                                    label={t('common.back')}
                                    onPress={() => router.back()}
                                />
                            ) : null}
                        </View>
                    </Card>
                </View>
            </ScrollView>
        </View>
    );
}

/** 403 / insufficient-permission card for guarded mobile screens (e.g. Admin Quick Actions or Support Inbox). */
export function AppForbiddenView({detail, fallbackHref = '/operations/missions'}: {
    detail?: string;
    fallbackHref?: '/operations/missions' | '/customer/home';
}) {
    const {t} = useI18n();
    const router = useRouter();
    return (
        <Card style={styles.forbiddenCard}>
            <View style={styles.forbiddenIcon}>
                <ShieldAlert size={24} color={colors.warning}/>
            </View>
            <AppText variant="title" style={styles.text}>{t('errorPage.forbiddenTitle')}</AppText>
            <AppText variant="small" style={styles.text}>{detail ?? t('errorPage.forbiddenDetail')}</AppText>
            <Button
                tone="secondary"
                size="sm"
                icon={Home}
                label={t('errorPage.home')}
                onPress={() => router.replace(fallbackHref)}
            />
        </Card>
    );
}

const styles = StyleSheet.create({
    root: {flex: 1, backgroundColor: colors.canvas},
    splash: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, backgroundColor: colors.white},
    scroll: {flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg},
    column: {width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center', gap: spacing.lg},
    header: {alignItems: 'center', gap: spacing.sm},
    badgeWrap: {alignSelf: 'center', alignItems: 'center'},
    heroCard: {
        borderTopWidth: 3,
        borderTopColor: colors.primary,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
    },
    forbiddenCard: {
        borderTopWidth: 3,
        borderTopColor: colors.warning,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    forbiddenIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.warningLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    graphicWrap: {alignItems: 'center', paddingVertical: spacing.xs},
    titleText: {width: '100%', textAlign: 'center'},
    text: {textAlign: 'center'},
    reference: {
        alignItems: 'center',
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    code: {letterSpacing: 2},
    devBox: {
        width: '100%',
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        padding: spacing.sm,
    },
    actions: {width: '100%', gap: spacing.sm, paddingTop: spacing.xs},
});
