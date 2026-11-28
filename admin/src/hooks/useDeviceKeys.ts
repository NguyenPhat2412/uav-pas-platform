'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, queryKeys, type MutationOptions} from '@/lib/query';
import {deviceKeysService} from '@/api/device-keys.api';
import type {CreatedDeviceKey, CreateDeviceKeyInput, DeviceKey} from '@/types/device-key.types';
import {uavsService} from '@/api/uavs.api';

const deviceKeyKeys = {
    all: (userId: number | undefined) => queryKeys.of(userId, 'device-keys'),
    uavOptions: (userId: number | undefined) => queryKeys.of(userId, 'device-keys', 'uav-options'),
};

export function useDeviceKeys() {
    const {user, can, permissionsReady} = useAuth();
    const client = useQueryClient();
    const query = useQuery({
        queryKey: deviceKeyKeys.all(user?.id),
        queryFn: ({signal}) => deviceKeysService.list(signal),
        enabled: permissionsReady && can('USER_PERMISSION_MANAGE'),
    });
    const refresh = () => client.invalidateQueries({queryKey: deviceKeyKeys.all(user?.id)});
    return {query, refresh};
}

/** UAVs a key can be bound to (first 100; UAV_VIEW). */
export function useDeviceKeyUavOptions() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: deviceKeyKeys.uavOptions(user?.id),
        queryFn: ({signal}) => uavsService.listUavs(0, 100, signal),
        enabled: permissionsReady && can('UAV_VIEW'),
    });
}

export function useCreateDeviceKey(options?: MutationOptions<CreatedDeviceKey, CreateDeviceKeyInput>) {
    return useMutation({...options, mutationFn: (input: CreateDeviceKeyInput) => deviceKeysService.create(input)});
}

export function useRevokeDeviceKey(options?: MutationOptions<DeviceKey, number>) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (id: number) => deviceKeysService.revoke(id),
        onSuccess: afterSuccess(options, () => void client.invalidateQueries({queryKey: deviceKeyKeys.all(user?.id)})),
    });
}
