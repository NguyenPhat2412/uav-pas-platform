export type DueStatus = 'UPCOMING' | 'DUE' | 'OVERDUE' | 'PAUSED';
export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MaintenanceSchedule {
    id: number;
    uavId: number;
    uavSerialNumber: string;
    title: string;
    intervalDays: number;
    nextDueDate: string;
    lastCompletedDate: string | null;
    active: boolean;
    version: number;
    dueStatus: DueStatus;
}

export interface MaterialInput {
    name: string;
    unit: string;
    quantity: string;
    unitPrice: string;
}

export interface Material extends MaterialInput {
    id: number;
    lineTotal: string;
}

export interface RepairOrder {
    id: number;
    uavId: number;
    uavSerialNumber: string;
    scheduleId: number | null;
    title: string;
    description: string;
    plannedDate: string;
    technicianName: string;
    status: OrderStatus;
    version: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    inspectionNotes: string | null;
    cancelReason: string | null;
    materials: Material[];
    totalMaterialCost: string;
    currency: 'VND';
}

export interface ScheduleFields {
    title: string;
    intervalDays: string;
    nextDueDate: string;
}

export interface OrderFields {
    title: string;
    description: string;
    plannedDate: string;
    technicianName: string;
}

export type OrderDetailMode = 'view' | 'edit' | 'materials' | 'start' | 'complete' | 'cancel';

