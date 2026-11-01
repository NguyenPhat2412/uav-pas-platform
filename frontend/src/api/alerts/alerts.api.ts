import {apiClient, API_ROUTES} from '@/lib/api';
import type {AlertCenter} from '@/types/alerts/alerts.types';

export const alertsService = {
    current: (signal?: AbortSignal) => apiClient.get<AlertCenter>(API_ROUTES.admin.alerts, {signal}),
};

