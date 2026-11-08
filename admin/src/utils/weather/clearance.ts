import type {FlightClearanceLevel} from '@/types/weather/weather.types';

/** Design-system tones: GO sky/blue, CAUTION amber, NO_GO red; never green. */
export const CLEARANCE_TONE: Record<FlightClearanceLevel, string> = {
    GO: 'bg-sky-50 text-uav-blue border-sky-200',
    CAUTION: 'bg-amber-50 text-amber-800 border-amber-200',
    NO_GO: 'bg-red-50 text-danger border-red-200',
    UNAVAILABLE: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function compassPoint(degrees: number): string {
    return COMPASS_POINTS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}
