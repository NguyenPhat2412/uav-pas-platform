import type {MaterialInput, OrderFields, OrderStatus, ScheduleFields} from "@/features/maintenance/types/maintenance.types";

export type Translate = (key: string, params?: Record<string, string | number>) => string;

// Without a translator the Vietnamese default is returned, which keeps these helpers usable outside React.
function message(t: Translate | undefined, key: string, fallback: string, params?: Record<string, string | number>): string {
    return t ? t(`opsAssets.maintenance.validation.${key}`, params) : fallback;
}

export const dueLabels = {UPCOMING: 'Sắp tới', DUE: 'Đến hạn hôm nay', OVERDUE: 'Quá hạn', PAUSED: 'Tạm dừng'};
export const orderLabels = {
    OPEN: 'Đã lập phiếu',
    IN_PROGRESS: 'Đang sửa chữa',
    COMPLETED: 'Đã hoàn tất',
    CANCELLED: 'Đã hủy'
};

export function orderControls(status: OrderStatus, allowed: boolean) {
    return {
        edit: allowed && ['OPEN', 'IN_PROGRESS'].includes(status),
        start: allowed && status === 'OPEN',
        complete: allowed && status === 'IN_PROGRESS',
        cancel: allowed && ['OPEN', 'IN_PROGRESS'].includes(status)
    };
}

function text(value: string, label: string, max: number, required = true, t?: Translate) {
    const result = value.trim();
    if ((required && !result) || result.length > max) throw new Error(required
        ? message(t, 'textRequired', `${label} cần có nội dung và không được vượt quá ${max} ký tự.`, {label, max})
        : message(t, 'textTooLong', `${label} không được vượt quá ${max} ký tự.`, {label, max}));
    return result;
}

function date(value: string, t?: Translate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31' || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error(message(t, 'invalidDate', 'Vui lòng chọn ngày hợp lệ.'));
    return value;
}

export function businessToday(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(now);
    const part = (type: string) => parts.find(value => value.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

export function scheduleInput(fields: ScheduleFields, t?: Translate) {
    if (!/^\d+$/.test(fields.intervalDays) || Number(fields.intervalDays) < 1 || Number(fields.intervalDays) > 3650) throw new Error(message(t, 'interval', 'Chu kỳ phải là số nguyên từ 1 đến 3.650 ngày.'));
    return {
        title: text(fields.title, message(t, 'label.scheduleTitle', 'Tên lịch'), 160, true, t),
        intervalDays: Number(fields.intervalDays),
        nextDueDate: date(fields.nextDueDate, t)
    };
}

export function orderInput(fields: OrderFields, t?: Translate) {
    return {
        title: text(fields.title, message(t, 'label.orderTitle', 'Tên phiếu'), 160, true, t),
        description: text(fields.description, message(t, 'label.description', 'Mô tả'), 2000, false, t),
        plannedDate: date(fields.plannedDate, t),
        technicianName: text(fields.technicianName, message(t, 'label.technician', 'Người phụ trách'), 120, true, t)
    };
}

export function materialInput(items: MaterialInput[], t?: Translate) {
    if (items.length > 100) throw new Error(message(t, 'tooManyMaterials', 'Mỗi phiếu được ghi tối đa 100 dòng vật tư.'));
    return items.map((item, index) => {
        const quantity = item.quantity.trim(), unitPrice = item.unitPrice.trim();
        if (!/^\d+(\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0 || Number(quantity) > 10000) throw new Error(message(t, 'materialQuantity', `Vật tư dòng ${index + 1}: số lượng phải lớn hơn 0, tối đa 10.000 và có tối đa 3 chữ số thập phân.`, {line: index + 1}));
        if (!/^\d+$/.test(unitPrice) || BigInt(unitPrice) > BigInt(1_000_000_000)) throw new Error(message(t, 'materialPrice', `Vật tư dòng ${index + 1}: đơn giá là số nguyên VND từ 0 đến 1.000.000.000.`, {line: index + 1}));
        return {
            name: text(item.name, message(t, 'label.materialName', `Tên vật tư dòng ${index + 1}`, {line: index + 1}), 160, true, t),
            unit: text(item.unit, message(t, 'label.materialUnit', `Đơn vị dòng ${index + 1}`, {line: index + 1}), 30, true, t),
            quantity,
            unitPrice
        };
    });
}

export function closingNote(value: string, kind: 'complete' | 'cancel', t?: Translate) {
    return text(value, kind === 'complete' ? message(t, 'label.inspection', 'Kết quả kiểm tra') : message(t, 'label.cancelReason', 'Lý do hủy'), 1000, true, t);
}

export function positiveId(value: string, t?: Translate) {
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw new Error(message(t, 'invalidUav', 'Vui lòng chọn UAV hợp lệ.'));
    return Number(value);
}

/** `locale` defaults to Vietnamese so the pure helper keeps its original output outside React. */
export function formatVnd(value: string, t?: Translate, locale = 'vi-VN') {
    return /^\d+$/.test(value) ? `${new Intl.NumberFormat(locale).format(BigInt(value))} ₫` : t ? t('opsAssets.maintenance.undetermined') : 'Chưa xác định';
}

export function calendarDate(value?: string | null, t?: Translate, locale?: string) {
    if (!value) return t ? t('opsAssets.maintenance.none') : 'Chưa có';
    if (!locale) return value.split('-').reverse().join('/');
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(locale, {timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric'}).format(parsed);
}

export function pageAfterRefresh(currentPage: number, totalPages: number) {
    return Math.min(currentPage, Math.max(0, totalPages - 1));
}
