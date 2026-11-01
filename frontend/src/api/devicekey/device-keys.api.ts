import {apiClient, API_ROUTES} from '@/lib/api';
import type {DeviceKey, CreatedDeviceKey, CreateDeviceKeyInput} from '@/types/devicekey/device-key.types';

const base = API_ROUTES.admin.deviceKeys;

export const deviceKeysService = {
    list: (signal?: AbortSignal) => apiClient.get<DeviceKey[]>(base, {signal}),
    create: (input: CreateDeviceKeyInput) => apiClient.post<CreatedDeviceKey>(base, input),
    revoke: (id: number) => apiClient.post<DeviceKey>(`${base}/${id}/revoke`),
};
