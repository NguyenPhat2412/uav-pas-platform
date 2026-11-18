import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
    CalendarCheck,
    ChevronRight,
    Clock3,
    PackageCheck,
    Plane,
    Star,
    type LucideIcon,
} from 'lucide-react-native';
import {AppText, Card, ErrorState, ScaledText, SectionTitle, Skeleton} from '@/components/ui';
import {useCustomerOrderSummary} from '@/hooks/order/useOrders';
import {useI18n} from '@/providers/I18nContext';
import type {OrderStatusGroup} from '@/shared/types/project/project.types';
import {colors, spacing} from '@/styles/tokens';

interface StatusItem {
    group: OrderStatusGroup;
    label: string;
    count: number;
    icon: LucideIcon;
}

/**
 * Shopee-style 5-icon Order Status Bar on Home (`GET /api/v1/orders/summary`, UI-GUIDE §3.5):
 * Chờ xác nhận · Chờ bay · Đang bay · Bàn giao · Đánh giá.
 */
export function OrderStatusBarCard() {
    const {t} = useI18n();
    const router = useRouter();
    const summaryQuery = useCustomerOrderSummary();

    const openOrders = (group?: OrderStatusGroup) => {
        router.push(
            group
                ? {pathname: '/customer/orders', params: {group}}
                : '/customer/orders',
        );
    };

    if (summaryQuery.isPending) {
        return (
            <Card style={styles.card}>
                <Skeleton width={120} height={16}/>
                <View style={styles.row}>
                    {[1, 2, 3, 4, 5].map(idx => (
                        <View key={idx} style={styles.skeletonCol}>
                            <Skeleton width={38} height={38}/>
                            <Skeleton width={46} height={11}/>
                        </View>
                    ))}
                </View>
            </Card>
        );
    }

    if (summaryQuery.isError && !summaryQuery.isNotFound) {
        return (
            <ErrorState
                message={t('mobile.overnight.orderLoadError')}
                retryLabel={t('common.retry')}
                onRetry={() => void summaryQuery.refetch()}
            />
        );
    }

    const counts = summaryQuery.isNotFound || !summaryQuery.data
        ? {pending: 0, scheduled: 0, inFlight: 0, delivered: 0, toReview: 0}
        : summaryQuery.data;

    const items: StatusItem[] = [
        {group: 'PENDING', label: t('mobile.overnight.orderPending'), count: counts.pending, icon: Clock3},
        {group: 'SCHEDULED', label: t('mobile.overnight.orderScheduled'), count: counts.scheduled, icon: CalendarCheck},
        {group: 'IN_FLIGHT', label: t('mobile.overnight.orderInFlight'), count: counts.inFlight, icon: Plane},
        {group: 'DELIVERED', label: t('mobile.overnight.orderDelivered'), count: counts.delivered, icon: PackageCheck},
        {group: 'TO_REVIEW', label: t('mobile.overnight.orderToReview'), count: counts.toReview, icon: Star},
    ];

    return (
        <Card style={styles.card}>
            <SectionTitle
                title={t('mobile.overnight.orderBarTitle')}
                action={
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => openOrders()}
                        style={({pressed}) => [styles.allBtn, pressed && styles.pressed]}>
                        <AppText variant="caption" style={styles.allText} numberOfLines={1}>
                            {t('mobile.shop.viewAllBtn')}
                        </AppText>
                        <ChevronRight size={14} color={colors.primary}/>
                    </Pressable>
                }
            />
            <View style={styles.row}>
                {items.map(item => {
                    const Icon = item.icon;
                    return (
                        <Pressable
                            key={item.group}
                            accessibilityRole="button"
                            accessibilityLabel={`${item.label}: ${item.count}`}
                            onPress={() => openOrders(item.group)}
                            style={({pressed}) => [styles.cell, pressed && styles.pressed]}>
                            <View style={styles.iconWrap}>
                                <Icon size={21} color={colors.slateDark} strokeWidth={1.85}/>
                                {item.count > 0 && (
                                    <View style={styles.badge}>
                                        <ScaledText style={styles.badgeText} numberOfLines={1}>
                                            {item.count > 99 ? '99+' : item.count}
                                        </ScaledText>
                                    </View>
                                )}
                            </View>
                            <AppText
                                variant="caption"
                                style={styles.cellLabel}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.78}>
                                {item.label}
                            </AppText>
                        </Pressable>
                    );
                })}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {padding: spacing.md, gap: spacing.md},
    allBtn: {flexDirection: 'row', alignItems: 'center', gap: 2},
    allText: {color: colors.primary, fontWeight: '700'},
    row: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'},
    skeletonCol: {flex: 1, alignItems: 'center', gap: 6},
    cell: {flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingHorizontal: 2},
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.slateLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -5,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: colors.primary,
        borderWidth: 1.5,
        borderColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {color: colors.white, fontSize: 10, fontWeight: '700'},
    cellLabel: {fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center'},
    pressed: {opacity: 0.72},
});
