import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {Bell, CalendarCheck, Clock3, CreditCard, FilePenLine, GraduationCap, Layers, Plane, Plus, Receipt, type LucideIcon} from 'lucide-react-native';
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

/** Icon, number and one short word, four to a row; tapping opens the list behind it. The full name is read to VoiceOver. */
function Tile({icon: Icon, value, label, name, onPress, accent = false}: { icon: LucideIcon; value: string; label: string; name: string; onPress: () => void; accent?: boolean }) {
    return (
        <Card onPress={onPress} accessibilityLabel={`${name}: ${value}`} style={[styles.tile, accent && styles.tileAccent]}>
            <View style={[styles.tileIcon, accent && styles.tileIconAccent]}>
                <Icon size={18} color={accent ? colors.white : colors.slateDark}/>
            </View>
            <AppText variant="title" style={accent ? styles.light : undefined}>{value}</AppText>
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

function Action({icon: Icon, label, name, onPress}: { icon: LucideIcon; label: string; name: string; onPress: () => void }) {
    return (
        <Card onPress={onPress} accessibilityLabel={name} style={styles.action}>
            <View style={styles.actionIcon}><Icon size={22} color={colors.primary}/></View>
            <AppText variant="caption" style={styles.actionLabel} numberOfLines={1}>{label}</AppText>
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

            <WeatherCard compact point={point} title={t('weather.home.title')} onOpen={() => router.navigate('/customer/weather')}/>

            <View style={styles.actions}>
                {can('MISSION_CREATE') && <Action icon={Plus} label={t('mobile.home.shortcuts.create')} name={t('missions.create')} onPress={() => router.push('/customer/mission/create')}/>}
                <Action icon={Layers} label={t('mobile.home.shortcuts.services')} name={t('nav.services')} onPress={() => router.push('/customer/services')}/>
                <Action icon={CreditCard} label={t('mobile.home.shortcuts.billing')} name={t('nav.billing')} onPress={() => router.push('/customer/billing')}/>
                <Action icon={GraduationCap} label={t('mobile.home.shortcuts.training')} name={t('nav.training')} onPress={() => router.push('/customer/training')}/>
            </View>

            <SectionTitle title={t('dashboard.analytics.pipelineTitle')}/>
            {analytics.isPending ? <LoadingState label={t('dashboard.analytics.loading')}/>
                : analytics.isError || !data ? <ErrorState message={t('dashboard.analytics.loadError')} retryLabel={t('common.retry')} onRetry={() => void analytics.refetch()}/>
                    : (
                        <>
                            <View style={styles.grid}>
                                <Tile icon={Clock3} value={formatNumber(data.pipeline.waiting)} label={t('mobile.home.pipeline.waiting')} name={t('dashboard.analytics.pipeline.waiting')}
                                      onPress={() => router.navigate({pathname: '/customer/missions', params: {filter: 'waiting'}})}/>
                                <Tile icon={Plane} accent value={formatNumber(data.pipeline.active)} label={t('mobile.home.pipeline.active')} name={t('dashboard.analytics.pipeline.active')}
                                      onPress={() => router.navigate({pathname: '/customer/missions', params: {filter: 'active'}})}/>
                                <Tile icon={CalendarCheck} value={formatNumber(data.pipeline.scheduled)} label={t('mobile.home.pipeline.scheduled')} name={t('dashboard.analytics.pipeline.scheduled')}
                                      onPress={() => router.navigate({pathname: '/customer/missions', params: {filter: 'scheduled'}})}/>
                                <Tile icon={FilePenLine} value={formatNumber(data.pipeline.draft)} label={t('mobile.home.pipeline.draft')} name={t('dashboard.analytics.pipeline.draft')}
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
    grid: {flexDirection: 'row', gap: spacing.sm},
    // White frames come from Card; only the layout differs here.
    tile: {flex: 1, gap: 2, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xs},
    tileAccent: {backgroundColor: colors.primary, borderColor: colors.primary},
    tileIcon: {width: 34, height: 34, borderRadius: radius.control, backgroundColor: colors.slateLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4},
    tileIconAccent: {backgroundColor: 'rgba(255,255,255,0.2)'},
    light: {color: colors.white},
    lightMuted: {color: 'rgba(255,255,255,0.85)'},
    actions: {flexDirection: 'row', gap: spacing.sm},
    action: {flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: 0},
    actionIcon: {width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
    actionLabel: {textAlign: 'center', color: colors.text, fontSize: font.caption, fontWeight: '600', paddingHorizontal: 4},
    invoice: {backgroundColor: colors.warningLight, borderColor: colors.warningLight},
    invoiceRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    invoiceText: {flex: 1, color: colors.warning, fontWeight: '600'},
});
