import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {CalendarCheck, ChevronRight, Clock3, Plane, Receipt} from 'lucide-react-native';
import {AppText, Card, SectionTitle} from '@/components/ui';
import {MissionRow} from '@/components/mission/MissionBits';
import {useI18n} from '@/providers/I18nContext';
import type {CustomerAnalytics} from '@/shared/types/dashboard/dashboard.types';
import type {MissionStatus} from '@/shared/types/mission/mission.types';
import {colors, radius, spacing} from '@/styles/tokens';

/**
 * Progressive-disclosure live order & VietQR payment strip on Home:
 * appears only when the signed-in buyer actually has unpaid invoices or active/scheduled flights,
 * replacing the empty 0/0/0/0 dashboard counter grid.
 */
export function BuyerLiveOrderStrip({data}: { data?: CustomerAnalytics }) {
    const {t, formatNumber, formatCurrency} = useI18n();
    const router = useRouter();
    if (!data) return null;

    const totalOrders =
        data.pipeline.waiting +
        data.pipeline.active +
        data.pipeline.scheduled +
        data.pipeline.draft;
    const hasInvoices = data.pendingInvoices.count > 0;
    const topUpcoming = data.upcoming.slice(0, 2);

    if (!hasInvoices && totalOrders === 0 && topUpcoming.length === 0) {
        return null;
    }

    return (
        <View style={styles.wrap}>
            {hasInvoices ? (
                <Card onPress={() => router.push('/customer/billing')} style={styles.invoiceCard}>
                    <View style={styles.invoiceRow}>
                        <View style={styles.invoiceIcon}>
                            <Receipt size={18} color={colors.primary}/>
                        </View>
                        <View style={styles.flex}>
                            <AppText variant="small" style={styles.invoiceTitle}>
                                {t('dashboard.analytics.pendingInvoices', {
                                    count: data.pendingInvoices.count,
                                    amount: formatCurrency(data.pendingInvoices.amount),
                                })}
                            </AppText>
                            <AppText variant="caption" style={styles.invoiceCta}>
                                {t('mobile.shop.payVietQrNow')}
                            </AppText>
                        </View>
                        <ChevronRight size={18} color={colors.primary}/>
                    </View>
                </Card>
            ) : null}

            {totalOrders > 0 ? (
                <View style={styles.ordersBlock}>
                    <SectionTitle
                        title={t('mobile.shop.activeOrdersTitle')}
                        action={
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => router.navigate('/customer/missions')}
                                style={({pressed}) => [pressed && styles.pressed]}>
                                <AppText variant="caption" style={styles.link}>
                                    {t('mobile.shop.viewAllBtn')}
                                </AppText>
                            </Pressable>
                        }
                    />
                    <View style={styles.pillRow}>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() =>
                                router.navigate({pathname: '/customer/missions', params: {filter: 'waiting'}})
                            }
                            style={({pressed}) => [styles.statusPill, pressed && styles.pressed]}>
                            <Clock3 size={14} color={colors.slateDark}/>
                            <AppText variant="caption" style={styles.pillText}>
                                {t('mobile.home.pipeline.waiting')}: {formatNumber(data.pipeline.waiting)}
                            </AppText>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() =>
                                router.navigate({pathname: '/customer/missions', params: {filter: 'active'}})
                            }
                            style={({pressed}) => [styles.statusPill, styles.statusPillActive, pressed && styles.pressed]}>
                            <Plane size={14} color={colors.primary}/>
                            <AppText variant="caption" style={styles.pillTextActive}>
                                {t('mobile.home.pipeline.active')}: {formatNumber(data.pipeline.active)}
                            </AppText>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() =>
                                router.navigate({pathname: '/customer/missions', params: {filter: 'scheduled'}})
                            }
                            style={({pressed}) => [styles.statusPill, pressed && styles.pressed]}>
                            <CalendarCheck size={14} color={colors.slateDark}/>
                            <AppText variant="caption" style={styles.pillText}>
                                {t('mobile.home.pipeline.scheduled')}: {formatNumber(data.pipeline.scheduled)}
                            </AppText>
                        </Pressable>
                    </View>
                </View>
            ) : null}

            {topUpcoming.map(item => (
                <MissionRow
                    key={item.id}
                    mission={{
                        code: item.code,
                        title: item.title,
                        status: item.status as MissionStatus,
                        startTime: item.startTime,
                        locationName: item.location ?? '',
                    }}
                    onPress={() =>
                        router.push({pathname: '/customer/mission/[id]', params: {id: String(item.id)}})
                    }
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: spacing.md},
    invoiceCard: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primarySoftBorder,
    },
    invoiceRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    invoiceIcon: {
        width: 36,
        height: 36,
        borderRadius: radius.control,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    invoiceTitle: {color: colors.text, fontWeight: '700'},
    invoiceCta: {color: colors.primary, fontWeight: '700'},
    ordersBlock: {gap: spacing.sm},
    pillRow: {flexDirection: 'row', gap: spacing.xs},
    statusPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderRadius: radius.control,
        backgroundColor: colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    statusPillActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primarySoftBorder,
    },
    pillText: {color: colors.slateDark, fontWeight: '600'},
    pillTextActive: {color: colors.primary, fontWeight: '700'},
    link: {color: colors.primary, fontWeight: '700'},
    flex: {flex: 1},
    pressed: {opacity: 0.72},
});
