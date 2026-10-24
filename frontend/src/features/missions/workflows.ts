/** Form limits mirror the persisted mission fields; authorization stays with the API. */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

// `key` lets callers that only see the thrown error (e.g. via the service layer) translate it at render time.
export class MissionFormError extends Error {
    constructor(message: string, readonly key?: string, readonly params?: Record<string, string | number>) {
        super(message);
    }
}

export const missionFormErrorKey = (key: string) => `opsMissions.errors.${key}`;

// Without a translator the Vietnamese default is used, which keeps these helpers usable outside React.
function fail(t: Translate | undefined, key: string, fallback: string, params?: Record<string, string | number>): never {
    throw new MissionFormError(t ? t(missionFormErrorKey(key), params) : fallback, key, params);
}

// These notes are also persisted as a mission timeline description.
export const missionEventNoteLimit = 500;

export function missionEventNote(value: string, t?: Translate) {
    const note = value.trim();
    if (note.length > missionEventNoteLimit) fail(t, 'noteTooLong', 'Nội dung không được vượt quá 500 ký tự.');
    return note;
}

export function acceptanceInput(expectedVersion: number, t?: Translate) {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) fail(t, 'reloadBeforeAccept', 'Hãy tải lại nhiệm vụ trước khi tiếp nhận.');
    return {expectedVersion};
}

export function completionInput(completionNote: string, equipmentCondition?: string, t?: Translate) {
    const note = missionEventNote(completionNote, t);
    const condition = missionEventNote(equipmentCondition ?? '', t);
    if (!note || !condition) fail(t, 'completionRequired', 'Vui lòng nhập ghi chú kết quả và tình trạng thiết bị khi hoàn trả.');
    return {completionNote: note, equipmentCondition: condition};
}

export function handoverEvidence(missionType: string, media: {
    mediaRole: string;
    media: { id: number; confirmed?: boolean; deleted?: boolean }
}[]) {
    const required = ['AREA_INSPECTION', 'AERIAL_RECORDING', 'DATA_COLLECTION'].includes(missionType);
    const count = media.filter(item => ['OUTPUT', 'DOCUMENT'].includes(item.mediaRole) && item.media.confirmed !== false && !item.media.deleted).length;
    return {required, count, satisfied: !required || count > 0};
}

export function failureInput(failureReason: string, notes?: string, t?: Translate) {
    const reason = failureReason.trim();
    const detail = notes?.trim();
    if (!reason) fail(t, 'failureReasonRequired', 'Vui lòng nhập lý do không thể hoàn thành nhiệm vụ.');
    if (reason.length > missionEventNoteLimit) fail(t, 'reasonTooLong', 'Lý do không được vượt quá 500 ký tự.');
    if (detail && detail.length > 2000) fail(t, 'notesTooLong', 'Ghi chú không được vượt quá 2.000 ký tự.');
    return {failureReason: reason, notes: detail || undefined};
}

export function reservationQuantity(value: string, available: number, t?: Translate) {
    const quantity = Number(value);
    if (!Number.isSafeInteger(quantity) || quantity < 1) fail(t, 'quantityInvalid', 'Số lượng thiết bị phải là số nguyên lớn hơn 0.');
    if (quantity > available) fail(t, 'quantityExceeded', 'Số lượng yêu cầu vượt quá lượng thiết bị còn khả dụng.');
    return quantity;
}


export function uavRedispatchInput(expectedCurrentUavId: number, reason: string, replacementUavId?: number, t?: Translate) {
    const note = missionEventNote(reason, t);
    if (!note) fail(t, 'uavRedispatchReasonRequired', 'Vui lòng nhập lý do điều phối lại UAV.');
    if (!Number.isSafeInteger(expectedCurrentUavId) || expectedCurrentUavId < 1) fail(t, 'currentUavUnknown', 'Chưa xác định được UAV hiện tại. Hãy tải lại nhiệm vụ.');
    if (replacementUavId !== undefined && (!Number.isSafeInteger(replacementUavId) || replacementUavId < 1 || replacementUavId === expectedCurrentUavId)) fail(t, 'replacementUavRequired', 'Hãy chọn một UAV khác để thay thế.');
    return {expectedCurrentUavId, ...(replacementUavId === undefined ? {} : {replacementUavId}), reason: note};
}

export function resourceRedispatchInput(expectedVersion: number, replacementId: number | null, reason: string, t?: Translate) {
    const note = missionEventNote(reason, t);
    if (!note) fail(t, 'redispatchReasonRequired', 'Vui lòng nhập lý do điều phối lại.');
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) fail(t, 'reloadBeforeRedispatch', 'Hãy tải lại tài nguyên trước khi điều phối.');
    if (replacementId !== null && (!Number.isSafeInteger(replacementId) || replacementId < 1)) fail(t, 'replacementInvalid', 'Tài nguyên thay thế không hợp lệ.');
    return {expectedVersion, replacementId, reason: note};
}
