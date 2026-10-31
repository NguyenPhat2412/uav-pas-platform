import React from 'react';
import {cn} from '@/lib/utils';
import {getPresentationLocale} from '@/lib/presentation';

// Plain component (no hooks) so it also works in server-rendered loading states, like Spinner.
const defaultLabels = {vi: 'Đang tải...', en: 'Loading…', ja: '読み込み中…'} as const;

// Rotor hubs of an X-frame quadcopter seen from above; diagonal pairs turn the same way, as on a real one.
const ROTORS = [
    {x: 30, y: 30, ccw: false},
    {x: 90, y: 30, ccw: true},
    {x: 30, y: 90, ccw: true},
    {x: 90, y: 90, ccw: false},
] as const;

// SVG parts turn and scale around their own centre.
const own = 'transform-fill origin-center';
const led = 'animate-nav-blink motion-reduce:animate-none';

/**
 * Full-page loading state: a hovering quadcopter with spinning propellers and blinking nav lights.
 * The keyframes live in tailwind.config.mjs (rotor, uav-bob, uav-shadow, nav-blink); under
 * prefers-reduced-motion the airframe holds still and the propellers turn slowly.
 * Inline waits (buttons, table cells) keep the small Spinner.
 */
export function UavLoader({label, size = 120, className, fullScreen = false}: {
    label?: string;
    size?: number;
    className?: string;
    fullScreen?: boolean;
}) {
    const text = label || defaultLabels[getPresentationLocale()];
    return (
        <div role="status" aria-label={text}
             className={cn('flex flex-col items-center justify-center gap-3 text-foreground/80', fullScreen && 'min-h-screen bg-background', className)}>
            <svg width={size} height={size * 1.15} viewBox="0 0 120 138" aria-hidden="true" className="overflow-visible">
                <ellipse className={cn(own, 'animate-uav-shadow fill-current opacity-20 motion-reduce:animate-none')} cx="60" cy="130" rx="30" ry="4.5"/>
                <g className="animate-uav-bob motion-reduce:animate-none">
                    {/* arms */}
                    <path d="M30 30 L90 90 M90 30 L30 90" className="stroke-current" strokeWidth="6" strokeLinecap="round"/>
                    {ROTORS.map(({x, y, ccw}) => (
                        <g key={`${x}-${y}`}>
                            <circle cx={x} cy={y} r="19" className="fill-none stroke-current opacity-20" strokeWidth="1.5"/>
                            <circle cx={x} cy={y} r="16" className="fill-current opacity-[0.07]"/>
                            <g className={cn(own, ccw ? 'animate-rotor-reverse' : 'animate-rotor', 'motion-reduce:[animation-duration:2.4s]')}>
                                <ellipse cx={x} cy={y} rx="16" ry="2.6" className="fill-current opacity-75"/>
                                <ellipse cx={x} cy={y} rx="2.6" ry="16" className="fill-current opacity-35"/>
                            </g>
                            <circle cx={x} cy={y} r="4" className="fill-current"/>
                            <circle cx={x} cy={y} r="1.6" className="fill-card"/>
                        </g>
                    ))}
                    {/* body, battery stripe and gimbal camera at the front */}
                    <rect x="45" y="42" width="30" height="36" rx="10" className="fill-current"/>
                    <rect x="51" y="52" width="18" height="14" rx="3" className="fill-primary"/>
                    <circle cx="60" cy="44" r="5" className="fill-card stroke-current" strokeWidth="2"/>
                    <circle cx="60" cy="44" r="2" className="fill-current"/>
                    {/* nav lights: red front, green rear, half a beat apart */}
                    <circle cx="48" cy="46" r="2" className={cn(led, 'fill-red-500')}/>
                    <circle cx="72" cy="46" r="2" className={cn(led, 'fill-red-500')}/>
                    <circle cx="48" cy="74" r="2" className={cn(led, 'fill-green-500 [animation-delay:0.6s]')}/>
                    <circle cx="72" cy="74" r="2" className={cn(led, 'fill-green-500 [animation-delay:0.6s]')}/>
                </g>
            </svg>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{text}</span>
        </div>
    );
}
