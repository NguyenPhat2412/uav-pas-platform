import React, {type ReactNode} from 'react';
import {Platform, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable} from 'expo-glass-effect';

/** iOS 26 Liquid Glass is available (older iOS and Android get the solid fallback). */
export const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * A Liquid Glass surface where the system offers it, otherwise a plain View with `fallback` styles. `style` holds the
 * shape (size, radius, padding); `tint` colours the glass, e.g. for a selected state.
 */
export function GlassSurface({style, fallback, tint, interactive = false, children}: {
    style?: StyleProp<ViewStyle>; fallback?: StyleProp<ViewStyle>; tint?: string; interactive?: boolean; children?: ReactNode;
}) {
    if (liquidGlass) {
        return <GlassView glassEffectStyle="regular" isInteractive={interactive} tintColor={tint} style={[style, styles.clip]}>{children}</GlassView>;
    }
    return <View style={[style, fallback]}>{children}</View>;
}

const styles = StyleSheet.create({
    clip: {overflow: 'hidden'},
});
