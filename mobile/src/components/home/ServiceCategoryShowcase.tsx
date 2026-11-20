import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
    Award,
    Camera,
    Map,
    Package,
    Plane,
    Sparkles,
    Zap,
    type LucideIcon,
} from 'lucide-react-native';
import {AppText, Card} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {
    SERVICE_CATEGORIES,
    type ServiceCategoryDef,
    type ServiceCategoryIconName,
} from '@/shared/lib/marketplace/service-categories';
import {colors, font, spacing} from '@/styles/tokens';

const CATEGORY_ICONS: Record<ServiceCategoryIconName, LucideIcon> = {
    Sparkles,
    Map,
    Zap,
    Camera,
    Plane,
    Award,
    Package,
};

/**
 * Shopee-style Circular Category Icon Grid (UI-GUIDE §3.1 & UI-REVIEW-9-FIXES #8):
 * reads directly from the shared `SERVICE_CATEGORIES` taxonomy synced from web
 * (`@/shared/lib/marketplace/service-categories`) so Web and Mobile stay 100% unified.
 */
export function ServiceCategoryShowcase() {
    const {t} = useI18n();
    const router = useRouter();

    const handleOpenCategory = (cat: ServiceCategoryDef) => {
        if (cat.missionType) {
            router.navigate({
                pathname: '/customer/services',
                params: {category: cat.missionType, type: 'ALL'},
            });
            return;
        }
        if (cat.listingType) {
            router.navigate({
                pathname: '/customer/services',
                params: {type: cat.listingType, category: ''},
            });
            return;
        }
        router.navigate('/customer/services');
    };

    return (
        <Card style={styles.card}>
            <View style={styles.grid}>
                {SERVICE_CATEGORIES.map(cat => {
                    const Icon = CATEGORY_ICONS[cat.icon] ?? Package;
                    const label = t(cat.labelKey);
                    return (
                        <Pressable
                            key={cat.key}
                            accessibilityRole="button"
                            accessibilityLabel={label}
                            onPress={() => handleOpenCategory(cat)}
                            style={({pressed}) => [styles.cell, pressed && styles.pressed]}>
                            <View style={styles.iconCircle}>
                                <Icon size={21} color={colors.primary} strokeWidth={1.85}/>
                            </View>
                            <AppText
                                variant="caption"
                                style={styles.label}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.78}>
                                {label}
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
    cell: {width: '33.33%', alignItems: 'center', gap: 6, paddingHorizontal: 4},
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
