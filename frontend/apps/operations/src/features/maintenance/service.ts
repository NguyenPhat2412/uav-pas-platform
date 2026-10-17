import { apiClient } from '@/lib/api.client';
import type { PageResponse } from '../operations/types/operations.types';
import type { MaintenanceSchedule, MaterialInput, OrderFields, RepairOrder, ScheduleFields } from './types';
import { closingNote, materialInput, orderInput, scheduleInput } from './workflows';

function listQuery(page: number, uavId: string, filterName: string, filter: string) {
  const params = new URLSearchParams({ page: String(page), size: '20' });
  if (uavId) params.set('uavId', uavId);
  if (filter) params.set(filterName, filter);
  return params;
}
const base = '/api/v1/maintenance';
export const maintenanceService = {
  schedules: (page: number, uavId: string, dueStatus: string, signal?: AbortSignal) => apiClient.get<PageResponse<MaintenanceSchedule>>(`${base}/schedules?${listQuery(page, uavId, 'dueStatus', dueStatus)}`, { signal }),
  createSchedule: (uavId: number, fields: ScheduleFields) => apiClient.post<MaintenanceSchedule>(`${base}/schedules`, { uavId, ...scheduleInput(fields) }),
  updateSchedule: (schedule: MaintenanceSchedule, fields: ScheduleFields, active: boolean) => apiClient.put<MaintenanceSchedule>(`${base}/schedules/${schedule.id}`, { expectedVersion: schedule.version, ...scheduleInput(fields), active }),
  orders: (page: number, uavId: string, status: string, signal?: AbortSignal) => apiClient.get<PageResponse<RepairOrder>>(`${base}/orders?${listQuery(page, uavId, 'status', status)}`, { signal }),
  order: (id: number, signal?: AbortSignal) => apiClient.get<RepairOrder>(`${base}/orders/${id}`, { signal }),
  createOrder: (uavId: number, fields: OrderFields, scheduleId?: number) => apiClient.post<RepairOrder>(`${base}/orders`, { uavId, ...orderInput(fields), ...(scheduleId ? { scheduleId } : {}) }),
  updateOrder: (order: RepairOrder, fields: OrderFields) => apiClient.put<RepairOrder>(`${base}/orders/${order.id}`, { expectedVersion: order.version, ...orderInput(fields) }),
  materials: (order: RepairOrder, items: MaterialInput[]) => apiClient.put<RepairOrder>(`${base}/orders/${order.id}/materials`, { expectedVersion: order.version, items: materialInput(items) }),
  start: (order: RepairOrder) => apiClient.post<RepairOrder>(`${base}/orders/${order.id}/start`, { expectedVersion: order.version }),
  complete: (order: RepairOrder, notes: string) => apiClient.post<RepairOrder>(`${base}/orders/${order.id}/complete`, { expectedVersion: order.version, inspectionNotes: closingNote(notes, 'complete'), inspectionPassed: true }),
  cancel: (order: RepairOrder, reason: string) => apiClient.post<RepairOrder>(`${base}/orders/${order.id}/cancel`, { expectedVersion: order.version, reason: closingNote(reason, 'cancel') }),
};
