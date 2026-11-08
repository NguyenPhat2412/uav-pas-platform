import {Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudRainWind, CloudSnow, CloudSun, Moon, Sun, type LucideIcon} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {WeatherCondition} from '@/utils/weather/conditions';

// Conventional weather colours (sun amber, rain blue, storm violet), given as hex so the portal's grey
// palette overrides for blue/sky utilities do not wash them out.
const ICONS: Record<WeatherCondition, { day: LucideIcon; night: LucideIcon; color: string; motion: string }> = {
    clear: {day: Sun, night: Moon, color: 'text-[#f59e0b]', motion: 'animate-weather-sun'},
    partly: {day: CloudSun, night: CloudMoon, color: 'text-[#f59e0b]', motion: 'animate-weather-float'},
    cloudy: {day: Cloud, night: Cloud, color: 'text-[#94a3b8]', motion: 'animate-weather-float'},
    fog: {day: CloudFog, night: CloudFog, color: 'text-[#a1a1aa]', motion: 'animate-weather-float'},
    drizzle: {day: CloudDrizzle, night: CloudDrizzle, color: 'text-[#38bdf8]', motion: 'animate-weather-float'},
    rain: {day: CloudRain, night: CloudRain, color: 'text-[#0284c7]', motion: 'animate-weather-float'},
    showers: {day: CloudRainWind, night: CloudRainWind, color: 'text-[#0284c7]', motion: 'animate-weather-float'},
    thunder: {day: CloudLightning, night: CloudLightning, color: 'text-[#7c3aed]', motion: 'animate-weather-float'},
    snow: {day: CloudSnow, night: CloudSnow, color: 'text-[#7dd3fc]', motion: 'animate-weather-float'},
    unknown: {day: Cloud, night: Cloud, color: 'text-[#cbd5e1]', motion: ''},
};

/** Sky condition as a coloured, gently animated icon; the night variant swaps sun for moon. */
export function WeatherIcon({condition, night = false, size = 28, animated = true, onDark = false, className}: {
    condition: WeatherCondition;
    night?: boolean;
    size?: number;
    animated?: boolean;
    /** Drawn on a dark (night or storm) sky: the moon and grey clouds turn light so they stay visible. */
    onDark?: boolean;
    className?: string;
}) {
    const {day, night: nightIcon, color, motion} = ICONS[condition];
    const Icon = night ? nightIcon : day;
    const moon = night && (condition === 'clear' || condition === 'partly');
    const tint = moon ? (onDark ? 'text-[#f1f5f9]' : 'text-[#64748b]')
        : onDark && (condition === 'cloudy' || condition === 'fog' || condition === 'unknown') ? 'text-[#e2e8f0]' : color;
    return <Icon size={size} aria-hidden="true" strokeWidth={1.75}
                 className={cn('shrink-0', tint, animated && motion, 'motion-reduce:animate-none', className)}/>;
}
