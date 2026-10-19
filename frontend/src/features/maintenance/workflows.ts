import type { MaterialInput, OrderFields, OrderStatus, ScheduleFields } from "@/features/maintenance/types";

export const dueLabels = { UPCOMING: 'Sắp tới', DUE: 'Đến hạn hôm nay', OVERDUE: 'Quá hạn', PAUSED: 'Tạm dừng' };
export const orderLabels = { OPEN: 'Đã lập phiếu', IN_PROGRESS: 'Đang sửa chữa', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy' };
export function orderControls(status: OrderStatus, allowed: boolean) {
  return { edit: allowed && ['OPEN', 'IN_PROGRESS'].includes(status), start: allowed && status === 'OPEN', complete: allowed && status === 'IN_PROGRESS', cancel: allowed && ['OPEN', 'IN_PROGRESS'].includes(status) };
}
function text(value: string, label: string, max: number, required = true) {
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new Error(`${label}${required ? ' cần có nội dung và' : ''} không được vượt quá ${max} ký tự.`);
  return result;
}
function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31' || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error('Vui lòng chọn ngày hợp lệ.');
  return value;
}
export function businessToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function scheduleInput(fields: ScheduleFields) {
  if (!/^\d+$/.test(fields.intervalDays) || Number(fields.intervalDays) < 1 || Number(fields.intervalDays) > 3650) throw new Error('Chu kỳ phải là số nguyên từ 1 đến 3.650 ngày.');
  return { title: text(fields.title, 'Tên lịch', 160), intervalDays: Number(fields.intervalDays), nextDueDate: date(fields.nextDueDate) };
}
export function orderInput(fields: OrderFields) {
  return { title: text(fields.title, 'Tên phiếu', 160), description: text(fields.description, 'Mô tả', 2000, false), plannedDate: date(fields.plannedDate), technicianName: text(fields.technicianName, 'Người phụ trách', 120) };
}
export function materialInput(items: MaterialInput[]) {
  if (items.length > 100) throw new Error('Mỗi phiếu được ghi tối đa 100 dòng vật tư.');
  return items.map((item, index) => {
    const quantity = item.quantity.trim(), unitPrice = item.unitPrice.trim();
    if (!/^\d+(\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0 || Number(quantity) > 10000) throw new Error(`Vật tư dòng ${index + 1}: số lượng phải lớn hơn 0, tối đa 10.000 và có tối đa 3 chữ số thập phân.`);
    if (!/^\d+$/.test(unitPrice) || BigInt(unitPrice) > BigInt(1_000_000_000)) throw new Error(`Vật tư dòng ${index + 1}: đơn giá là số nguyên VND từ 0 đến 1.000.000.000.`);
    return { name: text(item.name, `Tên vật tư dòng ${index + 1}`, 160), unit: text(item.unit, `Đơn vị dòng ${index + 1}`, 30), quantity, unitPrice };
  });
}
export function closingNote(value: string, kind: 'complete' | 'cancel') { return text(value, kind === 'complete' ? 'Kết quả kiểm tra' : 'Lý do hủy', 1000); }
export function positiveId(value: string) { if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw new Error('Vui lòng chọn UAV hợp lệ.'); return Number(value); }
export function formatVnd(value: string) { return /^\d+$/.test(value) ? `${new Intl.NumberFormat('vi-VN').format(BigInt(value))} ₫` : 'Chưa xác định'; }
export function calendarDate(value?: string | null) { return value ? value.split('-').reverse().join('/') : 'Chưa có'; }
export function pageAfterRefresh(currentPage: number, totalPages: number) { return Math.min(currentPage, Math.max(0, totalPages - 1)); }
