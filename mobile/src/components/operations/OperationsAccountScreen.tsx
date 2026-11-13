import React, {useState} from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable} from 'expo-glass-effect';
import {
    ALargeSmall,
    ArrowRightLeft,
    Bell,
    Ellipsis,
    GraduationCap,
    Languages,
    MessageSquare,
    ShieldAlert,
    ShieldCheck,
    UserRound,
    type LucideIcon,
} from 'lucide-react-native';
import {AppText, Badge, Card, ChipGroup, Screen} from '@/components/ui';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {AccountFooterActions} from '@/components/profile/AccountFooterActions';
import {AccountRow, AvatarButton} from '@/components/profile/AccountScreen';
import {PushDeviceCard} from '@/components/profile/PushDeviceCard';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useAdminSupportSummary, useCanManageSupport} from '@/hooks/support/useAdminSupportMobile';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {TEXT_SIZES, useTextSize, type TextSize} from '@/providers/TextSizeContext';
import {localeMetaMap, supportedLocales, type SupportedLocale} from '@/shared/i18n/config';
import {displayLabel} from '@/shared/lib/presentation';
import {colors, radius, spacing} from '@/styles/tokens';

const glass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

function OpsQuickTile({
    icon: Icon,
    label,
    badge,
    active = false,
    onPress,
}: {
    icon: LucideIcon;
    label: string;
    badge?: number;
    active?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({pressed}) => [styles.tile, pressed && styles.pressed]}>
            <View style={[styles.tileIcon, active && styles.tileIconActive]}>
                <Icon size={21} color={active ? colors.white : colors.primary}/>
                {badge && badge > 0 ? (
                    <View style={styles.tileBadge}>
                        <AppText variant="caption" style={styles.tileBadgeText}>
                            {badge > 99 ? '99+' : String(badge)}
                        </AppText>
                    </View>
                ) : null}
            </View>
            <AppText variant="caption" style={styles.tileLabel} numberOfLines={2}>
                {label}
            </AppText>
        </Pressable>
    );
}

export function OperationsAccountScreen() {
    const {t, locale, setLocale} = useI18n();
    const {user, can, switchPortal} = useAuth();
    const {unreadCount} = useNotifications();
    const {size, setSize} = useTextSize();
    const router = useRouter();
    const [moreOpen, setMoreOpen] = useState(false);
    const canManageSupport = useCanManageSupport();
    const supportSummary = useAdminSupportSummary(canManageSupport);
    const supportUnread = supportSummary.data?.unreadMessages ?? supportSummary.data?.unreadThreads ?? 0;
    const name = user?.fullName || user?.username || '';
    const canAdminQuick =
        can('USER_MANAGE') ||
        can('USER_VIEW') ||
        (can('DASHBOARD_VIEW') && can('MISSION_VIEW_ALL'));

    const enterCustomerPortal = async () => {
        await switchPortal('customer');
        router.replace('/customer/home');
    };

    const tiles = (
        <View style={styles.grid}>
            <OpsQuickTile
                icon={Bell}
                label={t('nav.notifications')}
                badge={unreadCount}
                onPress={() => router.push('/operations/notifications')}
            />
            <OpsQuickTile
                icon={UserRound}
                label={t('mobile.account.tiles.profile')}
                onPress={() => router.push('/operations/profile')}
            />
            <OpsQuickTile
                icon={ShieldCheck}
                label={t('mobile.account.tiles.security')}
                onPress={() => router.push('/operations/security')}
            />
            {canManageSupport ? (
                <OpsQuickTile
                    icon={MessageSquare}
                    label={t('mobile.nav.support')}
                    badge={supportUnread}
                    onPress={() => router.push('/operations/support')}
                />
            ) : (
                <OpsQuickTile
                    icon={GraduationCap}
                    label={t('mobile.account.tiles.training')}
                    onPress={() => router.push('/operations/training')}
                />
            )}
            <OpsQuickTile
                icon={Ellipsis}
                label={t('mobile.account.more')}
                active={moreOpen}
                onPress={() => setMoreOpen(open => !open)}
            />
        </View>
    );

    return (
        <Screen>
            <View style={styles.identity}>
                <AvatarButton/>
                <View style={styles.flex}>
                    <AppText variant="title" numberOfLines={1}>{name}</AppText>
                    <AppText variant="small" numberOfLines={1}>{user?.email}</AppText>
                    {user?.role ? <AppText variant="caption">{displayLabel(user.role)}</AppText> : null}
                </View>
            </View>

            <Stack.Screen
                options={{
                    headerRight: () => (
                        <HeaderIconButton
                            icon={ArrowRightLeft}
                            label={t('mobile.workspace.switchToCustomer')}
                            onPress={() => void enterCustomerPortal()}
                        />
                    ),
                }}
            />

            {glass ? <GlassView glassEffectStyle="regular" style={styles.glass}>{tiles}</GlassView> : <Card>{tiles}</Card>}

            {moreOpen && (
                <Card style={styles.moreCard}>
                    {canAdminQuick && (
                        <AccountRow
                            icon={ShieldAlert}
                            label={t('mobile.adminQuick.title')}
                            onPress={() => router.push('/operations/admin-quick')}
                        />
                    )}
                    {canManageSupport && (
                        <AccountRow
                            icon={GraduationCap}
                            label={t('nav.training')}
                            onPress={() => router.push('/operations/training')}
                        />
                    )}
                    <View style={styles.prefsPanel}>
                        <View style={styles.prefGroup}>
                            <View style={styles.prefHeader}>
                                <Languages size={15} color={colors.slateDark}/>
                                <AppText variant="caption" style={styles.prefLabel}>{t('common.language')}</AppText>
                            </View>
                            <ChipGroup<SupportedLocale>
                                wrap
                                value={locale}
                                onChange={setLocale}
                                options={supportedLocales.map(code => ({
                                    value: code,
                                    label: `${localeMetaMap[code].flag} ${localeMetaMap[code].nativeName}`,
                                }))}
                            />
                        </View>
                        <View style={styles.prefGroup}>
                            <View style={styles.prefHeader}>
                                <ALargeSmall size={15} color={colors.slateDark}/>
                                <AppText variant="caption" style={styles.prefLabel}>{t('mobile.account.textSize')}</AppText>
                                <Badge
                                    label={t(`mobile.account.textSizes.${size}`)}
                                    background={colors.slateLight}
                                    color={colors.slateDark}
                                />
                            </View>
                            <ChipGroup<TextSize>
                                wrap
                                value={size}
                                onChange={setSize}
                                options={TEXT_SIZES.map(step => ({
                                    value: step.value,
                                    label: t(`mobile.account.textSizes.${step.value}`),
                                }))}
                            />
                        </View>
                    </View>
                </Card>
            )}

            <PushDeviceCard/>

            <AccountFooterActions/>

            <AppText variant="caption" style={styles.version}>
                NguyenPhat2412 · UAV PAS
            </AppText>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    identity: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
    glass: {borderRadius: radius.card, padding: spacing.md, overflow: 'hidden'},
    grid: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs},
    tile: {flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs},
    tileIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryLight,
    },
    tileIconActive: {backgroundColor: colors.primary},
    tileBadge: {
        position: 'absolute',
        top: -3,
        right: -5,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileBadgeText: {color: colors.white, fontSize: 10, fontWeight: '700'},
    tileLabel: {textAlign: 'center', color: colors.text, fontWeight: '600'},
    pressed: {opacity: 0.7},
    moreCard: {paddingVertical: spacing.sm, gap: 4},
    prefsPanel: {
        gap: spacing.sm,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
    },
    prefGroup: {gap: spacing.xs},
    prefHeader: {flexDirection: 'row', alignItems: 'center', gap: 6},
    prefLabel: {color: colors.slateDark, fontWeight: '600', flex: 1},
    version: {textAlign: 'center'},
});
