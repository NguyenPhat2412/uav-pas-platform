import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
    Award,
    Camera,
    FolderKanban,
    GraduationCap,
    Map,
    Package,
    Sprout,
    Zap,
    type LucideIcon,
} from 'lucide-react-native';
import {AppText, Card} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {colors, font, spacing} from '@/styles/tokens';

interface CategoryItem {
    key: string;
    label: string;
    icon: LucideIcon;
    onPress: () => void;
}

/**
 * Shopee-style 4x2 Circular Category Icon Grid (UI-GUIDE §3.1):
 * circular `primaryLight` icon containers + single-line 1-2 word labels (`numberOfLines={1}`).
 */
export function ServiceCategoryShowcase() {
    const {t} = useI18n();
    const router = useRouter();

    const items: CategoryItem[] = [
        {
            key: 'survey',
            label: t('mobile.overnight.shortCatSurvey'),
            icon: Map,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {q: t('mobile.shop.catSurveyKeyword')},
                }),
        },
        {
            key: 'infra',
            label: t('mobile.overnight.shortCatInfra'),
            icon: Zap,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {q: t('mobile.shop.catInfraKeyword')},
                }),
        },
        {
            key: 'agri',
            label: t('mobile.overnight.shortCatAgri'),
            icon: Sprout,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {q: t('mobile.shop.catAgriKeyword')},
                }),
        },
        {
            key: 'media',
            label: t('mobile.overnight.shortCatMedia'),
            icon: Camera,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {q: t('mobile.shop.catMediaKeyword')},
                }),
        },
        {
            key: 'wet',
            label: t('mobile.overnight.shortCatWet'),
            icon: Award,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {type: 'WET_LEASE'},
                }),
        },
        {
            key: 'dry',
            label: t('mobile.overnight.shortCatDry'),
            icon: Package,
            onPress: () =>
                router.navigate({
                    pathname: '/customer/services',
                    params: {type: 'DRY_LEASE'},
                }),
        },
        {
            key: 'projects',
            label: t('mobile.overnight.shortCatProjects'),
            icon: FolderKanban,
            onPress: () => router.navigate('/customer/missions'),
        },
        {
            key: 'academy',
            label: t('mobile.overnight.shortCatAcademy'),
            icon: GraduationCap,
            onPress: () => router.push('/customer/training'),
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
                            <View style={styles.iconCircle}>
                                <Icon size={21} color={colors.primary} strokeWidth={1.85}/>
                            </View>
                            <AppText variant="caption" style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
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
    card: {paddingVertical: spacing.md, paddingHorizontal: spacing.xs},
    grid: {flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md},
    cell: {width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2},
    iconCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        textAlign: 'center',
        fontSize: font.caption,
        fontWeight: '600',
        color: colors.text,
    },
    pressed: {opacity: 0.72},
});
