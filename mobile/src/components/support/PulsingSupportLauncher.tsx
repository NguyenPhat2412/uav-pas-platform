import React, {useEffect, useState} from 'react';
import {Animated, Easing, Platform, Pressable, StyleSheet, View} from 'react-native';
import {usePathname, useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable} from 'expo-glass-effect';
import {AppLogo} from '@/components/shared/BrandMark';
import {ScaledText} from '@/components/ui';
import {useAdminSupportSummary, useCanManageSupport} from '@/hooks/support/useAdminSupportMobile';
import {usePublicSupportSession} from '@/hooks/support/usePublicSupportMobile';
import {useI18n} from '@/providers/I18nContext';
import {colors, font} from '@/styles/tokens';

export type SupportLauncherMode = 'auth' | 'customer' | 'admin';

const AUTH_PATHS = ['/login', '/register', '/forgot-password'];
const CUSTOMER_TABS = [
    '/customer/home',
    '/customer/missions',
    '/customer/weather',
    '/customer/notifications',
    '/customer/account',
];
const OPERATIONS_TABS = [
    '/operations/missions',
    '/operations/sar',
    '/operations/fleet',
    '/operations/weather',
    '/operations/account',
];

const glass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
const SIZE = 56;
// Stacked cleanly above AssistantLauncher (74 + 58 + 12 = 144) on tab screens; flush bottom-right on auth screens.
const ABOVE_ASSISTANT = 144;
const AUTH_BOTTOM = 18;

/**
 * Floating bottom-right UAV PAS Logo button with continuous radar pulse animation
 * and live unread message counter badge for Visitor, Customer, and Admin workspaces.
 */
export function PulsingSupportLauncher({mode}: { mode: SupportLauncherMode }) {
    const {t} = useI18n();
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const canManage = useCanManageSupport();

    const isVisible =
        mode === 'auth'
            ? AUTH_PATHS.includes(pathname)
            : mode === 'customer'
                ? CUSTOMER_TABS.includes(pathname)
                : canManage && OPERATIONS_TABS.includes(pathname);

    const publicSession = usePublicSupportSession(false);
    const adminSummary = useAdminSupportSummary(mode === 'admin' && isVisible);

    const unreadCount =
        mode === 'admin'
            ? adminSummary.data?.unreadMessages ?? adminSummary.data?.unreadThreads ?? 0
            : publicSession.unreadCount;

    const [pulse] = useState(() => new Animated.Value(0));

    useEffect(() => {
        if (!isVisible) return;
        pulse.setValue(0);
        const loop = Animated.loop(
            Animated.timing(pulse, {
                toValue: 1,
                duration: unreadCount > 0 ? 1150 : 2100,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        );
        loop.start();
        return () => loop.stop();
    }, [isVisible, pulse, unreadCount]);

    if (!isVisible) return null;

    const targetHref =
        mode === 'auth'
            ? '/(auth)/support'
            : mode === 'customer'
                ? '/customer/support'
                : '/operations/support';

    const label =
        mode === 'admin'
            ? t('mobile.support.adminLauncherLabel')
            : t('mobile.support.launcherLabel');

    const ringScale = pulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.58]});
    const ringOpacity = pulse.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [unreadCount > 0 ? 0.65 : 0.42, 0.16, 0],
    });
    const bottomOffset = insets.bottom + (mode === 'auth' ? AUTH_BOTTOM : ABOVE_ASSISTANT);

    const emblem = <AppLogo size={34}/>;

    return (
        <View pointerEvents="box-none" style={[styles.wrap, {bottom: bottomOffset}]}>
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.pulseRing,
                    unreadCount > 0 ? styles.pulseRingAlert : styles.pulseRingIdle,
                    {transform: [{scale: ringScale}], opacity: ringOpacity},
                ]}
            />
            <Pressable
                onPress={() => router.push(targetHref)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({pressed}) => [pressed && styles.pressed]}>
                {glass ? (
                    <GlassView isInteractive glassEffectStyle="regular" style={styles.button}>
                        {emblem}
                    </GlassView>
                ) : (
                    <View style={[styles.button, styles.solid]}>{emblem}</View>
                )}
                <View style={styles.onlineDot}/>
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <ScaledText style={styles.badgeText}>
                            {unreadCount > 99 ? '99+' : String(unreadCount)}
                        </ScaledText>
                    </View>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {position: 'absolute', right: 16, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center'},
    pulseRing: {position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2.5},
    pulseRingIdle: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
    pulseRingAlert: {borderColor: colors.danger, backgroundColor: colors.dangerLight},
    button: {
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    solid: {
        backgroundColor: colors.surface,
        shadowColor: colors.text,
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 4},
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 5,
        backgroundColor: colors.danger,
        borderWidth: 2,
        borderColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {fontSize: font.caption - 1, fontWeight: '800', color: colors.white},
    pressed: {transform: [{scale: 0.94}]},
});
