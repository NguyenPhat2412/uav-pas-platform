import React, {useState} from 'react';
import {FlatList, Pressable, RefreshControl, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {AlertTriangle, Bell, CheckCheck, ChevronRight, Info} from 'lucide-react-native';
import {AppText, Button, ChipGroup, CONTENT_WIDTH, EmptyState, ErrorState, LoadingState, styles as ui} from '@/components/ui';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {canUsePortal} from '@/shared/utils/auth/portal';
import type {NotificationRecord} from '@/shared/types/notification/notification.types';
import {resolveNotificationTarget, type MobilePortal} from '@/utils/operations/portal-routing';
import {AppBackground} from '@/components/layout/AppBackground';
import {colors, radius, spacing} from '@/styles/tokens';

type Filter = 'all' | 'unread';

function isAlert(item: NotificationRecord) {
    return item.type === 'SAR_TARGET_FOUND' || item.type === 'QUOTA_WARNING';
}

export function NotificationsScreen({portal = 'customer'}: { portal?: MobilePortal }) {
    const {t, formatDate} = useI18n();
    const {user, switchPortal} = useAuth();
    const router = useRouter();
    const {list, unreadCount, markOne, markAll} = useNotifications();
    const [filter, setFilter] = useState<Filter>('all');
    // Only a pull shows the spinner: the list also polls in the background, and tying the spinner to every refetch
    // pushed the whole list down by a spinner's height every few seconds.
    const [pulling, setPulling] = useState(false);
    const pull = () => {
        setPulling(true);
        void list.refetch().finally(() => setPulling(false));
    };
    const items = (list.data ?? []).filter(item => filter === 'all' || !item.isRead);

    const open = (item: NotificationRecord) => {
        if (!item.isRead) markOne.mutate(item.id);
        const target = resolveNotificationTarget(item, portal, user?.role);
        if (!target) return;
        if (target.pathname === '/customer/invoices/[id]') {
            if (portal !== 'customer') void switchPortal('customer');
            router.push({pathname: '/customer/invoices/[id]', params: target.params});
            return;
        }
        if (target.pathname === '/operations/sar/[missionId]') {
            if (portal === 'operations' || canUsePortal(user?.role, 'operations')) {
                if (portal !== 'operations') void switchPortal('operations');
                router.push({pathname: '/operations/sar/[missionId]', params: target.params});
            }
            return;
        }
        if (target.pathname === '/operations/support') {
            if (portal === 'operations' || canUsePortal(user?.role, 'operations')) {
                if (portal !== 'operations') void switchPortal('operations');
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
        <View style={styles.screen}>
            <AppBackground/>
            <Stack.Screen options={{
                headerRight: unreadCount > 0 ? () => (
                    <Button label={t('mobile.notifications.markAll')} icon={CheckCheck} tone="ghost" loading={markAll.isPending} onPress={() => markAll.mutate()}/>
                ) : undefined,
            }}/>
            {list.isPending ? <View style={styles.centerState}><LoadingState label={t('notificationsPage.loading')}/></View>
                : list.isError ? <View style={styles.centerState}><ErrorState message={t('notificationsShared.loadError')} retryLabel={t('common.retry')} onRetry={() => void list.refetch()}/></View>
                    : (
                        <FlatList
                            data={items}
                            keyExtractor={item => String(item.id)}
                            contentInsetAdjustmentBehavior="automatic"
                            contentContainerStyle={styles.list}
                            ListHeaderComponent={<ChipGroup value={filter} onChange={setFilter} options={[
                                {value: 'all', label: t('notificationsPage.all', {count: list.data?.length ?? 0})},
                                {value: 'unread', label: t('notificationsPage.unread', {count: unreadCount})},
                            ]}/>}
                            refreshControl={<RefreshControl refreshing={pulling} onRefresh={pull} tintColor={colors.primary}/>}
                            ListEmptyComponent={<EmptyState icon={Bell} message={t('notificationsPage.empty')}/>}
                            renderItem={({item}) => {
                                const Icon = isAlert(item) ? AlertTriangle : Info;
                                const target = resolveNotificationTarget(item, portal, user?.role);
                                return (
                                    <Pressable onPress={() => open(item)} accessibilityRole="button"
                                               accessibilityLabel={`${item.isRead ? '' : t('notificationsPage.unreadDot') + '. '}${item.title}`}
                                               style={({pressed}) => [ui.card, styles.item, !item.isRead && styles.unread, pressed && styles.pressed]}>
                                        <View style={[styles.icon, isAlert(item) && styles.iconAlert]}>
                                            <Icon size={18} color={isAlert(item) ? colors.danger : colors.slateDark}/>
                                        </View>
                                        <View style={styles.body}>
                                            <AppText variant="title" numberOfLines={2} style={styles.title}>{item.title}</AppText>
                                            <AppText variant="small" numberOfLines={3}>{item.content}</AppText>
                                            <AppText variant="caption">{formatDate(item.createdAt)}</AppText>
                                        </View>
                                        <View style={styles.end}>
                                            {!item.isRead && <View style={styles.dot}/>}
                                            {target && <ChevronRight size={16} color={colors.muted}/>}
                                        </View>
                                    </Pressable>
                                );
                            }}
                        />
                    )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.canvas},
    centerState: {flex: 1, justifyContent: 'center'},
    list: {padding: spacing.lg, gap: spacing.sm, flexGrow: 1, width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center'},
    // The white frame is the shared card (ui.card); a row is a little tighter.
    item: {flexDirection: 'row', gap: spacing.md, padding: spacing.md},
    unread: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
    pressed: {opacity: 0.75},
    icon: {width: 36, height: 36, borderRadius: radius.control, backgroundColor: colors.slateLight, alignItems: 'center', justifyContent: 'center'},
    iconAlert: {backgroundColor: colors.dangerLight},
    body: {flex: 1, gap: 2},
    title: {fontSize: 15},
    end: {alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4},
    dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary},
});
