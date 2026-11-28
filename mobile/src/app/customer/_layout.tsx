import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Redirect, Stack, usePathname} from 'expo-router';
import {useOrderRealtimeSync} from '@/hooks/useOrders';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {AssistantProvider} from '@/providers/AssistantContext';
import {detailHeader} from '@/components/layout/TabStack';
import {AppSplash} from '@/components/shared/AppStatusViews';

const PRIVATE_CUSTOMER_ROUTE = /^\/customer\/(mission|orders|projects|marketplace\/subscribe|billing|invoices|profile|security|notifications|assistant|provider(\/|$))/;

/**
 * Customer Marketplace & Booking stack: supports Guest browsing across discovery tabs, listing pages, and partner
 * storefronts, while gating personal booking/billing/seller-studio routes behind sign-in. Floating buttons are removed
 * so cards and CTAs stay completely unobstructed; AI Concierge + Live Support live inside the Support tab.
 */
export default function CustomerLayout() {
    const {status} = useAuth();
    const {t} = useI18n();
    const pathname = usePathname();
    useOrderRealtimeSync({notifyToast: true});
    if (status === 'loading') return <AppSplash/>;
    if (status !== 'signed-in' && PRIVATE_CUSTOMER_ROUTE.test(pathname)) {
        return <Redirect href="/login"/>;
    }
    return (
        <AssistantProvider>
            <View style={styles.fill}>
                <Stack screenOptions={detailHeader}>
                    <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                    <Stack.Screen name="orders/index" options={{title: t('mobile.overnight.navOrders')}}/>
                    <Stack.Screen name="orders/[id]/tracking" options={{title: t('mobile.overnight.trackingTitle')}}/>
                    <Stack.Screen name="projects/create" options={{title: t('mobile.overnight.newProjectBtn')}}/>
                    <Stack.Screen name="projects/[id]/index" options={{title: t('mobile.overnight.projectDetailTitle')}}/>
                    <Stack.Screen name="projects/[id]/edit" options={{title: t('mobile.overnight.editProjectTitle')}}/>
                    <Stack.Screen name="mission/create" options={{title: t('mobile.shop.checkoutModalTitle')}}/>
                    <Stack.Screen name="mission/[id]/index" options={{title: t('mobile.nav.missionDetail')}}/>
                    <Stack.Screen name="mission/[id]/edit" options={{title: t('missionDetail.editDraft')}}/>
                    <Stack.Screen name="weather" options={{title: t('mobile.nav.weather')}}/>
                    <Stack.Screen name="notifications" options={{title: t('nav.notifications')}}/>
                    <Stack.Screen name="billing" options={{title: t('nav.billing')}}/>
                    <Stack.Screen name="invoices/[id]" options={{title: t('mobile.billing.payTitle')}}/>
                    <Stack.Screen name="profile" options={{title: t('mobile.account.profile')}}/>
                    <Stack.Screen name="security" options={{title: t('mobile.account.security')}}/>
                    <Stack.Screen name="training/index" options={{title: t('nav.training')}}/>
                    <Stack.Screen name="training/[slug]" options={{title: t('nav.training')}}/>
                    <Stack.Screen name="training/lesson/[id]" options={{title: t('nav.training')}}/>
                    <Stack.Screen name="marketplace/subscribe" options={{title: t('mobile.overnight.subWizardTitle')}}/>
                    <Stack.Screen name="marketplace/[slug]" options={{title: t('mobile.nav.explore')}}/>
                    <Stack.Screen name="providers/[slug]" options={{title: t('mobile.provider.storefrontTitle')}}/>
                    <Stack.Screen name="provider/index" options={{title: t('mobile.provider.hubEntry')}}/>
                    <Stack.Screen name="provider/onboarding" options={{title: t('mobile.provider.menuOnboarding')}}/>
                    <Stack.Screen name="provider/listings" options={{title: t('mobile.provider.menuListings')}}/>
                    <Stack.Screen name="provider/fleet" options={{title: t('mobile.provider.menuFleet')}}/>
                    <Stack.Screen name="provider/pilots" options={{title: t('mobile.overnight.pilotsScreenTitle')}}/>
                    <Stack.Screen name="provider/orders" options={{title: t('mobile.provider.menuOrders')}}/>
                    <Stack.Screen name="provider/wallet" options={{title: t('mobile.provider.menuWallet')}}/>
                    <Stack.Screen name="assistant" options={{title: t('admin.assistant.open')}}/>
                    <Stack.Screen name="account-more" options={{title: t('mobile.account.moreTitle')}}/>
                </Stack>
            </View>
        </AssistantProvider>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
});
