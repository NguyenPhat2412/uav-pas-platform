import React, {useEffect, useState} from 'react';
import {AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle} from 'react-native';
import {colors, radius, spacing} from '@/styles/tokens';

/** Pulsing opacity for skeleton blocks; stays still when Reduce Motion is on. */
function usePulse() {
    const [value] = useState(() => new Animated.Value(0.55));
    useEffect(() => {
        let loop: Animated.CompositeAnimation | null = null;
        let cancelled = false;
        void AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
            if (cancelled || reduce) return;
            loop = Animated.loop(Animated.sequence([
                Animated.timing(value, {toValue: 1, duration: 700, useNativeDriver: true}),
                Animated.timing(value, {toValue: 0.55, duration: 700, useNativeDriver: true}),
            ]));
            loop.start();
        });
        return () => {
            cancelled = true;
            loop?.stop();
        };
    }, [value]);
    return value;
}

export function Skeleton({width = '100%', height = 14, style}: { width?: DimensionValue; height?: number; style?: StyleProp<ViewStyle> }) {
    const opacity = usePulse();
    return <Animated.View style={[styles.block, {width, height, opacity}, style]}/>;
}

/** Placeholder shaped like the list of cards most screens show while their first page loads. */
export function SkeletonList({rows = 3, label}: { rows?: number; label?: string }) {
    const opacity = usePulse();
    return (
        <View style={styles.list} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
            {Array.from({length: rows}, (_, index) => (
                <Animated.View key={index} style={[styles.card, {opacity}]}>
                    <View style={styles.row}>
                        <View style={[styles.block, styles.avatar]}/>
                        <View style={styles.lines}>
                            <View style={[styles.block, styles.title]}/>
                            <View style={[styles.block, styles.subtitle]}/>
                        </View>
                    </View>
                    <View style={[styles.block, styles.body]}/>
                </Animated.View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    block: {backgroundColor: colors.slateLight, borderRadius: 6},
    list: {gap: spacing.md, paddingVertical: spacing.sm},
    card: {backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    avatar: {width: 40, height: 40, borderRadius: 20},
    lines: {flex: 1, gap: 6},
    title: {width: '60%', height: 14},
    subtitle: {width: '40%', height: 12},
    body: {width: '90%', height: 12},
});
