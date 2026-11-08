import type {Station, Uav} from '@/types/resources';

export type {Station, Uav};

export interface UavCreateDraft {
    model: string;
    serialNumber: string;
    manufacturer: string;
}

export type UavCreateFieldErrors = Partial<Record<keyof UavCreateDraft, string>>;

export type UavLifecycleAction = 'maintenance' | 'recover';

export interface UavLifecycleConfirmation {
    action: UavLifecycleAction;
    expectedStatus: string;
}

export function emptyUavCreateDraft(): UavCreateDraft {
    return {
        model: '',
        serialNumber: '',
        manufacturer: '',
    };
}

export function canSubmitUavCreate(draft: UavCreateDraft): boolean {
    return Boolean(draft.model.trim() && draft.serialNumber.trim() && draft.manufacturer.trim());
}

export function toUavCreatePayload(draft: UavCreateDraft): UavCreateDraft {
    return {
        model: draft.model.trim(),
        serialNumber: draft.serialNumber.trim(),
        manufacturer: draft.manufacturer.trim(),
    };
}

export function uavFieldErrors(error: unknown): UavCreateFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as UavCreateFieldErrors) : null;
}

export function createUavLifecycleConfirmation(
    action: UavLifecycleAction,
    expectedStatus: string,
): UavLifecycleConfirmation {
    return {action, expectedStatus};
}

export function canSubmitUavLifecycleReason(reason: string): boolean {
    return reason.trim().length > 0;
}

export function toUavLifecyclePayload(
    id: number,
    confirmation: UavLifecycleConfirmation,
    reason: string,
): { id: number; reason: string; expectedStatus: string } {
    return {
        id,
        reason,
        expectedStatus: confirmation.expectedStatus,
    };
}

export function canAssignUavToStation(
    stationId: string,
    currentStationId: number | undefined,
    stations: readonly Pick<Station, 'id' | 'status'>[],
): boolean {
    const parsed = Number(stationId);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed === currentStationId) {
        return false;
    }
    return stations.some(station => station.id === parsed && station.status === 'ACTIVE');
}

export function toUavStationAssignPayload(
    id: number,
    stationId: string,
): { id: number; stationId: number } {
    return {
        id,
        stationId: Number(stationId),
    };
}

