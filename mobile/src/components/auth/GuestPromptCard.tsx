import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {LogIn, ShieldCheck, Store, UserPlus, type LucideIcon} from 'lucide-react-native';
import {AppText, Badge, Button, Card} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

/**
 * Clean 60-30-10 Guest sign-in invitation card shown when unauthenticated visitors open personal tabs
 * (Flights / Me), highlighting both Buyer Escrow protection and Seller Storefront capabilities.
 */
export function GuestPromptCard({
    icon: Icon = ShieldCheck,
    title,
    description,
    showSellerTeaser = false,
}: {
    icon?: LucideIcon;
    title: string;
    description: string;
    showSellerTeaser?: boolean;
}) {
    const {t} = useI18n();
    const router = useRouter();

    return (
        <View style={styles.wrap}>
            <Card style={styles.heroCard}>
                <View style={styles.iconWrap}>
                    <Icon size={24} color={colors.primary}/>
                </View>
                <Badge
                    icon={ShieldCheck}
                    label={t('mobile.shop.mallBadge')}
                    background={colors.primaryLight}
                    color={colors.primary}
                />
                <AppText variant="heading">{title}</AppText>
                <AppText variant="small">{description}</AppText>
                <View style={styles.ctaCol}>
                    <Button
                        icon={LogIn}
                        label={t('customerAuth.signIn')}
                        onPress={() => router.push('/login')}
                    />
                    <Button
                        tone="secondary"
                        icon={UserPlus}
                        label={t('mobile.shop.createAccountBtn')}
                        onPress={() => router.push('/register')}
                    />
                </View>
            </Card>

            {showSellerTeaser && (
                <Card style={styles.sellerCard} onPress={() => router.push('/login')}>
                    <View style={styles.sellerHeader}>
                        <View style={styles.sellerIcon}>
                            <Store size={18} color={colors.white}/>
                        </View>
                        <View style={styles.flex}>
                            <AppText variant="caption" style={styles.sellerBadge}>
                                {t('mobile.shop.sellerCardBadge')}
                            </AppText>
                            <AppText variant="title" style={styles.sellerTitle}>
                                {t('mobile.shop.sellerCardTitle')}
                            </AppText>
                        </View>
                    </View>
                    <AppText variant="small" style={styles.sellerDesc}>
                        {t('mobile.shop.sellerCardDesc')}
                    </AppText>
                </Card>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: spacing.md},
    heroCard: {gap: spacing.md, padding: spacing.lg},
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: radius.card,
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.primarySoftBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaCol: {gap: spacing.sm, marginTop: spacing.xs},
    sellerCard: {
        backgroundColor: colors.slate900,
        borderColor: colors.slateDark,
        gap: spacing.sm,
    },
    sellerHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    sellerIcon: {
        width: 38,
        height: 38,
        borderRadius: radius.control,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sellerBadge: {color: colors.primarySoftBorder, fontWeight: '700'},
    sellerTitle: {color: colors.white},
    sellerDesc: {color: colors.border},
    flex: {flex: 1},
});
