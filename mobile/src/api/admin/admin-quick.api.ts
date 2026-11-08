import {apiClient, API_ROUTES} from '@/lib/api/client';
import {toAirspaceZoneTogglePayload} from '@/shared/forms/airspace/airspace-zone-form';
import {buildQueryString} from '@/shared/lib/format';
import {orderInput} from '@/shared/utils/maintenance/workflows';
import type {Invoice, PageResponse} from '@/shared/types';
import type {SlaIntelligenceData, User} from '@/shared/types/admin';
import type {AirspaceZone} from '@/shared/types/airspace/airspace.types';
import type {OrderFields, RepairOrder} from '@/shared/types/maintenance/maintenance.types';

export const adminQuickService = {
    users: (keyword?: string, signal?: AbortSignal) =>
        apiClient.get<PageResponse<User>>(
            `${API_ROUTES.users.list}?${buildQueryString({
                page: 0,
                size: 30,
                keyword: keyword?.trim() || undefined,
                sortBy: 'createdAt',
                direction: 'desc',
            })}`,
            {signal},
        ),
    lockUser: (userId: number) =>
        apiClient.post<void>(API_ROUTES.users.lock(userId)),
    unlockUser: (userId: number) =>
        apiClient.post<void>(API_ROUTES.users.unlock(userId)),
    pendingInvoices: (signal?: AbortSignal) =>
        apiClient.get<PageResponse<Invoice>>(
            `${API_ROUTES.billing.invoices}?${buildQueryString({
                page: 0,
                size: 30,
                status: 'PENDING',
            })}`,
            {signal},
        ),
    confirmInvoicePayment: (invoiceId: number, bankReference: string) =>
        apiClient.post<Invoice>(API_ROUTES.billing.confirmPayment(invoiceId), {
            bankReference: bankReference.trim().slice(0, 100),
        }),
    airspaceZones: (signal?: AbortSignal) =>
        apiClient.get<AirspaceZone[]>(
            `${API_ROUTES.airspace.zones}?${buildQueryString({activeOnly: false})}`,
            {signal},
        ),
    toggleAirspaceZone: (zone: AirspaceZone, active: boolean) =>
        apiClient.put<AirspaceZone>(
            API_ROUTES.airspace.zoneById(zone.id),
            toAirspaceZoneTogglePayload(zone, active),
        ),
    slaIntelligence: (signal?: AbortSignal) =>
        apiClient.get<SlaIntelligenceData>(API_ROUTES.admin.slaIntelligence, {signal}),
    createPreventiveRepairOrder: (uavId: number, fields: OrderFields) =>
        apiClient.post<RepairOrder>(API_ROUTES.maintenance.orders, {
            uavId,
            ...orderInput(fields),
        }),
};
