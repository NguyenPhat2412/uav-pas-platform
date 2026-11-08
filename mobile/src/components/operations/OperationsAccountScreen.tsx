import React from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ALargeSmall, ArrowRightLeft, Bell, GraduationCap, Languages, LogOut, ShieldAlert, ShieldCheck, UserRound} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ChipGroup, Screen, SectionTitle} from '@/components/ui';
import {AccountRow, AvatarButton} from '@/components/profile/AccountScreen';
import {PushDeviceCard} from '@/components/profile/PushDeviceCard';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {TEXT_SIZES, useTextSize, type TextSize} from '@/providers/TextSizeContext';
import {localeMetaMap, supportedLocales, type SupportedLocale} from '@/shared/i18n/config';
import {displayLabel} from '@/shared/lib/presentation';
import {API_BASE_URL} from '@/config/env';
import {colors, spacing} from '@/styles/tokens';

export function OperationsAccountScreen() {
    const {t, locale, setLocale} = useI18n();
    const {user, can, logout, switchPortal} = useAuth();
    const {unreadCount} = useNotifications();
    const {size, setSize} = useTextSize();
    const router = useRouter();
    const name = user?.fullName || user?.username || '';
    const canAdminQuick =
        can('USER_MANAGE') ||
        can('USER_VIEW') ||
        (can('DASHBOARD_VIEW') && can('MISSION_VIEW_ALL'));

    const confirmLogout = () =>
        Alert.alert(t('common.logout'), t('mobile.account.logoutQuestion'), [
            {text: t('common.cancel'), style: 'cancel'},
            {text: t('common.logout'), style: 'destructive', onPress: () => void logout()},
        ]);

    const enterCustomerPortal = async () => {
        await switchPortal('customer');
        router.replace('/customer/home');
    };

    return (
        <Screen>
            <View style={styles.identity}>
                <AvatarButton/>
                <View style={styles.flex}>
                    <AppText variant="title" numberOfLines={1}>{name}</AppText>
                    <AppText variant="small" numberOfLines={1}>{user?.email}</AppText>
                    {user?.role ? (
                        <View style={styles.roleBadge}>
                            <Badge label={displayLabel(user.role)} background={colors.slateDark} color={colors.white}/>
                        </View>
                    ) : null}
                </View>
            </View>

            <Card style={styles.workspaceCard}>
                <SectionTitle title={t('mobile.workspace.title')}/>
                <AppText variant="small">{t('mobile.workspace.toCustomerHint')}</AppText>
                <Button
                    label={t('mobile.workspace.switchToCustomer')}
                    icon={ArrowRightLeft}
                    tone="secondary"
                    onPress={() => void enterCustomerPortal()}
                />
            </Card>

            <Card>
                <AccountRow
                    icon={Bell}
                    label={t('nav.notifications')}
                    onPress={() => router.push('/operations/notifications')}
                    right={
                        unreadCount > 0 ? (
                            <Badge
                                label={unreadCount > 99 ? '99+' : String(unreadCount)}
                                background={colors.primary}
                                color={colors.white}
                            />
                        ) : undefined
                    }
                />
                <AccountRow icon={UserRound} label={t('mobile.account.profile')} onPress={() => router.push('/operations/profile')}/>
                <AccountRow icon={ShieldCheck} label={t('mobile.account.security')} onPress={() => router.push('/operations/security')}/>
                {canAdminQuick && (
                    <AccountRow
                        icon={ShieldAlert}
                        label={t('mobile.adminQuick.entryLabel')}
                        onPress={() => router.push('/operations/admin-quick')}
                    />
                )}
                <AccountRow icon={GraduationCap} label={t('nav.training')} onPress={() => router.push('/operations/training')}/>
            </Card>

            <PushDeviceCard/>

            <Card>
                <View style={styles.sectionHeader}>
                    <Languages size={18} color={colors.slateDark}/>
                    <AppText variant="title">{t('common.language')}</AppText>
                </View>
                <ChipGroup<SupportedLocale>
                    value={locale}
                    onChange={setLocale}
                    options={supportedLocales.map(code => ({
                        value: code,
                        label: `${localeMetaMap[code].flag} ${localeMetaMap[code].nativeName}`,
                    }))}
                />
            </Card>

            <Card>
                <View style={styles.sectionHeader}>
                    <ALargeSmall size={18} color={colors.slateDark}/>
                    <AppText variant="title">{t('mobile.account.textSize')}</AppText>
                </View>
                <ChipGroup<TextSize>
                    value={size}
                    onChange={setSize}
                    options={TEXT_SIZES.map(step => ({
                        value: step.value,
                        label: t(`mobile.account.textSizes.${step.value}`),
                    }))}
                />
            </Card>

            <Card>
                <AccountRow icon={LogOut} label={t('common.logout')} onPress={confirmLogout} danger/>
            </Card>

            <AppText variant="caption" style={styles.version}>
                NguyenPhat2412 · {API_BASE_URL.replace(/^https?:\/\//, '')}
            </AppText>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    identity: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
    roleBadge: {marginTop: 4},
    workspaceCard: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
    sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    version: {textAlign: 'center'},
});
