import type {MissionInput} from '@/features/missions/types/mission.types';

const pad = (value: number) => String(value).padStart(2, '0');
const local = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

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
