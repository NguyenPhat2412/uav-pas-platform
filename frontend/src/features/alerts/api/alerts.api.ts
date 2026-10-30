import {apiClient, API_ROUTES} from '@/lib/api';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertSource = 'FLEET' | 'MAINTENANCE' | 'WEBHOOK' | 'FINANCE' | 'BILLING' | 'SYSTEM' | 'SECURITY';

/** One current issue from GET /api/v1/admin/alerts; messageKey is an adminPlatform catalog key. */
export interface PlatformAlert {
    id: string;
    code: string;
    severity: AlertSeverity;
    source: AlertSource;
    messageKey: string;
    params: Record<string, string | number>;
    href: string;
    since: string | null;
}

export interface AlertCenter {
    generatedAt: string;
    critical: number;
    warning: number;
    info: number;
    items: PlatformAlert[];
}

export const alertsService = {
    current: (signal?: AbortSignal) => apiClient.get<AlertCenter>(API_ROUTES.admin.alerts, {signal}),
};

