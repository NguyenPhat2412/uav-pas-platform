import type {
    MissionConfirmationKind,
    MissionNoticeMessage,
    RedispatchFormState,
} from '@/types/mission/mission.types';
import type {Equipment} from '@/types/resources';

export type {Equipment, MissionConfirmationKind, MissionNoticeMessage, RedispatchFormState};

export const OPERATIONS_MISSION_ERROR_CODES = new Set([
    'MISSION_ACCEPTANCE_REQUIRED',
    'MISSION_ACCEPTANCE_STALE',
    'MISSION_HANDOVER_NOTES_REQUIRED',
    'MISSION_HANDOVER_RESULT_REQUIRED',
    'MISSION_MEDIA_LOCKED',
    'MISSION_DISPATCH_STALE',
    'MISSION_RESERVATION_STALE',
    'MISSION_STATION_RESOURCES_CONFLICT',
    'MISSION_RESERVATION_BALANCE_CONFLICT',
    'MISSION_DISPATCH_REQUIRED',
    'OPERATOR_NOT_AVAILABLE',
    'MISSION_RESOURCE_UNCHANGED',
    'MISSION_UAV_ASSIGNMENT_STALE',
    'MISSION_INVALID_STATUS',
    'MISSION_RESOURCE_MISSING',
    'UAV_NOT_AVAILABLE',
    'UAV_TIME_CONFLICT',
    'OPERATOR_TIME_CONFLICT',
    'INVENTORY_NOT_AVAILABLE',
    'MISSION_WEATHER_UNSAFE',
    'AIRSPACE_PROHIBITED_ZONE',
    'MISSION_PERMIT_REQUIRED',
    'MISSION_PERMIT_EXPIRED',
    'MISSION_PERMIT_ALTITUDE_EXCEEDED',
    'MISSION_PERMIT_NOT_SUBMITTED',
    'PERMIT_VALIDITY_RANGE_INVALID',
    'PERMIT_MEDIA_NOT_FOUND',
    'PERMIT_MEDIA_NOT_CONFIRMED',
]);

export function operationsMissionNotice(error: unknown, fallbackKey: string): MissionNoticeMessage {
    const structured = error as { status?: number; code?: string; message?: string; fields?: Record<string, string> } | null;
    if (structured?.status === 403) return {key: 'opsMissions.detail.errors.forbidden'};
    const code = structured?.code && OPERATIONS_MISSION_ERROR_CODES.has(structured.code)
        ? structured.code
        : structured?.message && OPERATIONS_MISSION_ERROR_CODES.has(structured.message)
          ? structured.message
          : '';
    if (code) return {key: `opsMissions.apiErrors.${code}`};
    const fieldValues = structured?.fields ? Object.values(structured.fields).filter(Boolean) : [];
    if (fieldValues.length) return {text: [...new Set(fieldValues)].join(' ')};
    const msg = structured?.message ?? (error instanceof Error ? error.message : '');
    if (structured?.status && msg && !/^[A-Z0-9_]+$/.test(msg)) return {text: msg};
    return {key: fallbackKey};
}

export function canSubmitMissionConfirmation(
    confirmation: MissionConfirmationKind,
    note: string,
    extraNote: string,
    canFinish: boolean,
): boolean {
    if (['reject', 'conflict', 'fail', 'forceFail', 'complete'].includes(confirmation) && !note.trim()) {
        return false;
    }
    if (confirmation === 'complete' && (!extraNote.trim() || !canFinish)) {
        return false;
    }
    return true;
}

export function canSubmitUavRedispatch(
    kind: 'replaceUav' | 'unassignUav',
    reason: string,
    replacementUavId: string,
    candidateIds: number[],
): boolean {
    if (!reason.trim()) return false;
    if (kind === 'replaceUav' && !candidateIds.some(id => String(id) === replacementUavId)) return false;
    return true;
}

export function isValidEquipmentQuantity(rawQuantity: string, maxAvailable: number): boolean {
    const value = Number(rawQuantity);
    return Number.isSafeInteger(value) && value > 0 && value <= maxAvailable;
}

export function redispatchAvailableQuantity(
    selectedEquipment: Pick<Equipment, 'id' | 'availableQuantity'> | undefined,
    form: RedispatchFormState | null,
): number {
    if (!selectedEquipment) return 0;
    const held = selectedEquipment.id === form?.oldEquipmentId ? (form?.oldQuantity ?? 0) : 0;
    return selectedEquipment.availableQuantity + held;
}

export function canSubmitResourceRedispatch(params: {
    disabled: boolean;
    form: RedispatchFormState | null;
    snapshotVersion: number;
    reason: string;
    replacement: string;
    candidateIds: number[];
    quantity: string;
    maxAvailable: number;
    schedule: 'idle' | 'checking' | 'available' | 'conflict' | 'error';
}): boolean {
    const {disabled, form, snapshotVersion, reason, replacement, candidateIds, quantity, maxAvailable, schedule} = params;
    if (disabled || !form || form.version !== snapshotVersion) return false;
    if (!reason.trim()) return false;
    if (replacement && !candidateIds.some(id => String(id) === replacement)) return false;
    if (form.kind === 'equipment' && Number(replacement) === form.oldEquipmentId && Number(quantity) === form.oldQuantity) {
        return false;
    }
    if (form.kind === 'equipment' && replacement && !isValidEquipmentQuantity(quantity, maxAvailable)) return false;
    if (form.kind === 'operator' && replacement && schedule !== 'available') return false;
    return true;
}

