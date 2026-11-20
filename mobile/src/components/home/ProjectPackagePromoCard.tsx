import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ArrowRight, FolderKanban, MapPin, Navigation} from 'lucide-react-native';
import {AppText, Button, GlassSurface} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

/**
 * Liquid Glass "Gói theo dự án" card on Home (S1-mobile.md #2 & UI-GUIDE §3.1):
 * guides customers into project-scoped service subscriptions with concise visual step pills.
 */
export function ProjectPackagePromoCard() {
    const {t} = useI18n();
    const router = useRouter();

    return (
        <GlassSurface style={styles.glass} fallback={styles.fallback}>
            <View style={styles.topRow}>
                <View style={styles.iconBox}>
                    <FolderKanban size={20} color={colors.primary}/>
                </View>
                <View style={styles.flex}>
                    <AppText variant="title" numberOfLines={1}>
                        {t('mobile.overnight.projectPromoTitle')}
                    </AppText>
                    <AppText variant="caption" numberOfLines={2}>
                        {t('mobile.overnight.projectPromoSub')}
                    </AppText>
                </View>
            </View>

            <View style={styles.stepsRow}>
                <View style={styles.stepChip}>
                    <FolderKanban size={13} color={colors.slateDark}/>
                    <AppText variant="caption" style={styles.stepText} numberOfLines={1}>
                        {t('mobile.overnight.projectPromoStep1')}
                    </AppText>
                </View>
                <View style={styles.stepChip}>
                    <MapPin size={13} color={colors.slateDark}/>
                    <AppText variant="caption" style={styles.stepText} numberOfLines={1}>
                        {t('mobile.overnight.projectPromoStep2')}
                    </AppText>
                </View>
                <View style={styles.stepChip}>
                    <Navigation size={13} color={colors.slateDark}/>
                    <AppText variant="caption" style={styles.stepText} numberOfLines={1}>
                        {t('mobile.overnight.projectPromoStep3')}
                    </AppText>
                </View>
            </View>

            <Button
                size="sm"
                icon={ArrowRight}
                label={t('mobile.overnight.projectPromoCta')}
                onPress={() => router.navigate('/customer/missions')}
            />
        </GlassSurface>
    );
}

const styles = StyleSheet.create({
    glass: {
        borderRadius: radius.card,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.glassBorderSelected,
    },
    fallback: {backgroundColor: colors.surface},
    topRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: radius.card,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepsRow: {flexDirection: 'row', gap: spacing.xs},
    stepChip: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 6,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
    },
    stepText: {color: colors.slateDark, fontWeight: '600', flexShrink: 1},
    flex: {flex: 1},
});
