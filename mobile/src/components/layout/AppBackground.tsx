import React, {useRef, useState} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import Svg, {Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop} from 'react-native-svg';
import {backgroundArt, backgroundGradient} from '@/styles/tokens';

// Drawn on a phone-sized canvas and scaled to cover the screen ("slice"), so circles stay round on every device.
const W = 390;
const H = 844;
const BASE = {x: 352, y: 96};
const ROUTE = 'M -10 790 C 80 720, 250 700, 262 600 S 120 470, 150 390 S 300 330, 300 250 S 330 150, 352 96';
const WAYPOINTS = [{x: 262, y: 600}, {x: 150, y: 390}, {x: 300, y: 250}];

/**
 * The page behind every screen: the brand gradient plus a survey map in the UAV operations style. A dotted grid,
 * terrain contour lines, radar rings around the flight base (top right) and a dashed flight route with waypoints and
 * a drone on its way. Everything is faint enough that cards and text on top stay the focus.
 *
 * The artwork is anchored to the window, not to the view: each copy measures where it sits and shifts the drawing up
 * by that much. AppHeader and the page below it therefore show two halves of one picture, joined without a seam.
 */
export function AppBackground() {
    const {width, height} = useWindowDimensions();
    const frame = useRef<React.ComponentRef<typeof View>>(null);
    const [top, setTop] = useState(0);
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
            <Drone x={212} y={498} rotation={-38}/>
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    frame: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden'},
});

/** A small top-down quadcopter: four rotors on an X frame around the body. */
function Drone({x, y, rotation}: { x: number; y: number; rotation: number }) {
    const arm = 13;
    return (
        <G transform={`translate(${x} ${y}) rotate(${rotation})`} opacity="0.34">
            <Line x1={-arm} y1={-arm} x2={arm} y2={arm} stroke={backgroundArt.route} strokeWidth="2.4" strokeLinecap="round"/>
            <Line x1={-arm} y1={arm} x2={arm} y2={-arm} stroke={backgroundArt.route} strokeWidth="2.4" strokeLinecap="round"/>
            {[[-arm, -arm], [arm, -arm], [-arm, arm], [arm, arm]].map(([cx, cy]) => (
                <Circle key={`${cx}${cy}`} cx={cx} cy={cy} r="7.5" fill="none" stroke={backgroundArt.route} strokeWidth="1.6"/>
            ))}
            <Rect x="-6" y="-6" width="12" height="12" rx="3.5" fill={backgroundArt.route}/>
            <Circle cx="0" cy="0" r="2" fill={backgroundArt.radar}/>
        </G>
    );
}
