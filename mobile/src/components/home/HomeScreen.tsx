import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {Bell, Clock3, CreditCard, FilePenLine, Layers, Plane, Plus, Receipt, type LucideIcon} from 'lucide-react-native';
import {AppText, Card, EmptyState, ErrorState, LoadingState, Screen, SectionTitle} from '@/components/ui';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {UserAvatar} from '@/components/profile/UserAvatar';
import {WeatherCard} from '@/components/weather/WeatherCard';
import {MissionRow} from '@/components/mission/MissionBits';
import {useCustomerAnalytics} from '@/hooks/dashboard/useCustomerAnalytics';
import {useDeviceLocation} from '@/hooks/location/useDeviceLocation';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import type {MissionStatus} from '@/shared/types/mission/mission.types';
import {colors, font, radius, spacing} from '@/styles/tokens';

/** Big number, icon and two words; tapping opens the list behind it. */
function Tile({icon: Icon, value, label, onPress, accent = false}: { icon: LucideIcon; value: string; label: string; onPress: () => void; accent?: boolean }) {
    return (
        <Card onPress={onPress} accessibilityLabel={`${label}: ${value}`} style={[styles.tile, accent && styles.tileAccent]}>
            <View style={[styles.tileIcon, accent && styles.tileIconAccent]}>
                <Icon size={18} color={accent ? colors.white : colors.slateDark}/>
            </View>
            <AppText variant="heading" style={accent ? styles.light : undefined}>{value}</AppText>
            <AppText variant="caption" numberOfLines={1} style={accent ? styles.lightMuted : undefined}>{label}</AppText>
        </Card>
    );
}

/** The home header: avatar, "Xin chào · Thứ Hai 2/11" and the name, in place of the big "Tổng quan" title. */
function Greeting() {
    const {t, formatDate} = useI18n();
    const {user} = useAuth();
    return (
        <View style={styles.greeting} accessibilityRole="header">
            <UserAvatar size={36}/>
            <View style={styles.flex}>
                <AppText variant="caption" numberOfLines={1}>
                    {t('mobile.home.greeting').replace(/,$/, '')} · {formatDate(new Date(), {weekday: 'long', day: 'numeric', month: 'numeric'})}
                </AppText>
                <AppText variant="title" numberOfLines={1}>{user?.fullName || user?.username || ''}</AppText>
            </View>
        </View>
    );
}

function Action({icon: Icon, label, onPress}: { icon: LucideIcon; label: string; onPress: () => void }) {
    return (
        <Card onPress={onPress} accessibilityLabel={label} style={styles.action}>
            <View style={styles.actionIcon}><Icon size={22} color={colors.primary}/></View>
            <AppText variant="caption" style={styles.actionLabel} numberOfLines={2}>{label}</AppText>
        </Card>
    );
}

export function HomeScreen() {
    const {t, formatNumber, formatCurrency} = useI18n();
    const {can} = useAuth();
    const router = useRouter();
    const analytics = useCustomerAnalytics();
    const {point} = useDeviceLocation();
    const {unreadCount} = useNotifications();
    const data = analytics.data;

    return (
        <Screen onRefresh={() => void analytics.refetch()} refreshing={analytics.isRefetching}>
            <Stack.Screen options={{
                headerTitle: () => <Greeting/>,
                headerRight: () => <HeaderIconButton icon={Bell} label={t('nav.notifications')} dot={unreadCount > 0}
                                                     onPress={() => router.navigate('/customer/notifications')}/>,
            }}/>

            <WeatherCard point={point} title={t('weather.home.title')} onOpen={() => router.navigate('/customer/weather')}/>

            <View style={styles.actions}>
                {can('MISSION_CREATE') && <Action icon={Plus} label={t('missions.create')} onPress={() => router.push('/customer/mission/create')}/>}
                <Action icon={Layers} label={t('nav.services')} onPress={() => router.push('/customer/services')}/>
                <Action icon={CreditCard} label={t('nav.billing')} onPress={() => router.push('/customer/billing')}/>
            </View>

            <SectionTitle title={t('dashboard.analytics.pipelineTitle')}/>
            {analytics.isPending ? <LoadingState label={t('dashboard.analytics.loading')}/>
                : analytics.isError || !data ? <ErrorState message={t('dashboard.analytics.loadError')} retryLabel={t('common.retry')} onRetry={() => void analytics.refetch()}/>
                    : (
                        <>
                            <View style={styles.grid}>
                                <Tile icon={Clock3} value={formatNumber(data.pipeline.waiting)} label={t('dashboard.analytics.pipeline.waiting')}
                                      onPress={() => router.navigate({pathname: '/customer/missions', params: {filter: 'waiting'}})}/>
                                <Tile icon={Plane} accent value={formatNumber(data.pipeline.active)} label={t('dashboard.analytics.pipeline.active')}
                                      onPress={() => router.navigate({pathname: '/customer/missions', params: {filter: 'active'}})}/>
                                <Tile icon={Layers} value={formatNumber(data.pipeline.scheduled)} label={t('dashboard.analytics.pipeline.scheduled')}
                                      onPress={() => router.navigate({pathname: '/customer/missions', params: {filter: 'scheduled'}})}/>
                                <Tile icon={FilePenLine} value={formatNumber(data.pipeline.draft)} label={t('dashboard.analytics.pipeline.draft')}
                                      onPress={() => router.navigate({pathname: '/customer/missions', params: {filter: 'draft'}})}/>
                            </View>

                            {data.pendingInvoices.count > 0 && (
                                <Card onPress={() => router.push('/customer/billing')} style={styles.invoice}>
                                    <View style={styles.invoiceRow}>
                                        <Receipt size={20} color={colors.warning}/>
                                        <AppText variant="small" style={styles.invoiceText}>
                                            {t('dashboard.analytics.pendingInvoices', {count: data.pendingInvoices.count, amount: formatCurrency(data.pendingInvoices.amount)})}
                                        </AppText>
                                    </View>
                                </Card>
                            )}

                            <SectionTitle title={t('dashboard.analytics.upcomingTitle')}/>
                            {data.upcoming.length === 0
                                ? <EmptyState message={t('dashboard.analytics.noUpcoming')}/>
                                : data.upcoming.map(item => (
                                    <MissionRow key={item.id}
                                                mission={{code: item.code, title: item.title, status: item.status as MissionStatus, startTime: item.startTime, locationName: item.location ?? ''}}
                                                onPress={() => router.push({pathname: '/customer/mission/[id]', params: {id: String(item.id)}})}/>
                                ))}
                        </>
                    )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    pressed: {opacity: 0.75},
    greeting: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md},
    // White frames come from Card; only the layout differs here.
    tile: {flexBasis: '47%', flexGrow: 1, gap: 4},
    tileAccent: {backgroundColor: colors.primary, borderColor: colors.primary},
    tileIcon: {width: 34, height: 34, borderRadius: radius.control, backgroundColor: colors.slateLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4},
    tileIconAccent: {backgroundColor: 'rgba(255,255,255,0.2)'},
    light: {color: colors.white},
    lightMuted: {color: 'rgba(255,255,255,0.85)'},
    actions: {flexDirection: 'row', gap: spacing.md},
    action: {flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: 0},
    actionIcon: {width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
    actionLabel: {textAlign: 'center', color: colors.text, fontSize: font.caption, fontWeight: '600', paddingHorizontal: 4},
    invoice: {backgroundColor: colors.warningLight, borderColor: colors.warningLight},
    invoiceRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    invoiceText: {flex: 1, color: colors.warning, fontWeight: '600'},
});
