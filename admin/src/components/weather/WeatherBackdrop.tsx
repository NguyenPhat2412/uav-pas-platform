import {useId, type CSSProperties, type ReactNode} from 'react';
import {cn} from '@/lib/utils';
import type {SkyEffect} from '@/utils/weather/sky-theme';

// Fixed pseudo-random spread (same on server and client, so no hydration mismatch and no Math.random()).
const spread = (i: number, salt: number) => {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
};
const moving = 'motion-reduce:hidden';

function Drops({count, dark, wind, slant, speed}: { count: number; dark: boolean; wind: number; slant: number; speed: [number, number] }) {
    const nodes: ReactNode[] = [];
    for (let i = 0; i < count; i++) {
        const duration = speed[0] + spread(i, 2) * (speed[1] - speed[0]);
        nodes.push(
            <span key={i} className={cn('absolute top-0 animate-sky-fall', moving)}
                  style={{
                      left: `${spread(i, 1) * 104 - 2}%`,
                      animationDuration: `${duration}s`,
                      animationDelay: `-${spread(i, 3) * duration}s`,
                      '--sky-wind': `${wind}px`,
                  } as CSSProperties}>
                <span className={cn('block w-px', dark ? 'bg-gradient-to-b from-transparent to-white/55' : 'bg-gradient-to-b from-transparent to-[#58718b]/60')}
                      style={{height: `${12 + spread(i, 4) * 10}px`, transform: `rotate(${slant}deg)`}}/>
            </span>,
        );
    }
    return <>{nodes}</>;
}

function Flakes({count, dark}: { count: number; dark: boolean }) {
    const nodes: ReactNode[] = [];
    for (let i = 0; i < count; i++) {
        const duration = 6 + spread(i, 2) * 5;
        const size = 3 + spread(i, 5) * 3;
        nodes.push(
            <svg key={i} width={size} height={size} viewBox="0 0 10 10" className={cn('absolute top-0 animate-sky-fall', moving)}
                 style={{
                     left: `${spread(i, 1) * 100}%`,
                     animationDuration: `${duration}s`,
                     animationDelay: `-${spread(i, 3) * duration}s`,
                     '--sky-wind': `${(spread(i, 6) - 0.5) * 50}px`,
                 } as CSSProperties}>
                <circle cx="5" cy="5" r="5" fill={dark ? '#ffffff' : '#9fb3c8'} opacity="0.9"/>
            </svg>,
        );
    }
    return <>{nodes}</>;
}

function Clouds({count, dark}: { count: number; dark: boolean }) {
    const nodes: ReactNode[] = [];
    for (let i = 0; i < count; i++) {
        const duration = 50 + spread(i, 2) * 50;
        const width = 140 + spread(i, 4) * 120;
        nodes.push(
            <svg key={i} width={width} height={width * 0.45} viewBox="0 0 200 90" className={cn('absolute left-0 animate-sky-drift', moving)}
                 style={{top: `${spread(i, 1) * 55 - 5}%`, animationDuration: `${duration}s`, animationDelay: `-${spread(i, 3) * duration}s`}}>
                <path d="M30 80 C8 80 4 52 26 46 C24 22 56 12 72 30 C84 6 128 8 132 38 C160 30 186 48 176 72 C174 78 168 80 160 80 Z"
                      fill={dark ? '#94a3b8' : '#ffffff'} opacity={dark ? 0.18 : 0.7}/>
            </svg>,
        );
    }
    return <>{nodes}</>;
}

function Fog() {
    return <>{[0, 1, 2].map(i => (
        <div key={i} className={cn('absolute left-0 h-10 w-3/5 bg-white/60 blur-xl animate-sky-drift', moving)}
             style={{top: `${20 + i * 25}%`, animationDuration: `${70 + i * 20}s`, animationDelay: `-${i * 23}s`}}/>
    ))}</>;
}

function Sun() {
    const glow = `${useId()}-sun-glow`;
    return (
        <svg viewBox="0 0 200 200" className="absolute -right-16 -top-20 h-64 w-64">
            <defs>
                <radialGradient id={glow}>
                    <stop offset="0%" stopColor="#ffd25a" stopOpacity="0.95"/>
                    <stop offset="45%" stopColor="#ffc53d" stopOpacity="0.45"/>
                    <stop offset="100%" stopColor="#ffb020" stopOpacity="0"/>
                </radialGradient>
            </defs>
            <g className={cn('origin-center [transform-box:fill-box] animate-sky-rays', moving)} stroke="#ffbf2f" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round">
                {Array.from({length: 12}, (_, i) => {
                    const a = (i / 12) * Math.PI * 2;
                    return <line key={i} x1={100 + Math.cos(a) * 48} y1={100 + Math.sin(a) * 48} x2={100 + Math.cos(a) * 92} y2={100 + Math.sin(a) * 92}/>;
                })}
            </g>
            <circle cx="100" cy="100" r="70" fill={`url(#${glow})`} className="origin-center [transform-box:fill-box] animate-sky-glow motion-reduce:animate-none"/>
        </svg>
    );
}

// Each star is its own tiny SVG placed by percentage, so the card's aspect ratio never stretches it.
function Stars({count}: { count: number }) {
    return <>{Array.from({length: count}, (_, i) => {
        const size = 1.5 + spread(i, 3) * 2;
        return (
            <svg key={i} width={size} height={size} viewBox="0 0 10 10" className="absolute animate-sky-twinkle motion-reduce:animate-none"
                 style={{left: `${spread(i, 1) * 100}%`, top: `${spread(i, 2) * 75}%`,
                     animationDelay: `-${spread(i, 4) * 3}s`, animationDuration: `${2.5 + spread(i, 5) * 2.5}s`}}>
                <circle cx="5" cy="5" r="5" fill="#ffffff"/>
            </svg>
        );
    })}</>;
}

/**
 * The moving sky behind a weather card: sun glow and slow rays, drifting clouds or fog, rain (sparse,
 * steady or wind-driven), a storm's lightning, snow, or twinkling stars at night. Decorative only
 * (aria-hidden, no pointer events); with prefers-reduced-motion only still elements remain.
 */
export function WeatherBackdrop({effect, dark, className}: { effect: SkyEffect; dark: boolean; className?: string }) {
    if (effect === 'none') return null;
    return (
        <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
            {effect === 'sun' && <Sun/>}
            {effect === 'stars' && <Stars count={36}/>}
            {(effect === 'clouds' || effect === 'storm') && <Clouds count={effect === 'storm' ? 4 : 3} dark={dark}/>}
            {effect === 'fog' && <Fog/>}
            {effect === 'drizzle' && <Drops count={18} dark={dark} wind={-8} slant={4} speed={[1.4, 2.2]}/>}
            {effect === 'rain' && <Drops count={42} dark={dark} wind={-14} slant={6} speed={[0.8, 1.3]}/>}
            {(effect === 'showers' || effect === 'storm') && <Drops count={56} dark={dark} wind={-60} slant={13} speed={[0.6, 1]}/>}
            {effect === 'snow' && <Flakes count={30} dark={dark}/>}
            {effect === 'storm' && <div className={cn('absolute inset-0 bg-white animate-sky-flash', moving)}/>}
        </div>
    );
}
