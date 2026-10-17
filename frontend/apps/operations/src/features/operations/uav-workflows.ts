export const uavReasonLimit = 255;

export function uavChangeReason(value: string) {
  const reason = value.trim();
  if (!reason) throw new Error('Vui lòng nhập lý do hoặc kết quả kiểm tra UAV.');
  if (reason.length > uavReasonLimit) throw new Error('Nội dung không được vượt quá 255 ký tự.');
  return reason;
}

/** Display affordances only. Active mission references are checked by the API. */
export function uavControls(status: string, canManage: boolean) {
  return {
    maintenance: canManage && ['AVAILABLE', 'INACTIVE'].includes(status),
    recover: canManage && ['MAINTENANCE', 'ASSIGNED'].includes(status),
    station: canManage && status === 'AVAILABLE',
    busy: ['ASSIGNED', 'IN_USE'].includes(status),
  };
}


export function uavHistoryReason(value?: string) {
  if (!value) return '';
  if (value === 'Created') return 'Tạo UAV';
  const repair = /^Repair order #([0-9]+) (started|completed)$/.exec(value);
  if (repair) return `${repair[2] === 'started' ? 'Bắt đầu' : 'Hoàn tất'} phiếu sửa chữa #${repair[1]}`;
  const transfer = /^Home station changed: (none|[0-9]+) -> ([0-9]+)$/.exec(value);
  if (transfer) return `Điều chuyển trạm: ${transfer[1] === 'none' ? 'Chưa gán' : `#${transfer[1]}`} → #${transfer[2]}`;
  return value;
}
