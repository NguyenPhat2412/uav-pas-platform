import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View} from 'react-native';
import {usePathname} from 'expo-router';
import Svg, {Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop} from 'react-native-svg';
import {backgroundArt, backgroundGradient} from '@/styles/tokens';

// Drawn on a phone-sized canvas and scaled to cover the screen ("slice"), so circles stay round on every device.
const W = 390;
const H = 844;
const BASE = {x: 352, y: 96};
const ROUTE = 'M -10 790 C 80 720, 250 700, 262 600 S 120 470, 150 390 S 300 330, 300 250 S 330 150, 352 96';
const WAYPOINTS = [{x: 262, y: 600}, {x: 150, y: 390}, {x: 300, y: 250}];
const ARM = 23;
const ROTOR_RADIUS = 13;
const ROTORS = [[-ARM, -ARM], [ARM, -ARM], [-ARM, ARM], [ARM, ARM]];
/**
 * Sign-in screens show the drone large in the open corner below the form, where its spinning blades are seen.
 * Inside the portals it is small and faint on the middle of the route, so it never competes with cards and lists.
 */
const DRONES = {
    hero: {x: 69, y: 745, rotation: -25, size: 1, opacity: 0.6},
    quiet: {x: 212, y: 498, rotation: -38, size: 0.56, opacity: 0.34},
} as const;
type DroneLook = (typeof DRONES)[keyof typeof DRONES];

/** Rotor hubs on the canvas, after the drone's own rotation and size. */
function rotorCentres(drone: DroneLook) {
    const turn = drone.rotation * Math.PI / 180;
    return ROTORS.map(([x, y]) => ({
        x: drone.x + (x * Math.cos(turn) - y * Math.sin(turn)) * drone.size,
        y: drone.y + (x * Math.sin(turn) + y * Math.cos(turn)) * drone.size,
    }));
}

/** 0 → 1 once per propeller turn, on the native thread; stays at 0 when the phone asks for reduced motion. */
function useSpin() {
    const [spin] = useState(() => new Animated.Value(0));
    useEffect(() => {
        let loop: Animated.CompositeAnimation | undefined;
        let active = true;
        void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            if (reduced || !active) return;
            loop = Animated.loop(Animated.timing(spin, {toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true}));
            loop.start();
        });
        return () => {
            active = false;
            loop?.stop();
        };
    }, [spin]);
    return spin;
}

/**
 * The page behind every screen: the brand gradient plus a survey map in the UAV operations style. A dotted grid,
 * terrain contour lines, radar rings around the flight base (top right) and a dashed flight route with waypoints and
 * a drone on its way, its propellers turning. Everything is faint enough that cards and text on top stay the focus.
 *
 * The artwork is anchored to the window, not to the view: each copy measures where it sits and shifts the drawing up
 * by that much. AppHeader and the page below it therefore show two halves of one picture, joined without a seam.
 */
export function AppBackground() {
    const {width, height} = useWindowDimensions();
    const frame = useRef<React.ComponentRef<typeof View>>(null);
    const [top, setTop] = useState(0);
    const spin = useSpin();
    const rotate = spin.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
    // Same "slice" fit as the Svg below, so the blades land on the drawn rotor rings.
    const scale = Math.max(width / W, height / H);
    const drone = /^\/(customer|operations)(\/|$)/.test(usePathname()) ? DRONES.quiet : DRONES.hero;
    const blade = ROTOR_RADIUS * drone.size * scale;
    const measure = () => frame.current?.measureInWindow((_x: number, y: number) => setTop(current => (Math.abs(current - y) < 0.5 ? current : y)));
    return (
        <View ref={frame} style={styles.frame} pointerEvents="none" onLayout={measure}>
            <Svg style={{position: 'absolute', left: 0, top: -top, width, height}} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
            <Defs>
                <LinearGradient id="bg-base" x1="0" y1="0" x2="0" y2="1">
                    {backgroundGradient.map((color, index) => (
                        <Stop key={color} offset={index / (backgroundGradient.length - 1)} stopColor={color}/>
                    ))}
                </LinearGradient>
                <RadialGradient id="bg-radar-glow" cx={BASE.x} cy={BASE.y} r="190" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor={backgroundArt.radar} stopOpacity="0.16"/>
                    <Stop offset="1" stopColor={backgroundArt.radar} stopOpacity="0"/>
                </RadialGradient>
                <Pattern id="bg-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <Circle cx="12" cy="12" r="1" fill={backgroundArt.grid} fillOpacity="0.4"/>
                </Pattern>
            </Defs>

            <Rect x="0" y="0" width={W} height={H} fill="url(#bg-base)"/>
            <Rect x="0" y="0" width={W} height={H} fill="url(#bg-grid)"/>

            {/* Terrain contours: two hills, lines drawn as rotated rings that grow outwards. */}
            <G stroke={backgroundArt.contour} strokeOpacity="0.16" strokeWidth="1" fill="none">
                {[40, 72, 106, 142, 180].map((r, i) => (
                    <Ellipse key={`a${r}`} cx="72" cy="300" rx={r * 1.25} ry={r} rotation={-18 + i * 4} origin="72, 300"/>
                ))}
                {[34, 64, 96, 132, 172, 214].map((r, i) => (
                    <Ellipse key={`b${r}`} cx="318" cy="640" rx={r * 1.35} ry={r} rotation={24 - i * 5} origin="318, 640"/>
                ))}
            </G>

            {/* Radar at the flight base: soft glow, range rings, crosshair and a sweep. */}
            <Circle cx={BASE.x} cy={BASE.y} r="190" fill="url(#bg-radar-glow)"/>
            <G stroke={backgroundArt.radar} fill="none">
                {[36, 72, 108, 144, 180].map((r, i) => (
                    <Circle key={r} cx={BASE.x} cy={BASE.y} r={r} strokeOpacity={0.3 - i * 0.045} strokeWidth="1.2"/>
                ))}
                <Line x1={BASE.x - 110} y1={BASE.y} x2={BASE.x + 40} y2={BASE.y} strokeOpacity="0.14"/>
                <Line x1={BASE.x} y1={BASE.y - 40} x2={BASE.x} y2={BASE.y + 190} strokeOpacity="0.14"/>
            </G>
            <Path d={`M ${BASE.x} ${BASE.y} L ${BASE.x - 180} ${BASE.y + 6} A 180 180 0 0 0 ${BASE.x - 128} ${BASE.y + 126} Z`}
                  fill={backgroundArt.radar} fillOpacity="0.07"/>
            <Circle cx={BASE.x} cy={BASE.y} r="5" fill={backgroundArt.radar} fillOpacity="0.45"/>

            {/* Flight route with waypoints and the drone flying it. */}
            <Path d={ROUTE} stroke={backgroundArt.route} strokeOpacity="0.28" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" fill="none"/>
            {WAYPOINTS.map(p => (
                <G key={`${p.x}-${p.y}`}>
                    <Circle cx={p.x} cy={p.y} r="9" fill={backgroundArt.route} fillOpacity="0.06"/>
                    <Circle cx={p.x} cy={p.y} r="4" fill={backgroundGradient[1]} stroke={backgroundArt.route} strokeOpacity="0.4" strokeWidth="1.5"/>
                </G>
            ))}
            <Drone look={drone}/>
            </Svg>
            {rotorCentres(drone).map(centre => (
                <Animated.View key={`${centre.x}-${centre.y}`} style={[styles.rotor, {
                    opacity: drone.opacity + 0.1,
                    left: (width - W * scale) / 2 + centre.x * scale - blade,
                    top: (height - H * scale) / 2 + centre.y * scale - blade - top,
                    width: blade * 2, height: blade * 2, transform: [{rotate}],
                }]}>
                    <View style={[styles.blade, {height: Math.max(1.5, 2.6 * drone.size * scale)}]}/>
                </Animated.View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    frame: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden'},
    rotor: {position: 'absolute', justifyContent: 'center'},
    blade: {borderRadius: 2, backgroundColor: backgroundArt.route},
});

/** A small top-down quadcopter: four rotors on an X frame around the body. */
function Drone({look}: { look: DroneLook }) {
    const arm = ARM;
    return (
        <G transform={`translate(${look.x} ${look.y}) rotate(${look.rotation}) scale(${look.size})`} opacity={look.opacity}>
            <Line x1={-arm} y1={-arm} x2={arm} y2={arm} stroke={backgroundArt.route} strokeWidth="3.8" strokeLinecap="round"/>
            <Line x1={-arm} y1={arm} x2={arm} y2={-arm} stroke={backgroundArt.route} strokeWidth="3.8" strokeLinecap="round"/>
            {ROTORS.map(([cx, cy]) => (
                <Circle key={`${cx}${cy}`} cx={cx} cy={cy} r={ROTOR_RADIUS} fill="none" stroke={backgroundArt.route} strokeWidth="2.2"/>
            ))}
            <Rect x="-10" y="-10" width="20" height="20" rx="6" fill={backgroundArt.route}/>
            <Circle cx="0" cy="0" r="3.4" fill={backgroundArt.radar}/>
        </G>
    );
}
