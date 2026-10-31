'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {operationsAuditService} from '@/api/audit/operations-audit.api';

export function useAudit(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'audit', page),
        queryFn: ({signal}) => operationsAuditService.listAudit(page, signal),
        enabled: can('AUDIT_READ')
    });
}
