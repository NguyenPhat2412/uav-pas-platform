'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {QUIET, queryKeys} from '@/lib/query';
import {reportsService} from '@/api/reporting/reports.api';
import {maintenanceService} from '@/api/maintenance/maintenance.api';
import type {OrderFields} from '@/types/maintenance/maintenance.types';

/** Operations summary; the page shows its own error state. */
export function useOperationsReport() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'reports', 'operations'),
        queryFn: () => reportsService.operationsReport(),
        enabled: permissionsReady && can('DASHBOARD_VIEW'),
        meta: QUIET,
    });
}

export function useReportMissions() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'admin-report-missions'),
        queryFn: ({signal}) => reportsService.reportMissions(signal),
        enabled: permissionsReady && can('MISSION_VIEW_ALL')
    });
}

export function useSlaIntelligence() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'admin', 'sla-intelligence'),
        queryFn: ({signal}) => reportsService.slaIntelligence(signal),
        enabled:
            permissionsReady &&
            can('DASHBOARD_VIEW') &&
            (can('MISSION_VIEW_ALL') || can('USER_MANAGE')),
        meta: QUIET,
    });
}

export function useCreatePreventiveRepairOrder() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({uavId, fields}: { uavId: number; fields: OrderFields }) =>
            maintenanceService.createOrder(uavId, fields),
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({queryKey: queryKeys.of(user?.id, 'admin', 'sla-intelligence')}),
                client.invalidateQueries({predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('maintenance')}),
            ]);
        },
        retry: false,
    });
}

/** The operations CSV as text; the page reports a failed export itself. */
export function useExportOperationsCsv() {
    return useMutation({mutationFn: () => reportsService.exportOperationsCsv(), meta: QUIET});
}
