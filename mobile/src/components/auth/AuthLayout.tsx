import React, {ReactNode, useEffect, useState} from 'react';
import {Keyboard, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Compass} from 'lucide-react-native';
import {AppText, Screen} from '@/components/ui';
import {AppLogo, BrandMark} from '@/components/shared/BrandMark';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

/** UAV PAS brand mark, a heading, form, and 1-tap Guest Marketplace return button. */
export function AuthLayout({title, subtitle, children}: { title: string; subtitle?: string; children: ReactNode }) {
    const router = useRouter();
    const {t} = useI18n();
    const [typing, setTyping] = useState(false);
    useEffect(() => {
        const ios = Platform.OS === 'ios';
        const shown = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setTyping(true));
        const hidden = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setTyping(false));
        return () => {
            shown.remove();
            hidden.remove();
        };
    }, []);
    return (
        <Screen edges={['top', 'bottom']} maxWidth={440} contentStyle={[styles.content, typing && styles.compact]}>
            <View style={styles.brand}>
                <AppLogo size={72}/>
                <BrandMark logo={false}/>
            </View>
            <View style={styles.heading}>
                <AppText variant="heading" style={styles.centered}>{title}</AppText>
                {subtitle ? <AppText variant="small" style={styles.centered}>{subtitle}</AppText> : null}
            </View>
            <View style={[styles.form, typing && styles.compactForm]}>{children}</View>
            {!typing && (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => router.replace('/customer/home')}
                    style={({pressed}) => [styles.guestBtn, pressed && styles.pressed]}>
                    <Compass size={16} color={colors.slateDark}/>
                    <AppText variant="small" style={styles.guestText}>
                        {t('mobile.shop.browseAsGuest')}
                    </AppText>
                </Pressable>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: {flexGrow: 1, justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.xl},
    brand: {alignItems: 'center', gap: spacing.md},
    heading: {gap: spacing.xs, alignItems: 'center'},
    centered: {textAlign: 'center'},
    form: {gap: spacing.lg},
    compact: {gap: spacing.sm, paddingVertical: spacing.sm},
    compactForm: {gap: spacing.md},
    guestBtn: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    guestText: {color: colors.slateDark, fontWeight: '600'},
    pressed: {opacity: 0.72},
});
