import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
    Building2,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Cpu,
    FileCheck2,
    Layers,
    ShieldCheck,
    UserCheck,
    Wallet,
    type LucideIcon,
} from 'lucide-react-native';
import {
    IllustrativeBadge,
    IllustrativeFooterNote,
} from '@/components/shared/IllustrativeDisclaimer';
import {
    AppText,
    Badge,
    Card,
    GlassSurface,
    LoadingState,
    Screen,
    SectionTitle,
} from '@/components/ui';
import {
    useMyProviderFleet,
    useMyProviderListings,
    useMyProviderPilots,
    useMyProviderProfile,
    useMyProviderWallet,
    useProviderOrders,
} from '@/hooks/useProviderStudio';
import {useSiteInfo} from '@/hooks/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';
import {
    formatVndCompact,
    verificationStatusLabel,
} from '@/shared/forms/marketplace-forms';
import {cleanEntityName} from '@/utils/clean-text';
import {colors, radius, spacing} from '@/styles/tokens';

function StudioNavRow({
    icon: Icon,
    title,
    subtitle,
    badge,
    onPress,
}: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    badge?: string;
    onPress: () => void;
}) {
    return (
        <Card onPress={onPress} accessibilityLabel={`${title}. ${subtitle}`}>
            <View style={styles.navRow}>
                <View style={styles.iconWrap}>
                    <Icon size={20} color={colors.primary}/>
                </View>
                <View style={styles.flex}>
                    <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        {title}
                    </AppText>
                    <AppText variant="caption" numberOfLines={1}>
                        {subtitle}
                    </AppText>
                </View>
                {badge ? (
                    <Badge
                        label={badge}
                        background={colors.primaryLight}
                        color={colors.primary}
                    />
                ) : null}
                <ChevronRight size={18} color={colors.muted}/>
            </View>
        </Card>
    );
}

export function ProviderHubScreen() {
    const {t} = useI18n();
    const router = useRouter();
    const {platformFeeRate} = useSiteInfo();
    const profileQuery = useMyProviderProfile();
    const listingsQuery = useMyProviderListings();
    const fleetQuery = useMyProviderFleet();
    const pilotsQuery = useMyProviderPilots();
    const ordersQuery = useProviderOrders();
    const walletQuery = useMyProviderWallet();

    const profile = profileQuery.data;
    const listings = listingsQuery.data ?? [];
    const uavCount = (fleetQuery.data?.uavs.length ?? 0) + (fleetQuery.data?.equipment.length ?? 0);
    const pilotCount = pilotsQuery.data?.length ?? 0;
    const orders = ordersQuery.data ?? [];
    const wallet = walletQuery.data;

    const pendingOrders = orders.filter(
        o => o.providerResponseStatus === 'PENDING_PROVIDER' || o.status === 'IN_PROGRESS',
    ).length;

    const step1Done = Boolean(profile && profile.displayName);
    const step2Done = uavCount > 0;
    const step3Done = listings.length > 0;
    const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;

    const handleRefresh = () => {
        void profileQuery.refetch();
        void listingsQuery.refetch();
        void fleetQuery.refetch();
        void ordersQuery.refetch();
        void walletQuery.refetch();
    };

    if (profileQuery.isPending && !profile) {
        return (
            <Screen>
                <LoadingState/>
            </Screen>
        );
    }

    const feePercent = Math.round((wallet?.platformFeeRate ?? platformFeeRate) * 100);

    return (
        <Screen
            onRefresh={handleRefresh}
            refreshing={profileQuery.isRefetching || walletQuery.isRefetching}>
            <GlassSurface style={styles.heroGlass} fallback={styles.heroFallback}>
                <View style={styles.topRow}>
                    <View style={styles.heroIcon}>
                        <Building2 size={22} color={colors.primary}/>
                    </View>
                    <View style={styles.flex}>
                        <AppText variant="heading">
                            {cleanEntityName(profile?.displayName) || t('mobile.provider.welcomeTitle')}
                        </AppText>
                        <Badge
                            icon={
                                profile?.verificationStatus === 'VERIFIED'
                                    ? CheckCircle2
                                    : ShieldCheck
                            }
                            label={verificationStatusLabel(profile?.verificationStatus)}
                            background={
                                profile?.verificationStatus === 'VERIFIED'
                                    ? colors.primaryLight
                                    : colors.warningLight
                            }
                            color={
                                profile?.verificationStatus === 'VERIFIED'
                                    ? colors.primary
                                    : colors.warning
                            }
                        />
                    </View>
                </View>

                <AppText variant="caption">
                    {t('mobile.provider.feeBanner', {fee: feePercent})}
                </AppText>

                <View style={styles.goalBarRow}>
                    {[step1Done, step2Done, step3Done].map((done, idx) => (
                        <View
                            key={idx}
                            style={[styles.goalSegment, done && styles.goalSegmentDone]}
                        />
                    ))}
                </View>
                <AppText variant="caption">
                    {t('mobile.provider.goalProgress', {done: completedSteps})}
                </AppText>

                {profile?.reviewNote ? (
                    <View style={styles.noteBox}>
                        <AppText variant="caption" style={styles.warningText}>
                            {profile.reviewNote}
                        </AppText>
                    </View>
                ) : null}
            </GlassSurface>

            <View style={styles.kpiRow}>
                <Card style={styles.kpiCard} onPress={() => router.push('/customer/provider/wallet')}>
                    <AppText
                        variant="caption"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}>
                        {t('mobile.provider.availableBalance')}
                    </AppText>
                    <View style={styles.kpiValRow}>
                        <AppText variant="title" style={styles.price} numberOfLines={1}>
                            {formatVndCompact(wallet?.availableBalanceVnd ?? 0)}
                        </AppText>
                        <IllustrativeBadge/>
                    </View>
                </Card>
                <Card style={styles.kpiCard} onPress={() => router.push('/customer/provider/wallet')}>
                    <AppText
                        variant="caption"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}>
                        {t('mobile.provider.escrowHeld')}
                    </AppText>
                    <View style={styles.kpiValRow}>
                        <AppText variant="title" numberOfLines={1}>
                            {formatVndCompact(wallet?.escrowHeldVnd ?? 0)}
                        </AppText>
                        <IllustrativeBadge/>
                    </View>
                </Card>
            </View>

            <SectionTitle title={t('mobile.provider.studioMenuTitle')}/>

            <StudioNavRow
                icon={FileCheck2}
                title={t('mobile.provider.menuOnboarding')}
                subtitle={`${verificationStatusLabel(profile?.verificationStatus)} · ${t('mobile.provider.menuOnboardingDesc')}`}
                onPress={() => router.push('/customer/provider/onboarding')}
            />
            <StudioNavRow
                icon={ClipboardList}
                title={t('mobile.provider.menuOrders')}
                subtitle={t('mobile.provider.menuOrdersDesc')}
                badge={pendingOrders > 0 ? `${pendingOrders}` : undefined}
                onPress={() => router.push('/customer/provider/orders')}
            />
            <StudioNavRow
                icon={Layers}
                title={t('mobile.provider.menuListings')}
                subtitle={t('mobile.provider.menuListingsDesc')}
                badge={`${listings.length}`}
                onPress={() => router.push('/customer/provider/listings')}
            />
            <StudioNavRow
                icon={Cpu}
                title={t('mobile.provider.menuFleet')}
                subtitle={t('mobile.provider.menuFleetDesc')}
                badge={`${uavCount}`}
                onPress={() => router.push('/customer/provider/fleet')}
            />
            <StudioNavRow
                icon={UserCheck}
                title={t('mobile.overnight.pilotsMenuTitle')}
                subtitle={t('mobile.overnight.pilotsMenuDesc')}
                badge={pilotCount > 0 ? `${pilotCount}` : undefined}
                onPress={() => router.push('/customer/provider/pilots')}
            />
            <StudioNavRow
                icon={Wallet}
                title={t('mobile.provider.menuWallet')}
                subtitle={t('mobile.provider.menuWalletDesc')}
                onPress={() => router.push('/customer/provider/wallet')}
            />
            <IllustrativeFooterNote/>
        </Screen>
    );
}

const styles = StyleSheet.create({
    heroGlass: {
        borderRadius: radius.card,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: 1.5,
        borderColor: colors.glassBorderSelected,
    },
    heroFallback: {backgroundColor: colors.glassSurfaceSelected},
    topRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    heroIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goalBarRow: {flexDirection: 'row', gap: spacing.xs},
    goalSegment: {flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border},
    goalSegmentDone: {backgroundColor: colors.primary},
    noteBox: {
        backgroundColor: colors.warningLight,
        borderRadius: radius.control,
        padding: spacing.sm,
    },
    warningText: {color: colors.warning, fontWeight: '600'},
    kpiRow: {flexDirection: 'row', gap: spacing.sm},
    kpiCard: {flex: 1, gap: 4},
    kpiValRow: {flexDirection: 'row', alignItems: 'baseline', gap: 4},
    price: {color: colors.primary, fontWeight: '700'},
    navRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius.control,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flex: {flex: 1, gap: 2},
});
