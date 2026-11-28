import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, Vibration, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AlertTriangle, Bell, ChevronRight, X} from 'lucide-react-native';
import {AppText} from '@/components/ui';
import {
    useNotifications,
    useRealtimeMobileNotifications,
    type MobileIncomingNotificationEvent,
} from '@/hooks/useNotifications';
import {
    formatModuleBadgeLabel,
    popupDurationMs,
} from '@/shared/forms/notification-policy-form';
import type {
    NotificationRecord,
    RealtimeNotificationPopupPayload,
} from '@/shared/types/notification.types';
import {resolveNotificationTarget} from '@/utils/portal-routing';
import {canUsePortal} from '@/shared/utils/portal';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

export function LiveNotificationBanner() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const {t} = useI18n();
    const {user, activePortal: portal, switchPortal} = useAuth();
    const {markOne} = useNotifications();
    const [active, setActive] = useState<RealtimeNotificationPopupPayload | null>(null);
    const [anim] = useState(() => new Animated.Value(0));
    const seenIdsRef = useRef<Set<number>>(new Set());
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismiss = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        Animated.timing(anim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
        }).start(() => setActive(null));
    }, [anim]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const handleIncoming = useCallback(
        (event: MobileIncomingNotificationEvent) => {
            const {notification, screenPopup} = event;
            if (!screenPopup || !notification || typeof notification.id !== 'number') return;
            if (seenIdsRef.current.has(notification.id)) return;
            seenIdsRef.current.add(notification.id);
            if (seenIdsRef.current.size > 150) {
                const oldest = seenIdsRef.current.values().next().value;
                if (oldest !== undefined) seenIdsRef.current.delete(oldest);
            }

            if (timerRef.current) clearTimeout(timerRef.current);
            try {
                Vibration.vibrate(
                    notification.severity === 'CRITICAL' ? [0, 70, 60, 90] : 25,
                );
            } catch {
                // Ignore simulators without haptics/vibration support.
            }
            setActive(notification);
            Animated.spring(anim, {
                toValue: 1,
                friction: 7,
                tension: 85,
                useNativeDriver: true,
            }).start();

            const duration = popupDurationMs(notification.severity);
            if (duration > 0) {
                timerRef.current = setTimeout(dismiss, duration);
            }
        },
        [anim, dismiss],
    );

    useRealtimeMobileNotifications(handleIncoming);

    if (!active) return null;

    const isCritical = active.severity === 'CRITICAL';
    const Icon = isCritical ? AlertTriangle : Bell;

    const openTarget = () => {
        if (active.id) markOne.mutate(active.id);
        dismiss();
        const activePortal = portal === 'operations' ? 'operations' : 'customer';
        const asRecord: NotificationRecord = {
            id: active.id,
            userId: user?.id ?? 0,
            title: active.title,
            content: active.content ?? '',
            type: (active.type as NotificationRecord['type']) ?? 'SYSTEM',
            moduleCode: active.moduleCode ?? 'SYSTEM',
            severity: active.severity ?? 'INFO',
            referenceType: active.referenceType ?? null,
            referenceId: active.referenceId ?? null,
            isRead: false,
            createdAt: active.createdAt ?? new Date().toISOString(),
        };
        const target = resolveNotificationTarget(asRecord, activePortal, user?.role);
        if (!target) {
            router.push(
                activePortal === 'operations'
                    ? '/operations/notifications'
                    : '/customer/notifications',
            );
            return;
        }
        if (target.pathname === '/customer/invoices/[id]') {
            if (activePortal !== 'customer') void switchPortal('customer');
            router.push({pathname: '/customer/invoices/[id]', params: target.params});
            return;
        }
        if (target.pathname === '/operations/sar/[missionId]') {
            if (activePortal === 'operations' || canUsePortal(user?.role, 'operations')) {
                if (activePortal !== 'operations') void switchPortal('operations');
                router.push({pathname: '/operations/sar/[missionId]', params: target.params});
            }
            return;
        }
        if (target.pathname === '/operations/support') {
            if (activePortal === 'operations' || canUsePortal(user?.role, 'operations')) {
                if (activePortal !== 'operations') void switchPortal('operations');
                router.push({pathname: '/operations/support', params: target.params});
            }
            return;
        }
        if (target.pathname === '/operations/mission/[id]') {
            router.push({pathname: '/operations/mission/[id]', params: target.params});
            return;
        }
        router.push({pathname: '/customer/mission/[id]', params: target.params});
    };

    return (
        <Animated.View
            pointerEvents="box-none"
            style={[
                styles.wrap,
                {
                    top: insets.top + spacing.xs,
                    opacity: anim,
                    transform: [
                        {
                            translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-96, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <View style={[styles.card, isCritical && styles.cardCritical]}>
                <View style={[styles.iconBox, isCritical && styles.iconCritical]}>
                    <Icon size={18} color={isCritical ? colors.danger : colors.slateDark}/>
                </View>

                <Pressable
                    accessibilityRole="button"
                    onPress={openTarget}
                    style={styles.body}
                >
                    <View style={styles.metaRow}>
                        <View style={[styles.badge, isCritical && styles.badgeCritical]}>
                            <AppText
                                variant="caption"
                                style={[styles.badgeText, isCritical && styles.badgeTextCritical]}
                            >
                                {formatModuleBadgeLabel(active.moduleCode)}
                            </AppText>
                        </View>
                        <View style={styles.openAction}>
                            <AppText variant="caption" style={styles.openText}>
                                {t('notificationCenter.popupOpen')}
                            </AppText>
                            <ChevronRight size={13} color={colors.primary}/>
                        </View>
                    </View>
                    <AppText variant="title" numberOfLines={1} style={styles.title}>
                        {active.title}
                    </AppText>
                    {!!active.content && (
                        <AppText variant="small" numberOfLines={2} style={styles.content}>
                            {active.content}
                        </AppText>
                    )}
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('notificationCenter.popupDismiss')}
                    hitSlop={8}
                    onPress={dismiss}
                    style={styles.closeBtn}
                >
                    <X size={16} color={colors.muted}/>
                </Pressable>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        zIndex: 999,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.text,
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: {width: 0, height: 6},
    },
    cardCritical: {
        borderColor: colors.danger,
        borderWidth: 1.5,
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: radius.control,
        backgroundColor: colors.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    iconCritical: {
        backgroundColor: colors.dangerLight,
    },
    body: {
        flex: 1,
        gap: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    badge: {
        paddingHorizontal: spacing.xs,
        paddingVertical: 1,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
    },
    badgeCritical: {
        backgroundColor: colors.danger,
    },
    badgeText: {
        fontWeight: '700',
        color: colors.slateDark,
    },
    badgeTextCritical: {
        color: colors.white,
    },
    openAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    openText: {
        fontWeight: '700',
        color: colors.primary,
    },
    title: {
        fontWeight: '700',
        color: colors.text,
    },
    content: {
        color: colors.muted,
    },
    closeBtn: {
        padding: spacing.xs,
    },
});
