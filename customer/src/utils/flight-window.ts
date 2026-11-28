import type {MissionInput} from '@/types/mission.types';

const pad = (value: number) => String(value).padStart(2, '0');
const DAY_MS = 86_400_000;

/** Supported past/future day window: 7 historical days through 14 forecast days. */
export const WEATHER_MIN_DAY_OFFSET = -7;
export const WEATHER_MAX_DAY_OFFSET = 14;
export const WEATHER_HOUR_SLOTS = [7, 10, 14, 17, 20] as const;
export const WEATHER_STRIP_HOURS = [8, 11, 14, 17] as const;
export const WEATHER_DAY_OFFSETS: readonly number[] = Array.from(
    {length: WEATHER_MAX_DAY_OFFSET - WEATHER_MIN_DAY_OFFSET + 1},
    (_, index) => WEATHER_MIN_DAY_OFFSET + index,
);

/** Local date as yyyy-MM-dd. */
export const localDateIso = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Local date-time as the weather API and datetime-local inputs expect it: yyyy-MM-ddTHH:mm. */
export const localIso = (date: Date) =>
    `${localDateIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const local = localIso;

export function clampDayOffset(offset: number): number {
    if (!Number.isFinite(offset)) return 0;
    return Math.max(WEATHER_MIN_DAY_OFFSET, Math.min(WEATHER_MAX_DAY_OFFSET, Math.trunc(offset)));
}

/** Local noon on base + offset days so DST or midnight shifts never flip the calendar day. */
export function dateAtDayOffset(offset: number, base: Date = new Date()): Date {
    const target = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0, 0);
    target.setDate(target.getDate() + clampDayOffset(offset));
    return target;
}

/** Local ISO timestamp (yyyy-MM-ddTHH:00) for a day offset and hour slot. */
export function buildWeatherSlotIso(dayOffset: number, hour: number, base: Date = new Date()): string {
    const day = dateAtDayOffset(dayOffset, base);
    const safeHour = Math.max(0, Math.min(23, Math.trunc(hour)));
    return `${localDateIso(day)}T${pad(safeHour)}:00`;
}

/** Calendar-day offset between an ISO date/date-time string and base (0 when omitted or invalid). */
export function dayOffsetFromIso(at: string | undefined, base: Date = new Date()): number {
    if (!at || at.length < 10) return 0;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(at);
    if (!match) return 0;
    const targetNoon = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    if (Number.isNaN(targetNoon.getTime())) return 0;
    const baseNoon = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0, 0);
    return clampDayOffset(Math.round((targetNoon.getTime() - baseNoon.getTime()) / DAY_MS));
}

/** Hour-of-day (0..23) parsed from a local ISO string, or null when live ("now"). */
export function hourFromIso(at: string | undefined): number | null {
    if (!at) return null;
    const match = /T(\d{2}):(\d{2})/.exec(at);
    if (!match) return null;
    const hour = Number(match[1]);
    return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

/** Shifts the active weather timestamp by deltaDays while preserving its chosen hour (09:00 if moving off live "now"). */
export function shiftWeatherDay(at: string | undefined, deltaDays: number, base: Date = new Date()): string | undefined {
    const currentOffset = dayOffsetFromIso(at, base);
    const nextOffset = clampDayOffset(currentOffset + deltaDays);
    const explicitHour = hourFromIso(at);
    if (nextOffset === 0 && explicitHour === null) return undefined;
    return buildWeatherSlotIso(nextOffset, explicitHour ?? 9, base);
}

/** True when evaluatedTime falls strictly before the current local hour. */
export function isHistoricalWeatherTime(evaluatedTime: string | undefined, base: Date = new Date()): boolean {
    if (!evaluatedTime || evaluatedTime.length < 13) return false;
    const currentHourKey = `${localDateIso(base)}T${pad(base.getHours())}`;
    return evaluatedTime.slice(0, 13) < currentHourKey;
}

/**
 * Five-point timeline for HomeWeatherWidget and Mobile WeatherCard:
 * - Today (offset 0) & no explicit hour: [undefined ("now"), +3h, +6h, +9h, +12h]
 * - Any other day (or explicit hour): [headline (09:00 or explicitAt), 08:00, 11:00, 14:00, 17:00]
 */
export function weatherTimelineForDay(
    dayOffset: number,
    base: Date = new Date(),
    explicitAt?: string,
    stepHours: readonly number[] = [3, 6, 9, 12],
): (string | undefined)[] {
    const safeOffset = clampDayOffset(dayOffset);
    if (safeOffset === 0 && !explicitAt) {
        const hourBase = new Date(base);
        hourBase.setMinutes(0, 0, 0);
        return [undefined, ...stepHours.map(hours => local(new Date(hourBase.getTime() + hours * 3_600_000)))];
    }
    const headline = explicitAt ?? buildWeatherSlotIso(safeOffset, 9, base);
    return [headline, ...WEATHER_STRIP_HOURS.map(hour => buildWeatherSlotIso(safeOffset, hour, base))];
}

/** Default flight length when the form has no valid end time yet. */
const DEFAULT_DURATION_MS = 60 * 60_000;

/**
 * Moves the planned flight to a recommended window, keeping its duration (one hour when unknown)
 * and the requested date in step with the new start.
 */
export function applyFlightWindow<T extends Pick<MissionInput, 'startTime' | 'expectedEndTime' | 'requestedDate'>>(form: T, windowStart: string): T {
    const start = new Date(windowStart);
    if (Number.isNaN(start.getTime())) return form;
    const previousStart = new Date(form.startTime).getTime();
    const previousEnd = new Date(form.expectedEndTime).getTime();
    const duration = Number.isFinite(previousStart) && Number.isFinite(previousEnd) && previousEnd > previousStart
        ? previousEnd - previousStart : DEFAULT_DURATION_MS;
    const startText = local(start);
    return {...form, startTime: startText, expectedEndTime: local(new Date(start.getTime() + duration)), requestedDate: startText.slice(0, 10)};
}
