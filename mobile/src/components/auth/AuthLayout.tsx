import React, {ReactNode, useEffect, useState} from 'react';
import {Keyboard, Platform, StyleSheet, View} from 'react-native';
import {AppText, Screen} from '@/components/ui';
import {AppLogo, BrandMark} from '@/components/shared/BrandMark';
import {spacing} from '@/styles/tokens';

/** UAV PAS brand mark, a heading and the form: the shared frame of every sign-in screen. */
export function AuthLayout({title, subtitle, children}: { title: string; subtitle?: string; children: ReactNode }) {
    // With the keyboard up the form no longer fits under the emblem, which would scroll half out of view: close the gaps meanwhile.
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
        </Screen>
    );
}

const styles = StyleSheet.create({
    // Vertically centred on the phone; the column is narrow like a native sign-in sheet.
    content: {flexGrow: 1, justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.xl},
    brand: {alignItems: 'center', gap: spacing.md},
    heading: {gap: spacing.xs, alignItems: 'center'},
    centered: {textAlign: 'center'},
    form: {gap: spacing.lg},
    compact: {gap: spacing.sm, paddingVertical: spacing.sm},
    compactForm: {gap: spacing.md},
});
