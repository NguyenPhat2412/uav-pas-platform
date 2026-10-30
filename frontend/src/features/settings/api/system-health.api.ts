import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {SystemHealth} from '@/features/settings/types/system-health.types';

export const systemHealthService = {
    get: (signal?: AbortSignal) => apiClient.get<SystemHealth>(API_ROUTES.dashboard.systemHealth, {signal}),
};
