import type {MaterialInput, OrderFields, OrderStatus, ScheduleFields} from "@/features/maintenance/types/maintenance.types";
import type {Translate} from '@/types';

export type {Translate};

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

// The API validates every field (required, lengths, ranges, dates) and returns the messages per field.
export function scheduleInput(fields: ScheduleFields) {
    return {
        title: fields.title.trim(),
        intervalDays: fields.intervalDays.trim() === '' ? null : Number(fields.intervalDays),
        nextDueDate: fields.nextDueDate || null,
    };
}

export function orderInput(fields: OrderFields) {
    return {
        title: fields.title.trim(),
        description: fields.description.trim(),
        plannedDate: fields.plannedDate || null,
        technicianName: fields.technicianName.trim(),
    };
}

export function materialInput(items: MaterialInput[]) {
    return items.map(item => ({
        name: item.name.trim(),
        unit: item.unit.trim(),
        quantity: item.quantity.trim(),
        unitPrice: item.unitPrice.trim(),
    }));
}

export function closingNote(value: string) {
    return value.trim();
}

export function positiveId(value: string) {
    return Number(value || 0);
}

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
