/* Admin alert centre (GET /api/v1/admin/alerts). */

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type AlertSource = 'FLEET' | 'MAINTENANCE' | 'WEBHOOK' | 'FINANCE' | 'BILLING' | 'SYSTEM' | 'SECURITY';

/** Filter options in display order. */
export const SEVERITIES: AlertSeverity[] = ['CRITICAL', 'WARNING', 'INFO'];
export const SOURCES: AlertSource[] = ['FLEET', 'MAINTENANCE', 'WEBHOOK', 'FINANCE', 'BILLING', 'SYSTEM', 'SECURITY'];

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
