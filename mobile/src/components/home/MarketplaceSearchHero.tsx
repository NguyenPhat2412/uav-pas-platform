import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Megaphone, Plus, Search, ShieldCheck} from 'lucide-react-native';
import {AppText, Badge, Button, Card} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {colors, radius, spacing} from '@/styles/tokens';

/**
 * Top search trigger + 30% structural slate Mall guarantee hero with 10% crimson conversion CTA.
 */
export function MarketplaceSearchHero({rfqEnabled}: { rfqEnabled: boolean }) {
    const {t} = useI18n();
    const {status, can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const showBookingCtas = status !== 'signed-in' || can('MISSION_CREATE');

    const openBooking = (rfq: boolean) => {
        if (status !== 'signed-in') {
            toast.show(t('mobile.shop.loginToBookToast'), 'info');
            router.push('/login');
            return;
        }
        router.push(
            rfq
                ? {pathname: '/customer/mission/create', params: {rfq: '1'}}
                : '/customer/mission/create',
        );
    };

    return (
        <View style={styles.wrap}>
            <Pressable
                accessibilityRole="search"
                accessibilityLabel={t('mobile.shop.searchFakePlaceholder')}
                onPress={() => router.navigate('/customer/services')}
                style={({pressed}) => [styles.searchBar, pressed && styles.pressed]}>
                <Search size={18} color={colors.primary}/>
                <AppText variant="small" style={styles.searchPlaceholder} numberOfLines={1}>
                    {t('mobile.shop.searchFakePlaceholder')}
                </AppText>
            </Pressable>

            <Card style={styles.mallBanner}>
                <View style={styles.badgeRow}>
                    <Badge
                        icon={ShieldCheck}
                        label={t('mobile.shop.mallBadge')}
                        background={colors.primary}
                        color={colors.white}
                    />
                </View>
                <AppText variant="heading" style={styles.mallTitle}>
                    {t('mobile.shop.mallTitle')}
                </AppText>
                <AppText variant="small" style={styles.mallSub}>
                    {t('mobile.shop.mallSub')}
                </AppText>
                {showBookingCtas ? (
                    <View style={styles.ctaRow}>
                        <Button
                            size="sm"
                            icon={Plus}
                            label={t('mobile.shop.customBookBtn')}
                            onPress={() => openBooking(false)}
                            style={styles.flex}
                        />
                        {rfqEnabled ? (
                            <Button
                                size="sm"
                                tone="secondary"
                                icon={Megaphone}
                                label={t('mobile.shop.postRfqBtn')}
                                onPress={() => openBooking(true)}
                                style={styles.flex}
                            />
                        ) : null}
                    </View>
                ) : null}
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: spacing.md},
    searchBar: {
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.primarySoftBorder,
    },
    searchPlaceholder: {flex: 1, color: colors.muted},
    mallBanner: {
        backgroundColor: colors.slate900,
        borderColor: colors.slateDark,
        gap: spacing.sm,
        padding: spacing.lg,
    },
    badgeRow: {flexDirection: 'row', alignItems: 'center'},
    mallTitle: {color: colors.white},
    mallSub: {color: colors.border},
    ctaRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs},
    flex: {flex: 1},
    pressed: {opacity: 0.78},
});
