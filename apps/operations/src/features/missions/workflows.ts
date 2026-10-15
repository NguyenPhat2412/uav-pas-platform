/** Form limits mirror the persisted mission fields; authorization stays with the API. */
export class MissionFormError extends Error {}

// These notes are also persisted as a mission timeline description.
export const missionEventNoteLimit = 500;

export function missionEventNote(value: string) {
  const note = value.trim();
  if (note.length > missionEventNoteLimit) throw new MissionFormError('Nội dung không được vượt quá 500 ký tự.');
  return note;
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
