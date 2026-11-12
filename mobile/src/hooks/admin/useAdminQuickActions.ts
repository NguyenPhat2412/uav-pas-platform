import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import type {AirspaceZone} from '@/shared/types/airspace/airspace.types';
import type {OrderFields} from '@/shared/types/maintenance/maintenance.types';
import {adminQuickService} from '@/api/admin/admin-quick.api';
import {useAuth} from '@/providers/AuthContext';

export function useAdminSlaIntelligence() {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'admin-quick');
    return useQuery({
        queryKey: [...key, 'sla-intelligence'],
        queryFn: ({signal}) => adminQuickService.slaIntelligence(signal),
        enabled:
            permissionsReady &&
            can('DASHBOARD_VIEW') &&
            (can('MISSION_VIEW_ALL') || can('USER_MANAGE')),
    });
}

export function useAdminUsers(keyword: string) {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'admin-quick');
    return useQuery({
        queryKey: [...key, 'users', keyword.trim()],
        queryFn: ({signal}) => adminQuickService.users(keyword, signal),
        enabled: permissionsReady && (can('USER_VIEW') || can('USER_MANAGE')),
    });
}

export function useAdminPendingInvoices() {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'admin-quick');
    return useQuery({
        queryKey: [...key, 'pending-invoices'],
        queryFn: ({signal}) => adminQuickService.pendingInvoices(signal),
        enabled: permissionsReady && can('USER_MANAGE'),
    });
}

export function useAdminAirspaceZones() {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'admin-quick');
    return useQuery({
        queryKey: [...key, 'airspace-zones'],
        queryFn: ({signal}) => adminQuickService.airspaceZones(signal),
        enabled: permissionsReady && can('USER_MANAGE'),
    });
}

export function useAdminQuickMutations() {
    const {user} = useAuth();
    const client = useQueryClient();
    const adminKey = queryKeys.feature(user?.id, 'admin-quick');
    const airspaceKey = queryKeys.feature(user?.id, 'airspace');
    const customerKey = queryKeys.feature(user?.id, 'customer');

    const invalidateAll = () =>
        Promise.all([
            client.invalidateQueries({queryKey: adminKey}),
            client.invalidateQueries({queryKey: airspaceKey}),
            client.invalidateQueries({queryKey: customerKey}),
        ]);

    return {
        lockUser: useMutation({
            mutationFn: (userId: number) => adminQuickService.lockUser(userId),
            onSettled: invalidateAll,
            retry: false,
        }),
        unlockUser: useMutation({
            mutationFn: (userId: number) => adminQuickService.unlockUser(userId),
            onSettled: invalidateAll,
            retry: false,
        }),
        confirmPayment: useMutation({
            mutationFn: ({invoiceId, bankReference}: { invoiceId: number; bankReference: string }) =>
                adminQuickService.confirmInvoicePayment(invoiceId, bankReference),
            onSettled: invalidateAll,
            retry: false,
        }),
        toggleZone: useMutation({
            mutationFn: ({zone, active}: { zone: AirspaceZone; active: boolean }) =>
                adminQuickService.toggleAirspaceZone(zone, active),
            onSettled: invalidateAll,
            retry: false,
        }),
        createPreventiveOrder: useMutation({
            mutationFn: ({uavId, fields}: { uavId: number; fields: OrderFields }) =>
                adminQuickService.createPreventiveRepairOrder(uavId, fields),
            onSettled: () =>
                Promise.all([
                    invalidateAll(),
                    client.invalidateQueries({queryKey: queryKeys.feature(user?.id, 'fleet')}),
                ]),
            retry: false,
        }),
    };
}
