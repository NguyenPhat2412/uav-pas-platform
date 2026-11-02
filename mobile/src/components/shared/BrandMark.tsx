import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {colors, font, spacing} from '@/styles/tokens';

const APP_LOGO = require('../../../assets/uav-pas-logo.png');

/** The UAV PAS emblem with its wordmark, as in the web portal's header; logo={false} for the wordmark only. */
export function BrandMark({size = 52, logo = true}: { size?: number; logo?: boolean }) {
    return (
        <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="UAV PAS - Personal project demo">
            {logo && <Image source={APP_LOGO} style={{width: size, height: size}} resizeMode="contain"/>}
            {logo && <View style={styles.divider}/>}
            <View style={logo ? undefined : styles.centered}>
                <Text style={styles.university}>PERSONAL PROJECT · DEMO</Text>
                <Text style={styles.name}>UAV<Text style={styles.accent}>PAS</Text></Text>
            </View>
        </View>
    );
}

/** The emblem alone (start-up screen). */
export function AppLogo({size = 96}: { size?: number }) {
    return <Image source={APP_LOGO} style={{width: size, height: size}} resizeMode="contain" accessibilityLabel="UAV PAS"/>;
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    divider: {width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border, marginVertical: 4},
    university: {fontSize: 9, fontWeight: '600', letterSpacing: 1.5, color: colors.muted},
    name: {fontSize: font.heading, fontWeight: '800', color: colors.text, letterSpacing: -0.3},
    accent: {color: colors.primary},
    centered: {alignItems: 'center'},
});
