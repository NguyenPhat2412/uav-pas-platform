import React, {ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, Screen} from '@/components/ui';
import {BrandMark} from '@/components/shared/BrandMark';
import {spacing} from '@/styles/tokens';

/** UAV PAS brand mark, a heading and the form: the shared frame of every sign-in screen. */
export function AuthLayout({title, subtitle, children}: { title: string; subtitle?: string; children: ReactNode }) {
    return (
        <Screen edges={['top', 'bottom']} maxWidth={440} contentStyle={styles.content}>
            <BrandMark/>
            <View style={styles.heading}>
                <AppText variant="heading">{title}</AppText>
                {subtitle ? <AppText variant="small">{subtitle}</AppText> : null}
            </View>
            <View style={styles.form}>{children}</View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    // Vertically centred on the phone; the column is narrow like a native sign-in sheet.
    content: {flexGrow: 1, justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.xl},
    heading: {gap: spacing.xs},
    form: {gap: spacing.lg},
});
