import type {
    MaintenanceSchedule,
    MaterialInput,
    OrderFields,
    RepairOrder,
    ScheduleFields,
} from '@/types/maintenance/maintenance.types';

export type {MaintenanceSchedule, MaterialInput, OrderFields, RepairOrder, ScheduleFields};

export const MAX_MAINTENANCE_MATERIAL_ROWS = 100;

export interface MaintenanceOrderCreateDraft {
    uavId: string;
    fields: OrderFields;
}

export interface MaintenanceScheduleDraft {
    uavId: string;
    fields: ScheduleFields;
}

export interface OrderConfirmationDraft {
    note: string;
    passed: boolean;
}

export type OrderConfirmationMode = 'start' | 'complete' | 'cancel';
export type MaintenanceFieldErrors = Record<string, string>;

export function maintenanceBusinessToday(now = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const part = (type: string) => parts.find(value => value.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

export function createMaintenanceOrderDraft(
    initialUavId: string,
    schedule?: Pick<MaintenanceSchedule, 'uavId' | 'title' | 'nextDueDate'>,
    today = maintenanceBusinessToday(),
): MaintenanceOrderCreateDraft {
    return {
        uavId: schedule ? String(schedule.uavId) : initialUavId,
        fields: {
            title: schedule?.title || '',
            description: '',
            plannedDate: schedule?.nextDueDate || today,
            technicianName: '',
        },
    };
}

export function toEditOrderFields(
    order: Pick<RepairOrder, 'title' | 'description' | 'plannedDate' | 'technicianName'>,
): OrderFields {
    return {
        title: order.title,
        description: order.description || '',
        plannedDate: order.plannedDate,
        technicianName: order.technicianName,
    };
}

export function canSubmitMaintenanceOrder(uavId: string, fields: OrderFields): boolean {
    return Boolean(uavId.trim() && fields.title.trim() && fields.plannedDate && fields.technicianName.trim());
}

export function toMaintenanceOrderPayload(fields: OrderFields): {
    title: string;
    description: string;
    plannedDate: string | null;
    technicianName: string;
} {
    return {
        title: fields.title.trim(),
        description: fields.description.trim(),
        plannedDate: fields.plannedDate || null,
        technicianName: fields.technicianName.trim(),
    };
}

export function emptyOrderConfirmationDraft(): OrderConfirmationDraft {
    return {
        note: '',
        passed: false,
    };
}

export function canSubmitOrderConfirmation(
    mode: OrderConfirmationMode,
    draft: OrderConfirmationDraft,
): boolean {
    if (mode !== 'start' && !draft.note.trim()) {
        return false;
    }
    if (mode === 'complete' && !draft.passed) {
        return false;
    }
    return true;
}

export function createMaintenanceScheduleDraft(
    initialUavId: string,
    schedule?: Pick<MaintenanceSchedule, 'uavId' | 'title' | 'intervalDays' | 'nextDueDate'>,
    today = maintenanceBusinessToday(),
): MaintenanceScheduleDraft {
    return {
        uavId: schedule ? String(schedule.uavId) : initialUavId,
        fields: {
            title: schedule?.title || '',
            intervalDays: String(schedule?.intervalDays || 30),
            nextDueDate: schedule?.nextDueDate || today,
        },
    };
}

export function canSubmitMaintenanceSchedule(uavId: string, fields: ScheduleFields): boolean {
    return Boolean(uavId.trim() && fields.title.trim() && fields.intervalDays.trim() && fields.nextDueDate);
}

export function toMaintenanceSchedulePayload(fields: ScheduleFields): {
    title: string;
    intervalDays: number | null;
    nextDueDate: string | null;
} {
    return {
        title: fields.title.trim(),
        intervalDays: fields.intervalDays.trim() === '' ? null : Number(fields.intervalDays),
        nextDueDate: fields.nextDueDate || null,
    };
}

export function toMaterialRowsDraft(order: Pick<RepairOrder, 'materials'>): MaterialInput[] {
    return order.materials.map(({name, unit, quantity, unitPrice}) => ({
        name,
        unit,
        quantity,
        unitPrice,
    }));
}

export function emptyMaterialRowDraft(): MaterialInput {
    return {
        name: '',
        unit: '',
        quantity: '1',
        unitPrice: '0',
    };
}

export function toMaterialRowsPayload(items: readonly MaterialInput[]): MaterialInput[] {
    return items.map(item => ({
        name: item.name.trim(),
        unit: item.unit.trim(),
        quantity: item.quantity.trim(),
        unitPrice: item.unitPrice.trim(),
    }));
}

export function maintenanceFieldErrors(error: unknown): MaintenanceFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? fields : null;
}

