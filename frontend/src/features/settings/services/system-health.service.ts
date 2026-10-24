import {apiClient} from '@/lib/api';
import type {SystemHealth} from '@/features/settings/types/system-health.types';

export const systemHealthService = {
    get: (signal?: AbortSignal) => apiClient.get<SystemHealth>('/api/v1/dashboard/system-health', {signal}),
};
