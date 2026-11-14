import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from '@/components/ui';
import {AppleSignInButton} from '@/components/auth/AppleSignInButton';
import {GoogleSignInButton} from '@/components/auth/GoogleSignInButton';
import {useI18n} from '@/providers/I18nContext';
import {colors, spacing} from '@/styles/tokens';

export interface SocialSignInRowProps {
    mode?: 'signin' | 'signup';
}

/**
 * Horizontal side-by-side Google and Apple sign-in buttons followed by a single shared "OR" divider.
 * Rendered consistently on both LoginScreen and RegisterScreen.
 */
export function SocialSignInRow({mode = 'signin'}: SocialSignInRowProps) {
    const {t} = useI18n();

    return (
        <View style={styles.wrap}>
            <View style={styles.row}>
                <GoogleSignInButton mode={mode}/>
                <AppleSignInButton mode={mode}/>
            </View>
            <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={styles.line}/>
                <AppText variant="small" style={styles.or}>{t('auth.orDivider')}</AppText>
                <View style={styles.line}/>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: spacing.md},
    row: {flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm},
    divider: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    line: {flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border},
    or: {color: colors.muted, fontWeight: '600'},
});
