import type {AlertSeverity, AlertSource} from '@/api/alerts/alerts.api';

/** Filter options in display order. */
export const SEVERITIES: AlertSeverity[] = ['CRITICAL', 'WARNING', 'INFO'];
export const SOURCES: AlertSource[] = ['FLEET', 'MAINTENANCE', 'WEBHOOK', 'FINANCE', 'BILLING', 'SYSTEM', 'SECURITY'];
