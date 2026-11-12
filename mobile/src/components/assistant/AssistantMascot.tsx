import React from 'react';
import Svg, {Circle, Ellipse, Path} from 'react-native-svg';

/** The assistant's mascot, drawn exactly like the web SuperheroLogo: a superhero head in brand red and slate. */
export function AssistantMascot({size = 40}: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no">
            <Path d="M32 3 L37 11 L27 11 Z" fill="#475569"/>
            <Circle cx={32} cy={34} r={25} fill="#475569"/>
            <Ellipse cx={32} cy={38} rx={20} ry={19} fill="#ffd9b8"/>
            <Path d="M33.5 13 L28.5 21 L32 21 L30 27 L36 18.5 L32.5 18.5 Z" fill="#fbbf24" stroke="#ffffff" strokeWidth={0.8} strokeLinejoin="round"/>
            <Path d="M11 33 Q32 24 53 33 L53 41 Q43 45 36 40 Q32 37.5 28 40 Q21 45 11 41 Z" fill="#ab2523"/>
            <Ellipse cx={23} cy={36.5} rx={5.2} ry={5.6} fill="#ffffff"/>
            <Ellipse cx={41} cy={36.5} rx={5.2} ry={5.6} fill="#ffffff"/>
            <Circle cx={24} cy={37.5} r={3} fill="#1e293b"/>
            <Circle cx={40} cy={37.5} r={3} fill="#1e293b"/>
            <Circle cx={25.2} cy={36.2} r={1.1} fill="#ffffff"/>
            <Circle cx={41.2} cy={36.2} r={1.1} fill="#ffffff"/>
            <Ellipse cx={17.5} cy={47} rx={3.2} ry={2} fill="#f9a8a8" opacity={0.8}/>
            <Ellipse cx={46.5} cy={47} rx={3.2} ry={2} fill="#f9a8a8" opacity={0.8}/>
            <Path d="M26.5 48.5 Q32 54 37.5 48.5" fill="none" stroke="#7c2d12" strokeWidth={2.2} strokeLinecap="round"/>
        </Svg>
    );
}
