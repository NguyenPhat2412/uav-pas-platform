import type {MissionInput} from '@/shared/types/mission/mission.types';

// Import-free (types only) so the tests run it directly. Times are local wall-clock strings (yyyy-MM-ddTHH:mm),
// the format the web form sends: the flight happens at the site's local time and the backend does not convert it.

const pad = (n: number) => String(n).padStart(2, '0');
export const toLocalIso = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Parses a local wall-clock string back to a Date; null when it is not one. */
export function fromLocalIso(value: string | undefined): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? '');
    if (!match) return null;
    const [, y, m, d, hh, mm] = match.map(Number);
    return new Date(y, m - 1, d, hh, mm);
}

const DEFAULT_DURATION_MINUTES = 60;

/** A new request: tomorrow 08:00 for the service's usual duration (one hour without a service). */
export function newMissionDraft(now: Date, serviceId?: number, durationMinutes = DEFAULT_DURATION_MINUTES): MissionInput {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0);
    const startTime = toLocalIso(start);
    return {
        missionType: 'AREA_INSPECTION',
        title: '',
        description: '',
        requestedDate: startTime.slice(0, 10),
        startTime,
        expectedEndTime: toLocalIso(new Date(start.getTime() + durationMinutes * 60_000)),
        locationName: '',
        priority: 'NORMAL',
        notes: '',
        serviceId,
    };
}

/** Moves the start, keeping the planned duration and the requested date in step (as applyFlightWindow on the web). */
export function withStart(form: MissionInput, start: Date): MissionInput {
    const previousStart = fromLocalIso(form.startTime);
    const previousEnd = fromLocalIso(form.expectedEndTime);
    const duration = previousStart && previousEnd && previousEnd > previousStart
        ? previousEnd.getTime() - previousStart.getTime() : DEFAULT_DURATION_MINUTES * 60_000;
    const startTime = toLocalIso(start);
    return {...form, startTime, requestedDate: startTime.slice(0, 10), expectedEndTime: toLocalIso(new Date(start.getTime() + duration))};
}

export function withEnd(form: MissionInput, end: Date): MissionInput {
    return {...form, expectedEndTime: toLocalIso(end)};
}

/** Sets the place picked on the map; coordinates rounded to ~1 m like the web picker. */
export function withPoint(form: MissionInput, latitude: number, longitude: number): MissionInput {
    return {...form, latitude: Math.round(latitude * 1e5) / 1e5, longitude: Math.round(longitude * 1e5) / 1e5};
}
