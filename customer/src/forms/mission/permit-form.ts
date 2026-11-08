import type {
    FlightPermitStatus,
    Mission,
    MissionPermit,
    MissionPermitUpsertInput,
    MissionPermitVerifyInput,
} from '@/types/mission/mission.types';

export interface PermitDraft {
    permitNumber: string;
    permitAuthority: string;
    validFrom: string;
    validUntil: string;
    maxAltitudeMeters: string;
    permitMediaId: string;
    note: string;
}

export type PermitFieldErrors = Partial<Record<keyof PermitDraft, string>> & Record<string, string | undefined>;

const NON_PREFLIGHT_MISSION_STATUSES = new Set([
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REJECTED',
]);

/** Converts a backend ISO LocalDateTime or OffsetDateTime string to `YYYY-MM-DDTHH:mm` for datetime-local inputs. */
export function toDateTimeLocalValue(value?: string | null): string {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    return match ? match[1] : trimmed.slice(0, 16);
}

/** Normalizes a datetime-local or ISO string to `YYYY-MM-DDTHH:mm:ss` for Spring `LocalDateTime`. */
export function normalizePermitDateTime(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const withoutZone = trimmed.replace(/(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/, '');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(withoutZone)) {
        return `${withoutZone}:00`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(withoutZone)) {
        return withoutZone.slice(0, 19);
    }
    return withoutZone;
}

export function emptyPermitDraft(defaults?: {
    startTime?: string | null;
    expectedEndTime?: string | null;
    altitudeAglMeters?: number | null;
}): PermitDraft {
    return {
        permitNumber: '',
        permitAuthority: '',
        validFrom: toDateTimeLocalValue(defaults?.startTime),
        validUntil: toDateTimeLocalValue(defaults?.expectedEndTime),
        maxAltitudeMeters: defaults?.altitudeAglMeters != null ? String(Math.round(defaults.altitudeAglMeters)) : '',
        permitMediaId: '',
        note: '',
    };
}

export function permitDraftFromMission(
    permit?: MissionPermit | null,
    defaults?: {
        startTime?: string | null;
        expectedEndTime?: string | null;
        altitudeAglMeters?: number | null;
    },
): PermitDraft {
    if (!permit || (!permit.permitNumber && !permit.permitAuthority && !permit.validFrom && !permit.validUntil)) {
        return emptyPermitDraft(defaults);
    }
    return {
        permitNumber: permit.permitNumber ?? '',
        permitAuthority: permit.permitAuthority ?? '',
        validFrom: toDateTimeLocalValue(permit.validFrom) || toDateTimeLocalValue(defaults?.startTime),
        validUntil: toDateTimeLocalValue(permit.validUntil) || toDateTimeLocalValue(defaults?.expectedEndTime),
        maxAltitudeMeters:
            permit.maxAltitudeMeters != null
                ? String(permit.maxAltitudeMeters)
                : defaults?.altitudeAglMeters != null
                  ? String(Math.round(defaults.altitudeAglMeters))
                  : '',
        permitMediaId: permit.permitMediaId != null ? String(permit.permitMediaId) : '',
        note: permit.note ?? '',
    };
}

export function canSubmitPermitDraft(draft: PermitDraft): boolean {
    if (!draft.permitNumber.trim() || !draft.permitAuthority.trim()) return false;
    const from = normalizePermitDateTime(draft.validFrom);
    const until = normalizePermitDateTime(draft.validUntil);
    if (!from || !until || until <= from) return false;
    const rawAlt = draft.maxAltitudeMeters.trim();
    if (rawAlt && !Number.isFinite(Number(rawAlt))) return false;
    const rawMedia = draft.permitMediaId.trim();
    if (rawMedia && (!Number.isSafeInteger(Number(rawMedia)) || Number(rawMedia) <= 0)) return false;
    return true;
}

export function toPermitUpsertPayload(draft: PermitDraft): MissionPermitUpsertInput {
    const rawAlt = draft.maxAltitudeMeters.trim();
    const rawMedia = draft.permitMediaId.trim();
    const rawNote = draft.note.trim();
    return {
        permitNumber: draft.permitNumber.trim(),
        permitAuthority: draft.permitAuthority.trim(),
        validFrom: normalizePermitDateTime(draft.validFrom),
        validUntil: normalizePermitDateTime(draft.validUntil),
        maxAltitudeMeters: rawAlt ? Math.round(Number(rawAlt)) : null,
        permitMediaId: rawMedia ? Number(rawMedia) : null,
        note: rawNote || null,
    };
}

export function toPermitVerifyPayload(approved: boolean, note?: string): MissionPermitVerifyInput {
    const trimmed = note?.trim();
    return {
        approved,
        note: trimmed ? trimmed : null,
    };
}

export function effectivePermitStatus(permit?: MissionPermit | null): FlightPermitStatus {
    return permit?.status ?? 'NOT_REQUIRED';
}

export function canEditMissionPermit(
    mission: Pick<Mission, 'status' | 'customerId' | 'operatorId'>,
    userId: number | undefined,
    canConfirm: boolean,
    canManageUsers = false,
): boolean {
    if (NON_PREFLIGHT_MISSION_STATUSES.has(mission.status)) return false;
    if (canConfirm || canManageUsers) return true;
    return userId != null && (mission.customerId === userId || mission.operatorId === userId);
}

export function canVerifyMissionPermit(
    mission: Pick<Mission, 'status' | 'permit'>,
    canConfirm: boolean,
): boolean {
    if (!canConfirm || NON_PREFLIGHT_MISSION_STATUSES.has(mission.status)) return false;
    const permit = mission.permit;
    if (!permit?.permitNumber?.trim()) return false;
    return permit.status === 'SUBMITTED' || permit.status === 'PENDING';
}

export function permitFieldErrors(error: unknown): PermitFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as PermitFieldErrors) : null;
}
