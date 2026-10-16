/** Form limits mirror the persisted mission fields; authorization stays with the API. */
export class MissionFormError extends Error {}

// These notes are also persisted as a mission timeline description.
export const missionEventNoteLimit = 500;

export function missionEventNote(value: string) {
  const note = value.trim();
  if (note.length > missionEventNoteLimit) throw new MissionFormError('Nội dung không được vượt quá 500 ký tự.');
  return note;
}

export function acceptanceInput(expectedVersion: number) {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new MissionFormError('Hãy tải lại nhiệm vụ trước khi tiếp nhận.');
  return { expectedVersion };
}

export function completionInput(completionNote: string, equipmentCondition?: string) {
  const note = missionEventNote(completionNote);
  const condition = missionEventNote(equipmentCondition ?? '');
  if (!note || !condition) throw new MissionFormError('Vui lòng nhập ghi chú kết quả và tình trạng thiết bị khi hoàn trả.');
  return { completionNote: note, equipmentCondition: condition };
}

export function handoverEvidence(missionType: string, media: { mediaRole: string; media: { id: number; confirmed?: boolean; deleted?: boolean } }[]) {
  const required = ['AREA_INSPECTION', 'AERIAL_RECORDING', 'DATA_COLLECTION'].includes(missionType);
  const count = media.filter(item => ['OUTPUT', 'DOCUMENT'].includes(item.mediaRole) && item.media.confirmed !== false && !item.media.deleted).length;
  return { required, count, satisfied: !required || count > 0 };
}

export function failureInput(failureReason: string, notes?: string) {
  const reason = failureReason.trim();
  const detail = notes?.trim();
  if (!reason) throw new MissionFormError('Vui lòng nhập lý do không thể hoàn thành nhiệm vụ.');
  if (reason.length > missionEventNoteLimit) throw new MissionFormError('Lý do không được vượt quá 500 ký tự.');
  if (detail && detail.length > 2000) throw new MissionFormError('Ghi chú không được vượt quá 2.000 ký tự.');
  return { failureReason: reason, notes: detail || undefined };
}

export function reservationQuantity(value: string, available: number) {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new MissionFormError('Số lượng thiết bị phải là số nguyên lớn hơn 0.');
  if (quantity > available) throw new MissionFormError('Số lượng yêu cầu vượt quá lượng thiết bị còn khả dụng.');
  return quantity;
}


export function uavRedispatchInput(expectedCurrentUavId: number, reason: string, replacementUavId?: number) {
  const note = missionEventNote(reason);
  if (!note) throw new MissionFormError('Vui lòng nhập lý do điều phối lại UAV.');
  if (!Number.isSafeInteger(expectedCurrentUavId) || expectedCurrentUavId < 1) throw new MissionFormError('Chưa xác định được UAV hiện tại. Hãy tải lại nhiệm vụ.');
  if (replacementUavId !== undefined && (!Number.isSafeInteger(replacementUavId) || replacementUavId < 1 || replacementUavId === expectedCurrentUavId)) throw new MissionFormError('Hãy chọn một UAV khác để thay thế.');
  return { expectedCurrentUavId, ...(replacementUavId === undefined ? {} : { replacementUavId }), reason: note };
}

export function resourceRedispatchInput(expectedVersion: number, replacementId: number | null, reason: string) {
  const note = missionEventNote(reason);
  if (!note) throw new MissionFormError('Vui lòng nhập lý do điều phối lại.');
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new MissionFormError('Hãy tải lại tài nguyên trước khi điều phối.');
  if (replacementId !== null && (!Number.isSafeInteger(replacementId) || replacementId < 1)) throw new MissionFormError('Tài nguyên thay thế không hợp lệ.');
  return { expectedVersion, replacementId, reason: note };
}
