import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {Bell, CloudSun, Compass, Layers, LogIn} from 'lucide-react-native';
import {MarketplaceSearchHero} from '@/components/home/MarketplaceSearchHero';
import {OrderStatusBarCard} from '@/components/home/OrderStatusBarCard';
import {ProjectPackagePromoCard} from '@/components/home/ProjectPackagePromoCard';
import {ServiceCategoryShowcase} from '@/components/home/ServiceCategoryShowcase';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {MarketplaceListingGrid} from '@/components/marketplace/catalog/MarketplaceListingGrid';
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
import {usePublicListings} from '@/hooks/marketplace/useMarketplaceCatalog';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useCustomerOrderSummary} from '@/hooks/order/useOrders';
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
                    <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
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
                <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                    {user?.fullName || user?.username || ''}
                </AppText>
            </View>
        </View>
    );
}

/**
 * Shopee-style UAV PAS Marketplace Home (S1-mobile.md #2 & UI-GUIDE §3.1):
 * Search + 3-slide banner -> 4x2 circular category icons -> 5-group Order Status Bar
 * -> "Gói theo dự án" card -> 2-column recommended flight service grid.
 */
export function HomeScreen() {
    const {t} = useI18n();
    const {status} = useAuth();
    const router = useRouter();
    const orderSummary = useCustomerOrderSummary();
    const listingsQuery = usePublicListings({sortBy: 'featured', size: 12});
    const {unreadCount} = useNotifications();
    const [refreshing, setRefreshing] = useState(false);

    const listings = listingsQuery.data?.content ?? [];

    const handleRefresh = () => {
        setRefreshing(true);
        const tasks: Promise<unknown>[] = [listingsQuery.refetch()];
        if (status === 'signed-in') tasks.push(orderSummary.refetch());
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
                                    accessibilityLabel={t('mobile.shop.signInShort')}
                                    onPress={() => router.push('/login')}
                                    style={({pressed}) => [styles.signInPill, pressed && styles.pressed]}>
                                    <LogIn size={14} color={colors.white}/>
                                    <AppText variant="caption" style={styles.signInText} numberOfLines={1}>
                                        {t('mobile.shop.signInShort')}
                                    </AppText>
                                </Pressable>
                            )}
                        </View>
                    ),
                }}
            />

            <MarketplaceSearchHero/>

            <ServiceCategoryShowcase/>

            {status === 'signed-in' ? <OrderStatusBarCard/> : null}

            <ProjectPackagePromoCard/>

            <SectionTitle
                title={t('mobile.shop.feedTitle')}
                action={
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('mobile.shop.viewAllBtn')}
                        onPress={() => router.navigate('/customer/services')}
                        style={({pressed}) => [pressed && styles.pressed]}>
                        <AppText variant="caption" style={styles.viewAllLink} numberOfLines={1}>
                            {t('mobile.shop.viewAllBtn')}
                        </AppText>
                    </Pressable>
                }
            />

            {listingsQuery.isPending && !listings.length ? (
                <LoadingState label={t('services.loading')}/>
            ) : listingsQuery.isError && !listings.length ? (
                <ErrorState
                    message={t('services.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void listingsQuery.refetch()}
                />
            ) : listings.length === 0 ? (
                <EmptyState
                    icon={Layers}
                    message={t('mobile.marketplace.emptyListings')}
                    action={
                        <Button
                            size="sm"
                            tone="secondary"
                            icon={Compass}
                            label={t('mobile.overnight.orderExploreCta')}
                            onPress={() => router.navigate('/customer/services')}
                        />
                    }
                />
            ) : (
                <>
                    <MarketplaceListingGrid items={listings}/>
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
