
// Rules (required, lengths, quantities, "pick another UAV") are enforced by the API, which names the field.
// These helpers only trim and shape the request.
export const missionFormErrorKey = (key: string) => `opsMissions.errors.${key}`;

export function missionEventNote(value: string) {
    return value.trim();
}

export function acceptanceInput(expectedVersion: number) {
    return {expectedVersion};
}

export function completionInput(completionNote: string, equipmentCondition?: string) {
    return {completionNote: completionNote.trim(), equipmentCondition: (equipmentCondition ?? '').trim()};
}

export function handoverEvidence(missionType: string, media: {
    mediaRole: string;
    media: { id: number; confirmed?: boolean; deleted?: boolean }
}[]) {
    const required = ['AREA_INSPECTION', 'AERIAL_RECORDING', 'DATA_COLLECTION'].includes(missionType);
    const count = media.filter(item => ['OUTPUT', 'DOCUMENT'].includes(item.mediaRole) && item.media.confirmed !== false && !item.media.deleted).length;
    return {required, count, satisfied: !required || count > 0};
}

export function failureInput(failureReason: string, notes?: string) {
    return {failureReason: failureReason.trim(), notes: notes?.trim() || undefined};
}

export function reservationQuantity(value: string) {
    return Number(value);
}

export function uavRedispatchInput(expectedCurrentUavId: number, reason: string, replacementUavId?: number) {
    return {expectedCurrentUavId, ...(replacementUavId === undefined ? {} : {replacementUavId}), reason: reason.trim()};
}

export function resourceRedispatchInput(expectedVersion: number, replacementId: number | null, reason: string) {
    return {expectedVersion, replacementId, reason: reason.trim()};
}
