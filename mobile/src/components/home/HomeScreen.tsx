import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {Bell, CloudSun, Compass, Layers, LogIn} from 'lucide-react-native';
import {BuyerLiveOrderStrip} from '@/components/home/BuyerLiveOrderStrip';
import {MarketplaceSearchHero} from '@/components/home/MarketplaceSearchHero';
import {ServiceCategoryShowcase} from '@/components/home/ServiceCategoryShowcase';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {MarketplaceListingCard} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {UserAvatar} from '@/components/profile/UserAvatar';
import {AppLogo} from '@/components/shared/BrandMark';
import {
    AppText,
    Button,
    EmptyState,
    ErrorState,
    LoadingState,
    Screen,
    SectionTitle,
} from '@/components/ui';
import {useCustomerAnalytics} from '@/hooks/dashboard/useCustomerAnalytics';
import {usePublicListings} from '@/hooks/marketplace/useMarketplaceCatalog';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

function MarketplaceHomeHeader() {
    const {t, formatDate} = useI18n();
    const {status, user} = useAuth();
    if (status !== 'signed-in') {
        return (
            <View style={styles.greeting} accessibilityRole="header">
                <AppLogo size={34}/>
                <View style={styles.flex}>
                    <AppText variant="caption" numberOfLines={1}>
                        {t('mobile.shop.guestHeaderSub')}
                    </AppText>
                    <AppText variant="title" numberOfLines={1}>
                        {t('mobile.shop.guestHeaderTitle')}
                    </AppText>
                </View>
            </View>
        );
    }
    return (
        <View style={styles.greeting} accessibilityRole="header">
            <UserAvatar size={36}/>
            <View style={styles.flex}>
                <AppText variant="caption" numberOfLines={1}>
                    {t('mobile.home.greeting').replace(/,$/, '')} ·{' '}
                    {formatDate(new Date(), {weekday: 'short', day: 'numeric', month: 'numeric'})}
                </AppText>
                <AppText variant="title" numberOfLines={1}>
                    {user?.fullName || user?.username || ''}
                </AppText>
            </View>
        </View>
    );
}

/**
 * 60-30-10 Two-Sided Drone Service Marketplace Home Screen (Buyer + Seller e-commerce feed):
 * Search bar + Mall Escrow hero -> 8-icon category showcase -> live active bookings/VietQR strip
 * -> Verified Partner Shops rail -> endless recommended flight service packages.
 */
export function HomeScreen() {
    const {t} = useI18n();
    const {status} = useAuth();
    const router = useRouter();
    const {rfqEnabled} = useSiteInfo();
    const analytics = useCustomerAnalytics();
    const listingsQuery = usePublicListings({sortBy: 'featured', size: 12});
    const {unreadCount} = useNotifications();
    const [refreshing, setRefreshing] = useState(false);

    const listings = listingsQuery.data?.content ?? [];

    const handleRefresh = () => {
        setRefreshing(true);
        const tasks: Promise<unknown>[] = [listingsQuery.refetch()];
        if (status === 'signed-in') tasks.push(analytics.refetch());
        void Promise.allSettled(tasks).finally(() => setRefreshing(false));
    };

    return (
        <Screen onRefresh={handleRefresh} refreshing={refreshing}>
            <Stack.Screen
                options={{
                    headerTitle: () => <MarketplaceHomeHeader/>,
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            <HeaderIconButton
                                icon={CloudSun}
                                label={t('mobile.nav.weather')}
                                onPress={() => router.push('/customer/weather')}
                            />
                            {status === 'signed-in' ? (
                                <HeaderIconButton
                                    icon={Bell}
                                    label={t('nav.notifications')}
                                    count={unreadCount}
                                    onPress={() => router.push('/customer/notifications')}
                                />
                            ) : (
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => router.push('/login')}
                                    style={({pressed}) => [styles.signInPill, pressed && styles.pressed]}>
                                    <LogIn size={14} color={colors.white}/>
                                    <AppText variant="caption" style={styles.signInText}>
                                        {t('mobile.shop.signInShort')}
                                    </AppText>
                                </Pressable>
                            )}
                        </View>
                    ),
                }}
            />

            <MarketplaceSearchHero rfqEnabled={rfqEnabled}/>

            <ServiceCategoryShowcase/>

            {status === 'signed-in' ? <BuyerLiveOrderStrip data={analytics.data}/> : null}

            <SectionTitle
                title={t('mobile.shop.feedTitle')}
                action={
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.navigate('/customer/services')}
                        style={({pressed}) => [pressed && styles.pressed]}>
                        <AppText variant="caption" style={styles.viewAllLink}>
                            {t('mobile.shop.viewAllBtn')}
                        </AppText>
                    </Pressable>
                }
            />

            {listingsQuery.isPending ? (
                <LoadingState label={t('services.loading')}/>
            ) : listingsQuery.isError ? (
                <ErrorState
                    message={t('services.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void listingsQuery.refetch()}
                />
            ) : listings.length === 0 ? (
                <EmptyState icon={Layers} message={t('mobile.marketplace.emptyListings')}/>
            ) : (
                <>
                    {listings.map(item => (
                        <MarketplaceListingCard key={item.id} item={item}/>
                    ))}
                    <Button
                        tone="secondary"
                        icon={Compass}
                        label={t('mobile.shop.exploreMoreBtn')}
                        onPress={() => router.navigate('/customer/services')}
                    />
                </>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    greeting: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    headerActions: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    signInPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        height: 36,
        borderRadius: radius.card,
        backgroundColor: colors.primary,
    },
    signInText: {color: colors.white, fontWeight: '700'},
    viewAllLink: {color: colors.primary, fontWeight: '700'},
    pressed: {opacity: 0.72},
});
