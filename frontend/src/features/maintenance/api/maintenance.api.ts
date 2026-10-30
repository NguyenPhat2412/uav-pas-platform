import {apiClient, API_ROUTES} from '@/lib/api';
import type {PageResponse} from "@/types/resources";
import type {
    MaintenanceSchedule,
    MaterialInput,
    OrderFields,
    RepairOrder,
    ScheduleFields
} from "@/features/maintenance/types/maintenance.types";
import {closingNote, materialInput, orderInput, scheduleInput} from "@/features/maintenance/utils/workflows";
import {buildQueryString} from '@/lib/format';

export const maintenanceService = {
    schedules: (page: number, uavId: string, dueStatus: string, signal?: AbortSignal) =>
        apiClient.get<PageResponse<MaintenanceSchedule>>(`${API_ROUTES.maintenance.schedules}?${buildQueryString({page, size: 20, uavId, dueStatus})}`, {signal}),
    createSchedule: (uavId: number, fields: ScheduleFields) =>
        apiClient.post<MaintenanceSchedule>(API_ROUTES.maintenance.schedules, {uavId, ...scheduleInput(fields)}),
    updateSchedule: (schedule: MaintenanceSchedule, fields: ScheduleFields, active: boolean) =>
        apiClient.put<MaintenanceSchedule>(API_ROUTES.maintenance.scheduleById(schedule.id), {
            expectedVersion: schedule.version,
            ...scheduleInput(fields),
            active
        }),
    orders: (page: number, uavId: string, status: string, signal?: AbortSignal) =>
        apiClient.get<PageResponse<RepairOrder>>(`${API_ROUTES.maintenance.orders}?${buildQueryString({page, size: 20, uavId, status})}`, {signal}),
    order: (id: number, signal?: AbortSignal) =>
        apiClient.get<RepairOrder>(API_ROUTES.maintenance.orderById(id), {signal}),
    createOrder: (uavId: number, fields: OrderFields, scheduleId?: number) =>
        apiClient.post<RepairOrder>(API_ROUTES.maintenance.orders, {
            uavId,
            ...orderInput(fields),
            ...(scheduleId ? {scheduleId} : {})
        }),
    updateOrder: (order: RepairOrder, fields: OrderFields) =>
        apiClient.put<RepairOrder>(API_ROUTES.maintenance.orderById(order.id), {
            expectedVersion: order.version,
            ...orderInput(fields)
        }),
    materials: (order: RepairOrder, items: MaterialInput[]) =>
        apiClient.put<RepairOrder>(API_ROUTES.maintenance.orderMaterials(order.id), {
            expectedVersion: order.version,
            items: materialInput(items)
        }),
    start: (order: RepairOrder) =>
        apiClient.post<RepairOrder>(API_ROUTES.maintenance.orderStart(order.id), {expectedVersion: order.version}),
    complete: (order: RepairOrder, notes: string, inspectionPassed: boolean) =>
        apiClient.post<RepairOrder>(API_ROUTES.maintenance.orderComplete(order.id), {
            expectedVersion: order.version,
            inspectionNotes: closingNote(notes),
            // The API requires a passed inspection; the checkbox value is sent as-is for it to judge.
            inspectionPassed
        }),
    cancel: (order: RepairOrder, reason: string) =>
        apiClient.post<RepairOrder>(API_ROUTES.maintenance.orderCancel(order.id), {
            expectedVersion: order.version,
            reason: closingNote(reason)
        }),
};

export type MaintenanceService = typeof maintenanceService;
