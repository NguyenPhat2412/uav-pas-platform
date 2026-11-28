// Import-free pure form helpers for field mission reports, conflict escalation, SAR rescue dispatch, and maintenance sign-off.

export const NOTE_MAX_LENGTH = 500;
export const INCIDENT_NOTES_MAX_LENGTH = 2000;
export const INSPECTION_NOTES_MAX_LENGTH = 1000;

export function canSubmitCompletion(completionNote: string, equipmentCondition?: string): boolean {
    const result = completionNote.trim();
    const condition = (equipmentCondition ?? '').trim();
    return (
        result.length > 0 &&
        result.length <= NOTE_MAX_LENGTH &&
        condition.length > 0 &&
        condition.length <= NOTE_MAX_LENGTH
    );
}

export function buildCompletionPayload(completionNote: string, equipmentCondition?: string) {
    return {
        completionNote: completionNote.trim(),
        equipmentCondition: (equipmentCondition ?? '').trim(),
    };
}

export function canSubmitFailure(failureReason: string, notes?: string): boolean {
    const reason = failureReason.trim();
    const extra = (notes ?? '').trim();
    return reason.length > 0 && reason.length <= NOTE_MAX_LENGTH && extra.length <= INCIDENT_NOTES_MAX_LENGTH;
}

export function buildFailurePayload(failureReason: string, notes?: string) {
    const trimmedNotes = notes?.trim() ?? '';
    return {
        failureReason: failureReason.trim(),
        ...(trimmedNotes ? {notes: trimmedNotes} : {}),
    };
}

export function canSubmitReasonNote(note: string): boolean {
    const trimmed = note.trim();
    return trimmed.length > 0 && trimmed.length <= NOTE_MAX_LENGTH;
}

export function buildReasonQueryValue(note: string): string {
    return note.trim();
}

export function canSubmitMaintenanceCompletion(inspectionNotes: string, inspectionPassed: boolean): boolean {
    const trimmed = inspectionNotes.trim();
    return inspectionPassed && trimmed.length > 0 && trimmed.length <= INSPECTION_NOTES_MAX_LENGTH;
}

export function buildMaintenanceCompletionPayload(
    expectedVersion: number,
    inspectionNotes: string,
    inspectionPassed: boolean,
) {
    return {
        expectedVersion,
        inspectionNotes: inspectionNotes.trim(),
        inspectionPassed,
    };
}

export function buildRescueDispatchPayload(params: {
    coordinatorNote?: string;
    detectionId?: number | null;
    latitude?: number | null;
    longitude?: number | null;
}): Record<string, unknown> {
    const note = params.coordinatorNote?.trim();
    return {
        ...(note ? {coordinatorNote: note} : {}),
        ...(params.detectionId != null ? {detectionId: params.detectionId} : {}),
        ...(params.latitude != null ? {latitude: params.latitude} : {}),
        ...(params.longitude != null ? {longitude: params.longitude} : {}),
    };
}
