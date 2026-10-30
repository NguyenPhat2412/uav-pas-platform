'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {auditService} from '@/features/audit/api/audit.api';
import type {AuditFilters} from '@/types/admin';

export function useAdminAudit(page: number, size: number, filters: AuditFilters, enabled = true) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id, 'admin-audit', page, size, filters],
        queryFn: ({signal}) => auditService.audit(page, size, signal, filters),
        enabled: enabled && permissionsReady && can('AUDIT_READ')
    });
}
