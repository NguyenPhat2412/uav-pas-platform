import React from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable} from 'expo-glass-effect';
import {CreditCard, Ellipsis, GraduationCap, ShieldCheck, UserRound, type LucideIcon} from 'lucide-react-native';
import {AppText, Card} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

// Same check as the floating launchers: real Liquid Glass on iOS 26, a plain card elsewhere.
const glass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

function Tile({icon: Icon, label, onPress}: { icon: LucideIcon; label: string; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
                   style={({pressed}) => [styles.tile, pressed && styles.pressed]}>
            <View style={styles.tileIcon}>
                <Icon size={22} color={colors.primary}/>
            </View>
            <AppText variant="caption" style={styles.tileLabel} numberOfLines={2}>{label}</AppText>
        </Pressable>
    );
}

/** Four account shortcuts (support and services live in the tab bar), plus "Khác" that slides up the native sheet with everything else. */
export function AccountQuickGrid() {
    const {t} = useI18n();
    const router = useRouter();
    const tiles = (
        <View style={styles.grid}>
            <Tile icon={UserRound} label={t('mobile.account.tiles.profile')} onPress={() => router.push('/customer/profile')}/>
            <Tile icon={CreditCard} label={t('mobile.account.tiles.billing')} onPress={() => router.push('/customer/billing')}/>
            <Tile icon={ShieldCheck} label={t('mobile.account.tiles.security')} onPress={() => router.push('/customer/security')}/>
            <Tile icon={GraduationCap} label={t('mobile.account.tiles.training')} onPress={() => router.push('/customer/training')}/>
            <Tile icon={Ellipsis} label={t('mobile.account.more')} onPress={() => router.push('/customer/account-more')}/>
        </View>
    );
    return glass
        ? <GlassView glassEffectStyle="regular" style={styles.glass}>{tiles}</GlassView>
        : <Card>{tiles}</Card>;
}

const styles = StyleSheet.create({
    glass: {borderRadius: radius.card, padding: spacing.md, overflow: 'hidden'},
    grid: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs},
    tile: {flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs},
    tileIcon: {
        width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.primaryLight,
    },
    tileLabel: {textAlign: 'center', color: colors.text, fontWeight: '600'},
    pressed: {opacity: 0.7},
});
