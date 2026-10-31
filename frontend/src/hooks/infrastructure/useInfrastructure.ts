'use client';
import {useMutation, useQuery, type QueryFunction} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {infrastructureService} from '@/api/infrastructure/infrastructure.api';

function useInfrastructureQuery<T>(name: string, queryFn: QueryFunction<T>, refetchInterval: number | false = false) {
    const {user} = useAuth();
    return useQuery({queryKey: queryKeys.of(user?.id, 'infrastructure', name), queryFn, refetchInterval});
}

export const useDeploymentInfo = () =>
    useInfrastructureQuery('deployment', ({signal}) => infrastructureService.deployment(signal));

/** `refetchInterval` lets the backups page keep watching while the overview loads once. */
export const useBackupStatus = (refetchInterval: number | false = false) =>
    useInfrastructureQuery('backups', ({signal}) => infrastructureService.backups(signal), refetchInterval);

export const useStorageStatus = () =>
    useInfrastructureQuery('storage', ({signal}) => infrastructureService.storage(signal));

export const useDatabaseStatus = () =>
    useInfrastructureQuery('database', ({signal}) => infrastructureService.database(signal), 30_000);

export const useEmailStatus = () =>
    useInfrastructureQuery('email', ({signal}) => infrastructureService.email(signal));

export function useSendTestEmail() {
    return useMutation({mutationFn: () => infrastructureService.sendTestEmail()});
}
