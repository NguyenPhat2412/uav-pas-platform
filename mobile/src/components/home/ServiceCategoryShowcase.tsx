import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
    Award,
    Camera,
    GraduationCap,
    Map,
    Package,
    Sprout,
    Store,
    Zap,
    type LucideIcon,
} from 'lucide-react-native';
import {AppText, Card} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {colors, font, radius, spacing} from '@/styles/tokens';

interface CategoryItem {
    key: string;
    label: string;
    icon: LucideIcon;
    accent?: boolean;
    onPress: () => void;
}

/**
 * Shopee-style 2x4 Category Icon Grid connecting buyers directly to filtered drone packages
 * and giving partner sellers a crisp 1-tap Seller Studio shortcut.
 */
export function ServiceCategoryShowcase() {
    const {t} = useI18n();
    const {status} = useAuth();
    const router = useRouter();

    const items: CategoryItem[] = [
        {
            key: 'survey',
            label: t('mobile.shop.catSurvey'),
            icon: Map,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {q: t('mobile.shop.catSurveyKeyword')},
                }),
        },
        {
            key: 'infra',
            label: t('mobile.shop.catInfra'),
            icon: Zap,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {q: t('mobile.shop.catInfraKeyword')},
                }),
        },
        {
            key: 'agri',
            label: t('mobile.shop.catAgri'),
            icon: Sprout,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {q: t('mobile.shop.catAgriKeyword')},
                }),
        },
        {
            key: 'media',
            label: t('mobile.shop.catMedia'),
            icon: Camera,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {q: t('mobile.shop.catMediaKeyword')},
                }),
        },
        {
            key: 'wet',
            label: t('mobile.shop.catWetLease'),
            icon: Award,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {type: 'WET_LEASE'},
                }),
        },
        {
            key: 'dry',
            label: t('mobile.shop.catDryLease'),
            icon: Package,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {type: 'DRY_LEASE'},
                }),
        },
        {
            key: 'academy',
            label: t('mobile.shop.catAcademy'),
            icon: GraduationCap,
            onPress: () => router.push('/customer/training'),
        },
        {
            key: 'seller',
            label: t('mobile.shop.catSeller'),
            icon: Store,
            accent: true,
            onPress: () => router.push(status === 'signed-in' ? '/customer/provider' : '/login'),
        },
    ];

    return (
        <Card style={styles.card}>
            <View style={styles.grid}>
                {items.map(item => {
                    const Icon = item.icon;
                    return (
                        <Pressable
                            key={item.key}
                            accessibilityRole="button"
                            accessibilityLabel={item.label}
                            onPress={item.onPress}
                            style={({pressed}) => [styles.cell, pressed && styles.pressed]}>
                            <View style={[styles.iconBox, item.accent && styles.iconBoxAccent]}>
                                <Icon
                                    size={20}
                                    color={item.accent ? colors.primary : colors.slateDark}
                                />
                            </View>
                            <AppText
                                variant="caption"
                                style={[styles.label, item.accent && styles.labelAccent]}
                                numberOfLines={2}>
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
    card: {paddingVertical: spacing.md, paddingHorizontal: spacing.sm},
    grid: {flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md},
    cell: {width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 4},
    iconBox: {
        width: 46,
        height: 46,
        borderRadius: radius.card,
        backgroundColor: colors.slateLight,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxAccent: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primarySoftBorder,
    },
    label: {
        textAlign: 'center',
        fontSize: font.caption,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 15,
    },
    labelAccent: {color: colors.primary, fontWeight: '700'},
    pressed: {opacity: 0.7},
});
