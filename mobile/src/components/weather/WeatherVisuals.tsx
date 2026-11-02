import React, {ReactNode, useEffect, useId, useState} from 'react';
import {AccessibilityInfo, Animated, Easing, LayoutChangeEvent, StyleSheet, View} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {
    Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudRainWind, CloudSun, HelpCircle, Moon, Snowflake, Sun,
    type LucideIcon,
} from 'lucide-react-native';
import type {WeatherCondition} from '@/shared/utils/weather/conditions';
import type {SkyEffect} from '@/shared/utils/weather/sky-theme';
import {gradientStops} from '@/utils/weather/gradient';

const DAY_ICON: Record<WeatherCondition, LucideIcon> = {
    clear: Sun, partly: CloudSun, cloudy: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain,
    showers: CloudRainWind, thunder: CloudLightning, snow: Snowflake, unknown: HelpCircle,
};

export function WeatherIcon({condition, night, size = 28, color}: { condition: WeatherCondition; night: boolean; size?: number; color: string }) {
    const Icon = night && condition === 'clear' ? Moon : night && condition === 'partly' ? CloudMoon : DAY_ICON[condition];
    return <Icon size={size} color={color}/>;
}

// Fixed pseudo-random spread (same every render, no Math.random), as in the web WeatherBackdrop.
const spread = (i: number, salt: number) => {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
};

function useReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
        return () => subscription.remove();
    }, []);
    return reduced;
}

/** A value looping 0 → 1 forever, starting at a fixed offset so many particles do not move in step. */
function useLoop(duration: number, offset: number, enabled: boolean) {
    const [value] = useState(() => new Animated.Value(offset));
    useEffect(() => {
        if (!enabled) return;
        value.setValue(offset);
        const first = Animated.timing(value, {toValue: 1, duration: duration * (1 - offset), easing: Easing.linear, useNativeDriver: true});
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(value, {toValue: 0, duration: 0, useNativeDriver: true}),
            Animated.timing(value, {toValue: 1, duration, easing: Easing.linear, useNativeDriver: true}),
        ]));
        const sequence = Animated.sequence([first, loop]);
        sequence.start();
        return () => sequence.stop();
    }, [value, duration, offset, enabled]);
    return value;
}

function Drop({index, width, height, dark, speed, wind, enabled}: {
    index: number; width: number; height: number; dark: boolean; speed: [number, number]; wind: number; enabled: boolean;
}) {
    const duration = (speed[0] + spread(index, 2) * (speed[1] - speed[0])) * 1000;
    const progress = useLoop(duration, spread(index, 3), enabled);
    const translateY = progress.interpolate({inputRange: [0, 1], outputRange: [-24, height + 24]});
    const translateX = progress.interpolate({inputRange: [0, 1], outputRange: [0, wind]});
    return (
        <Animated.View style={[styles.drop, {
            left: spread(index, 1) * width, height: 12 + spread(index, 4) * 10,
            backgroundColor: dark ? 'rgba(255,255,255,0.55)' : 'rgba(88,113,139,0.55)',
            transform: [{translateX}, {translateY}, {rotate: `${wind < 0 ? 8 : 0}deg`}],
        }]}/>
    );
}

function Flake({index, width, height, dark, enabled}: { index: number; width: number; height: number; dark: boolean; enabled: boolean }) {
    const progress = useLoop((6 + spread(index, 2) * 5) * 1000, spread(index, 3), enabled);
    const size = 3 + spread(index, 5) * 3;
    return (
        <Animated.View style={[styles.flake, {
            left: spread(index, 1) * width, width: size, height: size, borderRadius: size / 2,
            backgroundColor: dark ? '#ffffff' : '#9fb3c8',
            transform: [
                {translateY: progress.interpolate({inputRange: [0, 1], outputRange: [-10, height + 10]})},
                {translateX: progress.interpolate({inputRange: [0, 1], outputRange: [0, (spread(index, 6) - 0.5) * 50]})},
            ],
        }]}/>
    );
}

function Star({index, width, height, enabled}: { index: number; width: number; height: number; enabled: boolean }) {
    const progress = useLoop((2.5 + spread(index, 5) * 2.5) * 1000, spread(index, 4), enabled);
    const size = 1.5 + spread(index, 3) * 2;
    return (
        <Animated.View style={[styles.star, {
            left: spread(index, 1) * width, top: spread(index, 2) * height * 0.75, width: size, height: size, borderRadius: size,
            opacity: enabled ? progress.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.25, 1, 0.25]}) : 0.8,
        }]}/>
    );
}

function CloudShape({index, width, height, dark, enabled}: { index: number; width: number; height: number; dark: boolean; enabled: boolean }) {
    const cloudWidth = 140 + spread(index, 4) * 120;
    const progress = useLoop((50 + spread(index, 2) * 50) * 1000, spread(index, 3), enabled);
    return (
        <Animated.View style={[styles.layer, {
            top: (spread(index, 1) * 0.55 - 0.05) * height,
            transform: [{translateX: progress.interpolate({inputRange: [0, 1], outputRange: [-cloudWidth, width]})}],
        }]}>
            <Svg width={cloudWidth} height={cloudWidth * 0.45} viewBox="0 0 200 90">
                <Path d="M30 80 C8 80 4 52 26 46 C24 22 56 12 72 30 C84 6 128 8 132 38 C160 30 186 48 176 72 C174 78 168 80 160 80 Z"
                      fill={dark ? '#94a3b8' : '#ffffff'} opacity={dark ? 0.18 : 0.7}/>
            </Svg>
        </Animated.View>
    );
}

function SunGlow({enabled}: { enabled: boolean }) {
    const id = `sun-${useId().replace(/:/g, '')}`;
    const pulse = useLoop(4000, 0, enabled);
    const scale = pulse.interpolate({inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1]});
    return (
        <Animated.View style={[styles.sun, {transform: [{scale}]}]}>
            <Svg width={220} height={220} viewBox="0 0 200 200">
                <Defs>
                    <RadialGradient id={id}>
                        <Stop offset="0%" stopColor="#ffd25a" stopOpacity={0.95}/>
                        <Stop offset="45%" stopColor="#ffc53d" stopOpacity={0.45}/>
                        <Stop offset="100%" stopColor="#ffb020" stopOpacity={0}/>
                    </RadialGradient>
                </Defs>
                <Circle cx={100} cy={100} r={90} fill={`url(#${id})`}/>
            </Svg>
        </Animated.View>
    );
}

function Flash({enabled}: { enabled: boolean }) {
    const progress = useLoop(7000, 0.3, enabled);
    if (!enabled) return null;
    return <Animated.View style={[StyleSheet.absoluteFill, styles.flash, {
        opacity: progress.interpolate({inputRange: [0, 0.9, 0.92, 0.94, 0.96, 1], outputRange: [0, 0, 0.35, 0, 0.25, 0]}),
    }]}/>;
}

/** The moving sky behind a weather card (decorative, ignored by VoiceOver); still elements only with Reduce Motion. */
export function WeatherBackdrop({effect, dark}: { effect: SkyEffect; dark: boolean }) {
    const reduced = useReducedMotion();
    const [size, setSize] = useState({width: 0, height: 0});
    const onLayout = (event: LayoutChangeEvent) => setSize(event.nativeEvent.layout);
    const moving = !reduced;
    const {width, height} = size;
    const many = (count: number, render: (index: number) => ReactNode) => Array.from({length: count}, (_, i) => render(i));
    return (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
              style={[StyleSheet.absoluteFill, styles.clip]} onLayout={onLayout}>
            {width > 0 && <>
                {effect === 'sun' && <SunGlow enabled={moving}/>}
                {effect === 'stars' && many(30, i => <Star key={i} index={i} width={width} height={height} enabled={moving}/>)}
                {(effect === 'clouds' || effect === 'storm') && many(effect === 'storm' ? 4 : 3, i =>
                    <CloudShape key={i} index={i} width={width} height={height} dark={dark} enabled={moving}/>)}
                {effect === 'fog' && many(3, i => <CloudShape key={i} index={i + 7} width={width} height={height} dark={false} enabled={moving}/>)}
                {moving && effect === 'drizzle' && many(14, i => <Drop key={i} index={i} width={width} height={height} dark={dark} speed={[1.4, 2.2]} wind={-8} enabled/>)}
                {moving && effect === 'rain' && many(32, i => <Drop key={i} index={i} width={width} height={height} dark={dark} speed={[0.8, 1.3]} wind={-14} enabled/>)}
                {moving && (effect === 'showers' || effect === 'storm') && many(40, i =>
                    <Drop key={i} index={i} width={width} height={height} dark={dark} speed={[0.6, 1]} wind={-50} enabled/>)}
                {moving && effect === 'snow' && many(24, i => <Flake key={i} index={i} width={width} height={height} dark={dark} enabled/>)}
                {effect === 'storm' && <Flash enabled={moving}/>}
            </>}
        </View>
    );
}

/** The sky-theme gradient (top-left to bottom-right, like Tailwind's bg-gradient-to-br) filling its parent. */
export function SkyGradient({background}: { background: string }) {
    const id = `sky-${useId().replace(/:/g, '')}`;
    const stops = gradientStops(background);
    return (
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
            <Defs>
                <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                    {stops.map((color, index) => <Stop key={color + index} offset={index / (stops.length - 1)} stopColor={color}/>)}
                </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`}/>
        </Svg>
    );
}

const styles = StyleSheet.create({
    clip: {overflow: 'hidden'},
    layer: {position: 'absolute', left: 0},
    drop: {position: 'absolute', top: 0, width: 1.2, borderRadius: 1},
    flake: {position: 'absolute', top: 0},
    star: {position: 'absolute', backgroundColor: '#ffffff'},
    sun: {position: 'absolute', right: -70, top: -80},
    flash: {backgroundColor: '#ffffff'},
});
