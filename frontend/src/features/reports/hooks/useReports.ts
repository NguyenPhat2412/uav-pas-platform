'use client';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {QUIET, queryKeys} from '@/lib/query';
import {reportsService} from '@/features/reports/api/reports.api';

/** Operations summary; the page shows its own error state. */
export function useOperationsReport() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'reports', 'operations'),
        queryFn: () => reportsService.operationsReport(),
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

/** The operations CSV as text; the page reports a failed export itself. */
export function useExportOperationsCsv() {
    return useMutation({mutationFn: () => reportsService.exportOperationsCsv(), meta: QUIET});
}
